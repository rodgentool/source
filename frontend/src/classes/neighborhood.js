import {polygonCentroid, polygonContains} from "d3-polygon";
import {min, max} from "d3";
import { roundTo2 } from "../utilityFunctions/mathFunctions";

export class Nbh{

    /** OK
     * Creates a new neighborhood
     * @param {Number} id of the neighborhood
     * @param {Array<Road>} backboneRoads boundary roads that delimit the area of the neighborhood and forming a polygon in counterclockwise
     * @param {Array<Road>} connectionRoads roads that connect to the backbone
     * @param {Array<Road>} innerRoads internal roads only
     */
    constructor(id, backboneRoads, connectionRoads, innerRoads) {
        this.id = id;
        //this.bRoads = backboneRoads;
        this.bRoads = [];
        for(let road of backboneRoads){
            this.addRoadToBRoads(road)
        }
        this.cRoads = connectionRoads;
        this.iRoads = innerRoads;
    }

    //OK
    isEmpty(){
        if(this.cRoads.length === 0 && this.iRoads.length === 0)
            return true;
        return false;
    }

    //OK
    sortNodesCounterclockwise(center, nodes){
        nodes.sort(function(a, b) {

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
    } 


    getBNodes(){
        let bNodes = [];
        let coordinates = [];
  
        for (let road of this.bRoads)
            for (let node of road.nodes)
                if(!bNodes.includes(node)){
                    bNodes.push(node);
                    coordinates.push([node.x, node.y])
                }
        
        if (!this.isClosed()){
            console.log("Is no Closed")
            let bNodes_ = [];
            for(let node of bNodes){
                if(node.isNbhBoundary)
                    bNodes_.push(node);
        }
        return bNodes_;

        }

        let center = {
            x: coordinates.reduce((partialSum, a) => partialSum + a[0], 0)/coordinates.length,
            y: coordinates.reduce((partialSum, a) => partialSum + a[1], 0)/coordinates.length
        }

        this.sortNodesCounterclockwise(center, bNodes);
    
        let adjList = {};
        for (let road of this.bRoads){
            let nodes = road.nodes
            adjList[nodes[0].id] = []
            adjList[nodes[nodes.length-1].id] = []
        }

        for (let road of this.bRoads){
            let nodes = road.nodes
                adjList[nodes[0].id].push(nodes[nodes.length-1])
                adjList[nodes[nodes.length-1].id].push(nodes[0])
        }

        let startNode = bNodes[0];
        let current = bNodes[1];
        let sortedBNodes =[startNode, current];
        let i = 0;
        while(current !== startNode && i < bNodes.length*2){
            for(let node of adjList[current.id]){
                i++;
                if (!sortedBNodes.includes(node)){
                    sortedBNodes.push(node);
                    current = node;
                }
                if(node === startNode)
                    current = node;
            }
        }

        bNodes = [];
        for(let node of sortedBNodes){
            if(node.isNbhBoundary)
                bNodes.push(node);
                
        }
        return bNodes;
    }


    getCNodes(){
        let possibleNodes = [];
        let cNodes = [];
        for (let road of this.bRoads){
            for (let i = 0; i < road.nodes.length; i++){
                if (!(road.nodes.isNbhBoundary))
                    possibleNodes.push(road.nodes[i]);
            }
        }
        for (let road of this.cRoads){
                let last = road.nodes.length-1
                if (possibleNodes.includes(road.nodes[0]))
                    cNodes.push(road.nodes[0]);
                else if (possibleNodes.includes(road.nodes[last]))
                    cNodes.push(road.nodes[last]);
            }
        cNodes = [...new Set(cNodes)];
        return cNodes;
    }

    getONodes(){
        let oNodes = [];
        for (let road of this.bRoads){
            for (let node of road.nodes){
                    oNodes.push(node);
            }
        }
        oNodes = [...new Set(oNodes)];
        return oNodes;
    }

    getINodes(getOnlyIntersections=true){
        let iNodes = [];
        let oNodes = this.getONodes();

        for (let road of this.cRoads)
            for (let node of road.nodes)
                if(!oNodes.includes(node) && (!getOnlyIntersections || node.isIntersection))
                    iNodes.push(node);

        for (let road of this.iRoads)
            for(let node of road.nodes)
                if(!getOnlyIntersections || node.isIntersection)
                    iNodes.push(node);         
        
        iNodes = [...new Set(iNodes)];
        return iNodes;
    }


    getAllNodes(getOnlyIntersections=true){
        let oNodes = this.getONodes();
        let iNodes = this.getINodes(getOnlyIntersections);
        let allNodes = new Set ([...oNodes, ...iNodes]);
        return allNodes;
    }


    getAllRoads(){
        let roads = this.bRoads.concat(this.cRoads, this.iRoads);
        return roads;
    }

    getBRoads(){
        let roads = this.bRoads;
        return roads;
    }

    getCRoads(){
        let roads = this.cRoads;
        return roads;
    }

    // getIRoads(){
    //     return this.cRoads.concat(this.iRoads);
    // };

    getIRoads(){
        return this.iRoads;
    }


    addRoadToBRoads(road){
        this.bRoads.push(road);

        if(this.bRoads.length === 1)
            return;

        let bNodes = [];
        let coordinates = [];


        for (let road of this.bRoads){
            for (let node of road.nodes){
                if(!bNodes.includes(node)){
                    bNodes.push(node);
                    coordinates.push([node.x, node.y])
                }   
            }
        }

        //let center = polygonCentroid(coordinates);
        let center = {
            x: coordinates.reduce((partialSum, a) => partialSum + a[0], 0)/coordinates.length,
            y: coordinates.reduce((partialSum, a) => partialSum + a[1], 0)/coordinates.length
        }

        this.sortNodesCounterclockwise(center, bNodes);
        
        let sortedBRoads = [];
        for(let i = 0; i < bNodes.length; i++){
            for(let j = 0; j < bNodes.length; j++){
                let found;
                for (let road of this.bRoads){
                    if (i !== j && !sortedBRoads.includes(road) && road.nodes.includes(bNodes[i]) && road.nodes.includes(bNodes[j])){
                        sortedBRoads.push(road);
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
        }

       

    
        this.bRoads = sortedBRoads;
     }



    //OK
    getPointOnbRoad(segment, x=null, y=null){
        let startPoint = segment[0];
        let endPoint =   segment[1];
        if(endPoint[0] !== startPoint[0]){
            let slope = (endPoint[1] - startPoint[1])/(endPoint[0] - startPoint[0]);
            if(!x)
                return [(y - startPoint[1])/slope + startPoint[0], y]
            if(!y)
                return [x, slope * (x - startPoint[0]) + startPoint[1]]
        }else{
            if(!x)
                return [endPoint[0], y];
        }
    }

    getDragBoundaries(innerPolygon){
        if(!this.isEmpty()){
            let boundaries = {top: null, right: null, bottom: null, left: null};
            //top, right, bottom, left
            let boundariesI = [null, null, null, null]

            let minX = min(innerPolygon, point => point[0]);
            let maxX = max(innerPolygon, point => point[0]);
            let minY = min(innerPolygon, point => point[1]);
            let maxY = max(innerPolygon, point => point[1]);

            for(let i = 0; i < innerPolygon.length; i++){
                let point = innerPolygon[i];
                if(point[0] === minX)
                    boundariesI[3] = boundariesI[3] === null? i :boundariesI[3];
                if(point[0] === maxX)
                    boundariesI[1] = boundariesI[1] === null? i :boundariesI[1];
                if(point[1] === minY)
                    boundariesI[0] = boundariesI[0] === null? i :boundariesI[0];
                if(point[1] === maxY)
                    boundariesI[2] = boundariesI[2] === null? i :boundariesI[2];
            }

            let sides = this.getbRoadsByPolySide();

            //console.log(boundariesI);


            for(let i = 0; i < boundariesI.length; i++){
                let pointA = sides[boundariesI[i]][0].nodes.find(node => node.isNbhBoundary);
                let pointB = sides[boundariesI[i]][sides[boundariesI[i]].length-1].nodes.find(node => node.isNbhBoundary);


                if(i === 0 || i === 2){
                    let point = this.getPointOnbRoad([[pointA.x, pointA.y], [pointB.x, pointB.y]], innerPolygon[boundariesI[i]][0], null);

                    if(i === 1)
                        boundaries.right = roundTo2(point[0] - maxX);
                    if(i === 3)
                        boundaries.left = roundTo2(minX - point[0]);
                }
                if(i === 1 || i === 3){
                    let point = this.getPointOnbRoad([[pointA.x, pointA.y], [pointB.x, pointB.y]], null, innerPolygon[boundariesI[i]][1])
                    if(i === 0)
                        boundaries.top = roundTo2(minY - point[1]);
                    if(i === 2)
                        boundaries.bottom = roundTo2(point[1] - maxY);
                }
            }
            return boundaries;
        }
        return null;


    }  

    isClosed(){
        let sidesOfNbh =  this.getbRoadsByPolySide();
        if(sidesOfNbh.length > 2){
            let sideNodes = this.getSideNodes(sidesOfNbh[0]);
                for(let bRoad of sidesOfNbh[sidesOfNbh.length-1]){
                    for(let node of bRoad.nodes){
                        if(sideNodes.includes(node))
                            return true;
                    }
                       
                    }
                }


        return false;
    }

    // OK
    containsPoint(point, lineWidth=1){
        let polygon = [];
        let bNodes = this.getBNodes();
        
        for(let node of bNodes){
            polygon.push([node.x, node.y])
        }

        if(lineWidth !== 1){
            let polyCentroid = polygonCentroid(polygon);
            for(let polyPoint of polygon){
                let vector = [polyPoint[0]-polyCentroid[0], polyPoint[1]-polyCentroid[1]] 
                let dist = Math.hypot(vector[0], vector[1])
                let normVector =  [vector[0]/dist, vector[1]/dist];
                polyPoint[0] = polyPoint[0] +  (normVector[0] * lineWidth)
                polyPoint[1] = polyPoint[1] +  (normVector[1] * lineWidth)
            }
        }
        if(this.isClosed()){
            if (polygonContains(polygon, point)){
                return true;
            }
        }else{
            for(let road of this.bRoads){
                if(road.containsPoint(point, lineWidth))
                    return true;

            }
        }


        return false;
    }

    //OK
    deleteRoad(type, road){
        if(type === 'bRoad'){
            let i = this.bRoads.indexOf(road);
            if(i > -1) 
                this.bRoads.splice(i,1);
        }else if(type === 'cRoad'){
            let i = this.cRoads.indexOf(road);
            if(i > -1) 
                this.cRoads.splice(i,1);
        }else if(type === 'iRoad'){
            let i = this.iRoads.indexOf(road);
            if(i > -1) 
                this.iRoads.splice(i,1);
        }
    }

    getbRoadsByPolySide(){
        let sides = [];
        let oNodes = [];
        let coordinates = [];
        for (let road of this.bRoads)
            for (let node of road.nodes)
                if(!oNodes.includes(node)){
                    oNodes.push(node);
                    coordinates.push([node.x, node.y])
                }

        if(oNodes.length <= 0){
            return [];
        }

        let center = {
            x: coordinates.reduce((partialSum, a) => partialSum + a[0], 0)/coordinates.length,
            y: coordinates.reduce((partialSum, a) => partialSum + a[1], 0)/coordinates.length
        }

        this.sortNodesCounterclockwise(center, oNodes);
    
        let adjList = {};
        for (let road of this.bRoads){
            let nodes = road.nodes
            adjList[nodes[0].id] = []
            adjList[nodes[nodes.length-1].id] = []
        }

        for (let road of this.bRoads){
            let nodes = road.nodes
                adjList[nodes[0].id].push(nodes[nodes.length-1])
                adjList[nodes[nodes.length-1].id].push(nodes[0])
        }

        let startNode = oNodes[0];
        let current = oNodes[1];
        let sortedNodes =[startNode, current];
        let i = 0;
        while(current !== startNode && i < oNodes.length*2){
            for(let node of adjList[current.id]){
                i++;
                if (!sortedNodes.includes(node)){
                    sortedNodes.push(node);
                    current = node;
                }
                if(node === startNode)
                    current = node;
            }
        }

        for(let i=0; i < sortedNodes.length-1; i++){
            if (i === 0 && !sortedNodes[i].isNbhBoundary){
                sortedNodes.push(sortedNodes.splice(0, 1)[0]);
                i--;
            }
        }

        sortedNodes.push(sortedNodes[0]);

        for(let i=0; i < sortedNodes.length-1; i++){
            let node = sortedNodes[i];
            let nextNode = sortedNodes[i+1];
            if(node.isNbhBoundary)
                sides.push([]);
            for(let road of this.bRoads){
                if(road.nodes.includes(node) && road.nodes.includes(nextNode))
                    sides[sides.length-1].push(road);
            } 
        }
        return sides;
        
    }

    

    getSidePoints(roadsBySide, index){
        let side = roadsBySide[index];
        let nodeA = side[0].nodes.find(node => node.isNbhBoundary);
        let nodeB = side[side.length-1].nodes.find(node => node.isNbhBoundary && node !== nodeA);
        return [[nodeA.x, nodeA.y], [nodeB.x, nodeB.y]];
    }

    getSideNodes(side){
        let nodes = []
        for(let road of side){
            nodes = nodes.concat(road.nodes);
        }
        return nodes;
    }

    getRoadsIds(roads){
        let roadsIds = [];
        for(let road of roads){
            roadsIds.push(road.id)
        }
        return roadsIds;
    }

    getMinMaxCoord(nodes){
        let minX = min(nodes, node => node.x)
        let minY = min(nodes, node => node.y)
        let maxX = max(nodes, node => node.x)
        let maxY = max(nodes, node => node.y)
        return{minX: minX, maxX: maxX, minY: minY, maxY: maxY}
    }

    drawBackbone(ctx, scaleX, scaleY, oNodeRadius, iNodeRadius, oRoadLineWidth){
        let oNodes = this.getONodes();
        for (let road of this.bRoads)
            road.draw(ctx, scaleX, scaleY, oRoadLineWidth, oNodeRadius);
        for (let node of oNodes){
            let radius = node.isNbhBoundary ? oNodeRadius : iNodeRadius;
            node.draw(ctx, scaleX, scaleY, radius);
        }
    }

    getLinesIntersections(line1, line2){
        let x1 = line1[0][0]
        let y1 = line1[0][1]
        let x2 = line1[1][0]
        let y2 = line1[1][1]
        let x3 = line2[0][0]
        let y3 = line2[0][1]
        let x4 = line2[1][0]
        let y4 = line2[1][1]
        let d = (x1-x2)*(y3-y4)-(y1-y2)*(x3-x4);
        let px = ((x1*y2-y1*x2)*(x3-x4)-(x1-x2)*(x3*y4-y3*x4))/d;
        let py = ((x1*y2-y1*x2)*(y3-y4)-(y1-y2)*(x3*y4-y3*x4))/d;
        return [px, py]
    }

    getInnerBoundaryBox(){
        if(!this.isEmpty()){
            let bNodes = this.getBNodes();
            let iNodes = this.getINodes(false);
            let newPolygon = [];
            for(let node of bNodes){
                newPolygon.push([node.x, node.y])
            }
            newPolygon.push(newPolygon[0]);
            
            //Find the node with less distance to the side
            for(let i = 0; i < newPolygon.length-1; i++){
                let distance;
                let node;
                for(let j = 0; j < iNodes.length; j++){
                    let tempDistance = iNodes[j].distanceToLine([[newPolygon[i][0], newPolygon[i][1]], [newPolygon[i+1][0], newPolygon[i+1][1]]]);
                    if(j === 0){
                        distance = tempDistance;
                        node = iNodes[j];
                    }else if (tempDistance < distance){
                        distance = tempDistance;
                        node = iNodes[j];
                    }
                }
   
                let pointOnLine = node.calculatePerpendicularPoint([[newPolygon[i][0], newPolygon[i][1]], [newPolygon[i+1][0], newPolygon[i+1][1]]]);
                let diffX = node.x - pointOnLine[0];
                let diffY = node.y - pointOnLine[1];
            
                let line = [[node.x, node.y], [newPolygon[i][0] + diffX, newPolygon[i][1] + diffY]]
           
                let lineBefore = i === 0?  [[newPolygon[newPolygon.length-2][0], newPolygon[newPolygon.length-2][1]], [newPolygon[0][0], newPolygon[0][1]]] : [[newPolygon[i-1][0], newPolygon[i-1][1]], [newPolygon[i][0], newPolygon[i][1]]];
          
                let lineAfter = i === newPolygon.length-2? [[newPolygon[0][0], newPolygon[0][1]], [newPolygon[1][0], newPolygon[1][1]]] :[[newPolygon[i+1][0], newPolygon[i+1][1]], [newPolygon[i+2][0], newPolygon[i+2][1]]];
                
                newPolygon[i] =  this.getLinesIntersections(line, lineBefore);
                if(i === 0){
                    newPolygon[newPolygon.length-1] = newPolygon[0];
                }
                if(i === newPolygon.length-2){
                    newPolygon[0] =  this.getLinesIntersections(line, lineAfter);
                    newPolygon[newPolygon.length-1] = newPolygon[0];
                }
                else
                    newPolygon[i+1] =  this.getLinesIntersections(line, lineAfter);

            }
            newPolygon.pop();
        //console.log("getInnerBoundaryBox", newPolygon);
        return newPolygon;
    } else 
    return null;
    }

    drawInnerNet(bbox, ctx, scaleX, scaleY, iNodeRadius, iRoadLineWidth){
        
        let innerRoads = this.cRoads.concat(this.iRoads);
        for (let iRoad of innerRoads){
            iRoad.draw(ctx, scaleX, scaleY, iNodeRadius, iRoadLineWidth);
        }

        let iNodes = this.getINodes();
        for (let iNode of iNodes){
            if(iNode.isIntersection)
                iNode.draw(ctx, scaleX, scaleY, iNodeRadius);
        } 

        let bBoxLength = bbox.coordinates.length;

        for(let i = 0; i <  bBoxLength; i++){
            let source, target;
            if (i === (bBoxLength - 1)){
                source = bbox.coordinates[i]
                target = bbox.coordinates[0]
            }
            else{
                source = bbox.coordinates[i]
                target = bbox.coordinates[i+1]
            }
            let color =  "black";
            let line = 1;
            ctx.setLineDash([4, 2]);
            ctx.beginPath();
            ctx.moveTo(scaleX(source[0]), scaleY(source[1]));
            ctx.lineTo(scaleX(target[0]), scaleY(target[1]));
            ctx.strokeStyle = color;
            ctx.lineWidth = line;
            ctx.lineCap = "round";
            ctx.stroke();
            if(bbox.active){
                ctx.beginPath();
                ctx.lineWidth = line*2;
                ctx.strokeStyle = "rgba(0,173,181, 0.6)";
                ctx.moveTo(scaleX(source[0]), scaleY(source[1]));
                ctx.lineTo(scaleX(target[0]), scaleY(target[1]));
                ctx.stroke();
            }
    
        }
    }
       
    //OK
    toString(type='json-project'){
        let nbh;
        let bRoads = JSON.stringify(this.getRoadsIds(this.bRoads));
        let cRoads = JSON.stringify(this.getRoadsIds(this.cRoads));
        let iRoads = JSON.stringify(this.getRoadsIds(this.iRoads));
        if(type === 'json-project')
            nbh = `\t{\n\t\t"id": ${this.id}, \n\t\t"bRoads": ${bRoads}, \n\t\t"cRoads": ${cRoads}, \n\t\t"iRoads": ${iRoads}\n\t}`        
        return nbh;
    }
}



