// Canvas interaction core: element selection, the bounding-box overlay with its
// move/resize handles, drag-to-move and directional resize, canvas scaling, and
// wiring static layers (images/SVG/mockup frames) into the move system.

import { state, MIN_W, MIN_H } from './state.js';
import { layerElements, frameElements, maxLayerZ, renderLayers } from './layers.js';
import { syncTextUI } from './text.js';

// ---------- selection / overlay ----------

function overlayEls() {
    return {
        overlay: document.getElementById('resizeOverlay'),
        handles: document.querySelectorAll('.rs-handle'),
        move: document.getElementById('rsMoveHandle'),
    };
}

export function showOverlay() {
    if (!state.activeElement) return;
    if (state.activeElement.getBoundingClientRect().width === 0) return;
    const o = overlayEls();
    o.overlay.classList.add('show');
    o.handles.forEach((h) => h.classList.add('show'));
    o.move.classList.add('show');
    positionOverlay();
}

export function hideOverlay() {
    const o = overlayEls();
    o.overlay.classList.remove('show');
    o.handles.forEach((h) => h.classList.remove('show'));
    o.move.classList.remove('show');
}

export function positionOverlay() {
    if (!state.activeElement) return;
    const r = state.activeElement.getBoundingClientRect();
    const o = overlayEls();
    o.overlay.style.left = r.left + 'px';
    o.overlay.style.top = r.top + 'px';
    o.overlay.style.width = Math.round(r.width) + 'px';
    o.overlay.style.height = Math.round(r.height) + 'px';
    const half = 5;
    const positions = {
        nw: [r.left, r.top], n: [r.left + r.width / 2, r.top], ne: [r.left + r.width, r.top],
        e: [r.left + r.width, r.top + r.height / 2], se: [r.left + r.width, r.top + r.height],
        s: [r.left + r.width / 2, r.top + r.height], sw: [r.left, r.top + r.height],
        w: [r.left, r.top + r.height / 2],
    };
    o.handles.forEach((h) => {
        const p = positions[h.dataset.side];
        h.style.left = (p[0] - half) + 'px';
        h.style.top = (p[1] - half) + 'px';
    });
    o.move.style.left = (r.left - 14) + 'px';
    o.move.style.top = (r.top - 14) + 'px';
}

// ---------- shared positioning helper ----------

// The correct origin for left/top math is always the element's own
// containing block (offsetParent), never a guessed template-specific
// container. Templates vary (.canvas-wrapper, .phone, .card-inner, ...);
// asking the DOM directly via offsetParent works for all of them without
// per-template special-casing. Falls back to the document root only for
// elements with no positioned ancestor at all (e.g. still position:static
// at the moment this is read, before ensureAbsolutePositioned runs).
function positioningOrigin(el) {
    const op = el.offsetParent || document.documentElement;
    return op.getBoundingClientRect();
}

// Ensure an element is absolutely positioned with explicit left/top/width/height
// (in canvas CSS px, i.e. already divided by currentScale) matching its current
// rendered geometry. Idempotent: if the element is already absolutely
// positioned, this is a no-op. Both startMove and startResize rely on this so
// that writing style.left/style.top always has a visual effect and so that
// offsetLeft/offsetTop are always meaningful afterwards.
function ensureAbsolutePositioned(el) {
    if (!el) return;
    const computedPosition = window.getComputedStyle(el).position;
    if (computedPosition === 'absolute' || computedPosition === 'fixed') return;

    // Origin must be read BEFORE flipping position to absolute: offsetParent
    // reflects the element's containing block under its *current* (static)
    // positioning, which is the frame this pre-mutation rect is measured in.
    const originRect = positioningOrigin(el);
    const rect = el.getBoundingClientRect();

    el.style.position = 'absolute';
    el.style.margin = '0';
    el.style.left = ((rect.left - originRect.left) / state.currentScale) + 'px';
    el.style.top = ((rect.top - originRect.top) / state.currentScale) + 'px';
    el.style.width = Math.round(rect.width / state.currentScale) + 'px';
    el.style.height = Math.round(rect.height / state.currentScale) + 'px';
}

// ---------- resize ----------

