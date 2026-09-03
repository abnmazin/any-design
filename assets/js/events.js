// Event wiring for the whole editor. Runs once after buildUI() has injected the
// chrome; binds toolbar/rail/sidebar/zoom/selection/document handlers to the
// interaction, text, layer and logo modules.

import { state, TEXT_COLORS } from './state.js';
import { swatchHtml, isEditableTarget } from './helpers.js';
import { applyZoom, updateCanvasScale, showOverlay, hideOverlay, showToolbarEl, sidebarOpen, selectElement, startMove } from './interactions.js';
import { renderLayers } from './layers.js';
import { setColor, setFont, resizeFont, toggleBold } from './text.js';
import { syncLogoActive } from './logo.js';
import { record, undo, redo } from './history.js';
import html2canvas from 'html2canvas';

// Each tool maps to an existing drawer pane, or null when no panel exists yet.
const TOOL_PANES = {
    templates: 'templates',
    elements: 'elements',
    text: 'text',
    uploads: null,
    brand: 'logo',
    layers: 'layers',
};

const TOOL_LABELS = {
    templates: 'القوالب',
    elements: 'العناصر',
    text: 'النص',
    uploads: 'الرفع',
    brand: 'العلامة',
    layers: 'الطبقات',
};

function activatePane(pane) {
    document.querySelectorAll('.es-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === pane));
    document.querySelectorAll('.es-pane').forEach((p) =>
        p.classList.toggle('active', p.dataset.pane === pane));
    if (pane === 'logo') syncLogoActive();
}

function onToolClick(e) {
    const btn = e.target.closest('.tool-rail button');
    if (!btn) return;

    const tool = btn.dataset.tool;
    const rails = document.querySelectorAll('.tool-rail button');
    const pane = TOOL_PANES[tool];

    // Toggle: clicking the already-active button closes the drawer and clears state.
    if (btn.classList.contains('active')) {
        btn.classList.remove('active');
        sidebarOpen(false);
        return;
    }

    rails.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    if (pane) {
        document.getElementById('esTitle').textContent = TOOL_LABELS[tool];
        sidebarOpen(true);
        activatePane(pane);
    } else {
        sidebarOpen(false);
        console.log('Opened: ' + TOOL_LABELS[tool]);
    }
}

function alignActiveText(alignment) {
    const el = state.activeElement;
    if (!el || !el.matches('[contenteditable="true"]')) return;
    record();
    el.style.textAlign = alignment;
}

function deleteActiveLayer() {
    const el = state.activeElement;
    if (!el || !el.parentElement || !el.closest('.canvas-wrapper, .card-frame')) return;
    record();
    el.remove();
    state.activeElement = null;
    state.activeRange = null;
    hideOverlay();
    showToolbarEl(false);
    renderLayers();
}

function runHistoryCommand(command) {
    if (command === 'undo') undo();
    else redo();
}

async function waitForCanvasAssets(source) {
    try { await document.fonts.ready; } catch (e) { /* use available fonts */ }
    const images = Array.from(source.querySelectorAll('img'));
    await Promise.all(images.map((image) => {
        if (image.complete && image.naturalWidth > 0) {
            return image.decode ? image.decode().catch(() => {}) : Promise.resolve();
        }
        return new Promise((resolve) => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', resolve, { once: true });
        });
    }));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function downloadCanvasPng() {
    const source = document.querySelector('.canvas-wrapper, .card-frame');
    if (!source) return;
    const button = document.querySelector('.save-btn');
    const previousTransform = source.style.transform;
    const previousOrigin = source.style.transformOrigin;
    if (button) button.disabled = true;
    try {
        await waitForCanvasAssets(source);
        source.style.transform = 'none';
        source.style.transformOrigin = 'top left';
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const image = await html2canvas(source, {
            backgroundColor: null,
            useCORS: true,
            allowTaint: false,
            scale: 1,
            imageTimeout: 30000,
            logging: false,
            width: source.offsetWidth,
            height: source.offsetHeight,
            onclone: (doc) => {
                const clonedSource = doc.querySelector('.canvas-wrapper, .card-frame');
                if (clonedSource) {
                    clonedSource.style.transform = 'none';
                    clonedSource.style.transformOrigin = 'top left';
                }
                doc.querySelectorAll('#editorUI, .editor-top-bar, .tool-rail, #resizeOverlay, .rs-handle, #rsMoveHandle, #layerHoverRing, .preview-toolbar')
                    .forEach((el) => { el.remove(); });
            },
        });
        image.toBlob((blob) => {
            if (!blob) return;
            const link = document.createElement('a');
            link.download = 'any-design-' + Date.now() + '.png';
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);
        }, 'image/png');
    } finally {
        source.style.transform = previousTransform;
        source.style.transformOrigin = previousOrigin;
        if (button) button.disabled = false;
    }
}

