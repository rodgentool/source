import React, {useRef, useEffect, useCallback, useState } from 'react';
import {calculateStartMargins, drawGridAxes, drawRoad} from '../utilityFunctions/canvasFunctions'
import { zoomIdentity, zoom } from  'd3-zoom'
import { select } from  'd3-selection'


export const Canvas = ({
    transform, 
    netScale,
    onChangeTransform,
    grid,
    gridTick,
    roadColors,
    network, 
    canvasSize,
    globalScale,
    devicePixelRatio,
    prevNetworkSize,
    roadTypes,
    intersectionNodes, 
    newRoad,
    roadData,
    outerNodeRadius,
    innerNodeRadius,
    outerLineWidth,
    innerLineWidth,
    arrowSize,
    showFsp,
    showFfp,
    fsp,
    ffp

 }) => {
    const canvasNetRef = useRef(null);
    const canvasGridRef = useRef(null);

    const [isNetInit, setIsNetInit] = useState(false);

    const drawCanvasNet = useCallback((transform) => {
  
            const canvasNet = canvasNetRef.current;
            const ctxNet =  canvasNet.getContext('2d');
            ctxNet.save();
            ctxNet.clearRect(0, 0, canvasNet.width, canvasNet.height)

            ctxNet.translate(transform.x, transform.y);
            ctxNet.scale(transform.k, transform.k);
            
            if(showFsp && fsp){
                for(let roadId of fsp)
                    network.roads[roadId].draw(ctxNet, netScale, netScale, outerLineWidth, innerNodeRadius, "rgb(100, 100, 100)", false, "rgba(1,78,152, 0.6)", outerLineWidth*2, outerLineWidth*0.5, true)
            }
            if(showFfp && ffp){                
                for(let roadId of ffp)
                    network.roads[roadId].draw(ctxNet, netScale, netScale, outerLineWidth, innerNodeRadius, "rgb(100, 100, 100)", false, "rgba(242, 146, 3, 0.6)", outerLineWidth*2, outerLineWidth*0.5, true)
            }

            network.draw(ctxNet, netScale, netScale, outerNodeRadius, innerNodeRadius, outerLineWidth, innerLineWidth, roadColors, false, intersectionNodes);
            
            if(newRoad){
                drawRoad(ctxNet, netScale, netScale, newRoad, outerNodeRadius, innerNodeRadius, arrowSize-1, innerLineWidth, roadColors, roadTypes, roadData.type, roadData.direction);
            }
            ctxNet.restore();
    }, [network, intersectionNodes, netScale, roadColors, roadTypes, newRoad, roadData, ffp, fsp, showFfp, showFsp, arrowSize, innerLineWidth, innerNodeRadius, outerLineWidth, outerNodeRadius])


    const drawCanvasGrid = useCallback((transform) => {
        const canvasGrid =  canvasGridRef.current;
        const ctxGrid =  canvasGrid.getContext('2d');
        ctxGrid.save();
        ctxGrid.clearRect(0, 0, canvasGrid.width, canvasGrid.height)
        if(grid){
            drawGridAxes(ctxGrid, {w: canvasGrid.width/devicePixelRatio, h:canvasGrid.height/devicePixelRatio}, transform.k, gridTick)
        }
        ctxGrid.restore();
    }, [grid, gridTick, devicePixelRatio])


    useEffect(() => {
        if (canvasSize.w !==0 && canvasSize.h !==0 ){
            const canvasNet = canvasNetRef.current;
            const canvasGrid =  canvasGridRef.current;
            const ctxNet =  canvasNet.getContext('2d');
            const ctxGrid =  canvasGrid.getContext('2d');
            const canvasPrevWidth = canvasNet.width;
            const canvasPrevHeight = canvasNet.height;
            canvasNet.width = canvasSize.w * devicePixelRatio;
            canvasNet.height = canvasSize.h  * devicePixelRatio;
            canvasGrid.width = canvasSize.w * devicePixelRatio;
            canvasGrid.height = canvasSize.h * devicePixelRatio;
            ctxNet.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
            ctxGrid.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
            const nodes = Object.values(network.nodes);
            if (nodes.length !== 0){
                if (!isNetInit){
                    let startTransform = calculateStartMargins(canvasSize, nodes, globalScale, transform.k);
                    onChangeTransform(startTransform)
                    setIsNetInit(true); 
                } else {
                    let margin = {
                        x: (canvasNet.width - canvasPrevWidth)/(2*devicePixelRatio),
                        y: (canvasNet.height - canvasPrevHeight)/(2*devicePixelRatio),
                    }
                    
                    onChangeTransform({k: transform.k, x: transform.x + margin.x, y: transform.y + margin.y})
                    
                }
            }

        }
    }, [canvasSize])


    useEffect(()=> {

        if (canvasSize.w !==0){
            const canvasNet = canvasNetRef.current;
            let transformd3 = zoomIdentity.translate(transform.x, transform.y).scale(transform.k);

            const zooming = (event) => {
                transformd3 = event.transform;
                drawCanvasNet(transformd3);
                drawCanvasGrid(transformd3);  
            }

            const zoomed = (event) => {
                transformd3 = event.transform;
                if (JSON.stringify(transformd3) !== JSON.stringify(transform)){
                    onChangeTransform({k: transformd3.k, x: transformd3.x, y: transformd3.y});
                }

            }

            const zoom_ = zoom()
                .scaleExtent([0.01, 50])
                .on("zoom", zooming)
                .on("end", zoomed)

    
            select(canvasNet)
                .call(zoom_)
                .call(zoom_.transform, transformd3);

            return () => select(canvasNet).on('.zoom', null);
        }
 
    }, [transform, onChangeTransform, drawCanvasNet, drawCanvasGrid, canvasSize.w]); 


    useEffect(() => {

        if(prevNetworkSize !== network.size){
            let margin = {
                x: ((prevNetworkSize.w - network.size.w)/globalScale)*transform.k/2,
                y: ((prevNetworkSize.h - network.size.h)/globalScale)*transform.k/2,
            }
            onChangeTransform({k: transform.k, x: transform.x + margin.x, y: transform.y + margin.y})

        }

}, [prevNetworkSize])

    useEffect(() => {

        if (canvasSize.w !==0){
            //console.log('draw');

            drawCanvasNet(transform);
        }
    }, [network, roadColors, intersectionNodes, roadTypes, newRoad, canvasSize.w, drawCanvasNet, transform])

    
    useEffect(() => {

        if (canvasSize.w !==0){
            //console.log('grid');
            drawCanvasGrid(transform);
        }
    }, [grid, gridTick, canvasSize.w, drawCanvasGrid, transform])


    return (
        <>
            <canvas
                style={{
                    width: canvasSize.w,
                    height: canvasSize.h,
                    position: "absolute"
                }}
                ref={canvasGridRef}  
      
            />
            <canvas 
                id = "canvasNet"
                style={{
                    width: canvasSize.w,
                    height: canvasSize.h,
                    position: "absolute"
            
                }}
                ref={canvasNetRef}  
            />
        </>)
        
  }

