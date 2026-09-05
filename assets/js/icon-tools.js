// AI icon picker for the brand pane: reads the text that currently sits next
// to the selected icon (a card heading or a brand/logo name — regardless of
// whether AI or a human wrote it) and asks the /api/ai/icon route to choose the
// best-matching icon from the catalogue. The result is applied through the same
// path as a manual grid click.

import { getSelectedTarget, aiIconCatalog, selectIcon } from './logo.js';

// Vite inlines 1/'' via define from GROQ_API_KEY presence in vite.config.js.
const AI_ENABLED = typeof __VITE_AI_ENABLED__ !== 'undefined' && __VITE_AI_ENABLED__ === '1';

// Random variation marker so "regenerate" yields a fresh pick each run.
function nextVariation() {
    return Math.floor(100000 + Math.random() * 900000);
}

// The box text the selected icon should fit: a feature-card heading where the
// target lives, otherwise the brand/logo heading of its container.
function contextText(target) {
    const card = target.closest('.feature-card');
    if (card) {
        const heading = card.querySelector('.f-header h4, [data-bind$="-heading"]');
        if (heading) return heading.textContent.trim();
    }
    const container = target.closest('.brand-container, .branding, .brand-pill, .ldg-head');
    if (container) {
        const heading = container.querySelector('[data-bind="title"], h2, h1, .brand-title');
        if (heading) return heading.textContent.trim();
    }
    return '';
}

// The icon class currently shown on the target ("fa-wallet"), used to exclude
// it from the AI candidates so every pick changes the visible icon.
function currentTargetIcon(target) {
    const match = target.className.match(/fa-[\w-]+/);
    return match ? match[0] : '';
}

function setStatus(statusEl, kind, message) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.remove('ok', 'err', 'busy');
    if (kind) statusEl.classList.add(kind);
}

export function initIconTools() {
    const pane = document.querySelector('[data-pane="brand"]');
    if (!pane) return;

    const generateBtn = pane.querySelector('#iconAiBtn');
    const regenerateBtn = pane.querySelector('#iconAiRegenerate');
    const statusEl = pane.querySelector('#iconAiStatus');
    if (!generateBtn) return;

    let lastContext = '';

    if (!AI_ENABLED) {
        setStatus(statusEl, 'err', 'خدمة الذكاء غير مفعّلة: أضف GROQ_API_KEY في ملف .env وأعد تشغيل الخادم.');
        return;
    }

    const run = async (isRegenerate) => {
        setStatus(statusEl, '', '');
        const target = getSelectedTarget();
        const context = isRegenerate && lastContext ? lastContext : contextText(target);
        if (!target) {
            setStatus(statusEl, 'err', 'لا توجد أيقونة محددة في هذا التصميم.');
            return;
        }
        if (!context) {
            setStatus(statusEl, 'err', 'لا يوجد نص بجانب الأيقونة المحددة.');
            return;
        }
        lastContext = context;

        generateBtn.disabled = true;
        regenerateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        setStatus(statusEl, 'busy', isRegenerate ? 'جاري اختيار أيقونة أخرى...' : 'جاري اختيار الأيقونة...');

        try {
            const res = await fetch('/api/ai/icon', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    prompt: context,
                    // The candidate list excludes the icon currently shown, so
                    // the pick always produces a visible change (first run and
                    // every regenerate) while remaining a best fit for the text.
                    icons: aiIconCatalog().filter((codename) => 'fa-' + codename !== currentTargetIcon(target)),
                    options: { temperature: 0.4, variation: nextVariation() },
                }),
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setStatus(statusEl, 'err', data.error === 'limits_exceeded'
                    ? 'استُنفدت حدود النماذج المتاحة حاليًا. حاول بعد قليل.'
                    : (data.error === 'not_configured'
                        ? 'خدمة الذكاء غير مفعّلة.'
                        : (data.message || 'تعذّر اختيار الأيقونة.')));
                return;
            }

            const icon = String(data.icon || '');
            if (!icon || !selectIcon(icon)) {
                setStatus(statusEl, 'err', 'لم تَرجع الخدمة أيقونة صالحة.');
                return;
            }
            const modelNote = data.usedModel ? ' (' + data.usedModel + ')' : '';
            setStatus(statusEl, 'ok', 'تم اختيار الأيقونة' + modelNote + '.');
            regenerateBtn.disabled = false;
        } catch {
            setStatus(statusEl, 'err', 'تعذّر الاتصال بخادم الذكاء.');
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-icons"></i> اختيار أيقونة';
        }
    };

    generateBtn.addEventListener('click', () => run(false));
    regenerateBtn.addEventListener('click', () => run(true));
}