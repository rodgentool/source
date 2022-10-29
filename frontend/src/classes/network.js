import { RoadTypes } from "../classes/roadTypes";
import { Node } from "../classes/node";
import { Road } from "../classes/road";
import {min, max} from "d3";
import { Nbh } from "./neighborhood";
import { roundTo2,  isOnLineSegment  } from "../utilityFunctions/mathFunctions";

export class Network{
    
    constructor (initialTopology='Custom', InitDefaultRoads=false) {
        this.topology = initialTopology;
        this.size =  {w: 0,  h:0};
        this.roadTypes =  new RoadTypes();
        this.nodes =  {};
        this.roads = {};
        this.nbhs = {};
        this.nextNodeId = 0;
        this.nextRoadId = 0;
        this.nextNbhId = 0;
        this.defaultLenght = 500;

        if(InitDefaultRoads){
            this.roadTypes.setDefaultRoads();
        }
    }

    //Types
    getRoadTypeById(id, value=null){
        if(value)
            return this.roadTypes.types[id][value];
        else 
            return this.roadTypes.types[id];
    }

    setRoadTypeMaxSpeed(roadType, newMaxSpeed){
        roadType.setMaxSpeed(newMaxSpeed);
    }

    getRoadTypesAsOption(){
        return this.roadTypes.asOptions();
    }

    addRoadType(name, maxSpeed, color, number=0, id=undefined){
        let roadType = this.roadTypes.addRoadType(name, maxSpeed, color, number, id);
        return roadType;
    }

    //Node Functions

     /** OK
     * Create a new node and add it to the list of network nodes
     * @param {Array<Number>} nodePosition Position of the node of the form [x, y]
     * @param {Boolean} [isIntersection=false]  Specifies whether the node is an intersection 
     * @param {Boolean} [isNbhBoundary=false] Specifies whether the node is part of the polygon that defines the neighborhood boundaries
     * @param {Boolean} [isSelected=false]  Specifies whether the node is selected
     * @param {Number} [id=nextNodeId++] Id of the node with auto increment
     * @returns {Node} the creted node
     */
    addNode(nodePosition, isIntersection=false, isNbhBoundary=false, isSelected=false, id=this.nextNodeId++) {
        this.nodes[id] = new Node(id, nodePosition, isIntersection, isNbhBoundary, isSelected);
        return this.nodes[id];
    } 

    // OK
    getAllIntersectionNodes(){
        let intersectionNodes = [];
        for (let nodeId in this.nodes){
            let node = this.nodes[nodeId]
            if (node.isIntersection){
                intersectionNodes.push(node);
            }
        }
        return intersectionNodes;
    }


    //Road Functions

    /** OK
     * Create a new road and add it to the list of network roads
     * @param {Array<Node>} nodes Nodes that make up the road
     * @param {RoadType} type Type of road
     * @param {String} [direction="both"] Direcction of the road : 'both' || 'oneway' || 'reverse'
     * @param {Boolean} [isNbhBoundary=false] If true, the road is part of the polygon that defines the neighborhood boundaries
     * @param {Boolean} [isSelected=false] Defines if the road is selected
     * @param {Number} [id=nextRoadId++] Id of the road with auto increment
     * @returns {Road} the created road
     */
    addRoad(nodes, type=this.roadTypes.types[0], direction="both", isNbhBoundary=false, isSelected=false, id=this.nextRoadId++){
        this.roads[id] = new Road(id, nodes, type, direction, isNbhBoundary, isSelected)
        type && this.roadTypes.types[type.id].increment();
        return this.roads[id];
    }
    
    //OK
    //Delete Road from the network and and the respective neighborhood
    deleteRoad(road, type, nbh, clearNbh=false){
        //For backbone Roads is not needed to give a nbh
        let cNodes = nbh.getCNodes();

        if(type === 'bRoad'){
            let sharedNbhs = this.getBRoadSharedNbhs(road);
            for(let nbh_ of sharedNbhs){
                nbh_.deleteRoad(type, road);
            }
        }
        else {nbh.deleteRoad(type, road);}
        this.roadTypes.types[road.type.id].decrement();
        delete this.roads[road.id];

        //Delete Nodes
        for(let rNode of road.nodes){
            if (rNode.isIntersection){
                if (clearNbh && (type === 'iRoad' || (type === 'cRoad' && !cNodes.includes(rNode)))){
                    delete this.nodes[rNode.id]
                }
                   
                else if(!this.isIntersectionShared(rNode, road, type, nbh)){
                    //Used to delete the connection
                    if (type === 'cRoad' &&  cNodes.includes(rNode) ){
                        let bRoadsSharingrNode = []
                        for(let bRoad of nbh.bRoads){
                            if(bRoad.nodes.includes(rNode))
                                bRoadsSharingrNode.push(bRoad)
                        }
                        //console.log(bRoadsSharingrNode[0], bRoadsSharingrNode[1])
                        this.merge2BRoadsOnNode(bRoadsSharingrNode[0], bRoadsSharingrNode[1], rNode, nbh);
                    } else if(clearNbh || type !== 'bRoad')
                       delete this.nodes[rNode.id];
                }
            } else 
                delete this.nodes[rNode.id];
        }
    }

