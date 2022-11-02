import '../Style/NewProject.css';
import React, { useEffect, useState } from 'react';
import { Options } from './Options';
import { Preview } from './Preview';
import { Topology } from './Topology';
import { Network } from '../classes/network';
import { FormValidation } from "../Components/FormValidation";
import axios from "axios";
import { polygonContains} from "d3-polygon";
import { url } from "../url"

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
                                        if (id !== 0 && roads[id-1].nodes.includes(Number(word[1])) && roads[id-1].nodes.includes(Number(word[2]))){
                                            roads[id-1].direction = "both";
                                            continue;
                                        }
                                        let alreadySet = false;
                                        for(let roadId in roads){
                                            if(roads[roadId].nodes.includes(Number(word[1])) && roads[roadId].nodes.includes(Number(word[2]))){
                                                roads[roadId].direction = "both";
                                                break;
                                            }
                                        }

                                        if(!alreadySet){
                                            roads[id] = {nodes: [Number(word[1]), Number(word[2])], length: Number(word[3]), direction: "oneway", type: word[4]};     
                                            id++;
                                        }
                                    }
                                }

                                for(let roadId in roads){
                                    let road = roads[roadId];
                                    jsonNet += `"${roadId}": ["${road.nodes[0]}", "${road.nodes[1]}", "${road.length}", "${road.direction}", "${road.type}"],`;
                                }
                                    
                                jsonNet = jsonNet.slice(0, jsonNet.length - 1);
                                jsonNet += '}}'
                                axios({
                                    method: 'POST',
                                    url: url + "/backboneFromGr/",
                                    data: jsonNet
                                }).then((res) => {
                                    
                                    let nodesSet = new Set();
                                    for (const cycle of res.data)
                                        cycle.forEach(element => nodesSet.add(Number(element)))
    
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
                                        node.x = node.x*factorToOriginalCoord
                                        node.y = node.y*factorToOriginalCoord
                                        newNetwork.addNode([node.x, node.y],true, true, false, nodeId);
                                    }

                                    for (let roadId in roads){
                                        let road = roads[roadId];
                                        if(nodesSet.has(road.nodes[0]) && nodesSet.has(road.nodes[1])){
                                            newNetwork.addRoad([newNetwork.nodes[road.nodes[0]], newNetwork.nodes[road.nodes[1]]], newNetwork.roadTypes.types[0], road.direction, true); 

                                        }
                                    }
                   
                             
                                // N/bNodes are inside => is no nbh
                                    for(let cycleId in res.data){ 
                                        //console.log(cycleId);
                                        let cycle = res.data[cycleId];

                                        let coordinates = [];
                                        for(let nodeId of cycle){
                                            let node = newNetwork.nodes[nodeId];
                                            coordinates.push([node.x, node.y])
                                        }
                                        //console.log("coordinates", coordinates)
                              
                                        let center = {
                                            x: coordinates.reduce((partialSum, a) => partialSum + a[0], 0)/coordinates.length,
                                            y: coordinates.reduce((partialSum, a) => partialSum + a[1], 0)/coordinates.length
                                        }
                                
                                        //sort Nodes
                           
                                        coordinates.sort(function(a, b) {

                                            if (a[0] >= center.x && b[0]  < center.x)
                                                return -1;
                                
                                            if (a[0] < center.x && b[0]  >= center.x)
                                                return 1;
                                            
                                
                                            if (a[0]  === center.x && b[0]  === center.x) {
                                                if (a[1] >= center.y || b[1] >= center.y)
                                                    return b[1] - a[1];
                                                return a[1] - b[1];
                                            }
                                
                                            let det = (a[0] - center.x) * (b[1] - center.y) - (b[0] - center.x) * (a[1] - center.y);
                                            if (det < 0)
                                                return -1;
                                            if (det > 0)
                                                return 1;
                                
                                            let dist1 = (a[0] - center.x) * (a[0] - center.x) + (a[1] - center.y) * (a[1] - center.y);
                                            let dist2 = (b[0] - center.x) * (b[0] - center.x) + (b[1] - center.y) * (b[1] - center.y);
                                            return dist2 - dist1;
                                         });

                                
                                        let polygon = coordinates;
                                        let empty = true;

                                        let allNodes = newNetwork.getAllIntersectionNodes();
                                        for(let node of allNodes){
                                            if(!cycle.includes(node.id.toString()) && polygonContains(polygon, [node.x, node.y])){
                                                empty = false;
                                                break;
                                            }
                                        }
                                        if(empty){
                                            let nbhRoads = [];
                                                for(let roadId in newNetwork.roads){
                                                    let road =  newNetwork.roads[roadId]
                                                    if (cycle.includes(road.nodes[0].id.toString()) && cycle.includes(road.nodes[1].id.toString())){
                                                        nbhRoads.push(road);
                                                    }  
                                                }
                                                //console.log(nbhRoads);
                                                newNetwork.addNbh(nbhRoads);
                                        }
                                    }

                                    //console.log(newNetwork);
                                    onChangeNetwork(newNetwork);
                                    onChangeView('main');
                             
                                })
                                  .catch((err) => {

                                  });
                            })})
                    
                    }

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
    <>
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
    </>
    )
}               