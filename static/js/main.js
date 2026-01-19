Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3NDgzNjM5NC1lZjA0LTRmMTUtODgxMS1jYjYyNzE5NWU2ZDYiLCJpZCI6MzgwODU0LCJpYXQiOjE3Njg4NDQ5MTN9.3fc7zL5oSlz5YtmOkRwlCAn2qFDZFEuqE6o8gAToOaY";

// hides all the unnecessary stuff, note that we need to add a credits page for CesiumJS / providers later
const viewer = new Cesium.Viewer("cesiumContainer", {
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
  selectionIndicator: false
});

viewer.cesiumWidget.creditContainer.style.display = "none";