    //OK
    isIntersectionShared(node, road, type, nbh){
        if(type === 'bRoad'){
            for(let nbhId in this.nbhs){
                let nbh_ = this.nbhs[nbhId];
                if(nbh_.getBNodes().includes(node))
                    return true;
            }
        }else if(type === 'cRoad' && nbh.getCNodes().includes(node)){
            if(nbh.cRoads.reduce((prev, current) => current.getNodesIds().includes(node.id)? prev + 1 : prev, 0) >= 1)
                return true;

            for(let nbhId in this.nbhs){
                let nbh_ = this.nbhs[nbhId];
                if(nbh_ === nbh) continue;
                else if(nbh_.getCNodes().includes(node))
                    return true;
            }
        }else{
            let iRoads = nbh.cRoads.concat(nbh.iRoads);
            for(let road_ of iRoads){
                if (road_ !== road && road_.nodes.includes(node)){
                    return true;
                }
            }
        }
        return false;
    }

    merge2BRoadsOnNode(road1, road2, node, nbh){
        let road1NodeI = road1.nodes.indexOf(node)
        let road2NodeI = road2.nodes.indexOf(node)
        road1.nodes.splice(road1NodeI, 1);
        road2.nodes.splice(road2NodeI, 1);
     
        let mergedRoad = road1NodeI > road2NodeI ? road1 : road2
        let toDeleteRoad = road1NodeI <= road2NodeI ? road1 : road2
        mergedRoad.nodes = mergedRoad.nodes.concat(toDeleteRoad.nodes);
        this.deleteRoad(toDeleteRoad, 'bRoad', nbh);
        delete this.nodes[node.id];  
    }

    //OK
    setRoadsType(roads, newType) {
        for (let road of roads){
            road.type.decrement();
            road.setRoadType(newType);
            road.type.increment();
        }
    }

    //OK
    setRoadsDirection(roads, dir){
        for (let road of roads){
            road.setRoadDirection(dir);
        }
    }


    // Nbh Functions
    //OK
    addNbh(backboneRoads, connectionRoads=[], innerRoads=[], id=this.nextNbhId++){
        this.nbhs[id] = new Nbh(id, backboneRoads, connectionRoads, innerRoads);
        this.calculateSize();
        return this.nbhs[id];

    }
    //OK
    emptyNbh(nbh){
        for(let i = 0;  i < nbh.iRoads.length; i++){
            this.deleteRoad(nbh.iRoads[i], 'iRoad', nbh, true);
            i--;
        }
        for(let i = 0;  i < nbh.cRoads.length; i++){
            this.deleteRoad(nbh.cRoads[i], 'cRoad', nbh, true);
            i--;
        }
    }

    // OK
    deleteNbh(nbh){
        this.emptyNbh(nbh);
        for(let i = 0; i < nbh.bRoads.length; i++){
            let bRoad = nbh.bRoads[i];
            let deleteRoad = true;
            for(let nbhId in this.nbhs){
                let nbh_ = this.nbhs[nbhId];
                if(nbh_ !== nbh  && nbh_.bRoads.includes(bRoad))
                    deleteRoad = false;
            }
            if(deleteRoad){
                this.deleteRoad(bRoad, 'bRoad', nbh, true)
                i--;
            }
        }
        delete this.nbhs[nbh.id];
        
    }

    getNbhsBNodes(){
        let nbhsBNodes = [];
        for (let nbh in this.nbhs)
            nbhsBNodes = nbhsBNodes.concat(this.nbhs[nbh].getBNodes())
        nbhsBNodes = [...new Set(nbhsBNodes)];
        return nbhsBNodes;
    }

    getNbhsONodes(){
        let nbhsONodes = [];
        for (let nbh in this.nbhs)
            nbhsONodes = nbhsONodes.concat(this.nbhs[nbh].getONodes())
        nbhsONodes = [...new Set(nbhsONodes)];
        return nbhsONodes;
    }

    getNbhsBRoads(){
        let nbhsORoads = []
        for (let nbh in this.nbhs){
            nbhsORoads = nbhsORoads.concat(this.nbhs[nbh].getBRoads());
        }
        nbhsORoads = [...new Set(nbhsORoads)];
        return nbhsORoads;
    }

    getNbhsCRoads(){
        let nbhsCRoads = []
        for (let nbh in this.nbhs){
            nbhsCRoads = nbhsCRoads.concat(this.nbhs[nbh].getCRoads());
        }
        nbhsCRoads = [...new Set(nbhsCRoads)];
        return nbhsCRoads;
    }


    // For dragn and drop nodes this can be usefull
    // getNbhBNodesBoundaries(nbh){
    //     let bNodesBoundaries = {};
    //     let bNodes = nbh.getBNodes();

    //     for(let bNode of bNodes){
    //         //Distance
    //         let left = -Infinity;
    //         let right = Infinity;
    //         let top = -Infinity;
    //         let bottom = Infinity;
    //         let sharedNbhs = this.getBNodeSharedNbh(bNode);
    //         for (let nbh of sharedNbhs){
    //             let boundaries = this.getNbhNearestNodeValues(bNode, nbh);
    //             if(Math.sign(boundaries.x) === 1 &&  right > boundaries.x)
    //                 right = boundaries.x;
    //             else if (Math.sign(boundaries.x) === -1  && left < boundaries.x)
    //                 left = boundaries.x;
    //             if(Math.sign(boundaries.y) === 1 &&  top > boundaries.y)
    //                 top = boundaries.y;
    //             else if (Math.sign(boundaries.y) === -1  && bottom < boundaries.y)
    //                 bottom = boundaries.y;
    //         }

    //         //Position
    //         bNodesBoundaries[bNode.id] = {x: [bNode.x+left, bNode.x+right], y: [bNode.y+top, bNode.y+bottom]};
    //     }
    //     return bNodesBoundaries;
    // }


    // getNbhNearestNodeValues(bNode, nbh){
    //     let oNodes = nbh.getINodes(false);
    //     let minX = min(oNodes, oNode => oNode.x - bNode.x);
    //     let minY = min(oNodes, oNode => oNode.y - bNode.y);
    //     return {x: minX, y: minY};
    // }

   

