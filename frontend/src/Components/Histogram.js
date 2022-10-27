import * as d3 from "d3";
import '../Style/Histogram.css';

export const Histogram = ({dataList}) => {
    let margin = {top: 10, right: 30, bottom: 45, left: 48};
    let width = 350 - margin.left - margin.right;
    let height = 400 - margin.top - margin.bottom;

    let data = []
    for(let i = 0; i < dataList.length; i++){
        data.push({index: i, value: dataList[i]});
    }

    let bandWidth = width/data.length;
    let x = d3.scaleLinear()
    .domain([0, data.length-1 + 0.6])     
    .range([0, width]);

    let y = d3.scaleLinear()
    .range([height, 0]);
    y.domain([0, d3.max(data, function(d){return d.value})]);   

    let ticks = x.ticks().filter(tick => Number.isInteger(tick));

    return(
        <svg id="degreeDistribution" width={width + margin.left + margin.right} height={height + margin.top + margin.bottom}>
            <g transform={`translate(${margin.left}, ${margin.top})`}>
                {ticks.map(tickValue => (
                    <g key={tickValue} transform={`translate(${x(tickValue) + bandWidth/2}, ${0})`}>
                        <line y1={height} y2={height+3} stroke="black"/>
                        <text style={{textAnchor: 'middle'}}  dy="1em" y={height + 3}>{tickValue}</text>
                    </g>
                ))}
                <text 
                    className="text"
                    textAnchor="middle"
                    x={width/2}
                    y={height + 26}
                    dy=".71em">Node Degree</text>

                {y.ticks().map(tickValue => (
                    <g key={tickValue} transform={`translate(0, ${y(tickValue)})`}>
                        <line 
                            className="tickColor"
                            x2={width+bandWidth/2} 
                        />
                        <text 
                            style={{textAnchor: 'end'}} 
                            x={-3} 
                            dy=".71em">{tickValue} </text>
                    </g>
                ))}
                <text 
                    className="text"
                    textAnchor="middle"
                    transform={`rotate(-90) translate(${0-height/2}, ${-46})`}
                    dy=".71em">Number of nodes
                </text>
                {data.map(d => (
                    <rect 
                        className="bars"
                        key={d.index} 
                        x={x(d.index) + 2.5} 
                        y={y(d.value)} 
                        width={bandWidth - 5} 
                        height={height - y(d.value)}
                    >
                    <title>{Math.round(d.value)}</title>
                    </rect>))}
            </g>
        </svg>
    );
}
