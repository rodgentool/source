// OK

import { Section } from "../../Components/Section";

export const PanelNbh = ({   
    network,
    nbhsSelected,
    handleImport,
    handleDeleteInternalNet,
    handleInternalNet,
    }) => {

    const handleNbhSize = () => {
        let size = network.calculateNbhSize(nbhsSelected[0]);
        for(let i = 1; i < nbhsSelected.length; i++){
            let toCompareSize = network.calculateNbhSize(nbhsSelected[i]);
            if (size.w !==  toCompareSize.w || size.h !==  toCompareSize.h)
            return {w: "-", h: "-"};
        }
        return size;
    }   

    if(nbhsSelected && nbhsSelected[0].constructor.name === 'Nbh'){
        const nbhSize= handleNbhSize();
        return(
            <>
            <Section name="Details">
                <div><strong>Size:</strong></div>
                <div className="section-row mt-2">
                    <span><strong>W:</strong></span> 
                    {nbhSize.w} m.

                    <span><strong>H:</strong></span> 
                    {nbhSize.h} m.
                </div>
            </Section>
            <Section name="Actions">
                {nbhsSelected.length === 1 && <button className="btn section-btn mt-2 mb-4" type="button" onClick={handleInternalNet}>Modify</button>}
                <button className="btn section-btn mt-2" type="button" onClick={handleDeleteInternalNet}>Empty</button>
                <button className="btn mt-4 section-btn" type="button" onClick={handleImport}>Import</button>
            </Section>
            </>
        );
    }else{
        return(
            <div className="panel-free mt-8 grey">
                No Neighborhood is seleced
            </div>
        );
    }
}