    getBRoadSharedNbhs(bRoad){
        let sharedNbhs = []
        for(let nbhId in this.nbhs){
            if (this.nbhs[nbhId].bRoads.includes(bRoad))
                sharedNbhs.push(this.nbhs[nbhId]);
        }
        return sharedNbhs;
    }

    // OK
    getBNodeSharedNbh(bNode){
        let sharedNbhs = [];
        for(let nbhId in this.nbhs){
            let nbh = this.nbhs[nbhId];
            let nbhBNodes = nbh.getBNodes();
            if(nbhBNodes.includes(bNode)){
                sharedNbhs.push(nbh);
            }
        }
        console.log(sharedNbhs);
        return sharedNbhs;
    }


    //Ok
    nbhContainingPoint(point, lineWidth){
        let nbh = null;
        for (let nbhId in this.nbhs){
            if(this.nbhs[nbhId].containsPoint(point, lineWidth))
                nbh = this.nbhs[nbhId];
        }
        return nbh;
    }

    calculateNbhSize(nbh){
        let bNodes = nbh.getBNodes();
        let minX = min(bNodes, node => node.x);
        let maxX = max(bNodes, node => node.x);
        let minY = min(bNodes, node => node.y);
        let maxY = max(bNodes, node => node.y);
        let distWidth = roundTo2(maxX-minX);
        let distHeight = roundTo2(maxY-minY);
        return {w: distWidth, h: distHeight};
    }

    //getNbhNearestNode(node)
    isPointANode(point, nodeRadius, nodeType="all", nbhs=Object.values(this.nbhs), isIntersection=true){
        if(nodeType === "all" || nodeType === "oNode"){
            for(let nbh of nbhs){
                let oNodes = nbh.getONodes();
                for (let oNode of oNodes){ 
                    let distance = oNode.distanceToNode({x: point[0], y: point[1]})
                    if (distance < nodeRadius) {   
                        if(!isIntersection)
                            return [oNode, "oNode"];
                        else if(oNode.isIntersection)
                            return [oNode, "oNode"];
                    }    
                }
            }
        }
        if(nodeType === "all" || nodeType === "iNode"){
            for(let nbh of nbhs){
                let iNodes = nbh.getINodes();
                for (let iNode of iNodes){ 
                    let distance = iNode.distanceToNode({x: point[0], y:point[1]})
                    if (distance < nodeRadius) {   
                        if(!isIntersection)
                            return [iNode, "iNode"];
                        else if(iNode.isIntersection)
                            return [iNode, "iNode"];
                    }    
                }
            }
        }
        return [null, null];
    }

    getNbhOfBNode(bNode){
        for(let nbhId in this.nbhs){
            let bNodes = this.nbhs[nbhId].getBNodes();
            if(bNodes.includes(bNode)){
                return this.nbhs[nbhId];
            }
        }
        return null;
    }

    //OK
    checkConectionsToNbh(nbh, radius=2){
        let polySides = nbh.getbRoadsByPolySide();
        let connections = [];
        for(let i = 0; i < polySides.length; i++){
            let side = polySides[i];
            let sidePoints;
            connections.push(0);
            let nodeA = side[0].nodes.find(node => node.isNbhBoundary);
            let nodeB = side[side.length-1].nodes.find(node => node.isNbhBoundary);
            sidePoints = [[nodeA.x, nodeA.y], [nodeB.x, nodeB.y]];
            for(let cRoad of nbh.cRoads){
                if(cRoad.nodes[0].isOnLineSegment(sidePoints, radius))
                    connections[i]++;
                else if(cRoad.nodes[cRoad.nodes.length-1].isOnLineSegment(sidePoints, radius))
                    connections[i]++;
            }
        }
        return connections;
    } 

    
    addNbhConnectionsfromClosestNodeToFurther(nbh, sidePoints, num, radius=2){
        let sortNodes = nbh.getINodes();
        sortNodes.sort(function(a,b){
            if (a.distanceToLineSegment(sidePoints) < b.distanceToLineSegment(sidePoints)) {
                return -1
            }if (a.distanceToLineSegment(sidePoints) > b.distanceToLineSegment(sidePoints)) {
                return 1;
            }
            return 0;
            });

        let i = 0;
        for(let sortNode of sortNodes){
            let isConnected = false;
            let added = false;
            for(let cRoad of nbh.cRoads){
                if(cRoad.nodes.includes(sortNode)){
                    for(let node of cRoad.nodes){
                        if(node.isOnLineSegment(sidePoints, radius)){
                            isConnected = true;
                        }
                    }
                }
            }

            if(!isConnected){
                let bRoads = nbh.getBRoads();
                let newNodePos = sortNode.calculatePerpendicularPointOnSegment(sidePoints);
                let [node, ] = this.isPointANode([newNodePos[0], newNodePos[1]], radius, "oNode", [nbh], true)
                if (!node){
                    for(let j = 0; j < bRoads.length; j++){
                        let bRoad = bRoads[j];
                        let nodeA = bRoad.nodes[0];
                        let nodeB = bRoad.nodes[bRoad.nodes.length-1]
                        if(isOnLineSegment([[nodeA.x, nodeA.y], [nodeB.x, nodeB.y]], radius, newNodePos[0], newNodePos[1])){
                            node = this.addNode([newNodePos[0], newNodePos[1]], true, false);
                            added = true;
                            let newInnRoad = this.addRoad([sortNode, node], bRoad.type, bRoad.direction, false, false);
                            nbh.cRoads.push(newInnRoad);

                            let newOutRoad = this.addRoad([node, nodeB], bRoad.type, bRoad.direction, true, false);
                            bRoad.nodes[bRoad.nodes.length-1] = node;
                            for (let nbhId in this.nbhs){
                                let nbh_ = this.nbhs[nbhId];
                                if (nbh_.bRoads.includes(bRoad)){
                                       nbh_.addRoadToBRoads(newOutRoad);
                                }
                            }
                        }
                        if(added){
                    
                            bRoad.calculateLength();
                            break;}
                    } 
                }
                else {
                    let newInnRoad = this.addRoad([sortNode, node], this.getRoadTypeById(0), 'Both', false, false);
                    nbh.cRoads.push(newInnRoad);
                }
                i++;
            }
            if(i >= num)
                break;
        }

    }

