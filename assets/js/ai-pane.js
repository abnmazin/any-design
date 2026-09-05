// AI auto-fill for the Strict Template Generator. Reads the free-form prompt
// from the AI sidebar pane, sends it together with the live field schema of the
// open template to the server-side proxy (/api/ai/fill), and applies every
// returned value through the normal binding path so canvas + inputs stay in
// sync exactly as if the user typed them.
//
// The pane exposes a creative-style switch (direct / balanced / creative) plus
// a generate/regenerate pair. Every run forwards a fresh random variation so a
// second click produces another context, not a duplicate.

// Vite inlines 1/'' via define from GROQ_API_KEY presence in vite.config.js.
const AI_ENABLED = typeof __VITE_AI_ENABLED__ !== 'undefined' && __VITE_AI_ENABLED__ === '1';

// Generation styles: label -> model temperature. Direct stays faithful to the
// current text, creative allows the widest reinterpretation.
const AI_MODES = {
    direct: 0.1,
    balanced: 0.3,
    creative: 0.9,
};

// Random variation marker sent on every call so regenerating yields new copy.
function nextVariation() {
    return Math.floor(100000 + Math.random() * 900000);
}

// Build the list of fillable text fields for the currently open template.
// A field is only fillable when the sidebar has a text control for it AND the
// canvas actually binds that key. Image uploads are skipped (they are files,
// not text). The current canvas value is attached so the model can match style
// and length.
function collectFieldSchema() {
    const schema = [];
    document.querySelectorAll('#contentForm [data-bind-to]').forEach((control) => {
        if (control.type === 'file') return;
        const bindKey = control.dataset.bindTo;
        const boundEl = document.querySelector('[data-bind="' + bindKey + '"]');
        if (!boundEl) return;
        const labelEl = control.closest('.cf-field').querySelector('label');
        const label = labelEl ? labelEl.textContent.trim() : bindKey;
        schema.push({
            bindTo: bindKey,
            label,
            value: boundEl.textContent.trim(),
        });
    });
    return schema;
}

// Apply a single returned value by writing the control and dispatching a real
// input event, rerouting through bindings.js' delegated listener (applyBind).
function applyFieldValue(bindKey, value) {
    document.querySelectorAll('#contentForm [data-bind-to="' + bindKey + '"]').forEach((control) => {
        control.value = value;
        control.dispatchEvent(new Event('input', { bubbles: true }));
    });
}

function setStatus(pane, kind, message) {
    const statusEl = pane.querySelector('.ai-status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.remove('ok', 'err', 'busy');
    if (kind) statusEl.classList.add(kind);
}

export function initAiPane() {
    const pane = document.querySelector('[data-pane="ai"] .ai-pane');
    if (!pane) return;

    const inputEl = pane.querySelector('.ai-input');
    const actionBtn = pane.querySelector('.ai-action');
    const regenerateBtn = pane.querySelector('.ai-regenerate');
    const statusEl = pane.querySelector('.ai-status');
    const modeBtns = pane.querySelectorAll('.ai-mode');

    // Remember the last successful run so "regenerate" can repeat it with a
    // fresh variation marker.
    let lastPrompt = '';
    let lastMode = 'balanced';

    if (!AI_ENABLED) {
        setStatus(pane, 'err', 'خدمة الذكاء غير مفعّلة: أضف GROQ_API_KEY في ملف .env وأعد تشغيل الخادم.');
        return;
    }

    // Mode switch: picking a style updates the active chip and the temperature
    // used for the next run.
    modeBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            modeBtns.forEach((b) => b.classList.toggle('active', b === btn));
            lastMode = btn.dataset.mode || 'balanced';
        });
    });

    const run = async (promptText, modeName, isRegenerate) => {
        setStatus(pane, '', '');
        modeName = modeName || lastMode;

        const temperature = AI_MODES[modeName] !== undefined ? AI_MODES[modeName] : 0.3;
        const inputValue = isRegenerate ? lastPrompt : inputEl.value.trim();
        const schema = collectFieldSchema();

        if (!inputValue) {
            setStatus(pane, 'err', isRegenerate ? 'أنشئ تصميمًا أولًا.' : 'اكتب طلبك أولًا.');
            return;
        }
        if (!schema.length) {
            setStatus(pane, 'err', 'هذا القالب لا يحتوي على حقول قابلة للتعبئة.');
            return;
        }
        lastPrompt = inputValue;

        actionBtn.disabled = true;
        regenerateBtn.disabled = true;
        actionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        setStatus(pane, 'busy', isRegenerate ? 'جاري توليد نسخة جديدة...' : 'جاري ملء التصميم...');

        try {
            const res = await fetch('/api/ai/fill', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    prompt: inputValue,
                    schema,
                    options: { temperature, variation: nextVariation() },
                }),
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setStatus(pane, 'err', data.error === 'limits_exceeded'
                    ? 'استُنفدت حدود النماذج المتاحة حاليًا. حاول بعد قليل.'
                    : (data.message || (data.error === 'not_configured'
                        ? 'خدمة الذكاء غير مفعّلة.'
                        : 'تعذّر الاتصال بخدمة الذكاء.')));
                return;
            }

            const fields = data.fields || {};
            const keys = Object.keys(fields);
            if (!keys.length) {
                setStatus(pane, 'err', 'لم تَرجع الخدمة أي حقول.');
                return;
            }
            keys.forEach((key) => applyFieldValue(key, fields[key]));
            const modelNote = data.usedModel ? ' (' + data.usedModel + ')' : '';
            const label = isRegenerate ? 'تم توليد نسخة جديدة' : 'تم ملء ' + keys.length + ' من الحقول';
            setStatus(pane, 'ok', label + ' بنجاح' + modelNote + '.');
            regenerateBtn.disabled = false;
        } catch {
            setStatus(pane, 'err', 'تعذّر الاتصال بخادم الذكاء.');
        } finally {
            actionBtn.disabled = false;
            actionBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> توليد التصميم';
        }
    };

    actionBtn.addEventListener('click', () => run(false));
    regenerateBtn.addEventListener('click', () => run(lastPrompt, lastMode, true));

    actionBtn.disabled = false;
}