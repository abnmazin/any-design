// Static UI markup and styles for the floating editor chrome, plus buildUI()
// which injects everything into the page. The Strict Template Generator exposes
// a structured content form (إعدادات التصميم) and a brand/theme picker (العلامة)
// against a locked, read-only canvas preview.

import { CONTENT_FORM, FEATURE_FIELD_COUNT } from './state.js';

const STYLE = `
        #editorUI { position: fixed; inset: 0; z-index: 290; pointer-events: none;
            font-family: 'Cairo', sans-serif; }
        #editorUI *, #editorUI *::before, #editorUI *::after { box-sizing: border-box; }

        /* ---- Left sidebar (Glassmorphism / Dark Mode) ---- */
        #editorSidebar {
            position: fixed; left: 82px; top: 68px; width: 300px;
            max-height: calc(100vh - 84px);
            background: linear-gradient(160deg, rgba(10, 22, 40, 0.94), rgba(5, 11, 24, 0.97));
            border: 1px solid rgba(96, 239, 255, 0.16);
            backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            box-shadow: 8px 0 30px rgba(0, 5, 20, 0.55);
            border-radius: 0 14px 14px 0;
            z-index: 90; display: flex; flex-direction: column;
            transform: translateX(-105%); transition: transform 0.28s ease, visibility 0s 0.28s;
            pointer-events: none; visibility: hidden;
        }
        #editorSidebar.is-open {
            transform: translateX(0); pointer-events: auto; visibility: visible;
            transition: transform 0.28s ease, visibility 0s 0s;
        }
        #editorSidebar .es-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; }
        #editorSidebar .es-head h3 { color: #f0f8ff; font-size: 1.05rem; margin: 0; }
        #editorSidebar .es-close { background: none; border: none; color: #7893ab; font-size: 1.4rem; cursor: pointer; }
        #editorSidebar .es-close:hover { color: #fff; }
        #editorSidebar .es-tabs { display: flex; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
        #editorSidebar .es-tab { flex: 1; padding: 10px 4px; background: none; border: none; color: #7893ab;
            font-size: 0.85rem; cursor: pointer; border-bottom: 2px solid transparent; font-family: inherit; }
        #editorSidebar .es-tab.active { color: #60efff; border-bottom-color: #60efff; }
        #editorSidebar .es-body { flex: 1; overflow-y: auto; padding: 16px; }
        #editorSidebar .es-body::-webkit-scrollbar { width: 8px; }
        #editorSidebar .es-body::-webkit-scrollbar-thumb { background: rgba(96, 239, 255, 0.25); border-radius: 4px; }
        #editorSidebar .es-pane { display: none; }
        #editorSidebar .es-pane.active { display: block; }

        /* Content form */
        #contentForm { display: flex; flex-direction: column; gap: 14px; }
        .cf-section { }
        .cf-section-title { color: #60efff; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.3px;
            text-transform: uppercase; margin: 4px 0 10px; display: flex; align-items: center; gap: 8px; }
        .cf-section-title::after { content: ""; flex: 1; height: 1px; background: rgba(96, 239, 255, 0.2); }
        .cf-field { margin-bottom: 14px; }
        .cf-field > label { display: block; color: #7893ab; font-size: 0.72rem; margin-bottom: 6px; }
        .cf-input {
            width: 100%; background: rgba(10, 22, 40, 0.6); border: 1px solid rgba(255, 255, 255, 0.12);
            color: #f0f8ff; padding: 10px 12px; border-radius: 10px; font-family: inherit; font-size: 0.85rem;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .cf-input::placeholder { color: #50677d; }
        .cf-input:focus { outline: none; border-color: #60efff; box-shadow: 0 0 0 3px rgba(96, 239, 255, 0.16); }
        .cf-card { background: rgba(10, 22, 40, 0.55); border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px; padding: 12px; margin-top: 8px; }
        .cf-card-head { color: #7893ab; font-size: 0.7rem; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
        .cf-card-head i { color: #60efff; font-size: 0.85rem; }

        /* Brand pane */
        .logo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .logo-item { background: rgba(10, 22, 40, 0.55); border: 1px solid rgba(96, 239, 255, 0.15);
            border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 6px;
            padding: 14px 8px; cursor: pointer; transition: border-color 0.15s ease, transform 0.15s ease; }
        .logo-item:hover { border-color: #60efff; transform: translateY(-2px); }
        .logo-item.active { background: rgba(96, 239, 255, 0.14); border-color: #60efff; }
        .logo-item i { font-size: 1.5rem; color: #60efff; }
        .logo-item span { color: #7893ab; font-size: 0.72rem; }
        .es-hint { color: #7893ab; font-size: 0.72rem; padding: 12px; background: rgba(10, 22, 40, 0.6);
            border: 1px dashed rgba(255, 255, 255, 0.12); border-radius: 10px; line-height: 1.6; }

        /* ---- Top bar ---- */
        .es-export-btn { display: inline-flex; align-items: center; gap: 8px; }

        /* ---- Tool rail (compact floating vertical pill) ---- */
        .tool-rail {
            position: fixed; left: 14px; top: 50%;
            transform: translateY(-50%);
            width: 62px; height: auto; z-index: 100;
            background: rgba(10, 22, 40, 0.94);
            border: 1px solid rgba(96, 239, 255, 0.14);
            backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 1px rgba(96, 239, 255, 0.15);
            border-radius: 16px;
            display: flex; flex-direction: column; align-items: center;
            padding: 10px 6px; gap: 4px;
        }
        .tool-rail button {
            width: 50px; padding: 9px 0; background: none; border: none; border-radius: 10px;
            color: #7893ab; font-size: 0.58rem; cursor: pointer; font-family: inherit; display: flex;
            flex-direction: column; align-items: center; gap: 4px;
            transition: color 0.15s ease, background 0.15s ease;
        }
        .tool-rail button i { font-size: 1.15rem; }
        .tool-rail button:hover { color: #f0f8ff; background: rgba(255, 255, 255, 0.06); }
        .tool-rail button.active { color: #fff; background: rgba(96, 239, 255, 0.18); }
        .tool-rail .rail-divider { width: 32px; height: 1px; background: rgba(255,255,255,0.1); margin: 4px 0; }
        .tool-rail .rail-zoom {
            display: flex; flex-direction: column; align-items: center; gap: 5px; padding-top: 4px; width: 100%;
        }
        .tool-rail .rail-zoom button {
            width: 34px; padding: 5px 0; border-radius: 8px;
        }
        .tool-rail #zoomValue {
            width: 44px; background: rgba(10, 22, 40, 0.6); border: 1px solid rgba(255, 255, 255, 0.12);
            color: #f0f8ff; text-align: center; border-radius: 7px; font-size: 0.68rem; padding: 3px 0;
        }

        .editor-top-bar { position: fixed; top: 0; left: 0; right: 0; height: 60px; z-index: 95;
            display: flex; align-items: center; justify-content: space-between; padding: 0 20px;
            background: rgba(5, 11, 24, 0.92); border-bottom: 1px solid rgba(96, 239, 255, 0.12);
            backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
        .editor-top-bar .top-bar-title { color: #f0f8ff; font-weight: 700; font-size: 0.95rem; }
        .editor-top-bar .top-bar-right, .editor-top-bar .top-bar-left { display: flex; align-items: center; gap: 10px; }
        .editor-top-bar .btn { border: 1px solid rgba(255, 255, 255, 0.14); background: rgba(10, 22, 40, 0.6);
            color: #f0f8ff; padding: 8px 14px; border-radius: 10px; font-size: 0.82rem; font-weight: 600;
            cursor: pointer; font-family: inherit; text-decoration: none; display: inline-flex; align-items: center; gap: 7px; }
        .editor-top-bar .btn:hover { border-color: #60efff; color: #60efff; }
        .editor-top-bar .btn.primary { background: linear-gradient(135deg, #0061ff, #60efff); color: #050b18;
            border: none; font-weight: 800; }
        .editor-top-bar .btn.primary:disabled { opacity: 0.5; cursor: default; }
        .editor-top-bar .profile-avatar { border-radius: 50%; background: linear-gradient(135deg, #0061ff, #60efff); }

        /* Canvas stage */
        .editor-page .canvas-stage, .editor-page .story-stage, .editor-page .wedding-stage {
            width: 100%; height: calc(100vh - 60px); min-height: 0; padding: 24px 12px; overflow: hidden;
            display: flex; align-items: center; justify-content: center; }
        .editor-page { max-width: 100%; height: 100vh; overflow: hidden; }
    `;