    /**
     * Remove a specified number of connections of a neighborhood border from the farthest connection to the closest
     * @param {number} nbhIndex The index of the neighborhood (this.nbhs) to which the connections will be added
     * @param {object} lineSegment Array of 2 elements that represent the beginning and the end of the side of the neighborhood from which the connections will be eliminated
     * @param {number} num Number of connections to be removed
     */
     removeNbhConnectionsfromFurtherNodeToClosest(nbh, sidePoints, num){

        let connectedNodes = [];
        for(let cRoad of nbh.cRoads){
            let first = cRoad.nodes[0]
            let last = cRoad.nodes[cRoad.nodes.length-1];
                if(first.isOnLineSegment(sidePoints) )
                    connectedNodes.push([last, cRoad]);
                else if(last.isOnLineSegment(sidePoints))
                    connectedNodes.push([first, cRoad]);
        }

        connectedNodes.sort(function(a,b){
            if (a[0].distanceToLineSegment(sidePoints) > b[0].distanceToLineSegment(sidePoints)) {
                return -1
            }if (a[0].distanceToLineSegment(sidePoints) < b[0].distanceToLineSegment(sidePoints)) {
                return 1;
            }
            return 0;
            });


        for(let i = 0; i+num < 0; i++){
            this.deleteRoad(connectedNodes[i][1], 'cRoad', nbh);
        }
        
        
            
    }

    fusionNbhsOnRoad(nbh1, nbh2, road){
        let nbh1IdxRoad = nbh1.bRoads.indexOf(road);
        let nbh2IdxRoad = nbh2.bRoads.indexOf(road);
        nbh1.bRoads.splice(nbh1IdxRoad, 1);
        nbh2.bRoads.splice(nbh2IdxRoad, 1);

        let added = [];
        for(let i= 0; i < nbh2.bRoads.length; i++){
            added.push(0);
        }

        do{
            for(let i = 0; i < added.length; i++){
                if(added[i] === 0){
                    let bNodes1 = nbh1.getBNodes();
                    let road_ = nbh2.bRoads[i];
                    let cNodeA = road_.nodes[0];
                    let cNodeB = road_.nodes[road_.nodes.length-1];
                    if(bNodes1.includes(cNodeA) || bNodes1.includes(cNodeB)){
                        nbh1.addRoadToBRoads(road_);
                        added[i] = 1;
                    }
                }
            }
        }
        while(added.includes(0));
        this.deleteNbh(nbh2);

        let isCNodeAShared = false;
        let isCNodeBShared = false;
        for(let nbhId in this.nbhs){
            let nbh_ = this.nbhs[nbhId];
            if(nbh1 !== nbh_ ){
            if(nbh_.getBNodes().includes(road.nodes[0]))
                isCNodeAShared = true;
            if(nbh_.getBNodes().includes(road.nodes[road.nodes[road.nodes.length-1]]))
                isCNodeAShared = true;
            }
        }
        
        if(!isCNodeAShared){
            let bRoadsSharingrNode = []
            for(let bRoad of nbh1.bRoads){
                if(bRoad.nodes.includes(road.nodes[0]))
                    bRoadsSharingrNode.push(bRoad)
            }
            this.merge2BRoadsOnNode(bRoadsSharingrNode[0], bRoadsSharingrNode[1], road.nodes[0], nbh1);
        }  

        if(!isCNodeBShared){
            let bRoadsSharingrNode = []
            for(let bRoad of nbh1.bRoads){
                if(bRoad.nodes.includes(road.nodes[road.nodes.length-1]))
                    bRoadsSharingrNode.push(bRoad)
            }
            this.merge2BRoadsOnNode(bRoadsSharingrNode[0], bRoadsSharingrNode[1], road.nodes[road.nodes.length-1], nbh1);
        }  
        
        



    }
              
            
    // --- Network functions ----

    calculateSize(){
        let nodes = Object.values(this.nodes);
        if(nodes.length !== 0){
        let minX = min(nodes, node => node.x);
        let maxX = max(nodes, node => node.x);
        let minY = min(nodes, node => node.y);
        let maxY = max(nodes, node => node.y);
        this.size.w = roundTo2(maxX-minX);
        this.size.h = roundTo2(maxY-minY);
        }
    }

    /** OK
     * Empty the road network
     */
    emptyNetwork() {
        for (let type in this.roadTypes.types){
            this.roadTypes.types[type].number = 0;
        }
        this.size =  {w: 0,  h:0};
        this.nodes =  {};
        this.roads = {};
        this.nbhs = {};
        this.nextNodeId = 0;
        this.nextRoadId = 0;
        this.nextNbhId = 0;
    }

