// Layer management: discovery of editable/object layers, z-index ordering, and
// the Layers drawer (render + HTML5 drag-to-reorder). Reads and mutates the
// shared editor state; selects elements via the interactions module.

import { state } from './state.js';
import { selectElement } from './interactions.js';

export function editableElements() {
    return Array.from(document.querySelectorAll('[contenteditable="true"]'))
        .filter((el) => !el.closest('#editorUI'))
        .filter((el) => {
            const parentEditable = el.parentElement && el.parentElement.closest('[contenteditable="true"]');
            return !parentEditable;
        });
}

// Non-editable but movable "object" layers (mockup frames: phone, laptop, monitor).
// Any element tagged with the shared .mockup-frame class joins this group.
export function frameElements() {
    return Array.from(document.querySelectorAll('.canvas-wrapper .mockup-frame, .canvas-wrapper .phone-mockup'));
}

// All layers shown/managed in the Layers drawer: text layers + frames.
export function layerElements() {
    return editableElements().concat(frameElements());
}

export function layerZIndex(el) {
    if (!el) return 0;
    const inline = parseInt(el.style.zIndex, 10);
    if (!isNaN(inline)) return inline;
    const computed = parseInt(window.getComputedStyle(el).zIndex, 10);
    return isNaN(computed) ? 0 : computed;
}

export function maxLayerZ(els) {
    return els.reduce((m, el) => Math.max(m, layerZIndex(el)), 0);
}

export function renderLayers() {
    state.layerUpdating = true;
    const list = document.getElementById('layersList');
    const els = layerElements();
    const order = els.slice().sort((a, b) => layerZIndex(a) - layerZIndex(b));
    list.innerHTML = '';
    order.forEach((el, i) => {
        const li = document.createElement('li');
        const z = layerZIndex(el);
        li.dataset.el = String(i);
        li.draggable = true;
        li.innerHTML = '<span class="lay-grip" title="اسحب لإعادة الترتيب">&#9776;</span><span class="lay-idx">' + (i + 1) + '</span><span class="lay-name">' + describe(el) + '</span><span class="lay-tag">' + z + '</span>';
        li.addEventListener('mousedown', (e) => e.stopPropagation());
        li.addEventListener('click', (e) => { e.stopPropagation(); selectElement(el, true); });
        if (el === state.activeElement) li.classList.add('active');
        li.addEventListener('dragstart', (e) => {
            li.classList.add('drag-over');
            e.dataTransfer.setData('text/plain', String(i));
            e.dataTransfer.effectAllowed = 'move';
        });
        li.addEventListener('dragend', () => { li.classList.remove('drag-over'); });
        li.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; li.classList.add('drag-over'); });
        li.addEventListener('dragleave', () => { li.classList.remove('drag-over'); });
        li.addEventListener('drop', (e) => {
            e.preventDefault();
            li.classList.remove('drag-over');
            const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
            const toIdx = i;
            if (fromIdx === toIdx) return;
            reorderLayer(fromIdx, toIdx);
        });
        list.appendChild(li);
    });
    state.layerUpdating = false;
}

export function reorderLayer(fromIdx, toIdx) {
    const els = layerElements().sort((a, b) => layerZIndex(a) - layerZIndex(b));
    if (fromIdx < 0 || fromIdx >= els.length || toIdx < 0 || toIdx >= els.length) return;
    const targetZ = layerZIndex(els[toIdx]);
    const movedZ = layerZIndex(els[fromIdx]);
    els[fromIdx].style.zIndex = String(targetZ);
    els[toIdx].style.zIndex = String(movedZ);
    renderLayers();
}

export function describe(el) {
    if (el.classList && el.classList.contains('phone-mockup')) return 'إطار الموبايل';
    if (el.classList && el.classList.contains('laptop-mockup')) return 'إطار اللابتوب';
    if (el.classList && el.classList.contains('monitor-mockup')) return 'إطار الشاشة';
    const text = (el.textContent || '').trim();
    return (text.length > 22 ? text.slice(0, 22) + '…' : text) || el.tagName.toLowerCase();
}

// Initialise every editable layer with a positioned context and an ordered
// base z-index on load, so the Layers panel can reorder elements without the
// user having to physically drag (and thereby unlock) a layer on the canvas first.
export function initLayerStack() {
    layerElements().forEach((el, i) => {
        el.style.position = el.style.position || 'relative';
        if (!el.style.zIndex) el.style.zIndex = String(i + 1);
    });
    renderLayers();
}