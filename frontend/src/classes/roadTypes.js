export class RoadTypes {
    /** OK
     * Creates a list/dictionary of roads.
     */
    constructor(init=true) {
        this.nextId = 0;
        this.types = {};
    }

    /** OK
     * Initialize the list with the predefined road types
     */    
    setDefaultRoads(){
        //Default Road types = [[Name, max. speed, predefined color]]
        let defaultRoadsTypes = [
            ['Motorway',        130,    '#33b57d'],
            ['Trunk',            70,    '#33b58e'],
            ['Primary',         100,    '#33b5aa'],
            ['Secondary',        80,    '#33aab5'],
            ['Tertiary',         50,    '#3390b5'],
            ['Unclassified',     30,    '#337ab5'],
            ['Residential',      30,    '#3363b5'],
            ['Motorway Link',   100,    '#3349b5'],
            ['Trunk Link',       50,    '#3533b5'],
            ['Primary Link',     80,    '#4f33b5'],
            ['Secondary Link',   50,    '#5a33b5'],
            ['Tertiary Link',    50,    '#6933b5'],
            ['Living Street',    10,    '#7633b5'],
            ['Service',          30,    '#9033b5'],
        ]
        
        for(let i = 0; i < defaultRoadsTypes.length; i++){
            let roadType = defaultRoadsTypes[i];
            this.types[this.nextId] = new RoadType(this.nextId, roadType[0], roadType[1],roadType[2], 0);
            this.nextId++;
        }
    }

    /**
     * Add a new road type to the list
     * @param {String} name The name of the road type
     * @param {Number} maxSpeed  Maximum speed allowed
     * @param {String} color Color used to highlight roads of this type 
     * @param {Number} [id=this.nextId++] id of the road, default: autoincrement
     */
    addRoadType(name, maxSpeed, color, number=0, id=this.nextId++){
        this.types[id] = new RoadType(id, name, maxSpeed, color, number);
        this.nextId = id > this.nextId? id++ : this.nextId;
        return this.types[id];
    }

    asOptions(){
        let options = []
        //This option arises when selecting several roads with different types
        options.push( <option key="-" value="-" className="hidden">-</option>)
        for (let type in this.types){
            options.push( <option key={this.types[type].id} value={this.types[type].id}>{this.types[type].name}</option>)
        }
        return options;
    }

    toString(){
        let roads = Object.values(this.types)
        let roadTypes = '"roadTypes": [\n'
        for (let i = 0; i < roads.length; i++){
            roadTypes +=  roads[i].toString();
            if (i === roads.length-1){
                roadTypes +=  '\n]'
            }else  roadTypes +=  ',\n'
        }
        return roadTypes;
    }

    findRoadTypeBySpeed(speed){
        for(let typeKey in this.types){
            if(this.types[typeKey].maxSpeed === toString(speed))
                return this.types[typeKey];
        }
        return this.types[0];

    }
}


export class RoadType {
    /** OK
     * Create a new road type
     * @param {Number} id of the Type 
     * @param {String} name The name of the road type
     * @param {Number} maxSpeed Maximum speed allowed
     * @param {String} color Color used to highlight roads of this type
     * @param {Number} number number of roads of this type
     */
    constructor(id, name, maxSpeed, color, number=0){
        this.id=id
        this.name = name;
        this.maxSpeed = maxSpeed;
        this.color = color;
        this.number = number;
    }

    /** OK
     * Increment the number of roads of this type by 1
     */
    increment(){
        this.number++;
    }

    /** OK
     * Decrement the number of roads of this type by 1
     */
    decrement(){
        this.number--;
    }

    setMaxSpeed(newMaxSpeed){
        this.maxSpeed = newMaxSpeed;
    }

    toString(type='json-project'){
        let roadType;
        if(type === 'json-project')
            roadType = `\t{\n\t\t"id": ${this.id}, \n\t\t"name": "${this.name}", \n\t\t"maxSpeed": ${this.maxSpeed}, \n\t\t"color": "${this.color}", \n\t\t"number": ${this.number}\n\t}`
        return roadType;
    }

}



