//why does this work 😭
import * as sat from "https://cdn.jsdelivr.net/npm/satellite.js@4.0.0/+esm";
const satellite = sat.default ?? sat;


console.log(satellite);
Cesium.Ion.defaultAccessToken = "";

// hides all the unnecessary stuff, note that we need to add a credits page for CesiumJS / providers later
const viewer = new Cesium.Viewer("cesiumContainer", {
  animation: false,
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

const ISS_TLE = 
    `1 25544U 98067A   26020.17509289  .00021194  00000+0  38548-3 0  9998
    2 25544  51.6334 312.1983 0007785  38.3265 321.8276 15.49442598548811`;
// Initialize the satellite record with this TLE (splits into two lines)
const satrec = satellite.twoline2satrec(
  ISS_TLE.split('\n')[0].trim(), 
  ISS_TLE.split('\n')[1].trim()
);


let position = null; //prevent scope issues

//converts from Cesium time -> JS time format
const date = Cesium.JulianDate.toDate(viewer.clock.currentTime);
// Get the position, velocity of the satellite at the given date using TLE
const pv = satellite.propagate(satrec, date); 
if (!pv.position) {
  console.warn("pv is invalid")
} else {
  // convert into Cesium-usable form: eci -> geodetic then (radians, km) -> (degrees, m)
  const gmst = satellite.gstime(date);
  const geo = satellite.eciToGeodetic(pv.position, gmst);

  //check if data valid
  if (
    !Number.isFinite(geo.longitude) ||
    !Number.isFinite(geo.latitude) ||
    !Number.isFinite(geo.height)
  ) {
    console.warn("geo data is invalid")
  } else {
    //re-format position to version with updated units (degrees, m)
    position = Cesium.Cartesian3.fromDegrees(
      Cesium.Math.toDegrees(geo.longitude),
      Cesium.Math.toDegrees(geo.latitude),
      geo.height * 1000
    ); 
  }
}

//display iss as an entity (FIXED POINT IN SPACE)
const iss = viewer.entities.add({
  position,
  point: {
    pixelSize: 8,
    color: Cesium.Color.YELLOW
  }
})

alert("Double click entities to focus on them")

