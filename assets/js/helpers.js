// Pure helpers shared across the editor modules: markup builders for the
// dynamic swatch/font controls plus small color/font/text detection utilities.

import { TEXT_COLORS, FONTS } from './state.js';

export function swatchHtml(c) {
    const light = (/^#(f|e|d)/i.test(c.color) || c.color === '#ffffff') ? ' tb-swatch-light' : '';
    return `<span class="tb-swatch${light}" data-color="${c.color}" title="${c.name}" style="background:${c.color}"></span>`;
}

export function fontsHtml() {
    return FONTS.map((f) => `<option value="${f.value}">${f.label}</option>`).join('');
}

export function rgbToHex(color) {
    const m = (color || '').match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
    if (!m) return null;
    const to = (n) => Math.round(Number(n)).toString(16).padStart(2, '0');
    return '#' + to(m[1]) + to(m[2]) + to(m[3]);
}

export function currentFontSize(el) {
    return Math.round(parseFloat(window.getComputedStyle(el).fontSize));
}

export function normalizeFamilyName(family) {
    return String(family).toLowerCase().replace(/^'|'$/g, '').trim();
}

// Returns the nearest editable ancestor of a node, or null. Nodes inside the
// editor UI chrome are never treated as editable targets.
export function isEditableTarget(node) {
    const el = node && node.nodeType === 1 ? node : (node && node.parentElement);
    const editable = el && el.closest('[contenteditable="true"]');
    if (!editable) return false;
    if (editable.closest('#editorUI')) return false;
    return editable;
}

// The sidebar swatch grid reuses the same colour set as the toolbar.
export const ALL_TEXT_COLORS = TEXT_COLORS;