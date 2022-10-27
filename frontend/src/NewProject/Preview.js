// OK

import React, {useRef, useEffect, useMemo} from 'react';
import { max } from "d3-array";
import { scaleLinear } from "d3-scale";

export const Preview = ({
    network
    }) => {
        const width = 190;
        const height= 212;
        const scale = 10;
        const nodeRadius = 5;
        const lineWidth = 6;
        const lambda = 10;
        const canvasRef = useRef(null);
        const ratio = window.devicePixelRatio || 1;
        const scaleFunction = useMemo(() => scaleLinear().domain([0, scale]).range([0, 1]),[scale])
     
    const myStyle = {
        width: width,
        height: height
    }

    useEffect(() => {
        const drawCanvasNetwork = (transform) => {
            const canvas = canvasRef.current;
            const ctx =  canvas.getContext('2d');
            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.translate(transform.x, transform.y);
            ctx.scale(transform.k, transform.k); 
            network.draw(ctx, scaleFunction, scaleFunction, nodeRadius, nodeRadius, lineWidth, lineWidth, false, false, true, true);
            ctx.restore();
        }

        if(network?.topology === 'Grid' || network?.topology === 'Ring'){
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            canvas.width = width  * ratio;
            canvas.height = height  * ratio;
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            let nodes = Object.values(network.nodes)
            let maxX = max(nodes, n => n.x)
            let maxY = max(nodes, n => n.y)
            let maxXScaled = maxX/scale
            let maxYScaled = maxY/scale
            let initialScale = 1;

            if (maxXScaled  > width){
                let scaleTo = (width -lambda) / maxXScaled 
                initialScale = scaleTo;
            }
            if(maxYScaled  > height){
                let scaleTo = (height - lambda)/ maxYScaled 
                initialScale = initialScale > scaleTo? scaleTo : initialScale;
                }

            let margin = {
                x: (width-maxXScaled*initialScale)/2,
                y: (height-maxYScaled*initialScale)/2
            }
        
            let newTransform = {k: initialScale, x: margin.x, y: margin.y}
            drawCanvasNetwork(newTransform);
        }
    }, [network, ratio, scaleFunction])

    const renderPreview = () => {
        if (network?.topology === 'Grid' || network?.topology === 'Ring' ){
            return <canvas ref={canvasRef} style={myStyle}/>
        } else {
            return <div className="cont-content-free grey"> Preview </div>
        }
    }

    return(
        <div className="cont-left-bottom">
            <div className="cont-alone-prev">
                {renderPreview()}
            </div>
        </div>
    );
}
