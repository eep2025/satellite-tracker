/**
 * @typedef {Object} Classification
 * @property {string} name
 * @property {string[]} prefixes
 * @property {number} color
 * @property {boolean} [unknown]
 */

/** @type {ReadonlyArray<Classification>} */
const CLASSIFICATIONS = [
    {
        name: "Starlink",
        prefixes: ["STARLINK"],
        color: Cesium.Color.CYAN
    },{
        name: "OneWeb",
        prefixes: ["ONEWEB", "OW-"],
        color: Cesium.Color.ORANGE
    },
    {
        name: "Iridium",
        prefixes: ["IRIDIUM"],
        color: Cesium.Color.GREEN
    },
    {
        name: "GPS",
        prefixes: ["GPS", "NAVSTAR"],
        color: Cesium.Color.YELLOW
    }
]

/** @type {Classification} */
const UNKNOWN_CLASSIFICATION = {
    name: "Unknown",
    prefixes: [],
    color: Cesium.Color.GRAY,
    unknown: true
}

// Maps each possible prefix to its respective classification, including where there are multiple.
const prefixToClassificationMap = CLASSIFICATIONS.flatMap(classification => 
    classification.prefixes.map(prefix => [prefix, classification])
).reduce((map, [prefix, classification]) => {
    map[prefix] = classification
    return map
}, {})

//used to decode TLE data to get classification
//TODO #40 make this more robust using Inclination / Altitude / Mean motion data - can you explain this?
/**
 * @param {string} tleName
 * @returns {Classification}
 */
export function classifyFromTLE(tleName = "") {
  const name = tleName.toUpperCase().trim();

  for (let prefix in prefixToClassificationMap) {
    if (name.startsWith(prefix)) return prefixToClassificationMap[prefix]
  }

  return UNKNOWN_CLASSIFICATION;
}