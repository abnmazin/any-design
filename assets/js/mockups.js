// Mockups (القوالب tab): renders the device grid and inserts a fetched mockup
// fragment into the active canvas as a movable, resizable layer. Each device's
// <style> is scoped under .mc-*-frame and injected at most once per session.

import { MOCKUPS } from './state.js';
import { layerElements, maxLayerZ, renderLayers } from './layers.js';
import { selectElement, updateCanvasScale, makeFrameMovable } from './interactions.js';
import { record } from './history.js';

// Injected mockups are scoped with device-specific classes (e.g. .mc-phone-frame),
// so re-inserting the same device reuses one <style> block.
const injectedMockupStyles = {};

export function renderMockups() {
    const grid = document.getElementById('mockupGrid');
    if (!grid) return;
    grid.innerHTML = '';
    MOCKUPS.forEach((m) => {
        const item = document.createElement('div');
        item.className = 'mockup-item';
        item.dataset.mock = m.id;
        item.innerHTML = '<i class="fas ' + m.icon + '"></i><span>' + m.label + '</span>';
        item.addEventListener('mousedown', (e) => e.stopPropagation());
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            insertMockup(m.id);
        });
        grid.appendChild(item);
    });
}

export function insertMockup(id) {
    insertMockupFragment(id).then((frame) => {
        if (!frame) return;
        selectElement(frame, true);
        renderLayers();
        updateCanvasScale();
        if (document.getElementById('mockupGrid')) {
            document.querySelectorAll('.mockup-item').forEach((x) => {
                x.classList.toggle('active', x.dataset.mock === id);
            });
        }
    });
}

async function insertMockupFragment(id) {
    const wrapper = document.querySelector('.canvas-wrapper');
    if (!wrapper) return null;
    const m = MOCKUPS.find((x) => x.id === id);
    if (!m) return null;

    // Resolve the mockups folder. The fragments live at /mockups/ in both
    // dev (public/) and production (dist/), so try the absolute-root path
    // first, then ascending-relative fallbacks for cases where the app is
    // served from a sub-path. A response "ok" is not enough — vite's dev
    // server returns the SPA index (200) for missing HTML files, so every
    // candidate must be verified to actually contain the mockup fragment
    // before it is accepted.
    const fileName = id + '.html';
    const candidates = []
        .concat('/mockups/' + fileName, 'mockups/' + fileName,
            '../mockups/' + fileName, '../../mockups/' + fileName);
    let text = null;
    for (let i = 0; i < candidates.length && !text; i++) {
        try {
            const res = await fetch(candidates[i], { method: 'GET' });
            if (!res.ok) continue;
            const body = await res.text();
            if (body.includes('mockup-frame') || body.includes(id + '-frame')) text = body;
        } catch (e) { /* try next candidate */ }
    }
    if (!text) return null;
    record();

    // Dedupe the injected <style> so inserting the same device twice
    // doesn't duplicate rules.
    const styleMatch = text.match(/<style>([\s\S]*?)<\/style>/);
    if (styleMatch) {
        const scope = styleMatch[1].match(/\.(mc-[a-z-]+-frame)/);
        const key = scope ? scope[1] : id;
        if (!injectedMockupStyles[key]) {
            const st = document.createElement('style');
            st.textContent = styleMatch[1];
            document.head.appendChild(st);
            injectedMockupStyles[key] = true;
        }
    }

    // Extract the .mockup-frame markup (the whole body content).
    const bodyMatch = text.match(/<body>([\s\S]*?)<\/body>/);
    if (!bodyMatch) return null;
    const tmp = document.createElement('div');
    tmp.innerHTML = bodyMatch[1].trim();
    const frame = tmp.querySelector('.mockup-frame');
    if (!frame) return null;

    // Give this instance a unique id and make it an absolutely-positioned
    // draggable layer placed near the canvas top-centre.
    const uid = (id + '-' + Date.now()).replace(/[^a-z0-9-]/gi, '');
    frame.id = uid;

    // Append first so its dimension/style resolve, then measure and position.
    // Any inner screen image stays locked to the frame (not a separate layer).
    frame.style.position = 'absolute';
    frame.style.margin = '0';
    frame.querySelectorAll('img').forEach((img) => { img.draggable = false; });
    wrapper.appendChild(frame);

    const canvasRect = wrapper.getBoundingClientRect();
    const fw = frame.offsetWidth || frame.getBoundingClientRect().width;
    const fh = frame.offsetHeight || frame.getBoundingClientRect().height;
    frame.style.left = Math.max(0, (canvasRect.width - fw) / 2) + 'px';
    frame.style.top = Math.max(0, (canvasRect.height - fh) * 0.28) + 'px';
    frame.style.zIndex = String(maxLayerZ(layerElements()) + 1);

    // Wire the device's upload control (if present) and make it a movable layer.
    wireMockupUpload(frame);
    makeFrameMovable(frame);

    return frame;
}

function wireMockupUpload(frame) {
    const btn = frame.querySelector('.mc-phone-upload, .mc-laptop-upload, .mc-monitor-upload');
    const shot = frame.querySelector('.mc-shot');
    if (!btn || !shot) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    btn.addEventListener('click', (e) => { e.stopPropagation(); input.click(); });
    input.addEventListener('change', () => {
        if (!input.files || !input.files[0]) return;
// Revoke the previous blob URL before assigning the new one; an
        // unrevoked createObjectURL holds its blob in memory until the page
        // unloads, which leaks RAM after several uploads in one session.
        if (shot.src && shot.src.startsWith('blob:')) {
            URL.revokeObjectURL(shot.src);
        }
        shot.src = URL.createObjectURL(input.files[0]);
        // Reset so re-selecting the *same* file still fires 'change' again.
        input.value = '';
    });
}