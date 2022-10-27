import { useState, useEffect, useRef } from "react";
import '../Style/Main.css';

import { OsmImport } from '../OSMImport/OsmImport';
import { MainNavbar } from "./MainNavbar";
import { CanvasContainer } from './CanvasContainer';
import { PopUp } from '../Components/PopUp';
import { RightPanel } from "./RightPanel/Panel";
import { calculateStartMargins} from '../utilityFunctions/canvasFunctions'
import { ProgressBar } from "../Components/ProgressBar";
import { Histogram } from "../Components/Histogram";
import { NbhEdit } from './NbhEdit'
import { min, max} from "d3-array";
import axios from "axios";
import { roundTo2 } from "../utilityFunctions/mathFunctions";
import {getAffectedNbhs} from "../utilityFunctions/osmFunctions";
import { scaleLinear } from "d3-scale";
import { geoConicConformalRaw } from "d3";


export const Main = ({
    onChangeView,
    network,
    onChangeNetwork,
    grid,
    onChangeGrid,
    gridTick,
    onChangeGridTick,
    showRoadColors,
    onChangeRoadColors,
    showOnlyIntersectionNodes,
    onChangeShowOnlyIntersectionNodes,
    onChangeOpenProject,
    scale,
    readFileContent
    }) => {
    const devicePixelRatio = window.devicePixelRatio || 1 
    const containerRef = useRef();

    const outerNodeRadius = 2;
    const innerNodeRadius = 1;
    const outerLineWidth = 2;
    const innerLineWidth = 1;

    //Menus
    const [contextMenu, setContextMenu] = useState(false);
    const [isNavActive, setIsNavActive] = useState(false);

    //Algorithms
    const [algorithm, setAlgorithm] = useState(null);
    const [pointTo, setPointTo] = useState(null);
    const [fpStart, setFpStart] = useState(null);
    const [fpEnd, setFpEnd] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [dataReturn, setDataReturn] = useState(null);
    const [showFsp, setShowFsp] = useState(true);
    const [showFfp, setShowFfp] = useState(true);
    const [fsp, setFsp] = useState(null);
    const [ffp, setFfp] = useState(null);



    const [zoomTransform, setZoomTransform] = useState({k: 1, x: 0, y: 0})
    const [isRightPanelMin, setIsRightPanelMin] = useState(false);
    const [canvasSize, setCanvasSize] = useState({w: 0 , h: 0});
    const [elementsSelected, setElementsSelected] = useState(null)
    const [activeTab, setActiveTab] = useState('network')
    const [prevNetworkSize, setPrevNetworkSize] = useState(network.size);
    const [activePopUp, setActivePopUp] = useState(false);
    const [networkCopy, setNetworkCopy] = useState(null);
    const [minNbhSize, setMinNbhSize] = useState(null); 

    // To add a newRoad
    const [drawPointer, setDrawPointer] = useState(false); 
    const [newRoad, setNewRoad] = useState(null);
    const [roadData, setRoadData] = useState(null);
    
    //File Options
    const [fileName, setFileName] = useState('Network')
    const [fileType, setFileType] = useState("gr")
    const [typeImport, setTypeImport] = useState("OSM")
    const [grFile, setGrFile] = useState(null);
    const [coFile, setCoFile] = useState(null);
  
    // Managing Files

    const importGr = () => {
        if (grFile) {
            return new Promise(function(resolve, reject) {
                const marginInnerNet = {x: 50, y: 50}; 
                readFileContent(grFile).then(grData => {
                    if(coFile){
                    let newNetwork = network.copy();
                    
                    let nodes = {}
                    let roads = {}
                        return new Promise(function(resolve, reject) {
                            readFileContent(coFile).then(coData => {
                                const coDataLines = coData.split(/\r?\n/);
                                for(let line of coDataLines){
                                    const word = line.split(" ");
                                    if(word[0] === 'v'){
                                        nodes[Number(word[1])] = {id:Number(word[1]), x: Number(word[2]), y: Number(word[3])};
                                    }
                                }
                                const grDataLines = grData.split(/\r?\n/);
                                let id = 0;
                                for(let line of grDataLines){
                                    const word = line.split(" ");
                                    if(word[0] === 'a'){
                                        // TO-DO: Type
                                        if (id !== 0 && roads[id-1].nodes.includes(Number(word[1])) && roads[id-1].nodes.includes(Number(word[2]))){
                                            roads[id-1].direction = "both";
                                            continue;
                                        }
                                        let alreadySet = false;
                                        for(let roadId in roads){
                                            if(roads[roadId].nodes.includes(Number(word[1])) && roads[id-1].nodes.includes(Number(word[2])))
                                                roads[roadId].direction = "both";
                                                break;
                                        }

                                        if(!alreadySet){
                                            roads[id] = {nodes: [Number(word[1]), Number(word[2])], length: Number(word[3]), direction: "oneway", type: word[4]}; 
                                            console.log(word[4])      
                                            id++;
                                        }

                                    
                                        }
                                    }
                                        
                    
                                let factorToOriginalCoord = 0;
                                if (roads[id-1]){
                                    let road = roads[id-1];
                                    let node1 = nodes[road.nodes[0]];
                                    let node2 = nodes[road.nodes[1]];
                                    let dist = Math.hypot(node2.x-node1.x, node2.y-node1.y);
                                    factorToOriginalCoord = road.length/dist;
                                }

                                let nbhSelected = newNetwork?.nbhs[elementsSelected[0].id];
                                console.log(elementsSelected)
                                console.log(nbhSelected);
                                let bNodes = nbhSelected.getBNodes();
                                let maxX = max(bNodes, node => node.x)
                                let minX = min(bNodes, node => node.x)
                                let maxY = max(bNodes, node => node.y)
                                let minY = min(bNodes, node => node.y)
                                let nodes_ = Object.values(nodes)
                                let newMaxX = max(nodes_, node => node.x*factorToOriginalCoord)
                                let newMinX = min(nodes_, node => node.x*factorToOriginalCoord)
                                let newMaxY = max(nodes_, node => node.y*factorToOriginalCoord)
                                let newMinY = min(nodes_, node => node.y*factorToOriginalCoord)

                                let prevOuterWidth = maxX - minX;
                                let prevOuterHeight = maxY - minY;
                                let newOuterWidth = roundTo2(newMaxX-newMinX + (marginInnerNet.x * 2));
                                let newOuterHeight =  roundTo2(newMaxY-newMinY + (marginInnerNet.y * 2));

                                let scaleX = scaleLinear().domain([minX, maxX]).range([minX, minX + newOuterWidth]);
                                let scaleY = scaleLinear().domain([minY, maxY]).range([minY, minY + newOuterHeight]);
            
                                let [affectedNbhsX, affectedNbhsY] = getAffectedNbhs(nbhSelected, newNetwork, scaleX, scaleY);

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
                                    for(let nbhId in newNetwork.nbhs){
                                        let nbh_ = newNetwork.nbhs[nbhId];
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
                                    for(let nbhId in newNetwork.nbhs){
                                        let nbh_ = newNetwork.nbhs[nbhId];
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


                                //Add inner Network
                                bNodes = nbhSelected.getBNodes();
                                let translateX = min(bNodes, node => node.x) ;
                                let translateY = min(bNodes, node => node.y) + marginInnerNet.y;

                                let mapOldToNewId = {};
                                for (let nodeId in nodes){
                                    let node = nodes[nodeId];
                                    let newNode = newNetwork.addNode([node.x*factorToOriginalCoord + translateX, node.y*factorToOriginalCoord + translateY], true, false, false);
                                    mapOldToNewId[node.id] = newNode.id;
                                }
                                console.log(mapOldToNewId);
                                for(let roadId in roads){
                                    let road = roads[roadId];
                                    let roadNodes = [];
                                    for(let wayNodeId of road.nodes){
                                        roadNodes.push(newNetwork.nodes[mapOldToNewId[wayNodeId]]);
                                    }
                                    let newRoad = newNetwork.addRoad(roadNodes, newNetwork.roadTypes.findRoadTypeBySpeed(road.type), road.direction, false, false);
                                    nbhSelected.iRoads.push(newRoad);
                                }
                                    
                            
                                //Connections!
                                let bNodesLen = bNodes.length;
                                let roadsBySide = nbhSelected.getbRoadsByPolySide();
                                
                                for(let i = 0; i < bNodesLen; i++){
                                    let sidePoints;
                                    sidePoints = nbhSelected.getSidePoints(roadsBySide, i);
                                    newNetwork.addNbhConnectionsfromClosestNodeToFurther(nbhSelected, sidePoints, 1, innerNodeRadius);
                                }
            
                                setNetworkCopy(Object.assign(Object.create(Object.getPrototypeOf(newNetwork)), newNetwork));
                                //setNbhBNodesBoundaries(networkCopy.getNbhBNodesBoundaries(elementsSelected[0]));
                                setActivePopUp("editNbh");
                                console.log(newNetwork);
                        
                                })
                        
                        
                              
                            })
                    
                    }



                    console.log(grData);
                })});
        }
    }


    //OK
    const dowloadTag = (text, type, fileN = fileName) => {
        let element = document.createElement('a');
        element.setAttribute('href', text);
        element.setAttribute('download', fileN + type);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        setActivePopUp(false);
    }

    //OK
    const handleSave = () => {
        let networkToString = network.toString("json-project");
        let project = `{
    "showGrid": {
        "active": ${grid},
        "gridTick": ${gridTick}
    },
    "showRoadColors": ${showRoadColors},
    "showOnlyIntersections": ${showOnlyIntersectionNodes},
${networkToString}
}`
        project = `data:text/json;charset=utf-8,${encodeURIComponent(project)}`;
        dowloadTag(project, '.json');
    
       
    }

    const handleSaveHisto = () => {
        let svg = document.getElementById("degreeDistribution");
        let data = (new XMLSerializer()).serializeToString(svg);
        data = "data:image/svg+xml;utf8," + data;
        dowloadTag(data, '.svg', 'RNGGDegreeDistribution');
    }

    //OK
    const handleFileName = (e) => {
        setFileName(e.target.value)
    }
 
    //OK
    const handleFileType = (e) => {
         setFileType(e.target.value);
    }

    const handleImportType = (e) => {
        setTypeImport(e.target.value);
   }

 
    //OK
    const handleExport = () => {
            let data;
            if(fileType === "png"){
                let canvas = document.getElementById("canvasNet");
                data = canvas.toDataURL();
                dowloadTag(data, '.png');
        
            }else if(fileType.includes("gr")){
                data = network.toString('gr');
                data = `data:text/gr;charset=utf-8,${encodeURIComponent(data)}`;
                dowloadTag(data, '.gr');
        
                if(fileType.includes("co")){
                    data = network.toString('co');
                    data = `data:text/co;charset=utf-8, ${encodeURIComponent(data)}`;
                    dowloadTag(data, '.co');
                }
        
            }else if(fileType === "xml"){
                data = network.toString('xml');
                data = `data:text/xml;charset=utf-8,${encodeURIComponent(data)}`;
                dowloadTag(data, '.xml');

            }        
        setActivePopUp(false);
    }

    const handleImport = () => {
        setActivePopUp("import");
      
    }

    const handleOpenCoFile = (e) => {
        setCoFile(e.target.files[0]);
    }

    const handleOpenGrFile = (e) => {
        setGrFile(e.target.files[0]);
    }

    //OK
    const handleCancel = () => {
        setActivePopUp(false);
    }

    //OK
    const handleFilesPopUps = () => {
        if (activePopUp === "save") {
            return  <PopUp display={true} nextBtn="Download" onNext={handleSave} onPrev={handleCancel}>
                        <div className="container-title">Save ...</div>
                        <hr className="mt--2"></hr>
                        <div className="mt-8 mb-4 mx-4">
                            Filename:&nbsp; &nbsp;
                            <input type="text" value={fileName + '.json'} onChange={handleFileName} className="input-pxy"/>
                        </div>
                    </PopUp>
        }
        if (activePopUp === "export") {
            return <PopUp  display={true} nextBtn="Download" onNext={() => handleExport()} onPrev={handleCancel} >
                        <div className="container-title">Export ...</div>
                        <hr className="mt--2"></hr>
                        <div className="mt-8 mb-4">
                            Filename:&nbsp; &nbsp;
                            <input type="text" value={fileName} onChange={handleFileName} className="input-pxy filename"/>&nbsp;&nbsp;
                            <select className="options-input" value={fileType} onChange={handleFileType}>
                                <option  value="gr">gr.</option>
                                <option  value="gr+co">gr + .co.</option>
                                <option value="png">png.</option>
                                <option value="xml">xml.</option>
                            </select>
                        </div>
                    </PopUp>
        }   
    }

    const zoomIn = () => {
        let center = {x: canvasSize.w/2, y: canvasSize.h/2}
        let k = zoomTransform.k 
        let kNew = k + 0.2;
        let transform_x = center.x - (kNew*(center.x-zoomTransform.x))/k
        let transform_y = center.y - (kNew*(center.y-zoomTransform.y))/k
        setZoomTransform({k: kNew, x: transform_x, y: transform_y})
    }

    const zoomOut = () =>{
        let center = {x: canvasSize.w/2, y: canvasSize.h/2}
        let k = zoomTransform.k 
        let kNew = k - 0.2;
        let transform_x = center.x - (kNew*(center.x-zoomTransform.x))/k
        let transform_y = center.y - (kNew*(center.y-zoomTransform.y))/k
        if(kNew > 0.01){
            setZoomTransform({k: kNew, x: transform_x, y: transform_y})
       }
    } 

    //
    const handleTabElementsSelected = (selection) =>{
        setElementsSelected(selection)
        if (selection){
            if(isRightPanelMin)
                setIsRightPanelMin(false);
            let key = selection[0]?.constructor.name;
            if (key !== 'node')
                setActiveTab(key)
            
        } else if(!isRightPanelMin) {
            setActiveTab("network")
        }
    }

    const handleGrid = () => {
        onChangeGrid(!grid);
    }

    const handleClick = () => {
        if(setIsNavActive){
            setIsNavActive(false); 
       }
       if(contextMenu){
           setContextMenu(false);
       }
    }

    const handleOpenProject = (e) => {
        onChangeOpenProject(e.target).then(newNet => {
            let startTransform = calculateStartMargins(canvasSize, Object.values(newNet.nodes), scale, 1);
            setZoomTransform(startTransform);
        });
    }

    const centerNetwork = (e) => {
        e.stopPropagation();
        let startTransform = calculateStartMargins(canvasSize, Object.values(network.nodes), scale, zoomTransform.k, false);
        if(JSON.stringify(startTransform) !== JSON.stringify(zoomTransform)){
            setZoomTransform(startTransform);
        }
        
    }

    //TO-DO
    const handleEditNbh = () => {
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
            let cNodes = firstNbh.getCNodes();
            let bNodes = firstNbh.getBNodes();
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

                let mapOldToNewId = {};
                for (let iNode of iNodes){
                    let newNode = networkCopy.addNode([iNode.x + translateX, iNode.y + translateY], iNode.isIntersection, false, false);
                    mapOldToNewId[iNode.id] = newNode.id;
                }

                for (let cNode of cNodes){
                   let [newNode, ] = networkCopy.isPointANode([cNode.x + translateX, cNode.y + translateY], outerNodeRadius, "cNode", nbhSelected, true);
                    if(!newNode)
                        newNode = networkCopy.addNode([cNode.x + translateX, cNode.y + translateY], cNode.isIntersection, false, false);
                   mapOldToNewId[cNode.id] = newNode.id;
                }

                for (let bNode of bNodes){
                    let [newNode, ] = networkCopy.isPointANode([bNode.x + translateX, bNode.y + translateY], outerNodeRadius, "cNode", nbhSelected, true);
                     if(!newNode)
                         newNode = networkCopy.addNode([bNode.x + translateX, bNode.y + translateY], bNode.isIntersection, false, false);
                    mapOldToNewId[bNode.id] = newNode.id;
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
    onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(networkCopy)), networkCopy));
    setNetworkCopy(null);
    setActivePopUp(false);
    }

    const handleDeleteInternalNet = () => {
        let nbhsSelected = elementsSelected;
        for(let nbh of nbhsSelected){
            console.log("hereStarts", nbh);
            network.emptyNbh(nbh);
        }
        onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
        // TO-CHECK which one better works when not-empty
        //setElementsSelected([...nbhsSelected]);
        //setElementsSelected(nbhsSelected.map(nbh => (Object.assign(Object.create(Object.getPrototypeOf(nbh)), nbh))));
        //setElementsSelected(Object.assign(Object.create(Object.getPrototypeOf(nbhsSelected)), nbhsSelected));
    }

    const handleDeleteRoad = () => {
        let roadsSelected = elementsSelected;
        let mapRoadToNbh = {}

        // Maps the roads with their corresponding neighborhood
        for(let nbhId in network.nbhs){
                let nbh = network.nbhs[nbhId];
                let bRoads = [];
                let cRoads = [];
                let iRoads = [];
                for(let road of roadsSelected){
                    let point = [road.nodes[0].x, road.nodes[0].y]
                    if(nbh.bRoads.includes(road)){
                        let areAllEmpty = true;
                        let nbhsSharingRoad = network.getBRoadSharedNbhs(road);
                        for(let nbh_ of nbhsSharingRoad){
                            if(!nbh_.isEmpty())
                                areAllEmpty = false;
                        }
                        if(!areAllEmpty){
                            setActivePopUp("LinkDeleteError01")
                            return;
                        } else
                            bRoads.push(road);
                    }
                    else if(nbh.cRoads.includes(road)){
                        cRoads.push(road);
                    }else if(nbh.containsPoint(point)){
                        iRoads.push(road)
                    }
                }
                if(bRoads.length !== 0 || cRoads.length !== 0 || iRoads.length !== 0){
                    mapRoadToNbh[nbh.id] = {bRoads: bRoads, cRoads: cRoads, iRoads: iRoads}
                }
        }

        for(let nbhIndex in mapRoadToNbh){
            if(network.nbhs[nbhIndex]){
                let adjazentList = {};

                for(let bRoad of network.nbhs[nbhIndex].bRoads){
                    let roadNodes = bRoad.nodes
                    if(!mapRoadToNbh[nbhIndex].bRoads.includes(bRoad)){
                        adjazentList[roadNodes[0].id] = [];
                        adjazentList[roadNodes[roadNodes.length -1].id] = [];
                    }
                }
                
                for(let iRoad of network.nbhs[nbhIndex].iRoads){
                    let roadNodes = iRoad.nodes
                    if(!mapRoadToNbh[nbhIndex].iRoads.includes(iRoad)){
                    adjazentList[roadNodes[0].id] = [];
                    adjazentList[roadNodes[roadNodes.length -1].id] = [];
                    }
                }
                
                for(let cRoad of network.nbhs[nbhIndex].cRoads){
                    let roadNodes = cRoad.nodes
                    if(!mapRoadToNbh[nbhIndex].cRoads.includes(cRoad)){
                    adjazentList[roadNodes[0].id] = [];
                    adjazentList[roadNodes[roadNodes.length -1].id] = [];
                    }
                }

                for(let bRoad of network.nbhs[nbhIndex].bRoads){
                    let roadNodes = bRoad.nodes
                    if(!mapRoadToNbh[nbhIndex].bRoads.includes(bRoad)){
                    adjazentList[roadNodes[0].id].push(roadNodes[roadNodes.length -1].id)
                    adjazentList[roadNodes[roadNodes.length -1].id].push(roadNodes[0].id)
                    }
                        
                }

                for(let iRoad of network.nbhs[nbhIndex].iRoads){
                    let roadNodes = iRoad.nodes
                    if(!mapRoadToNbh[nbhIndex].iRoads.includes(iRoad)){
                        adjazentList[roadNodes[0].id].push(roadNodes[roadNodes.length -1].id)
                        adjazentList[roadNodes[roadNodes.length -1].id].push(roadNodes[0].id)
                    }
                }
                
                for(let cRoad of network.nbhs[nbhIndex].cRoads){
                    let roadNodes = cRoad.nodes
                    if(!mapRoadToNbh[nbhIndex].cRoads.includes(cRoad)){
                        adjazentList[roadNodes[0].id].push(roadNodes[roadNodes.length -1].id)
                        adjazentList[roadNodes[roadNodes.length -1].id].push(roadNodes[0].id)
                        }
                }

                if(!network.isWeaklyConnected(adjazentList)){
                    setActivePopUp("LinkDeleteError02")
                    return;
                }
                
                for(let nbhId in mapRoadToNbh){
                
                    for(let bRoad of mapRoadToNbh[nbhId].bRoads){
                        let sharedNbhs = network.getBRoadSharedNbhs(bRoad);
                        if(sharedNbhs.length === 2){
                            console.log("Fusion");
                            network.fusionNbhsOnRoad(sharedNbhs[0], sharedNbhs[1], bRoad);
                        }
                        if(network.nbhs[nbhId])
                            network.deleteRoad(bRoad, 'bRoad', network.nbhs[nbhId]);
                    }
                    for(let cRoad of mapRoadToNbh[nbhId].cRoads){
                        network.deleteRoad(cRoad, 'cRoad', network.nbhs[nbhId]);
                    }
                    for(let iRoad of mapRoadToNbh[nbhId].iRoads){
                        network.deleteRoad(iRoad, 'iRoad', network.nbhs[nbhId]);
                    }
                }
            }
        }
        console.log(network);
        setElementsSelected(null);
        onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
    }

    const handleInternalNet = () => {
        let nbhSelected = elementsSelected[0];
        if(!nbhSelected.isEmpty()){
        let bBox = nbhSelected.getInnerBoundaryBox();
        let minX = min(bBox, point => point[0]);
        let maxX = max(bBox, point => point[0]);
        let minY = min(bBox, point => point[1]);
        let maxY = max(bBox, point => point[1]);
        setMinNbhSize({w: maxX-minX, h: maxY-minY})
        }else{
            setMinNbhSize({w: 100, h: 100})
        }

        setNetworkCopy(network.copy())
        setActivePopUp("editNbh");
    } 

    const handleAddRoad = (type) => {
        if(elementsSelected){
            network.deselect(elementsSelected);
            setElementsSelected(null);
            onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));  
        }
        setRoadData({road: type, type: 0, direction: "both", length: 0})
        setNewRoad([])
        setDrawPointer(true);
    }

    const callAlgoFromServer = (url) =>{
        let jsonNet = network.toString('json-server');
        axios({
            method: 'POST',
            url: url,
            data: jsonNet
        }).then((res) => {
            setDataReturn(res.data);
            setIsLoading(false);})
          .catch((err) => {
              setIsLoading(false);
              setDataReturn(null);
            console.log(err);
          });
    } 

    const handleCancelAlgo = () => {
        if(isLoading){
            setIsLoading(false);
        }
        if(dataReturn){
            setDataReturn(null);
        }
        if(algorithm === "analysis"){
            if(typeof showRoadColors === 'object'){
                onChangeRoadColors(false);
            }
        }
        setAlgorithm(null);
    }

    const handleShowConnectedComponents = () => {
        let firstcolors = ["#8EBE69","#EABF03", "rgb(251, 86, 39)"]
        let colors = {}
        let index = 0;
        let color;
        for (let component of dataReturn[1][3]){
            if (component.length !== 0){
                if(index < 3){
                    color = firstcolors[index];
                    index++;
                }
                else{
                    let r,g,b;
                    r = Math.floor(Math.random() * 255)
                    g = Math.floor(Math.random() * 255)
                    b = Math.floor(Math.random() * 255)
                    color = 'rgb(' + r + "," + g + "," + b + ")"
                }
                for (let road of component){
                    colors[road] = color;
                }
    
            }
        }
        onChangeRoadColors(colors);
        handleCancelAlgo();
    }


    const handleAlgorithm = (algorithm) => {
        if(elementsSelected && algorithm === "FP"){
            network.deselect(elementsSelected);
            setElementsSelected(null);
            onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
        }else if(algorithm === 'analysis'){
            setIsLoading(true);
            callAlgoFromServer("/analysis/");
        }
        setAlgorithm(algorithm);      
    }


    useEffect(() => {
        const handleCanvasResize = () => {
            if(containerRef.current != null){
                setCanvasSize({
                    w: containerRef.current.clientWidth, 
                    h: containerRef.current.clientHeight
                });
            }
          }
          handleCanvasResize();
        window.addEventListener("resize", handleCanvasResize);
        return () => window.removeEventListener('resize', handleCanvasResize);
    }, [isRightPanelMin])


    //To make the topology none dinamic
    // useEffect(() => {

    // }, [canvasSize])
    

    return (
        <div onClick={handleClick}>
            <MainNavbar 
                isNavActive={isNavActive}
                contextMenu={contextMenu}
                onChangecontextMenu={setContextMenu}
                onChangeIsNavActive={setIsNavActive}
                onChangeView={onChangeView}
                onChangeOpenProject={handleOpenProject}
                onChangeActivePopUp={setActivePopUp}
                grid={grid}
                onChangeGrid={handleGrid}
                gridTick={gridTick}
                onChangeGridTick={onChangeGridTick}
                showRoadColors={showRoadColors}
                onChangeRoadColors={onChangeRoadColors}
                showOnlyIntersectionNodes={showOnlyIntersectionNodes}
                onChangeShowOnlyIntersectionNodes={onChangeShowOnlyIntersectionNodes}
                zoomIn={zoomIn}
                zoomOut={zoomOut}
                handleAlgorithm={handleAlgorithm}
            />

            <CanvasContainer 
                /*Container*/
                containerRef={containerRef} 
                isPanelMin={isRightPanelMin} 
                centerNetwork={centerNetwork}
                zoomIn={zoomIn}
                zoomOut={zoomOut}
                elementsSelected={elementsSelected}
                onChangeElementsSelected={handleTabElementsSelected}
                onChangeNetwork={onChangeNetwork}
                onChangeNewRoad={setNewRoad}
                drawPointer={drawPointer}
                onChangeDrawPointer={setDrawPointer}
                contextMenu={contextMenu}
                onChangeContextMenu={setContextMenu}
                handleDeleteRoad={handleDeleteRoad}
                handleImport={handleImport}
                handleDeleteInternalNet={handleDeleteInternalNet}
                handleInternalNet={handleInternalNet}
                handleAddRoad={handleAddRoad}
                algorithm={algorithm}
                pointTo={pointTo}
                onChangeFpStart={setFpStart}
                onChangeFpEnd={setFpEnd}
                fpStart={fpStart}
                fpEnd={fpEnd}
                onChangeRoadData={setRoadData}


                /*Canvas*/
                outerNodeRadius={outerNodeRadius}
                innerNodeRadius={innerNodeRadius}
                outerLineWidth={outerLineWidth}
                innerLineWidth={innerLineWidth}
                newRoad={newRoad}
                roadData={roadData}
                transform={zoomTransform}
                onChangeTransform={setZoomTransform}
                grid={grid}
                showRoadColors={showRoadColors}
                showOnlyIntersectionNodes={showOnlyIntersectionNodes}
                gridTick={gridTick/scale}
                network={network}
                canvasSize={canvasSize}
                devicePixelRatio={devicePixelRatio}
                globalScale={scale} 
                prevNetworkSize={prevNetworkSize}
                showFsp ={showFsp}
                showFfp ={showFfp}
                fsp={fsp}
                ffp={ffp}
            />

            <RightPanel
                algorithm={algorithm}
                onChangeDrawPointer={setDrawPointer}
                newRoad={newRoad}
                onChangeNewRoad={setNewRoad}
                roadData={roadData}
                onChangeRoadData={setRoadData}
                network={network}
                activeTab={activeTab}
                onChangeActiveTab={setActiveTab}
                isPanelMin={isRightPanelMin}
                onChangePanelMin={setIsRightPanelMin}
                onChangeNetwork={onChangeNetwork}
                showRoadColors={showRoadColors}
                elementsSelected={elementsSelected}
                onChangeActivePopUp={setActivePopUp}
                showOnlyIntersectionNodes={showOnlyIntersectionNodes}
                handleDeleteRoad={handleDeleteRoad}
                handleInternalNet={handleInternalNet}
                handleImport={handleImport}
                handleDeleteInternalNet={handleDeleteInternalNet}
                handleAddRoad={handleAddRoad}
                onChangeAlgorithm={setAlgorithm}
                onChangePointTo={setPointTo}
                fpStart={fpStart}
                fpEnd={fpEnd}
                onChangeFpStart={setFpStart}
                onChangeFpEnd={setFpEnd}
                roadLineWidth={outerLineWidth * scale}
                showFsp={showFsp}
                showFfp={showFfp}
                onChangeShowFsp={setShowFsp}
                onChangeShowFfp={setShowFfp}
                fsp={fsp}
                ffp={ffp}
                onChangeFsp={setFsp}
                onChangeFfp={setFfp}
            />
            <PopUp  display={activePopUp === "import"}
            nextBtn="Next" onNext={() => setActivePopUp(typeImport)} onPrev={handleCancel} >
                <div className="container-title"><strong>Import from ...</strong></div>
                <hr className="mt--2"></hr>
                <div className="mt-8 mb-4">
                    <label>
                        <input type="radio" value="OSM"  checked={typeImport === "OSM"} onChange={handleImportType}></input>
                        OpenStreetMap
                    </label>
                    <br></br>
                    <label>
                        <input type="radio" value="gr+co" className="mt-4 mb-4" checked={typeImport === "gr+co"} onChange={handleImportType}></input>
                        .gr + .co
                    </label>
                </div>
            </PopUp>

            <PopUp display={activePopUp === "OSM"}>
                <OsmImport
                    outerNodeRadius={outerNodeRadius}
                    innerNodeRadius={innerNodeRadius}
                    outerLineWidth={outerLineWidth}
                    innerLineWidth={innerLineWidth}
                    handleCancel={handleCancel}
                    onChangeView={setActivePopUp}
                    network={network}
                    onChangeNetwork={onChangeNetwork} 
                    onChangeElementsSelected={setElementsSelected} 
                    elementsSelected={elementsSelected}
                    globalScale={scale}
                /> 
            </PopUp>

            <PopUp  display={activePopUp === "gr+co"}
            nextBtn="Next" prevBtn={"Previous"} onNext={importGr} onPrev={() => setActivePopUp("import")}>
            <div className="container-title"><strong>Load files: ...</strong></div>
            <hr className="mt--2"></hr>
            <div className="wrapper-options">
            <div className="mt-8 mb-4">
                <div className="wrapper-options">
                            <label className="options-label mb-2"><strong>.gr</strong><hr></hr></label> 
                            <input type='file'  className="direction-reverse"  accept=".gr" onChange={handleOpenGrFile}/>
                </div>
              <div className="wrapper-options">
                        <label className="options-label mb-2"><strong>.co</strong><hr></hr></label> {/*If possible optional*/}  
                        <input type='file' className="direction-reverse" accept=".co" onChange={handleOpenCoFile}/>
                </div>
            </div></div>
            </PopUp>

            <PopUp display={activePopUp === "editNbh"}>
                <NbhEdit
                    title={"Edit Neighborhood"}
                    outerNodeRadius={outerNodeRadius}
                    innerNodeRadius={innerNodeRadius}
                    outerLineWidth={outerLineWidth}
                    innerLineWidth={innerLineWidth}
                    handleCancel={handleCancel}
                    network={networkCopy}
                    onChangeNetwork={setNetworkCopy}
                    nbhSelected={elementsSelected && elementsSelected[0]?.constructor.name === 'Nbh'? networkCopy?.nbhs[elementsSelected[0].id]: null}
                    globalScale={scale}
                    handlePrev={handleCancel}
                    minNbhSize={minNbhSize}
                    handleNext={handleEditNbh}
                    btn02={"Import"}
                    btn01={"Cancel"} />
            </PopUp>
            {handleFilesPopUps()}
            <PopUp  display={activePopUp === "LinkDeleteError01"} prevBtn="Ok" onPrev={handleCancel} >
                <div className="container-title errorText">Action not possible</div>
                <div className="mt-2 mb-4">
                The removal of the selected link(s) is not possible. <br />
                - Neighborhood backbone roads cannot be deleted as long as the neighborhoods aren't empty.
                </div>
            </PopUp>

            <PopUp  display={activePopUp === "LinkDeleteError02"} prevBtn="Ok" onPrev={handleCancel} >
                <div className="container-title errorText">Action not possible</div>
                <div className="mt-2 mb-4">
                The removal of the selected link(s) is not possible. <br />
                - It breaks down the network into various weakly components <br />
                </div>
            </PopUp>

            <PopUp  display={activePopUp === "FPError01"} prevBtn="Ok" onPrev={handleCancel} >
                <div className="container-title errorText">Action not possible</div>
                <div className="mt-2 mb-4">
                One or more nodes have not been selected<br />
                -Two nodes are needed, to perform the algorithm
                </div>
            </PopUp>
            <PopUp  display={activePopUp === "FPError02"} prevBtn="Ok" onPrev={handleCancel} >
                <div className="container-title errorText">Error</div>
                <div className="mt-2 mb-4">
                A connection could not be established, please try again later.<br />

                </div>
            </PopUp>

            <PopUp  display={activePopUp === "FPError03"} prevBtn="Ok" onPrev={handleCancel} >
                <div className="container-title errorText">Error</div>
                <div className="mt-2 mb-4">
                No path was found between the two given nodes.<br />

                </div>
            </PopUp>

            <PopUp display={algorithm === "analysis"} prevBtn="Ok" onPrev={handleCancelAlgo}>
            <div className="container-title">Network Analysis
            </div>
            <hr className="mt--2"></hr>
            <div className="popUpAnalysis m-auto">
                {isLoading? 
                    <><h2>Loading...</h2><ProgressBar /></>:
                    !dataReturn? 
                        "A connection could not be established, please try again later":
                        <>
                        <div className="popUpAnalysisSide">
                            <div className="section-title mb-2">Degree Distribution</div>
                            <Histogram dataList={dataReturn[0]}></Histogram>
                        </div>
                        <div className="popUpAnalysisSide">
                            <div className="section-title mb-1">Connectivity</div>
                            <div className="popUpConnectivity">
                                <table>
                                    <tbody className="table-connectivity">
                                        <tr>
                                            <td>
                                                <div className="circle">{dataReturn[1][0] ? <div className="icon valid"><strong>&#x2713;</strong></div> : <div className="icon invalid"><strong>&#x2717;</strong></div>}</div>
                                            </td>
                                            <td>
                                                Weakly&nbsp;Connected
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <div className="circle">{dataReturn[1][1] ? <div className="icon valid"><strong>&#x2713;</strong></div> :  <div className="icon invalid"><strong>&#x2717;</strong></div>}</div>
                                            </td>
                                            <td>
                                                Strongly&nbsp;Connected
                                            </td>
                                            {!dataReturn[1][1] && <td><strong>{dataReturn[1][2]}</strong> strongly connected components</td>}
                                        </tr>
                                    </tbody>
                                </table>
                                {!dataReturn[1][1] && <>
                                        <hr className="mt-2"></hr>
                                        <button onClick={handleShowConnectedComponents}className="mt-4 btn-connectivity">Show Components</button>
                                    </>}           
                            </div>
                            <div className="section-title mt-2 mb-1">Planar</div>
                            <table>
                                    <tbody className="table-connectivity">
                                        <tr>
                                            <td>
                                                <div className="circle">{dataReturn[2] ? <div className="icon valid"><strong>&#x2713;</strong></div> :  <div className="icon invalid"><strong>&#x2717;</strong></div>}</div>
                                            </td>
                                            <td>
                                                Planar
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                            <div className="section-title mt-2 mb-1">Diameter</div>
                            <table>
                                    <tbody className="table-connectivity">
                                        <tr>
                                            <td>
                                                <div className="circle" style={{border: "none"}}>&nbsp;</div>
                                            </td>
                                            <td>
                                            Diameter: {dataReturn[3]}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            
                                <div className="section-title mt-2 mb-1">Clustering coefficient</div>
                            <table>
                                    <tbody className="table-connectivity">
                                        <tr>
                                            <td>
                                                <div className="circle" style={{border: "none"}}>&nbsp;</div>
                                            </td>
                                            <td>
                                            Average clustering coefficient : {dataReturn[4]}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                        </div>
                    </>
                }
            </div>
            </PopUp>
        

        </div>
    );
}