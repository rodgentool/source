import {min, max} from "d3";
import { scaleLinear } from "d3-scale";
import {polygonContains} from "d3-polygon";
import { roundTo2, distanceBetween2Points} from "../utilityFunctions/mathFunctions";


import axios from "axios";

export const getPolygonInLatLon = (nbh, mapCenter, width=500, height=500) => {
    let bNodes = nbh.getBNodes();

    let minX = min(bNodes, node => node.x);
    let maxX = max(bNodes, node => node.x);
    let minY = min(bNodes, node => node.y);
    let maxY = max(bNodes, node => node.y);

    let radiusEarth = 6371000;
    let minLat  = mapCenter[0] - ((height/2) / radiusEarth) * (180 / Math.PI);
    let maxLat = mapCenter[0] + ((height/2) / radiusEarth) * (180 / Math.PI);
    let minLon = mapCenter[1] - ((width/2) / radiusEarth) * (180 / Math.PI) / Math.cos(mapCenter[0] * Math.PI/180);
    let maxLon = mapCenter[1] + ((width/2) / radiusEarth) * (180 / Math.PI) / Math.cos(mapCenter[0] * Math.PI/180);
   
   
    let rescaleX = scaleLinear().domain([minX,maxX]).range([minLon, maxLon])

    let rescaleY = scaleLinear().domain([minY,maxY]).range([maxLat, minLat])

    let polygon = []
    for (let bNode of bNodes){
        //console.log(bNode.x, bNode.y, rescaleX(bNode.x), rescaleY(bNode.y));
        polygon.push([rescaleY(bNode.y), rescaleX(bNode.x)]);
    }
    
    return polygon;
}

//OK
export const polyLonLatToString = (polygon) => {
    let stringPolygon = ''
    for(let point of polygon){
        stringPolygon += `${point[0]} ${normalizeLon(point[1])} `;
    }
    stringPolygon = stringPolygon.slice(0, -1);
    return stringPolygon;
}

export const getSizeSelectedArea = (polygon) => {
    let minLon = min(polygon, point => point[1])
    let maxLon = max(polygon, point => point[1])
    let minLat = min(polygon, point => point[0])
    let maxLat = max(polygon, point => point[0])
    
    let width = parseInt(distanceInM(minLat, normalizeLon(minLon), minLat, normalizeLon(maxLon)));
    let heigth = parseInt(distanceInM(minLat, normalizeLon(minLon), maxLat, normalizeLon(minLon)));

    return {w: width, h: heigth}
}

/**
 * Filter the relevant information collected from OSM to build the new internal network.
 * @param {Object} roadTypes list of roads currently supported by the system.
 * @param {Object} data  OSM raw data.
 * @returns The nodes and roads that are part of the largest connected component and that are the basis of the new internal network.
 */
