import { useState } from 'react';
import { Tabbar, Tab, TabContent} from '../../Components/Tabbar';
import { PanelNetwork } from './Network';
import { PanelNbh } from './Nbh';
import { PanelRoad } from './Road';
import { PanelFP } from './FP'


export const RightPanel = ({
    activeTab,
    onChangeActiveTab,
    isPanelMin, 
    onChangePanelMin,
    network,
    onChangeNetwork,
    showRoadColors,
    elementsSelected,
    onClick,
    newRoad,
    onChangeNewRoad,
    roadData,
    onChangeRoadData,
    onChangeDrawPointer,
    showOnlyIntersectionNodes,
    handleDeleteRoad,
    handleImport,
    handleDeleteInternalNet,
    handleInternalNet,
    handleAddRoad,
    algorithm,
    onChangeAlgorithm,
    onChangePointTo,
    fpStart,
    fpEnd,
    onChangeFpStart,
    onChangeFpEnd,
    onChangeActivePopUp,
    roadLineWidth,
    showFsp,
    showFfp,
    onChangeShowFsp,
    onChangeShowFfp,
    fsp,
    ffp,
    onChangeFsp,
    onChangeFfp
    }) => {   
    
    const [showCurrentRoads, setCurrentSchowRoads] = useState(true);

    const handleOnClickTab = (e) => {
        const tab = e.target.id;
        if(tab !== activeTab){
            onChangeActiveTab(tab);
            if (tab === '-'){
                onChangePanelMin(true); 
            }
            else if(isPanelMin){
                onChangePanelMin(false); 
            }
        }
    }

    if(algorithm === "FP"){
        return( 
            <div className={"right-panel"} onClick={onClick}>
                <Tabbar>
                    <Tab 
                        id="FP" 
                        title="Algorithm"
                        active={algorithm === "FP"}
                    />
                </Tabbar>
                <div className="panel-content">
                    <TabContent display={algorithm === "FP"}>
                        <PanelFP
                            network={network}
                            onChangeNetwork={onChangeNetwork}
                            onChangeAlgorithm={onChangeAlgorithm}
                            onChangeDrawPointer={onChangeDrawPointer}
                            onChangePointTo={onChangePointTo}
                            fpStart={fpStart}
                            fpEnd={fpEnd}
                            onChangeFpStart={onChangeFpStart}
                            onChangeFpEnd={onChangeFpEnd}
                            onChangeActivePopUp={onChangeActivePopUp}
                            showFsp={showFsp}
                            showFfp={showFfp}
                            onChangeShowFsp={onChangeShowFsp}
                            onChangeShowFfp={onChangeShowFfp}
                            fsp={fsp}
                            ffp={ffp}
                            onChangeFsp={onChangeFsp}
                            onChangeFfp={onChangeFfp}
                        />
                    </TabContent>
                    
                </div>
            
            </div>);
    }else{
        return(       
            <div className={isPanelMin?  "right-panel-rotate" : "right-panel"} onClick={onClick}>
               <Tabbar>
                   <Tab 
                       id='network' 
                       title='Network' 
                       onClick={handleOnClickTab} 
                       active={activeTab === 'network'} 
                   />
                   <Tab 
                       id='Nbh'
                       title='Neighborhood'
                       onClick={handleOnClickTab} 
                       active={activeTab === 'Nbh'} 
                   />
                   <Tab 
                       id='Road'
                       title='Road'
                       onClick={handleOnClickTab} 
                       active={activeTab === 'Road'}  
                       />
                   <Tab 
                       id='-' 
                       title='-' 
                       onClick={handleOnClickTab} 
                       active={activeTab === '-'} 
                       hide={isPanelMin}
                   />
               </Tabbar> 
               <div className="panel-content">
                   <TabContent display={activeTab === "network"}>
                       <PanelNetwork
                           showCurrentRoads={showCurrentRoads}
                           onChangeCurrentRoads={setCurrentSchowRoads}
                           network={network}
                           onChangeNetwork={onChangeNetwork}
                           onChangeDrawPointer={onChangeDrawPointer}
                           onChangeRoadData={onChangeRoadData}
                           roadData={roadData}
                           newRoad={newRoad}
                           onChangeNewRoad={onChangeNewRoad}
                           roadsSelected={elementsSelected}
                           topology={network.topology}
                           showOnlyIntersectionNodes={showOnlyIntersectionNodes}
                           showRoadColors={showRoadColors}
                           netRoadTypes={network.roadTypes}
                           handleAddRoad={handleAddRoad}
                           roadLineWidth={roadLineWidth}
                       />
                   </TabContent>
                   <TabContent display={activeTab === 'Nbh'}>
                       <PanelNbh
                           network={network}
                           nbhsSelected ={elementsSelected} 
                           handleImport={handleImport}
                           handleDeleteInternalNet={handleDeleteInternalNet}
                           handleInternalNet={handleInternalNet}
                       />
                   </TabContent>
                   <TabContent display={activeTab === 'Road'}>
                       <PanelRoad 
                           roadsSelected={elementsSelected}
                           network={network}
                           onChangeNetwork={onChangeNetwork}
                           handleDeleteRoad={handleDeleteRoad}
                       />
                   </TabContent>
               </div>
           </div>);

    }

}

