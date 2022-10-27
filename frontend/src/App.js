//OK
import './Style/App.css';
import React, { useState, useCallback } from 'react';
import { Welcome } from './Welcome';
import { NewProject } from './NewProject/NewProject';
import { Main } from './Main/Main';
import { Network } from './classes/network';
import { PopUp } from './Components/PopUp';

export const App = () => {
    const [view, setView] = useState('wellcome');
    const [network, setNetwork] = useState(null) 
    const [grid, setGrid] = useState(false);
    const [gridTick, setGridTick] = useState(250)
    const [showRoadColors, setRoadColors] = useState(false);
    const [showOnlyIntersectionNodes, setShowOnlyIntersectionNodes] = useState(true);
    const [isUploadError, setIsUploadError] = useState(false)
    const scale = 1.7;

    /** 
     * Set the current view
     */
    const handleView = useCallback((newView) => {
        setView(newView);
    },[setView]);

    const readFileContent = (file) => {
        const reader = new FileReader()
        return new Promise((resolve, reject) => {
            reader.onload = event => resolve(event.target.result)
            reader.onerror = error => reject(error)
            reader.readAsText(file);
      })
    }

    /**
     * Load the project and set the variables: network, grid, grid tick, roadColors, showOnlyIntersectionNodes and roadTypes for rendering.
     * If the project is not compatible with the application, it throws an error.
     */
    const handleOpenProject = (input) => {
        if ('files' in input && input.files.length > 0) {
            return new Promise(function(resolve, reject) {
            readFileContent(input.files[0]).then(data => {
                try{
                    data = JSON.parse(data);
                    setGridTick(data.showGrid.gridTick);
                    setGrid(data.showGrid.active);
                    setRoadColors(data.showRoadColors);
                    setShowOnlyIntersectionNodes(data.showOnlyIntersections);  
                    let newNetwork;
                    newNetwork = new Network();
                    newNetwork.topology = data.topology;
                    newNetwork.size = data.size;
                    newNetwork.nextNodeId =  data.nextNodeId;
                    newNetwork.nextRoadId = data.nextRoadId;
                    newNetwork.nextNbhId = data.nextNbhId;
                    newNetwork.defaultLenght = data.defaultLenght;
                   
                    for(let roadType of data.roadTypes){
                        newNetwork.addRoadType(roadType.name, roadType.maxSpeed, roadType.color, 0, roadType.id);
                    }
                    
                    for(let node of data.nodes){
                        newNetwork.addNode([node.x, node.y], node.isIntersection, node.isNbhBoundary, false, node.id);
                    }
                    
                    for(let road of data.roads){
                        let roadNodes = newNetwork.getElementsById(road.nodes, 'nodes');
                        newNetwork.addRoad(roadNodes, newNetwork.getRoadTypeById(road.type), road.direction, road.isNbhBoundary, false, road.id);
                    }

                    for(let nbh of data.nbhs){
                        let bRoads =  newNetwork.getElementsById(nbh.bRoads, 'roads');
                        let cRoads =  newNetwork.getElementsById(nbh.cRoads, 'roads');
                        let iRoads =  newNetwork.getElementsById(nbh.iRoads, 'roads');
                        newNetwork.addNbh(bRoads, cRoads, iRoads, nbh.id);
                    }
                //console.log(newNetwork);
                setNetwork(newNetwork);
                resolve(newNetwork);
                }catch(error){
                    setIsUploadError(true);
                }
            }).catch(error => {
                reject(error);
            })});
        }
    }

    /**
     * Set a pop-up component to display the error message when the loaded file is not compatible with the application.
     * @returns Pop-up component 
     */
    const uploadError = () => {
        return  <PopUp display={isUploadError} prevBtn="Ok" onPrev={() => {setIsUploadError(false)}}>
                    <div className='container-title'>Error loading file</div>
                    <hr className='mt--2'/>
                     <div className="mx-10 mt-4 mb-4">Not a road network file </div>
                </PopUp>;
    }

    switch(view){
        case 'wellcome':
            return( 
            <>
            <Welcome 
                onChangeView={handleView} 
                onChangeOpenProject={handleOpenProject}
            />
            {uploadError()}
            </>
            );
        case 'newProject':
            return( 
            <NewProject 
                onChangeView={handleView} 
                onChangeNetwork={setNetwork}
                scale={scale}
                readFileContent={readFileContent}
            />
            );
        case 'main':
            return( 
            <>
            <Main 
                onChangeView={handleView} 
                network={network}
                onChangeNetwork={setNetwork}
                grid={grid}
                onChangeGrid={setGrid}
                gridTick={gridTick}
                onChangeGridTick={setGridTick}
                showRoadColors={showRoadColors}
                onChangeRoadColors={setRoadColors}
                showOnlyIntersectionNodes={showOnlyIntersectionNodes}
                onChangeShowOnlyIntersectionNodes={setShowOnlyIntersectionNodes}
                onChangeOpenProject={handleOpenProject}
                scale={scale}
                readFileContent={readFileContent}

            />
             {uploadError()}
            </>
            );
        default: 
            return(console.log("Error: This case does not exist"));
    }
}
