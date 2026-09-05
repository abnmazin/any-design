// Palette drawer: a collection of coordinated color themes. Clicking a card
// applies the whole collection to the open design by overriding the template's
// CSS-variable theme on the canvas root. Templates name their variables
// differently, so each canonical role maps to several candidate variable names
// and every mapped value is written on the canvas root where it cascades to
// all layers.

import { canvasRoot } from './interactions.js';

// Canonical role -> the template variable names it drives. Vars that a given
// template does not use are simply overwritten harmlessly.
const ROLE_VARS = {
    bg: ['--bg-main', '--bg-base'],
    surface: ['--bg-surface', '--bg-card'],
    hover: ['--bg-card-hover'],
    accent: ['--accent-cyan', '--accent-primary', '--blue-bright'],
    accentAlt: ['--accent-green', '--accent-coral', '--purple-bright', '--pink-bright', '--rose-bright'],
    text: ['--text-white', '--text-main', '--text-dark'],
    textMuted: ['--text-muted'],
    border: ['--border-subtle', '--border-color', '--border-hover'],
};

// Every variable name the editor may override, so the "default" card can clear
// them all and let the template's shipped theme take over again.
const OVERRIDABLE_VARS = Array.from(new Set(
    Object.values(ROLE_VARS).flat().concat(['--accent-gradient', '--glow']),
));

const PALETTES = [
    {
        id: 'default',
        name: 'افتراضي',
        swatches: [],
        roles: {},
    },
    {
        id: 'violet',
        name: 'بنفسجي',
        swatches: ['#a970ff', '#c18aff', '#6e3cbc'],
        roles: {
            bg: '#09080f',
            surface: '#100d1a',
            hover: '#171225',
            accent: '#a970ff',
            accentAlt: '#c18aff',
            text: '#f4f1fa',
            textMuted: '#a8a1b8',
            border: '#463a5c',
            glow: '0 0 80px rgba(169, 112, 255, 0.10)',
            gradientStart: '#6e3cbc',
            gradientEnd: '#c18aff',
        },
    },
    {
        id: 'emerald',
        name: 'زمرد',
        swatches: ['#059669', '#10b981', '#34d399'],
        roles: {
            bg: '#04211a',
            surface: '#073a2c',
            hover: '#0c4f3c',
            accent: '#10b981',
            accentAlt: '#34d399',
            text: '#ecfdf5',
            textMuted: '#8bb8a8',
            border: 'rgba(16, 185, 129, 0.35)',
            glow: '0 0 80px rgba(16, 185, 129, 0.10)',
            gradientStart: '#059669',
            gradientEnd: '#34d399',
        },
    },
    {
        id: 'rose',
        name: 'وردي',
        swatches: ['#be185d', '#ec4899', '#f472b6'],
        roles: {
            bg: '#22101d',
            surface: '#3a1130',
            hover: '#4d1742',
            accent: '#ec4899',
            accentAlt: '#f472b6',
            text: '#fdf2f8',
            textMuted: '#e3aac7',
            border: 'rgba(236, 72, 153, 0.35)',
            glow: '0 0 80px rgba(236, 72, 153, 0.10)',
            gradientStart: '#be185d',
            gradientEnd: '#ec4899',
        },
    },
];

let currentPaletteId = 'default';

// Reset whatever palette state was previously applied, then write the current
// palette's roles onto the canvas root. The default palette only resets so the
// template's original :root values take effect again.
function applyRoles(roles) {
    const root = canvasRoot();
    if (!root) return;
    OVERRIDABLE_VARS.forEach((name) => root.style.removeProperty(name));
    if (roles.bg) ROLE_VARS.bg.forEach((name) => root.style.setProperty(name, roles.bg));
    if (roles.surface) ROLE_VARS.surface.forEach((name) => root.style.setProperty(name, roles.surface));
    if (roles.hover) ROLE_VARS.hover.forEach((name) => root.style.setProperty(name, roles.hover));
    if (roles.accent) ROLE_VARS.accent.forEach((name) => root.style.setProperty(name, roles.accent));
    if (roles.accentAlt) ROLE_VARS.accentAlt.forEach((name) => root.style.setProperty(name, roles.accentAlt));
    if (roles.text) ROLE_VARS.text.forEach((name) => root.style.setProperty(name, roles.text));
    if (roles.textMuted) ROLE_VARS.textMuted.forEach((name) => root.style.setProperty(name, roles.textMuted));
    if (roles.border) ROLE_VARS.border.forEach((name) => root.style.setProperty(name, roles.border));
    if (roles.glow) root.style.setProperty('--glow', roles.glow);
    if (roles.gradientStart && roles.gradientEnd) {
        root.style.setProperty('--accent-gradient', 'linear-gradient(135deg, ' + roles.gradientStart + ' 0%, ' + roles.gradientEnd + ' 100%)');
    }
}

export function applyPalette(id) {
    const palette = PALETTES.find((p) => p.id === id) || PALETTES[0];
    currentPaletteId = palette.id;
    applyRoles(palette.roles);
    syncPaletteActive();
}

export function renderPalettes() {
    const grid = document.getElementById('paletteGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const items = document.createDocumentFragment();
    PALETTES.forEach((palette) => {
        const card = document.createElement('div');
        card.className = 'palette-card';
        card.dataset.palette = palette.id;
        if (palette.swatches.length) {
            const swatches = document.createElement('div');
            swatches.className = 'palette-swatches';
            palette.swatches.forEach((color) => {
                const swatch = document.createElement('span');
                swatch.className = 'palette-swatch';
                swatch.style.background = color;
                swatches.appendChild(swatch);
            });
            card.appendChild(swatches);
        } else {
            const swatches = document.createElement('div');
            swatches.className = 'palette-swatches';
            const reset = document.createElement('span');
            reset.className = 'palette-swatch';
            reset.innerHTML = '<i class="fas fa-rotate-left"></i>';
            swatches.appendChild(reset);
            card.appendChild(swatches);
        }
        const name = document.createElement('span');
        name.className = 'palette-name';
        name.textContent = palette.name;
        card.appendChild(name);
        card.addEventListener('click', () => {
            grid.querySelectorAll('.palette-card').forEach((c) => c.classList.remove('active'));
            card.classList.add('active');
            applyPalette(palette.id);
        });
        items.appendChild(card);
    });
    grid.appendChild(items);
    syncPaletteActive();
}

export function syncPaletteActive() {
    const grid = document.getElementById('paletteGrid');
    if (!grid) return;
    grid.querySelectorAll('.palette-card').forEach((card) => {
        card.classList.toggle('active', card.dataset.palette === currentPaletteId);
    });
}