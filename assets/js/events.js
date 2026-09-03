// Event wiring for the read-only editor. Runs once after buildUI() has injected
// the chrome; binds tool-rail pane switching, zoom controls, the export button,
// and the brand logo picker.

import { state } from './state.js';
import { applyZoom, updateCanvasScale, canvasRoot } from './interactions.js';
import { syncLogoActive, renderLogos } from './logo.js';
import { exportCanvas } from './export.js';

// Each tool maps to a sidebar pane. For a strict template generator the only
// panes are the content form (إعدادات التصميم) and the brand picker (العلامة).
const TOOL_PANES = {
    content: 'content',
    brand: 'brand',
};

const TOOL_LABELS = {
    content: 'إعدادات التصميم',
    brand: 'العلامة',
};

function activatePane(pane) {
    document.querySelectorAll('.es-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === pane));
    document.querySelectorAll('.es-pane').forEach((paneEl) =>
        paneEl.classList.toggle('active', paneEl.dataset.pane === pane));
    if (pane === 'brand') syncLogoActive();
}

function onToolClick(e) {
    const btn = e.target.closest('.tool-rail button');
    if (!btn) return;
    const tool = btn.dataset.tool;
    const pane = TOOL_PANES[tool];
    const rails = document.querySelectorAll('.tool-rail button');

    if (btn.classList.contains('active')) {
        btn.classList.remove('active');
        document.getElementById('editorSidebar').classList.remove('open');
        updateCanvasScale();
        return;
    }

    rails.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    if (pane) {
        document.getElementById('esTitle').textContent = TOOL_LABELS[tool];
        document.getElementById('editorSidebar').classList.add('open');
        activatePane(pane);
    } else {
        document.getElementById('editorSidebar').classList.remove('open');
    }
    updateCanvasScale();
}

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

    // sidebar close (drawer close button)
    document.getElementById('esClose').addEventListener('click', () => {
        document.getElementById('editorSidebar').classList.remove('open');
        updateCanvasScale();
        document.querySelectorAll('.tool-rail button').forEach((b) => b.classList.remove('active'));
    });

    // tool rail (primary navigation)
    document.querySelector('.tool-rail').addEventListener('click', onToolClick);

    // export button (top navbar). Kept functional with html2canvas for now;
    // see export.js for the html-to-image swap point.
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

    // Re-scale the locked preview when the viewport changes or the drawer opens.
    document.getElementById('editorSidebar').addEventListener('transitionend', (e) => {
        if (e.propertyName === 'transform' || e.target === document.getElementById('editorSidebar')) {
            updateCanvasScale();
        }
    });
    window.addEventListener('resize', updateCanvasScale);

    const initial = canvasRoot();
    if (initial) {
        document.getElementById('zoomValue').value = Math.round(state.userZoom * 100) + '';
        updateCanvasScale();
    }
}