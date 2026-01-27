import { selectEntity, lockOn } from "./handlers.js";
import { initialise, createOrbitalEntity, getFormattedPosition, updateAllPositions } from "./satManager.js";
import { state } from "./state.js";
import { classificationColors, classifications, classifyFromTLE, colorFromClassification } from "./utils.js";

Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyYjU2YTIyMC0yYmMwLTQ0ZDctYjAxYy01YjUwYjMzNGYxOWEiLCJpZCI6MzgwODU0LCJpYXQiOjE3Njk1MzUzMjV9.OCXHxRj4Bi4YgdWI2H5j8mRyqlqAHlEhr0rumO4370k";

// hides all the unnecessary stuff, note that we need to add a credits page for CesiumJS / providers later
state.viewer = new Cesium.Viewer("cesiumContainer", {
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
state.viewer.cesiumWidget.creditContainer.style.display = "none"; 
// animates upon start by default
// ?SHOULD WE PLACE THIS AT THE END OF initialise()? 
state.viewer.clock.shouldAnimate = true;

//initialise satellites. Uses await so better bug prevention
await initialise();

//*******/
//HANDLERS
//*******/

//handles when entity is clicked
let handler = new Cesium.ScreenSpaceEventHandler(state.viewer.scene.canvas);

//select entity when left click
handler.setInputAction(selectEntity, Cesium.ScreenSpaceEventType.LEFT_CLICK);

//removes default action when double clicking an entity
state.viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
);
//new action when double clicking
handler.setInputAction(lockOn, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
