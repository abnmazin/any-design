// Shared mutable editor state + settings-derived config constants.
// The previous single-file IIFE used module-scope `let` declarations; here they
// live on one exported object so every editor module reads/writes the same
// values regardless of import order.

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

// Minimum resize bounds for any layer.
export const MIN_W = 40;
export const MIN_H = 24;

// Mockup devices available in the "القوالب" tab. Each entry points to a
// standalone fragment in public/mockups/ that is fetched and injected into
// the active canvas as a movable .mockup-frame layer.
export const MOCKUPS = [
    { id: 'phone', label: 'جوال', icon: 'fa-mobile-screen-button' },
    { id: 'laptop', label: 'لابتوب', icon: 'fa-laptop' },
    { id: 'monitor', label: 'شاشة', icon: 'fa-desktop' },
];

// Mutable per-session editor state, shared across module boundaries.
export const state = {
    activeElement: null,

    // Saved text range inside the active element, so formatting survives focus
    // loss when a toolbar control collapses the live selection first (e.g. iOS).
    activeRange: null,

    currentScale: 1,

    // User zoom multiplier on top of the fit-to-screen base ratio
    // (1 = fit, >1 = zoom in, <1 = zoom out).
    userZoom: 1,

    resizeState: null,
    moveState: null,
    layerUpdating: false,
};