export const filterOsmData = (data, polygon, roadTypes) => {

    let mapRoadIdName = {}
    for (let roadTypeId in roadTypes){
        let osmName = roadTypes[roadTypeId].name;
        osmName = osmName.toLowerCase();
        osmName = osmName.split(' ').join('_');
        mapRoadIdName[osmName] = parseInt(roadTypeId);
    }

    let nodes = {};
    let roads = [];
    let deletedNodesId = [];

    for (let element of data.elements){
        if (element.type === 'node'){
            if(polygonContains(polygon, [element.lat,element.lon])){
                nodes[element.id] = {id:element.id, x:element.lon,  y:element.lat, isIntersection: -1};
            }
            else
                deletedNodesId.push(element.id); 
        }
 
        if (element.type === 'way'){
            let roadType = mapRoadIdName[element.tags.highway];
            let roadDirection = getDirectionfromOSMWays(element.tags);
            roads.push({id: 0, nodes: element.nodes, type: roadType, direction: roadDirection})

            for (let i = 0; i < element.nodes.length; i++){
                if(deletedNodesId.includes(element.nodes[i])){
                    element.nodes.splice(i,1);
                    i--;
                }
            }

            for (let i = 0; i < element.nodes.length; i++){
                if (i === 0 || i === element.nodes.length-1)
                    nodes[element.nodes[i]].isIntersection = 1;
                else if(nodes[element.nodes[i]].isIntersection === -1)
                    nodes[element.nodes[i]].isIntersection = 0;
                else if (nodes[element.nodes[i]].isIntersection === 0)
                    nodes[element.nodes[i]].isIntersection = 1;
            }
        }
    }

    for (let j = 0; j < roads.length; j++){
        let road = roads[j];
        road.id = j;
        for (let i = 1; i < road.nodes.length-1; i++){
            let nodeId = road.nodes[i]
            if (nodes[nodeId].isIntersection === 1){
                roads.push({id: 0, nodes: road.nodes.slice(i), type: road.type, direction: road.direction});
                road.nodes = road.nodes.slice(0, i+1);
               
                break;
            }
        }
   
        //excluding one node roads
        if(road.nodes.length === 1){
            roads.splice(j, 1); 
            j--; 
        }
    }
    
    let nodesIntersection = [];
    for(let nodeId in nodes){
        let node = nodes[nodeId];
        if(node.isIntersection === 1)
            nodesIntersection.push(node.id)
    }

    let json = `{"nodes": ${JSON.stringify(nodesIntersection)}, `;

    json += '"roads": {'
    for(let i = 0; i < roads.length; i++){
        let road = roads[i];
        json += `"${road.id}": ["${road.nodes[0]}", "${road.nodes[road.nodes.length-1]}", "${0}", "${road.direction}", "${0}"]`  
        if(i !== roads.length-1){
            json += ', '
        } else{
            json += '}}'
        }
    }
        return [nodes, roads, json];
}

export const getComponents = (json) => {
    let components = axios({
        method: 'POST',
        url: 'connectivity/',
        data: json
    }).then((res) => res.data[3]);
    return components;
}

export const getMaxComponent = (nodes, roads, components) => {
        let max_ = max(components, array => array.length);
        let maxComponent;
        for(let component of components){
            if (component.length === max_){
                maxComponent = component;
                break;
            }
        }
        let roadsToImport = [];
        let nodesToImport = [];
        for(let road of roads){
            if(maxComponent.includes(road.id.toString())){
                roadsToImport.push(road);
                for(let roadNode of road.nodes){
                    nodesToImport.push(nodes[roadNode]);
                }
            }
        }
        nodesToImport = [...new Set(nodesToImport)];
        return {nodes: nodesToImport, ways: roadsToImport};
}

/**
 * Auxiliary function to define the direction of a road, according to the information provided by OSM
 * @param {Object} tags road Tags according to OSM
 * @returns the direction of the road
 */
export const getDirectionfromOSMWays = (tags) => {
    //information from https://wiki.openstreetmap.org/wiki/Key:highway
    let direction;
    if (tags.oneway !== undefined){
        if (tags.oneway === 'yes'){ direction = "oneway" }
        else if (tags.oneway === 'no'){ direction = "both" }
        else if (tags.soneway === '-1'){ direction = "reverse" }
    } else if (tags.junction !== undefined) {
        if (tags.junction === 'roundabout'){direction = "oneway"}
    } else if(tags.highway === "motorway"){
        direction = "oneway";
    } else {
        direction = "both";
    }
    return direction;
}

/**
 * Auxiliary function to normalize the longitude coordinates obtained after selection on the map.
 * @param {Number} lon longitude
 * @returns the actual longitude
 */
export const normalizeLon = (lon) => {
    while(lon < -180){
        lon +=360;
    }
    while (lon > 180){
        lon -= 360;
    } 
    return lon;
}


/**
 * Calculates the distance between 2 geographic coordinates and translates it into meters
 * @param {Number} lat1 latitude of the first geographic point
 * @param {Number} lon1 longitude of the first geographic point
 * @param {Number} lat2 latitude of the second geographic poi
 * @param {Number} lon2 longitude of the second geographic point
 * @returns Distance in meters.
 */
export const distanceInM = (lat1, lon1, lat2, lon2) => {
    let radiusEarth = 6371000; // Radius of the earth in m
    let rad = Math.PI/180; // radians pro grad
    var dLat = (lat2-lat1) * rad; 
    var dLon = (lon2-lon1) * rad; 
    var a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = radiusEarth * c; 
    return d;
}


