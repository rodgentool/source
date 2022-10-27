// OK

export const Topology = ({
    topology,
    onChangeTopology,
    onChangeNetwork,
    network
    }) => {
    
    /**
     * handles the topology change, calling the "handleTopology" function in NewProject.js
     * @param {Event} e event triggered when selecting a topology type
     */
    const handleTopology = (e) => {
        topology = e.target.value;
        network.topology = topology;
        onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));
        onChangeTopology();
    }

    return (
        <div className="cont-left-top">
            <div className="cont-with-title">
                <select className="select-topology" size="3" value={topology} onChange={handleTopology}>
                    <option value='Custom'>Custom</option>
                    <option value='Grid'>Grid</option>
                    <option value='Ring'>Ring</option>
                    <option value='Import'>Import</option>
                </select>
            </div>
            <div className="section-title cont-title">Topology</div>
        </div>
    );
}