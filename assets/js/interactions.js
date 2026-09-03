// Canvas interaction core: element selection, the bounding-box overlay with its
// move/resize handles, drag-to-move and directional resize, canvas scaling, and
// wiring static layers (images/SVG/mockup frames) into the move system.

import { state, MIN_W, MIN_H } from './state.js';
import { layerElements, maxLayerZ, renderLayers, isLocked } from './layers.js';
import { syncTextUI } from './text.js';
import { record } from './history.js';

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
    // The top-left corner is reserved for the move handle, so there is no nw
    // resize handle there — resize stays available from n, e, s, w, ne, se, sw.
    const positions = {
        n: [r.left + r.width / 2, r.top], ne: [r.left + r.width, r.top],
        e: [r.left + r.width, r.top + r.height / 2], se: [r.left + r.width, r.top + r.height],
        s: [r.left + r.width / 2, r.top + r.height], sw: [r.left, r.top + r.height],
        w: [r.left, r.top + r.height / 2],
    };
    // Handles center themselves via translate(-50%,-50%), so set their corner
    // point directly (no half-size offset) or they'd be shifted out of place.
    o.handles.forEach((h) => {
        const p = positions[h.dataset.side];
        if (!p) { h.style.left = '-9999px'; h.style.top = '-9999px'; return; }
        h.style.left = p[0] + 'px';
        h.style.top = p[1] + 'px';
    });
    o.move.style.left = (r.left - 13) + 'px';
    o.move.style.top = (r.top - 13) + 'px';
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

// ---------- layer flattening ----------

// Decorative backgrounds (e.g. the wedding .floral-bg SVG) are sized off the
// canvas and carry pointer-events:none; they must not become interactive
// layers, even though they participate in absolute layout.
function isDecorative(el) {
    return el.classList
        && (el.classList.contains('floral-bg') || /floral|or|ornam|decor|pattern/i.test(String(el.className)));
}

// Logical "groups": the self-contained blocks each template is built from (a
// feature card, a pricing cell, a header strip, ...). Each group is a single
// draggable/resizable unit; the text/icons inside it are its editable children,
// not separate top-level layers. Grouping keeps related content looking intact
// when moved, instead of scattering a card's parts into individual layers.
const GROUP_SELECTOR = [
    '.branding', '.feature-card', '.phone-mockup', '.b-item', '.bottom-strip',
    '.bent-head', '.bent-cell', '.bent-foot',
    '.brand-container', '.header-badge', '.bento-card',
    '.ldg-head', '.ldg-sub', '.ldg-row', '.ldg-total', '.ldg-foot',
    '.monogram', '.dua-banner', '.invitation-text', '.main-groom-name',
    '.inshallah', '.detail-item', '.footer-calligraphy',
].join(', ');

// Mockup device frames are deliberately interactive objects (they hold an
// upload + independent move), so they stay top-level layers even when nested
// inside a card group. Re-exported for the layers panel.
const FRAME_SELECTOR = '.mockup-frame, .phone-mockup, .laptop-mockup, .monitor-mockup';
const ICON_SELECTOR = 'i.fas, i.far, i.fab';

// Whether a canvas element sits inside a group container (and should therefore
// not become a top-level layer of its own). Mockup frames are exempt — they
// remain independently movable inside any group.
function isGroupMember(el) {
    let p = el.parentElement;
    while (p && p !== canvasRoot()) {
        if (p.matches && p.matches(GROUP_SELECTOR) && !p.matches(FRAME_SELECTOR)) return true;
        p = p.parentElement;
    }
    return false;
}

// The nearest group container an element belongs to, or null. Exported for the
// layers panel so it can group editable text under its owning card, and to keep
// mockup frames out of any group.
export function groupOf(el) {
    if (!el) return null;
    if (el.matches && el.matches(FRAME_SELECTOR)) return null;
    return (el.closest && el.closest(GROUP_SELECTOR)) || null;
}

