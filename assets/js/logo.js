// Logo drawer: renders the replaceable logo icons and highlights whichever one
// is currently used by the design's .logo-box / .logo-icon element.

import { LOGOS } from './state.js';

const LOGO_ICONS = 'wallet store mug-saucer utensils shirt cart-shopping leaf car mobile-screen-button heart star check user users user-tie user-group people-group person person-dress child baby face-smile face-grin face-laugh face-meh face-frown face-angry ghost robot cat dog paw fish dove dragon horse cow frog spider bug butterfly apple banana carrot lemon pepper-hot pizza hamburger hotdog ice-cream cake cookie candy coffee glass-water wine-glass beer mug-hot bottle-water bowl-food plate-wheat egg cheese-burger drumstick fish-fins seedling tree flower tulip sun cloud moon stars rainbow snowflake fire bolt water droplet wind tornado mountain globe earth-americas map location-dot compass house building store warehouse hospital school landmark church mosque castle tent city road bridge train subway bus car-side taxi truck trailer plane rocket helicopter ship sailboat bicycle motorbike person-walking person-running person-hiking person-swimming person-skiing person-snowboarding wheelchair universal-access hand hand-pointer thumbs-up thumbs-down peace fist-handshake handshake heart-circle-check circle-check circle-xmark circle-info circle-question triangle-exclamation exclamation circle-plus circle-minus plus minus xmark equals asterisk hashtag at link paperclip bookmark flag tag tags certificate award trophy medal crown gem gift box archive folder folder-open file file-lines clipboard copy paste scissors pen pencil brush palette paintbrush ruler crop object-group shapes table columns list bars chart-simple chart-bar chart-line chart-pie chart-area signal wifi bluetooth battery-full plug power lightbulb eye eye-slash lock unlock key shield shield-halved fingerprint bug-slash bell bell-slash comment comments message envelope inbox paper-plane phone phone-volume fax video camera image images music film microphone headphones volume-high play pause stop forward backward arrows-left-right arrows-up-down arrow-up arrow-down arrow-left arrow-right arrow-up-right arrow-down-left chevron-up chevron-down chevron-left chevron-right angle-up angle-down angle-left angle-right caret-up caret-down caret-left caret-right circle-up circle-down circle-left circle-right rotate-left rotate-right refresh sync repeat reply share print download upload cloud-arrow-down cloud-arrow-up magnifying-glass gear gears sliders filter bars-staggered grip-lines grip-vertical ellipsis ellipsis-vertical calendar calendar-days clock stopwatch hourglass-half alarm time capsule wallet money-bill money-bill-wave coins credit-card receipt cart-plus cart-arrow-down bag-shopping basket-shopping shop shopping-bag truck-fast box-open barcode qrcode percent calculator scale balance-scale briefcase chart-column chart-area table-cells-row-lock id-card address-book contact-book passport ticket ticket-simple bullhorn megaphone volume-off radio podcast rss globe-americas language flag-usa flag-checkered instagram facebook twitter x-twitter whatsapp youtube linkedin github google apple microsoft android chrome firefox edge discord telegram tiktok pinterest snapchat reddit twitch dribbble behance figma stack-overflow code code-branch terminal database server cloud computer laptop desktop tablet mobile screen-users sitemap diagram-project network-datacenter microchip memory puzzle-piece flask atom rocket-launch wand-magic-sparkles sparkles feather mask mask-face ghost skull gamepad dice-dice chess-knight football basketball baseball volleyball golf-ball tennis-ball bowling-ball person-skiing-nordic person-snowboarding water-ladder swimmer-person person-biking person-falling person-drowning heart-pulse kit-medical syringe pills stethoscope tooth bone brain dna virus biohazard house-medical user-doctor user-nurse baby-carriage dog service'.split(' ');

const LOGO_CATEGORIES = [
    ['all', 'الكل'], ['business', 'أعمال'], ['people', 'أشخاص'], ['food', 'طعام'],
    ['nature', 'طبيعة'], ['objects', 'أشياء'], ['actions', 'أفعال'], ['social', 'اجتماعي'],
];

const LOGO_TARGET_SELECTOR = '.logo-icon i, .logo-box i, .feature-card .f-header i, .ldg-head .logo i, .brand-pill > i';

