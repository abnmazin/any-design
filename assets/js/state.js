// Shared mutable editor state + settings-derived config constants.
// Every editor module reads/writes this single exported object so state is
// never duplicated across module boundaries.

const settings = window.SITE_SETTINGS || window.SITE_SETTINGS_FALLBACK || null;

export const TEXT_COLORS = (settings && settings.textColors) || [];

export const FONTS = (settings && settings.fonts) || [];

export const LOGOS = (settings && settings.logos) || [
    { name: 'Wallet', icon: 'fa-wallet' },
    { name: 'Store', icon: 'fa-store' },
    { name: 'Coffee', icon: 'fa-mug-saucer' },
    { name: 'Utensils', icon: 'fa-utensils' },
    { name: 'Clothes', icon: 'fa-shirt' },
    { name: 'Cart', icon: 'fa-cart-shopping' },
    { name: 'Leaf', icon: 'fa-leaf' },
    { name: 'Car', icon: 'fa-car' },
    { name: 'Phone', icon: 'fa-mobile-screen-button' },
    { name: 'Heart', icon: 'fa-heart' },
];

// The content form fields, in display order. Each entry describes one sidebar
// control and the canvas node it binds to via [data-bind] / [data-bind-to].
// The accent word inside the title is a styled <span>; the form edits the whole
// title string and bindings.js re-derives the accent span position.
export const CONTENT_FORM = [
    { bindTo: 'title', label: 'العنوان الرئيسي', placeholder: 'دفتر الديون' },
    { bindTo: 'subtitle', label: 'العنوان الفرعي', placeholder: 'إدارة ديون الزبائن وحركات الدفع بسهولة' },
    { bindTo: 'tagline-sub', label: 'الوصف المختصر', placeholder: 'بسيط، سريع، وموثوق' },
    { bindTo: 'cta', label: 'نص الزر', placeholder: 'حمّل التطبيق الآن' },
    { bindTo: 'brand-name', label: 'اسم العلامة', placeholder: 'دفتر الديون' },
];

// Reusable field builder ids for the feature cards (heading + body per card).
// Cards are rendered as group 1..N from the template's [data-bind-feature] nodes.
export const FEATURE_FIELD_COUNT = 4;

// Mutable per-session editor state.
export const state = {
    // User zoom multiplier on top of the fit-to-screen base ratio
    // (1 = fit, >1 = zoom in, <1 = zoom out).
    userZoom: 1,
    currentScale: 1,
};