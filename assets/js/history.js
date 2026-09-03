const past = [];
const future = [];
let restoring = false;

function canvas() {
    return document.querySelector('.canvas-wrapper') || document.querySelector('.card-frame');
}

function snapshot() {
    const root = canvas();
    return root ? root.innerHTML : null;
}

export function record() {
    if (restoring) return;
    const current = snapshot();
    if (current === null || past[past.length - 1] === current) return;
    past.push(current);
    if (past.length > 50) past.shift();
    future.length = 0;
}

function restore(value) {
    const root = canvas();
    if (!root || value === null) return;
    restoring = true;
    root.innerHTML = value;
    document.dispatchEvent(new CustomEvent('editor:canvas-restored'));
    restoring = false;
}

export function undo() {
    const current = snapshot();
    const previous = past.pop();
    if (current === null || previous === undefined) return false;
    future.push(current);
    restore(previous);
    return true;
}

export function redo() {
    const current = snapshot();
    const next = future.pop();
    if (current === null || next === undefined) return false;
    past.push(current);
    restore(next);
    return true;
}

export function resetHistory() {
    past.length = 0;
    future.length = 0;
}
