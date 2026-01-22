// why does this work 😭
import * as sat from "https://cdn.jsdelivr.net/npm/satellite.js@4.0.0/+esm";
const satellite = sat.default ?? sat;

console.log(satellite);
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

//this chunk of code is to render the ISS in orbit moving as a point
//note this is NOT OPTIMISED and is just a demo (since uses callback property to update)

//dummy data
const ISS_TLE = 
    `1 25544U 98067A   26020.17509289  .00021194  00000+0  38548-3 0  9998
    2 25544  51.6334 312.1983 0007785  38.3265 321.8276 15.49442598548811`;
// Initialise the satellite record with this TLE
const satrec = satellite.twoline2satrec(
  ISS_TLE.split('\n')[0].trim(), 
  ISS_TLE.split('\n')[1].trim()
);

let lastCartesian = undefined;

//use callback property to update position every time Cesium references the position (i.e. every tick)
const issEntity = viewer.entities.add({
  position: new Cesium.CallbackProperty((time, result) => {
    //need to convert date into JulianData
    const date = Cesium.JulianDate.toDate(time);
    
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
  }, false),

  //define it as a point in space
  point: {
    pixelSize: 15,
    color: Cesium.Color.YELLOW
  }
});


alert("Double click entities to focus on them")