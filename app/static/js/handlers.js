import { state } from "./state.js";

export function selectEntity(click, pickedObject=undefined, force=false) {
    //don't allow reselection if locked on 
    if (state.lockedOn && !force) {return;}

    pickedObject = pickedObject || state.viewer.scene.pick(click.position);

    //if click on non-entity, shrink prev selected to normal
    if (!Cesium.defined(pickedObject) || !(pickedObject.primitive instanceof Cesium.PointPrimitive)) {
        if (state.currentEntity) {
            state.currentEntity._pixelSize = 6;
        }
        state.currentEntity = null;
        return;
    }

    //if it contains a primitive, update  the value of pickedObject to be the primitive
    pickedObject = pickedObject.primitive;
    
    // shrink previously selected
    if (state.currentEntity) {
        state.currentEntity._pixelSize = 6;
    }

    // select new
    state.currentEntity = pickedObject;
    if (state.currentEntity) {
        state.currentEntity._pixelSize = 10;
    }
}

//responsible for the lock-on feature

export function lockOn(click) {
    const pickedObject = state.viewer.scene.pick(click.position);

    //handles returning to last Earth-centered position
    if (!Cesium.defined(pickedObject) || !(pickedObject.primitive instanceof Cesium.PointPrimitive)) {
        //prevents re-focusing when not focused
        if (!state.lockedOn) {
            return;
        }

        //undo viewer's lock-on
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

    //if selected contains a primitive, get that primitive
    const pickedPrimitive = pickedObject.primitive;

    //TODO revamp this logic to use a SampledPositionProperty for position for smoother updating + trajectory
    //*note this doesn't currently work because primitives are weird and we need to switch to using a SampledPositionProperty which will fix everything
    //create a hybrid entity (shadowing the primitive) for one satellite
    const hybridEntity = state.viewer.entities.add({
        position: new Cesium.CallbackProperty((time, result) => {
            return Cesium.Cartesian3.clone(
            pickedPrimitive.position,
            result
            );
        }, false),
    })


    state.viewer.trackedEntity = hybridEntity;

    state.viewer.camera.setView({
        orientation: {
            heading: 0, 
            pitch: -Cesium.Math.PI_OVER_TWO,
            roll: 0
        }
    });

    state.lockedOn = true;
    selectEntity(click, pickedObject, true);
}