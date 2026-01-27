// why does this work 😭
import * as sat from "https://cdn.jsdelivr.net/npm/satellite.js@4.0.0/+esm";
const satellite = sat.default ?? sat;

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


//this chunk of code is to render the ISS in orbit w/ a trajectory

//dummy data
const ISS_TLE = 
    `1 25544U 98067A   26020.17509289  .00021194  00000+0  38548-3 0  9998
    2 25544  51.6334 312.1983 0007785  38.3265 321.8276 15.49442598548811`;
// Initialise the satellite record with this TLE
const satrec = satellite.twoline2satrec(
  ISS_TLE.split('\n')[0].trim(), 
  ISS_TLE.split('\n')[1].trim()
);

//this is a better way of rendering satellites as it doesn't use a callback property
//hence it is more reliable as it calculates data beforehand and then plots the satellite at that time on the curve

//pathPosition is a list which stores orbital data as (time, position)
const pathPosition = new Cesium.SampledPositionProperty();
pathPosition.setInterpolationOptions({
  interpolationDegree: 5,
  interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
});

//smaller step = more accurate but slower
//if want to change total length of trajectory, edit both durationSeconds and iss.path.trailTime / iss.path.leadTime
const start = Cesium.JulianDate.now();
const durationSeconds = 90 * 60;
const stepSeconds = 10;

//getting all of the (time, position) points
//change the conditions of the for loop to alter start/stop of trajectory prediction. Only predicted once upon initialisation
for (let t = -durationSeconds; t <= durationSeconds; t += stepSeconds) {
  //add t to the start date and format using JulianDate object (Cesium format)
  const time = Cesium.JulianDate.addSeconds(
    start,
    t,
    new Cesium.JulianDate()
  );

	//convert time from Cesium format to JS-style
  const date = Cesium.JulianDate.toDate(time);
	//get position + velocity from TLE using satellite.js (wrong format though!)
  const pv = satellite.propagate(satrec, date);
  if (!pv.position) continue;

	//convert position from eci to geodetic (so Cesium can work with it)
  const gmst = satellite.gstime(date);
  const geo = satellite.eciToGeodetic(pv.position, gmst);

	//error checks
  if (
    !Number.isFinite(geo.longitude) ||
    !Number.isFinite(geo.latitude) ||
    !Number.isFinite(geo.height)
  ) continue;

	//final conversion to format data (radians, km -> degrees, m)
  const cartesian = Cesium.Cartesian3.fromDegrees(
    Cesium.Math.toDegrees(geo.longitude),
    Cesium.Math.toDegrees(geo.latitude),
    geo.height * 1000
  );
	
	//add calculated position to collection of points
  pathPosition.addSample(time, cartesian);
}

//add satellite entity. Note should be able to change color based on satellite type 
const iss = viewer.entities.add({
  position: pathPosition,

  point: {
    pixelSize: 8,
    color: Cesium.Color.YELLOW
  },

  path: {
    show: true,
    leadTime: 90 * 60,
    trailTime: 90 * 60,
    width: 1,
    material: Cesium.Color.GRAY
  }
});

/*
Final notes:
- Can easily implement code as functions, then use for large amounts of data as slightly optimised
(optimised because we pre-calculate trajectory as curve instead of updating every tick)
- When implementing code as functions, include ability to re-calculate trajectory every x seconds
- Need to find way of getting data from backend (using Flask / Jinja2 likely)
*/

alert("Double click entities to focus on them")