    //OK
    draw(ctx, scaleX, scaleY, oNodeRadius, iNodeRadius, oRoadLineWidth, iRoadLineWidth, roadsColors=false, nodesColors=false, showOnlyIntersections=true, showDirection=false){

        for(let roadId in this.roads){
            let road  = this.roads[roadId];
            let lineWidth;
            let radius;
            let color =  "rgb(100, 100, 100)";
            if(roadsColors === true){
                color = road.type.color;
            }else if (typeof roadsColors === "object"){
                color = roadsColors[road.id] ? roadsColors[road.id] : "rgb(250, 0, 0)";
            }
            if(road.isNbhBoundary){
                lineWidth = oRoadLineWidth;
                radius = oNodeRadius;
            }
            else{
                lineWidth = iRoadLineWidth;
                radius = iNodeRadius;
            }
            road.draw(ctx, scaleX, scaleY, lineWidth, radius, color, showDirection);
        }

        for(let nodeId in this.nodes){
            let node  = this.nodes[nodeId];
            let radius = node.isNbhBoundary ? oNodeRadius : iNodeRadius;
            let color = nodesColors ? roadsColors[node.id] : 'rgb(0, 0, 0)'
            if(!showOnlyIntersections || node.isIntersection){
                node.draw(ctx, scaleX, scaleY, radius, color);
            }
        }

    }


    //OK
    toString(type='json-project', params=null){
        let network = '';

        if(type === 'json-project'){
            let size = JSON.stringify(this.size);
            let roadTypes = this.roadTypes.toString(type);
           
            let nodes = '"nodes": [\n';
            let nodesList = Object.values(this.nodes);
            for (let i = 0; i < nodesList.length; i++){
                nodes += nodesList[i].toString(type)
                if(i !== nodesList.length-1){
                    nodes += ',\n'
                }else{
                    nodes += '\n\t]'
                }
            }
            let roads = '"roads": [\n';
            let roadsList = Object.values(this.roads);
            for (let i = 0; i < roadsList.length; i++){
                roads += roadsList[i].toString(type)
                if(i !== roadsList.length-1){
                    roads += ',\n'
                }else{
                    roads += '\n\t]'
                }
            }
            let nbhs = '"nbhs": [\n';
            let nbhsList = Object.values(this.nbhs);
            for (let i = 0; i < nbhsList.length; i++){
                nbhs += nbhsList[i].toString(type)
                if(i !== nbhsList.length-1){
                    nbhs += ',\n'
                }else{
                    nbhs += '\n\t]'
                }
            }
    
            network += `\t"topology": "${this.topology}",
    "size": ${size},
    ${roadTypes},
    ${nodes},
    ${roads},
    ${nbhs},
    "nextNodeId": ${this.nextNodeId},
    "nextRoadId": ${this.nextRoadId},
    "nextNbhId": ${this.nextNbhId},
    "defaultLenght": ${this.defaultLenght}`
        
        }
        
        else if(type === 'json-server'){
            let intersectionNodes = this.getAllIntersectionNodes();
            let roads = Object.values(this.roads);
            
            network = '{"nodes": [';
            for (let i = 0; i < intersectionNodes.length; i++){
                if(i !== intersectionNodes.length-1)
                    network += `${intersectionNodes[i].toString('json-server')}, `;
                else
                    network += `${intersectionNodes[i].toString('json-server')}], `;
            }

            network += '"roads": {'
            for(let i = 0; i < roads.length; i++){
                if(roads[i].type){
                    if(i !==  roads.length-1){
                    network += `${roads[i].toString('json-server')}, ` 
                    } else{
                        network += `${roads[i].toString('json-server')}}`  
                    }
                }
            }

            if(params){
                network += `, "params": [`
                for(let i = 0; i < params.length; i++){
                    if(i !== params.length -1){
                        network += `"${params[i]}", `;
                    }
                    else
                        network += `"${params[i]}"]}`;
                }
            }
            else{
                network += "}";
            }
        }
        
        else if(type === 'xml'){
            let nodes = Object.values(this.nodes);
            let roads = Object.values(this.roads);
            for (let node of nodes){
                network += node.toString('xml') + '\n';
            }
            for(let road of roads){
                if(road.type)
                    network += road.toString('xml') + '\n';
            }
        }
        
        else if(type === 'gr'){
            let nodesList = this.getAllIntersectionNodes();
            let roadsList = Object.values(this.roads);
            let n = nodesList.legth;
            let m = roadsList.legth;
            network += 'c RoadNetGan \n';
            network += 'c\n';
            network +=`p sp ${n} ${m}\n`;
            network += `c graph contains ${n} nodes and ${m} arcs\n`;
            network += 'c\n';
            network += 'c arc from a to b with weights: length maxSpeed\n';
            for(let road of roadsList)
                if(road.type)
                    network += road.toString('gr') + '\n';
        }
        
        else if(type === 'co'){
            let nodesList = this.getAllIntersectionNodes();
            let minX = min(nodesList, node => node.x);
            let maxX = max(nodesList, node => node.x);
            let minY = min(nodesList, node => node.y);
            let maxY = max(nodesList, node => node.y);
            let netMaxDistance = (maxX-minX) > (maxY-minY)?  (maxX-minX) : (maxY-minY);
            let n = nodesList.length;
            network += 'c RoadNetGan \n';
            network += 'c\n';
            network += `p aux sp co ${n} \n`;
            network += `c coordinates of ${nodesList.length} nodes \n`;
            network += 'c\n';
            network += 'c id coordinate.x coordinate.y \n';
            
            for (let node of nodesList){
                network += node.toString('co', netMaxDistance) + '\n';
            }
            
        }
        //console.log(network);
        return network;
    }

    //OK
    getElementsById(ids, type){
        let elements = []
        for(let id of ids){
            elements.push(this[type][id]);
        }
        return elements;
    }

