import { classifyFromTLE, colorFromClassification } from "./utils.js"

export function colorToHex(color) {
    const toHex = (val) => {
        const hex = Math.round(val * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(color.red)}${toHex(color.green)}${toHex(color.blue)}`.toUpperCase();
}

export function deselect_infocard() {
    let infoCard = document.getElementById("sat-info-card")
    infoCard.classList.add("hidden")
}

export function change_infocard(id) {
    let infoCard = document.getElementById("sat-info-card")
    infoCard.classList.remove("hidden")

    document.getElementById("sat-name").textContent = id

    let classification = classifyFromTLE(id)
    let classColorCesium = colorFromClassification(classification)

    let badge = document.getElementById("sat-class-badge")
    badge.textContent = classification
    badge.style.backgroundColor = colorToHex(classColorCesium)

    infoCard.querySelectorAll(".sat-param").forEach(ele => {
        ele.textContent = "..."
    });
}

const DEGREES = "°"

export function populate_metadata(data) {
    document.getElementById("sat-altitude").textContent = data.altitude + " km"
    document.getElementById("sat-velocity").textContent = data["inertial-velocity"] + " km/s"
    document.getElementById("sat-norad").textContent = data.norad
    document.getElementById("sat-int-deg").textContent = data["international-designator"]
    document.getElementById("sat-inclination").textContent = data.inclination + DEGREES
    document.getElementById("sat-eccentricity").textContent = data.eccentricity
    document.getElementById("sat-period").textContent = data["orbital-period"] + "s"
    document.getElementById("sat-motion").textContent = data.mean_motion + " revs/day"
    document.getElementById("sat-anomaly").textContent = data["mean-anomaly-degrees"] + DEGREES
    document.getElementById("sat-bstar").textContent = data.bstar
    document.getElementById("sat-right-ascension").textContent = data["right-ascension-of-ascending-node-degrees"] + DEGREES
    document.getElementById("sat-semimajoraxis").textContent = data["semi-major-axis"]
    document.getElementById("sat-argument-perigee").textContent = data["argument-of-perigee-degrees"] + DEGREES
    // document.getElementById("sat-alt-apogee").textContent = data["alt-apogee"]
    // document.getElementById("sat-alt-perigee").textContent = data["alt-perigee"]
}