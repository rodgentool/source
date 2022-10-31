import { useMemo, useState} from 'react';
import { Canvas } from './Canvas'
import {DropdownMenu, DropdownItem} from '../Components/Navbar';
import { zoomIdentity } from  'd3-zoom';
import { scaleLinear } from "d3-scale";
import { distanceBetween2Points } from "../utilityFunctions/mathFunctions";



export const CanvasContainer = ({
    containerRef,
    isPanelMin,
    centerNetwork,
    zoomIn,
    zoomOut,
    elementsSelected,
    onChangeElementsSelected,
    onChangeNetwork,
    onChangeNewRoad,
    drawPointer,
    onChangeDrawPointer,
    contextMenu,
    onChangeContextMenu,
    handleDeleteRoad,
    handleImport,
    handleDeleteInternalNet,
    handleInternalNet,
    handleAddRoad,
    newRoad,
    roadData,
    onChangeRoadData,
    transform,
    onChangeTransform,
    grid,
    showRoadColors,
    showOnlyIntersectionNodes,
    gridTick,
    network,
    canvasSize,
    devicePixelRatio,
    globalScale,
    prevNetworkSize,
    roadTypes,
    outerNodeRadius,
    innerNodeRadius,
    outerLineWidth,
    innerLineWidth,
    arrowSize,
    algorithm,
    pointTo,
    onChangeFpStart,
    onChangeFpEnd,
    fpStart,
    fpEnd,
    showFsp,
    showFfp,
    fsp,
    ffp,

    }) => 
    {
    const netScale = useMemo(() => scaleLinear().domain([0, globalScale]).range([0, 1]), [globalScale])
    const [mousePosition, setMousePosition] = useState({top: 0, left: 0})


    const handleClick = (event) => {
        let windowMargins = {left: 9, top: 91}
        let transformd3 = zoomIdentity.translate(transform.x, transform.y).scale(transform.k);

        let point = [netScale.invert(transformd3.invertX(event.clientX-windowMargins.left)), netScale.invert(transformd3.invertY(event.clientY-windowMargins.top))]
        let outerRadiusWithoutScale = netScale.invert(outerNodeRadius);

        if(algorithm){
            if(algorithm === "FP"){
                if(pointTo === "start" || pointTo === "end"){
                    let [node, ] =  network.isPointANode(point, outerRadiusWithoutScale);
                    if(node && pointTo === "start"){
                        if(fpStart){
                            fpStart.isSelected = false;
                        }
                        node.isSelected = true;
                        onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
                        onChangeFpStart(node)
                    }
                    else if(node && pointTo === "end"){
                        if(fpEnd){
                            fpEnd.isSelected = false;
                        }
                        node.isSelected = true;
                        onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
                        onChangeFpEnd(node)
                    }
                } 
            }
        //OK  
        }else if(!roadData){
            if (elementsSelected && !event.shiftKey){
                if(elementsSelected[0]?.hasOwnProperty('bRoads')){
                    for (let i = 0; i < elementsSelected.length; i++){
                        let nbh = elementsSelected[i];
                        for (let road of nbh.bRoads)
                            road.isSelected = false;
                    }
                } else if (elementsSelected[0]?.hasOwnProperty('direction')){
                    for (let i = 0; i < elementsSelected.length; i++) { 
                        let road = elementsSelected[i];
                        road.isSelected = false; 
                    }
                }
                elementsSelected = null;
            }
            let oLineWidth = netScale.invert(outerLineWidth);
            let nbh = network.nbhContainingPoint(point, oLineWidth);
            if (nbh){
                for(let road of nbh.bRoads){
                    if (road.type && road.containsPoint(point, oLineWidth)){
                        if (!elementsSelected){
                            console.log("1");
                            road.isSelected = true;
                            onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
                            onChangeElementsSelected([road]);
                            return;
                        }else if(elementsSelected[0]?.hasOwnProperty('direction')){
                            road.isSelected = !road.isSelected;
                            onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
                            if(!elementsSelected.includes(road)){
                                elementsSelected.push(road)
                            }else{
                                let index = elementsSelected.indexOf(road);
                                elementsSelected.splice(index, 1);
                                if (elementsSelected.length === 0){
                                    onChangeElementsSelected(null); 
                                    return;
                                }            
                            }
                            onChangeElementsSelected([...elementsSelected]);
                            return;
                        } 
                    }
                }
                let innerRoads = nbh.getIRoads().concat(nbh.getCRoads());
                let iLineWidth = netScale.invert(innerLineWidth);
                for(let road of innerRoads){
                        if (road.containsPoint(point, iLineWidth)){
                            if (!elementsSelected){
                                road.isSelected = true;
                                onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
                                onChangeElementsSelected([road]);
                                return;
                            }else if(elementsSelected[0]?.hasOwnProperty('direction')){
                                road.isSelected = !road.isSelected;
                                onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
                                if(!elementsSelected.includes(road)){
                                    elementsSelected.push(road)
                                }else{
                                    let index = elementsSelected.indexOf(road);
                                    elementsSelected.splice(index, 1);
                                    if (elementsSelected.length === 0){
                                        onChangeElementsSelected(null); 
                                        return;
                                    }            
                                }
                                onChangeElementsSelected([...elementsSelected]);
                                return;
                            } 
                    }
                }
                if(!elementsSelected){
                    for (let road of nbh.bRoads){
                        road.isSelected = true;
                    }
                    onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
                    onChangeElementsSelected([nbh]);
                    return;

                } else if (elementsSelected[0]?.hasOwnProperty('bRoads')){
                    for(let nbh_ of elementsSelected){
                        for (let road of nbh_.bRoads)
                            road.isSelected = false;
                    }
                    if(!elementsSelected.includes(nbh)){
                        elementsSelected.push(nbh)
                    }else{
                        let index = elementsSelected.indexOf(nbh);
                        elementsSelected.splice(index, 1);
                        if (elementsSelected.length === 0){
                            onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
                            onChangeElementsSelected(null); 
                            return;
                        }
                    }
                    for(let nbh_ of elementsSelected){
                        console.log("4")
                        for (let road of nbh_.bRoads)
                            road.isSelected = true;
                    }
                    onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
                    onChangeElementsSelected([...elementsSelected])
                    return;
                }
            }
            if(!event.shiftKey){
                onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
                onChangeElementsSelected(null);
            }        
        }else{
            let roadLength = newRoad.length;
            if(!drawPointer && !event.altKey){
                return;
            }
            if(event.altKey && roadLength > 0){
                if(roadLength > 1){
                    //console.log(roadData.length, newRoad)
                    roadData.length -= distanceBetween2Points(newRoad[roadLength-2].point, newRoad[roadLength-1].point);
                    onChangeRoadData({...roadData});
                }
                newRoad.pop();
                onChangeNewRoad([...newRoad]);
                if(!drawPointer){
                    onChangeDrawPointer(true);
                }
                return;
            }

            let setPoint = false;
            let newPoint = {nbh: null, point: point, isIntersection: false, type: "", id: null}

            // iterates through the neighborhoods, to determine in which neighborhood the click was made
            for(let nbhId in network.nbhs){
                let nbh = network.nbhs[nbhId];
                if(nbh.containsPoint(point, netScale.invert(outerLineWidth))){
                    setPoint = true;
                    newPoint.nbh = nbh;
                    break;
                } 
            }
            
            if(roadData.road === "bRoad"){
                setPoint = true;
            }

            if(!setPoint){console.log("PopUp: The node must belong to a neighborhood"); return;}
            
            if(roadLength > 0){
                let distance = distanceBetween2Points(newRoad[roadLength-1].point, point)
                if (distance < outerRadiusWithoutScale){
                    console.log("PopUp: This Point already exist")
                    return;
                }
            }

            let [node, type] =  network.isPointANode(point, outerRadiusWithoutScale);

            if(node){
                newPoint.point = [node.x, node.y];
                newPoint.type = type;
                newPoint.id = node.id;
                newPoint.nbh = newPoint.nbh? newPoint.nbh : network.getNbhOfBNode(node);
            }

            if(roadLength === 0 || !event.shiftKey){
                newPoint.isIntersection = true;
                if(roadLength  > 0){
                    onChangeDrawPointer(false);
                }
            } 

            newRoad.push(newPoint);
            if(roadLength > 0){
                roadData.length += distanceBetween2Points(newRoad[roadLength-1].point, newPoint.point);
                onChangeRoadData({...roadData});
            }
            onChangeNewRoad([...newRoad]); 
        }
    }


    const handleContextMenu = (event) => {
        if(!algorithm){
            event.preventDefault();
            setMousePosition({top: event.clientY, left: event.clientX})
            if(!roadData){
                if(elementsSelected){
                    if(elementsSelected.key === "nbhs"){
                        onChangeContextMenu(1);
                    }else{
                        onChangeContextMenu(2);
                    }
                }else{
                    onChangeContextMenu(3);
                }
            }
        }
    }


    return(
        <>
        <div className={`container-mainCanvas ${isPanelMin? "container-mainCanvas-full-width" : ""} ${drawPointer? "drawCursor" : ""}`}  ref={containerRef} onClick={handleClick} onContextMenu={handleContextMenu}>
            <Canvas
                netScale={netScale}
                newRoad={newRoad}
                roadData={roadData}
                transform={transform}
                onChangeTransform={onChangeTransform}
                grid={grid}
                roadColors={showRoadColors}
                intersectionNodes={showOnlyIntersectionNodes}
                gridTick={gridTick}
                network={network}
                canvasSize={canvasSize}
                devicePixelRatio={devicePixelRatio}
                globalScale={globalScale} 
                prevNetworkSize={prevNetworkSize}
                roadTypes={roadTypes}
                outerNodeRadius={outerNodeRadius}
                innerNodeRadius={innerNodeRadius}
                outerLineWidth={outerLineWidth}
                innerLineWidth={innerLineWidth}
                arrowSize={arrowSize}
                showFsp ={showFsp}
                showFfp ={showFfp}
                fsp={fsp}
                ffp={ffp}
            />
            <button className="zoom-btn center-btn" onClick={centerNetwork}>&#8982;</button>
            <div className="zoom-btns">
                <button className="zoom-btn" onClick={(e) => {e.stopPropagation(); zoomIn();}}>+</button>
                <button className="zoom-btn mt--1" onClick={(e) =>{e.stopPropagation(); zoomOut();}}>-</button> 
            </div>
        </div>
        { 
            contextMenu === 1 && 
            <DropdownMenu position={mousePosition}>
                <DropdownItem onClick={handleDeleteInternalNet}>Empty</DropdownItem>
                <DropdownItem onClick={handleInternalNet}>Modify ...</DropdownItem>
                <DropdownItem onClick={handleImport}>Import ...</DropdownItem>
            </DropdownMenu>
        }
        { 
            contextMenu === 2 && 
            <DropdownMenu  position={mousePosition}>
            <DropdownItem onClick={handleDeleteRoad}>Delete</DropdownItem>
            </DropdownMenu>
        }
        { 
            contextMenu === 3 && 
            <DropdownMenu  position={mousePosition}>
            <DropdownItem onClick={handleAddRoad}>Add Road</DropdownItem>
            </DropdownMenu>
        }
        </>
    );
}