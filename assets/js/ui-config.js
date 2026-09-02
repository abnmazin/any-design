// Static UI markup and styles for the floating editor chrome, plus buildUI()
// which injects everything into the page. The markup strings are kept verbatim
// from the original single-file editor to avoid visual regressions.

import { fontsHtml } from './helpers.js';
import { startResize, startMove } from './interactions.js';

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

    export function buildUI() {
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
        ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].forEach((side) => {
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