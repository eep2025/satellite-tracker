import { state } from "./state.js";

//enlarges entity upon click
export function selectEntity(click, pickedObject=undefined, force=false) {
    //don't allow reselection if locked on 
    if (state.lockedOn && !force) {return;}

    pickedObject = pickedObject || state.viewer.scene.pick(click.position);

    //if click on non-entity, shrink prev selected to normal
    if (!Cesium.defined(pickedObject) || !(pickedObject.id instanceof Cesium.Entity)) {
        if (state.currentEntity && state.currentEntity.point) {
            state.currentEntity.point.pixelSize = 6;
        }
        state.currentEntity = null;
        return;
    }

    // shrink previously selected
    if (state.currentEntity && state.currentEntity.point) {
        state.currentEntity.point.pixelSize = 6;
    }

    // select new
    state.currentEntity = pickedObject.id;
    if (state.currentEntity.point) {
        state.currentEntity.point.pixelSize = 10;
    }
}

//responsible for the lock-on feature

export function lockOn(click) {
    const pickedObject = state.viewer.scene.pick(click.position);

    //handles returning to last Earth-centered position
    if (!Cesium.defined(pickedObject) || !(pickedObject.id instanceof Cesium.Entity)) {
        //prevents re-focusing when not focused
        if (!state.lockedOn) {
            return;
        }

        state.viewer.trackedEntity = undefined;

        if (state.savedView) {
            state.viewer.camera.flyTo(state.savedView);
        } else {
            state.viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(0, 0, 15_000_000),
                orientation: {
                    heading: 0,
                    pitch: -Cesium.Math.PI_OVER_TWO,
                    roll: 0
                },
                duration: state.zoomSpeed
            });
        }

        state.lockedOn = false;
        selectEntity(click)
        return;
    }

    //allows user to return to previous view
    if (!state.lockedOn) {
        state.savedView = {
            destination: state.viewer.camera.positionWC.clone(),
            orientation: {
                heading: state.viewer.camera.heading,
                pitch: state.viewer.camera.pitch,
                roll: state.viewer.camera.roll
            },
            duration: state.zoomSpeed
        };
    } 

    //responsible for focusing user on entity
    const entity = pickedObject.id;

    state.viewer.trackedEntity = entity;

    state.viewer.camera.setView({
        orientation: {
            heading: 0,
            pitch: -Cesium.Math.PI_OVER_TWO,
            roll: 0
        }
    });

    state.lockedOn = true;
    selectEntity(click, pickedObject, true)
}