    copy(){
        //console.log(this);
        let networkCopy =  new Network();
        networkCopy.topology = this.topology;
        networkCopy.size = {w: this.size.w, h: this.size.h}
        
        for(let roadTypeId in this.roadTypes.types){
            let roadType = this.roadTypes.types[roadTypeId];
            networkCopy.addRoadType(roadType.name, roadType.maxSpeed, roadType.color, 0, roadType.id);
        }
        for (let nodeId in this.nodes){
            let node = this.nodes[nodeId];
            networkCopy.addNode([node.x, node.y], node.isIntersection, node.isNbhBoundary, false, node.id);
        }

        for (let roadId in this.roads){

            let road = this.roads[roadId];
            let nodes = [];
            for(let node of road.nodes){
                nodes.push(networkCopy.nodes[node.id]);
            }
            networkCopy.addRoad(nodes, networkCopy.getRoadTypeById(road.type.id), road.direction, road.isNbhBoundary, false, road.id);
        }
        for(let nbhId in this.nbhs){
            let nbh = this.nbhs[nbhId];
            let bRoads = [];
            for(let bRoad of nbh.bRoads){
                bRoads.push(networkCopy.roads[bRoad.id]);
            }
            let cRoads = [];
            for(let cRoad of nbh.cRoads){
                cRoads.push(networkCopy.roads[cRoad.id]);
            }
            let iRoads = [];
            for(let iRoad of nbh.iRoads){
                iRoads.push(networkCopy.roads[iRoad.id]);
            };
            networkCopy.addNbh(bRoads, cRoads, iRoads, nbh.id)
        }
        networkCopy.nextNodeId = this.nextNodeId;
        networkCopy.nextRoadId = this.nextRoadId;
        networkCopy.nextNbhId = this.nextNbhId;
        networkCopy.defaultLenght = this.defaultLenght;
        return networkCopy;
    }


    // addNoneFirstNbh(scale){

    //     let width = window.outerWidth * scale;
    //     let height = window.outerHeight * scale;

    //     let node1 = this.addNode([0,0], true, true, false, true);
    //     let node2 = this.addNode([width,0], true, true, false, true);
    //     let node3 = this.addNode([width, height], true, true, false, true);
    //     let node4 = this.addNode([0, height], true, true, false, true);

    //     let roadsTop = [this.addRoad([node1, node2], null, null, true)]
    //     let roadsRight = [this.addRoad([node2, node3], null, null, true)]
    //     let roadsBottom = [this.addRoad([node3, node4], null, null, true)]
    //     let roadsLeft = [this.addRoad([node4, node1], null, null, true)]

    //     let bRoads = roadsTop.concat(roadsRight, roadsBottom, roadsLeft);
        
    //     this.addNbh(bRoads);
    // }


    //Grid
    //OK
    addGridFirstNbh(type, direction){

        let node1 = this.addNode([0,0], true, true);
        let node2 = this.addNode([this.defaultLenght,0], true, true);
        let node3 = this.addNode([this.defaultLenght,this.defaultLenght], true, true);
        let node4 = this.addNode([0,this.defaultLenght], true, true);

        let roadsTop = [this.addRoad([node1, node2], type, direction, true)]
        let roadsRight = [this.addRoad([node2, node3], type, direction, true)]
        let roadsBottom = [this.addRoad([node3, node4], type, direction, true)]
        let roadsLeft = [this.addRoad([node4, node1], type, direction, true)]

        let bRoads = roadsTop.concat(roadsRight, roadsBottom, roadsLeft);
        
        this.addNbh(bRoads);
    }

    //OK
    addGridColumn(roadsType, roadsDirection){
        let bNodes = this.getNbhsBNodes();
        let maxX = max(bNodes, node => node.x);
        let roadsTop = null;
        for(let id in this.nbhs){
            let nbhSides = this.nbhs[id].getbRoadsByPolySide();
                for (let road of nbhSides[2]){
                    for(let node of road.nodes){
                        if (node.x === maxX){
                            let leftFirstNode = nbhSides[2][0].nodes[0];
                            let leftLastNode = nbhSides[2][nbhSides[2].length-1].nodes[1];

                            let node1 = leftFirstNode;
                            let node2 = roadsTop? roadsTop[0].nodes[0] : this.addNode([leftFirstNode.x + this.defaultLenght, leftFirstNode.y], true, true);
                            let node3 = this.addNode([leftLastNode.x + this.defaultLenght,leftLastNode.y], true, true);
                            let node4 = leftLastNode;

                            roadsTop = roadsTop ? roadsTop : [this.addRoad([node1, node2], roadsType, roadsDirection, true)]
                            let roadsRight = [this.addRoad([node2, node3], roadsType, roadsDirection, true)]
                            let roadsBottom = [this.addRoad([node3, node4], roadsType, roadsDirection, true)]
                            let roadsLeft = nbhSides[2].reverse();
                            
                            let bRoads = roadsTop.concat(roadsRight, roadsBottom, roadsLeft);
                            this.addNbh(bRoads);
                            roadsTop = roadsBottom;
                            break;
                    }
                }
            }
        }
    }

