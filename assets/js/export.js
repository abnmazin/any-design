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

export function canvasSource() {
    return document.querySelector('.canvas-wrapper, .card-frame');
}

export function isEditorChrome(node) {
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
export function canvasIntrinsicSize(el) {
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

function inlineComputedStyles(source, clone) {
    const sourceNodes = [source, ...source.querySelectorAll('*')];
    const cloneNodes = [clone, ...clone.querySelectorAll('*')];
    const styleProperties = [
        'color', 'background', 'background-color', 'background-image', 'border', 'border-radius',
        'box-shadow', 'font', 'font-family', 'font-size', 'font-weight', 'letter-spacing',
        'line-height', 'text-align', 'text-shadow', 'opacity', 'display', 'position', 'inset',
        'width', 'height', 'padding', 'margin', 'gap', 'grid-template-columns', 'grid-template-rows',
        'align-items', 'justify-content', 'flex-direction', 'flex', 'transform', 'overflow', 'z-index',
    ];

    sourceNodes.forEach((node, index) => {
        const target = cloneNodes[index];
        if (!target || node.nodeType !== Node.ELEMENT_NODE) return;
        const computed = getComputedStyle(node);
        styleProperties.forEach((property) => target.style.setProperty(property, computed.getPropertyValue(property)));

        // Font Awesome stores its glyph in ::before. Materialize it as text so
        // html-to-image does not depend on cross-origin stylesheet rules.
        const pseudo = getComputedStyle(node, '::before');
        const glyph = pseudo.content && pseudo.content !== 'none' && pseudo.content !== 'normal'
            ? pseudo.content.replace(/^['"]|['"]$/g, '') : '';
        if (glyph && (node.matches('i[class*="fa-"]') || pseudo.fontFamily.toLowerCase().includes('font awesome'))) {
            const icon = document.createElement('span');
            icon.textContent = glyph;
            icon.style.cssText = `font-family:${pseudo.fontFamily};font-size:${pseudo.fontSize};font-weight:${pseudo.fontWeight};font-style:${pseudo.fontStyle};color:${pseudo.color};line-height:${pseudo.lineHeight};display:inline-block;`;
            target.replaceChildren(icon);
        }
    });
}

function createExportClone(source) {
    const clone = source.cloneNode(true);
    inlineComputedStyles(source, clone);
    clone.style.width = source.offsetWidth + 'px';
    clone.style.height = source.offsetHeight + 'px';
    clone.style.flex = '0 0 auto';
    clone.style.transform = 'none';
    clone.style.transformOrigin = 'top left';
    clone.style.position = 'fixed';
    clone.style.left = '-100000px';
    clone.style.top = '0';
    clone.style.pointerEvents = 'none';
    document.body.appendChild(clone);
    return clone;
}

export async function exportCanvas() {
    const source = canvasSource();
    if (!source) return;
    const button = document.querySelector('.save-btn');
    if (button) {
        button.disabled = true;
        button.innerHTML = SAVE_BTN_LOADING;
    }
    let exportNode;
    try {
        await waitForCanvasAssets(source);
        const { width, height } = canvasIntrinsicSize(source);
        exportNode = createExportClone(source);
        const dataUrl = await toPng(exportNode, {
            pixelRatio: EXPORT_PIXEL_RATIO,
            width,
            height,
            backgroundColor: null,
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
        if (exportNode) exportNode.remove();
        if (button) {
            button.disabled = false;
            button.innerHTML = SAVE_BTN_INNER;
        }
    }
}

// Small data-URL thumbnail (e.g. 320px tall) for the designs grid. Does not
// mutate the canvas: html-to-image clones the source subtree in isolation.
export async function canvasThumbnailDataUrl(source, maxWidth) {
    const { width, height } = canvasIntrinsicSize(source);
    const scale = maxWidth / width;
    return toPng(source, {
        pixelRatio: scale,
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
}
