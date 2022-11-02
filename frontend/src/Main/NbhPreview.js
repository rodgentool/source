import React, {useRef, useEffect, useMemo, useState} from 'react';
import { min, max} from "d3-array";
import { zoomIdentity } from  'd3-zoom';
import { scaleLinear } from "d3-scale";
import { polygonContains, polygonCentroid}  from 'd3-polygon';
import { drag }  from 'd3-drag';
import { zoom }  from 'd3-zoom';
import {select }  from 'd3-selection';
import { roundTo2 } from '../utilityFunctions/mathFunctions';
import { getInnerBoundaryBox } from '../utilityFunctions/osmFunctions';

export const calculateInitTransform = (nbh, globalScale, width, height) => {
    let nodes = nbh.getBNodes();
    let minX = min(nodes, n => n.x)
    let minY = min(nodes, n => n.y)
    let maxX = max(nodes, n => n.x)
    let maxY = max(nodes, n => n.y)
    
    const lambda = 20;
    let maxXScaled = (maxX-minX)/globalScale + lambda;
    let maxYScaled = (maxY-minY)/globalScale + lambda;
    let initialScale = 1;

    if (maxXScaled  > width){
        let scaleTo = width/maxXScaled;
        initialScale = scaleTo;
    }
    if(maxYScaled  > height){
        let scaleTo = height/maxYScaled;
        initialScale = initialScale > scaleTo? scaleTo : initialScale;
        }

    let margin = {
        x: (width-(maxXScaled-lambda)*initialScale)/2,
        y: (height-(maxYScaled-lambda)*initialScale)/2
    }
    return {k: initialScale, x: margin.x, y: margin.y}
}