export const distanceToLine = (linePoints, point)  => {
    let linePoint1 = linePoints[0];
    let linePoint2 = linePoints[1];
    let a = linePoint2[0] - linePoint1[0];
    let b = linePoint1[1] - point[1];
    let c = linePoint1[0] - point[0];
    let d = linePoint2[1] - linePoint1[1];
    let m = Math.hypot(a, d);
    let distance = ((a*b) - (c*d))/m
    return Math.abs(distance);
}

export const calculatePerpendicularPoint = (linePoints, point)=> {
    let linePoint1 = linePoints[0];
    let linePoint2 = linePoints[1];
    let a = linePoint2[0] - linePoint1[0];
    let b = linePoint1[1] - point.y;
    let c = linePoint1[0] - point.x;
    let d = linePoint2[1] - linePoint1[1];
    let m = Math.hypot(a, d);
    let distance = ((a*b) - (c*d))/m
    let px = point.x - 1 * (d/m) * distance;
    let py = point.y + 1 * (a/m) * distance;
    return [roundTo2(px), roundTo2(py)]
}

export const getInnerBoundaryBox = (polygon, nodes) =>{
    let iNodes = nodes;
    let newPolygon = [];
    for(let point of polygon){
        newPolygon.push(point)
    }

    newPolygon.push(newPolygon[0]);

    const getLinesIntersections = (line1, line2) => {
        let x1 = line1[0][0]
        let y1 = line1[0][1]
        let x2 = line1[1][0]
        let y2 = line1[1][1]
        let x3 = line2[0][0]
        let y3 = line2[0][1]
        let x4 = line2[1][0]
        let y4 = line2[1][1]
        let d = (x1-x2)*(y3-y4)-(y1-y2)*(x3-x4);
        if (d === 0){
            console.log("i am here")
            return [0, 0];
        }
        let px = ((x1*y2-y1*x2)*(x3-x4)-(x1-x2)*(x3*y4-y3*x4))/d;
        let py = ((x1*y2-y1*x2)*(y3-y4)-(y1-y2)*(x3*y4-y3*x4))/d;
        return [px, py]
    }

    //Find the node with less distance to the side
    for(let i = 0; i < newPolygon.length-1; i++){
        let distance;
        let node;
        for(let j = 0; j < iNodes.length; j++){
            let tempDistance = distanceToLine([[newPolygon[i][0], newPolygon[i][1]], [newPolygon[i+1][0], newPolygon[i+1][1]]], [iNodes[j].x, iNodes[j].y]);
            // let tempDistance = i ===  newPolygon.length-1?  distanceToLine([[newPolygon[i][0],  newPolygon[i][1]], [newPolygon[0][0], newPolygon[0][1]]], [iNodes[j].x, iNodes[j].y]) : distanceToLine([[newPolygon[i][0], newPolygon[i][1]], [newPolygon[i+1][0], newPolygon[i+1][1]]], [iNodes[j].x, iNodes[j].y]);
            if(j === 0){
               distance = tempDistance;
               node = iNodes[j];
            }else if(tempDistance < distance){
                    distance = tempDistance;
                    node = iNodes[j];
                }
        }
        console.log("is a node?", node)

        let pointOnLine = calculatePerpendicularPoint([[newPolygon[i][0], newPolygon[i][1]], [newPolygon[i+1][0], newPolygon[i+1][1]]], node);
        
        let diffX = node.x - pointOnLine[0];
        let diffY = node.y - pointOnLine[1];
        
        let line = [[node.x, node.y], [newPolygon[i][0] + diffX, newPolygon[i][1] + diffY]]

        console.log("line", line, node, pointOnLine)

        let lineBefore = i === 0?  [[newPolygon[newPolygon.length-2][0], newPolygon[newPolygon.length-2][1]], [newPolygon[0][0], newPolygon[0][1]]] : [[newPolygon[i-1][0], newPolygon[i-1][1]], [newPolygon[i][0], newPolygon[i][1]]];

        let lineAfter = i === newPolygon.length-2? [[newPolygon[0][0], newPolygon[0][1]], [newPolygon[1][0], newPolygon[1][1]]] :[[newPolygon[i+1][0], newPolygon[i+1][1]], [newPolygon[i+2][0], newPolygon[i+2][1]]];

        newPolygon[i] = getLinesIntersections(line, lineBefore);
        if(i === 0){
            newPolygon[newPolygon.length-1] = newPolygon[0];
        }

        if(i === newPolygon.length-2){
            newPolygon[0] =  getLinesIntersections(line, lineAfter);
            newPolygon[newPolygon.length-1] = newPolygon[0];
        }
        else{
            newPolygon[i+1] = getLinesIntersections(line, lineAfter);
        }
}
newPolygon.pop();
console.log("Osm", newPolygon);
return newPolygon;
}

