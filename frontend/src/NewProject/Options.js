// OK

export const Options = ({
    network,
    onChangeNetwork,
    errors,
    structure,
    handleErrors,
    roadsDirection,
    roadsType,
    roadsMaxSpeed,
    onChangeRoadsDirection,
    onChangeRoadsType,
    onChangeRoadTypeSpeed,
    onChangeGrFile,
    onChangeCoFile
    }) => {

    const handleStructure = (newStructure) => {
        let topology = network.topology;
        if (topology === 'Grid'){
            let cOld = structure.columns;
            let rOld = structure.rows;
            let cNew = newStructure.c
            let rNew = newStructure.r

            cNew = parseInt(cNew);
            rNew = parseInt(rNew);

            if (isNaN(cNew) || isNaN(rNew) || cNew <= 0 || rNew <= 0){
                cNew = isNaN(cNew)? "" : cNew;
                rNew = isNaN(rNew)? "" : rNew;
                console.log(cNew);
                console.log(rNew);
                network.emptyNetwork();
            } else {
                if (cOld  <= 0 || rOld <= 0){
                    cOld = 1;
                    rOld = 1;
                    network.emptyNetwork();
                    network.addGridFirstNbh();
                }
                if (cOld < cNew){
                    for(let i = cOld+1; i <= cNew; i++){
                        network.addGridColumn(network.roadTypes[roadsType], roadsDirection);
                    }
                }else if (cOld > cNew){
                    for(let i = cOld; i > cNew; i--){
                        network.deleteLastGridCol();
                        
                    }
                }
                if (rOld < rNew){
                    for(let i = rOld+1; i <= rNew; i++){
                    network.addGridRow(network.roadTypes[roadsType], roadsDirection);
                    }
                } else if(rOld > rNew){
                    for(let i = rOld; i > rNew; i--){
                    network.deleteLastGridRow();
                    }
                }
            }
            //console.log(network)
            handleErrors('structure', {columns: cNew, rows: rNew})
            onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network)) 
        }
        if(topology === 'Ring'){
            let value = newStructure.tau;
            if( value === '' || parseInt(value) <=0){
                value = 0;
            }
            let diff = value - structure.tau;
            if(diff > 0)
                network.addRing();
            else if(diff < 0)
                network.deleteRing();
            handleErrors('structure', {tau: parseInt(value)})
            onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network)) 

        }
    }

    const handleColumns = (e) => {
        handleStructure({c: e.target.value, r: structure.rows})
    }

    const handleRows = (e) => {
        handleStructure({c: structure.columns, r: e.target.value});
    }

    const handleTau = (e) => {
        handleStructure({tau: e.target.value})
    }

    const handleRoadType = (e) => {
        handleErrors('speed', network.getRoadTypeById(e.target.value, "maxSpeed"));
        onChangeRoadsType(e.target.value);
    }

    const handleSpeed = (e) => {
        handleErrors("speed", e.target.value);
        onChangeRoadTypeSpeed(e.target.value);
    }

    const handleDirection = (e) => {
        onChangeRoadsDirection(e.target.value);
    }

    //Read und pass o:

    const handleOpenGrFile = (e) => {
        onChangeGrFile(e.target.files[0]);
    }

    const handleOpenCoFile = (e) => {
        onChangeCoFile(e.target.files[0]);
    }

    return(
        <div className="cont-right">
            <div className="cont-with-title">
            {  
                network.topology !== "Grid" && network.topology !== "Ring"  &&  network.topology !== "Import" &&
                <div className="cont-content-free grey"> 
                    No options available 
                </div>
            }
            {
                network.topology === "Grid" &&
                <div className="container-options">
                    <div className="wrapper-options">
                        <div className="grid-nb-num">
                            Neighborhoods <br />grid:
                        </div>
                        <div className="grid-nb-num input-wh">
                            <label>
                                <span>W: </span> 
                                <input type='number' className={errors.structure && (structure.columns === '' || parseInt(structure.columns) < 1) ? 'options-input errorInput' : 'options-input'}  min="1" value={structure.columns} onChange={handleColumns}></input>
                            </label>
                        </div>
                        <div className="grid-nb-num input-wh">
                            <label>
                                <span>H: </span> 
                                <input type='number' className={errors.structure && (structure.rows === '' || parseInt(structure.rows) < 1) ? 'options-input errorInput' : 'options-input'}  min="1" value={structure.rows} onChange={handleRows} ></input>
                            </label>
                        </div>
                        {errors.structure && <p className="errorText mb--1"><small>{errors.structure}</small></p>}
                    </div>
                    <hr className="line"></hr>
                    <div className="wrapper-options">
                        <strong>Roads on the grid</strong>
                    </div>
                    <div className="wrapper-options">
                        <label className="options-label">Type:</label>
                        <select className="options-input p-right" value={roadsType} onChange={handleRoadType}>
                            {network.getRoadTypesAsOption()}
                        </select>
                    </div>
                    <div className="wrapper-options">
                        <label className="options-label">Speed (km/h): </label>
                        <input className={errors.speed &&  network.getRoadTypeById(roadsType, 'maxSpeed') === ""? 'options-input errorInput' : 'options-input'} type='number' min="10" value={roadsMaxSpeed} onChange={handleSpeed}/>
                        {errors.speed && 
                            <p className="errorText mb--1 text-right width-100"><small>{errors.speed}</small></p>
                        }

                        
                    </div>


                    <div className="wrapper-options">
                        <label className="options-label">Direction:</label>
                        <select className="options-input p-right" value={roadsDirection} onChange={handleDirection}>
                            <option value='both'>Both</option>
                            <option value='oneway'>Oneway</option>
                            <option value='reverse'>Reverse</option>
                        </select>
                    </div>
                </div>
            }
            {
                network.topology === "Ring" &&
                <div className="container-options">
                    <div className="wrapper-options">
                        <div className="grid-nb-num">
                            Neighborhoods <br />ring:
                        </div>
                        <div className="grid-nb-num input-wh">
                            <label>
                                <span>&tau; </span> 
                                <input className={errors.structure && (parseInt(structure.tau) <= 0) ? 'options-input errorInput' : 'options-input'} type='number' min="0" value={structure.tau} onChange={handleTau}></input>
                            </label>
                        </div>
                        <div className="grid-nb-num input-wh">
                        Formula: 4(&tau; − 1) + 1
                        </div>
                        {errors.structure && <p className="errorText mb--1"><small>{errors.structure}</small></p>}
                    </div>
                    <hr className="line"></hr>
                    <div className="wrapper-options">
                        <strong>Roads on the grid</strong>
                    </div>
                    <div className="wrapper-options">
                        <label className="options-label">Type:</label>
                        <select className="options-input p-right" value={roadsType} onChange={handleRoadType}>
                            {network.getRoadTypesAsOption()}
                        </select>
                    </div>
                    <div className="wrapper-options">
                        <label className="options-label">Speed (km/h): </label>
                        <input className="options-input" type='number' min="10" value={roadsMaxSpeed} onChange={handleSpeed}></input>
                    </div>
                    <div className="wrapper-options">
                        <label className="options-label">Direction:</label>
                        <select className="options-input p-right" value={roadsDirection} onChange={handleDirection}>
                            <option value='both'>Both</option>
                            <option value='oneway'>Oneway</option>
                            <option value='reverse'>Reverse</option>
                        </select>
                    </div>
                </div>
            }
            {network.topology === "Import" && 
            <div className="container-options">
            <div className="wrapper-options">
            <strong>Load files: </strong>
            </div>
                <div className="wrapper-options">
                            <label className="options-label mb-2"><strong>.gr</strong><hr></hr></label> 
                            <input type='file'  className="direction-reverse"  accept=".gr" onChange={handleOpenGrFile}/>

                </div>
              <div className="wrapper-options">
                        <label className="options-label mb-2"><strong>.co</strong><hr></hr></label> {/*If possible optional*/}  
                        <input type='file' className="direction-reverse" accept=".co" onChange={handleOpenCoFile}/>
                </div>
            </div>
            
            }
            </div>
            <div className="section-title cont-title">Options</div>
        </div>  
    )
}