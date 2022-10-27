//OK!

import { useRef, useMemo, useState, useCallback} from "react";
import { Marker, Polygon, useMapEvents} from "react-leaflet";
import { scaleLinear } from "d3-scale";
import { min, max } from "d3";
import { polygonCentroid } from "d3-polygon";
import L from "leaflet";

export const AreaSelect = ({
    polygon,
    onChangePolygon
} )  => {
    const outerPolygonRef = useRef(null)
    const innerPolygonRef = useRef(null)
    const markersRef = useRef([]);

    const map = useMapEvents({
        zoom() {
            setBounds(map.getBounds())
        },
        move(){
            setBounds(map.getBounds())
        },
      })

    const [mBounds, setBounds] = useState(() => map.getBounds());

    const mapBoundsPositions = useMemo(() =>[[mBounds._northEast.lat,mBounds._southWest.lng], mBounds._northEast, [mBounds._southWest.lat, mBounds._northEast.lng] , mBounds._southWest], [mBounds]);



      const setCoordinates = useCallback(() => {
        let markers = Object.values(markersRef.current);

        for(let i = 0; i < polygon.length; i++){
            polygon[i][0] = markers[i].getLatLng().lat
            polygon[i][1] = markers[i].getLatLng().lng
        }

        let newPolygon = []
        for(let point of polygon)
            newPolygon.push(point);
        
        onChangePolygon(newPolygon);
      }, [polygon, onChangePolygon])

      const eventHandlersMarks =  useMemo(
          (e) => ({
            drag(e){
                const outerPolygon = outerPolygonRef.current;
                const innerPolygon = innerPolygonRef.current;

                let poly = Object.values(polygon);
                let polyMinLng = min(poly, point => point[1]);
                let polyMaxLng = max(poly, point => point[1]);
                let polyMinLat = min(poly,  point => point[0]);
                let polyMaxLat = max(poly, point => point[0]);
              
                let markers = Object.values(markersRef.current)
                let markersMinLng = min(markers, marker => marker.getLatLng().lng);
                let markersMaxLng = max(markers, marker => marker.getLatLng().lng);
                let markersMinLat = min(markers, marker => marker.getLatLng().lat);
                let markersMaxLat = max(markers, marker => marker.getLatLng().lat);

                let polyCenter = polygonCentroid(poly);
                let actualMark = e;
                if(actualMark.oldLatLng.lng > polyCenter[1]){
                    polyMaxLng = actualMark.oldLatLng.lng;
                    markersMaxLng = actualMark.latlng.lng;
                } else{
                    polyMinLng = actualMark.oldLatLng.lng;
                    markersMinLng = actualMark.latlng.lng;
                }
                if(actualMark.oldLatLng.lat > polyCenter[0]){
                    polyMaxLat = actualMark.oldLatLng.lat;
                    markersMaxLat = actualMark.latlng.lat;
                } else{
                    polyMinLat = actualMark.oldLatLng.lat;
                    markersMinLat = actualMark.latlng.lat;
                }

                let margin = {x: 0,y: 0}
                if(markersMaxLng-markersMinLng === 0){
                    margin.x = 0.0004
                }
                if(markersMaxLat-markersMinLat === 0){
                    margin.y = 0.0003
                }
                
                let rescaleLng = scaleLinear().domain([polyMinLng, polyMaxLng]).range([markersMinLng, markersMaxLng + margin.x])
                let rescaleLat = scaleLinear().domain([polyMinLat, polyMaxLat]).range([markersMinLat, markersMaxLat + margin.y])

                let innerPolygonPositions = [];
                for(let i = 0; i < markers.length; i++){
                    markers[i].setLatLng([rescaleLat(poly[i][0]),rescaleLng(poly[i][1])]);
                    innerPolygonPositions.push(markers[i].getLatLng())
                }
                outerPolygon.setLatLngs([mapBoundsPositions, innerPolygonPositions]);
                innerPolygon.setLatLngs(innerPolygonPositions);
            },
            dragend() {
                setCoordinates();
            },
            }),[polygon, mapBoundsPositions, setCoordinates])

   
    const eventHandlersDragPoly = useMemo(
        () => ({
            mousedown(e){
                map.dragging.disable();
                let innerPolygon = innerPolygonRef.current;
                let outerPolygon = outerPolygonRef.current;
                let mousePos = e.latlng;
                let distances = [];
                for(let point of polygon){
                    distances.push([point[0] - mousePos.lat, point[1] - mousePos.lng]);
                }

                map.on('mousemove', function (e){
                    let innerPolygonPositions = [];
                    let mousePos = e.latlng;
                    let markers = Object.values(markersRef.current);
                    for(let i = 0; i < markers.length; i++){
                        let marker = markers[i]
                        let distance = distances[i]
                        marker.setLatLng([mousePos.lat + distance[0], mousePos.lng + distance[1]]);
                        innerPolygonPositions.push([marker.getLatLng().lat, marker.getLatLng().lng]);
                    }
                    outerPolygon.setLatLngs([mapBoundsPositions, innerPolygonPositions]);
                    innerPolygon.setLatLngs(innerPolygonPositions);
                    });
            },

            mouseup(){
                map.removeEventListener('mousemove');
                setCoordinates();
                map.dragging.enable();
            }

        }), [polygon, map, mapBoundsPositions, setCoordinates]);
    
    const myIcon = L.divIcon({className: 'my-div-icon'})

    const getSelectedArea = () => {
        let innerPolygonPositions = [];
        for(let point of polygon){
            innerPolygonPositions.push(point);
        }
        
        return <>
        <Polygon
            positions={[mapBoundsPositions, innerPolygonPositions]}
            pathOptions={{
                stroke: false, 
                opacity: 0.9, 
                fill: true, 
                fillColor: "black", 
                fillOpacity: 0.45}}
            ref={outerPolygonRef}
        />
        <Polygon
            eventHandlers={eventHandlersDragPoly}
            positions={innerPolygonPositions}
            pathOptions={{
                color: "white", 
                opacity: 0.9, 
                fill: true, 
                fillColor: "black", 
                fillOpacity: 0, 
                weight: 1}}
            ref={innerPolygonRef}
        />
        </>
    }

    const getMarkers = () => {
        let markers = [];
        for(let i = 0; i < polygon.length; i++){
            let point = polygon[i];
            markers.push(
            <div key={i}>
                <Marker
                    draggable={true}
                    eventHandlers={eventHandlersMarks}
                    position={point}
                    icon={myIcon}
                    ref={el => markersRef.current[i] = el}>
                </Marker>
            </div>)
        }
        return markers;
    }


    return (
        <>
        {getSelectedArea()}
        {getMarkers()}
        </>
      )
}










