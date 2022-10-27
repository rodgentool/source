import '../Style/PopUp.css';
import { useCallback, useEffect } from 'react';

export const PopUp = ({
    display,
    prevBtn='Cancel',
    onPrev, 
    children, 
    nextBtn=null, 
    onNext=null}) => {
    const handleKeyDown = useCallback((e) => {
    
        if(e.key === "Escape" || e.key === "Esc"){
            if(onPrev){
                onPrev();
            }
        }
        else if (e.key === "Enter"){
            if(onNext){
                onNext();
            }
        }
    },[onPrev, onNext])


    useEffect(() => {
        if(display){
            document.addEventListener("keydown",  handleKeyDown);
            return () => {
            document.removeEventListener("keydown",  handleKeyDown);
            };
        }
      }, [handleKeyDown, display]);


    return (
        <>{display?
            <div className='popup'>
            <div className='popup_inner'>
                {children}
                <div className="btnWarpper">
                    {onPrev && <button className="btn btn-newProject" type="button" onClick={onPrev}>{prevBtn}</button>}
                    {onNext && <button className="btn btn-newProject" type="button" onClick={onNext}>{nextBtn}</button>}
                   
                </div>
               
            </div>
            </div>
            :null}
        </>
      );
}