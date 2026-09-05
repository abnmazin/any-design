// Color tools for the palette drawer: an AI generator that derives three
// harmonious hex colors from a free-form Arabic description, and a manual
// three-color picker. Both funnel into the same path — sort the three colors
// by brightness (darkest = deep base, middle = accent, lightest = highlight),
// map them onto the design roles, and apply them through the custom palette.

import { applyCustomPalette } from './palettes.js';

// Vite inlines 1/'' via define from GROQ_API_KEY presence in vite.config.js.
const AI_ENABLED = typeof __VITE_AI_ENABLED__ !== 'undefined' && __VITE_AI_ENABLED__ === '1';

// Random variation marker so "regenerate" yields a new palette each run.
function nextVariation() {
    return Math.floor(100000 + Math.random() * 900000);
}

// --- Color math (pure helpers, no DOM) ---

function hexToRgb(hex) {
    const value = hex.replace('#', '').trim();
    if (value.length !== 6) return null;
    const int = parseInt(value, 16);
    if (Number.isNaN(int)) return null;
    return {
        r: (int >> 16) & 255,
        g: (int >> 8) & 255,
        b: int & 255,
    };
}

function rgbToHex(r, g, b) {
    const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
    return '#' + [clamp(r), clamp(g), clamp(b)]
        .map((n) => n.toString(16).padStart(2, '0'))
        .join('');
}

// 0..1 perceived lightness, used only to order the three colors.
function luminance(rgb) {
    return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
}

function rgba(rgb, alpha) {
    return 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + alpha + ')';
}

// Scale a color toward black by factor (0 = unchanged, 1 = black).
function darken(hex, factor) {
    const rgb = hexToRgb(hex);
    const f = Math.max(0, Math.min(1, factor));
    return rgbToHex(rgb.r * (1 - f), rgb.g * (1 - f), rgb.b * (1 - f));
}

// Build the full role set from three unordered colors. Sorting darkest ->
// lightest makes each color's job independent of picker/AI ordering.
function buildRoles(colors) {
    const valid = colors.map(hexToRgb);
    if (valid.some((rgb) => !rgb)) return null;
    const sorted = colors
        .map((hex, index) => ({ hex, light: luminance(valid[index]) }))
        .sort((a, b) => a.light - b.light);

    const base = sorted[0].hex;       // darkest -> deep base
    const accent = sorted[1].hex;     // middle  -> main accent
    const alt = sorted[2].hex;        // lightest -> secondary accent
    const accentRgb = hexToRgb(accent);

    return {
        bg: darken(base, 0.55),
        surface: darken(base, 0.4),
        hover: darken(base, 0.25),
        accent,
        accentAlt: alt,
        text: '#f8fafc',
        textMuted: '#94a3b8',
        border: rgba(accentRgb, 0.35),
        glow: '0 0 80px ' + rgba(accentRgb, 0.1),
        gradientStart: base,
        gradientEnd: alt,
    };
}

function fillPreview(rowEl, colors) {
    if (!rowEl) return;
    rowEl.innerHTML = '';
    colors.forEach((color) => {
        const swatch = document.createElement('span');
        swatch.className = 'palette-swatch';
        swatch.style.background = color;
        rowEl.appendChild(swatch);
    });
}

function setStatus(pane, kind, message) {
    const statusEl = pane.querySelector('.color-ai-status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.remove('ok', 'err', 'busy');
    if (kind) statusEl.classList.add(kind);
}

function applyThreeColors(colors, previewRow) {
    const roles = buildRoles(colors);
    if (!roles) return false;
    applyCustomPalette(colors, roles);
    fillPreview(previewRow, colors);
    return true;
}

// Auto-sort the three manual pickers when applying, so slot order in the UI
// is irrelevant (darkest -> base, middle -> accent, lightest -> highlight).
function collectCustomPickers(pane) {
    const pickers = pane.querySelectorAll('input[type="color"]');
    return Array.from(pickers).map((picker) => picker.value);
}

export function initColorTools() {
    const pane = document.querySelector('[data-pane="colors"]');
    if (!pane) return;

    const aiBtn = pane.querySelector('#colorAiBtn');
    const regenerateBtn = pane.querySelector('#colorAiRegenerate');
    const aiInput = pane.querySelector('#colorAiInput');
    const aiPreview = pane.querySelector('#colorAiPreview');
    const customBtn = pane.querySelector('#colorCustomBtn');
    const customPreview = pane.querySelector('#colorCustomPreview');

    let lastPrompt = '';

    // Custom pickers apply instantly with no server involved.
    customBtn.addEventListener('click', () => {
        const colors = collectCustomPickers(pane);
        if (applyThreeColors(colors, customPreview)) {
            fillPreview(aiPreview, colors);
        }
    });

    if (!AI_ENABLED) {
        setStatus(pane, 'err', 'خدمة الذكاء غير مفعّلة: أضف GROQ_API_KEY في ملف .env وأعد تشغيل الخادم.');
        return;
    }

    const run = async (isRegenerate) => {
        setStatus(pane, '', '');
        const prompt = isRegenerate ? lastPrompt : aiInput.value.trim();
        if (!prompt) {
            setStatus(pane, 'err', isRegenerate ? 'ولّد الألوان أولًا.' : 'اكتب وصف الألوان أولًا.');
            return;
        }
        lastPrompt = prompt;

        aiBtn.disabled = true;
        regenerateBtn.disabled = true;
        aiBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        setStatus(pane, 'busy', isRegenerate ? 'جاري توليد ألوان جديدة...' : 'جاري توليد الألوان...');

        try {
            const res = await fetch('/api/ai/colors', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    options: { temperature: 0.3, variation: nextVariation() },
                }),
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setStatus(pane, 'err', data.error === 'limits_exceeded'
                    ? 'استُنفدت حدود النماذج المتاحة حاليًا. حاول بعد قليل.'
                    : (data.error === 'not_configured'
                        ? 'خدمة الذكاء غير مفعّلة.'
                        : (data.message || 'تعذّر توليد الألوان.')));
                return;
            }

            const colors = Array.isArray(data.colors) ? data.colors : [];
            if (colors.length !== 3 || !applyThreeColors(colors, aiPreview)) {
                setStatus(pane, 'err', 'لم تَرجع الخدمة ثلاثة ألوان صالحة.');
                return;
            }
            fillPreview(customPreview, colors);
            const modelNote = data.usedModel ? ' (' + data.usedModel + ')' : '';
            setStatus(pane, 'ok', 'تم توليد ثلاثة ألوان' + modelNote + '.');
            regenerateBtn.disabled = false;
        } catch {
            setStatus(pane, 'err', 'تعذّر الاتصال بخادم الذكاء.');
        } finally {
            aiBtn.disabled = false;
            aiBtn.innerHTML = '<i class="fas fa-palette"></i> توليد الألوان';
        }
    };

    aiBtn.addEventListener('click', () => run(false));
    regenerateBtn.addEventListener('click', () => run(true));
}