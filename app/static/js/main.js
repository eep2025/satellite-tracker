import { selectEntity, lockOn } from "./handlers.js";
import { initialise} from "./satManager.js";
import { state } from "./state.js";
import { initialiseSnapshotCalls } from "./getSnapshots.js";
import { initFilters } from "./filter_handler.js";
import { initSearchbar } from "./search_handler.js";

// hides all the unnecessary stuff, note that we need to add a credits page for CesiumJS / providers later
state.viewer = new Cesium.Viewer("cesiumContainer", {
  animation: false,
  timeline: false,
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
state.viewer.clock.shouldAnimate = true;

state.points = state.viewer.scene.primitives.add(
  new Cesium.PointPrimitiveCollection()
);

//!DEBUG SETTINGS
state.viewer.scene.debugShowFramesPerSecond = false;

//start getting snapshots from backend
await initialiseSnapshotCalls()
// set up satellites
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

initFilters()
initSearchbar()

let playPauseButton = document.getElementById("play-pause")
const indicator = document.getElementById("playPauseIndicator")
let isPlaying = true
document.getElementById("play-pause").addEventListener("click", (e) => {
  console.log('listener ran')
  isPlaying = !isPlaying
  state.viewer.clock.shouldAnimate = isPlaying;
  playPauseButton.classList.toggle("outline-paused")
  indicator.classList.toggle("bi-pause")
  indicator.classList.toggle("bi-play")
})