    //OK
    addGridRow(roadsType, roadsDirection){
        let bNodes = this.getNbhsBNodes();
        let maxY = max(bNodes, node => node.y);
        let roadsLeft = null;
        for(let id in this.nbhs){
            let nbhSides = this.nbhs[id].getbRoadsByPolySide();
            //console.log("Sides", nbhSides)
                for (let road of nbhSides[1]){
                    for(let node of road.nodes){
                    if (node.y === maxY){
                        let topFirstNode = nbhSides[1][nbhSides[1].length-1].nodes[1];
                        let topLastNode =  nbhSides[1][0].nodes[0];

                        let node1 = topFirstNode;
                        let node2 = topLastNode;
                        let node3 = this.addNode([topLastNode.x ,topLastNode.y + this.defaultLenght], true, true);
                        let node4 = roadsLeft ? roadsLeft[0].nodes[1] : this.addNode([topFirstNode.x, topLastNode.y + this.defaultLenght], true, true);
                                  
                        let roadsTop = nbhSides[1];
                        roadsLeft = roadsLeft ? roadsLeft : [this.addRoad([node4, node1], roadsType, roadsDirection, true)]
                        let roadsRight = [this.addRoad([node2, node3], roadsType, roadsDirection, true)]
                        let roadsBottom = [this.addRoad([node3, node4], roadsType, roadsDirection, true)]
                        
                        let bRoads = roadsRight.concat(roadsBottom, roadsLeft,roadsTop);
                        this.addNbh(bRoads);
                        roadsLeft = roadsRight;
                        break;
                    }
                }
            }
        }
    }

    //OK
    deleteLastGridRow(){
        let bNodes = this.getNbhsBNodes();
        let maxY = max(bNodes, node => node.y);
        for (let id in this.nbhs){
            let bNodes = this.nbhs[id].getBNodes();
            for(let bNode of bNodes){
                if(bNode.y === maxY){
                    this.deleteNbh(this.nbhs[id]);
                    break;
                }
            }
        }
    }

    //OK
    deleteLastGridCol(){
        let bNodes = this.getNbhsBNodes();
        let maxX = max(bNodes, node => node.x);
        for (let id in this.nbhs){
            let bNodes = this.nbhs[id].getBNodes();
            for(let bNode of bNodes){
                if(bNode.x === maxX){
                    this.deleteNbh(this.nbhs[id]);
                    break;
                }
            }
        }

    }

   //Ring

   //OK
   addRing(roadsType, roadsDirection){
    let bNodes = this.getNbhsBNodes();
    let bRoads = this.getNbhsBRoads();
    let maxX = max(bNodes, node => node.x);
    let maxY = max(bNodes, node => node.y);
    let minY = min(bNodes, node => node.y);
    

    let top = [];
    let rigth = [];
    let bottom = [];
    for(let bNode of bNodes){
        if(bNode.y === minY){
            top.push(bNode);
        }
        if(bNode.x === maxX){
            rigth.push(bNode);
        }
        if(bNode.y === maxY){
            bottom.push(bNode);
        }
    }

    let nodeR2 =  this.addNode([top[0].x + this.defaultLenght, top[0].y - this.defaultLenght], true, true);

    let nodeR3 = this.addNode([rigth[0].x + this.defaultLenght, rigth[0].y + this.defaultLenght], true, true);

    let roadR1 = this.addRoad([nodeR2, top[0]], roadsType, roadsDirection, true);
    let roadR2 = this.addRoad([nodeR3, nodeR2], roadsType, roadsDirection, true);
    let roadR3 = this.addRoad([nodeR3, rigth[0]], roadsType, roadsDirection, true);
    let roadR4;
    for(let bRoad of bRoads){   
        if(bRoad.nodes.includes(rigth[0]) && bRoad.nodes.includes(rigth[1]))
        roadR4 = bRoad; 
    }
    this.addNbh([roadR1, roadR2, roadR3, roadR4]);


    let nodeT1 = this.addNode([top[1].x - this.defaultLenght, top[1].y - this.defaultLenght], true, true);
    let nodeT2 = nodeR2

    let roadT1 = this.addRoad([nodeT1, nodeT2], roadsType, roadsDirection, true);
    let roadT2 = roadR1;
    let roadT3;
    for(let bRoad of bRoads){
        if(bRoad.nodes.includes(top[0]) && bRoad.nodes.includes(top[1]))
            roadT3 = bRoad;
    }
    let roadT4 =  this.addRoad([nodeT1, top[1]], roadsType, roadsDirection, true);
    this.addNbh([roadT1, roadT2, roadT3, roadT4]);

    let nodeB3 =  nodeR3;
    let nodeB4 = this.addNode([bottom[1].x - this.defaultLenght, bottom[1].y + this.defaultLenght], true, true);
    let roadB1;
    for(let bRoad of bRoads){   
        if(bRoad.nodes.includes(bottom[0]) && bRoad.nodes.includes(bottom[1]))
        roadB1 = bRoad; 
    }
    let roadB2 = roadR3;
    let roadB3 = this.addRoad([nodeB3, nodeB4], roadsType, roadsDirection, true);
    let roadB4 = this.addRoad([nodeB4, bottom[1]], roadsType, roadsDirection, true);
    this.addNbh([roadB1, roadB2, roadB3, roadB4]);


    let roadL1 = roadT4;
    let roadL2;
    for(let bRoad of bRoads){   
        if(bRoad.nodes.includes(top[1]) && bRoad.nodes.includes(bottom[1]))
        roadL2 = bRoad; 
    }
    let roadL3 = roadB4
    let roadL4 = this.addRoad([nodeT1, nodeB4], roadsType, roadsDirection, true);
    this.addNbh([roadL1, roadL2, roadL3, roadL4]);
    
  

    










    for(let id in this.nodes){
        let node = this.nodes[id];
        node.x =  node.x + this.defaultLenght;
        node.y =  node.y + this.defaultLenght;
    }
}

