// Boot entry for /app/design.html. Loads one saved design from Supabase, then
// dynamically imports the shared editor entry point — only after the saved
// snapshot (canvas HTML + its template CSS + webfonts) is injected, so the
// editor's flatten/measure logic runs against the real design.
import { requireUser } from './account.js';

async function boot() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
        window.location.replace('/app/home.html');
        return;
    }
    const user = await requireUser('/app/index.html');
    if (!user) return;

    const { Supabase } = window;
    const { data, error } = await Supabase
        .from('designs')
        .select('id, title, size, template_id, user_id, html, css, fonts')
        .eq('id', id)
        .maybeSingle();
    if (error || !data || data.user_id !== user.id) {
        window.location.replace('/app/home.html');
        return;
    }

    if (data.css) {
        const style = document.createElement('style');
        style.textContent = data.css;
        document.head.appendChild(style);
    }
    if (data.fonts) {
        document.head.insertAdjacentHTML('beforeend', data.fonts);
    }

    const stage = document.getElementById('designStage');
    stage.innerHTML = data.html;
    stage.hidden = false;
    document.getElementById('designLoading').hidden = true;

    window.__currentDesignId = data.id;
    window.__savedDesignMeta = data;
    document.title = (data.title || 'تصميم محفوظ') + ' — AnyDesire.Design';

    await import('./editor.js');
    const titleEl = document.querySelector('.top-bar-title');
    if (titleEl) titleEl.textContent = data.title || 'تصميم محفوظ';

    // Keep the zoom label in sync with the saved size (the original zoom text
    // referenced the template dimensions, which the editor relocates).
    const zoomEl = document.querySelector('.save-btn .zoom');
    if (zoomEl) zoomEl.textContent = data.size || '';
}

boot().catch((err) => {
    console.error('design boot failed:', err);
    window.location.replace('/app/home.html');
});