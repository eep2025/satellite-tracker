import * as sat from "https://cdn.jsdelivr.net/npm/satellite.js@4.0.0/+esm";
import { classifyFromTLE, colorFromClassification, interpolate} from "./utils.js";
import { state } from "./state.js";
const satjs = sat.default ?? sat;

export async function initialise() {
    //get TLE data from frontend at /satellites
    const response = await fetch("/all_tles");

    if (!response.ok) {
        throw new Error("Error recieving data from backend:"+response.status);
    }

    state.TLEdata = await response.json()

    //fill satellites array, intialise primitives
    for (const [name, tle1, tle2] of  state.TLEdata) {

        //*This might be confusing - just know that we have two different references for satellitePrimitive (one in state.satellites, other in state.points)
        const classification = classifyFromTLE(name);
        const satellitePrimitive = createOrbitalPrimitive(name, classification);



        state.satellites.set(name, {
            tle1, 
            tle2, 
            satellitePrimitive, 
            classification,
            lastCartesian: new Cesium.Cartesian3(   )
            });

    }


    console.log("Initialisation complete.")

    //update satellite position every n ticks
    let intervalTime = 0.1; //seconds
    let lastUpdateTime = undefined;

    state.viewer.clock.onTick.addEventListener((clock) => {
        if (!state.firstSnapshotArrived) return;

        if (state.viewer.clock.multiplier > 100) {
            intervalTime = 5;
        } else if (intervalTime > 1) {
            intervalTime = 1;
        }

        if (!lastUpdateTime) {
            lastUpdateTime = clock.currentTime;
            return;
        }

        const deltaTime = Cesium.JulianDate.secondsDifference(
            clock.currentTime,
            lastUpdateTime
        );

        if (deltaTime >= intervalTime) {
            lastUpdateTime = clock.currentTime;
            updateAllPositions();
        }
    })
}


//no longer updates position of satellite primitive, just initialises entity
export function createOrbitalPrimitive(name, classification=undefined) {
//If already exists, re-initialise
    if (state.satellites.has(name)) {
        //update to default
        const satellite = state.satellites.get(name);
        const color = colorFromClassification(satellite.classification);
        const satellitePrimitive = getPrimitivePoint(name);
        satellitePrimitive.pixelSize = 6;
        satellitePrimitive.color = color;
        return satellitePrimitive;
    } else {
        //initialise
        
        const color = colorFromClassification(classification);
        const satellitePrimitive = state.points.add({
            id: name,
            position: new Cesium.Cartesian3(),
            pixelSize: 6,
            color: color,
            show: false
        });

        return satellitePrimitive;
    }
}


//get the primitive point from state.points by name
//? might be unnecessary, just makes it easier to read ig
export function getPrimitivePoint(name) {
    return state.satellites.get(name).satellitePrimitive;
}

function getLastCartesian(name) {
    return state.satellites.get(name).lastCartesian;
}

export function updateAllPositions() {
    const now = Date.now();
    
    for (let i = 0; i < state.sat_count; i++) {
        //A = current position, B = next position
        const { x:Ax , y:Ay , z:Az , t:At} = state.currentPositions[i]; //get pos, time from backend
        const { x:Bx , y:By , z:Bz , t:Bt} = state.nextPositions[i];
        
        //get id to get primitive object
        const id = state.i_to_ids[i]; 
        const satellitePrimitive = getPrimitivePoint(id);
        const lastCartesian = getLastCartesian(id)

        if (!state.satellites.has(id)) {
            console.warn("No primitive for id:", id, "typeof:", typeof id);
            continue;
        }

        //use linear interpolation to get smoother display of points (accounts for variations in transmission time)
        const {x,y,z} = interpolate(Ax,Ay,Az,At,Bx,By,Bz,Bt, now);

        lastCartesian.x = x;
        lastCartesian.y = y;
        lastCartesian.z = z;

        //update primitive's position
        satellitePrimitive.position = lastCartesian;


        //?ADD HIDE ENTITY FUNCTION HERE
        satellitePrimitive.show = true;

        if (i == 1) console.log(id, i,x,y,z, satellitePrimitive);
    }
}










