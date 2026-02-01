import * as sat from "https://cdn.jsdelivr.net/npm/satellite.js@4.0.0/+esm";
import { classifyFromTLE } from "./utils.js";
import { state } from "./state.js";
const satjs = sat.default ?? sat;

export async function initialise() {
    //get TLE data from frontend at /satellites
    const response = await fetch("/all_tles");

    if (!response.ok) {
        throw new Error("Error recieving data from backend:"+response.status);
    }

    state.TLEdata = await response.json()

    //fill satellites array
    for (const [name, tle1, tle2] of  state.TLEdata) {
        const satrec = satjs.twoline2satrec(tle1, tle2);

        let pos = new Cesium.Cartesian3();
        pos = getFormattedPosition(satrec, Cesium.JulianDate.toDate(state.viewer.clock.currentTime), pos);

        //TODO can change color upon initialisation later 
        const satellite_object = createOrbitalEntity(name, pos)

        state.satellites.set(name, {
            tle1, 
            tle2, 
            satrec, 
            satellite_object, 
            lastCartesian: pos});

    }

    //update satellite position every tick
    state.viewer.clock.onTick.addEventListener((clock) => {
        updateAllPositions(Cesium.JulianDate.toDate(clock.currentTime));
    })

}

//to initialise / reset a satellite entity 
export function createOrbitalEntity(name, position=undefined, satrec=undefined, tle1=undefined, tle2=undefined ) {
    //If already exists, re-initialise
    if (state.satellites.has(name)) {
        //update to default
        const satellite = state.satellites.get(name);
        const classification = satellite.satellite_object.properties.classification.getValue()
        const color = classification.color;
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
        
        const color = classification.color;
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

//returns formatted     position from satrec + date (satrec is satellite.js form of TLE data)
//date is JulianDate
export function getFormattedPosition(satrec, date, lastCartesian) {
    lastCartesian = lastCartesian ?? new Cesium.Cartesian3()

    //get pos + velocity from TLE data
    const pv = satjs.propagate(satrec, date);
    if (!pv.position) return lastCartesian ?? new Cesium.Cartesian3();

    //check position is valid else render error
    const { x, y, z } = pv.position;
    if (![x, y, z].every(Number.isFinite)) return lastCartesian ?? new Cesium.Cartesian3();

    //convert from eci to geodetic so Cesium can work w/ position 
    const gmst = satjs.gstime(date);
    const geo = satjs.eciToGeodetic(pv.position, gmst);

    //check position is valid again
    if (
    !Number.isFinite(geo.longitude) ||
    !Number.isFinite(geo.latitude) ||
    !Number.isFinite(geo.height)
    ) {
        return lastCartesian ?? new Cesium.Cartesian3();
    }

    lastCartesian = Cesium.Cartesian3.fromRadians(
      geo.longitude,
      geo.latitude,
      geo.height * 1000
    );

    return lastCartesian;
}

//TODO #43 improve efficiency
export function updateAllPositions(date = Cesium.JulianDate.toDate(state.viewer.clock.currentTime)){
    for (const sat of state.satellites.values()) {
        const pos = getFormattedPosition(sat.satrec, date, sat.lastCartesian);
        if (pos) {
            sat.satellite_object.position.setValue(pos);
            sat.lastCartesian = pos;
        }
    }
} 