export const getAffectedNbhs = (startNbh, network, scaleX, scaleY) => {

    //X
    let affectedNbhsX = [];
    let toCheckNbhs = [startNbh];

    while(toCheckNbhs.length !==0){
        let nbh = toCheckNbhs.shift();
        affectedNbhsX.push(nbh);
        let bNodes = nbh.getBNodes();

        let affectedNodes = [];
        for(let bNode of bNodes){
            if(bNode.x !== scaleX(bNode.x)){
                affectedNodes.push(bNode);
            }
        }

        let affectedRoads = [];
        for(let road of nbh.bRoads){
            if (road.nodes.some(node => affectedNodes.indexOf(node) >= 0)){
                let prevWidth = 0;
                let afterWidth = 0;
                for(let i = 1; i < road.nodes.length; i++){
                    prevWidth += roundTo2(Math.abs(road.nodes[i-1].x - road.nodes[i].x))
                    afterWidth += roundTo2(Math.abs(scaleX(road.nodes[i-1].x) - scaleX(road.nodes[i].x)))
                }
                if( prevWidth!== afterWidth && !affectedRoads.includes(road))
                    affectedRoads.push(road);
            }
        }

            //Select nbhs that share affected Roads
        for(let affectedRoad of affectedRoads){
            let tempNbhs = network.getBRoadSharedNbhs(affectedRoad);
            for(let tempNbh of tempNbhs){
                if (!affectedNbhsX.includes(tempNbh) && !toCheckNbhs.includes(tempNbh))
                    toCheckNbhs.push(tempNbh);
            } 
        }
    }

    let affectedNbhsY = [];
    toCheckNbhs = [startNbh];
    
    while(toCheckNbhs.length !==0){
        let nbh = toCheckNbhs.shift();
        affectedNbhsY.push(nbh);
        let bNodes = nbh.getBNodes();

        let affectedNodes = [];
        for(let bNode of bNodes){
            if(bNode.y !== scaleY(bNode.y)){
                affectedNodes.push(bNode);
            }
        }

        let affectedRoads = [];
        for(let road of nbh.bRoads){
            if (road.nodes.some(node => affectedNodes.indexOf(node) >= 0)){
                let prevWidth = 0;
                let afterWidth = 0;
                for(let i = 1; i < road.nodes.length; i++){
                    prevWidth += roundTo2(Math.abs(road.nodes[i-1].y - road.nodes[i].y))
                    afterWidth += roundTo2(Math.abs(scaleX(road.nodes[i-1].y) - scaleX(road.nodes[i].y)))
                }
                if( prevWidth!== afterWidth && !affectedRoads.includes(road))
                    affectedRoads.push(road);
            }
        }

            //Select nbhs that share affected Roads
        for(let affectedRoad of affectedRoads){
            let tempNbhs = network.getBRoadSharedNbhs(affectedRoad);
            for(let tempNbh of tempNbhs){
                if (!affectedNbhsY.includes(tempNbh) && !toCheckNbhs.includes(tempNbh))
                    toCheckNbhs.push(tempNbh);
            } 

        }

    }

    console.log("Affected Nbhs", affectedNbhsX, affectedNbhsX);
    return [affectedNbhsX, affectedNbhsY];

}