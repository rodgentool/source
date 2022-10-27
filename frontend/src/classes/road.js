import { roundTo2 } from "../utilityFunctions/mathFunctions";
import { polygonContains }  from 'd3-polygon';

export class Road {

    /** OK
     * Create a new road
     * @param {Number} id Road id
     * @param {Array<Node>} nodes Nodes that make up the road
     * @param {RoadType} type Type of road
     * @param {String} direction Direcction of the road : 'both' || 'oneway' || 'reverse'
     * @param {String} isNbhBoundary If true, the road is part of the polygon that defines the neighborhood boundaries
     * @param {Boolean} isSelected Defines if the road is selected
     */
    constructor(id, nodes, type, direction, isNbhBoundary,  isSelected){
        this.id = id
        this.nodes = nodes;
        this.type = type;
        this.direction = direction;
        this.length = this.calculateLength();
        this.isNbhBoundary = isNbhBoundary;
        this.isSelected = isSelected;
    }

    /** OK
     * Sets the type of road
     * @param {roadType} newType 
     */
    setRoadType(newType) {
        this.type = newType;
    }

    /** OK
     * Sets the direction of the road
     * @param {String} newDirection 
     */
    setRoadDirection(newDirection) {
        this.direction = newDirection;
    }

    numOfBoundaryNodes(){
        let num = 0;
        for(let node of this.nodes){
            if(node.isNbhBoundary)
                num++;
        }
        return num;
    }

    /** OK
     * Calculate the length of the road
     * @returns the lenght of the road
     */
    calculateLength() {
        this.length = 0;
        for(let i = 1; i < this.nodes.length; i++){
            let node1 = this.nodes[i-1];
            let node2 = this.nodes[i];
            this.length += node1.distanceToNode(node2);
        }
        return roundTo2(this.length);
    }

    //OK
    getNodesIds(){
        let nodesIds = [];
        for(let node of this.nodes){
            nodesIds.push(node.id)
        }
        return nodesIds;
    }

    /**
     * Convert a segment of a Road to a polygon, to easily determine if the point falls on the line.
     * @param {Number} lineWidth Width of the road, after applying the corresponding scale.
     * @returns Array with the points that make up the rectangle.
     */
    segmentToPolygon(nodeA, nodeB, lineWidth=1){
        let dx = nodeB.x - nodeA.x;
        let dy = nodeB.y - nodeA.y;
        let dist = roundTo2(Math.hypot(dx, dy));
        let xOffset = - (lineWidth / (2 * dist)) * dy
        let yOffset = lineWidth / (2 * dist) * dx
        
        let aPoint = [nodeA.x - xOffset, nodeA.y - yOffset];
        let bPoint = [nodeA.x + xOffset, nodeA.y + yOffset];
        let cPoint = [nodeB.x - xOffset, nodeB.y - yOffset];
        let dPoint = [nodeB.x + xOffset, nodeB.y + yOffset];
    
        let polygon = [aPoint, cPoint, dPoint, bPoint];
        return polygon;
    }

    containsPoint(point, lineWidth=1){
        for(let i = 1;  i < this.nodes.length; i++){
            let roadPolygon = this.segmentToPolygon(this.nodes[i-1], this.nodes[i], lineWidth);
            if (polygonContains(roadPolygon, point))
                return true;
        }
        return false;
    }

    // OK
    toString(type='json-project'){
        let road = '';

        if(type === 'json-project'){
            let nodesAsId = JSON.stringify(this.getNodesIds());
            road += `\t{
        "id": ${this.id},
        "nodes": ${nodesAsId},
        "type": ${this.type.id},
        "direction": "${this.direction}",
        "isNbhBoundary": ${this.isNbhBoundary}
    }`
        }

        else if(type === 'json-server'){
            road = `"${this.id}": ["${this.nodes[0].id}", "${this.nodes[this.nodes.length-1].id}", "${this.length}", "${this.direction}", "${this.length/this.type.maxSpeed}"]`;
        }

        else if(type === 'xml'){
            road += `<link id="${this.id}">\n`;
            for(let node of this.nodes){
                road += `\t<nd ref="${node.id}"/>\n`;
            }
            road +=  `\t<tag k="length" v="${this.length}"/>\n`;
            road +=  `\t<tag k="maxSpeed" v="${this.type.maxSpeed}"/>\n`;
            road +=  `\t<tag k="direction" v="${this.direction}"/>\n`;
            road +=  `\t<tag k="type" v="${this.type.name}"/>\n</link>`;
       
        }
        
        else if(type === 'gr'){
            let firstNode = this.nodes[0].id;
            let lastNode = this.nodes[this.nodes.length-1].id;
            if(this.direction !== 'reverse')
                road += `a ${firstNode} ${lastNode} ${this.length} ${this.type.maxSpeed}`
            if(this.direction === 'both')
                road += `\n`
            if(this.direction !== 'oneway')
            road += `a ${lastNode} ${firstNode} ${this.length} ${this.type.maxSpeed}`
        }

        return road;
    }

