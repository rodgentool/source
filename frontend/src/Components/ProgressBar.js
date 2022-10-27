import { useEffect, useState} from "react";
export const ProgressBar = () => {
    const [progress, setProgress] = useState(0)
    
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress((progress + 10)%100);
            }, 600);
            return () => clearInterval(interval); 
    }, [progress])
    
    const container = {
        position: 'relative',
        height: 20,
        width: 300,
        backgroundColor: "#E5E6E5",
        borderRadius: 4,
        margin: 'auto',
      };
    
      const filler = {
        height: 20,
        position: 'absolute',
        width: 30,
        left: `${progress}%`,
        backgroundColor: "#1fcacabb",
        textAlign: "right",
        borderRadius: 4,
        transition: 'left',
   
      };

    return (<div style={container}>
    <div style={filler}></div>
  </div>)
}