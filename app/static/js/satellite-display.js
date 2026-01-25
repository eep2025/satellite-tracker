import * as sat from "https://cdn.jsdelivr.net/npm/satellite.js@4.0.0/+esm";
const satjs = sat.default ?? sat;

Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4NmMwNTM0Mi1iOWQxLTRhMWUtYWMxMi1hYTdlNWMwM2FiMGIiLCJpZCI6MzgwODU0LCJpYXQiOjE3Njg5MTYyMDZ9.32VeuCYaBrxcpWbbpFXpewSenXWl_LLmaFRC0SnrhVY";

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
//removes 

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
function initialise_satellite(name, position=undefined, satrec=undefined, tle1=undefined, tle2=undefined ) {
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
                    console.error("No possible position to be used to initalise satellite")
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
    TLEdata = await fetch("/satellites").then(r => r.json());

    //fill satellites array
    for (const [name, tle1, tle2] of  TLEdata) {
        const satrec = satjs.twoline2satrec(tle1, tle2);

        let pos = new Cesium.Cartesian3();
        pos = getFormattedPosition(satrec, Cesium.JulianDate.toDate(viewer.clock.currentTime), pos);

        //TODO can change color upon initialisation later 
        const satellite_object = initialise_satellite(name, pos)

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

//returns formatted position from satrec + date (satrec is satellite.js form of TLE data)
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

//TODO improve efficiency
function updateAllPositions(date = Cesium.JulianDate.toDate(viewer.clock.currentTime)){
    for (const sat of satellites.values()) {
        const pos = getFormattedPosition(sat.satrec, date, sat.lastCartesian);
        if (pos) {
            sat.satellite_object.position.setValue(pos);
            sat.lastCartesian = pos;
        }
    }
}


//initialise satellites
initialise();

//handles when entity is clicked
let handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
handler.setInputAction(function (click) {
    const pickedObject = viewer.scene.pick(click.position);

    if (!Cesium.defined(pickedObject) || !(pickedObject.id instanceof Cesium.Entity)) {
        return;
    }

    // shrink previously selected
    if (currentEntity && currentEntity.point) {
        currentEntity.point = new Cesium.PointGraphics({
            pixelSize: 6,
            color: viewer.selectedEntity.point.color
        });
    }

    // select new
    currentEntity = pickedObject.id;
    currentEntity.point = new Cesium.PointGraphics({
        pixelSize: 10,
        color: viewer.selectedEntity.point.color
    });
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);


