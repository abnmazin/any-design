// Canvas interaction core: viewport scaling and zoom for the read-only
// template preview. The Strict Template Generator locks the layout, so there
// is no element selection, overlay, drag-to-move, resize, or flattening here.

import { state } from './state.js';

// The design box whose intrinsic size defines the canvas coordinate space.
// All templates ship a .canvas-wrapper except wedding.html, which uses a
// .card-frame directly under .wedding-stage. Resolving either keeps scaling
// and layer projection working for all templates.
export function canvasRoot() {
    const wrapper = document.querySelector('.canvas-wrapper');
    if (wrapper) return wrapper;
    const frame = document.querySelector('.card-frame');
    if (frame) return frame;
    return document.querySelector('.story-stage, .wedding-stage, .canvas-stage') || document.body;
}

// The element that receives the transform scale(). This is always the stage
// (the wrapper's parent), never the canvas itself — scaling the wrapper would
// distort its own coordinate space. Falls back to the root's parent.
export function canvasStage() {
    const root = canvasRoot();
    return (root.parentElement && root.parentElement.classList) ? root.parentElement : root;
}

export function applyZoom() {
    const valueEl = document.getElementById('zoomValue');
    if (valueEl) valueEl.value = Math.round(state.userZoom * 100) + '';
    updateCanvasScale();
}

export function updateCanvasScale() {
    const wrapper = canvasRoot();
    const stage = canvasStage();
    const drawer = document.getElementById('editorSidebar');
    const w = wrapper.offsetWidth;
    const h = wrapper.offsetHeight;
    if (!w || !h) return;
    const drawerW = drawer ? drawer.offsetWidth : 0;
    // Center the canvas within the area visible beside the fixed drawer, not
    // across the whole viewport (the drawer overlays the left side).
    if (drawerW > 0 && drawerW < window.innerWidth) {
        stage.style.marginLeft = drawerW + 'px';
        stage.style.width = (window.innerWidth - drawerW) + 'px';
    } else {
        stage.style.marginLeft = '';
        stage.style.width = '';
    }
    const availW = window.innerWidth - drawerW - 24;
    const availH = window.innerHeight - 60;
    const ratio = Math.min(availW / w, availH / h, 1) * 0.9 * state.userZoom;
    state.currentScale = ratio;
    stage.style.transform = 'none';
    wrapper.style.transform = 'scale(' + ratio + ')';
    wrapper.style.transformOrigin = 'center center';
}