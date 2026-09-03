import { layerElements, lockDefault, maxLayerZ, renderLayers } from './layers.js';
import { makeLayerMovable, selectElement, updateCanvasScale } from './interactions.js';
import { record } from './history.js';

const ELEMENTS = [
    ['square', 'مربع', 'fa-square', 'shapes'], ['circle', 'دائرة', 'fa-circle', 'shapes'],
    ['triangle', 'مثلث', 'fa-caret-up', 'shapes'], ['star', 'نجمة', 'fa-star', 'shapes'],
    ['heart', 'قلب', 'fa-heart', 'shapes'], ['diamond', 'ماسة', 'fa-gem', 'shapes'],
    ['hexagon', 'سداسي', 'fa-draw-polygon', 'shapes'], ['bolt', 'برق', 'fa-bolt', 'shapes'],
    ['sun', 'شمس', 'fa-sun', 'shapes'], ['cloud', 'سحابة', 'fa-cloud', 'shapes'],
    ['arrow-up', 'سهم أعلى', 'fa-arrow-up', 'arrows'], ['arrow-down', 'سهم أسفل', 'fa-arrow-down', 'arrows'],
    ['arrow-left', 'سهم يسار', 'fa-arrow-left', 'arrows'], ['arrow-right', 'سهم يمين', 'fa-arrow-right', 'arrows'],
    ['arrows', 'أسهم متعاكسة', 'fa-arrows-left-right', 'arrows'], ['chevron-up', 'مؤشر أعلى', 'fa-chevron-up', 'arrows'],
    ['chevron-down', 'مؤشر أسفل', 'fa-chevron-down', 'arrows'], ['reply', 'رد', 'fa-reply', 'arrows'],
    ['location', 'موقع', 'fa-location-dot', 'icons'], ['phone', 'هاتف', 'fa-phone', 'icons'],
    ['email', 'بريد', 'fa-envelope', 'icons'], ['calendar', 'تقويم', 'fa-calendar', 'icons'],
    ['clock', 'وقت', 'fa-clock', 'icons'], ['check', 'صح', 'fa-check', 'icons'],
    ['close', 'إغلاق', 'fa-xmark', 'icons'], ['info', 'معلومات', 'fa-circle-info', 'icons'],
    ['warning', 'تنبيه', 'fa-triangle-exclamation', 'icons'], ['question', 'سؤال', 'fa-circle-question', 'icons'],
    ['link', 'رابط', 'fa-link', 'icons'], ['gear', 'إعدادات', 'fa-gear', 'icons'],
    ['label', 'وسم', 'fa-tag', 'badges'], ['badge-new', 'جديد', 'fa-certificate', 'badges'],
    ['verified', 'موثق', 'fa-circle-check', 'badges'], ['sale', 'تخفيض', 'fa-percent', 'badges'],
    ['hot', 'رائج', 'fa-fire', 'badges'], ['premium', 'مميز', 'fa-crown', 'badges'],
    ['number-one', 'رقم واحد', 'fa-1', 'badges'], ['lock', 'مغلق', 'fa-lock', 'badges'],
    ['divider', 'فاصل', 'fa-minus', 'lines'], ['line', 'خط', 'fa-grip-lines', 'lines'],
    ['dots', 'نقاط', 'fa-ellipsis', 'lines'], ['wave', 'موجة', 'fa-wave-square', 'lines'],
    ['button', 'زر', 'fa-rectangle-wide', 'actions'], ['download', 'تحميل', 'fa-download', 'actions'],
    ['share', 'مشاركة', 'fa-share-nodes', 'actions'], ['play', 'تشغيل', 'fa-play', 'actions'],
    ['instagram', 'إنستغرام', 'fa-instagram', 'social'], ['facebook', 'فيسبوك', 'fa-facebook', 'social'],
    ['twitter', 'تويتر', 'fa-x-twitter', 'social'], ['whatsapp', 'واتساب', 'fa-whatsapp', 'social'],
];

const CATEGORIES = [
    ['all', 'الكل'], ['shapes', 'أشكال'], ['arrows', 'أسهم'], ['icons', 'أيقونات'],
    ['badges', 'شارات'], ['lines', 'خطوط'], ['actions', 'أزرار'], ['social', 'اجتماعي'],
];

const LABELS = Object.fromEntries(ELEMENTS.map(([id, label]) => [id, label]));
let selectedCategory = 'all';

