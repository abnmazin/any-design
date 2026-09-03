// Editor entry point (loaded as <script type="module">). Assembles the split
// editor modules and boots them once the DOM is ready. This is the single entry
// that every template references in place of the old monolithic editor-panel.js.

import { buildUI } from './ui-config.js';
import { renderLogos } from './logo.js';
import { renderMockups } from './mockups.js';
import { flattenCanvasIntoLayers, updateCanvasScale } from './interactions.js';
import { initLayerStack } from './layers.js';
import { bind } from './events.js';
import { initEditableText } from './text.js';
import { state } from './state.js';
import { hideOverlay, showToolbarEl } from './interactions.js';

document.addEventListener('editor:canvas-restored', () => {
    state.activeElement = null;
    state.activeRange = null;
    hideOverlay();
    showToolbarEl(false);
    initEditableText();
    flattenCanvasIntoLayers();
    initLayerStack();
    updateCanvasScale();
});

// Migrate the dimension/title text from the old preview toolbar into the
// new top bar, then remove the original toolbar from the DOM entirely.
function initTopBar() {
    const oldBar = document.querySelector('.preview-toolbar');
    const titleEl = document.querySelector('.top-bar-title');
    if (oldBar && titleEl) {
        const zoom = oldBar.querySelector('.zoom');
        titleEl.textContent = zoom ? zoom.textContent.trim() : 'تصميم جديد';
    }
    if (oldBar) oldBar.remove();
}

// Template CSS hides the device upload overlay until :hover, which is invisible
// on touch where there is no hover. A faint resting opacity keeps it discoverable
// on mobile while staying low-key on desktop.
function injectUploadOverlayCss() {
    const style = document.createElement('style');
    style.textContent = '.upload-overlay { opacity: 0.35 !important; }'
        + '.upload-overlay:hover, .upload-overlay:focus { opacity: 1 !important; }';
    document.head.appendChild(style);
}

async function inject() {
    buildUI();
    bind();
    renderLogos();
    renderMockups();
    initTopBar();
    injectUploadOverlayCss();
    initEditableText();
    // Wait for webfonts before flattening so measured layer geometry reflects
    // the final (web font) layout; flating with fallback-font measurements
    // would freeze wrong widths/heights as explicit sizes.
    try { await document.fonts.ready; } catch (e) { /* continue anyway */ }
    flattenCanvasIntoLayers();
    initLayerStack();
    updateCanvasScale();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
} else {
    inject();
}