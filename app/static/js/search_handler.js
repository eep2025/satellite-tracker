import { selectSatellite } from './handlers.js'
import { colorToHex } from './info_card_manager.js'
import { getPrimitivePoint } from './satManager.js'
import { state } from './state.js'
import { classifyFromTLE, colorFromClassification } from './utils.js'

const MAX_RESULTS_COUNT = 15

// Must be called after state.TLEdata is populated!
export function initSearchbar() {
    const searchInput = document.getElementById("search")
    const resultsContainer = document.getElementById("search-results")

    // state.TLEdata contains NORAD ID and header
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();

        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            return;
        }

        const matches = state.TLEdata
        // .filter(sat => {
        //     const name = sat[0].toLowerCase()
        //     const noradId = String(sat[3])
        //     const classification = classifyFromTLE(name).toLowerCase()
        //     return name.includes(query) || noradId.includes(query) || classification.includes(query);
        // })
        .flatMap(sat => {
            const name = sat[0].toLowerCase()
            const noradId = String(sat[3])
            const classification = classifyFromTLE(name).toLowerCase()

            if (name.includes(query) || noradId.includes(query) || classification.includes(query)) {
                return [{
                    name: sat[0],
                    norad: sat[3],
                    classification: classifyFromTLE(sat[0])
                }]
            }
            return []
        })
        .slice(0, MAX_RESULTS_COUNT)

        renderResults(matches, resultsContainer, searchInput)
    })
}

function renderResults(matches, container, input) {
    if (matches.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = matches.map(sat => `
        <button type="button" 
                class="list-group-item list-group-item-action bg-dark text-white border-secondary search-item pointer-events" 
                data-name="${sat.name}">
            <div class="d-flex align-items-center pointer-events">
                <div class="d-flex flex-column flex-grow-1">
                    <span>${sat.name}</span>
                    <span class="badge mt-1" style="background-color: ${colorToHex(colorFromClassification(sat.classification))}; width: fit-content; font-size: 0.7rem;">
                        ${sat.classification}
                    </span>
                </div>
                <small class="text-secondary ms-3">${sat.norad}</small>
            </div>
        </button>
    `).join('');

    container.querySelectorAll('.search-item').forEach(item => {
        item.addEventListener('click', () => {
            const name = item.getAttribute('data-name');
            
            input.value = name;
            container.innerHTML = '';
            
            handleSatelliteSelection(name);
        });
    });
}

function handleSatelliteSelection(name) {
    console.log("Selected satellite name:", name);
    const primitive = getPrimitivePoint(name)

    if (state.currentPrimitive && state.currentPrimitive != primitive) {
        state.currentPrimitive._pixelSize = 7;
        state.viewer.entities.remove(state.currentPropagatedEntity);
        
        state.currentPrimitive = null;
        state.currentPropagatedEntity = null;
    }

    state.currentPrimitive = primitive

    selectSatellite(name)
}