import { createSampledPositionProperty, createPropagatedEntity } from "./satManager.js";
import { state, socket } from "./state.js";

export const classificationColors = {
    StarLink: () => Cesium.Color.CYAN,
    OneWeb: () => Cesium.Color.ORANGE,
    Iridium: () => Cesium.Color.GREEN,
    GPS: () => Cesium.Color.YELLOW,
    Other: () => Cesium.Color.GRAY
};

export const classifications = Object.freeze({
    STARLINK: "StarLink",
    ONEWEB: "OneWeb",
    IRIDIUM: "Iridium",
    GPS: "GPS",
    OTHER: "Other"
});

//used to decode TLE data to get classification
//TODO #40 make this more robust using Inclination / Altitude / Mean motion data
export function classifyFromTLE(tleName) {
  const name = (tleName || "").toUpperCase().trim();

  if (name.startsWith("STARLINK")) return classifications.STARLINK;
  if (name.startsWith("ONEWEB") || name.startsWith("OW-")) return classifications.ONEWEB;
  if (name.startsWith("IRIDIUM")) return classifications.IRIDIUM;
  if (name.startsWith("GPS") || name.startsWith("NAVSTAR")) return classifications.GPS;

  return classifications.OTHER;
}

export function colorFromClassification(classification) {
    return classificationColors[classification]() ?? Cesium.Color.WHITE; 
}


//returns coordinates based upon how close to next time, smoother interpolation rather than jumpy to make up for network speed
//A = position now, B = position next 
export function interpolate(Ax,Ay,Az,At,Bx,By,Bz,Bt, now) {
    const dt = Bt - At;
    const dx = Bx - Ax;
    const dy = By - Ay;
    const dz = Bz - Az;

    if (dt == 0) {
        return {x: Ax, y: Ay, z: Az};
    } else {
        let t = (now - At) / dt; //how close to next time 
        t = Cesium.Math.clamp(t, 0.0, 2.0);

        return {
            x: Ax + dx * t,
            y: Ay + dy * t,
            z: Az + dz * t
        }
    }
}


export async function createTrajectory(id, color) {
    //pauses until response is recieved
    const {positions, PROPAGATION_DURATION} = await new Promise((resolve, reject) => {
        //handles timeout 
        let timedOut = false;
        const timer = setTimeout(() => {
            timedOut = true;
            reject(new Error("Timeout requesting positions for trajectory"))
        }, 15000)
        socket.emit("requestPositions", { id: id }, (res) => {
            if (timedOut) {
                //ignore response if timeOut (late response)
                return;
            }
            clearTimeout(timer);
            resolve(res); // resumes execution
        });
    });

    //formats position samples, uses to create SampledPositionProperty + entity
    //!smoother way would be to edit the sampled position property but I just reset it since I cba rn
    let sampledPositionProperty = createSampledPositionProperty(positions);
    if (!state.currentPropagatedEntity) {
        createPropagatedEntity(color, sampledPositionProperty, id, PROPAGATION_DURATION);
    } else if (state.currentPropagatedEntity.id == id) {
        state.viewer.entities.remove(state.currentPropagatedEntity);
        createPropagatedEntity(color, sampledPositionProperty, id, PROPAGATION_DURATION);
    }
    console.log("propagation duration:" + PROPAGATION_DURATION)
    return PROPAGATION_DURATION / 8
}

export function deleteTrajectory() {
    state.viewer.scene.preRender.removeEventListener(state.trajectoryListener);
    state.viewer.entities.remove(state.currentPropagatedEntity);
    state.trajectoryListener = null;
}