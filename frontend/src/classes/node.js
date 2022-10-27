import { roundTo2} from "../utilityFunctions/mathFunctions";
import { polygonContains }  from 'd3-polygon';


export class Node {
    /** OK
     * Create a new node
     * @param {Number} id Id of the node
     * @param {Array<Number>} nodePosition Position of the node of the form [x, y]
     * @param {Boolean} [isIntersection=false] Specifies whether the node is an intersection
     * @param {Boolean} [isNbhBoundary=false] Specifies whether the node is part of the polygon that defines the neighborhood boundaries
     * @param {Boolean} [isSelected=false] Specifies whether the node is selected
     */
    constructor(id, nodePosition, isIntersection=false, isNbhBoundary=false, isSelected=false){
        this.id = id;
        this.x = nodePosition[0];
        this.y = nodePosition[1];
        this.isIntersection = isIntersection;
        this.isNbhBoundary= isNbhBoundary;
        this.isSelected = isSelected;

    }

    /** OK
     * Calculate the distance between two nodes
     * @param {Node} node 
     * @returns The distance between two nodes
     */
    distanceToNode(node){
        const dx = this.x - node.x;
        const dy = this.y - node.y;
        let d = Math.hypot(dx, dy);
        return d;
    }

    /**
     * Calculate the distance between a node and a line
     * @param {Array<Number>} linePoint1 A point [x1,y1] passing through the line
     * @param {Array<Number>} linePoint2 Another point [x2,y2] that passes through the line.
     * @returns Distance between a node to a line
     */
    distanceToLine(linePoints){
        let linePoint1 = linePoints[0];
        let linePoint2 = linePoints[1];
        let a = linePoint2[0] - linePoint1[0];
        let b = linePoint1[1] - this.y;
        let c = linePoint1[0] - this.x;
        let d = linePoint2[1] - linePoint1[1];
        let m = Math.hypot(a, d);
        let distance = ((a*b) - (c*d))/m
        return Math.abs(roundTo2(distance));
    }
        


    distanceToLineSegment(linePoints){
        let linePoint1 = linePoints[0];
        let linePoint2 = linePoints[1];
        let a = linePoint2[0] - linePoint1[0];
        let b = linePoint2[1] - linePoint1[1];
        let dist = (a*a+b*b);
        if (dist === 0) return this.distanceToNode({x: linePoint2[0], y: linePoint2[1]});
        let t = ((this.x - linePoint1[0]) * (linePoint2[0] - linePoint1[0]) + (this.y - linePoint1[1]) * (linePoint2[1] - linePoint1[1])) / dist;
        t = Math.max(0, Math.min(1, t));
        return this.distanceToNode({x:  linePoint1[0] + t * (linePoint2[0] - linePoint1[0]), y: linePoint1[1] + t * (linePoint2[1] - linePoint1[1])});
    }


    /** OK
     * Calculates the point on the given line segment closest to the current node
     * @param {Array<Number>} linePoint1 
     * @param {Array<Number>} linePoint2 
     * @returns the point on the line
     */
    calculatePerpendicularPoint(linePoints){
        let linePoint1 = linePoints[0];
        let linePoint2 = linePoints[1];
        let a = linePoint2[0] - linePoint1[0];
        let b = linePoint1[1] - this.y;
        let c = linePoint1[0] - this.x;
        let d = linePoint2[1] - linePoint1[1];
        let m = Math.hypot(a, d);
        let distance = ((a*b) - (c*d))/m
        let px = this.x - 1 * (d/m) * distance;
        let py = this.y + 1 * (a/m) * distance;

        return [roundTo2(px), roundTo2(py)]
    }

    calculatePerpendicularPointOnSegment(linePoints){
        let a = linePoints[0];
        let b = linePoints[1];
        let t = [(this.x-a[0]) * (b[0]-a[0]) + (this.y-a[1]) * (b[1]-a[1])]/[Math.pow((b[0]-a[0]), 2) + Math.pow((b[1]-a[1]),2)]

        t = Math.max(0, Math.min(1, t));

        let px=a[0]+t*(b[0]-a[0])
        let py=a[1]+t*(b[1]-a[1])
        
        return [roundTo2(px), roundTo2(py)]
    }

    /**
     * Determines if the node is on a line segment
     * @param {Array<Number>} startPoint Point [x1,y1] where the line segment starts
     * @param {Array<Number>} endPoint Point [x2,y2] where the line segment ends
     * @returns true if the node is on the line segment and false otherwise
     */
     isOnLineSegment(linePoints, lineWidth=1){
        let dx = linePoints[1][0] - linePoints[0][0];
        let dy = linePoints[1][1] - linePoints[0][1];
        let dist = roundTo2(Math.hypot(dx, dy));
        let xOffset = - (lineWidth / (2 * dist)) * dy
        let yOffset = lineWidth / (2 * dist) * dx
        
        let aPoint = [linePoints[0][0] - xOffset, linePoints[0][1] - yOffset];
        let bPoint = [linePoints[0][0] + xOffset, linePoints[0][1] + yOffset];
        let cPoint = [linePoints[1][0] - xOffset, linePoints[1][1] - yOffset];
        let dPoint = [linePoints[1][0] + xOffset, linePoints[1][1] + yOffset];
    
        let polygon = [aPoint, cPoint, dPoint, bPoint];

        if(polygonContains(polygon, [this.x, this.y]))
            return true;
        return false;

    }


    // 
    toString(type='json-project', dist=1){
        let node;
        if(type === 'json-project')
            node = `\t{
        "id": ${this.id},
        "x": ${this.x},
        "y": ${this.y},
        "isIntersection": ${this.isIntersection},
        "isNbhBoundary": ${this.isNbhBoundary}
    }`
        else if(type === 'json-server')
            node = `"${this.id}"`

        else if(type === 'xml')
            node = `<node id="${this.id}" x="${this.x}" y="${this.y}"/>`

        else if(type === 'co')
            node = `v ${this.id} ${this.x/dist} ${this.y/dist}`
        return node;
    }

    //OK
    draw(ctx, scaleX, scaleY,  radius, color='rgb(0, 0, 0)', selectedColor='rgba(0,173,181)', selectedRadius=radius*2.5, strokeColor='rgb(0, 0, 0)', lineWidth="2"){
        ctx.beginPath();
        if (this.isSelected) {
            ctx.arc(scaleX(this.x),scaleY(this.y), selectedRadius, 0, 2 * Math.PI);
            ctx.fillStyle = selectedColor;
            ctx.fill()
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = strokeColor;
            ctx.stroke();
        }else{
            ctx.arc(scaleX(this.x),scaleY(this.y), radius, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill()
        }
    }
}


