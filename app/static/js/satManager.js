import { classifyFromTLE, colorFromClassification, interpolate } from "./utils.js";
import { shouldRenderPrimitive } from "./filter_handler.js";
import { state } from "./state.js";

export async function initialise() {
    //get TLE data from frontend at /satellites
    const response = await fetch("/all_tles");

    if (!response.ok) {
        throw new Error("Error recieving data from backend:"+response.status);
    }

    state.TLEdata = await response.json()

    //fill satellites array, intialise primitives
    for (const [name, tle1, tle2, norad] of state.TLEdata) {

        //*This might be confusing - just know that we have two different references for satellitePrimitive (one in state.satellites, other in state.points)
        const classification = classifyFromTLE(name);
        const satellitePrimitive = createOrbitalPrimitive(name, classification);

        state.satellites.set(name, {
            tle1, 
            tle2, 
            satellitePrimitive, 
            classification,
            lastCartesian: new Cesium.Cartesian3()
            });
    }

    console.log("Loaded all satellites")

    //update satellite position every n ticks
    let intervalTime = 0.025; //seconds
    let lastUpdateTime = undefined;

    //update primitive positions every intervalTime
    state.viewer.clock.onTick.addEventListener((clock) => {
        if (!state.firstSnapshotArrived) return;

        if (state.viewer.clock.multiplier > 100) {
            intervalTime = 5;
        } else if (intervalTime > 1) {
            intervalTime = 0.025;
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
            pixelSize: 7,
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
        
        //get id to get primitive object
        const id = state.i_to_ids[i]; 
        const satellitePrimitive = getPrimitivePoint(id);
        if (!shouldRenderPrimitive(satellitePrimitive)) {
            satellitePrimitive.show = false
            continue
        }
        const lastCartesian = getLastCartesian(id)

        //A = current position, B = next position
        const { x:Ax , y:Ay , z:Az , t:At} = state.currentPositions[i]; //get pos, time from backend
        const { x:Bx , y:By , z:Bz , t:Bt} = state.nextPositions[i];
        //use linear interpolation to get smoother display of points (accounts for variations in transmission time)
        const {x,y,z} = interpolate(Ax,Ay,Az,At,Bx,By,Bz,Bt, now);

        lastCartesian.x = x;
        lastCartesian.y = y;
        lastCartesian.z = z;
        //update primitive's position
        satellitePrimitive.position = lastCartesian;


        //?ADD HIDE ENTITY FUNCTION HERE
        if (shouldRenderPrimitive(satellitePrimitive)) satellitePrimitive.show = true;
    }
}

//resets propagatedEntity
export function createPropagatedEntity(color, SampledPositionProperty, id, PROPAGATION_DURATION) {
    //note: leadTime, trailTime are dependent on frontend constants in snapshot_server.py
    state.currentPropagatedEntity = state.viewer.entities.add({
        position: SampledPositionProperty,

        point: {
            pixelSize: 12,
            color: color
        },

        path: {
            show: true,
            leadTime: PROPAGATION_DURATION/2,
            trailTime: PROPAGATION_DURATION/2,
            width: 1.5,
            material: Cesium.Color.WHITE
        },

        name: id,
        id: id
    })
}

export function createSampledPositionProperty(positions) {
    let pathPosition = new Cesium.SampledPositionProperty();
    pathPosition.setInterpolationOptions({
        interpolationDegree: 5,
        interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
    });

    for (let i = 0; i < positions.length; i++) {
        let pos = positions[i];
        let Cartesian3Pos = new Cesium.Cartesian3(pos.x, pos.y, pos.z);
        let julianDate = new Cesium.JulianDate(pos.time)
        pathPosition.addSample(julianDate, Cartesian3Pos);
    }

    return pathPosition
}