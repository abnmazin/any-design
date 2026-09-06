// "حفظ" (save) for the designs gallery. Persists a snapshot of the current
// canvas to the designs table: the flattened canvas outerHTML plus the
// template's own CSS and webfont links so a saved design reopens identically in
// the standalone design page. Saves insert a new row, or update when the editor
// was booted from a saved design (window.__currentDesignId).
import { supabase } from './supabase-client.js';
import { currentUser } from './account.js';
import { canvasSource, canvasIntrinsicSize, canvasThumbnailDataUrl } from './export.js';

const SAVE_DEFAULT = '<i class="fas fa-floppy-disk"></i> حفظ';
const SAVE_LOADING = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
const SAVE_DONE = '<i class="fas fa-check"></i> تم الحفظ';

const SAVE_BTN_SELECTOR = '.save-design-btn';

function templateCssBlocks() {
    const blocks = [];
    document.querySelectorAll('head > style').forEach((style) => {
        const text = style.textContent || '';
        if (text.includes('#editorUI') || text.includes('.editor-top-bar') || text.includes('.es-')) return;
        blocks.push(text);
    });
    return blocks.join('\n');
}

function templateFontLinks() {
    return Array.from(document.querySelectorAll('head > link[rel="stylesheet"]'))
        .map((link) => link.href)
        .filter((href) => href.includes('fonts.googleapis.com'))
        .map((href) => '<link rel="stylesheet" href="' + href + '">')
        .join('\n');
}

function designTitle() {
    const titleEl = document.querySelector('.top-bar-title');
    return (titleEl && titleEl.textContent.trim()) || 'تصميم جديد';
}

function templateId() {
    const match = window.location.pathname.match(/templates\/([^/]+)/);
    return match ? match[1] : 'custom';
}

async function captureSnapshot() {
    const canvas = canvasSource();
    if (!canvas) return null;
    await document.fonts.ready;
    const { width, height } = canvasIntrinsicSize(canvas);
    const clone = canvas.cloneNode(true);
    clone.style.width = width + 'px';
    clone.style.height = height + 'px';
    clone.style.transform = 'none';
    return {
        width,
        height,
        html: clone.outerHTML,
        css: templateCssBlocks(),
        fonts: templateFontLinks(),
        thumb: await canvasThumbnailDataUrl(canvas, 320).catch(() => null),
    };
}

function setButtonInner(button, inner, disabled) {
    button.innerHTML = inner;
    button.disabled = disabled;
}

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((resolve) => setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), ms)),
    ]);
}

async function saveDesign() {
    const user = await currentUser().catch(() => null);
    if (!user) {
        window.location.href = '/app/index.html';
        return;
    }
    const canvas = canvasSource();
    const button = document.querySelector(SAVE_BTN_SELECTOR);
    if (!canvas || !button) return;
    setButtonInner(button, SAVE_LOADING, true);
    try {
        const snapshot = await captureSnapshot();
        if (!snapshot) throw new Error('canvas missing');
        const title = designTitle();
        const size = snapshot.width + ' × ' + snapshot.height;
        const existingId = window.__currentDesignId;
        const query = existingId
            ? supabase.from('designs').update({
                  title,
                  size,
                  html: snapshot.html,
                  css: snapshot.css,
                  fonts: snapshot.fonts,
                  thumb: snapshot.thumb,
              }).eq('id', existingId)
            : supabase.from('designs').insert({
                  user_id: user.id,
                  template_id: templateId(),
                  title,
                  size,
                  html: snapshot.html,
                  css: snapshot.css,
                  fonts: snapshot.fonts,
                  thumb: snapshot.thumb,
              });
        const { data, error } = await withTimeout(query.select('id').maybeSingle(), 8000);
        if (error) throw error;
        if (data) window.__currentDesignId = data.id;
        setButtonInner(button, SAVE_DONE, true);
        window.setTimeout(() => setButtonInner(button, SAVE_DEFAULT, false), 1800);
    } catch (error) {
        console.error('save failed:', error);
        window.alert('تعذر الحفظ. تأكد من اتصالك وأعد المحاولة.');
        setButtonInner(button, SAVE_DEFAULT, false);
    }
}

export function initSaveHandler() {
    const button = document.querySelector(SAVE_BTN_SELECTOR);
    if (button) button.addEventListener('click', saveDesign);
}