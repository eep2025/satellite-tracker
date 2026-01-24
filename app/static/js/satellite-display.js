import * as sat from "https://cdn.jsdelivr.net/npm/satellite.js@4.0.0/+esm";
const satellite = sat.default ?? sat;

Cesium.Ion.defaultAccessToken = "";

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

let satellites = [];
let TLEdata = [];

async function initialise() {
    //get TLE data from frontend at /satellites
    TLEdata = await fetch("/satellites").then(r => r.json());

    //fill satellites array
    for (const [noradID, tle1, tle2] of  TLEdata) {
        const satrec = satellite.twoline2satrec(tle1, tle2);
        
        const pos = getFormattedPosition(satrec, Cesium.JulianDate.toDate(viewer.clock.currentTime));
        
        //TODO can change colour upon initialisation later 
        const satellite_object = viewer.entities.add({
            position: pos,
            point: {
                pixelSize: 6,
                color: Cesium.Color.YELLOW
            }
        })

        satellites.push({noradID, tle1, tle2, satrec, satellite_object});

    }

    //update satellite position every tick
    viewer.clock.onTick.addEventListener(() => {
        updateAllPositions()
    })

}

//variable for error prevention
let lastCartesian = undefined;
//returns formatted position from satrec + date (satrec is satellite.js form of TLE data)
//date is JulianDate
function getFormattedPosition(satrec, date) {
    //get pos + velocity from TLE data
    const pv = satellite.propagate(satrec, date);
    if (!pv.position) return lastCartesian;

    //check position is valid else render error
    const { x, y, z } = pv.position;
    if (![x, y, z].every(Number.isFinite)) return lastCartesian;

    //convert from eci to geodetic so Cesium can work w/ position 
    const gmst = satellite.gstime(date);
    const geo = satellite.eciToGeodetic(pv.position, gmst);

    //check position is valid again
    if (
    !Number.isFinite(geo.longitude) ||
    !Number.isFinite(geo.latitude) ||
    !Number.isFinite(geo.height)
    ) {
        return lastCartesian;
    }

    //convert geodetic data into proper format (degrees, m from radians, km)
    lastCartesian = Cesium.Cartesian3.fromDegrees(
    Cesium.Math.toDegrees(geo.longitude),
    Cesium.Math.toDegrees(geo.latitude),
    geo.height * 1000
    );

    return lastCartesian;
    
}

function updateAllPositions(date = Cesium.JulianDate.toDate(viewer.clock.currentTime)){
    for (const sat of satellites) {
        sat.satellite_object.position = getFormattedPosition(sat.satrec, date);
    }
}


//initialise satellites
initialise();