export function startResize(e, side) {
    if (!state.activeElement) return;
    e.preventDefault();
    e.stopPropagation();

    // Guarantee absolute positioning BEFORE snapshotting geometry: a
    // statically-positioned element ignores left/top writes entirely, which
    // made resizes from the left/top handles silently fail to shift the
    // opposite coordinate and only ever appear to grow from the right/bottom.
    ensureAbsolutePositioned(state.activeElement);

    // Store geometry in canvas CSS px so anchor math stays consistent with
    // the width/height deltas (getBoundingClientRect is scaled by currentScale).
    const rect = state.activeElement.getBoundingClientRect();
    const offsetLeft = state.activeElement.offsetLeft;
    const offsetTop = state.activeElement.offsetTop;
    const parentRect = state.activeElement.parentElement?.getBoundingClientRect();
    state.resizeState = {
        side,
        startX: e.clientX,
        startY: e.clientY,
        startW: rect.width / state.currentScale,
        startH: rect.height / state.currentScale,
        startLeft: Number.isFinite(offsetLeft)
            ? offsetLeft
            : ((rect.left - (parentRect?.left || 0)) / state.currentScale),
        startTop: Number.isFinite(offsetTop)
            ? offsetTop
            : ((rect.top - (parentRect?.top || 0)) / state.currentScale),
    };
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', endResize);
    showToolbarEl(false);
}

function onResizeMove(e) {
    if (!state.resizeState || !state.activeElement) return;
    const dx = e.clientX - state.resizeState.startX;
    const dy = e.clientY - state.resizeState.startY;
    let w = state.resizeState.startW;
    let h = state.resizeState.startH;
    const sides = state.resizeState.side;
    if (sides.indexOf('e') !== -1) w += dx / state.currentScale;
    if (sides.indexOf('s') !== -1) h += dy / state.currentScale;
    if (sides.indexOf('w') !== -1) w -= dx / state.currentScale;
    if (sides.indexOf('n') !== -1) h -= dy / state.currentScale;

    // Clamp before deriving the shifted anchors so a clamped edge does not
    // detach from its fixed opposite edge.
    w = Math.max(MIN_W, Math.round(w));
    h = Math.max(MIN_H, Math.round(h));

    // Resize by anchoring the edge opposite the handle being pulled:
    // the right edge stays in place when stretching the left handle (w),
    // and the bottom edge stays in place when stretching the top handle (n).
    if (sides.indexOf('w') !== -1) {
        state.activeElement.style.left = (state.resizeState.startLeft + state.resizeState.startW - w) + 'px';
    }
    if (sides.indexOf('n') !== -1) {
        state.activeElement.style.top = (state.resizeState.startTop + state.resizeState.startH - h) + 'px';
    }
    state.activeElement.style.width = w + 'px';
    state.activeElement.style.height = h + 'px';
    positionOverlay();
}

function endResize() {
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', endResize);
    state.resizeState = null;
    if (state.activeElement) toolbarsShow();
}

// ---------- move ----------

export function applyZoom() {
    const valueEl = document.getElementById('zoomValue');
    if (valueEl) valueEl.value = Math.round(state.userZoom * 100) + '';
    updateCanvasScale();
}

export function updateCanvasScale() {
    // Fall back to .card-frame for templates with no .canvas-wrapper
    // (currently only wedding.html). Without this, updateCanvasScale()
    // silently no-op'd for wedding, leaving currentScale stuck at its
    // default of 1 and the 1080x1920 frame rendered unscaled/unfitted.
    const wrapper = document.querySelector('.canvas-wrapper') || document.querySelector('.card-frame');
    if (!wrapper) return;
    // The stage is the scaling container (varies per template: .canvas-stage,
    // .wedding-stage, .story-stage). Resolve it as the wrapper's parent.
    const stage = wrapper.parentElement;
    const drawer = document.getElementById('editorSidebar');
    const w = wrapper.offsetWidth;
    const h = wrapper.offsetHeight;
    if (!w || !h) return;
    // Available viewport space minus the tool rail, open drawer, and toolbar.
    const rail = 76;
    const drawerW = drawer && drawer.classList.contains('open') ? 300 : 0;
    const toolbarH = 60;
    const availW = window.innerWidth - rail - drawerW;
    const availH = window.innerHeight - toolbarH;
    const ratio = Math.min(availW / w, availH / h, 1) * 0.9 * state.userZoom;
    state.currentScale = ratio;
    stage.style.transform = 'scale(' + ratio + ')';
    stage.style.transformOrigin = 'center center';
}

