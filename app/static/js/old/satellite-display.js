import * as sat from "https://cdn.jsdelivr.net/npm/satellite.js@4.0.0/+esm";
const satjs = sat.default ?? sat;

// hides all the unnecessary stuff, note that we need to add a credits page for CesiumJS / providers later
const viewer = new Cesium.Viewer("cesiumContainer", {
  animation: true,
  timeline: true,
  geocoder: false,
  homeButton: false,
  sceneModePicker: false,
  baseLayerPicker: false,
  navigationHelpButton: false,
  infoBox: false,
  fullscreenButton: false,
  vrButton: false,
  selectionIndicator: false,
  terrain: Cesium.Terrain.fromWorldTerrain(), //renders terrain
});

// removes menu icons / watermark
viewer.cesiumWidget.creditContainer.style.display = "none"; 
// animates upon start by default
// ?SHOULD WE PLACE THIS AT THE END OF initialise()? 
viewer.clock.shouldAnimate = true;
viewer.clock.animation

//using Map() for O(1) lookup speed (faster)
const satellites = new Map();
let TLEdata = [];
const classificationColors = Object.freeze({
    StarLink: Cesium.Color.CYAN,
    OneWeb: Cesium.Color.ORANGE,
    Iridium: Cesium.Color.GREEN,
    GPS: Cesium.Color.YELLOW,
    unknown: Cesium.Color.GRAY
});
const classifications = Object.freeze({
    STARLINK: "StarLink",
    ONEWEB: "OneWeb",
    IRIDIUM: "Iridium",
    GPS: "GPS",
    UNKNOWN: "unknown"
});

//used for currently selected entity
let currentEntity = null;

//used to decode TLE data to get classification
//TODO #40 make this more robust using Inclination / Altitude / Mean motion data
function classifyFromTLE(tleName) {
  const name = (tleName || "").toUpperCase().trim();

  if (name.startsWith("STARLINK")) return classifications.STARLINK;
  if (name.startsWith("ONEWEB") || name.startsWith("OW-")) return classifications.ONEWEB;
  if (name.startsWith("IRIDIUM")) return classifications.IRIDIUM;
  if (name.startsWith("GPS") || name.startsWith("NAVSTAR")) return classifications.GPS;

  return classifications.UNKNOWN;
}

function colorFromClassification(classification) {
    return classificationColors[classification] || Cesium.Color.WHITE;
}



//to initialise / reset a satellite entity 
function create_orbital_entity(name, position=undefined, satrec=undefined, tle1=undefined, tle2=undefined ) {
    //If already exists, re-initialise
    if (satellites.has(name)) {
        //update to default
        const satellite = satellites.get(name);
        const color = colorFromClassification(satellite.satellite_object.properties.classification);
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
            position = getFormattedPosition(satrec, Cesium.JulianDate.toDate(viewer.clock.currentTime), position);
        }

        const classification = classifyFromTLE(name);
        
        const color = colorFromClassification(classification);
        const satellite_object = viewer.entities.add({
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


async function initialise() {
    //get TLE data from frontend at /satellites
    const response = await fetch("/all_tles");

    if (!response.ok) {
        throw new Error("Error recieving data from backend:"+response.status);
    }

    TLEdata = await response.json()

    //fill satellites array
    for (const [name, tle1, tle2] of  TLEdata) {
        const satrec = satjs.twoline2satrec(tle1, tle2);

        let pos = new Cesium.Cartesian3();
        pos = getFormattedPosition(satrec, Cesium.JulianDate.toDate(viewer.clock.currentTime), pos);

        //TODO can change color upon initialisation later 
        const satellite_object = create_orbital_entity(name, pos)

        satellites.set(name, {
            tle1, 
            tle2, 
            satrec, 
            satellite_object, 
            lastCartesian: pos});

    }

    //update satellite position every tick
    viewer.clock.onTick.addEventListener((clock) => {
        updateAllPositions(Cesium.JulianDate.toDate(clock.currentTime));
    })

}

//returns formatted     position from satrec + date (satrec is satellite.js form of TLE data)
//date is JulianDate
function getFormattedPosition(satrec, date, lastCartesian) {
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
function updateAllPositions(date = Cesium.JulianDate.toDate(viewer.clock.currentTime)){
    for (const sat of satellites.values()) {
        const pos = getFormattedPosition(sat.satrec, date, sat.lastCartesian);
        if (pos) {
            sat.satellite_object.position.setValue(pos);
            sat.lastCartesian = pos;
        }
    }
}

function selectEntity(click, pickedObject=undefined, force=false) {
    //don't allow reselection if locked on 
    if (lockedOn && !force) {return;}

    pickedObject = pickedObject || viewer.scene.pick(click.position);

    //if click on non-entity, shrink prev selected to normal
    if (!Cesium.defined(pickedObject) || !(pickedObject.id instanceof Cesium.Entity)) {
        if (currentEntity && currentEntity.point) {
            currentEntity.point.pixelSize = 6;
        }
        currentEntity = null;
        return;
    }

    // shrink previously selected
    if (currentEntity && currentEntity.point) {
        currentEntity.point.pixelSize = 6;
    }

    // select new
    currentEntity = pickedObject.id;
    if (currentEntity.point) {
        currentEntity.point.pixelSize = 10;
    }
}


//initialise satellites. Uses await so better bug prevention
await initialise();


//*******/
//HANDLERS
//*******/

//handles when entity is clicked
let handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

let savedView = undefined;
let lockedOn = false;
let zoomSpeed = 2;

//select entity when left click
handler.setInputAction(selectEntity, Cesium.ScreenSpaceEventType.LEFT_CLICK);


//removes default action when double clicking an entity
viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
);
//new action when double clicking
handler.setInputAction(function (click) {
    const pickedObject = viewer.scene.pick(click.position);

    //handles returning to last Earth-centered position
    if (!Cesium.defined(pickedObject) || !(pickedObject.id instanceof Cesium.Entity)) {
        //prevents re-focusing when not focused
        if (!lockedOn) {
            return;
        }

        viewer.trackedEntity = undefined;

        if (savedView) {
            viewer.camera.flyTo(savedView);
        } else {
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(0, 0, 15_000_000),
                orientation: {
                    heading: 0,
                    pitch: -Cesium.Math.PI_OVER_TWO,
                    roll: 0
                },
                duration: zoomSpeed
            });
        }

        lockedOn = false;
        selectEntity(click)
        return;
    }

    //allows user to return to previous view
    if (!lockedOn) {
        savedView = {
            destination: viewer.camera.positionWC.clone(),
            orientation: {
                heading: viewer.camera.heading,
                pitch: viewer.camera.pitch,
                roll: viewer.camera.roll
            },
            duration: zoomSpeed
        };
    } 

    //responsible for focusing user on entity
    const entity = pickedObject.id;

    viewer.trackedEntity = entity;

    viewer.camera.setView({
        orientation: {
            heading: 0,
            pitch: -Cesium.Math.PI_OVER_TWO,
            roll: 0
        }
    });

    lockedOn = true;
    selectEntity(click, pickedObject, true)
}, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