    //Ok
    deleteRing(){
        let bNodes = this.getNbhsBNodes();
        let maxX = max(bNodes, node => node.x);
        let maxY = max(bNodes, node => node.y);
        let minX = min(bNodes, node => node.x);
        let minY = min(bNodes, node => node.y);
        let toDeleteNbh = [];
        for(let nbhId in this.nbhs){
            let nbh = this.nbhs[nbhId];
            let bNodes = nbh.getBNodes();
            for(let bNode of bNodes){
                if(bNode.x === maxX || bNode.x === minX || bNode.y === maxY || bNode.y === minY){
                    toDeleteNbh.push(nbh);
                    break;
                }
            }
        }
        for(let i = 0; i < toDeleteNbh.length; i++){
            this.deleteNbh(toDeleteNbh[i]);
        }

        for(let id in this.nodes){
            let node = this.nodes[id];
            node.x =  node.x - this.defaultLenght;
            node.y =  node.y - this.defaultLenght;
        }
    

    }


    divideRoadByAddingNode(nbh, roadId, nodeId, positionIndex){
        let oldRoad = this.roads[roadId];
        let oldRoadNodes, newRoadNodes;
        let cNodes = nbh.getCNodes();
        let bNodes = nbh.getBNodes();
        let node = this.nodes[nodeId];
        if(nbh.cRoads.includes(oldRoad) && !cNodes.includes(oldRoad.nodes[0]) && !bNodes.includes(oldRoad.nodes[0])){
            oldRoadNodes = oldRoad.nodes.slice(positionIndex+1);
            oldRoadNodes.unshift(node);
            newRoadNodes = oldRoad.nodes.slice(0, positionIndex+1)
            newRoadNodes.push(node);
        } else {
            oldRoadNodes = oldRoad.nodes.slice(0, positionIndex+1);
            oldRoadNodes.push(node);
            newRoadNodes = oldRoad.nodes.slice(positionIndex+1);
            newRoadNodes.unshift(node);

        }
        oldRoad.nodes = oldRoadNodes;
        let newRoad = this.addRoad(newRoadNodes, oldRoad.type, oldRoad.direction);

        for(let nbhId in this.nbhs){
            let nbh_ = this.nbhs[nbhId];
            if(nbh_.bRoads.includes(oldRoad))
               nbh_.addRoadToBRoads(newRoad);
        }

        if(!nbh.bRoads.includes(newRoad)){
            nbh.iRoads.push(newRoad);
        }else{
            newRoad.isNbhBoundary = true;
        }
        oldRoad.calculateLength();
        newRoad.calculateLength();

        return newRoad;
    }


    deselect(selection){
        if(selection[0]?.hasOwnProperty('bRoads')){
            for(let nbh of selection)
                for (let road of nbh.bRoads)
                    road.isSelected = false;
                        
            }
        else
            for(let element of selection){
                element.isSelected = false;
            }
    }

    divideNbhByRoad(road, nbh){
        //console.log("ROAD", road);
        let oNodes = nbh.getONodes();
        let pointA = road.nodes[0]
        let pointB =road.nodes[road.nodes.length-1];

        let nbh1 = []
        let nbh2 = []


        for(let bNode of oNodes){
            let position = Math.sign((pointB.x - pointA.x) * (bNode.y - pointA.y) - (pointB.y - pointA.y) * (bNode.x - pointA.x));
            if(position >= 0)
                nbh1.push(bNode);
            if(position <= 0)
                nbh2.push(bNode);
        }

        //console.log("nbhs",nbh1, nbh2)

        let roads = [...nbh.bRoads];

        let nbh1bRoads = [...roads];

        for(let i = 0; i < nbh1bRoads.length; i++){
            let start = nbh1bRoads[i].nodes[0];
            let end = nbh1bRoads[i].nodes[nbh1bRoads[i].nodes.length-1];
            let includesStart = false;
            let includesEnd = false;
            for(let point of nbh1){
                if (point.x === start.x && point.y === start.y)
                    includesStart = true;
                else if(point.x === end.x && point.y === end.y)
                    includesEnd = true;
            }

           
            if(!includesStart || !includesEnd){
                nbh1bRoads.splice(i,1)
                i--;
            }
     
        }
    
        nbh.bRoads = nbh1bRoads;
        nbh.addRoadToBRoads(road);


        //2
        let nbh2bRoads = [...roads];
        for(let i = 0; i < nbh2bRoads.length; i++){
            let start = nbh2bRoads[i].nodes[0];
            let end = nbh2bRoads[i].nodes[nbh2bRoads[i].nodes.length-1];
            let includesStart = false;
            let includesEnd = false;
            for(let point of nbh2){
                if (point.x === start.x && point.y === start.y)
                    includesStart = true;
                else if(point.x === end.x && point.y === end.y)
                    includesEnd = true;
            }

           
            if(!includesStart || !includesEnd){
                nbh2bRoads.splice(i,1)
                i--;
            }
     
        }

        let newNbh = this.addNbh(nbh2bRoads);
        newNbh.addRoadToBRoads(road);
    

    }

    DFS(adjazentList, visited, nodeId){
        visited[nodeId] = true;
        for(let adjazentNode of adjazentList[nodeId]){
            if(!visited[adjazentNode]){
                this.DFS(adjazentList, visited, adjazentNode);
            }
        }
    }


    isWeaklyConnected(adjazentList){
        let visited = {}
        for(let node in adjazentList){
            visited[node] = false;
        }
        let id;
        for(let adjazentNode in adjazentList){
            id = adjazentNode;
            break;
        }
        this.DFS(adjazentList, visited, id);
        for(let visitedNode in visited){
            if(!visited[visitedNode]){
                return false;
            }
        }

        return true;
    }

}

