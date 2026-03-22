import { state, socket } from "./state.js";
import { createPropagatedEntity, createSampledPositionProperty, getPrimitivePoint } from "./satManager.js";
import { createTrajectory, deleteTrajectory } from "./utils.js";

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
                state.currentPrimitive._pixelSize = 7;

                //delete the previous trajectory
                if (state.trajectoryListener) {
                    deleteTrajectory()
                }

                state.currentPrimitive = null;
                state.currentPropagatedEntity = null;
            }
            return;
        }

        if (pickedObject.id == state.currentPropagatedEntity || pickedObject.primitive == state.currentPrimitive) {return;}


        let pickedPrimitive = null;
        let id = null;
        //if it contains a primitive, update  the value of pickedObject to be the primitive
        if (pickedObject.primitive instanceof Cesium.PointPrimitive) {
            pickedPrimitive = pickedObject.primitive;

            if (pickedPrimitive.id instanceof Cesium.Entity) {
                id = pickedPrimitive.id.id;
                console.log('primitive! - id.id');
            } else {
                id = pickedPrimitive.id;
                console.log('primitive! - id');
            }

            console.log(pickedPrimitive)
        } else {
            //in this case an entity has been selected. Get the correseponding primitive
            pickedPrimitive = getPrimitivePoint(pickedObject.id.name);
            id = pickedObject.id.name;
        }
        
        //unhide prev. selected primitive (need to do this because entity replaces primitive)
        if (state.currentPrimitive && (pickedObject != state.currentPrimitive)) {
            state.currentPrimitive._pixelSize = 7;

            state.viewer.entities.remove(state.currentPropagatedEntity);

            state.currentPrimitive = null;
            state.currentPropagatedEntity = null;
        }

        // select new primitive
        state.currentPrimitive = pickedPrimitive;

        console.log("Selected primitive: " + id)

        //request frontend position data, create SampledPositionProperty, create an entity w/ trajectory
        //get propagation duration for the first propagation
        state.PROPAGATION_DURATION = await createTrajectory(id, state.currentPrimitive.color);

        //update propagation every PROPAGATION_DURATION seconds
        state.trajectoryListener = (clock) => {
            if (!state.firstSnapshotArrived) return;

            // Initialize lastUpdateTime on first call
            if (!state.lastPropagation) {
                state.lastPropagation = clock.currentTime.clone();
                return;
            }

            // Calculate time elapsed in simulation seconds
            const deltaTime = Cesium.JulianDate.secondsDifference(
                clock.currentTime,
                state.lastPropagation
            );

            // Only update if enough simulation time has passed
            if (deltaTime >= state.PROPAGATION_DURATION) {
                state.lastPropagation = clock.currentTime.clone(); // update timestamp
                createTrajectory(id, state.currentPrimitive.color);
                console.log('LOOP RAN!')
            }

        };
        state.viewer.clock.onTick.addEventListener(state.trajectoryListener);


        //hide primitive after entity has been created
        state.currentPrimitive._pixelSize = 0
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

        //since selected nothing relevant, resets rest of stuff e.g. pixelSize
        await selectEntity(click)
        return;
    }

    if ((pickedObject.id === state.currentPropagatedEntity || pickedObject.primitive === state.currentPrimitive) && state.lockedOn) {return;}

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


    let pickedEntity = null;
    //if it contains a primitive, update the value of pickedObject to be the primitive
    if (pickedObject.id instanceof Cesium.Entity) {
        //if pickedObject is an entity, then use that
        pickedEntity = pickedObject.id;
    } else {
        //in this case a primitive has been selected, get the corresponding entity
        pickedEntity = state.viewer.entities.getById(pickedObject.primitive.id);
        
        if (!pickedEntity) {
            await selectEntity(click, pickedEntity, true)
            pickedEntity = state.viewer.entities.getById(pickedObject.primitive.id);
        }

        
    }
    console.log('picked entity: ', pickedEntity)

    state.viewer.trackedEntity = pickedEntity;

    state.viewer.camera.setView({
        orientation: {
            heading: 0, 
            pitch: -Cesium.Math.PI_OVER_TWO,
            roll: 0
        }
    });
}