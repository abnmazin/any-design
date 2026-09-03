// Canvas export. The Strict Template Generator exports the locked preview as a
// high-resolution PNG using the html-to-image library.

import { toPng } from 'html-to-image';

const EXPORT_PIXEL_RATIO = 3;
const ERROR_TIMEOUT_MS = 60000;
const SAVE_BTN_INNER = '<i class="fas fa-download"></i> تصدير';
const SAVE_BTN_LOADING = '<i class="fas fa-spinner fa-spin"></i> جاري التصدير...';

async function waitForCanvasAssets(source) {
    const timeout = new Promise((resolve) => {
        setTimeout(resolve, ERROR_TIMEOUT_MS);
    });
    await Promise.race([
        (async () => {
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
        })(),
        timeout,
    ]);
}

function canvasSource() {
    return document.querySelector('.canvas-wrapper, .card-frame');
}

function isEditorChrome(node) {
    if (!node || !node.classList) return false;
    return node.classList.contains('editor-top-bar')
        || node.classList.contains('tool-rail')
        || node.classList.contains('preview-toolbar')
        || node.classList.contains('upload-overlay')
        || node.id === 'editorUI';
}

// The canvas root is a shrinkable flex item, so its laid-out offsetWidth can be
// far smaller than the template's design size (e.g. 1080 -> ~756 on a narrow
// viewport). Neutralize flex-shrink and the zoom transform to read the true
// design dimensions, which drive the pixelRatio-scaled export.
function intrinsicSize(el) {
    const prior = {
        flex: el.style.flex,
        width: el.style.width,
        height: el.style.height,
        transform: el.style.transform,
        transformOrigin: el.style.transformOrigin,
    };
    el.style.flex = '0 0 auto';
    el.style.transform = 'none';
    el.style.transformOrigin = 'top left';
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    el.style.flex = prior.flex;
    el.style.width = prior.width;
    el.style.height = prior.height;
    el.style.transform = prior.transform;
    el.style.transformOrigin = prior.transformOrigin;
    return { width, height };
}

export async function exportCanvas() {
    const source = canvasSource();
    if (!source) return;
    const button = document.querySelector('.save-btn');
    if (button) {
        button.disabled = true;
        button.innerHTML = SAVE_BTN_LOADING;
    }
    try {
        await waitForCanvasAssets(source);
        const { width, height } = intrinsicSize(source);
        const dataUrl = await toPng(source, {
            pixelRatio: EXPORT_PIXEL_RATIO,
            width,
            height,
            backgroundColor: null,
            style: {
                width: width + 'px',
                height: height + 'px',
                flex: '0 0 auto',
                transform: 'none',
                transformOrigin: 'top left',
            },
            filter: (node) => !isEditorChrome(node),
            skipFonts: false,
            cacheBust: false,
        });
        const blob = await (await fetch(dataUrl)).blob();
        const link = document.createElement('a');
        link.download = 'any-design-' + Date.now() + '.png';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    } catch (error) {
        console.error('export failed:', error);
    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML = SAVE_BTN_INNER;
        }
    }
}