export function startMove(e) {
    if (!state.activeElement) return;
    e.preventDefault();
    e.stopPropagation();
    const startRect = state.activeElement.getBoundingClientRect();

    // Insert placeholder on first move to preserve layout. The placeholder
    // shifts flow layout (flex centering), so the offset/anchor snapshot is
    // taken AFTER it is inserted and the element is made absolute, otherwise
    // the first mousemove would land a scaled distance from the cursor.
    const hasPlaceholder = state.activeElement.querySelector('.editor-placeholder')
        || (state.activeElement.parentElement && state.activeElement.parentElement.querySelector('.editor-placeholder'));
    if (!hasPlaceholder && !state.activeElement.dataset.placeholder) {
        const ph = document.createElement('div');
        ph.className = 'editor-placeholder';
        ph.style.width = Math.round(startRect.width) + 'px';
        ph.style.height = Math.round(startRect.height) + 'px';
        state.activeElement.dataset.placeholder = '1';
        if (state.activeElement.parentElement) {
            state.activeElement.parentElement.insertBefore(ph, state.activeElement);
        }
    }

    state.activeElement.style.position = 'absolute';
    state.activeElement.style.margin = '0';
    state.activeElement.style.willChange = 'top, left';
    state.activeElement.style.zIndex = String(maxLayerZ(layerElements()) + 1);

    // Re-measure BOTH the element and its positioning origin after the
    // layout-affecting mutations above (placeholder insert + position/margin
    // change), since inserting the placeholder can itself shift ancestor
    // layout (e.g. flex centering). The origin must be the element's actual
    // containing block (offsetParent) rather than a guessed template-wide
    // container: templates without a .canvas-wrapper/.phone element (e.g.
    // wedding.html, whose containing block is .card-inner) previously fell
    // back to document.body, writing left/top values measured against the
    // wrong origin and producing a jump on the very first move — worse on
    // templates where currentScale is small, since the origin error gets
    // divided by it.
    const originRect = positioningOrigin(state.activeElement);
    const r = state.activeElement.getBoundingClientRect();
    state.moveState = {
        offsetX: e.clientX - r.left,
        offsetY: e.clientY - r.top,
    };
    state.activeElement.style.left = ((r.left - originRect.left) / state.currentScale) + 'px';
    state.activeElement.style.top = ((r.top - originRect.top) / state.currentScale) + 'px';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', endMove);
    showToolbarEl(false);
}

function onMove(e) {
    if (!state.moveState || !state.activeElement) return;
    // Must use the same origin function as startMove — mixing a different
    // origin here would reintroduce the exact class of bug this fix removes.
    const originRect = positioningOrigin(state.activeElement);
    state.activeElement.style.left = ((e.clientX - originRect.left - state.moveState.offsetX) / state.currentScale) + 'px';
    state.activeElement.style.top = ((e.clientY - originRect.top - state.moveState.offsetY) / state.currentScale) + 'px';
    positionOverlay();
}

function endMove() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', endMove);
    state.moveState = null;
    if (state.activeElement) {
        // Free-form canvas: no placeholder should linger after the drop.
        const ph = (state.activeElement.parentElement
            ? state.activeElement.parentElement.querySelector('.editor-placeholder')
            : null);
        if (ph) ph.remove();
        delete state.activeElement.dataset.placeholder;
        state.activeElement.style.willChange = 'auto';
        toolbarsShow(); renderLayers();
    }
}

// Make static background images/SVGs draggable layers.
// They are movable like text, defaulting to a low z-index as a backdrop.
export function makeBaseImagesMovable() {
    // Phone mockup frame moves as a single unit (frame + screen + image).
    // The upload overlay keeps working since its clicks are excluded.
    frameElements().forEach(makeFrameMovable);

    // Plain image/SVG layers that aren't carried by a frame above.
    document.querySelectorAll('.canvas-wrapper img, .canvas-wrapper svg').forEach((img) => {
        if (img.closest('#editorUI')) return;
        if (img.closest('.mockup-frame') || img.closest('.phone-mockup')) return;
        img.style.position = (img.style.position || '') || 'absolute';
        img.style.zIndex = '1';
        img.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectElement(img, true);
            startMove(e);
        });
    });
}

// Make a single .mockup-frame movable (draggable/resizable) as one unit.
// Upload buttons (.upload-overlay / *.mc-*-upload) keep working because
// their clicks are excluded from starting a move.
export function makeFrameMovable(frame) {
    if (!frame) return;
    if (frame.__movable) return;
    frame.__movable = true;
    frame.style.position = frame.style.position || 'absolute';
    if (!frame.style.zIndex) frame.style.zIndex = '1';
    frame.addEventListener('mousedown', (e) => {
        if (e.target.closest('.upload-overlay, [class$="-upload"], .mc-phone-upload, .mc-laptop-upload, .mc-monitor-upload')) return;
        e.preventDefault();
        e.stopPropagation();
        selectElement(frame, true);
        startMove(e);
    });
}

// ---------- selection / toolbar visibility ----------

export function selectElement(el, keepOverlay) {
    state.activeElement = el;
    if (el) {
        toolbarsShow();
    }
    renderLayers();
    if (keepOverlay && el) showOverlay();
    syncTextUI();
}

export function showToolbarEl(show) {
    const t = document.getElementById('editorToolbar');
    if (show) t.classList.add('show'); else t.classList.remove('show');
}

export function toolbarsShow() {
    showToolbarEl(true);
    showOverlay();
}

export function sidebarOpen(open) {
    document.getElementById('editorSidebar').classList.toggle('open', open);
    updateCanvasScale();
}