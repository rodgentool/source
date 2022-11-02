
import '../Style/OSM.css';
import { useState, useMemo} from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer } from "react-leaflet";
import { PopUp } from "../Components/PopUp"
import { AreaSelect} from "./AreaSelect"
import {ProgressBar} from "../Components/ProgressBar"
import {getPolygonInLatLon, polyLonLatToString, filterOsmData, getComponents, getMaxComponent, distanceInM, getSizeSelectedArea, getInnerBoundaryBox, getAffectedNbhs} from "../utilityFunctions/osmFunctions";
import { TabContent } from "../Components/Tabbar";
import { NbhEdit } from "../Main/NbhEdit";
import {min, max, json} from "d3";
import { scaleLinear } from "d3-scale";
import { interpolateRound } from "d3-interpolate";
import { roundTo2 } from "../utilityFunctions/mathFunctions";



//import * as d3 from "d3";

export const OsmImport = ({
    onChangeView,
    network,
    onChangeNetwork,
    handleCancel,
    elementsSelected,
    onChangeElementsSelected,
    globalScale,
    outerNodeRadius,
    innerNodeRadius,
    outerLineWidth,
    innerLineWidth
    }) => {
    
    const [networkCopy, setNetworkCopy] = useState(() => network.copy());
    const nbhSelected = useMemo(() => networkCopy.nbhs[elementsSelected[0].id], [networkCopy, elementsSelected]);
    const bNodes = useMemo(() => nbhSelected.getBNodes(), [nbhSelected]);
    const nbhBoundaryMinX = useMemo(() => min(bNodes, node => node.x), [bNodes]);
    const nbhBoundaryMinY = useMemo(() => min(bNodes, node => node.y), [bNodes]);
    const nbhBoundaryMaxX = useMemo(() => max(bNodes, node => node.x), [bNodes]);
    const nbhBoundaryMaxY = useMemo(() => max(bNodes, node => node.y), [bNodes]);
    const marginInnerNet = {x: 50, y: 50}; 
    
    const mapCenter =  [49.99208503093319, 8.237311948697884];
    const [polygonLatLon, setPolygonLatLon] = useState(() => getPolygonInLatLon(networkCopy.nbhs[elementsSelected[0].id], mapCenter, nbhBoundaryMaxX-nbhBoundaryMinX-marginInnerNet.x*2, nbhBoundaryMaxY-nbhBoundaryMinY-marginInnerNet.y*2));
    
    //0=No 1=Loading -1=Fail
    const [isLoading, setIsLoading] = useState(0);
    const [step, setStep] = useState(1);
   
    
    const sizeSelectedArea = getSizeSelectedArea(polygonLatLon);
    
   
    //const [nbhBNodesBoundaries, setNbhBNodesBoundaries] = useState(() => networkCopy.getNbhBNodesBoundaries(networkCopy.nbhs[elementsSelected[0].id]));
    
    

    const handleStep01 = () => {
        setIsLoading(1);
        let poly = polyLonLatToString(polygonLatLon);
        let url = `https://overpass-api.de/api/interpreter?data=[out:json];(way[%22highway%22~%22^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$%22](poly:"${poly}"););(._;node(w););out%20qt;`

        json(url).then(data => {
            let [osmNodes, osmRoads, json] = filterOsmData(data, polygonLatLon, networkCopy.roadTypes.types);
            if (osmNodes.length !== 0){
                getComponents(json).then(components => {
                    let osmData = getMaxComponent(osmNodes, osmRoads, components);

                    //Calculate width and height of the internal network
                    let polyMinLon = min(polygonLatLon, d => d[1]);
                    let polyMaxLon = max(polygonLatLon, d => d[1]);
                    let polyMinLat = min(polygonLatLon, d => d[0]);
                    let polyMaxLat = max(polygonLatLon, d => d[0]);
                    let innerWidth = parseInt(distanceInM(polyMinLat, polyMinLon, polyMinLat,  polyMaxLon));
                    let innerHeight = parseInt(distanceInM(polyMinLat, polyMinLon, polyMaxLat,  polyMinLon));

                    //Change of coordinates system
                    let rescaleLon = scaleLinear().domain([polyMinLon, polyMaxLon]).range([0, innerWidth]).interpolate(interpolateRound);
                    let rescaleLat = scaleLinear().domain([polyMinLat, polyMaxLat]).range([innerHeight, 0]).interpolate(interpolateRound);
                    for (let osmNode of osmData.nodes){
                        osmNode.x = rescaleLon(osmNode.x);
                        osmNode.y = rescaleLat(osmNode.y);
                    }
                    
                    networkCopy.emptyNbh(nbhSelected);
        
                    //
                    let scaledPolygon = [];
                    for(let latLonPoint of polygonLatLon){
                        scaledPolygon.push([rescaleLon(latLonPoint[1]), rescaleLat(latLonPoint[0])])
                    }

                    //resize Polyigon to actual content
                    let resizedPolygonToContent = getInnerBoundaryBox(scaledPolygon, osmData.nodes);
                    

                    let scaledPolyMinX = min(scaledPolygon, d => d[0]);
                    let scaledPolyMinY  = min(scaledPolygon, d => d[1]);
                    let reScaledPolyMinX = min(resizedPolygonToContent, d => d[0]);
                    let reScaledPolyMinY  = min(resizedPolygonToContent, d => d[1]);
                    let reScaledPolyMaxX = max(resizedPolygonToContent, d => d[0]);
                    let reScaledPolyMaxY  = max(resizedPolygonToContent, d => d[1]);

                    //Change the size of the backbone
                    let prevOuterWidth =  nbhBoundaryMaxX - nbhBoundaryMinX;
                    let prevOuterHeight =  nbhBoundaryMaxY - nbhBoundaryMinY;
                    let newOuterWidth = roundTo2(reScaledPolyMaxX-reScaledPolyMinX + (marginInnerNet.x * 2));
                    let newOuterHeight =  roundTo2(reScaledPolyMaxY-reScaledPolyMinY + (marginInnerNet.y * 2));


                    let bNodes_ = nbhSelected.getBNodes();
                    let maxX = max(bNodes_, node => node.x)
                    let minX = min(bNodes_, node => node.x)
                    let maxY = max(bNodes_, node => node.y)
                    let minY = min(bNodes_, node => node.y)
                    //console.log(maxX, minX)

                    let scaleX = scaleLinear().domain([minX, maxX]).range([minX, minX + newOuterWidth]);
                    let scaleY = scaleLinear().domain([minY, maxY]).range([minY, minY + newOuterHeight]);

                    let [affectedNbhsX, affectedNbhsY] = getAffectedNbhs(nbhSelected, networkCopy, scaleX, scaleY);
                  
                    //X Achse
                    if(prevOuterWidth > newOuterWidth){
                        let empty = true;
                        for(let affectedNbhX of affectedNbhsX){
                            if(!affectedNbhX.isEmpty()){
                                empty = false;
                                break;
                            }
                        }
                        if (!empty)
                            newOuterWidth = prevOuterWidth;
                    }

                    let diffX = newOuterWidth - prevOuterWidth;

                    if(diffX !== 0){
                        let nodesToBeScaled = [];
                        let nodesToBeTrasnlated = [];
                        for(let nbhId in networkCopy.nbhs){
                            let nbh_ = networkCopy.nbhs[nbhId];
                            let oNodes =nbh_.getONodes();
                            let iNodes = nbh_.getINodes(false);
                            if(affectedNbhsX.includes(nbh_)){
                                for(let oNode of oNodes){
                                    if(!nodesToBeScaled.includes(oNode))
                                        nodesToBeScaled.push(oNode);
                                }
                                for(let iNode of iNodes){
                                    if(iNode.x > minX)
                                        iNode.x = iNode.x + (diffX/2);

                                }
                            }
                            else{
                                for(let oNode of oNodes){
                                    if(!nodesToBeTrasnlated.includes(oNode) && oNode.x > maxX)
                                    nodesToBeTrasnlated.push(oNode);
                                }
                                for(let iNode of iNodes){
                                    if(iNode.x > maxX)
                                        iNode.x = iNode.x + diffX;

                                }
                            }
                        }

                    for(let node of nodesToBeScaled)
                        node.x = scaleX(node.x);

                    for(let node of nodesToBeTrasnlated)
                        node.x = node.x + diffX;
                
                    }

                    //Y Achse
                    if(prevOuterHeight > newOuterHeight){
                        let empty = true;
                        for(let affectedNbhY of affectedNbhsY){
                            if(!affectedNbhY.isEmpty()){
                                empty = false;
                                break;
                            }
                        }
                        if (!empty)
                            newOuterHeight = prevOuterHeight;
                    }

                    let diffY = newOuterHeight - prevOuterHeight;

                    if(diffY !== 0){
                        let nodesToBeScaled = [];
                        let nodesToBeTrasnlated = [];
                        for(let nbhId in networkCopy.nbhs){
                            let nbh_ = networkCopy.nbhs[nbhId];
                            let oNodes =nbh_.getONodes();
                            let iNodes = nbh_.getINodes(false);
                            if(affectedNbhsY.includes(nbh_)){
                                for(let oNode of oNodes){
                                    if(!nodesToBeScaled.includes(oNode))
                                        nodesToBeScaled.push(oNode);
                                }
                                for(let iNode of iNodes){
                                    if(iNode.y > minY)
                                        iNode.y = iNode.y + (diffY/2);

                                }
                            }
                            else{
                                for(let oNode of oNodes){
                                    if(!nodesToBeTrasnlated.includes(oNode) && oNode.y > maxY)
                                    nodesToBeTrasnlated.push(oNode);
                                }
                                for(let iNode of iNodes){
                                    if(iNode.y > maxY)
                                        iNode.y = iNode.y + diffY;

                                }
                            }
                        }

                    for(let node of nodesToBeScaled)
                        node.y = scaleY(node.y);

                    for(let node of nodesToBeTrasnlated)
                        node.y = node.y + diffY;
                
                    }

                    for(let roads of nbhSelected.bRoads){
                        roads.calculateLength();
                    }

                    //Add inner Network
                    bNodes_ = nbhSelected.getBNodes();
                    let translateX = min(bNodes_, node => node.x) - (reScaledPolyMinX - scaledPolyMinX) + marginInnerNet.x;
                    let translateY = min(bNodes_, node => node.y) - (reScaledPolyMinY - scaledPolyMinY) + marginInnerNet.y;
                    let mapOldToNewId = {};
                    for (let osmNode of osmData.nodes){
                        let newNode = networkCopy.addNode([osmNode.x + translateX, osmNode.y + translateY], osmNode.isIntersection, false, false);
                        mapOldToNewId[osmNode.id] = newNode.id;
                    }

                    for(let osmWay of osmData.ways){
                        let roadNodes = [];
                        for(let wayNodeId of osmWay.nodes){
                            roadNodes.push(networkCopy.nodes[mapOldToNewId[wayNodeId]]);
                        }
                        let newRoad = networkCopy.addRoad(roadNodes, networkCopy.getRoadTypeById(osmWay.type), osmWay.direction, false, false);
                        nbhSelected.iRoads.push(newRoad);
                    }
                        
                
                    //Connections!
                    let bNodesLen = bNodes.length;
                    let roadsBySide = nbhSelected.getbRoadsByPolySide();
                    
                    for(let i = 0; i < bNodesLen; i++){
                        let sidePoints;
                        sidePoints = nbhSelected.getSidePoints(roadsBySide, i);
                        networkCopy.addNbhConnectionsfromClosestNodeToFurther(nbhSelected, sidePoints, 1, innerNodeRadius);
                    }

                    setNetworkCopy(Object.assign(Object.create(Object.getPrototypeOf(networkCopy)), networkCopy));
                    //setNbhBNodesBoundaries(networkCopy.getNbhBNodesBoundaries(elementsSelected[0]));
                    setIsLoading(0);
                    setStep(2);

                })}
                
        }).catch(error => {
        console.log(error)
        setIsLoading(-1)});
    };


    const handleStep02 = () => {

        //Copy the inner Net to to the other selected nbhs (Actual constrain: working only for nbhs with same form)
        let firstNbh = networkCopy.nbhs[elementsSelected[0].id];
        let fNbhbNodes = firstNbh.getBNodes();
        let fNbhMinX = min(fNbhbNodes, node => node.x)
        let fNbhMinY = min(fNbhbNodes, node => node.y)
        let fNbhMaxX = max(fNbhbNodes, node => node.x)
        let fNbhMaxY = max(fNbhbNodes, node => node.y)
        let newOuterWidth = fNbhMaxX - fNbhMinX
        let newOuterHeight =fNbhMaxY - fNbhMinY
        

        let iNodes = firstNbh.getINodes(false);
        let iRoads = firstNbh.getIRoads();
        let oNodes = firstNbh.getONodes();
        let cRoads = firstNbh.getCRoads();
        let bRoads = firstNbh.getBRoads();

        for(let i = 1; i < elementsSelected.length; i++){
            let nbhSelected = networkCopy.nbhs[elementsSelected[i].id];
            let nbhbNodes = nbhSelected.getBNodes();
            let minX = min(nbhbNodes, node => node.x)
            let maxX = max(nbhbNodes, node => node.x)
            let minY = min(nbhbNodes, node => node.y)
            let maxY = max(nbhbNodes, node => node.y)

            let prevOuterWidth = maxX - minX;
            let prevOuterHeight = maxY - minY;
            
            let translateX =  minX  - fNbhMinX;
            let translateY =  minY  - fNbhMinY;

                let scaleX = scaleLinear().domain([minX, maxX]).range([minX, minX + newOuterWidth]);
                let scaleY = scaleLinear().domain([minY, maxY]).range([minY, minY + newOuterHeight]);

                let [affectedNbhsX, affectedNbhsY] = getAffectedNbhs(nbhSelected, networkCopy, scaleX, scaleY);

                //X Achse
                if(prevOuterWidth > newOuterWidth){
                    let empty = true;
                    for(let affectedNbhX of affectedNbhsX){
                        if(!affectedNbhX.isEmpty()){
                            empty = false;
                            break;
                        }
                    }
                    if (!empty)
                        newOuterWidth = prevOuterWidth;
                }

                let diffX = newOuterWidth - prevOuterWidth;

                if(diffX !== 0){
                    let nodesToBeScaled = [];
                    let nodesToBeTrasnlated = [];
                    for(let nbhId in networkCopy.nbhs){
                        let nbh_ = networkCopy.nbhs[nbhId];
                        let oNodes =nbh_.getONodes();
                        let iNodes = nbh_.getINodes(false);
                        if(affectedNbhsX.includes(nbh_)){
                            for(let oNode of oNodes){
                                if(!nodesToBeScaled.includes(oNode))
                                    nodesToBeScaled.push(oNode);
                            }
                            for(let iNode of iNodes){
                                if(iNode.x > minX)
                                    iNode.x = iNode.x + (diffX/2);

                            }
                        }
                        else{
                            for(let oNode of oNodes){
                                if(!nodesToBeTrasnlated.includes(oNode) && oNode.x > maxX)
                                nodesToBeTrasnlated.push(oNode);
                            }
                            for(let iNode of iNodes){
                                if(iNode.x > maxX)
                                    iNode.x = iNode.x + diffX;

                            }
                        }
                    }

                for(let node of nodesToBeScaled)
                    node.x = scaleX(node.x);

                for(let node of nodesToBeTrasnlated)
                    node.x = node.x + diffX;
            
                }

                //Y Achse
                if(prevOuterHeight > newOuterHeight){
                    let empty = true;
                    for(let affectedNbhY of affectedNbhsY){
                        if(!affectedNbhY.isEmpty()){
                            empty = false;
                            break;
                        }
                    }
                    if (!empty)
                        newOuterHeight = prevOuterHeight;
                }

                let diffY = newOuterHeight - prevOuterHeight;

                if(diffY !== 0){
                    let nodesToBeScaled = [];
                    let nodesToBeTrasnlated = [];
                    for(let nbhId in networkCopy.nbhs){
                        let nbh_ = networkCopy.nbhs[nbhId];
                        let oNodes =nbh_.getONodes();
                        let iNodes = nbh_.getINodes(false);
                        if(affectedNbhsY.includes(nbh_)){
                            for(let oNode of oNodes){
                                if(!nodesToBeScaled.includes(oNode))
                                    nodesToBeScaled.push(oNode);
                            }
                            for(let iNode of iNodes){
                                if(iNode.y > maxY)
                                    iNode.y = iNode.y + (diffY/2);

                            }
                        }
                        else{
                            for(let oNode of oNodes){
                                if(!nodesToBeTrasnlated.includes(oNode) && oNode.y > maxY)
                                nodesToBeTrasnlated.push(oNode);
                            }
                            for(let iNode of iNodes){
                                if(iNode.y > maxY)
                                    iNode.y = iNode.y + diffY;

                            }
                        }
                    }

                for(let node of nodesToBeScaled)
                    node.y = scaleY(node.y);

                for(let node of nodesToBeTrasnlated)
                    node.y = node.y + diffY;
            
                }

                for(let roads of nbhSelected.bRoads){
                    roads.calculateLength();
                }

                let mapOldToNewId = {};
                for (let iNode of iNodes){
                    let newNode = networkCopy.addNode([iNode.x + translateX, iNode.y + translateY], iNode.isIntersection, false, false);
                    mapOldToNewId[iNode.id] = newNode.id;
                }

                for (let oNode of oNodes){
                   let [newNode, ] = networkCopy.isPointANode([oNode.x + translateX, oNode.y + translateY], outerNodeRadius, "cNode", nbhSelected, true);
                    if(!newNode)
                        newNode = networkCopy.addNode([oNode.x + translateX, oNode.y + translateY], oNode.isIntersection, false, false);
                   mapOldToNewId[oNode.id] = newNode.id;
                }
                
                for(let iRoad of iRoads){
                    let roadNodes = [];
                    for(let node of iRoad.nodes){
                        roadNodes.push(networkCopy.nodes[mapOldToNewId[node.id]]);
                    }
                    let newRoad = networkCopy.addRoad(roadNodes, iRoad.type, iRoad.direction, false, false);
                    nbhSelected.iRoads.push(newRoad);
                }

                for(let cRoad of cRoads){
                    let roadNodes = [];
                    for(let node of cRoad.nodes){
                        roadNodes.push(networkCopy.nodes[mapOldToNewId[node.id]]);
                        for(let j = 0; j < bRoads.length; j++){
                            let bRoad = bRoads[j];
                            let nodeA = bRoad.nodes[0];
                            let nodeB = bRoad.nodes[bRoad.nodes.length-1]
                            if(node.isOnLineSegment([[nodeA.x, nodeA.y], [nodeB.x, nodeB.y]], outerNodeRadius)){
                                let newOutRoad = networkCopy.addRoad([node, nodeB], bRoad.type, bRoad.direction, true, false);
                                bRoad.nodes[bRoad.nodes.length-1] = node;
                                for (let nbhId in networkCopy.nbhs){
                                    let nbh_ = networkCopy.nbhs[nbhId];
                                    if (nbh_.bRoads.includes(bRoad)){
                                           nbh_.addRoadToBRoads(newOutRoad);
                                    }
                                }
                            bRoad.calculateLength();
                        }

                    }
                    let newRoad = networkCopy.addRoad(roadNodes, cRoad.type, cRoad.direction, false, false);
                    nbhSelected.cRoads.push(newRoad);
                }
            }

        }
 
        networkCopy.calculateSize();
        onChangeElementsSelected(null);
        onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(networkCopy)), networkCopy));
        onChangeView(null);
    }


    const handlePopUpCancel = () => {
        setIsLoading(0);
    };

    const handlePrev = () => {
        setNetworkCopy(network.copy());
        setStep(1);
    }


    return(
        <>
        <TabContent display={step === 1}>
            <div className="map_container">
                <div className="container-title">Open Street Map <small>(Step {step} of 2)</small></div>
                <div className="exit" onClick={() => onChangeView("import")}>X</div>
                <div >Select the area you want to import: <br />&nbsp;</div>
                <MapContainer center={mapCenter} zoom={14} >
                    <TileLayer
                    attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <AreaSelect 
                        polygon={polygonLatLon}
                        onChangePolygon={setPolygonLatLon}
                    />
                </MapContainer>
                <div className="grey mtb-3 copyright">
                <small>
                        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OSM License (www.openstreetmap.org/copyright)</a>
                    </small>
                <br />
                </div>
                <div className="mtb-3">
                    Current selection size (meters): <strong> w:</strong> {sizeSelectedArea.w}&nbsp;&nbsp;X&nbsp;&nbsp;<strong>h:</strong> {sizeSelectedArea.h} 
                </div>
                <PopUp display={isLoading !== 0} prev="Cancel" onPrev={handlePopUpCancel}>
                    {isLoading === 1?
                    <>
                        <h2>Loading...</h2>
                        <ProgressBar/>
                        <div className="mb-4"></div>
                    </>:
                        <p>An error occurred, please try again, or try a smaller area</p>
                    }
                </PopUp>
                <button className="btn btn-newProject" type="button" onClick={handleStep01}>
                Next
            </button>
            <button className="btn btn-newProject" type="button" onClick={() => onChangeView("import")}>
            Previous
            </button>
            </div>

        </TabContent>
        <TabContent display={step === 2}>
            <NbhEdit
                title={['Open Street Map ', <small key="step">(Step {step} of 2)</small>]}
                outerNodeRadius={outerNodeRadius}
                innerNodeRadius={innerNodeRadius}
                outerLineWidth={outerLineWidth}
                innerLineWidth={innerLineWidth}
                handleCancel={handleCancel}
                network={networkCopy}
                onChangeNetwork={setNetworkCopy}
                nbhSelected={networkCopy.nbhs[elementsSelected[0].id]}
                globalScale={globalScale}
                handlePrev={handlePrev}
                handleNext={(size, mapCenter) => handleStep02(size, mapCenter)}
                btn02={'Import'} 
                btn01={'Previous'}/>
        </TabContent>
        </>     
    )
}