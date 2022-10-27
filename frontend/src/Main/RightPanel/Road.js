//OK

import { Section } from "../../Components/Section";

export const PanelRoad = ({
    roadsSelected,
    network,
    onChangeNetwork,
    handleDeleteRoad,
    }) => {

 
    const getRoadTypesValue = () => {
        let value = roadsSelected[0].type.id
        for(let road of roadsSelected){
            if (road.type.id !== value)
                return "-";
        }
        return value;
    }

    const getDirectionValue = () => {
        let value =  roadsSelected[0].direction
        for(let road of roadsSelected){
            if (road.direction !== value)
                return "-";
        }
        return value;
    }

    const getMaxSpeedValue = () => {
        let value = roadsSelected[0].type.maxSpeed;
        for(let road of roadsSelected){
            if (road.type.maxSpeed !== value)
                return "-";
        }
        return value + " km/h";
    }

    const getLengthValue = () => {
        let value =  roadsSelected[0].length;
        for(let road of roadsSelected){
            if (road.length !== value)
                return "-";
        }
        return value + " m";
    }

    const handleRoadsType = (e) => {
        network.setRoadsType(roadsSelected, network.getRoadTypeById(e.target.value));
        onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
    }

    const handleRoadsDir = (e) => {
        network.setRoadsDirection(roadsSelected, e.target.value);
        onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
    }

    if(roadsSelected && roadsSelected[0]?.constructor.name === 'Road'){
        return(
            <>
            <Section name="Details">
                <table className="mb-4 tablePanel">
                    <tbody>
                        <tr>
                            <td><strong>Length:</strong></td>
                            <td>{getLengthValue()}</td>
                        </tr>
                        <tr>
                            <td><strong>Type of Road(s):</strong></td>
                            <td>
                            <select className="options-input" value={getRoadTypesValue()} onChange={handleRoadsType}>
                                {network.roadTypes.asOptions()}
                            </select>
                            </td>
                        </tr>
                        <tr>
                            <td><strong>Max Speed:</strong></td>
                            <td>
                                {getMaxSpeedValue()}
                            </td>
                        </tr>

                        <tr>
                            <td><strong>Direction:</strong></td>
                            <td>
                            <select className="options-input" value={getDirectionValue()} onChange={handleRoadsDir}>
                                <option key="-" value="-" className="hidden">-</option>
                                <option value='both'>Both</option>
                                <option value='oneway'>Oneway</option>
                                <option value='reverse'>Reverse</option>
                            </select>
                            </td>
                        </tr>
                    
                    </tbody>
                </table>
            </Section>
            <button className="btn section-btn mt-2" type="button" onClick={() => handleDeleteRoad()}>Delete Road(s)</button>
            </>
        );

    }else{
        return(
            <div className="panel-free mt-8 grey">
                No Road is seleced
            </div>
        );
    }

}