//!Using primitives instead of entitites now, see createorbitalPrimitive
//to initialise / reset a satellite entity 
function createOrbitalEntity(name, position=undefined, satrec=undefined, tle1=undefined, tle2=undefined ) {
    //If already exists, re-initialise
    if (state.satellites.has(name)) {
        //update to default
        const satellite = state.satellites.get(name);
        const color = colorFromClassification(satellite.satellite_object.properties.classification.getValue());
        satellite.satellite_object.point = {
                pixelSize: 6,
                color: color
        };
        return satellite.satellite_object;
    } else {
        //initialise
        //If position given, then used, else satrec is used. If no satrec then check for tle1/tle2, else raise err
        if (!position) {
            if (!satrec) {
                if (!tle1 || !tle2) {
                    throw new Error("No possible position to be used to initalise satellite")
                }
                satrec = satjs.twoline2satrec(tle1, tle2);
            }

            position = new Cesium.Cartesian3();
            position = getFormattedPosition(satrec, Cesium.JulianDate.toDate(state.viewer.clock.currentTime), position);
        }

        const classification = classifyFromTLE(name);
        
        const color = colorFromClassification(classification);
        const satellite_object = state.viewer.entities.add({
            position: position,
            point: {
                pixelSize: 6,
                color: color
            },
            properties: {
                classification: classification,
                name: name
            }
        });
        return satellite_object;
    }
}

//!updating positions from snapshots from frontend now, done within updateAllPositions
//returns formatted     position from satrec + date (satrec is satellite.js form of TLE data)
//date is JulianDate
function getFormattedPosition(satrec, date, lastCartesian) {
    lastCartesian = lastCartesian ?? new Cesium.Cartesian3()

    //get pos + velocity from TLE data
    const pv = satjs.propagate(satrec, date);
    if (!pv.position) return lastCartesian;

    //check position is valid else render error
    const { x, y, z } = pv.position;
    if (![x, y, z].every(Number.isFinite)) return lastCartesian;

    lastCartesian.x = x * 1000;
    lastCartesian.y = y * 1000;
    lastCartesian.z = z * 1000;


    const julianDate = Cesium.JulianDate.fromDate(date)
    const temeToFixed = Cesium.Transforms.computeTemeToPseudoFixedMatrix(julianDate);

    if (Cesium.defined(temeToFixed)) {
        Cesium.Matrix3.multiplyByVector(
            temeToFixed,
            lastCartesian,
            lastCartesian
        );
    }

    return lastCartesian;
}

//!old createObritalPrimitive
function createOrbitalPrimitiveOLD(name, classification=undefined, position=undefined, satrec=undefined, tle1=undefined, tle2=undefined) {
//If already exists, re-initialise
    if (state.satellites.has(name)) {
        //update to default
        const satellite = state.satellites.get(name);
        const color = colorFromClassification(satellite.classification);
        const satellitePrimitive = getPrimitivePoint(name);
        satellitePrimitive.pixelSize = 6;
        satellitePrimitive.color = color;
        return satellitePrimitive;
    } else {
        //initialise
        //If position given, then used, else satrec is used. If no satrec then check for tle1/tle2, else raise err
        if (!position) {
            if (!satrec) {
                if (!tle1 || !tle2) {
                    throw new Error("No possible position to be used to initalise satellite")
                }
                satrec = satjs.twoline2satrec(tle1, tle2);
            }

            position = new Cesium.Cartesian3();
            position = getFormattedPosition(satrec, Cesium.JulianDate.toDate(state.viewer.clock.currentTime), position);
        }
        
        const color = colorFromClassification(classification);
        const satellitePrimitive = state.points.add({
            id: name,
            position,
            pixelSize: 6,
            color: color
        });

        return satellitePrimitive;
    }
}

//!old updateAllPositions
function updateAllPositionsOLD(date = Cesium.JulianDate.toDate(state.viewer.clock.currentTime)){
    for (const sat of state.satellites.values()) {
        const pos = getFormattedPosition(sat.satrec, date, sat.lastCartesian);
        if (pos) {
            sat.satellitePrimitive.position = pos;
            sat.lastCartesian = pos;
        }
    }
} 