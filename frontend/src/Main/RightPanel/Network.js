import React, { useCallback } from 'react';
import { Section } from "../../Components/Section";
import { polygonContains }  from 'd3-polygon';
import {distanceBetween2Points, intersectionTwoLinesSegments } from '../../utilityFunctions/mathFunctions'

export const PanelNetwork = ({
    showCurrentRoads,
    onChangeCurrentRoads,
    onChangeDrawPointer,
    onChangeRoadData,
    roadData,
    network,
    onChangeNetwork,
    showOnlyIntersectionNodes,
    showRoadColors,
    newRoad,
    onChangeNewRoad,
    handleAddRoad,
    roadLineWidth,
    }) => {
    
    const handleMaxSpeed = (roadType, newSpeed) => {
        if (parseInt(newSpeed) > 0) 
            roadType.maxSpeed = parseInt(newSpeed);
        else 
            roadType.maxSpeed  = '';
        onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
    }   

    const handleRoadColor = (roadTypeId, newColor) => {
        network.roadTypes.types[roadTypeId].color = newColor;
        onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
    }

    const displayCurrentRoads = () => {
        const tableElements = []
        for(let typeId in network.roadTypes.types){
            let type = network.roadTypes.types[typeId]
            if(type.number > 0){
                tableElements.push(
                <tr key={type.id}>
                    <td>{type.name}</td>
                    {showRoadColors === true && <td><input type="color" className="colorInput" value={type.color} onChange={(e) => handleRoadColor(type.id, e.target.value)}></input></td>}
                    <td><input type="number" className="panel-input-num" value={type.maxSpeed} onChange={(e) => handleMaxSpeed(type, e.target.value)}></input></td>
                </tr>)   
            }
        }

        return  <table className='mt-2 mb-4 tablePanel'>
                    <thead>
                        <tr>
                            <th><strong>Type of Roads</strong></th>
                            {showRoadColors === true && <th><strong>Color</strong></th>}
                            <th><strong>Speed&nbsp;limit (km/h)</strong></th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableElements}
                    </tbody>
                </table>
    }

    // OK
    const displayNumNodes = useCallback(() => {
        if(showOnlyIntersectionNodes)
            return network.getAllIntersectionNodes().length;
        return Object.keys(network.nodes).length;
    }, [showOnlyIntersectionNodes, network])

    // OK
    const toggleShowCurrentRoads = () => {
        onChangeCurrentRoads(!showCurrentRoads);
    }


    const handleNewRoadType = (e) => {
        if(roadData){
            roadData.type = e.target.value
            onChangeRoadData({...roadData});
        }
        
    }


    const handleNewRoadDir = (e) => {
        if(roadData){
            roadData.direction = e.target.value
            onChangeRoadData({...roadData});
        }
        
    }

    
    const addRoad = () => {
        //Divide the Road into nbhs (max. 2)
        if(newRoad.length < 2){
            console.log("PopUp: At leas two points are needed");
            return;
        }

        
        console.log("Road", newRoad)
        for(let i = 1; i < newRoad.length; i++){
            if(roadData.road === "bRoad"){
                if(!newRoad[i-1].nbh && !newRoad[i].nbh){
                    newRoad[i-1].nbh = network.addNbh([]);
                    newRoad[i].nbh = newRoad[i-1].nbh;
                }else{
                    if(!newRoad[i-1].nbh){
                        if(newRoad[i].nbh.isClosed())
                            newRoad[i-1].nbh = network.addNbh([]);
                        else
                            newRoad[i-1].nbh = newRoad[i].nbh;
                    }else if(!newRoad[i].nbh){
                        if(newRoad[i-1].nbh.isClosed())
                            newRoad[i].nbh = network.addNbh([]);
                        else
                            newRoad[i].nbh = newRoad[i-1].nbh;
                    } else if(newRoad[i-1].nbh.isClosed() && !newRoad[i].nbh.isClosed())
                        newRoad[i-1].nbh = newRoad[i].nbh;
                    else if(newRoad[i-1].nbh.isClosed() && newRoad[i].nbh.isClosed() && newRoad[i-1].nbh !== newRoad[i].nbh){
                        
                        let sharedRoad;
                        for(let bRoad of newRoad[i-1].nbh.bRoads){
                            if(newRoad[i].nbh.bRoads.includes(bRoad))
                                sharedRoad = bRoad;
                        }

                        if(!sharedRoad){

                        newRoad[i-1].nbh = network.addNbh([]);
                        newRoad[i].nbh =  newRoad[i-1].nbh;

                        let node1 = newRoad[i-1].id;
                        let node2 = newRoad[i].id;
                        
                        //shortest path
                        let adjList = {}
                            let bRoads = network.getNbhsBRoads();
                            for(let bRoad of bRoads){
                            if(!adjList[bRoad.nodes[0].id])
                                adjList[bRoad.nodes[0].id] = [];
                            if(!adjList[bRoad.nodes[0].id].includes(bRoad.nodes[bRoad.nodes.length-1].id))
                                    adjList[bRoad.nodes[0].id].push(bRoad.nodes[bRoad.nodes.length-1].id)
                            
                            if(!adjList[bRoad.nodes[bRoad.nodes.length-1].id])
                                adjList[bRoad.nodes[bRoad.nodes.length-1].id] = [];
                            if(!adjList[bRoad.nodes[bRoad.nodes.length-1].id].includes(bRoad.nodes[0].id))
                                adjList[bRoad.nodes[bRoad.nodes.length-1].id].push(bRoad.nodes[0].id)
                            
                        }

                        console.log("List", adjList);
                        console.log("nodes", node1, node2);

                        console.log(network);
                

                        let visited = {}
                        let prevNode = {}
                        for(let node in adjList){
                            visited[node] = false;
                        }

                        let queue = []                    

                        visited[node1] = true;
                        queue.unshift(node1); 
                        console.log(queue)
                        while (queue.length !== 0){
                            let visiting = queue.pop();
                            for (let nodeId of adjList[visiting]) {
                                if (visited[nodeId] === false) {  
                                    visited[nodeId] = true;
                                    queue.unshift(nodeId);
                                    prevNode[nodeId]= visiting;
                                }
                                if (nodeId === node2){
                                    queue = [];
                                    break;
                                }
                            }
                        }

                        let route = [];
                        let node = node2;
                        while(node !== undefined){
                            route.unshift(node);
                            node = prevNode[node];
                        }
                        console.log("1Route", route);

                                for(let j = 1; j < route.length; j++){
                                    let nodeA = network.nodes[route[j-1]]
                                    let nodeB = network.nodes[route[j]]
                                    for(let nbhId in network.nbhs){
                                        let involvedNbh = network.nbhs[nbhId]
                                        if(involvedNbh !== newRoad[i-1].nbh){
                                        let nbhSides_ = involvedNbh.getbRoadsByPolySide();
                                        for(let side of nbhSides_){
                                            let sideNodes = involvedNbh.getSideNodes(side);
                                            if(sideNodes.includes(nodeA) && sideNodes.includes(nodeB)){
                                                for(let road of side){
                                                    console.log("this should be added", road);
                                                    newRoad[i-1].nbh.addRoadToBRoads(road);
                                                }
                                            }
                                        }
                                        console.log(newRoad[i-1].nbh.getBNodes())
                                    }
                                  
                                }
                            }
                               
                            }
                        }


                }
       

        }
    }


       for (let i = 1; i < newRoad.length; i++){
            if(i === 1 && newRoad[i].type === "oNode"){
                if(newRoad[i-1].nbh !== newRoad[i].nbh){
                    let outerNodes = newRoad[i].nbh.getONodes();
                    if(outerNodes.includes(network.nodes[newRoad[i-1].id])){
                        newRoad[i-1].nbh = newRoad[i].nbh;
                    }
                }
            }
            let outerNodes = newRoad[i].nbh.getONodes();
            if(outerNodes.includes(network.nodes[newRoad[i].id]))
                newRoad[i].nbh = newRoad[i-1].nbh;
        }
        
       
        let newRoads = {};
        let j = 0;
        for (let i = 1; i < newRoad.length; i++){
            if(newRoad[i-1].nbh !== newRoad[i].nbh){
                let lineBPoint1 = newRoad[i-1].point;
                let lineBPoint2 = newRoad[i].point;
                
                let sharedRoad;
                for(let bRoad of newRoad[i-1].nbh.bRoads){
                    if(newRoad[i].nbh.bRoads.includes(bRoad))
                        sharedRoad = bRoad;
                }
                if(sharedRoad){
                    for(let k = 1; k < sharedRoad.nodes.length; k++){
                        let lineAPoint1 = [sharedRoad.nodes[k-1].x, sharedRoad.nodes[k-1].y];
                        let lineAPoint2 = [sharedRoad.nodes[k].x, sharedRoad.nodes[k].y];
                        let intersectionPoint = intersectionTwoLinesSegments(lineAPoint1, lineAPoint2, lineBPoint1, lineBPoint2, roadLineWidth);
                        console.log("intersectionPoint", intersectionPoint)
                        if(intersectionPoint){
                            if (distanceBetween2Points(intersectionPoint, newRoad[i-1].point) < roadLineWidth){
                                newRoads[newRoad[i-1].nbh.id] = newRoad.slice(j, i)
                                j = i - 1;
                            }else if(distanceBetween2Points(intersectionPoint, newRoad[i].point) < roadLineWidth){
                                newRoads[newRoad[i-1].nbh.id] = newRoad.slice(j, i + 1)
                                j = i;
                            }else{
                                newRoad.splice(i, 0, {nbh: newRoad[i].nbh, point: intersectionPoint, isIntersection: true, type:  "bRoad", id: sharedRoad.id, index: k-1})
                                newRoads[newRoad[i-1].nbh.id] = newRoad.slice(j, i + 1)
                                j = i;
                            }
                            newRoad[j].point = intersectionPoint;
                            newRoad[j].isIntersection = true;
                            newRoad[j].id = newRoad[j].type === ""? sharedRoad.id: newRoad[j].id;
                            newRoad[j].index = k-1;
                            newRoad[j].type = newRoad[j].type === ""? "bRoad": newRoad[j].type;

                        }
                    } 
                }
                
            }
            if( i === newRoad.length - 1){
                newRoad[i].isIntersection = true;
                newRoads[newRoad[i].nbh.id] = newRoad.slice(j)
            }
        }

        //Classified where the point lies.
        for(let i = 0; i < newRoad.length; i++){
            if (newRoad[i].type === "" && newRoad[i].isIntersection){
                let set = false;
                let nbhRoads = newRoad[i].nbh.getAllRoads();
                for(let road of nbhRoads){
                    let roadNodes = road.nodes;
                    for(let j = 1; j < roadNodes.length; j++){
                        let pointA = {x: roadNodes[j-1].x, y: roadNodes[j-1].y}
                        let pointB = {x: roadNodes[j].x, y: roadNodes[j].y}
                        //TO-DO!!!!!!!
                        let roadPoly = road.segmentToPolygon(pointA, pointB, roadLineWidth);
                        if(polygonContains(roadPoly, newRoad[i].point)){
                            set = true;
                            let roadDistance = distanceBetween2Points([pointA.x, pointA.y],[pointB.x, pointB.y])           
                            let normVector =  [(pointA.x-pointB.x)/roadDistance, (pointA.y-pointB.y)/roadDistance];
                            let distToPoint = distanceBetween2Points([pointB.x, pointB.y], newRoad[i].point)  
                            let newPointA = pointB.x +  (normVector[0] * distToPoint)
                            let newPointB = pointB.y +  (normVector[1] *  distToPoint)
                            newRoad[i].point = [Math.round((newPointA * 100)) / 100, Math.round((newPointB * 100)) / 100];
                            newRoad[i].id = road.id;
                            newRoad[i].index = j-1;
                        
                            break;
                        }
                    }
                    if(set){
                        let nbh = newRoad[i].nbh;
                        if(nbh.bRoads.includes(network.roads[newRoad[i].id])){
                            newRoad[i].type = "bRoad";

                        }else if(nbh.cRoads.includes(network.roads[newRoad[i].id])){
                            newRoad[i].type = "cRoad";
                        }else{
                            newRoad[i].type = "iRoad";
                        }
                        break;
                    }
                }
            }
        }

        console.log(newRoads);

        //Constrains
        for(let newRoadNbh in newRoads){
            if(newRoads[newRoadNbh].length === 1){ continue;}
            let conPoint1 = newRoads[newRoadNbh][0];
            let conPoint2 =  newRoads[newRoadNbh][ newRoads[newRoadNbh].length-1];
            if(conPoint1.type === "" && conPoint2.type === "" && Object.values(network.nbhs).length > 1){
                console.log("PopUp: At least one connection point must be connected to the Network");
                return;
            }else if(roadData.road !== "bRoad" && (conPoint1.type === "oNode" || conPoint2.type === "oNode")){
                let otherType = conPoint1.type === "oNode"? conPoint2.type: conPoint1.type;
                if(otherType === "oNode" || otherType === "bRoad"){
                    console.log("The backbone can only be connected to the internal network");
                    return;
                }
            }else if(roadData.road !== "bRoad" && (conPoint1.type === "bRoad" || conPoint2.type === "bRoad")){
                let otherType = conPoint1.type === "bRoad"? conPoint2.type : conPoint1.type;
                if(otherType === "bRoad"){
                    for(let nbhId in network.nbhs){
                        let nbh = network.nbhs[nbhId]
                        if(nbh.bRoads.length === 0)
                            network.deleteNbh(nbh);
                    }
                    console.log("The backbone can only be connected to the internal network");
                    return;
                }
            }else if(roadData.road === "bRoad" && !(!(conPoint1.type === "oNode" && conPoint2.type === "oNode") || !(conPoint1.type === "bRoad" && conPoint2.type === "bRoad") || !(conPoint1.type === "oNode" && conPoint2.type === "bRoad") || !(conPoint1.type === "bRoad" && conPoint2.type === "oNode") || !(conPoint1.type === "oNode" && conPoint2.type === "") || !(conPoint1.type === "" && conPoint2.type === "oNode"))){
                    for(let nbhId in network.nbhs){
                        let nbh = network.nbhs[nbhId]
                        if(nbh.bRoads.length === 0)
                            network.deleteNbh(nbh);
                    }
                    console.log("PopUp: Both points muss be connected to the backbone");
                    return;
                }
         //Missing that cNodes should also not be included in the last 2 posibilities. 
        }

        //If the restrictions were passed, the road can be added

        console.log(newRoads);

        if(roadData.road === "bRoad"){
            for(let newRoadNbh in newRoads){
                if(newRoads[newRoadNbh].length === 1){ continue;}
                let newRoadNodes = [];
                let conPoint1 = newRoads[newRoadNbh][0];
                let conPoint2 = newRoads[newRoadNbh][newRoads[newRoadNbh].length-1];
                for(let point of newRoads[newRoadNbh]){
                    if(point === conPoint1 || point === conPoint2){
                        if(point.type.includes("Node")){
                            newRoadNodes.push(network.nodes[point.id]);
                        }else if(point.type.includes("bRoad")){
                            let newNode = network.addNode(point.point, true, true);
                            newRoadNodes.push(newNode);
                            network.divideRoadByAddingNode(point.nbh, point.id, newNode.id, point.index);

                            point.type = "oNode";
                            point.id = newNode.id;
                        }else{
                            let newNode = network.addNode(point.point, true, true);
                            newRoadNodes.push(newNode);
                            point.type = "oNode";
                            point.id = newNode.id;
                        }

                    }
                    else{
                        let newNode = network.addNode(point.point);
                        newRoadNodes.push(newNode.id);
                    }
                }



                let newRoad = network.addRoad(newRoadNodes, network.roadTypes.types[roadData.type], roadData.direction, true);
                console.log("important", network.nbhs[newRoadNbh]);

                console.log("HEY", !network.nbhs[newRoadNbh].isClosed());
                

                if (!network.nbhs[newRoadNbh].isClosed()){
                    console.log("INSIDE!")
                    network.nbhs[newRoadNbh].addRoadToBRoads(newRoad);
                    

                    //consigue los vecundarios que estan relacionados.
                    let bNodes = network.nbhs[newRoadNbh].getBNodes();
                    
                    let standAloneNodes = [];
                    for(let node of bNodes){
                        let count = 0;
                        standAloneNodes.push(node);
                        for(let bRoad of network.nbhs[newRoadNbh].bRoads){
                            if(bRoad.nodes.includes(node)){
                                count ++;
                            }
                        }
                        if(count > 1){
                            standAloneNodes.pop();
                        }
                    }
                    
                    console.log("StandAlone", standAloneNodes);

                    let mapNodeWithNbh = {}
                    for(let standAloneNode of standAloneNodes){
                        mapNodeWithNbh[standAloneNode.id] = [];
                    }

                    for(let standAloneNode of standAloneNodes)
                    for(let nbhId in network.nbhs){
                        let nbh_ = network.nbhs[nbhId];
                        if(network.nbhs[newRoadNbh] !== nbh_){
                            if(nbh_.getBNodes().includes(standAloneNode))
                            mapNodeWithNbh[standAloneNode.id].push(nbh_)
                        }
                    }

                    let canBeClosed = true;
                    for(let nodeId in mapNodeWithNbh){
                        if(mapNodeWithNbh[nodeId].length === 0)
                            canBeClosed = false;
                    }


                    if(canBeClosed){
                        console.log("can be closed")
                        if(standAloneNodes.length > 1){
                        let involvedNbhs = []
                        for(let nodeId in mapNodeWithNbh){
                            for(let nbh of mapNodeWithNbh[nodeId]){
                                if(!involvedNbhs.includes(nbh))
                                    involvedNbhs.push(nbh);
                            }
                        }
                   
                        let adjList = {}
                        for(let involvedNbh of involvedNbhs){
                            for(let bRoad of involvedNbh.bRoads){
                            if(!adjList[bRoad.nodes[0].id])
                                adjList[bRoad.nodes[0].id] = [];
                            if(!adjList[bRoad.nodes[0].id].includes(bRoad.nodes[bRoad.nodes.length-1].id))
                                    adjList[bRoad.nodes[0].id].push(bRoad.nodes[bRoad.nodes.length-1].id)
                            
                            if(!adjList[bRoad.nodes[bRoad.nodes.length-1].id])
                                adjList[bRoad.nodes[bRoad.nodes.length-1].id] = [];
                            if(!adjList[bRoad.nodes[bRoad.nodes.length-1].id].includes(bRoad.nodes[0].id))
                                adjList[bRoad.nodes[bRoad.nodes.length-1].id].push(bRoad.nodes[0].id)
                            
                            }
                        };

                        

                        let visited = {}
                        let prevNode = {}
                        for(let node in adjList){
                            visited[node] = false;
                        }

                        let queue = []

                        console.log("List", adjList, standAloneNodes)

                        visited[standAloneNodes[0].id] = true;
                        queue.unshift(standAloneNodes[0].id); 
                        console.log(queue)
                        while (queue.length !== 0){
                            let visiting = queue.pop();
                            for (let nodeId of adjList[visiting]) {
                                if (visited[nodeId] === false) {  
                                    visited[nodeId] = true;
                                    queue.unshift(nodeId);
                                    prevNode[nodeId]= visiting;
                                }
                                if (nodeId === standAloneNodes[1].id){
                                    queue = [];
                                    break;
                                }
                            }
                        }

                        let route = [];
                        let node = standAloneNodes[1].id;
                        while(node !== undefined){
                            route.unshift(node);
                            node = prevNode[node];
                        }

                        //por vecindario
                        for(let involvedNbh of involvedNbhs){
                            for(let i = 1; i < route.length; i++){
                                let nodeA = network.nodes[route[i-1]]
                                let nodeB = network.nodes[route[i]]
                                let nbhSides_ = involvedNbh.getbRoadsByPolySide();
                                for(let side of nbhSides_){
                                    let sideNodes = network.nbhs[newRoadNbh].getSideNodes(side);
                                    if(sideNodes.includes(nodeA) && sideNodes.includes(nodeB))
                                            for(let road of side){
                                                network.nbhs[newRoadNbh].addRoadToBRoads(road);
                                    }
                                }
                            }
                        }
                    }
                }
                    




                
                    


                }else{
                    network.divideNbhByRoad(newRoad, network.nbhs[newRoadNbh]);
                    console.log("divide!")
                }
                console.log(network.nbhs[newRoadNbh]);
                console.log(network);




            }
            network.calculateSize();
        }
    
        else{
            for(let newRoadNbh in newRoads){
                if(newRoads[newRoadNbh].length === 1){ continue;}
                let newRoadNodes = [];
                let conPoint1 = newRoads[newRoadNbh][0];
                let conPoint2 =  newRoads[newRoadNbh][ newRoads[newRoadNbh].length-1];
                for(let point of newRoads[newRoadNbh]){
                    if(point === conPoint1 || point === conPoint2){
                        if(point.type.includes("Node")){
                            newRoadNodes.push(network.nodes[point.id]);
                        }else if(point.type.includes("Road")){
                            let newNode = network.addNode(point.point, true, point.type === "bRoad"? true  : false);
                
                            newRoadNodes.push(newNode);
                            network.divideRoadByAddingNode(point.nbh, point.id, newNode.id, point.index);
                            if(point.type === "bRoad"){
                                point.type = "oNode";
                                point.id = newNode.id;
                            }else{
                                point.type = "iNode";
                                point.id = newNode.id;
                            }
                        }else{
                            let newNode = network.addNode(point.point, true, false);
                            newRoadNodes.push(newNode);
                            point.type = "iNode";
                            point.id = newNode.id;
                        }
                    }
                    else{
                        let newNode = network.addNode(point.point, false, false);
                        newRoadNodes.push(newNode);
                    }
                }
                let newRoad = network.addRoad(newRoadNodes, network.roadTypes.types[roadData.type], roadData.direction);

                if(conPoint1.type === "iNode" || conPoint2.type === "iNode"){
                    let otherType = conPoint1.type === "iNode"? conPoint2.type: conPoint1.type;
                    if(otherType === "iNode" || otherType === ""){
                        
                        network.nbhs[newRoadNbh].iRoads.push(newRoad);
                    }else{
                        network.nbhs[newRoadNbh].cRoads.push(newRoad);
                    }
                }
            }
        }
        
       
        onChangeRoadData(null)
        onChangeDrawPointer(false);
        onChangeNewRoad(null);
       
    }


    const cancelAddRoad = () => {
        onChangeDrawPointer(false);
        onChangeRoadData(null);
        onChangeNewRoad(null);
    }
    if(roadData){
        return(
            <Section name="Add Road">
                <table className="mb-6 tablePanel">
                <tbody>
                    <tr>
                        <td><strong>Length:</strong></td>
                        <td>
                            {Math.round((roadData.length * 100)) / 100 } m
                        </td>
                    </tr>
                    <tr>
                        <td><strong>Type of Road(s):</strong></td>
                        <td>
                        <select className="options-input" value={roadData.type} onChange={handleNewRoadType}>
                        {network.roadTypes.asOptions()}
                        </select>
                        </td>
                    </tr>
                    <tr>
                        <td><strong>Max Speed:</strong></td>
                        <td>
                        {network.roadTypes.types[roadData?.type]?.maxSpeed} km/h
                        </td>
                    </tr>

                    <tr>
                        <td><strong>Direction:</strong></td>
                        <td>
                        <select className="options-input" value={roadData.direction} onChange={handleNewRoadDir}>
                            <option value='both'>Both</option>
                            <option value='oneway'>Oneway</option>
                            <option value='reverse'>Reverse</option>
                        </select>
                        </td>
                    </tr>
                
                </tbody>
            </table>
            <div className="mt-4 mb-4"><small><strong>Tips:</strong><br/><strong>alt + click</strong> = Delete last Node <br/><strong> schift + click</strong> = Add form Node</small></div>
            <div className="flex">
            <button className="btn section-btn-2" type="button" onClick={cancelAddRoad}>Cancel</button>  
            <button className="btn section-btn-2" type="button" onClick={addRoad}>Add</button>         
            </div>
        </Section>
        );
    }

    //else if(typeof showRoadColors === 'object' && showRoadColors !== null){}
    
    else {
        return(
        <><Section name="Details">
            <table className="mb-4 tablePanel">
                <tbody>
                    <tr>
                        <td><strong>Type of Backbone:</strong></td>
                        <td>{network.topology}</td>
                    </tr>
                    <tr>
                        <td><strong>Size (meters):</strong></td>
                        <td>w:&nbsp;{network.size.w} <br /> h:&nbsp;{network.size.h}</td>
                    </tr>
                    <tr>
                        <td><strong> # Nbhs:</strong></td>
                        <td>{Object.keys(network.nbhs).length}</td>
                    </tr>
                    <tr>
                        <td><strong> # Roads: </strong></td>
                        <td>{Object.keys(network.roads).length}</td>
                    </tr>
                    <tr>
                        <td><strong> # Nodes: </strong></td>
                        <td>{displayNumNodes()}</td>
                    </tr>

                </tbody>
            </table>
            <hr/>
            <div className="section-row mt-2"><div><strong>Type of current roads</strong></div>{showCurrentRoads? <div className="toggle" onClick={toggleShowCurrentRoads}>	&#x25BC; </div> : <div className="toggle" onClick={toggleShowCurrentRoads}> &#x25B6; </div> }</div>
            <div className={!showCurrentRoads? 'hidden' :""}>
                {displayCurrentRoads()}
            </div>
            <hr/>
        </Section>
        <Section name="Actions">
        <button className="btn section-btn mt-2 mb-4" type="button" onClick={() => handleAddRoad("bRoad")}>Add Backbone Road</button>
        <button className="btn section-btn mt-2" type="button" onClick={() => handleAddRoad("iRoad")}>Add Inner Road</button>
    </Section></>);
    }
    
   
        
}