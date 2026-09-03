// Pure helpers shared across the editor modules.

// Convert an rgb()/rgba() color string to hex. Returns null when the string
// has no match.
export function rgbToHex(color) {
    const m = (color || '').match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
    if (!m) return null;
    const to = (n) => Math.round(Number(n)).toString(16).padStart(2, '0');
    return '#' + to(m[1]) + to(m[2]) + to(m[3]);
}