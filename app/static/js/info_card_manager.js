import { classifyFromTLE, colorFromClassification } from "./utils.js"

export function deselect_infocard() {
    let infoCard = document.getElementById("sat-info-card")
    infoCard.classList.add("hidden")
}

function colorToHex(color) {
    const toHex = (val) => {
        const hex = Math.round(val * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(color.red)}${toHex(color.green)}${toHex(color.blue)}`.toUpperCase();
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
}