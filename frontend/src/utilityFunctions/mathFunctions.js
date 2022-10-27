import {polygonContains} from "d3-polygon";

/** OK
 * Round the number to two decimal places
 * @param {Number} number 
 * @returns the rounded number
 */
 export const roundTo2 = (number) => {
    return Math.round((number * 100)) / 100;
}

/**
 * Measure the distance between two points
 * @param {Array<Number>} pointA First point  [x1, y1]
 * @param {Array<Number>} pointB Second point [x2, y2]
 * @returns the distance
 */
 export const distanceBetween2Points =  (pointA, pointB) => {
    const dx = pointB[0] - pointA[0];
    const dy = pointB[1] - pointA[1];
    let d = Math.hypot(dx, dy);
    return roundTo2(d);
}

/**
 * Find the point where two line segments meet.
 * @param {Array} lineAPoint1 Startpoint of the line A
 * @param {Array} lineAPoint2 Endpoint of the line A
 * @param {Array} lineBPoint3 Startpoint of the line B
 * @param {Array} lineBPoint4 Endpoint of the line B
 * @returns If it exists, returns the point. Otherwise, it returns false.
 */
export const intersectionTwoLinesSegments = (lineAPoint1, lineAPoint2, lineBPoint3, lineBPoint4) => {
    let tn = (lineAPoint1[0]-lineBPoint3[0])*(lineBPoint3[1]-lineBPoint4[1])-(lineAPoint1[1]-lineBPoint3[1])*(lineBPoint3[0]-lineBPoint4[0]);
    let un = (lineAPoint1[0]-lineBPoint3[0])*(lineAPoint1[1]-lineAPoint2[1])-(lineAPoint1[1]-lineBPoint3[1])*(lineAPoint1[0]-lineAPoint2[0]);
    let d = (lineAPoint1[0]-lineAPoint2[0])*(lineBPoint3[1]-lineBPoint4[1])-(lineAPoint1[1]-lineAPoint2[1])*(lineBPoint3[0]-lineBPoint4[0]);
    let t = tn/d;
    let u = un/d;
    if(t >= 0 && t <= 1 && u >= -0.03 && u <= 1.03 ){
        let point = [lineAPoint1[0] + t*(lineAPoint2[0]-lineAPoint1[0]), lineAPoint1[1] + t*(lineAPoint2[1]-lineAPoint1[1])]
        return point;
    }
    else{
        return false;
    }
}

export const isOnLineSegment = (linePoints, lineWidth=1, x, y) => {
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

    if(polygonContains(polygon, [x, y]))
        return true;
    return false;

}