import { classifications, classifyFromTLE, colorFromClassification } from "./utils.js"
import { colorToHex } from "./info_card_manager.js"

const MAX_ALLOWED_CLASSIFICATIONS = Object.values(classifications).length
let allowed_classifications = new Set(Object.values(classifications))

export function shouldRenderPrimitive(satellitePrimitive) {
    const allowedLen = allowed_classifications.length
    if (allowedLen == MAX_ALLOWED_CLASSIFICATIONS) return true
    if (allowedLen == 0) return false
    
    const classification = classifyFromTLE(satellitePrimitive.id)
    return allowed_classifications.has(classification)
}

export function initFilters() {
    const container = document.getElementById('sat-classification-filter');
    
    Object.values(classifications).forEach(classification => {
        const div = document.createElement('div');
        div.className = 'form-check form-switch';
        
        const hex = colorToHex(colorFromClassification(classification))

        div.innerHTML = `
            <input class="form-check-input" style="background-color:${hex}; border: none;" type="checkbox" id="allow-${classification}" checked>
            <label class="form-check-label" for="allow-${classification}">${classification}</label>
        `;

        const checkbox = div.querySelector('input');
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                allowed_classifications.add(classification);
            } else {
                allowed_classifications.delete(classification);
            }
        });

        container.appendChild(div);
    });
}