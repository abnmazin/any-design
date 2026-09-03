// Editor entry point (loaded as <script type="module">). Assembles the split
// editor modules and boots them once the DOM is ready. This is the single entry
// that every template references.

import { buildUI } from './ui-config.js';
import { bind } from './events.js';
import { initFormBindings } from './bindings.js';
import { updateCanvasScale } from './interactions.js';
import { state } from './state.js';

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

function inject() {
    buildUI();
    bind();
    initFormBindings();
    initTopBar();
    injectUploadOverlayCss();
    // Wait for webfonts before measuring so the scaled preview reflects the
    // final (web font) layout.
    document.fonts.ready.then(() => updateCanvasScale()).catch(() => updateCanvasScale());
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
} else {
    inject();
}