export const NbhPreview = ({
    outerNodeRadius,
    innerNodeRadius,
    outerLineWidth,
    innerLineWidth,
    nbh,
    network,
    onChangeNetwork,
    roadTypes,
    globalScale,
    innerNetBBox,
    minMaxCoordOuterBBox,
    minMaxCoordInnerBBox,
    onChangeNbhSize,
    minNbhSize,
    onChangeInnerNetBBox,
    width,
    height
    }) => {
    const canvasNbhRef = useRef(null);
    const canvasInnerNetRef = useRef(null);
    const ratio = window.devicePixelRatio || 1;
    const scaleX = useMemo(() => scaleLinear().domain([minMaxCoordOuterBBox.minX, minMaxCoordOuterBBox.minX + globalScale]).range([0, 1]),[globalScale, minMaxCoordOuterBBox])
    const scaleY = useMemo(() => scaleLinear().domain([minMaxCoordOuterBBox.minY, minMaxCoordOuterBBox.minY + globalScale]).range([0, 1]),[globalScale, minMaxCoordOuterBBox])
    const [transform, setTransform] = useState(() => calculateInitTransform(nbh, globalScale, width, height));
    
    const myStyle = {
        width: width,
        height: height,
        position: "absolute"

    }

    useEffect(() => {
        const canvasNbh = canvasNbhRef.current;
        const ctxNbh =  canvasNbh.getContext('2d');
        canvasNbh.width = width  * ratio;
        canvasNbh.height = height  * ratio;
        ctxNbh.setTransform(ratio, 0, 0, ratio, 0, 0);

        const canvasInnerNet =  canvasInnerNetRef.current;
        const ctxInnerNet = canvasInnerNet.getContext('2d');
        canvasInnerNet.width = width  * ratio;
        canvasInnerNet.height = height  * ratio;
        ctxInnerNet.setTransform(ratio, 0, 0, ratio, 0, 0);
    }, [ratio, width, height])


    useEffect(() => {
        const drawNbhBackbone = (transform) => {
            const canvasNbh = canvasNbhRef.current;
            const ctxNbh =  canvasNbh.getContext('2d');
            ctxNbh.save();
            ctxNbh.clearRect(0, 0, canvasNbh.width, canvasNbh.height)
            ctxNbh.translate(transform.x, transform.y);
            ctxNbh.scale(transform.k, transform.k); 
            nbh.drawBackbone(ctxNbh, scaleX, scaleY, outerNodeRadius, innerNodeRadius, outerLineWidth);
            ctxNbh.restore();
        }

               
        const drawNbhInnerNet = (transform) => {
            if(innerNetBBox.coordinates){
                const canvasInnerNet = canvasInnerNetRef.current;
                const ctxInnerNet =  canvasInnerNet.getContext('2d');
                ctxInnerNet.save();
                ctxInnerNet.clearRect(0, 0, canvasInnerNet.width, canvasInnerNet.height)
                ctxInnerNet.translate(transform.x, transform.y);
                ctxInnerNet.scale(transform.k, transform.k); 
                nbh.drawInnerNet(innerNetBBox, ctxInnerNet, scaleX, scaleY, innerNodeRadius, innerLineWidth);
                ctxInnerNet.restore();
            }
        }

        const canvasNbh = canvasNbhRef.current;
        let transformd3 = zoomIdentity.translate(transform.x, transform.y).scale(transform.k);

        function dragsubject(event){
            let point = [scaleX.invert(transformd3.invertX(event.x)), scaleY.invert(transformd3.invertY(event.y))]
            let radiusWithoutScale = (outerNodeRadius+1)*globalScale
            let [node, ] = network.isPointANode(point, radiusWithoutScale, "oNode", [nbh]);
            if (node)
                return {x: event.x, y: event.y, node: node};
            if(innerNetBBox){
                if (polygonContains(innerNetBBox.coordinates, point)){
                    return {x: event.x, y: event.y};
                }
            }
        }

        function dragstarted(event) {
            if("node" in event.subject){
                for(let road of nbh.bRoads){
                    road.isSelected = true;
                }
                drawNbhBackbone(transform);
            } else{
                innerNetBBox.active = true;
                drawNbhInnerNet(transform)
                drawNbhBackbone(transform)
            }
        }
        
        function dragged(event) {
            if("node" in event.subject){
                let node = event.subject.node;
                let minXOBox =  minMaxCoordOuterBBox.minX;
                let maxXOBox =  minMaxCoordOuterBBox.maxX;
                let minYOBox =  minMaxCoordOuterBBox.minY;
                let maxYOBox =  minMaxCoordOuterBBox.maxY;
                //console.log( minXOBox, maxXOBox, minYOBox, maxYOBox)
                let newPos = {
                    x: scaleX.invert(transformd3.invertX(event.x)), 
                    y: scaleY.invert(transformd3.invertY(event.y))
                }

                let newScaleX, newScaleY;
                let bNodes = nbh.getBNodes();
                let polygon = [];
                for(let bNode of bNodes)
                    polygon.push([bNode.x, bNode.y])
                let polyCenter = polygonCentroid(polygon);
                //console.log(polyCenter);
                if(node.x > polyCenter[0]){
                    newScaleX = scaleLinear().domain([minXOBox, node.x]).range([minXOBox, newPos.x])
                } else{
                    newScaleX = scaleLinear().domain([node.x, maxXOBox]).range([newPos.x, maxXOBox])
                }
                
                if(node.y > polyCenter[1]){
                    newScaleY = scaleLinear().domain([minYOBox, node.y]).range([minYOBox, newPos.y])
                } else{
                    newScaleY = scaleLinear().domain([node.y, maxYOBox]).range([newPos.y, maxYOBox])
                }

                let newOuterPolygon = [];
                for(let nbhNode of bNodes){
                    //console.log(nbhNode);
                    newOuterPolygon.push([newScaleX(nbhNode.x), newScaleY(nbhNode.y)])
                };

                // for(let point of innerNetBBox){
                //     if(!polygonContains(newOuterPolygon, point))
                //         return false;
                // }

                let oNodes = nbh.getONodes();
                for(let i = 0; i < oNodes.length; i++){
                    let nbhNode = oNodes[i];
                    nbhNode.x = newScaleX(nbhNode.x);
                    nbhNode.y = newScaleY(nbhNode.y);
                }

                let size = network.calculateNbhSize(nbh);
                document.getElementById('outerSizeW').value = size.w;
                document.getElementById('outerSizeH').value = size.h;
                if(innerNetBBox)
                    drawNbhInnerNet(transform);
                drawNbhBackbone(transform);  
         
                
            }else{
                //let diffX = scaleX.invert(event.x - event.subject.x)
                let diffX = scaleX.invert(transformd3.invertX(event.x)) - scaleX.invert(transformd3.invertX(event.subject.x))
                let diffY = scaleY.invert(transformd3.invertY(event.y)) - scaleY.invert(transformd3.invertY(event.subject.y))
                
                // for(let point of innerNetBBox.coordinates){
                //     if(!polygonContains(bNodes, [point[0] + diffX, point[1] + diffY]))
                //         return false;
                // }
            
                let iNodes = nbh.getINodes(false);
                for (let node of iNodes){
                    node.x = node.x + diffX;
                    node.y = node.y + diffY;
                }

                for(let coord of innerNetBBox.coordinates){
                    coord[0] =  coord[0] + diffX;
                    coord[1] =  coord[1] + diffY;
                }
                console.log(innerNetBBox);
                
                
                event.subject.x = event.x;
                event.subject.y = event.y;
                document.getElementById('innNetPosX').value = roundTo2(minMaxCoordInnerBBox.minX-minMaxCoordOuterBBox.minX);
                document.getElementById('innNetPosY').value = roundTo2(minMaxCoordInnerBBox.minY-minMaxCoordOuterBBox.minY);
                drawNbhInnerNet(transform);
                drawNbhBackbone(transform);  
            }
            
        }
        
          // When ending the drag, mark the subject as inactive again.
          function dragended(event) {
            setTransform(calculateInitTransform(nbh, globalScale, width, height));
            if("node" in event.subject){
                for(let road of nbh.bRoads){
                     road.isSelected = false;
                }
                
                drawNbhBackbone(transform)
                onChangeNbhSize(network.calculateNbhSize(nbh));
                
            }else{
                innerNetBBox.active = false;
                drawNbhInnerNet(transform);
                drawNbhBackbone(transform);
                if(onChangeInnerNetBBox?.coordinates)
                    onChangeInnerNetBBox([...onChangeInnerNetBBox.coordinates]);
            }

            onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));

          }
        
        let drag_ =  drag()
              .subject(dragsubject)
              .on("start", dragstarted)
              .on("drag", dragged)
              .on("end", dragended);
        
        select(canvasNbh).call(drag_);

        const zooming = (event) => {
            //console.log("Zooming")
            transformd3 = calculateInitTransform(nbh, globalScale, width, height);
            if (JSON.stringify(transformd3) !== JSON.stringify(transform)){
                setTransform(transformd3);
            }
            if(innerNetBBox){drawNbhInnerNet(transform);}
            drawNbhBackbone(transform);

        }
    
        const zoomed = (event) => {
            transformd3 = event.transform;
            if (JSON.stringify(transformd3) !== JSON.stringify(transform)){
                //console.log("Zoomed")
                setTransform({k: transformd3.k, x: transformd3.x, y: transformd3.y});
            }
        }
    
        const zoom_ = zoom()
            .scaleExtent([0.01, 50])
            .on("zoom", zooming)
            .on("end", zoomed)


        select(canvasNbh)
            .call(zoom_)
            .call(zoom_.transform, transformd3);


        return () => select(canvasNbh).on('.drag', null).on('.zoom', null);
    
    }, [network, ratio, roadTypes, scaleX, scaleY, transform, globalScale, height, innerLineWidth, innerNetBBox, innerNodeRadius, minMaxCoordInnerBBox, minMaxCoordOuterBBox, nbh, onChangeInnerNetBBox, onChangeNbhSize, onChangeNetwork, outerLineWidth, outerNodeRadius, width])


    return(
        <>
        <canvas ref={canvasInnerNetRef} style={myStyle}/>
        <canvas ref={canvasNbhRef} style={myStyle}/>
        </>

    );
}