const TOOL_RAIL = `
        <nav class="tool-rail" aria-label="أدوات التصميم">
            <button type="button" data-tool="content"><i class="fas fa-sliders"></i><span>إعدادات</span></button>
            <button type="button" data-tool="brand"><i class="fas fa-palette"></i><span>العلامة</span></button>
            <div class="rail-divider"></div>
            <div class="rail-zoom">
                <button type="button" id="zoomOut" title="تصغير"><i class="fas fa-minus"></i></button>
                <input type="text" id="zoomValue" value="100" inputmode="numeric" aria-label="نسبة التكبير">
                <button type="button" id="zoomIn" title="تكبير"><i class="fas fa-plus"></i></button>
            </div>
        </nav>
    `;

const TOP_BAR = `
        <header class="editor-top-bar">
            <div class="top-bar-right">
                <button class="btn primary save-btn es-export-btn" type="button"><i class="fas fa-download"></i> تصدير</button>
                <div class="profile-avatar" style="width: 32px; height: 32px; display:flex; align-items:center; justify-content:center; font-weight:bold; color:#050b18; cursor:pointer;">M</div>
            </div>
            <div class="top-bar-center"><span class="top-bar-title"></span></div>
            <div class="top-bar-left">
                <button class="btn file-btn" type="button"><i class="fas fa-folder-open"></i> ملف</button>
                <a href="../../app/home.html#/studio" class="btn es-back"><i class="fas fa-arrow-right"></i> رجوع</a>
            </div>
        </header>
    `;

