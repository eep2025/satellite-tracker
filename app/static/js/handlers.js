import { state, socket } from "./state.js";
import { createPropagatedEntity, createSampledPositionProperty } from "./satManager.js";

//handles selecting an entity upon single click
export async function selectEntity(click, pickedObject=undefined, force=false) {
    if (state.selectionInProgress) return;

    state.selectionInProgress = (async () => {
        //don't allow reselection if locked on 
        if (state.lockedOn && !force) {return;}

        pickedObject = pickedObject || state.viewer.scene.pick(click.position);

        //if click on non-primitive/entity, show previous primitive
        if (!Cesium.defined(pickedObject) || ( !(pickedObject.primitive instanceof Cesium.PointPrimitive) && !(pickedObject.id instanceof Cesium.Entity))) {
            if (state.currentPrimitive || state.currentPropagatedEntity) {
                state.currentPrimitive._pixelSize = 6;

                state.viewer.entities.remove(state.currentPropagatedEntity);

                //disabled deleting these 
                //state.currentPrimitive = null;
                //state.currentPropagatedEntity = null;
            }
            return;
        }


        //if it contains a primitive, update  the value of pickedObject to be the primitive
        if (Cesium.defined(pickedObject.primitive)) {
            pickedObject = pickedObject.primitive;
        } else {
            pickedObject = state.currentPrimitive;
        }
        
        //unhide prev. selected primitive (need to do this because entity replaces primitive)
        if (state.currentPrimitive && (pickedObject != state.currentPrimitive)) {
            state.currentPrimitive._pixelSize = 6;

            state.viewer.entities.remove(state.currentPropagatedEntity);

            //state.currentPrimitive = null;
            //state.currentPropagatedEntity = null;
        }

        // select new primitive
        state.currentPrimitive = pickedObject;
        if (state.currentPrimitive) {
            state.currentPrimitive._pixelSize = 0
        }

        //request frontend position data, create SampledPositionProperty, create an entity w/ trajectory

        //pauses until response is recieved
        const positions = await new Promise((resolve, reject) => {
            //handles timeout 
            let timedOut = false;
            const timer = setTimeout(() => {
                timedOut = true;
                reject(new Error("Timeout requesting positions for trajectory"))
            }, 15000)
            socket.emit("requestPositions", { id: state.currentPrimitive.id }, (res) => {
                if (timedOut) {
                    //ignore response if timeOut (late response)
                    return;
                }
                clearTimeout(timer);
                resolve(res); // resumes execution
            });
        });

        //formats position samples, uses to create SampledPositionProperty + entity

        let sampledPositionProperty = createSampledPositionProperty(positions);
        createPropagatedEntity(state.currentPrimitive, sampledPositionProperty);
    })();

    await state.selectionInProgress;
    state.selectionInProgress = null;
}

//responsible for the lock-on feature

export async function lockOn(click) {
    //if handling, wait till handling finishes
    if (state.selectionInProgress) {
        await state.selectionInProgress;
    }

    const pickedObject = state.viewer.scene.pick(click.position);
    console.log(pickedObject)
    //handles returning to last Earth-centered position
    if (!Cesium.defined(pickedObject) || ( !(pickedObject.primitive instanceof Cesium.PointPrimitive) && !(pickedObject.id instanceof Cesium.Entity))) {
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
        await selectEntity(click)
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

    state.lockedOn = true;
    if (!state.currentPropagatedEntity) {
        await selectEntity(click, pickedObject, true);
    }

    state.viewer.trackedEntity = state.currentPropagatedEntity;
    state.viewer.camera.setView({
        orientation: {
            heading: 0, 
            pitch: -Cesium.Math.PI_OVER_TWO,
            roll: 0
        }
    });
}