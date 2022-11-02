import { useState } from "react";
import { NbhPreview } from "./NbhPreview";
import { FormValidation } from "../Components/FormValidation";
import {polygonContains} from "d3-polygon";
import {min, max} from "d3";
import { scaleLinear } from "d3-scale";
import { interpolateRound } from "d3-interpolate";
import { roundTo2 } from "../utilityFunctions/mathFunctions";

const getMinMaxCoord = (coord) => {
    let minX = min(coord, coord => coord[0])
    let minY = min(coord, coord => coord[1])
    let maxX = max(coord, coord => coord[0])
    let maxY = max(coord, coord => coord[1])
    return{minX: minX, maxX: maxX, minY: minY, maxY: maxY}
}

export const NbhEdit = ({
    title,
    outerNodeRadius,
    innerNodeRadius,
    outerLineWidth,
    innerLineWidth,
    handleCancel,
    network,
    onChangeNetwork,
    nbhSelected,
    globalScale,
    roadTypes,
    handlePrev,
    handleNext,
    btn01,
    btn02,
}) => {
    const [innerNetBBox, setInnerNetBBox] = useState(() =>  nbhSelected.getInnerBoundaryBox());
    const [nbhSize, setNbhSize] = useState(() => network.calculateNbhSize(nbhSelected));
    const innerNetDragBoundaries =  nbhSelected.getDragBoundaries(innerNetBBox);
    const minMaxCoordInnerBBox = innerNetBBox? getMinMaxCoord(innerNetBBox): null;
    const minMaxCoordOuterBBox = nbhSelected.getMinMaxCoord(nbhSelected.getBNodes());
    const nbhIsEmpty = nbhSelected.isEmpty();
    const minNbhSize = {w: nbhIsEmpty? 50:  minMaxCoordInnerBBox.maxX - minMaxCoordInnerBBox.minX, h: nbhIsEmpty? 50: minMaxCoordInnerBBox.maxY - minMaxCoordInnerBBox.minY}
    const width = 334;
    const height= 501;

    const { handleSubmit, handleChange, data, errors} = FormValidation({
        validations: {
            connections: {
                custom: {
                isValid: (value) => {
                    let sum = value.reduce((a, b) => a + b, 0);
                    if(sum > 0 || !innerNetBBox)
                        return true;
                    return false;
                },
                message: "There must be at least one connection to the backbone",
                }
            }
        },
        initialValues:{
            connections : network.checkConectionsToNbh(nbhSelected)
        },

        onSubmit: () => handleNext(),
      });

    const displayBorders = () => {
        const tableElements = []
        const iNodesNumber = nbhSelected.getINodes().length;
        let sidesNum = data.connections.length;
        let names = [];
        if(sidesNum === 4){
                names = ["West", "South", "East", "North"];
        }else {
            for(let i = 0; i < sidesNum; i++)
                names.push("Side " + (i+1));
        }
 
        for(let i = 0; i < data.connections.length; i++){

                tableElements.push(
                <tr key={names[i]}>
                    <td>{names[i]}</td>
                    <td><input className={errors.connections? 'options-input errorInput' : 'options-input'}type='number' min="0" disabled={nbhIsEmpty} max={iNodesNumber} value={nbhIsEmpty? "" : data.connections[i]} onChange={(e) => handleConnections(e, i)}></input></td>
                </tr>)   
            }
    return tableElements;
    }

    //OK
    const handleInnerNetPosX = (e) => {
        if (e.target.value < 0)
            e.target.value = 0;   
        let minXInnerBox = minMaxCoordInnerBBox.minX;
        let minXOuterBox = minMaxCoordOuterBBox.minX;
        let prevDistance = minXInnerBox - minXOuterBox;
        let diffX =  e.target.value - prevDistance;
        let newInnerBox = [];
        let isInside = true;
        let outerNetBBox = [];
        let bNodes = nbhSelected.getBNodes();
        for(let bNode of bNodes){
            outerNetBBox.push([bNode.x, bNode.y])
        }
        for (let i = 0; i < innerNetBBox.length; i++){
            let point = innerNetBBox[i];
            if(!polygonContains(outerNetBBox, [point[0] + diffX, point[1]]))
                isInside = false;
            newInnerBox.push([point[0] + diffX, point[1]]);
        }
        if(isInside){
            let iNodes = nbhSelected.getINodes(false);
            for (let iNode of iNodes){
                iNode.x = iNode.x + diffX;
            }
            setInnerNetBBox(newInnerBox);
            onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
        }
    }


    const handleInnerNetPosY = (e) => {
        if (e.target.value < 0)
            e.target.value = 0;   
        let minYInnerBox = minMaxCoordInnerBBox.minY
        let minYOuterBox = minMaxCoordOuterBBox.minY
        let prevDistance = minYInnerBox - minYOuterBox;
        let diffY = e.target.value - prevDistance;
        let newInnerBox = [];
        let isInside = true;
        let outerNetBBox = [];
        let bNodes = nbhSelected.getBNodes();
        for(let bNode of bNodes){
            outerNetBBox.push([bNode.x, bNode.y])
        }
        for (let i = 0; i < innerNetBBox.length; i++){
            let point = innerNetBBox[i];
            if(!polygonContains(outerNetBBox, [point[0], point[1] + diffY]))
                isInside = false;
            newInnerBox.push([point[0], point[1] + diffY]);
        }
        console.log(newInnerBox, outerNetBBox )
        if(isInside){
            let iNodes = nbhSelected.getINodes(false);
            for (let iNode of iNodes){
                iNode.y = iNode.y + diffY;
            }
            setInnerNetBBox(newInnerBox);
            onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
        }
    }

    //HERE
    const handleConnections = (e, sideId) => {
  
        if (e.target.value < 0){
            e.target.value = 0
        } 
        if (e.target.value === ''){ 
            e.target.value = 0;
        } 

        let value = parseInt(e.target.value);
        let actual = data.connections[sideId];
        let num = value - actual;
        let side = nbhSelected.getSidePoints(nbhSelected.getbRoadsByPolySide(), sideId);
        if(num > 0) {
            network.addNbhConnectionsfromClosestNodeToFurther(nbhSelected, side, num);
            onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
        } else if(num < 0){
            network.removeNbhConnectionsfromFurtherNodeToClosest(nbhSelected, side, num);
            onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
        }
        
        handleChange('connections', network.checkConectionsToNbh(nbhSelected));
    } 

    //Ok
    const handleNbhSizeW = (e) => {
            if (e.target.value < (minMaxCoordInnerBBox.maxX-minMaxCoordOuterBBox.minX)){
                e.target.value = minMaxCoordInnerBBox.maxX-minMaxCoordOuterBBox.minX;
            } 

            let diffX = e.target.value - minMaxCoordOuterBBox.maxX;
            console.log(minMaxCoordOuterBBox, diffX);
            let scaleX = scaleLinear().domain([minMaxCoordOuterBBox.minX, minMaxCoordOuterBBox.maxX]).range([minMaxCoordOuterBBox.minX, minMaxCoordOuterBBox.maxX  + diffX]).interpolate(interpolateRound);
            let oNodes = nbhSelected.getONodes();
            for(let oNode of oNodes){
                oNode.x = scaleX(oNode.x);
            }
            onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
            setNbhSize({w: e.target.value, h: nbhSize.h});
    }

    //OK
    const handleNbhSizeH = (e) => {
        if (e.target.value < (minMaxCoordInnerBBox.maxY-minMaxCoordOuterBBox.minY)){
            e.target.value = minMaxCoordInnerBBox.maxY-minMaxCoordOuterBBox.minY;
        } 

        let diffY = e.target.value - minMaxCoordOuterBBox.maxY;
        console.log(minMaxCoordOuterBBox, diffY);
        let scaleY = scaleLinear().domain([minMaxCoordOuterBBox.minY, minMaxCoordOuterBBox.maxY]).range([minMaxCoordOuterBBox.minY, minMaxCoordOuterBBox.maxY  + diffY]).interpolate(interpolateRound);
        let oNodes = nbhSelected.getONodes();
        for(let oNode of oNodes){
            oNode.y = scaleY(oNode.y);
        }
        onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
        setNbhSize({w: nbhSize.w, h: e.target.value});
}

    return(<>
        <div className="map_container">
        <div className="container-title">{title}</div>
        <div className="exit" onClick={handleCancel}>X</div>
        <div className="cont-flexbox">
        <div className="flex-element">
            <div className="cont-with-title">
                <div className="container-options">
                    <strong>Neighborhood</strong><br />&nbsp;<br />
                    Size (meters): <br/>
                    <div className="wrapper-options">
                        <div className="grid-nb-num">
                            <label>
                                <span>W: </span> 
                                <input id="outerSizeW" className="options-input" type='number' step="5" min={minNbhSize.w} value={nbhSize.w} onChange={handleNbhSizeW}></input>
                            </label>
                        </div>
                        x
                        <div className="grid-nb-num">
                            <label>
                                <span>H: </span> 
                                <input id="outerSizeH" className="options-input"  type='number' step="5" min={minNbhSize.h} defaultValue={nbhSize.h} onChange={handleNbhSizeH}></input>
                            </label>
                    </div>
                    </div>
                    <hr />
                
                <strong>Inner Network</strong><br />&nbsp;<br />
                Position (meters): <br />
                <div className="wrapper-options">
                        <div className="grid-nb-num">
                            <label>
                                <span>X: </span> 
                                <input id="innNetPosX" className="options-input" disabled={nbhIsEmpty} type='number' step="5" min={nbhIsEmpty? "" :innerNetDragBoundaries.left} max={nbhIsEmpty? "" :innerNetDragBoundaries.right} value={nbhIsEmpty? '': roundTo2(minMaxCoordInnerBBox.minX - minMaxCoordOuterBBox.minX)} onChange={handleInnerNetPosX}></input>
                            </label>
                        </div>
                        
                        <div className="grid-nb-num">
                            <label>
                                <span>Y: </span> 
                                <input id="innNetPosY" className="options-input"  disabled={nbhIsEmpty} type='number' step="5" min={nbhIsEmpty? "" : innerNetDragBoundaries.top} max={nbhIsEmpty? "" : innerNetDragBoundaries.bottom} value={nbhIsEmpty? '': roundTo2(minMaxCoordInnerBBox.minY - minMaxCoordOuterBBox.minY)} onChange={handleInnerNetPosY}></input>
                            </label>
                    </div>
                    </div>

                    Connections to the backbone: 
                    <div className="mt-0 mb-1"><small >(k-closest nodes)</small></div>
                    {errors.connections && <p className="errorText"><small>{errors.connections}</small></p>}
                    <table className="tablePanel">
                        <tbody>
                            {displayBorders()}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="section-title cont-title">Options</div>
        </div>
        <div className="flex-element">
        <div className="cont-with-title">
            <NbhPreview 
                innerNetBBox={{coordinates: innerNetBBox, active: false}}
                outerNodeRadius={outerNodeRadius}
                innerNodeRadius={innerNodeRadius}
                outerLineWidth={outerLineWidth}
                innerLineWidth={innerLineWidth}
                onChangeInnerNetBBox={setInnerNetBBox}
                minMaxCoordOuterBBox={minMaxCoordOuterBBox}
                minMaxCoordInnerBBox={minMaxCoordInnerBBox}
                nbh={nbhSelected}
                globalScale={globalScale}
                network={network}
                onChangeNetwork={onChangeNetwork}
                roadTypes={roadTypes}
                onChangeNbhSize={setNbhSize}
                minNbhSize={minNbhSize}
                width = {width}
                height= {height}
            />
            </div>
        </div>
        </div>
    </div>
    <button className="btn btn-newProject" type="button" onClick={handleSubmit}>
        {btn02}
    </button>
    <button className="btn btn-newProject" type="button" onClick={handlePrev}>
        {btn01}
    </button>
    </>
    );
}