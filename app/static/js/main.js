import { selectEntity, lockOn } from "./handlers.js";
import { initialise} from "./satManager.js";
import { state } from "./state.js";
import {} from "./utils.js";
import { initialiseSnapshotCalls } from "./getSnapshots.js";

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

state.points = state.viewer.scene.primitives.add(
  new Cesium.PointPrimitiveCollection()
);

//!DEBUG SETTINGS
state.viewer.scene.debugShowFramesPerSecond = true;

//start getting snapshots from frontend
await initialiseSnapshotCalls()
//initialise satellites. Uses await so better bug prevention
await initialise();



console.log("points collection:", !!state.points, "length:", state.points.length);
console.log("satellite count map:", state.satellites.size);
console.log("i_to_ids:", state.i_to_ids ? Object.keys(state.i_to_ids).length : undefined);
console.log("currentPositions exists:", !!state.currentPositions);

console.log(state.currentPositions[5])


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