function ensureStyles() {
    if (document.getElementById('elementsStyles')) return;
    const style = document.createElement('style');
    style.id = 'elementsStyles';
    style.textContent = `
        .elements-tools { display:flex; flex-direction:column; gap:10px; margin-bottom:12px; }
        .elements-search { width:100%; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); color:#f0fdfa; padding:9px 10px; border-radius:9px; font-family:inherit; }
        .elements-cats { display:flex; gap:5px; overflow-x:auto; padding-bottom:2px; }
        .elements-cat { flex:0 0 auto; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); color:#8ba3b5; padding:6px 8px; border-radius:7px; font:inherit; font-size:.68rem; cursor:pointer; }
        .elements-cat.active { color:#0a111c; background:#1ae5ff; border-color:#1ae5ff; }
        .elements-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; }
        .element-item { min-width:0; min-height:72px; padding:9px 4px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; color:#d5e5ee; background:#0d1f25; border:1px solid rgba(26,229,255,.15); border-radius:9px; cursor:pointer; }
        .element-item:hover, .element-item.active { border-color:#1ae5ff; background:rgba(26,229,255,.14); transform:translateY(-1px); }
        .element-item i { color:#1ae5ff; font-size:1.25rem; }
        .element-item span { max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:.66rem; }
        .element-empty { color:#8ba3b5; font-size:.75rem; text-align:center; padding:18px 4px; }
        .inserted-element { display:flex; align-items:center; justify-content:center; width:64px; height:64px; color:#2ae3d8; background:transparent; border:0; border-radius:0; font-size:32px; line-height:1; }
        .inserted-element i { color:inherit; }
    `;
    document.head.appendChild(style);
}

export function buildElementsPane() {
    ensureStyles();
    const pane = document.createElement('div');
    pane.className = 'es-pane';
    pane.dataset.pane = 'elements';
    pane.innerHTML = '<div class="elements-tools"><input class="elements-search" type="search" placeholder="ابحث عن عنصر" aria-label="البحث عن عنصر"><div class="elements-cats"></div></div><div class="elements-grid"></div>';
    const cats = pane.querySelector('.elements-cats');
    CATEGORIES.forEach(([id, label]) => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'elements-cat'; button.dataset.category = id; button.textContent = label;
        button.addEventListener('click', () => { selectedCategory = id; renderElements(pane); });
        cats.appendChild(button);
    });
    pane.querySelector('.elements-search').addEventListener('input', () => renderElements(pane));
    renderElements(pane);
    return pane;
}

function renderElements(pane) {
    const query = pane.querySelector('.elements-search').value.trim().toLowerCase();
    const grid = pane.querySelector('.elements-grid');
    grid.innerHTML = '';
    pane.querySelectorAll('.elements-cat').forEach((button) => button.classList.toggle('active', button.dataset.category === selectedCategory));
    ELEMENTS.filter(([, label, , category]) => (selectedCategory === 'all' || category === selectedCategory) && (!query || label.includes(query))).forEach(([id, label, icon]) => {
        const item = document.createElement('button');
        item.type = 'button'; item.className = 'element-item'; item.dataset.element = id;
        item.innerHTML = '<i class="fas ' + icon + '"></i><span>' + label + '</span>';
        item.addEventListener('click', () => insertElement(id));
        grid.appendChild(item);
    });
    if (!grid.children.length) grid.innerHTML = '<div class="element-empty">لا توجد عناصر</div>';
}

export function insertElement(id) {
    const wrapper = document.querySelector('.canvas-wrapper');
    const definition = ELEMENTS.find(([elementId]) => elementId === id);
    if (!wrapper || !definition) return;
    record();
    const [, label, icon] = definition;
    const element = document.createElement('div');
    element.className = 'inserted-element';
    element.dataset.elementId = id;
    element.dataset.elementLabel = label;
    element.dataset.layer = '1';
    element.id = 'element-' + id + '-' + Date.now();
    element.innerHTML = '<i class="fas ' + icon + '" aria-label="' + label + '"></i>';
    element.style.position = 'absolute';
    element.style.left = Math.max(0, (wrapper.clientWidth - 140) / 2) + 'px';
    element.style.top = Math.max(0, (wrapper.clientHeight - 55) / 2) + 'px';
    element.style.zIndex = String(maxLayerZ(layerElements()) + 1);
    wrapper.appendChild(element);
    lockDefault(element);
    makeLayerMovable(element);
    selectElement(element, true);
    renderLayers();
    updateCanvasScale();
}

export { ELEMENTS, LABELS };
