(function () {
    // Unified editor UI: bottom floating toolbar + left sidebar.
    // The sidebar has three tabs: Layers (order/overlap), Text (selected
    // element settings) and Logo (replaces the separate logo popover).
    // Reads colors/fonts/logos from the central site-settings.js.

    const settings = window.SITE_SETTINGS || window.SITE_SETTINGS_FALLBACK || null;
    const textColors = (settings && settings.textColors) || [];
    const fonts = (settings && settings.fonts) || [];
    const LOGOS = (settings && settings.logos) || [
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

    // Mockup devices available in the "القوالب" tab. Each entry points to a
    // standalone fragment in public/mockups/ that is fetched and injected into
    // the active canvas as a movable .mockup-frame layer.
    const MOCKUPS = [
        { id: 'phone', label: 'جوال', icon: 'fa-mobile-screen-button' },
        { id: 'laptop', label: 'لابتوب', icon: 'fa-laptop' },
        { id: 'monitor', label: 'شاشة', icon: 'fa-desktop' },
    ];

    const STYLE = `
        #editorUI { position: fixed; inset: 0; z-index: 290; pointer-events: none;
            font-family: 'Cairo', sans-serif; }
        #editorUI *, #editorUI *::before, #editorUI *::after { box-sizing: border-box; }

        /* ---- Left sidebar ---- */
        #editorSidebar {
            position: fixed; left: 76px; top: 60px; height: calc(100vh - 60px); width: 300px;
            background: rgba(9, 17, 26, 0.98); border-right: 1px solid rgba(26,229,255,0.2);
            box-shadow: 20px 0 40px rgba(0,0,0,0.5); z-index: 90;
            display: flex; flex-direction: column;
            transform: translateX(-100%); transition: transform 0.28s ease;
            pointer-events: auto;
        }
        #editorSidebar.open { transform: translateX(0); }
        #editorSidebar .es-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; }
        #editorSidebar .es-head h3 { color: #f0fdfa; font-size: 1.05rem; margin: 0; }
        #editorSidebar .es-close { background: none; border: none; color: #8ba3b5; font-size: 1.4rem; cursor: pointer; }
        #editorSidebar .es-close:hover { color: #fff; }
        #editorSidebar .es-tabs { display: none; }
        #editorSidebar .es-tab { flex: 1; padding: 10px 4px; background: none; border: none; color: #8ba3b5;
            font-size: 0.85rem; cursor: pointer; border-bottom: 2px solid transparent; font-family: inherit; }
        #editorSidebar .es-tab.active { color: #1ae5ff; border-bottom-color: #1ae5ff; }
        #editorSidebar .es-body { flex: 1; overflow-y: auto; padding: 14px; }
        #editorSidebar .es-pane { display: none; }
        #editorSidebar .es-pane.active { display: block; }

        /* Layers */
        .layers-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
        .layers-list li { display: flex; align-items: center; gap: 8px; padding: 9px 10px;
            background: #0d1f25; border: 1px solid rgba(26,229,255,0.15); border-radius: 10px;
            color: #d5e5ee; font-size: 0.85rem; cursor: pointer; user-select: none; }
        .layers-list li.active { border-color: #1ae5ff; background: rgba(26,229,255,0.15); }
        .layers-list li.drag-over { border-color: #22c55e; background: rgba(34,197,94,0.12); }
        .layers-list li .lay-grip { color: #8ba3b5; font-size: 1rem; cursor: grab; padding: 0 2px; flex-shrink: 0; }
        .layers-list li .lay-grip:active { cursor: grabbing; }
        .layers-list li .lay-idx { color: #8ba3b5; font-size: 0.7rem; min-width: 16px; }
        .layers-list li .lay-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .layers-list li .lay-tag { font-size: 0.65rem; color: #7fd6a8; }

        /* Text pane */
        .es-field { margin-bottom: 14px; }
        .es-label { color: #8ba3b5; font-size: 0.72rem; margin-bottom: 6px; display: block; }
        .es-swatches { display: flex; flex-wrap: wrap; gap: 8px; }
        .es-swatch { width: 26px; height: 26px; border-radius: 8px; cursor: pointer;
            border: 2px solid rgba(255,255,255,0.35); }
        .es-swatch.active { border-color: #fff; box-shadow: 0 0 0 2px #1ae5ff; }
        .es-select { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
            color: #f0fdfa; padding: 9px; border-radius: 9px; font-family: inherit; font-size: 0.85rem; }
        .es-select option { background: #0a111c; }
        .es-row { display: flex; align-items: center; gap: 8px; }
        .es-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #f0fdfa;
            width: 38px; height: 34px; border-radius: 9px; cursor: pointer; font-size: 1rem; }
        .es-btn:hover { border-color: #1ae5ff; color: #1ae5ff; }
        .es-val { flex: 1; text-align: center; color: #f0fdfa; font-weight: 700; }
        .es-colorwrap { position: relative; width: 38px; height: 34px; }
        .es-colorwrap input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
        .es-colorchip { width: 38px; height: 34px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.2);
            background: conic-gradient(#ef4444,#f97316,#facc15,#22c55e,#06b6d4,#3b82f6,#a855f7,#ec4899,#ef4444); }
        .es-hint { color: #8ba3b5; font-size: 0.72rem; padding: 10px; background: #0d1f25; border-radius: 10px; }

        /* Logo pane */
        .logo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .logo-item { background: #0d1f25; border: 1px solid rgba(26,229,255,0.15); border-radius: 12px;
            display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 8px; cursor: pointer; }
        .logo-item:hover { border-color: #1ae5ff; transform: translateY(-2px); }
        .logo-item.active { background: rgba(26,229,255,0.15); border-color: #1ae5ff; }
        .logo-item i { font-size: 1.5rem; color: #1ae5ff; }
        .logo-item span { color: #8ba3b5; font-size: 0.72rem; }

        /* Mockups (القوالب) pane */
        .mockup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .mockup-item { background: #0d1f25; border: 1px solid rgba(26,229,255,0.15); border-radius: 12px;
            display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px 8px; cursor: pointer;
            color: #f0fdfa; }
        .mockup-item:hover { border-color: #1ae5ff; transform: translateY(-2px); }
        .mockup-item i { font-size: 2rem; color: #1ae5ff; }
        .mockup-item span { color: #8ba3b5; font-size: 0.72rem; font-weight: 700; }
        .mockup-hint { color: #8ba3b5; font-size: 0.72rem; padding: 10px; background: #0d1f25;
            border-radius: 10px; margin-top: 12px; }

        /* ---- Bottom floating toolbar ---- */
        #editorToolbar {
            position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%);
            display: none; align-items: center; gap: 8px; padding: 9px 12px;
            background: rgba(9,17,26,0.95); border: 1px solid rgba(26,229,255,0.25); border-radius: 18px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.6); backdrop-filter: blur(14px); z-index: 296;
            pointer-events: auto; max-width: calc(100vw - 24px); overflow-x: auto;
        }
        #editorToolbar.show { display: flex; }
        #editorToolbar .tb-divider { width: 1px; height: 26px; background: rgba(255,255,255,0.12); margin: 0 2px; }
        #editorToolbar .tb-swatches { display: flex; align-items: center; gap: 6px; }
        #editorToolbar .tb-swatch { width: 22px; height: 22px; border-radius: 7px; cursor: pointer;
            border: 2px solid rgba(255,255,255,0.35); }
        #editorToolbar .tb-swatch.active { border-color: #fff; box-shadow: 0 0 0 2px #1ae5ff; }
        #editorToolbar .tb-font { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
            color: #f0fdfa; height: 30px; border-radius: 8px; padding: 0 6px; font-size: 0.78rem; max-width: 120px;
            font-family: inherit; }
        #editorToolbar .tb-font option { background: #0a111c; }
        #editorToolbar .tb-size { display: flex; align-items: center; gap: 2px; }
        #editorToolbar .tb-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
            color: #f0fdfa; min-width: 30px; height: 30px; border-radius: 8px; cursor: pointer; }
        #editorToolbar .tb-btn:hover { border-color: #1ae5ff; color: #1ae5ff; }
        #editorToolbar .tb-size-val { min-width: 34px; text-align: center; color: #f0fdfa; font-weight: 700; font-size: 0.8rem; }

        /* Placeholder for free-moved elements */
        .editor-placeholder {
            background: rgba(255, 255, 255, 0.03); box-sizing: border-box; pointer-events: none; }

        /* Resize + move overlay */
        #resizeOverlay { position: fixed; z-index: 293; pointer-events: none; display: none;
            border: 1px dashed rgba(26,229,255,0.9); box-shadow: 0 0 0 1px rgba(0,0,0,0.4);
            will-change: top, left; }
        #resizeOverlay.show { display: block; }
        .rs-handle { position: fixed; z-index: 294; width: 10px; height: 10px; background: #1ae5ff;
            border: 2px solid #0a111c; border-radius: 3px; display: none; pointer-events: auto; }
        .rs-handle.show { display: block; }
        .rs-n, .rs-s { cursor: ns-resize; } .rs-e, .rs-w { cursor: ew-resize; }
        .rs-ne, .rs-sw { cursor: nesw-resize; } .rs-nw, .rs-se { cursor: nwse-resize; }
        .rs-move-handle { position: fixed; z-index: 294; width: 24px; height: 24px; background: #1ae5ff;
            border: 2px solid #0a111c; border-radius: 6px; color: #0a111c; display: none; align-items: center;
            justify-content: center; font-size: 0.8rem; cursor: grab; pointer-events: auto; }
        .rs-move-handle.show { display: flex; }
        .rs-move-handle:active { cursor: grabbing; }
    `;

    let activeElement = null;

    // Saved text range inside the active element, so formatting survives focus loss
    // when a toolbar control collapses the live selection first (e.g. iOS Safari).
    let activeRange = null;

    // ---------- helpers ----------

    function swatchHtml(c) {
        const light = (/^#(f|e|d)/i.test(c.color) || c.color === '#ffffff') ? ' tb-swatch-light' : '';
        return `<span class="tb-swatch${light}" data-color="${c.color}" title="${c.name}" style="background:${c.color}"></span>`;
    }

    function fontsHtml() {
        return fonts.map((f) => `<option value="${f.value}">${f.label}</option>`).join('');
    }

    function rgbToHex(color) {
        const m = (color || '').match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
        if (!m) return null;
        const to = (n) => Math.round(Number(n)).toString(16).padStart(2, '0');
        return '#' + to(m[1]) + to(m[2]) + to(m[3]);
    }

    function currentFontSize(el) {
        return Math.round(parseFloat(window.getComputedStyle(el).fontSize));
    }

    function normalizeFamilyName(family) {
        return String(family).toLowerCase().replace(/^'|'$/g, '').trim();
    }

    function isEditableTarget(node) {
        const el = node && node.nodeType === 1 ? node : (node && node.parentElement);
        const editable = el && el.closest('[contenteditable="true"]');
        if (!editable) return false;
        if (editable.closest('#editorUI')) return false;
        return editable;
    }

    // ---------- build UI ----------

    const TOOL_RAIL = `
        <nav class="tool-rail" aria-label="أدوات التصميم">
            <button type="button" data-tool="templates"><i class="fas fa-layer-group"></i><span>القوالب</span></button>
            <button type="button" data-tool="elements"><i class="fas fa-shapes"></i><span>العناصر</span></button>
            <button type="button" data-tool="text"><i class="fas fa-font"></i><span>النص</span></button>
            <button type="button" data-tool="uploads"><i class="fas fa-image"></i><span>الرفع</span></button>
            <button type="button" data-tool="brand"><i class="fas fa-palette"></i><span>العلامة</span></button>
            <button type="button" data-tool="layers"><i class="fas fa-layers"></i><span>الطبقات</span></button>
            <div class="rail-zoom">
                <button type="button" id="zoomOut" title="تصغير"><i class="fas fa-minus"></i></button>
                <input type="text" id="zoomValue" value="100" inputmode="numeric" aria-label="نسبة التكبير">
                <button type="button" id="zoomIn" title="تكبير"><i class="fas fa-plus"></i></button>
            </div>
        </nav>
    `;

    const TOP_BAR = `
        <header class="editor-top-bar">
            <!-- أقصى اليمين: زر الحفظ وصورة البروفايل -->
            <div class="top-bar-right">
                <button class="btn primary save-btn" type="button" style="padding: 6px 14px; border-radius: 8px; font-size: 0.82rem; font-weight: 600;"><i class="fas fa-floppy-disk"></i> حفظ</button>
                <div class="profile-avatar" style="width: 30px; height: 30px; border-radius: 50%; background: #1ae5ff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.8rem; color: #0a111c; cursor: pointer;">M</div>
            </div>

            <!-- المنتصف: اسم الملف -->
            <div class="top-bar-center">
                <span class="top-bar-title"></span>
            </div>

            <!-- أقصى اليسار: زر ملف وزر رجوع -->
            <div class="top-bar-left">
                <button class="btn file-btn" type="button" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #f0fdfa; padding: 6px 12px; border-radius: 8px; font-size: 0.82rem; font-weight: 600;"><i class="fas fa-folder-open"></i> ملف</button>
                <a href="../../app/home.html#/studio" class="btn es-back" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #f0fdfa; padding: 6px 12px; border-radius: 8px; font-size: 0.82rem; font-weight: 600;"><i class="fas fa-arrow-right"></i> رجوع</a>
            </div>
        </header>
    `;

    function buildUI() {
        const style = document.createElement('style');
        style.textContent = STYLE;
        document.head.appendChild(style);

        const rail = document.createElement('div');
        rail.innerHTML = TOOL_RAIL;
        document.body.appendChild(rail.firstElementChild);

        const bar = document.createElement('div');
        bar.innerHTML = TOP_BAR;
        document.body.appendChild(bar.firstElementChild);

        const ui = document.createElement('div');
        ui.id = 'editorUI';
        ui.innerHTML = `
            <aside id="editorSidebar">
                <div class="es-head">
                    <h3 id="esTitle">الإعدادات</h3>
                    <button class="es-close" id="esClose">&times;</button>
                </div>
                <div class="es-tabs">
                    <button class="es-tab active" data-tab="layers">الطبقات</button>
                    <button class="es-tab" data-tab="text">النص</button>
                    <button class="es-tab" data-tab="templates">القوالب</button>
                    <button class="es-tab" data-tab="logo">اللوغو</button>
                </div>
                <div class="es-body">
                    <div class="es-pane active" data-pane="layers">
                        <ul class="layers-list" id="layersList"></ul>
                    </div>
                    <div class="es-pane" data-pane="text">
                        <div class="es-field">
                            <label class="es-label">اللون</label>
                            <div class="es-swatches" id="textSwatches"></div>
                        </div>
                        <div class="es-field">
                            <label class="es-label">الخط</label>
                            <select class="es-select" id="fontSelect">${fontsHtml()}</select>
                        </div>
                        <div class="es-field">
                            <label class="es-label">حجم الخط</label>
                            <div class="es-row">
                                <button class="es-btn" id="sizeMinus">−</button>
                                <span class="es-val" id="sizeVal">28</span>
                                <button class="es-btn" id="sizePlus">+</button>
                            </div>
                        </div>
                        <div class="es-field">
                            <label class="es-label">لون مخصص</label>
                            <div class="es-row">
                                <div class="es-colorwrap"><input type="color" id="customColor" value="#1ae5ff">
                                    <div class="es-colorchip"></div></div>
                            </div>
                        </div>
                        <div class="es-field"><button class="es-btn" id="textBold" style="width:100%;height:36px;"><b>B</b> غامق</button></div>
                        <div class="es-hint">حدد نصاً داخل التصميم لعرض إعداداته هنا.</div>
                    </div>
                    <div class="es-pane" data-pane="logo">
                        <div class="logo-grid" id="logoGrid"></div>
                    </div>
                    <div class="es-pane" data-pane="templates">
                        <div class="mockup-grid" id="mockupGrid"></div>
                        <div class="mockup-hint">اضغط على أي جهاز لإدراجه في التصميم كنموذج قابل للنقل والتكبير.</div>
                    </div>
                </div>
            </aside>

            <div id="editorToolbar">
                <div class="tb-swatches" id="tbSwatches"></div>
                <div class="tb-divider"></div>
                <select class="tb-font" id="tbFont">${fontsHtml()}</select>
                <div class="tb-divider"></div>
                <div class="tb-size">
                    <button class="tb-btn" id="tbMinus" title="تصغير">−</button>
                    <span class="tb-size-val" id="tbSizeVal">28</span>
                    <button class="tb-btn" id="tbPlus" title="تكبير">+</button>
                </div>
                <div class="tb-divider"></div>
                <button class="tb-btn" id="tbBold" title="غامق"><b>B</b></button>
                <div class="tb-divider"></div>
            </div>

            <div id="resizeOverlay"></div>
        `;
        document.body.appendChild(ui);
        ['nw','n','ne','e','se','s','sw','w'].forEach((side) => {
            const h = document.createElement('div');
            h.className = 'rs-handle rs-' + side;
            h.dataset.side = side;
            h.addEventListener('mousedown', (e) => startResize(e, side));
            document.body.appendChild(h);
        });
        const moveHandle = document.createElement('div');
        moveHandle.id = 'rsMoveHandle';
        moveHandle.className = 'rs-move-handle';
        moveHandle.innerHTML = '&#10227;';
        moveHandle.title = 'Move';
        moveHandle.addEventListener('mousedown', startMove);
        document.body.appendChild(moveHandle);
    }

    // ---------- selection / overlay ----------

    function overlayEls() {
        return {
            overlay: document.getElementById('resizeOverlay'),
            handles: document.querySelectorAll('.rs-handle'),
            move: document.getElementById('rsMoveHandle'),
        };
    }

    function showOverlay() {
        if (!activeElement) return;
        if (activeElement.getBoundingClientRect().width === 0) return;
        const o = overlayEls();
        o.overlay.classList.add('show');
        o.handles.forEach((h) => h.classList.add('show'));
        o.move.classList.add('show');
        positionOverlay();
    }

    function hideOverlay() {
        const o = overlayEls();
        o.overlay.classList.remove('show');
        o.handles.forEach((h) => h.classList.remove('show'));
        o.move.classList.remove('show');
    }

    function positionOverlay() {
        if (!activeElement) return;
        const r = activeElement.getBoundingClientRect();
        const o = overlayEls();
        o.overlay.style.left = r.left + 'px';
        o.overlay.style.top = r.top + 'px';
        o.overlay.style.width = Math.round(r.width) + 'px';
        o.overlay.style.height = Math.round(r.height) + 'px';
        const half = 5;
        const positions = {
            nw: [r.left, r.top], n: [r.left + r.width/2, r.top], ne: [r.left + r.width, r.top],
            e: [r.left + r.width, r.top + r.height/2], se: [r.left + r.width, r.top + r.height],
            s: [r.left + r.width/2, r.top + r.height], sw: [r.left, r.top + r.height],
            w: [r.left, r.top + r.height/2],
        };
        o.handles.forEach((h) => {
            const p = positions[h.dataset.side];
            h.style.left = (p[0] - half) + 'px';
            h.style.top = (p[1] - half) + 'px';
        });
        o.move.style.left = (r.left - 14) + 'px';
        o.move.style.top = (r.top - 14) + 'px';
    }

    // ---------- resize ----------

    const MIN_W = 40;
    const MIN_H = 24;
    let resizeState = null;

    function startResize(e, side) {
        if (!activeElement) return;
        e.preventDefault();
        e.stopPropagation();
        const r = activeElement.getBoundingClientRect();
        resizeState = { side, startX: e.clientX, startY: e.clientY, startW: r.width, startH: r.height };
        document.addEventListener('mousemove', onResizeMove);
        document.addEventListener('mouseup', endResize);
        showToolbarEl(false);
    }

    function onResizeMove(e) {
        if (!resizeState || !activeElement) return;
        const dx = e.clientX - resizeState.startX;
        const dy = e.clientY - resizeState.startY;
        let w = resizeState.startW;
        let h = resizeState.startH;
        const sides = resizeState.side;
        if (sides.indexOf('e') !== -1) w += dx / currentScale;
        if (sides.indexOf('s') !== -1) h += dy / currentScale;
        if (sides.indexOf('w') !== -1) w -= dx / currentScale;
        if (sides.indexOf('n') !== -1) h -= dy / currentScale;
        activeElement.style.width = Math.max(MIN_W, Math.round(w)) + 'px';
        activeElement.style.height = Math.max(MIN_H, Math.round(h)) + 'px';
        positionOverlay();
    }

    function endResize() {
        document.removeEventListener('mousemove', onResizeMove);
        document.removeEventListener('mouseup', endResize);
        resizeState = null;
        if (activeElement) toolbarsShow();
    }

    // ---------- move ----------

    let moveState = null;

    // Current fit-to-screen scale applied to the canvas; needed to correct
    // mouse deltas (viewport px -> canvas CSS px) during drag/resize.
    let currentScale = 1;

    // User zoom multiplier applied on top of the fit-to-screen base ratio
    // (1 = fit, >1 = zoom in, <1 = zoom out).
    let userZoom = 1;

    function applyZoom() {
        const valueEl = document.getElementById('zoomValue');
        if (valueEl) valueEl.value = Math.round(userZoom * 100) + '';
        updateCanvasScale();
    }

    function updateCanvasScale() {
        const wrapper = document.querySelector('.canvas-wrapper');
        if (!wrapper) return;
        // The stage is the scaling container (varies per template: .canvas-stage,
        // .wedding-stage, .story-stage). Resolve it as the wrapper's parent.
        const stage = wrapper.parentElement;
        const drawer = document.getElementById('editorSidebar');
        const w = wrapper.offsetWidth;
        const h = wrapper.offsetHeight;
        if (!w || !h) return;
        // Available viewport space minus the tool rail, open drawer, and toolbar.
        const rail = 76;
        const drawerW = drawer && drawer.classList.contains('open') ? 300 : 0;
        const toolbarH = 60;
        const availW = window.innerWidth - rail - drawerW;
        const availH = window.innerHeight - toolbarH;
        const ratio = Math.min(availW / w, availH / h, 1) * 0.9 * userZoom;
        currentScale = ratio;
        stage.style.transform = 'scale(' + ratio + ')';
        stage.style.transformOrigin = 'center center';
    }

    function findCanvas() {
        return document.querySelector('.canvas-wrapper')
            || document.querySelector('.phone')
            || document.body;
    }

    function startMove(e) {
        if (!activeElement) return;
        e.preventDefault();
        e.stopPropagation();
        const r = activeElement.getBoundingClientRect();
        const canvas = findCanvas();
        const canvasRect = canvas.getBoundingClientRect();

        // Insert placeholder on first move to preserve layout
        const hasPlaceholder = activeElement.querySelector('.editor-placeholder')
            || (activeElement.parentElement && activeElement.parentElement.querySelector('.editor-placeholder'));
        if (!hasPlaceholder && !activeElement.dataset.placeholder) {
            const ph = document.createElement('div');
            ph.className = 'editor-placeholder';
            ph.style.width = Math.round(r.width) + 'px';
            ph.style.height = Math.round(r.height) + 'px';
            activeElement.dataset.placeholder = '1';
            if (activeElement.parentElement) {
                activeElement.parentElement.insertBefore(ph, activeElement);
            }
        }

        activeElement.style.position = 'absolute';
        activeElement.style.margin = '0';
        activeElement.style.willChange = 'top, left';
        activeElement.style.zIndex = String(maxLayerZ(layerElements()) + 1);
        moveState = {
            offsetX: e.clientX - r.left,
            offsetY: e.clientY - r.top,
        };
        activeElement.style.left = ((r.left - canvasRect.left) / currentScale) + 'px';
        activeElement.style.top = ((r.top - canvasRect.top) / currentScale) + 'px';
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', endMove);
        showToolbarEl(false);
    }

    function onMove(e) {
        if (!moveState || !activeElement) return;
        const canvas = findCanvas();
        const canvasRect = canvas.getBoundingClientRect();
        activeElement.style.left = ((e.clientX - canvasRect.left - moveState.offsetX) / currentScale) + 'px';
        activeElement.style.top = ((e.clientY - canvasRect.top - moveState.offsetY) / currentScale) + 'px';
        positionOverlay();
    }

    function endMove() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', endMove);
        moveState = null;
        if (activeElement) {
            // Free-form canvas: no placeholder should linger after the drop.
            const ph = (activeElement.parentElement
                ? activeElement.parentElement.querySelector('.editor-placeholder')
                : null);
            if (ph) ph.remove();
            delete activeElement.dataset.placeholder;
            activeElement.style.willChange = 'auto';
            toolbarsShow(); renderLayers();
        }
    }

    // Make static background images/SVGs draggable layers.
    // They are movable like text, defaulting to a low z-index as a backdrop.
    function makeBaseImagesMovable() {
        // Phone mockup frame moves as a single unit (frame + screen + image).
        // The upload overlay keeps working since its clicks are excluded.
        frameElements().forEach(makeFrameMovable);

        // Plain image/SVG layers that aren't carried by a frame above.
        document.querySelectorAll('.canvas-wrapper img, .canvas-wrapper svg').forEach((img) => {
            if (img.closest('#editorUI')) return;
            if (img.closest('.mockup-frame') || img.closest('.phone-mockup')) return;
            img.style.position = (img.style.position || '') || 'absolute';
            img.style.zIndex = '1';
            img.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                selectElement(img, true);
                startMove(e);
            });
        });
    }

    // Make a single .mockup-frame movable (draggable/resizable) as one unit.
    // Upload buttons (.upload-overlay / *.mc-*-upload) keep working because
    // their clicks are excluded from starting a move.
    function makeFrameMovable(frame) {
        if (!frame) return;
        if (frame.__movable) return;
        frame.__movable = true;
        frame.style.position = frame.style.position || 'absolute';
        if (!frame.style.zIndex) frame.style.zIndex = '1';
        frame.addEventListener('mousedown', (e) => {
            if (e.target.closest('.upload-overlay, [class$="-upload"], .mc-phone-upload, .mc-laptop-upload, .mc-monitor-upload')) return;
            e.preventDefault();
            e.stopPropagation();
            selectElement(frame, true);
            startMove(e);
        });
    }

    // Initialise every editable layer with a positioned context and an ordered
    // base z-index on load, so the Layers panel can reorder elements without the
    // user having to physically drag (and thereby unlock) a layer on the canvas first.
    function initLayerStack() {
        layerElements().forEach((el, i) => {
            el.style.position = el.style.position || 'relative';
            if (!el.style.zIndex) el.style.zIndex = String(i + 1);
        });
        renderLayers();
    }

    // ---------- text styling ----------

    function applyToSelection(applyFn) {
        const sel = window.getSelection();

        // Restore a previously saved partial selection if the live one was
        // collapsed by focus loss (Step 3 fallback for aggressive browsers).
        if ((!sel || sel.isCollapsed || !sel.rangeCount)
            && activeRange && !activeRange.collapsed && activeElement.contains(activeRange.commonAncestorContainer)) {
            sel.removeAllRanges();
            sel.addRange(activeRange.cloneRange());
        }

        const within = sel && sel.rangeCount && !sel.isCollapsed
            && activeElement.contains(sel.anchorNode) && activeElement.contains(sel.focusNode);
        if (!within) { applyFn(activeElement); syncTextUI(); return; }

        const range = sel.getRangeAt(0).cloneRange();
        const saved = sel.getRangeAt(0).cloneRange();

        // Reuse a styling span when the whole selection already sits inside one,
        // so repeated partial edits don't stack nested <span>s.
        const common = range.commonAncestorContainer;
        const span = (common && common.nodeType === 1 && common.tagName === 'SPAN')
            ? common
            : null;
        if (span && range.toString() === span.textContent) {
            applyFn(span);
        } else {
            const fragment = range.extractContents();
            if (!fragment.textContent) { applyFn(activeElement); syncTextUI(); return; }
            const wrap = document.createElement('span');
            wrap.appendChild(fragment);
            range.insertNode(wrap);
            applyFn(wrap);
        }
        saved.collapse(false);
        sel.removeAllRanges();
        sel.addRange(saved);
        syncTextUI();
    }

    function setColor(color) {
        if (!activeElement) return;
        applyToSelection((target) => {
            target.style.color = color;
            target.querySelectorAll('span, i, em, b, strong').forEach((s) => { s.style.color = color; });
        });
        syncTextUI();
    }

    function setFont(family) {
        if (!activeElement) return;
        applyToSelection((el) => { el.style.fontFamily = family; });
        syncTextUI();
    }

    function toggleBold() {
        if (!activeElement) return;
        applyToSelection((el) => {
            const w = parseInt(window.getComputedStyle(el).fontWeight, 10) || 400;
            el.style.fontWeight = w >= 600 ? '400' : '700';
        });
        syncTextUI();
    }

    function resizeFont(delta) {
        if (!activeElement) return;
        applyToSelection((target) => {
            const size = currentFontSize(target) || 0;
            target.style.fontSize = Math.min(160, Math.max(10, size + delta * 2)) + 'px';
        });
    }

    // ---------- sync UI state ----------

    function syncTextUI() {
        if (!activeElement) return;
        const size = currentFontSize(activeElement) || 0;
        document.getElementById('tbSizeVal').textContent = size;
        document.getElementById('sizeVal').textContent = size;
        const color = rgbToHex(window.getComputedStyle(activeElement).color);
        document.querySelectorAll('#tbSwatches .tb-swatch, #textSwatches .es-swatch').forEach((sw) => {
            const m = sw.dataset.color.toLowerCase() === String(color || '').toLowerCase();
            sw.classList.toggle('active', m);
        });
        const family = normalizeFamilyName(window.getComputedStyle(activeElement).fontFamily);
        [document.getElementById('tbFont'), document.getElementById('fontSelect')].forEach((sel) => {
            Array.from(sel.options).forEach((opt) => {
                if (family.indexOf(normalizeFamilyName(opt.value)) !== -1) sel.value = opt.value;
            });
        });
    }

    // ---------- layers ----------

    let layerUpdating = false;

    function editableElements() {
        return Array.from(document.querySelectorAll('[contenteditable="true"]'))
            .filter((el) => !el.closest('#editorUI'))
            .filter((el) => {
                const parentEditable = el.parentElement && el.parentElement.closest('[contenteditable="true"]');
                return !parentEditable;
            });
    }

    // Non-editable but movable "object" layers (mockup frames: phone, laptop, monitor).
    // Any element tagged with the shared .mockup-frame class joins this group.
    function frameElements() {
        return Array.from(document.querySelectorAll('.canvas-wrapper .mockup-frame, .canvas-wrapper .phone-mockup'));
    }

    // All layers shown/managed in the Layers drawer: text layers + frames.
    function layerElements() {
        return editableElements().concat(frameElements());
    }

    function layerZIndex(el) {
        if (!el) return 0;
        const inline = parseInt(el.style.zIndex, 10);
        if (!isNaN(inline)) return inline;
        const computed = parseInt(window.getComputedStyle(el).zIndex, 10);
        return isNaN(computed) ? 0 : computed;
    }

    function maxLayerZ(els) {
        return els.reduce((m, el) => Math.max(m, layerZIndex(el)), 0);
    }

    function renderLayers() {
        layerUpdating = true;
        const list = document.getElementById('layersList');
        const els = layerElements();
        const order = els.slice().sort((a, b) => layerZIndex(a) - layerZIndex(b));
        list.innerHTML = '';
        order.forEach((el, i) => {
            const li = document.createElement('li');
            const z = layerZIndex(el);
            li.dataset.el = String(i);
            li.draggable = true;
            li.innerHTML = '<span class="lay-grip" title="اسحب لإعادة الترتيب">&#9776;</span><span class="lay-idx">' + (i + 1) + '</span><span class="lay-name">' + describe(el) + '</span><span class="lay-tag">' + z + '</span>';
            li.addEventListener('mousedown', (e) => e.stopPropagation());
            li.addEventListener('click', (e) => { e.stopPropagation(); selectElement(el, true); });
            if (el === activeElement) li.classList.add('active');
            li.addEventListener('dragstart', (e) => {
                li.classList.add('drag-over');
                e.dataTransfer.setData('text/plain', String(i));
                e.dataTransfer.effectAllowed = 'move';
            });
            li.addEventListener('dragend', () => { li.classList.remove('drag-over'); });
            li.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; li.classList.add('drag-over'); });
            li.addEventListener('dragleave', () => { li.classList.remove('drag-over'); });
            li.addEventListener('drop', (e) => {
                e.preventDefault();
                li.classList.remove('drag-over');
                const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
                const toIdx = i;
                if (fromIdx === toIdx) return;
                reorderLayer(fromIdx, toIdx);
            });
            list.appendChild(li);
        });
        layerUpdating = false;
    }

    function reorderLayer(fromIdx, toIdx) {
        const els = layerElements().sort((a, b) => layerZIndex(a) - layerZIndex(b));
        if (fromIdx < 0 || fromIdx >= els.length || toIdx < 0 || toIdx >= els.length) return;
        const targetZ = layerZIndex(els[toIdx]);
        const movedZ = layerZIndex(els[fromIdx]);
        els[fromIdx].style.zIndex = String(targetZ);
        els[toIdx].style.zIndex = String(movedZ);
        renderLayers();
    }

    function describe(el) {
        if (el.classList && el.classList.contains('phone-mockup')) return 'إطار الموبايل';
        if (el.classList && el.classList.contains('laptop-mockup')) return 'إطار اللابتوب';
        if (el.classList && el.classList.contains('monitor-mockup')) return 'إطار الشاشة';
        const text = (el.textContent || '').trim();
        return (text.length > 22 ? text.slice(0, 22) + '…' : text) || el.tagName.toLowerCase();
    }

    function selectElement(el, keepOverlay) {
        activeElement = el;
        if (el) {
            toolbarsShow();
        }
        renderLayers();
        if (keepOverlay && el) showOverlay();
        syncTextUI();
    }

    // ---------- logo ----------

    function renderLogos() {
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

    function syncLogoActive() {
        const first = document.querySelector('.logo-icon i, .logo-box i');
        if (!first) return;
        document.querySelectorAll('.logo-item').forEach((x) => {
            x.classList.toggle('active', first.className.includes(x.dataset.icon));
        });
    }

    // ---------- mockups (القوالب tab) ----------

    // Note: injected mockups are scoped with device-specific classes (e.g.
    // .mc-phone-frame), so re-inserting the same device reuses one <style> block.
    const injectedMockupStyles = {};

    function renderMockups() {
        const grid = document.getElementById('mockupGrid');
        if (!grid) return;
        grid.innerHTML = '';
        MOCKUPS.forEach((m) => {
            const item = document.createElement('div');
            item.className = 'mockup-item';
            item.dataset.mock = m.id;
            item.innerHTML = '<i class="fas ' + m.icon + '"></i><span>' + m.label + '</span>';
            item.addEventListener('mousedown', (e) => e.stopPropagation());
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                insertMockup(m.id);
            });
            grid.appendChild(item);
        });
    }

    function insertMockup(id) {
        const frame = insertMockupFragment(id);
        if (!frame) return;
        selectElement(frame, true);
        renderLayers();
        updateCanvasScale();
        if (document.getElementById('mockupGrid')) {
            document.querySelectorAll('.mockup-item').forEach((x) => {
                x.classList.toggle('active', x.dataset.mock === id);
            });
        }
    }

    async function insertMockupFragment(id) {
        const wrapper = document.querySelector('.canvas-wrapper');
        if (!wrapper) return null;
        const m = MOCKUPS.find((x) => x.id === id);
        if (!m) return null;

        // Resolve the mockups folder. The fragments live at /mockups/ in dev
        // and dist/mockups/ in production (vite copies public/ verbatim), so try
        // ascending-relative and absolute candidates until one fetches.
        const fileName = id + '.html';
        const candidates = []
            .concat('mockups/' + fileName, '../mockups/' + fileName,
                '../../mockups/' + fileName, '/mockups/' + fileName);
        let text = null;
        for (let i = 0; i < candidates.length; i++) {
            try {
                const res = await fetch(candidates[i], { method: 'GET' });
                if (res.ok) { text = await res.text(); break; }
            } catch (e) { /* try next candidate */ }
        }
        if (!text) return null;

        // Dedupe the injected <style> so inserting the same device twice
        // doesn't duplicate rules.
        const styleMatch = text.match(/<style>([\s\S]*?)<\/style>/);
        if (styleMatch) {
            const scope = styleMatch[1].match(/\.(mc-[a-z-]+-frame)/);
            const key = scope ? scope[1] : id;
            if (!injectedMockupStyles[key]) {
                const st = document.createElement('style');
                st.textContent = styleMatch[1];
                document.head.appendChild(st);
                injectedMockupStyles[key] = true;
            }
        }

        // Extract the .mockup-frame markup (the whole body content).
        const bodyMatch = text.match(/<body>([\s\S]*?)<\/body>/);
        if (!bodyMatch) return null;
        const tmp = document.createElement('div');
        tmp.innerHTML = bodyMatch[1].trim();
        const frame = tmp.querySelector('.mockup-frame');
        if (!frame) return null;

        // Give this instance a unique id and make it an absolutely-positioned
        // draggable layer placed near the canvas top-centre.
        const uid = (id + '-' + Date.now()).replace(/[^a-z0-9-]/gi, '');
        frame.id = uid;

        // Append first so its dimension/style resolve, then measure and position.
        // Any inner screen image stays locked to the frame (not a separate layer).
        frame.style.position = 'absolute';
        frame.style.margin = '0';
        frame.querySelectorAll('img').forEach((img) => { img.draggable = false; });
        wrapper.appendChild(frame);

        const canvasRect = wrapper.getBoundingClientRect();
        const fw = frame.offsetWidth || frame.getBoundingClientRect().width;
        const fh = frame.offsetHeight || frame.getBoundingClientRect().height;
        frame.style.left = Math.max(0, (canvasRect.width - fw) / 2) + 'px';
        frame.style.top = Math.max(0, (canvasRect.height - fh) * 0.28) + 'px';
        frame.style.zIndex = String(maxLayerZ(layerElements()) + 1);

        // Wire the device's upload control (if present) and make it a movable layer.
        wireMockupUpload(frame);
        makeFrameMovable(frame);

        return frame;
    }

    function wireMockupUpload(frame) {
        const btn = frame.querySelector('.mc-phone-upload, .mc-laptop-upload, .mc-monitor-upload');
        const shot = frame.querySelector('.mc-shot');
        if (!btn || !shot) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        document.body.appendChild(input);
        btn.addEventListener('click', (e) => { e.stopPropagation(); input.click(); });
        input.addEventListener('change', () => {
            if (!input.files || !input.files[0]) return;
            shot.src = URL.createObjectURL(input.files[0]);
        });
    }

    // ---------- sidebar + toolbar visibility ----------

    function showToolbarEl(show) {
        const t = document.getElementById('editorToolbar');
        if (show) t.classList.add('show'); else t.classList.remove('show');
    }

    function toolbarsShow() {
        showToolbarEl(true);
        showOverlay();
    }

    function sidebarOpen(open) {
        document.getElementById('editorSidebar').classList.toggle('open', open);
        updateCanvasScale();
    }

    // ---------- tool rail ----------

    // Each tool maps to an existing drawer pane, or null when no panel exists yet.
    const TOOL_PANES = {
        templates: 'templates',
        elements: null,
        text: 'text',
        uploads: null,
        brand: 'logo',
        layers: 'layers',
    };

    const TOOL_LABELS = {
        templates: 'القوالب',
        elements: 'العناصر',
        text: 'النص',
        uploads: 'الرفع',
        brand: 'العلامة',
        layers: 'الطبقات',
    };

    function activatePane(pane) {
        document.querySelectorAll('.es-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === pane));
        document.querySelectorAll('.es-pane').forEach((p) =>
            p.classList.toggle('active', p.dataset.pane === pane));
        if (pane === 'logo') syncLogoActive();
    }

    function onToolClick(e) {
        const btn = e.target.closest('.tool-rail button');
        if (!btn) return;

        const tool = btn.dataset.tool;
        const rails = document.querySelectorAll('.tool-rail button');
        const pane = TOOL_PANES[tool];

        // Toggle: clicking the already-active button closes the drawer and clears state.
        if (btn.classList.contains('active')) {
            btn.classList.remove('active');
            sidebarOpen(false);
            return;
        }

        rails.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        if (pane) {
            document.getElementById('esTitle').textContent = TOOL_LABELS[tool];
            sidebarOpen(true);
            activatePane(pane);
        } else {
            sidebarOpen(false);
            console.log('Opened: ' + TOOL_LABELS[tool]);
        }
    }

    // ---------- events ----------

    function bind() {
        // sidebar tabs
        document.querySelectorAll('.es-tab').forEach((tab) => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.es-tab').forEach((t) => t.classList.toggle('active', t === tab));
                document.querySelectorAll('.es-pane').forEach((p) =>
                    p.classList.toggle('active', p.dataset.pane === tab.dataset.tab));
                if (tab.dataset.tab === 'logo') syncLogoActive();
            });
        });

        // toolbar swatches (bottom)
        document.getElementById('tbSwatches').innerHTML = textColors.map(swatchHtml).join('');
        document.getElementById('textSwatches').innerHTML = textColors.map(swatchHtml).join('');
        document.querySelectorAll('#tbSwatches .tb-swatch, #textSwatches .es-swatch').forEach((sw) => {
            sw.addEventListener('click', () => setColor(sw.dataset.color));
        });

        // font selects
        [document.getElementById('tbFont'), document.getElementById('fontSelect')].forEach((sel) => {
            sel.addEventListener('change', () => setFont(sel.value));
        });

        // size
        document.getElementById('tbPlus').addEventListener('click', () => resizeFont(1));
        document.getElementById('tbMinus').addEventListener('click', () => resizeFont(-1));
        document.getElementById('sizePlus').addEventListener('click', () => resizeFont(1));
        document.getElementById('sizeMinus').addEventListener('click', () => resizeFont(-1));

        // bold + custom color
        document.getElementById('tbBold').addEventListener('click', toggleBold);
        document.getElementById('textBold').addEventListener('click', toggleBold);
        document.getElementById('customColor').addEventListener('input', (e) => setColor(e.target.value));

        // sidebar close (drawer close button)
        document.getElementById('esClose').addEventListener('click', () => sidebarOpen(false));

        // tool rail (Canva-style primary navigation)
        document.querySelector('.tool-rail').addEventListener('click', onToolClick);

        // zoom controls (bottom of the tool rail)
        document.getElementById('zoomIn').addEventListener('click', () => {
            userZoom = Math.min(4, +(userZoom + 0.1).toFixed(2));
            applyZoom();
        });
        document.getElementById('zoomOut').addEventListener('click', () => {
            userZoom = Math.max(0.1, +(userZoom - 0.1).toFixed(2));
            applyZoom();
        });
        document.getElementById('zoomValue').addEventListener('change', (e) => {
            const val = Math.min(400, Math.max(10, Number(e.target.value) || 100));
            userZoom = val / 100;
            applyZoom();
        });
        document.getElementById('zoomValue').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') e.target.blur();
        });

        // selection -> activate element + show toolbar/overlay; save partial range
        document.addEventListener('selectionchange', () => {
            if (layerUpdating) return;
            const sel = window.getSelection();
            const editable = isEditableTarget(sel && sel.anchorNode);
            if (editable) {
                selectElement(editable, true);
                if (sel && sel.rangeCount && !sel.isCollapsed) {
                    activeRange = sel.getRangeAt(0).cloneRange();
                }
            }
        });

        // Prevent toolbar/sidebar controls from stealing focus, preserving the
        // live text selection so partial-text formatting isn't lost on click.
        document.getElementById('editorUI').addEventListener('mousedown', (e) => {
            e.preventDefault();
        });

        // clicking outside editable hides toolbar + overlay
        document.addEventListener('mousedown', (e) => {
            if (isEditableTarget(e.target)) return;
            if (document.getElementById('editorUI').contains(e.target)) return;
            showToolbarEl(false);
            hideOverlay();
            activeElement = null;
            activeRange = null;
            renderLayers();
        });

        // reposition overlay + re-scale canvas on window resize
        window.addEventListener('resize', () => {
            updateCanvasScale();
            if (activeElement) { showOverlay(); }
        });

        renderLayers();
    }

    // ---------- init ----------

    // Migrate the dimension/title text from the old preview toolbar into the
    // new top bar, then remove the original toolbar from the DOM entirely.
    function initTopBar() {
        const oldBar = document.querySelector('.preview-toolbar');
        const titleEl = document.querySelector('.top-bar-title');
        if (oldBar && titleEl) {
            const zoom = oldBar.querySelector('.zoom');
            titleEl.textContent = zoom ? zoom.textContent.trim() : 'تصميم جديد';
        }
        if (oldBar) oldBar.remove();
    }

    function inject() {
        buildUI();
        bind();
        renderLogos();
        renderMockups();
        initTopBar();
        makeBaseImagesMovable();
        initLayerStack();
        updateCanvasScale();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject);
    } else {
        inject();
    }
})();