export function bind() {
    // sidebar tabs
    document.querySelectorAll('.es-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.es-tab').forEach((t) => t.classList.toggle('active', t === tab));
            document.querySelectorAll('.es-pane').forEach((p) =>
                p.classList.toggle('active', p.dataset.pane === tab.dataset.tab));
            if (tab.dataset.tab === 'logo') syncLogoActive();
        });
    });

    // toolbar swatches (bottom)
    document.getElementById('tbSwatches').innerHTML = TEXT_COLORS.map(swatchHtml).join('');
    document.getElementById('textSwatches').innerHTML = TEXT_COLORS.map(swatchHtml).join('');
    document.querySelectorAll('#tbSwatches .tb-swatch, #textSwatches .es-swatch').forEach((sw) => {
        sw.addEventListener('click', () => setColor(sw.dataset.color));
    });

    // font selects
    [document.getElementById('tbFont'), document.getElementById('fontSelect')].forEach((sel) => {
        sel.addEventListener('change', () => setFont(sel.value));
    });

    // size
    document.getElementById('tbPlus').addEventListener('click', () => resizeFont(1));
    document.getElementById('tbMinus').addEventListener('click', () => resizeFont(-1));
    document.getElementById('sizePlus').addEventListener('click', () => resizeFont(1));
    document.getElementById('sizeMinus').addEventListener('click', () => resizeFont(-1));

    // bold + custom color
    document.getElementById('tbBold').addEventListener('click', toggleBold);
    document.getElementById('textBold').addEventListener('click', toggleBold);
    document.getElementById('customColor').addEventListener('input', (e) => setColor(e.target.value));
    document.getElementById('tbAlignRight').addEventListener('click', () => alignActiveText('right'));
    document.getElementById('tbAlignCenter').addEventListener('click', () => alignActiveText('center'));
    document.getElementById('tbAlignLeft').addEventListener('click', () => alignActiveText('left'));
    document.getElementById('tbDelete').addEventListener('click', deleteActiveLayer);
    document.querySelector('.save-btn').addEventListener('click', downloadCanvasPng);

    document.addEventListener('beforeinput', (e) => {
        if (isEditableTarget(e.target) && !e.inputType.startsWith('history')) record();
    });

    // sidebar close (drawer close button)
    document.getElementById('esClose').addEventListener('click', () => sidebarOpen(false));

    // tool rail (Canva-style primary navigation)
    document.querySelector('.tool-rail').addEventListener('click', onToolClick);

    document.getElementById('undoButton').addEventListener('click', () => runHistoryCommand('undo'));
    document.getElementById('redoButton').addEventListener('click', () => runHistoryCommand('redo'));

    document.addEventListener('keydown', (e) => {
        const modifier = e.ctrlKey || e.metaKey;
        if (!modifier || e.altKey) return;
        const target = e.target;
        if (target.matches('input, textarea, select') && !target.matches('[contenteditable="true"]')) return;
        if (!state.activeElement || !state.activeElement.matches('[contenteditable="true"]')) return;
        if (e.key.toLowerCase() === 'z') {
            e.preventDefault();
            runHistoryCommand(e.shiftKey ? 'redo' : 'undo');
        }
    });

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

    // selection -> activate element + show toolbar/overlay; save partial range
    document.addEventListener('selectionchange', () => {
        if (state.layerUpdating) return;
        const sel = window.getSelection();
        const editable = isEditableTarget(sel && sel.anchorNode);
        if (editable) {
            selectElement(editable, true);
            if (sel && sel.rangeCount && !sel.isCollapsed) {
                state.activeRange = sel.getRangeAt(0).cloneRange();
            }
        }
    });

    // Prevent toolbar/sidebar controls from stealing focus, preserving the
    // live text selection so partial-text formatting isn't lost on click.
    document.getElementById('editorUI').addEventListener('mousedown', (e) => {
        e.preventDefault();
    });

    // A double-click starts dragging any unlocked editable text layer. A
    // single click remains available for placing the caret and editing text.
    document.addEventListener('mousedown', (e) => {
        if (e.detail < 2 || document.getElementById('editorUI').contains(e.target)) return;
        const editable = isEditableTarget(e.target);
        if (!editable) return;
        selectElement(editable, true);
        startMove(e);
    });

    // clicking outside editable hides toolbar + overlay
    document.addEventListener('mousedown', (e) => {
        if (isEditableTarget(e.target)) return;
        if (document.getElementById('editorUI').contains(e.target)) return;
        showToolbarEl(false);
        hideOverlay();
        state.activeElement = null;
        state.activeRange = null;
        renderLayers();
    });

    // reposition overlay + re-scale canvas on window resize
    window.addEventListener('resize', () => {
        updateCanvasScale();
        if (state.activeElement) { showOverlay(); }
    });

    // Hover ring: highlight the draggable layer group under the pointer with a
    // rotating dashed border so users can tell it is interactable. Upload
    // buttons and editor chrome are excluded — those have their own affordances.
    const ring = document.getElementById('layerHoverRing');
    let hoverTo = null;
    let hoverTimer = null;

    function positionHoverRing() {
        if (!hoverTo || !hoverTo.isConnected) { ring.classList.remove('show'); return; }
        const r = hoverTo.getBoundingClientRect();
        ring.style.left = r.left + 'px';
        ring.style.top = r.top + 'px';
        ring.style.width = Math.round(r.width) + 'px';
        ring.style.height = Math.round(r.height) + 'px';
        ring.classList.add('show', 'spin');
    }

    function hideHoverRing() {
        ring.classList.remove('show', 'spin');
        hoverTo = null;
    }

    document.addEventListener('mouseover', (e) => {
        const t = e.target;
        if (t.closest('#editorUI')) return;
        if (t.closest('.upload-overlay, [class$="-upload"], .mc-phone-upload, .mc-laptop-upload, .mc-monitor-upload')) return;
        // The ring is for draggable layer groups only; editable text already has
        // its own caret feedback and shouldn't get a box drawn over it on hover.
        const layer = t.closest('[data-layer]');
        if (!layer) return;
        hoverTo = layer;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(positionHoverRing, 40);
    });

    document.addEventListener('mouseout', (e) => {
        // Keep the ring while moving between descendants of the same layer;
        // hide only when the pointer actually leaves the hovered layer.
        const related = e.relatedTarget && e.relatedTarget.nodeType === 1 ? e.relatedTarget : null;
        if (hoverTo && related && hoverTo.contains(related)) return;
        clearTimeout(hoverTimer);
        hideHoverRing();
    });

    renderLayers();
}