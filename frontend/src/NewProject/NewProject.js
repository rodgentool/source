//OK

import '../Style/NewProject.css';
import React, { useEffect, useState } from 'react';
import { Options } from './Options';
import { Preview } from './Preview';
import { Topology } from './Topology';
import { Network } from '../classes/network';
import { FormValidation } from "../Components/FormValidation";
import axios from "axios";
import {polygonCentroid, polygonContains} from "d3-polygon";

export const NewProject = ({
    onChangeView, 
    onChangeNetwork,
    readFileContent
    }) => {

    const [network, setNetwork] = useState(new Network('Custom', true));
    const [roadsType, setRoadsType] = useState(0);
    const [roadsDirection, setRoadsDirection] = useState('both');


    const [grFile, setGrFile] = useState(null);
    const [coFile, setCoFile] = useState(null);


    const {handleSubmit, handleChange, data, errors} = FormValidation({
        validations: {
            structure: {
                custom: {
                isValid: (structure) => {
                    if (network.topology === 'Grid') {
                        return (structure.columns !== '' && parseInt(structure.columns) > 0) && (structure.rows !== '' && parseInt(structure.columns) > 0);
                    }else if (network.topology === 'Ring'){
                        return structure.tau >= 0;
                    }
                    return true;
                },
                message: 'There must be at least one Neighborhood',
                }
            },
            speed: {
                custom:{
                isValid: (speed) => {
                    return (speed !== '' && speed  > 0)
                },
                message: 'The speed has to be greater than 0',
                }
            }
    //Add one error when no .gr file ist given

        },
        initialValues:{
            structure : {},
            speed: network.getRoadTypeById(roadsType, "maxSpeed"),
        },
        onSubmit: () => handleCreate(),
      });

    /** 
     * Choosing a topology type adds a neighborhood of that type to the network.
     * @param {string} topology the type of backbone of the network
     */
    const handleTopology = () => {
        let topology = network.topology
        setRoadsType(0);
        if (topology === 'Custom'){
            let newNetwork = new Network('Custom', true);
            setNetwork(newNetwork);
            handleChange('structure', {});
        }
        
        else if(topology === 'Grid'){
            let newNetwork = new Network('Grid', true);
            newNetwork.addGridFirstNbh(newNetwork.roadTypes.types[0], 'both');
            setNetwork(newNetwork);
            handleChange('structure', {columns: 1, rows: 1});
        }

        else if(topology === 'Ring'){
            let newNetwork = new Network('Ring', true);
            newNetwork.addGridFirstNbh(newNetwork.roadTypes.types[0], 'both');
            setNetwork(newNetwork);
            handleChange('structure', {tau: 0});
        }
    }

    useEffect(() => {
        handleChange('speed', network.getRoadTypeById(roadsType, "maxSpeed"));
      }, [network.topology]);

    
    
    const handleRoadsType = (typeId) => {
        network.setRoadsType(Object.values(network.roads), network.getRoadTypeById(typeId))
        setRoadsType(typeId);
        setNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
    }

    const handleRoadTypeMaxSpeed = (newMaxSpeed) => {
        network.setRoadTypeMaxSpeed(network.roadTypes.types[roadsType], newMaxSpeed);
        setNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
    }
        
    const handleRoadsDirection = (newDirection) => {
        network.setRoadsDirection(Object.values(network.roads), newDirection);
        setRoadsDirection(newDirection); 
        setNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
    }

    const importGr = () => {

        if (grFile) {
            return new Promise(function(resolve, reject) {
                readFileContent(grFile).then(grData => {
                    if(coFile){
                    let nodes = {}
                    let roads = {}
                        return new Promise(function(resolve, reject) {
                            readFileContent(coFile).then(coData => {
                                const coDataLines = coData.split(/\r?\n/);
                                let jsonNet = '{"nodes": ['
                                for(let line of coDataLines){
                                    const word = line.split(" ");
                                    if(word[0] === 'v'){
                                        jsonNet += `"${word[1]}",`;
                                        nodes[Number(word[1])] = {x: Number(word[2]), y: Number(word[3])};
                                    }
                                }
                                jsonNet = jsonNet.slice(0, jsonNet.length - 1);
                                jsonNet += '],\n"roads": {'
                                
                                const grDataLines = grData.split(/\r?\n/);
                                let id = 0;
                                for(let line of grDataLines){
                                    const word = line.split(" ");
                                    if(word[0] === 'a'){
                                        jsonNet += `"${id}": ["${word[1]}", "${word[2]}", "${word[3]}", "oneway", "${word[4]}"],`;
                                        // TO-DO: Type
     
                                        if (id !== 0 && roads[id-1].nodes.includes(Number(word[1])) && roads[id-1].nodes.includes(Number(word[2]))){
                                            roads[id-1].direction = "both";
                                            continue;
                                        }
                                            roads[id] = {nodes: [Number(word[1]), Number(word[2])], length: Number(word[3]), direction: "oneway"};           
                                            id++;
                                        }
                                    }
                                    
                                console.log(roads);    
                                jsonNet = jsonNet.slice(0, jsonNet.length - 1);
                                jsonNet += '}}'
                                axios({
                                    method: 'POST',
                                    url: "/backboneFromGr/",
                                    data: jsonNet
                                }).then((res) => {
                                    
                                    let nodesSet = new Set();
                                    for (const cycle of res.data)
                                        cycle.forEach(element => nodesSet.add(Number(element)))
                                    console.log(nodesSet);
    
                                    let factorToOriginalCoord = 0;
                                    if (roads[id-1]){
                                        let road = roads[id-1];
                                        let node1 = nodes[road.nodes[0]];
                                        let node2 = nodes[road.nodes[1]];
                                        let dist = Math.hypot(node2.x-node1.x, node2.y-node1.y);
                                        factorToOriginalCoord = road.length/dist;
                                    }
                                    
                                    let newNetwork = new Network('Custom', true);
                                    
                                    for (let nodeId of nodesSet){
                                        let node = nodes[nodeId];
                                        newNetwork.addNode([node.x*factorToOriginalCoord, node.y*factorToOriginalCoord],true, true, false, nodeId);
                                    }

                                    //If both nodes add road
                                    let nbhsRoads = [];
                                    for(let i = 0; i < res.data.length; i++){
                                        nbhsRoads.push([]);
                                    }

                        
                                    for (let roadId in roads){
                                        let newRoad = null;
                                        let road = roads[roadId];
                                  
                                        for (let i = 0; i < res.data.length; i++){
                                            if (res.data[i].includes(road.nodes[0].toString()) && res.data[i].includes(road.nodes[1].toString())){
                                                if (!newRoad)
                                                    newRoad = newNetwork.addRoad([newNetwork.nodes[road.nodes[0]], newNetwork.nodes[road.nodes[1]]], newNetwork.roadTypes.types[0], road.direction, true); 
                                                nbhsRoads[i].push(newRoad);
                                            }
                                        } 
                                    }

                                // N/bNodes are inside => is no nbh
                                    for(let nbhRoads of nbhsRoads){ 
                                        //get Nodes
                                        let bNodes = []
                                        let coordinates = [];
                                        for (let road of nbhRoads){
                                            for (let node of road.nodes){
                                                if(!bNodes.includes(node)){
                                                    bNodes.push(node);
                                                    coordinates.push([node.x, node.y])
                                                }
                                            }
                                        }
                                        let center = {
                                            x: coordinates.reduce((partialSum, a) => partialSum + a[0], 0)/coordinates.length,
                                            y: coordinates.reduce((partialSum, a) => partialSum + a[1], 0)/coordinates.length
                                        }
                                
                                        //sort Nodes
                                        bNodes.sort(function(a, b) {

                                            if (a.x >= center.x && b.x  < center.x)
                                                return -1;
                                
                                            if (a.x < center.x && b.x  >= center.x)
                                                return 1;
                                            
                                
                                            if (a.x  === center.x && b.x  === center.x) {
                                                if (a.y >= center.y || b.y >= center.y)
                                                    return b.y - a.y;
                                                return a.y - b.y;
                                            }
                                
                                            let det = (a.x - center.x) * (b.y - center.y) - (b.x - center.x) * (a.y - center.y);
                                            if (det < 0)
                                                return -1;
                                            if (det > 0)
                                                return 1;
                                
                                            let dist1 = (a.x - center.x) * (a.x - center.x) + (a.y - center.y) * (a.y - center.y);
                                            let dist2 = (b.x - center.x) * (b.x - center.x) + (b.y - center.y) * (b.y - center.y);
                                            return dist2 - dist1;
                                         });
                                    
                                         console.log(bNodes);

                                        //Create Polygon

                                        let polygon = bNodes.map(node => [node.x, node.y]);
                                        console.log(polygon);

                                        let allNodes = newNetwork.getAllIntersectionNodes();
                                        console.log("before", allNodes.length);
                                        
                                        for(let nbhRoad of nbhRoads){
                                            for(let node of nbhRoad.nodes){
                                                let index = allNodes.indexOf(node);
                                                if(index !== -1){
                                                    allNodes.splice(index, 1);
                                                }
                                            }
                                        }
                                        console.log("after", allNodes.length)

                                        let empty = true;
                                        for(let node of allNodes){
                                            if(polygonContains(polygon, [node.x, node.y])){
                                                empty = false;
                                                break;
                                            }
                                        }
                                   
                                        if(empty)
                                            newNetwork.addNbh(nbhRoads);
                                    }

                                    
                             




                                

                                    console.log(newNetwork);
                                    onChangeNetwork(newNetwork);
                                    onChangeView('main');
                                 
                                   

                                    //Red
                             
                                })
                                  .catch((err) => {

                                  });
                            })})
                    
                    }



                    console.log(grData);
                })});
        }
    }



    const handleCreate = () =>{
        if (network.topology === "Import"){
            return importGr();
        }
        onChangeNetwork(network);
        onChangeView('main');
        
    } 
    
    const handleCancel = () => {
        onChangeView('wellcome');
    }


    return (
    <div className='wrapperBody'>
        <div className='containerRound container-newProject'>
            <div className="container-title">New Project</div>
            <div className="container-exit" onClick={handleCancel}>x</div>
            <div className="wrapper-int">
                <Topology 
                    topology={network.topology}
                    onChangeTopology={handleTopology} 
                    onChangeNetwork={setNetwork}
                    network={network}
                    handleErrors={handleChange}
                />
                <Preview 
                    network={network}
                />
                <Options
                    network={network}
                    onChangeNetwork={setNetwork}
                    errors={errors}
                    structure={data.structure}
                    handleErrors={handleChange}
                    roadsDirection={roadsDirection}
                    roadsType={roadsType}
                    roadsMaxSpeed={data.speed}
                    onChangeRoadsDirection={handleRoadsDirection}
                    onChangeRoadsType={handleRoadsType}
                    onChangeRoadTypeSpeed={handleRoadTypeMaxSpeed}
                    onChangeGrFile={setGrFile}
                    onChangeCoFile={setCoFile}
                />
            </div>  
            <button className='btn btn-newProject' type='button' onClick={handleSubmit}>Create</button>
            <button className='btn btn-newProject' type='button' onClick={handleCancel}>Cancel</button>
        </div>
    </div>
    )
}               