// Decide whether a canvas element is a "layer" — a block the user should be
// able to click, move and resize independently. The user wants literally every
// visible element moveable (text, card backgrounds, icons, headings), not just
// the ones with a painted background. We therefore treat every canvas-subtree
// element as a layer, excluding only the cases where interactivity is
// meaningless or harmful: the editor chrome, decorative pointer-events:none
// ornaments, SVG internals (a whole <svg> is already one layer; its <g>/<path>
// children are not separate layers), and text nodes nested inside an editable
// block (the editable block itself is the layer).
export function isLayerCandidate(el) {
    if (!el) return false;
    if (el.closest && el.closest('#editorUI')) return false;
    if (el.closest && el.closest('.upload-overlay')) return false;
    if (el.matches('[contenteditable="true"]')) return false; // handled by text layer system
    const editable = el.closest && el.closest('[contenteditable="true"]');
    if (editable) return false; // nested editable text spans are not separate layers
    if (isDecorative(el)) return false;
    if (window.getComputedStyle(el).pointerEvents === 'none') return false;
    if (el.tagName === 'g' || el.tagName === 'path' || el.tagName === 'use' || el.tagName === 'defs' || el.tagName === 'text') return false;
    // Void/line-break and empty sizing elements have no box of their own and
    // must not become layers (they are invisible structure).
    if (el.tagName === 'BR' || el.tagName === 'WBR' || el.tagName === 'HR' || el.tagName === 'SLOT' || el.tagName === 'AREA') return false;
    return true;
}

// Collect every element under the canvas design box so the whole subtree can
// be promoted out of normal flow. Returns document-order (parent before child)
// elements, which is the safe order for top-down absolutization.
function canvasSubtree() {
    const root = canvasRoot();
    if (!root) return [];
    return Array.from(root.querySelectorAll('*')).filter((el) => !el.closest('#editorUI'));
}

// Bind the click-to-select + drag-to-move behaviour onto a non-editable visual
// layer. Editable text is left to the editor's text selection (it stays movable
// via the selection overlay's move handle). Guarded so repeated calls no-op.
export function makeLayerMovable(layer) {
    if (!layer || layer.__movable) return;
    layer.__movable = true;
    if (layer.isContentEditable) return;
    if (!layer.style.zIndex) layer.style.zIndex = '1';
    layer.addEventListener('mousedown', (e) => {
        if (e.target.closest('.upload-overlay, [class$="-upload"], .mc-phone-upload, .mc-laptop-upload, .mc-monitor-upload')) return;
        if (e.detail >= 2) {
            selectElement(layer, true);
            startMove(e);
            return;
        }
        // Clicking the body only selects — it never moves the layer. Movement
        // is started exclusively from the top-left move handle (startMove).
        // If a locked container holds editable text, let the caret land so the
        // text can be edited directly instead of being swallowed by the lock.
        const editable = layer.querySelector('[contenteditable="true"]');
        if (editable && e.target.closest('[contenteditable="true"]')) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        selectElement(layer, true);
    });
}

// Promote the whole canvas subtree into absolute-positioned layers so no flow
// relationship remains — this is what removes the "everything is connected
// like a Word document" behaviour. Every element is repositioned using its
// own parent as the origin (matching the move/resize math), with all geometry
// measured in a single pre-mutation pass so nothing shifts while we read it.
// All normal-flow parents are absolutized too, otherwise a promoted child
// would still reflow the others through its parent's flex/column layout.
export function flattenCanvasIntoLayers() {
    const root = canvasRoot();
    if (!root) return;
    updateCanvasScale();

    const els = canvasSubtree();

    // Snapshot every rect BEFORE mutating anything: absolutizing one element
    // invalidates the layout for the rest, so all positions/sizes must come
    // from one consistent (pre-mutation) layout pass.
    const rects = new Map();
    rects.set(root, root.getBoundingClientRect());
    els.forEach((el) => rects.set(el, el.getBoundingClientRect()));

    const parentRect = (el) => {
        if (el.parentElement && rects.has(el.parentElement)) return rects.get(el.parentElement);
        return rects.get(root);
    };

    els.forEach((el) => {
        if (el.parentElement && el.closest('[contenteditable="true"]') !== el
            && el.closest('[contenteditable="true"]')) return;
        const er = rects.get(el);
        const pr = parentRect(el);
        el.style.position = 'absolute';
        el.style.margin = '0';
        el.style.left = ((er.left - pr.left) / state.currentScale) + 'px';
        el.style.top = ((er.top - pr.top) / state.currentScale) + 'px';
        // Absolute elements collapse to content size, so pin explicit dims
        // now to preserve the on-screen layout exactly.
        el.style.width = Math.round(er.width / state.currentScale) + 'px';
        el.style.height = Math.round(er.height / state.currentScale) + 'px';
    });

    // Every candidate becomes an independent, selection/move-wired layer. z-index
    // is left to makeLayerMovable's uniform value (and the template's own) so
    // absolute paint order follows source order — which already matches how the
    // template layered its elements — instead of imposing an arbitrary z-order.
    // Tag the movable layers: each group container, each mockup frame, and any
    // standalone element that is not inside a group. Editable text nested inside
    // a group is excluded (it belongs to the group and stays editable via the
    // text system). This is what lets a whole card move as one unit.
    const layers = els.filter((el) => {
        if (!isLayerCandidate(el)) return false;
        if (el.matches(FRAME_SELECTOR)) return true;
        if (el.matches(ICON_SELECTOR)) return true;
        // An element inside an outer group is a child of that group, not a
        // layer of its own — even if it matches GROUP_SELECTOR (e.g. a .b-item
        // inside a .bottom-strip). Checked before the group-container match so
        // nested groups collapse into their outer container.
        if (isGroupMember(el)) return false;
        if (el.matches(GROUP_SELECTOR)) return true;
        return false;
    });
    layers.forEach((el) => {
        el.dataset.layer = '1';
        if (el.matches(GROUP_SELECTOR) && !el.matches(FRAME_SELECTOR)) el.dataset.group = '1';
        makeLayerMovable(el);
    });
    renderLayers();
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
    // Locked layers can't be resized until unlocked in the Layers drawer.
    if (isLocked(state.activeElement)) return;
    record();
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
    const wrapper = canvasRoot();
    // The stage is the scaling container (varies per template: .canvas-stage,
    // .wedding-stage, .story-stage). Because the stage must never be scaled
    // together with the wrapper (that would distort the coordinate space),
    // it is always the wrapper's parent element.
    const stage = canvasStage();
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
    stage.style.transform = 'none';
    wrapper.style.transform = 'scale(' + ratio + ')';
    wrapper.style.transformOrigin = 'center center';
}

