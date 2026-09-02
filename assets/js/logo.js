// Logo drawer: renders the replaceable logo icons and highlights whichever one
// is currently used by the design's .logo-box / .logo-icon element.

import { LOGOS } from './state.js';

export function renderLogos() {
    const grid = document.getElementById('logoGrid');
    grid.innerHTML = '';
    LOGOS.forEach((lg) => {
        const item = document.createElement('div');
        item.className = 'logo-item';
        item.dataset.icon = lg.icon;
        item.innerHTML = '<i class="fas ' + lg.icon + '"></i><span>' + lg.name + '</span>';
        item.addEventListener('mousedown', (e) => e.stopPropagation());
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.logo-icon i, .logo-box i').forEach((icon) => {
                icon.className = 'fas ' + lg.icon;
            });
            grid.querySelectorAll('.logo-item').forEach((x) => x.classList.toggle('active', x === item));
        });
        grid.appendChild(item);
    });
}

export function syncLogoActive() {
    const first = document.querySelector('.logo-icon i, .logo-box i');
    if (!first) return;
    document.querySelectorAll('.logo-item').forEach((x) => {
        x.classList.toggle('active', first.className.includes(x.dataset.icon));
    });
}