// Layer management: discovery of editable/object layers, z-index ordering, and
// the Layers drawer (render + HTML5 drag-to-reorder). Reads and mutates the
// shared editor state; selects elements via the interactions module.

import { state } from './state.js';
import { selectElement, groupOf } from './interactions.js';

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

// Flattened group containers and standalone visual layers, marked by
// flattenCanvasIntoLayers() with data-layer (and data-group for the containers).
// Frames and editable text are handled by the other groups, so they are excluded
// here to avoid duplicate drawer entries.
export function visualLayerElements() {
    return Array.from(document.querySelectorAll('[data-layer]'))
        .filter((el) => !el.closest('#editorUI'))
        .filter((el) => !el.closest('[contenteditable="true"]'))
        .filter((el) => !frameElements().includes(el) && !el.closest('.mockup-frame, .phone-mockup'))
        .filter((el, idx, arr) => arr.indexOf(el) === idx);
}

// The editable text lines that are direct children of a group container — the
// expandable sub-rows shown under a group in the drawer.
export function groupChildren(groupEl) {
    return editableElements().filter((el) => groupOf(el) === groupEl);
}

// All top-level entries shown/managed in the Layers drawer: group containers +
// standalone visual layers + mockup frames + standalone editable text. Editable
// text inside a group is represented by its group (as expandable children), so
// it is left out of the top-level list.
export function layerElements() {
    const standaloneText = editableElements().filter((el) => !groupOf(el));
    return standaloneText.concat(frameElements(), visualLayerElements());
}

export function isGroup(el) {
    return el.getAttribute && el.getAttribute('data-group') === '1';
}

// ---------- locking ----------
// Layered objects default to locked (user must unlock before editing/moving),
// while editable text layers default to unlocked so text can be edited right
// away. Lock state lives on the element itself, so it survives re-renders.

export function isTextLayer(el) {
    return editableElements().includes(el);
}

export function isLocked(el) {
    return el.getAttribute('data-layer-locked') === '1';
}

export function setLocked(el, locked) {
    if (locked) el.setAttribute('data-layer-locked', '1');
    else el.removeAttribute('data-layer-locked');
}

// The default state a freshly-flattened/added layer starts in: text is open,
// every other object layer is locked.
export function lockDefault(el) {
    setLocked(el, !isTextLayer(el));
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
    const els = layerElements().sort((a, b) => layerZIndex(a) - layerZIndex(b));
    list.innerHTML = '';
    els.forEach((el, i) => {
        if (isGroup(el)) {
            renderGroupRow(list, el, i + 1);
        } else {
            list.appendChild(buildRow(el, { group: false, index: i + 1 }));
        }
    });
    state.layerUpdating = false;
}

// A group's own row with a chevron; clicking it expands/collapses the editable
// children listed under it. Expanding sets data-expanded so a later drag-swap of
// the group keeps its visual state.
function renderGroupRow(list, el, index) {
    const row = buildRow(el, { group: true, index: index });
    const chevron = row.querySelector('.lay-chev');
    chevron.addEventListener('click', (e) => {
        e.stopPropagation();
        row.classList.toggle('expanded');
        list.classList.toggle('has-expanded', list.querySelector('.expanded') != null);
    });
    list.appendChild(row);
}