export function startMove(e) {
    if (!state.activeElement) return;
    record();
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
    const left = ((r.left - originRect.left) / state.currentScale);
    const top = ((r.top - originRect.top) / state.currentScale);
    state.activeElement.style.left = left + 'px';
    state.activeElement.style.top = top + 'px';
    state.moveState = {
        offsetX: e.clientX - r.left,
        offsetY: e.clientY - r.top,
        targetLeft: left,
        targetTop: top,
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', endMove);
    startDragLoop();
    showToolbarEl(false);
}

function onMove(e) {
    if (!state.moveState || !state.activeElement) return;
    // Must use the same origin function as startMove — mixing a different
    // origin here would reintroduce the exact class of bug this fix removes.
    const originRect = positioningOrigin(state.activeElement);
    state.moveState.targetLeft = (e.clientX - originRect.left - state.moveState.offsetX) / state.currentScale;
    state.moveState.targetTop = (e.clientY - originRect.top - state.moveState.offsetY) / state.currentScale;
}

// Damped drag easing: instead of snapping the element straight to the cursor,
// each frame moves it a fraction of the remaining distance. This produces a
// short, comfortable trailing motion without feeling unresponsive, because
// the cursor target is updated on every raw mousemove.
const DRAG_DAMP = 0.42;

function startDragLoop() {
    if (state.dragRaf) return;
    const tick = function() {
        if (!state.moveState || !state.activeElement) { state.dragRaf = null; return; }
        const el = state.activeElement;
        const currentLeft = Number.parseFloat(el.style.left) || 0;
        const currentTop = Number.parseFloat(el.style.top) || 0;
        const nl = currentLeft + (state.moveState.targetLeft - currentLeft) * DRAG_DAMP;
        const nt = currentTop + (state.moveState.targetTop - currentTop) * DRAG_DAMP;
        if (Math.abs(nl - currentLeft) > 0.05 || Math.abs(nt - currentTop) > 0.05) {
            el.style.left = nl + 'px';
            el.style.top = nt + 'px';
            positionOverlay();
        }
        state.dragRaf = requestAnimationFrame(tick);
    };
    state.dragRaf = requestAnimationFrame(tick);
}

function endMove() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', endMove);
    if (state.dragRaf) { cancelAnimationFrame(state.dragRaf); state.dragRaf = null; }
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
    });
}

// ---------- selection / toolbar visibility ----------

export function selectElement(el, keepOverlay) {
    // Selection is always allowed so locked layers still show their selection
    // box + handles; the lock only blocks moving/resizing (see startMove /
    // startResize). Unlocking happens in the Layers drawer. Editable text also
    // gets the same move handle, while clicks inside the text still place the
    // caret because text layers are excluded from body-drag selection.
    state.activeElement = el;
    if (el) {
        showToolbarEl(true);
        showOverlay();
    } else {
        showToolbarEl(false);
        hideOverlay();
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