// Canvas export. The Strict Template Generator exports the locked preview as a
// PNG. html2canvas is kept for now to stay fully functional; we swap to an
// html-to-image library in a later pass.

import html2canvas from 'html2canvas';

async function waitForCanvasAssets(source) {
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
}

function canvasSource() {
    return document.querySelector('.canvas-wrapper, .card-frame');
}

export async function exportCanvas() {
    const source = canvasSource();
    if (!source) return;
    const button = document.querySelector('.save-btn');
    const previousTransform = source.style.transform;
    const previousOrigin = source.style.transformOrigin;
    if (button) button.disabled = true;
    try {
        await waitForCanvasAssets(source);
        source.style.transform = 'none';
        source.style.transformOrigin = 'top left';
        await new Promise((resolve) => requestAnimationFrame(resolve));
        // TODO(export): integrate html-to-image library here in place of html2canvas.
        const image = await html2canvas(source, {
            backgroundColor: null,
            useCORS: true,
            allowTaint: false,
            scale: 1,
            imageTimeout: 30000,
            logging: false,
            width: source.offsetWidth,
            height: source.offsetHeight,
            onclone: (doc) => {
                const clonedSource = doc.querySelector('.canvas-wrapper, .card-frame');
                if (clonedSource) {
                    clonedSource.style.transform = 'none';
                    clonedSource.style.transformOrigin = 'top left';
                }
                doc.querySelectorAll('#editorUI, .editor-top-bar, .tool-rail, .preview-toolbar')
                    .forEach((el) => { el.remove(); });
            },
        });
        image.toBlob((blob) => {
            if (!blob) return;
            const link = document.createElement('a');
            link.download = 'any-design-' + Date.now() + '.png';
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);
        }, 'image/png');
    } finally {
        source.style.transform = previousTransform;
        source.style.transformOrigin = previousOrigin;
        if (button) button.disabled = false;
    }
}