// Build one drawer row for a layer. A name, z-index tag, lock toggle and drag
// grip are shared by every row; group rows also get a chevron.
function buildRow(el, opts = {}) {
    const li = document.createElement('li');
    const z = layerZIndex(el);
    const locked = isLocked(el);
    li.draggable = true;
    li.classList.toggle('locked', locked);
    if (opts.group) li.classList.add('group-row');
    const chevClass = opts.group ? '' : ' lay-chev-hidden';
    li.innerHTML = '<span class="lay-chev' + chevClass + '" role="button" aria-label="توسيع"></span><span class="lay-grip" title="اسحب لإعادة الترتيب">&#9776;</span><span class="lay-idx">' + (opts.index || '') + '</span><span class="lay-name">' + describe(el) + '</span><span class="lay-lock" title="' + (locked ? 'قفل' : 'فتح') + '" role="button" aria-label="' + (locked ? 'قفل' : 'فتح') + '"><i class="' + (locked ? 'fas fa-lock' : 'fas fa-lock-open') + '"></i></span><span class="lay-tag">' + z + '</span>';
    if (opts.group) {
        const chev = li.querySelector('.lay-chev');
        const items = groupChildren(el).map((child) => buildRow(child, { group: false, index: '' }));
        const sub = document.createElement('ul');
        sub.className = 'lay-children';
        items.forEach((item) => sub.appendChild(item));
        chev.after(sub);
    }
    li.addEventListener('mousedown', (e) => e.stopPropagation());
    li.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target.closest('.lay-lock')) {
            setLocked(el, !isLocked(el));
            renderLayers();
            return;
        }
        selectElement(el, true);
    });
    if (el === state.activeElement) li.classList.add('active');
    li.addEventListener('dragstart', (e) => {
        li.classList.add('drag-over');
        e.dataTransfer.setData('text/plain', markerFor(el));
        e.dataTransfer.effectAllowed = 'move';
    });
    li.addEventListener('dragend', () => { li.classList.remove('drag-over'); });
    li.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; li.classList.add('drag-over'); });
    li.addEventListener('dragleave', () => { li.classList.remove('drag-over'); });
    li.addEventListener('drop', (e) => {
        e.preventDefault();
        li.classList.remove('drag-over');
        const fromMarker = e.dataTransfer.getData('text/plain');
        const toMarker = markerFor(el);
        if (fromMarker === toMarker) return;
        reorderLayers(fromMarker, toMarker);
    });
    return li;
}

// A stable identity for drag-reorder of any row (groups, frames, text, or an
// expanded group child), keyed on the marker type + element z-index.
function markerFor(el) {
    return groupOf(el) ? 'child:' + layerZIndex(el) : 'top:' + layerZIndex(el);
}

export function reorderLayers(fromMarker, toMarker) {
    const from = resolveMarker(fromMarker);
    const to = resolveMarker(toMarker);
    if (!from || !to || from === to) return;
    const aZ = layerZIndex(from);
    const bZ = layerZIndex(to);
    from.style.zIndex = String(bZ);
    to.style.zIndex = String(aZ);
    renderLayers();
}

function resolveMarker(marker) {
    const [kind, zStr] = String(marker).split(':');
    const z = parseInt(zStr, 10);
    const pool = kind === 'child'
        ? layerElements().filter(isGroup).flatMap(groupChildren)
        : layerElements();
    return pool.find((el) => layerZIndex(el) === z) || null;
}

export function describe(el) {
    if (el.dataset && el.dataset.elementLabel) return el.dataset.elementLabel;
    if (el.matches && el.matches('i.fas, i.far, i.fab')) {
        const owner = el.closest('.feature-card, .branding, .bottom-strip');
        const heading = owner && owner.querySelector('h1, h2, h3, h4, [contenteditable="true"]');
        return heading ? 'أيقونة ' + heading.textContent.trim() : 'أيقونة';
    }
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
    const topLevel = layerElements();
    const children = topLevel.filter(isGroup).flatMap(groupChildren);
    topLevel.concat(children).forEach((el, i) => {
        el.style.position = el.style.position || 'relative';
        // Always assign a unique, ascending z-index (ignoring the uniform
        // z-index '1' that flattening stamped on every visual layer). Distinct
        // z-values are what make the Layers drawer reorder swap actually change
        // stacking order — swapping two identical values is a visual no-op.
        el.style.zIndex = String(i + 1);
        // Only apply the default lock on first visit (attribute absent), so a
        // user-toggle isn't overwritten on subsequent renders/re-enables.
        if (!el.hasAttribute('data-layer-locked')) lockDefault(el);
    });
    renderLayers();
}