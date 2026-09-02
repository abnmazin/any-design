// Text formatting for the active element: applies inline styles to a live
// selection (or the whole element when nothing is selected) and keeps the
// toolbar/sidebar text controls synchronised with the current element state.

import { state } from './state.js';
import { rgbToHex, currentFontSize, normalizeFamilyName } from './helpers.js';

function applyToSelection(applyFn) {
    const sel = window.getSelection();

    // Restore a previously saved partial selection if the live one was
    // collapsed by focus loss (Step 3 fallback for aggressive browsers).
    if ((!sel || sel.isCollapsed || !sel.rangeCount)
        && state.activeRange && !state.activeRange.collapsed && state.activeElement.contains(state.activeRange.commonAncestorContainer)) {
        sel.removeAllRanges();
        sel.addRange(state.activeRange.cloneRange());
    }

    const within = sel && sel.rangeCount && !sel.isCollapsed
        && state.activeElement.contains(sel.anchorNode) && state.activeElement.contains(sel.focusNode);
    if (!within) { applyFn(state.activeElement); syncTextUI(); return; }

    const range = sel.getRangeAt(0).cloneRange();
    const saved = sel.getRangeAt(0).cloneRange();

    // Reuse a styling span when the whole selection already sits inside one,
    // so repeated partial edits don't stack nested <span>s.
    const common = range.commonAncestorContainer;
    const span = (common && common.nodeType === 1 && common.tagName === 'SPAN')
        ? common
        : null;
    if (span && range.toString() === span.textContent) {
        applyFn(span);
    } else {
        const fragment = range.extractContents();
        if (!fragment.textContent) { applyFn(state.activeElement); syncTextUI(); return; }
        const wrap = document.createElement('span');
        wrap.appendChild(fragment);
        range.insertNode(wrap);
        applyFn(wrap);
    }
    saved.collapse(false);
    sel.removeAllRanges();
    sel.addRange(saved);
    syncTextUI();
}

export function setColor(color) {
    if (!state.activeElement) return;
    applyToSelection((target) => {
        target.style.color = color;
        target.querySelectorAll('span, i, em, b, strong').forEach((s) => { s.style.color = color; });
    });
    syncTextUI();
}

export function setFont(family) {
    if (!state.activeElement) return;
    applyToSelection((el) => { el.style.fontFamily = family; });
    syncTextUI();
}

export function toggleBold() {
    if (!state.activeElement) return;
    applyToSelection((el) => {
        const w = parseInt(window.getComputedStyle(el).fontWeight, 10) || 400;
        el.style.fontWeight = w >= 600 ? '400' : '700';
    });
    syncTextUI();
}

export function resizeFont(delta) {
    if (!state.activeElement) return;
    applyToSelection((target) => {
        const size = currentFontSize(target) || 0;
        target.style.fontSize = Math.min(160, Math.max(10, size + delta * 2)) + 'px';
    });
}

export function syncTextUI() {
    if (!state.activeElement) return;
    const size = currentFontSize(state.activeElement) || 0;
    document.getElementById('tbSizeVal').textContent = size;
    document.getElementById('sizeVal').textContent = size;
    const color = rgbToHex(window.getComputedStyle(state.activeElement).color);
    document.querySelectorAll('#tbSwatches .tb-swatch, #textSwatches .es-swatch').forEach((sw) => {
        const m = sw.dataset.color.toLowerCase() === String(color || '').toLowerCase();
        sw.classList.toggle('active', m);
    });
    const family = normalizeFamilyName(window.getComputedStyle(state.activeElement).fontFamily);
    [document.getElementById('tbFont'), document.getElementById('fontSelect')].forEach((sel) => {
        Array.from(sel.options).forEach((opt) => {
            if (family.indexOf(normalizeFamilyName(opt.value)) !== -1) sel.value = opt.value;
        });
    });
}