    //TO-DO
    drawArrowhead(ctx, from, to, radius) {
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

    //OK
    draw(ctx, scaleX, scaleY, lineWidth, radius, color="rgb(100, 100, 100)", showDirection=false, selectedColor="rgba(0,173,181, 0.6)", selectedWidth=lineWidth*2, arrowSize=lineWidth*0.5, isSelected=this.isSelected) {

        for(let i = 0; i < this.nodes.length-1; i++){
            let source = this.nodes[i]
            let target = this.nodes[i + 1]
            ctx.beginPath();
            //!this.type && ctx.setLineDash([5, 15]);
            ctx.moveTo(scaleX(source.x), scaleY(source.y));
            ctx.lineTo(scaleX(target.x), scaleY(target.y));
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = "round";
            ctx.stroke();
            ctx.setLineDash([])
        }
        if(isSelected){
            for(let i = 0; i < this.nodes.length-1; i++){
                let source = this.nodes[i]
                let target = this.nodes[i + 1]
                ctx.beginPath();
                ctx.lineWidth = selectedWidth;
                ctx.strokeStyle = selectedColor;
                //ctx.setLineDash([10, 15]);
                ctx.moveTo(scaleX(source.x), scaleY(source.y));
                ctx.lineTo(scaleX(target.x), scaleY(target.y));
                ctx.stroke();
            }
        }

        //if(this.type && (showDirection || this.isSelected)){
        if(showDirection || this.isSelected){
            let arrowPadding = radius + arrowSize + 0.7;
            let alternate = true;
            for(let i = 0; i < this.nodes.length-1; i++){
                let source = this.nodes[i]
                let target = this.nodes[i + 1]
                const deltaX = target.x - source.x;
                const deltaY = target.y - source.y;
                const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                const normX01 = deltaX / dist;
                const normY01 = deltaY / dist;
                if (dist > 19 ){
                    let sourceX = scaleX(source.x) + (arrowPadding * normX01);
                    let sourceY = scaleY(source.y) + (arrowPadding * normY01);
                    let targetX = scaleX(target.x) - (arrowPadding * normX01);
                    let targetY = scaleY(target.y) - (arrowPadding * normY01);
                    if (this.direction === 'both'){
                        if(((i === 0 && i+2 === this.nodes.length) || dist > 30)){
                            this.drawArrowhead(ctx, {x:targetX,  y:targetY} , {x:sourceX,  y:sourceY}, arrowSize);
                            this.drawArrowhead(ctx, {x:sourceX,  y:sourceY} , {x:targetX,  y:targetY}, arrowSize);
                        }
                        else if (alternate) {
                            this.drawArrowhead(ctx, {x:targetX,  y:targetY} , {x:sourceX,  y:sourceY}, arrowSize);
                            alternate = !alternate;
                        } else{
                            this.drawArrowhead(ctx, {x:sourceX,  y:sourceY} , {x:targetX,  y:targetY}, arrowSize);
                            alternate = !alternate;
                        }
                    }
                    else if ( this.direction === 'oneway'){
                        this.drawArrowhead(ctx, {x:sourceX,  y:sourceY} , {x:targetX,  y:targetY}, arrowSize);
                    } 
                    else if (this.direction === 'reverse'){
                        this.drawArrowhead(ctx, {x:targetX,  y:targetY} , {x:sourceX,  y:sourceY}, arrowSize);
                    }
                }
            }
        }

    } 
}


    

