//OK
import { Section } from "../../Components/Section";
import axios from "axios";
import { useMemo } from "react";
import { roundTo2 } from "../../utilityFunctions/mathFunctions";
import { url } from "../../url"

export const PanelFP = ({
    network, 
    onChangeNetwork, 
    onChangeAlgorithm, 
    onChangeDrawPointer, 
    onChangePointTo, 
    fpStart, 
    fpEnd, 
    onChangeFpStart, 
    onChangeFpEnd, 
    onChangeActivePopUp, 
    showFsp,
    showFfp,
    fsp,
    ffp,
    onChangeShowFsp,
    onChangeShowFfp,
    onChangeFsp,
    onChangeFfp
}) => {

    const handleCheckboxFsp = (e) => {
        onChangeShowFsp(!showFsp);

    }

    const handleCheckboxFfp = () => {
        onChangeShowFfp(!showFfp);
       
    }

    const handleCancel = () => {
        let changed = false;
        onChangeDrawPointer(false);
        onChangeAlgorithm(false);
        onChangePointTo(null);
        onChangeFpStart(null);
        onChangeFpEnd(null);
        if(fpStart){
            fpStart.isSelected = false;
            changed = true;
        }
        if(fpEnd){
            fpEnd.isSelected = false;
            changed = true;
        }

        fsp && onChangeFsp(null);
        ffp && onChangeFfp(null);
        
        if(changed){onChangeNetwork(Object.assign(Object.create(Object.getPrototypeOf(network)), network));}
    }

    const handleOnChangePointTo = (value) => {
        fsp && onChangeFsp(null);
        ffp && onChangeFfp(null);
        onChangeDrawPointer(true);
        onChangePointTo(value);
    }

    const fpLengthAndTime = useMemo( () => {
        let fspLenght = 0;
        let fspTime = 0;
        let ffpLenght = 0;
        let ffpTime = 0;
        
        if(ffp && fsp){
            for(let roadId of fsp){
                let road = network.roads[roadId];
                fspLenght += road.length/1000; 
                fspTime += road.length/1000/road.type.maxSpeed;

            }
            for(let roadId of ffp){
                let road = network.roads[roadId];
                ffpLenght += road.length/1000; 
                ffpTime += road.length/1000/road.type.maxSpeed;
            }
        }
        fspTime = parseInt(fspTime * 60);
        ffpTime = parseInt(ffpTime * 60);
        fspTime = fspTime < 60? `${fspTime%60} min` : `${Math.floor(fspTime/60)} hr ${fspTime%60} min`
        ffpTime = ffpTime < 60? `${ffpTime%60} min` : `${Math.floor(ffpTime/60)} hr ${ffpTime%60} min`

        return {fsp: [`${roundTo2(fspLenght)} Km`, fspTime], ffp: [`${roundTo2(ffpLenght)} Km`, ffpTime]};

    }, [ffp, fsp, network.roads])


    const handleStartAlgo = () => {
        if(!fpStart || !fpEnd)
            onChangeActivePopUp("FSPError01")
        else{
            let jsonNet = network.toString('json-server', [fpStart.id, fpEnd.id]);
            axios({
            method: 'POST',
            url:  url + '/fp/',
            data: jsonNet,
            }).then((res) => {
            let data = res.data;
            if (data.length < 1){
                onChangeActivePopUp("FPError03")
            }else{
                onChangeFsp(data[0]);
                onChangeFfp(data[1]);
            }
                //console.log(res)
            })
            .catch((err) => {
                onChangeActivePopUp("FPError02")
                console.log(err)
            });
        } 
    }

    return(
        <Section name="Find the shortest and the fastest path">
        <div className='section-row mb-2'>
            <label>
                <input type="checkbox" className="checkbox checkbox-fsp" checked={showFsp}  onChange={handleCheckboxFsp}/>
                Shortest Path
           </label>
           <label>
                <input type="checkbox"  className="checkbox checkbox-ffp" checked={showFfp}  onChange={handleCheckboxFfp}/>
               Fastest Path
           </label>
        </div>
        {fsp && ffp &&
        <div>
            {(showFsp || showFfp) && <table className="mt-2 mb-4 fpPanel">
            <thead>
                <tr>
                <th>Length</th>
                <th>Travel time</th>
                </tr>
            </thead>
                <tbody>
                {showFsp  && 
                <tr style={{backgroundColor: "#014f9855"}}>
                    <td>{fpLengthAndTime.fsp[0]}</td>
                    <td>{fpLengthAndTime.fsp[1]}</td>
                </tr>}
                {showFfp  && 
                <tr style={{backgroundColor: "#f2920352"}}>
                    <td>{fpLengthAndTime.ffp[0]}</td>
                    <td>{fpLengthAndTime.ffp[1]}</td> 
                </tr>}

                </tbody>
            </table>}
        </div>
        }

        <hr  className='mb-4'></hr>
            <div className='section-row'>
                <div>Start</div>
                {fpStart? `(${fpStart.x},${fpStart.y})`: ""}
                <button className="pb-ex3 bt-ex3" onClick={() => handleOnChangePointTo("start")}>+</button>
            </div>
            <div className='section-row'>
                <div>End &nbsp;</div>
                {fpEnd? `(${roundTo2(fpEnd.x)},${fpEnd.y})`: ""}
                <button className="pb-ex3 bt-ex3" onClick={() => handleOnChangePointTo("end")}>+</button>
            </div>
            <div className='section-row mt-4'>
                <button className="btn section-btn-2" type="button" onClick={handleCancel}>Cancel</button>  
                <button className="btn section-btn-2" type="button" onClick={handleStartAlgo}>Start</button>       
            </div> 

        </Section>
        
    );
}