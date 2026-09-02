// Event wiring for the whole editor. Runs once after buildUI() has injected the
// chrome; binds toolbar/rail/sidebar/zoom/selection/document handlers to the
// interaction, text, layer and logo modules.

import { state, TEXT_COLORS } from './state.js';
import { swatchHtml, isEditableTarget } from './helpers.js';
import { applyZoom, updateCanvasScale, showOverlay, hideOverlay, showToolbarEl, sidebarOpen, selectElement } from './interactions.js';
import { renderLayers } from './layers.js';
import { setColor, setFont, resizeFont, toggleBold } from './text.js';
import { syncLogoActive } from './logo.js';

// Each tool maps to an existing drawer pane, or null when no panel exists yet.
const TOOL_PANES = {
    templates: 'templates',
    elements: null,
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

    // sidebar close (drawer close button)
    document.getElementById('esClose').addEventListener('click', () => sidebarOpen(false));

    // tool rail (Canva-style primary navigation)
    document.querySelector('.tool-rail').addEventListener('click', onToolClick);

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

    renderLayers();
}