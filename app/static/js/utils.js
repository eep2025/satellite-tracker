export const classificationColors = {
    StarLink: () => Cesium.Color.CYAN,
    OneWeb: () => Cesium.Color.ORANGE,
    Iridium: () => Cesium.Color.GREEN,
    GPS: () => Cesium.Color.YELLOW,
    unknown: () => Cesium.Color.GRAY
};

export const classifications = Object.freeze({
    STARLINK: "StarLink",
    ONEWEB: "OneWeb",
    IRIDIUM: "Iridium",
    GPS: "GPS",
    UNKNOWN: "unknown"
});

//used to decode TLE data to get classification
//TODO #40 make this more robust using Inclination / Altitude / Mean motion data
export function classifyFromTLE(tleName) {
  const name = (tleName || "").toUpperCase().trim();

  if (name.startsWith("STARLINK")) return classifications.STARLINK;
  if (name.startsWith("ONEWEB") || name.startsWith("OW-")) return classifications.ONEWEB;
  if (name.startsWith("IRIDIUM")) return classifications.IRIDIUM;
  if (name.startsWith("GPS") || name.startsWith("NAVSTAR")) return classifications.GPS;

  return classifications.UNKNOWN;
}

export function colorFromClassification(classification) {
    return classificationColors[classification]() ?? Cesium.Color.WHITE; 
}


//returns coordinates based upon how close to next time, smoother interpolation rather than jumpy to make up for network speed
//A = position now, B = position next 
export function interpolate(Ax,Ay,Az,At,Bx,By,Bz,Bt, now) {
    const dt = Bt - At
    const dx = Bx - Ax
    const dy = By - Ay
    const dz = Bz - Az

    if (dt == 0) {
        return {x: Ax, y: Ay, z: Az};
    } else {
        const t = (now - At) / dt; //how close to next time 

        return {
            x: Ax + dx * t,
            y: Ay + dy * t,
            z: Az + dz * t
        }
    }
}