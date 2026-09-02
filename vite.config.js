import { fileURLToPath, URL } from 'node:url';
import { readdirSync, cpSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// The editor loads its JS/CSS as raw static files (assets/js/editor-panel.js,
// assets/js/site-settings.js, assets/css/site.css). Vite only copies public/
// to dist/, so this plugin mirrors the project-root assets/ tree into dist/
// after every build to keep those <script>/<link> references working.
function copyRootAssets() {
    const src = resolve('assets');
    const dest = resolve('dist/assets');
    return {
        name: 'copy-root-assets',
        closeBundle: async (ctx) => {
            try {
                if (readdirSync(src).length) cpSync(src, dest, { recursive: true });
            } catch (err) {
                ctx.warn('copy-root-assets: ' + err.message);
            }
        },
    };
}

export default defineConfig({
    plugins: [copyRootAssets()],
    build: {
        rollupOptions: {
            input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        login: fileURLToPath(new URL('./app/index.html', import.meta.url)),
        home: fileURLToPath(new URL('./app/home.html', import.meta.url)),
        wedding: fileURLToPath(new URL('./templates/wedding/wedding.html', import.meta.url)),
        story: fileURLToPath(new URL('./templates/story/story.html', import.meta.url)),
        bento: fileURLToPath(new URL('./templates/bento/bento.html', import.meta.url)),
        studio: fileURLToPath(new URL('./templates/debt-ledger/studio.html', import.meta.url)),
        'windows-1': fileURLToPath(new URL('./templates/windows-1/windows-1.html', import.meta.url)),
        'windows-2': fileURLToPath(new URL('./templates/windows-2/windows-2.html', import.meta.url)),
        'phone-1': fileURLToPath(new URL('./templates/phone-1/phone-1.html', import.meta.url)),
        'phone-2': fileURLToPath(new URL('./templates/phone-2/phone-2.html', import.meta.url)),
      },
    },
  },
});