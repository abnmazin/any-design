// Form-to-canvas binding for the Strict Template Generator. Sidebar form
// controls carry data-bind-to; canvas text nodes carry data-bind. A single
// delegated input listener writes the control value into the matching node(s)
// instantly. The canvas itself is read-only (no contenteditable), so this form
// is the only way to change content.

// Preserve the styled accent <span> (e.g. "دفتر <span>الديون</span>") while
// rewriting the whole heading. These templates accent the trailing word, so the
// last token of the typed value becomes the span text and everything before it
// is the plain leader. Elements without an accented span get plain text.
function setBoundText(el, value) {
    const span = el.querySelector(':scope > span');
    const text = String(value || '').trim();
    const idx = text.lastIndexOf(' ');
    const head = idx === -1 ? '' : text.slice(0, idx).trim();
    const tail = idx === -1 ? text : text.slice(idx + 1).trim();

    Array.from(el.childNodes).forEach((node) => { if (node !== span) node.remove(); });
    if (!span) { el.textContent = text; return; }
    const leader = document.createTextNode(head ? head + ' ' : '');
    el.insertBefore(leader, span);
    span.textContent = tail;
}

// A bind id may target multiple canvas nodes (e.g. brand-name appears in the
// heading span source and the bottom strip). Update every occurrence.
function applyBind(bindTo, value) {
    document.querySelectorAll('[data-bind="' + bindTo + '"]').forEach((el) => {
        if (el.dataset.imageBind) return;
        setBoundText(el, value);
    });
}

// Wire the app-screenshot file input to the phone mockup image. Reuses the
// blob-URL lifecycle from the old mockup upload, without leaking.
function wireScreenshotUpload() {
    const inputEl = document.getElementById('appScreenshotInput');
    const shot = document.querySelector('[data-bind="app-screenshot"]');
    if (!inputEl || !shot) return;
    inputEl.addEventListener('change', () => {
        if (!inputEl.files || !inputEl.files[0]) return;
        if (shot.src && shot.src.startsWith('blob:')) URL.revokeObjectURL(shot.src);
        shot.src = URL.createObjectURL(inputEl.files[0]);
        inputEl.value = '';
    });
}

// Pre-fill each form control from the canvas node's current text on boot so the
// form always mirrors the template's existing copy.
function seedForm() {
    document.querySelectorAll('#contentForm [data-bind-to]').forEach((control) => {
        if (control.type === 'file') return;
        const boundEl = document.querySelector('[data-bind="' + control.dataset.bindTo + '"]');
        if (boundEl) control.value = boundEl.textContent.trim();
    });
}

export function initFormBindings() {
    const formEl = document.getElementById('contentForm');
    if (!formEl) return;

    seedForm();

    // Single delegated listener covers every text control; the native input
    // event fires on every keystroke and each paste.
    formEl.addEventListener('input', (e) => {
        const control = e.target.closest('[data-bind-to]');
        if (!control || control.type === 'file') return;
        applyBind(control.dataset.bindTo, control.value);
    });

    wireScreenshotUpload();
}