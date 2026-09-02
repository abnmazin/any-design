// Editor entry point (loaded as <script type="module">). Assembles the split
// editor modules and boots them once the DOM is ready. This is the single entry
// that every template references in place of the old monolithic editor-panel.js.

import { buildUI } from './ui-config.js';
import { renderLogos } from './logo.js';
import { renderMockups } from './mockups.js';
import { makeBaseImagesMovable, updateCanvasScale } from './interactions.js';
import { initLayerStack } from './layers.js';
import { bind } from './events.js';

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

function inject() {
    buildUI();
    bind();
    renderLogos();
    renderMockups();
    initTopBar();
    makeBaseImagesMovable();
    initLayerStack();
    updateCanvasScale();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
} else {
    inject();
}