import * as d3 from "d3";


export const calculateStartMargins = (canvasSize, nodes, globalScale, initialScale, scale=true) => {
    const maxX = d3.max(nodes, d => d.x);
    const maxY = d3.max(nodes, d => d.y);
    const minX = d3.min(nodes, d => d.x);
    const minY = d3.min(nodes, d => d.y);
    let maxXScaled = (maxX-minX)/globalScale
    let maxYScaled = (maxY-minY)/globalScale
    if (scale){
        let lambda = 20
        if (maxXScaled  > canvasSize.w){
            let scaleTo = (canvasSize.w -lambda) / maxXScaled 
            initialScale = scaleTo;
        }
        if(maxYScaled  > canvasSize.h){
            let scaleTo = (canvasSize.h - lambda)/ maxYScaled 
            initialScale = initialScale > scaleTo? scaleTo : initialScale;
        }
    }
    let startTransform = {
        k: initialScale,
        x: (canvasSize.w-maxXScaled*initialScale)/2,
        y: (canvasSize.h-maxYScaled*initialScale)/2
    }

    return startTransform;
}

export const drawGridAxes = (ctx, canvasSize, scale, tick, strokeColor = "#C0C0BB", lineWidth = 1) => {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    for(let i = 0; i <= canvasSize.w; i = i + tick*scale){
        ctx.beginPath();
        ctx.moveTo(i , 0);
        ctx.lineTo(i , canvasSize.h);
        ctx.stroke();
    }
    for(let i = 0; i <= canvasSize.h; i = i + tick*scale){
        ctx.beginPath();
        ctx.moveTo(0 , i);
        ctx.lineTo(canvasSize.w, i);
        ctx.stroke();
    }
} 

const drawArrowhead = (ctx, from, to, radius) => {
    var x_center = to.x;
    var y_center = to.y;
    var angle;
    var x;
    var y;
    ctx.beginPath();
    angle = Math.atan2(to.y - from.y, to.x - from.x)
    x = radius * Math.cos(angle) + x_center;
    y = radius * Math.sin(angle) + y_center;

    ctx.moveTo(x, y);
    angle += (1.0/3.0) * (2 * Math.PI)
    x = radius * Math.cos(angle) + x_center;
    y = radius * Math.sin(angle) + y_center;
    
    ctx.lineTo(x, y);
    angle += (1.0/3.0) * (2 * Math.PI)
    x = radius *Math.cos(angle) + x_center;
    y = radius *Math.sin(angle) + y_center;

    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fillStyle = "white";
    ctx.fill();
}

export const drawRoad = (ctx, scaleX, scaleY, nodeList, radiusConnections, raidusForms, arrowSize, lineWidth, roadColors, roadTypes, type, direction) => {

    for(let i = 1; i < nodeList.length; i++){
        let source = nodeList[i -1].point
        let target = nodeList[i].point
        let color = roadColors? roadTypes[type].color : "rgb(100, 100, 100)";
        ctx.beginPath();
        ctx.moveTo(scaleX(source[0]), scaleY(source[1]));
        ctx.lineTo(scaleX(target[0]), scaleY(target[1]));
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.stroke();
    }
    for(let i = 0; i < (nodeList.length-1); i++){
        let source = nodeList[i].point
        let target = nodeList[i + 1].point
        ctx.beginPath();
        ctx.lineWidth = lineWidth*2;
        ctx.strokeStyle = "rgba(0,173,181, 0.6)";
        ctx.moveTo(scaleX(source[0]), scaleY(source[1]));
        ctx.lineTo(scaleX(target[0]), scaleY(target[1]));
        ctx.stroke();
        ctx.setLineDash([]);
    
    }
    let arrowPadding = radiusConnections + arrowSize + 0.7;
    let alternate = true;
    for(let i = 1; i < nodeList.length; i++){
        let source = nodeList[i - 1].point
        let target = nodeList[i].point
        const deltaX = target[0] - source[0];
        const deltaY = target[1] - source[1];
        const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const normX01 = deltaX / dist;
        const normY01 = deltaY / dist;
        if (dist > 15 ){
            let sourceX = scaleX(source[0]) + (arrowPadding * normX01);
            let sourceY = scaleY(source[1]) + (arrowPadding * normY01);
            let targetX = scaleX(target[0]) - (arrowPadding * normX01);
            let targetY = scaleY(target[1]) - (arrowPadding * normY01);
            if (direction === 'both'){
                if(((i === 0 && i+2 === this.nodes.length) || dist > 30)){
                    drawArrowhead(ctx, {x:targetX,  y:targetY} , {x:sourceX,  y:sourceY}, arrowSize);
                    drawArrowhead(ctx, {x:sourceX,  y:sourceY} , {x:targetX,  y:targetY}, arrowSize);
                }
                else if (alternate) {
                    drawArrowhead(ctx, {x:targetX,  y:targetY} , {x:sourceX,  y:sourceY}, arrowSize);
                    alternate = !alternate;
                } else{
                    drawArrowhead(ctx, {x:sourceX,  y:sourceY} , {x:targetX,  y:targetY}, arrowSize);
                    alternate = !alternate;
                }
            }
            else if (direction === 'oneway'){
                drawArrowhead(ctx, {x:sourceX,  y:sourceY} , {x:targetX,  y:targetY}, arrowSize);
            } 
            else if (direction === 'reverse'){
                drawArrowhead(ctx, {x:targetX,  y:targetY} , {x:sourceX,  y:sourceY}, arrowSize);
            }
        }
    }

    for(let i = 0; i < nodeList.length; i++){
        ctx.beginPath();
        let radius = nodeList[i].isIntersection? radiusConnections : raidusForms;
        ctx.arc(scaleX(nodeList[i].point[0]),scaleY(nodeList[i].point[1]), radius, 0, 2*Math.PI);
        ctx.fillStyle = 'rgb(60, 179, 113)';
        ctx.fill()
    }

}


