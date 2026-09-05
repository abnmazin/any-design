// Event wiring for the read-only editor. Runs once after buildUI() has injected
// the chrome; binds tool-rail pane switching, zoom controls, the export button,
// and the brand logo picker.

import { state } from './state.js';
import { applyZoom, updateCanvasScale, canvasRoot } from './interactions.js';
import { syncLogoActive, renderLogos } from './logo.js';
import { initIconTools } from './icon-tools.js';
import { renderPalettes } from './palettes.js';
import { initColorTools } from './color-tools.js';
import { exportCanvas } from './export.js';

export function bind() {
    // sidebar tabs
    document.querySelectorAll('.es-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.es-tab').forEach((t) => t.classList.toggle('active', t === tab));
            document.querySelectorAll('.es-pane').forEach((paneEl) =>
                paneEl.classList.toggle('active', paneEl.dataset.pane === tab.dataset.tab));
            if (tab.dataset.tab === 'brand') syncLogoActive();
        });
    });

    // brand logo grid
    renderLogos();
    initIconTools();

    // palette picker
    renderPalettes();
    initColorTools();

    // export button (top navbar) triggers the html-to-image PNG capture.
    document.querySelector('.save-btn').addEventListener('click', exportCanvas);

    // zoom controls (bottom of the tool rail)
    document.getElementById('zoomIn').addEventListener('click', () => {
        state.userZoom = Math.min(4, +(state.userZoom + 0.1).toFixed(2));
        applyZoom();
    });
    document.getElementById('zoomOut').addEventListener('click', () => {
        state.userZoom = Math.max(0.1, +(state.userZoom - 0.1).toFixed(2));
        applyZoom();
    });
    document.getElementById('zoomValue').addEventListener('change', (e) => {
        const val = Math.min(400, Math.max(10, Number(e.target.value) || 100));
        state.userZoom = val / 100;
        applyZoom();
    });
    document.getElementById('zoomValue').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') e.target.blur();
    });

    // Re-scale the locked preview when the drawer's slide transition completes.
    window.addEventListener('resize', updateCanvasScale);

    const initial = canvasRoot();
    if (initial) {
        document.getElementById('zoomValue').value = Math.round(state.userZoom * 100) + '';
        updateCanvasScale();
    }
}