function iconLabel(icon) {
    return icon.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function categoryForIcon(icon, index) {
    if (/user|person|people|child|baby|face|hand|doctor|nurse|walker|drowning/.test(icon)) return 'people';
    if (/apple|banana|carrot|pizza|burger|coffee|cake|food|drink|wine|beer|bowl|plate|ice|cookie|candy|cheese|egg/.test(icon)) return 'food';
    if (/leaf|tree|flower|seedling|sun|cloud|moon|rainbow|snow|mountain|earth|globe|water|wind|fire|fish|paw|dog|cat|horse|cow|frog|spider|bug|butterfly|dragon|dove/.test(icon)) return 'nature';
    if (/instagram|facebook|twitter|youtube|linkedin|github|google|apple|microsoft|android|chrome|firefox|discord|telegram|tiktok|pinterest|snapchat|reddit|twitch|dribbble|behance|figma/.test(icon)) return 'social';
    if (/briefcase|building|store|warehouse|hospital|school|landmark|chart|money|credit|receipt|cart|shop|bag|basket|barcode|calculator|scale|wallet|coins/.test(icon)) return 'business';
    if (/arrow|chevron|angle|caret|rotate|refresh|sync|repeat|reply|share|play|pause|stop|forward|backward|plus|minus|check|xmark|download|upload|search|filter|sort|sliders/.test(icon)) return 'actions';
    return index % 2 ? 'objects' : 'business';
}

const LOGO_CATALOG = LOGO_ICONS.slice(0, 250).map((icon, index) => {
    const configured = LOGOS.find((logo) => logo.icon === 'fa-' + icon);
    return {
        name: configured ? configured.name : iconLabel(icon),
        icon: 'fa-' + icon,
        category: categoryForIcon(icon, index),
    };
});
let selectedCategory = 'all';
let searchQuery = '';
let selectedTarget = null;

function logoTargets() {
    return Array.from(document.querySelectorAll(LOGO_TARGET_SELECTOR));
}

function targetLabel(icon, index) {
    const card = icon.closest('.feature-card');
    if (card) {
        const heading = card.querySelector('[data-bind$="-heading"], h4');
        return heading ? 'بطاقة ' + heading.textContent.trim() : 'بطاقة ' + (index + 1);
    }
    if (icon.closest('.logo-icon, .logo-box, .brand-pill')) return 'العلامة الرئيسية';
    if (icon.closest('.ldg-head')) return 'علامة دفتر الديون';
    return 'علامة ' + (index + 1);
}

export function renderLogos() {
    const grid = document.getElementById('logoGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const tools = document.createElement('div');
    tools.className = 'logo-tools';
    const targets = document.createElement('div');
    targets.className = 'logo-targets';
    const availableTargets = logoTargets();
    if (!selectedTarget || !selectedTarget.isConnected) selectedTarget = availableTargets[0] || null;
    availableTargets.forEach((icon, index) => {
        const target = document.createElement('button');
        target.type = 'button';
        target.className = 'logo-target';
        target.textContent = targetLabel(icon, index);
        target.classList.toggle('active', selectedTarget === icon);
        target.addEventListener('click', () => { selectedTarget = icon; renderLogos(); });
        targets.appendChild(target);
    });
    const search = document.createElement('input');
    search.className = 'logo-search';
    search.type = 'search';
    search.placeholder = 'ابحث عن علامة';
    search.value = searchQuery;
    search.setAttribute('aria-label', 'البحث عن علامة');
    search.addEventListener('input', () => { searchQuery = search.value.trim().toLowerCase(); renderLogos(); });
    const categories = document.createElement('div');
    categories.className = 'logo-categories';
    LOGO_CATEGORIES.forEach(([id, label]) => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'logo-category'; button.textContent = label;
        button.classList.toggle('active', selectedCategory === id);
        button.addEventListener('click', () => { selectedCategory = id; renderLogos(); });
        categories.appendChild(button);
    });
    tools.append(targets, search, categories);
    grid.appendChild(tools);
    const items = document.createDocumentFragment();
    LOGO_CATALOG.filter((lg) => (selectedCategory === 'all' || lg.category === selectedCategory)
        && (!searchQuery || (lg.name + ' ' + lg.icon).toLowerCase().includes(searchQuery)))
        .forEach((lg) => {
        const item = document.createElement('div');
        item.className = 'logo-item';
        item.dataset.icon = lg.icon;
        item.innerHTML = '<i class="fas ' + lg.icon + '"></i><span>' + lg.name + '</span>';
        item.addEventListener('mousedown', (e) => e.stopPropagation());
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            if (selectedTarget) selectedTarget.className = 'fas ' + lg.icon;
            grid.querySelectorAll('.logo-item').forEach((x) => x.classList.toggle('active', x === item));
        });
        items.appendChild(item);
    });
    grid.appendChild(items);
}

export function syncLogoActive() {
    const first = document.querySelector(LOGO_TARGET_SELECTOR);
    if (!first) return;
    document.querySelectorAll('.logo-item').forEach((x) => {
        x.classList.toggle('active', first.className.includes(x.dataset.icon));
    });
}