// Render the content form field groups for the feature cards (one per card).
function cardGroupHtml(index) {
    return '<div class="cf-card" data-feature-group="' + index + '">'
        + '<div class="cf-card-head"><i class="fas fa-layer-group"></i> بطاقة ' + index + '</div>'
        + '<div class="cf-field"><label>العنوان</label>'
        + '<input class="cf-input" type="text" data-bind-to="feature-' + index + '-heading" placeholder="عنوان البطاقة"></div>'
        + '<div class="cf-field" style="margin-bottom:0;"><label>الوصف</label>'
        + '<input class="cf-input" type="text" data-bind-to="feature-' + index + '-text" placeholder="نص الوصف"></div>'
        + '</div>';
}

// Render the main content pane: the text fields plus one grouped field per card.
function contentPaneHtml() {
    let heading = '';
    CONTENT_FORM.forEach((f) => {
        heading += '<div class="cf-field"><label>' + f.label + '</label>'
            + '<input class="cf-input" type="text" data-bind-to="' + f.bindTo + '" placeholder="' + f.placeholder + '"></div>';
    });
    let cards = '';
    for (let i = 1; i <= FEATURE_FIELD_COUNT; i++) cards += cardGroupHtml(i);
    return '<form id="contentForm">'
        + '<div class="cf-section"><div class="cf-section-title">النص</div>' + heading + '</div>'
        + '<div class="cf-section"><div class="cf-section-title">البطاقات</div>' + cards + '</div>'
        + '<div class="cf-section"><div class="cf-section-title">الصورة</div>'
        + '<div class="cf-field"><label>صورة التطبيق</label>'
        + '<input class="cf-input" type="file" id="appScreenshotInput" accept="image/*" data-bind-to="app-screenshot"></div>'
        + '</div>'
        + '</form>';
}

function brandPaneHtml() {
    return '<div class="cf-section"><div class="cf-section-title">اللوغو</div>'
        + '<div class="logo-grid" id="logoGrid"></div>'
        + '<div class="es-hint" style="margin-top:12px;">التصميم مقفل: لا يمكن سحب العناصر أو تغيير أحجامها. غيّر النصوص من نموذج الإعدادات.</div>'
        + '</div>';
}

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
            <aside id="editorSidebar" aria-label="إعدادات التصميم">
                <div class="es-head">
                    <h3 id="esTitle">إعدادات التصميم</h3>
                    <button class="es-close" id="esClose" type="button">&times;</button>
                </div>
                <div class="es-tabs">
                    <button class="es-tab active" type="button" data-tab="content">إعدادات</button>
                    <button class="es-tab" type="button" data-tab="brand">العلامة</button>
                </div>
                <div class="es-body">
                    <div class="es-pane active" data-pane="content">${contentPaneHtml()}</div>
                    <div class="es-pane" data-pane="brand">${brandPaneHtml()}</div>
                </div>
            </aside>
        `;
    document.body.appendChild(ui);
}