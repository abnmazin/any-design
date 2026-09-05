// Static UI markup and styles for the floating editor chrome, plus buildUI()
// which injects everything into the page. The Strict Template Generator exposes
// a structured content form (إعدادات التصميم) and a brand/theme picker (العلامة)
// against a locked, read-only canvas preview.
//
// The chrome follows the AnyDesire.Design app theme: dark purple surfaces,
// purple accent, glass blur, pill buttons, IBM Plex Sans Arabic.

import { CONTENT_FORM, FEATURE_FIELD_COUNT } from './state.js';

const STYLE = `
        #editorUI { position: fixed; inset: 0; z-index: 290; pointer-events: none;
            font-family: 'IBM Plex Sans Arabic', 'Cairo', sans-serif; }
        #editorUI *, #editorUI *::before, #editorUI *::after { box-sizing: border-box; }

        /* ---- Left sidebar (AnyDesire glass / dark purple) ---- */
        #editorSidebar {
            position: fixed; left: 0; top: 60px; bottom: 0; width: 320px; height: auto;
            background: linear-gradient(160deg, rgba(16, 13, 26, 0.92), rgba(9, 8, 15, 0.97));
            border: 1px solid rgba(169, 112, 255, 0.18);
            backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            box-shadow: 8px 0 30px rgba(0, 0, 10, 0.55);
            border-radius: 0;
            z-index: 90; display: flex; flex-direction: column;
            transform: none; opacity: 1; pointer-events: auto; visibility: visible;
            transition: none;
        }
        #editorSidebar.is-open {
            transform: none; opacity: 1; pointer-events: auto; visibility: visible;
        }
        #editorSidebar .es-head { display: flex; align-items: center; gap: 10px; padding: 14px 16px; }
        #editorSidebar .es-title-icon {
            width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
            background: rgba(169, 112, 255, 0.14); border: 1px solid rgba(169, 112, 255, 0.4);
            display: flex; align-items: center; justify-content: center;
        }
        #editorSidebar .es-title-icon i { color: #c18aff; font-size: 0.8rem; }
        #editorSidebar .es-head h3 { color: #f4f1fa; font-size: 1.05rem; margin: 0; }
        #editorSidebar .es-close { background: none; border: none; color: #a8a1b8; font-size: 1.4rem; cursor: pointer; }
        #editorSidebar .es-close:hover { color: #fff; }
        #editorSidebar .es-tabs { display: flex; border-bottom: 1px solid rgba(169, 112, 255, 0.1); }
        #editorSidebar .es-tab { flex: 1; padding: 11px 4px; background: none; border: none; color: #a8a1b8;
            font-size: 0.72rem; cursor: pointer; border-bottom: 2px solid transparent; font-family: inherit;
            display: flex; flex-direction: column; align-items: center; gap: 5px; }
        #editorSidebar .es-tab i { font-size: 1rem; }
        #editorSidebar .es-tab.active { color: #a970ff; border-bottom-color: #a970ff; }
        #editorSidebar .es-body { flex: 1; overflow-y: auto; padding: 16px; }
        #editorSidebar .es-body::-webkit-scrollbar { width: 8px; }
        #editorSidebar .es-body::-webkit-scrollbar-thumb { background: rgba(169, 112, 255, 0.25); border-radius: 4px; }
        #editorSidebar .es-pane { display: none; }
        #editorSidebar .es-pane.active { display: block; }

        /* Content form */
        #contentForm { display: flex; flex-direction: column; gap: 14px; }
        .cf-section { }
        .cf-section-title { color: #a970ff; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.3px;
            text-transform: uppercase; margin: 4px 0 10px; display: flex; align-items: center; gap: 8px; }
        .cf-section-title::after { content: ""; flex: 1; height: 1px; background: rgba(169, 112, 255, 0.22); }
        .cf-field { margin-bottom: 14px; }
        .cf-field > label { display: block; color: #a8a1b8; font-size: 0.72rem; margin-bottom: 6px; }
        .cf-input {
            width: 100%; background: rgba(16, 13, 26, 0.6); border: 1px solid rgba(255, 255, 255, 0.12);
            color: #f4f1fa; padding: 10px 12px; border-radius: 10px; font-family: inherit; font-size: 0.85rem;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .cf-input::placeholder { color: #6e6590; }
        .cf-input:focus { outline: none; border-color: #a970ff; box-shadow: 0 0 0 3px rgba(169, 112, 255, 0.16); }
        .cf-card { background: rgba(16, 13, 26, 0.55); border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px; padding: 12px; margin-top: 8px; }
        .cf-card-head { color: #a8a1b8; font-size: 0.7rem; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
        .cf-card-head i { color: #a970ff; font-size: 0.85rem; }

        /* Brand pane */
        .logo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .logo-grid .logo-tools { grid-column: 1 / -1; display: flex; flex-direction: column; gap: 8px; }
        .logo-targets { display: flex; gap: 5px; overflow-x: auto; scrollbar-width: none; }
        .logo-targets::-webkit-scrollbar { display: none; }
        .logo-target { flex: 0 0 auto; border: 1px solid rgba(169, 112, 255, 0.16); background: rgba(16, 13, 26, 0.55);
            color: #a8a1b8; padding: 7px 9px; border-radius: 7px; font: inherit; font-size: 0.68rem; cursor: pointer; }
        .logo-target.active { color: #09080f; background: #a970ff; border-color: #a970ff; }
        .logo-search { width: 100%; background: rgba(16, 13, 26, 0.6); border: 1px solid rgba(169, 112, 255, 0.16);
            color: #f4f1fa; padding: 10px 12px; border-radius: 9px; font: inherit; font-size: 0.8rem; }
        .logo-search:focus { outline: none; border-color: #a970ff; }
        .logo-categories { display: flex; gap: 5px; overflow-x: auto; scrollbar-width: none; }
        .logo-categories::-webkit-scrollbar { display: none; }
        .logo-category { flex: 0 0 auto; border: 1px solid rgba(169, 112, 255, 0.16); background: rgba(16, 13, 26, 0.55);
            color: #a8a1b8; padding: 6px 8px; border-radius: 7px; font: inherit; font-size: 0.68rem; cursor: pointer; }
        .logo-category.active { color: #09080f; background: #a970ff; border-color: #a970ff; }
        .logo-item { background: rgba(16, 13, 26, 0.55); border: 1px solid rgba(169, 112, 255, 0.16);
            border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 6px;
            padding: 14px 8px; cursor: pointer; transition: border-color 0.15s ease, transform 0.15s ease; }
        .logo-item:hover { border-color: #a970ff; transform: translateY(-2px); }
        .logo-item.active { background: rgba(169, 112, 255, 0.14); border-color: #a970ff; }
        .logo-item i { font-size: 1.5rem; color: #a970ff; }
        .logo-item span { color: #a8a1b8; font-size: 0.72rem; }
        .es-hint { color: #a8a1b8; font-size: 0.72rem; padding: 12px; background: rgba(16, 13, 26, 0.6);
            border: 1px dashed rgba(255, 255, 255, 0.12); border-radius: 10px; line-height: 1.6; }
        .ai-pane { display: flex; flex-direction: column; gap: 12px; }
        .ai-head { display: flex; align-items: center; gap: 8px; }
        .ai-head i { color: #a970ff; font-size: 1.05rem; }
        .ai-title { color: #f4f1fa; font-size: 1rem; font-weight: 700; margin: 0; }
        .ai-description { color: #a8a1b8; font-size: 0.78rem; line-height: 1.7; margin: 0; }
        .ai-input { width: 100%; min-height: 110px; resize: vertical; background: rgba(16, 13, 26, 0.6);
            border: 1px solid rgba(169, 112, 255, 0.16); color: #f4f1fa; padding: 10px 12px;
            border-radius: 10px; font: inherit; font-size: 0.82rem; }
        .ai-input:focus { outline: none; border-color: #a970ff; box-shadow: 0 0 0 3px rgba(169, 112, 255, 0.14); }
        .ai-modes { display: flex; gap: 6px; }
        .ai-mode { flex: 1; border: 1px solid rgba(169, 112, 255, 0.16); background: rgba(16, 13, 26, 0.6);
            color: #a8a1b8; padding: 7px 4px; border-radius: 8px; font: inherit; font-size: 0.72rem;
            font-weight: 700; cursor: pointer; transition: all 0.15s ease; }
        .ai-mode:hover { color: #a970ff; border-color: #a970ff; }
        .ai-mode.active { background: #a970ff; border-color: #a970ff; color: #09080f; }
        .ai-action { width: 100%; border: 0; border-radius: 100px; padding: 10px;
            background: linear-gradient(90deg, #6e3cbc, #a970ff); color: #09080f;
            font: inherit; font-weight: 800; cursor: pointer; display: inline-flex;
            align-items: center; justify-content: center; gap: 8px; }
        .ai-action:disabled { opacity: 0.5; cursor: default; }
        .ai-regenerate { width: 100%; border: 1px solid rgba(169, 112, 255, 0.16); border-radius: 100px;
            padding: 9px; background: rgba(16, 13, 26, 0.6); color: #a970ff; font: inherit;
            font-weight: 700; cursor: pointer; display: inline-flex; align-items: center;
            justify-content: center; gap: 8px; font-size: 0.82rem; }
        .ai-regenerate:hover:not(:disabled) { background: rgba(169, 112, 255, 0.12); }
        .ai-regenerate:disabled { opacity: 0.45; cursor: default; }
        .ai-status { font-size: 0.75rem; line-height: 1.6; min-height: 1.4em; padding: 4px 2px; }
        .ai-status.busy { color: #a970ff; }
        .ai-status.ok { color: #73c69a; }
        .ai-status.err { color: #e07a8a; }

        /* Palette pane */
        .palette-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .palette-card { background: rgba(16, 13, 26, 0.55); border: 1px solid rgba(169, 112, 255, 0.16);
            border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 8px;
            padding: 14px 10px; cursor: pointer; transition: border-color 0.15s ease, transform 0.15s ease; }
        .palette-card:hover { border-color: #a970ff; transform: translateY(-2px); }
        .palette-card.active { background: rgba(169, 112, 255, 0.14); border-color: #a970ff; }
        .palette-swatches { display: flex; gap: 5px; }
        .palette-swatch { width: 26px; height: 26px; border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.18); display: inline-flex;
            align-items: center; justify-content: center; }
        .palette-swatch i { color: #a970ff; font-size: 0.85rem; }
        .palette-swatch.dim { background: rgba(255, 255, 255, 0.06); }
        .palette-name { color: #a8a1b8; font-size: 0.72rem; }

        /* Color tools (AI + custom) */
        .color-tools { display: flex; flex-direction: column; gap: 14px; margin-bottom: 16px; }
        .color-tool-box, .icon-tool-box { background: rgba(16, 13, 26, 0.55); border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
        .color-tool-title, .icon-tool-title { color: #a970ff; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.3px;
            display: flex; align-items: center; gap: 6px; text-transform: uppercase; }
        .color-tool-title i, .icon-tool-title i { font-size: 0.85rem; }
        .icon-tool-hint { color: #a8a1b8; font-size: 0.74rem; line-height: 1.6; margin: 0; }
        .icon-tool-box .ai-regenerate { font-size: 0.8rem; padding: 8px; }
        .color-ai-input { width: 100%; min-height: 68px; resize: vertical; background: rgba(16, 13, 26, 0.6);
            border: 1px solid rgba(169, 112, 255, 0.16); color: #f4f1fa; padding: 10px 12px;
            border-radius: 10px; font: inherit; font-size: 0.8rem; }
        .color-ai-input:focus { outline: none; border-color: #a970ff; box-shadow: 0 0 0 3px rgba(169, 112, 255, 0.14); }
        .color-picker-row { display: flex; align-items: center; gap: 10px; }
        .color-picker-row input[type="color"] { width: 44px; height: 32px; border: 1px solid rgba(169, 112, 255, 0.2);
            border-radius: 8px; background: rgba(16, 13, 26, 0.6); padding: 2px; cursor: pointer; }
        .color-picker-row label { color: #a8a1b8; font-size: 0.72rem; flex: 1; }
        .color-preview-row { display: flex; gap: 5px; }
        .color-preview-row .palette-swatch { flex: 1; width: auto; height: 26px; border-radius: 8px; }

        /* ---- Top bar ---- */
        .es-export-btn { display: inline-flex; align-items: center; gap: 8px; }

        /* ---- Zoom controls in the permanent sidebar ---- */
        .sidebar-zoom { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px;
            border-top: 1px solid rgba(169, 112, 255, 0.12); }
        .sidebar-zoom button { width: 32px; height: 30px; border: 1px solid rgba(169, 112, 255, 0.16);
            border-radius: 8px; background: rgba(16, 13, 26, 0.6); color: #a8a1b8; cursor: pointer; }
        .sidebar-zoom button:hover { color: #a970ff; border-color: #a970ff; }
        .sidebar-zoom #zoomValue { width: 48px; background: rgba(16, 13, 26, 0.6); border: 1px solid rgba(255, 255, 255, 0.12);
            color: #f4f1fa; text-align: center; border-radius: 7px; font-size: 0.68rem; padding: 4px 0; }

        .editor-top-bar { position: fixed; top: 0; left: 0; right: 0; height: 60px; z-index: 95;
            display: flex; align-items: center; justify-content: space-between; padding: 0 20px;
            background: rgba(9, 8, 15, 0.92); border-bottom: 1px solid rgba(169, 112, 255, 0.12);
            backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
        .editor-top-bar .top-bar-title { color: #f4f1fa; font-weight: 700; font-size: 0.95rem; }
        .editor-top-bar .top-bar-right, .editor-top-bar .top-bar-left { display: flex; align-items: center; gap: 10px; }
        .editor-top-bar .btn { border: 1px solid rgba(255, 255, 255, 0.14); background: rgba(16, 13, 26, 0.6);
            color: #f4f1fa; padding: 8px 14px; border-radius: 100px; font-size: 0.82rem; font-weight: 600;
            cursor: pointer; font-family: inherit; text-decoration: none; display: inline-flex; align-items: center; gap: 7px; }
        .editor-top-bar .btn:hover { border-color: #a970ff; color: #a970ff; }
        .editor-top-bar .btn.primary { background: linear-gradient(135deg, #6e3cbc, #a970ff); color: #09080f;
            border: none; font-weight: 800; }
        .editor-top-bar .btn.primary:disabled { opacity: 0.5; cursor: default; }
        .editor-top-bar .profile-avatar { border-radius: 50%; background: linear-gradient(135deg, #6e3cbc, #a970ff); }

        /* Canvas stage */
        .editor-page .canvas-stage, .editor-page .story-stage, .editor-page .wedding-stage {
            width: 100%; height: calc(100vh - 60px); min-height: 0; padding: 24px 12px; overflow: hidden;
            display: flex; align-items: center; justify-content: center; }
        .editor-page .canvas-wrapper, .editor-page .card-frame { flex: 0 0 auto; }
        .editor-page { max-width: 100%; height: 100vh; overflow: hidden; }
        @media (max-width: 640px) { #editorSidebar { width: min(320px, 100vw); } }
    `;

const TOP_BAR = `
        <header class="editor-top-bar">
            <div class="top-bar-right">
                <button class="btn primary save-btn es-export-btn" type="button"><i class="fas fa-download"></i> تصدير</button>
                <div class="profile-avatar" style="width: 32px; height: 32px; display:flex; align-items:center; justify-content:center; font-weight:bold; color:#09080f; cursor:pointer;">M</div>
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
        + '<div class="icon-tool-box">'
        + '<div class="icon-tool-title"><i class="fas fa-wand-magic-sparkles"></i> أيقونة بالوصف</div>'
        + '<p class="icon-tool-hint">يقرأ نص الصندوق المحدد ويختار أيقونة تناسبه.</p>'
        + '<button class="ai-action" id="iconAiBtn" type="button"><i class="fas fa-icons"></i> اختيار أيقونة</button>'
        + '<button class="ai-regenerate" id="iconAiRegenerate" type="button" disabled><i class="fas fa-rotate"></i> إعادة اختيار</button>'
        + '<div class="ai-status" id="iconAiStatus" aria-live="polite"></div>'
        + '</div>'
        + '<div class="logo-grid" id="logoGrid"></div>'
        + '<div class="es-hint" style="margin-top:12px;">التصميم مقفل: لا يمكن سحب العناصر أو تغيير أحجامها. غيّر النصوص من نموذج الإعدادات.</div>'
        + '</div>';
}

export function buildUI() {
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap';
    document.head.appendChild(fontLink);

    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);

    const bar = document.createElement('div');
    bar.innerHTML = TOP_BAR;
    document.body.appendChild(bar.firstElementChild);

    const ui = document.createElement('div');
    ui.id = 'editorUI';
    ui.innerHTML = `
            <aside id="editorSidebar" class="is-open" aria-label="إعدادات التصميم">
                <div class="es-head">
                    <div class="es-title-icon"><i class="fas fa-wand-magic-sparkles"></i></div>
                    <h3 id="esTitle">إعدادات التصميم</h3>
                </div>
                <div class="es-tabs">
                    <button class="es-tab active" type="button" data-tab="content"><i class="fas fa-sliders"></i>إعدادات</button>
                    <button class="es-tab" type="button" data-tab="brand"><i class="fas fa-palette"></i>العلامة</button>
                    <button class="es-tab" type="button" data-tab="colors"><i class="fas fa-droplet"></i>الألوان</button>
                    <button class="es-tab" type="button" data-tab="ai"><i class="fas fa-robot"></i>AI</button>
                </div>
                <div class="es-body">
                    <div class="es-pane active" data-pane="content">${contentPaneHtml()}</div>
                    <div class="es-pane" data-pane="brand">${brandPaneHtml()}</div>
                    <div class="es-pane" data-pane="colors"><div class="color-tools">
                        <div class="color-tool-box">
                            <div class="color-tool-title"><i class="fas fa-wand-magic-sparkles"></i> ألوان بالوصف</div>
                            <textarea class="color-ai-input" id="colorAiInput" placeholder="صف ألوان التصميم… مثل: ألوان فاتحة هادئة لتطبيق مطعم راقي" aria-label="وصف الألوان"></textarea>
                            <button class="ai-action color-ai-btn" id="colorAiBtn" type="button"><i class="fas fa-palette"></i> توليد الألوان</button>
                            <button class="ai-regenerate color-ai-regenerate" id="colorAiRegenerate" type="button" disabled><i class="fas fa-rotate"></i> إعادة توليد</button>
                            <div class="color-preview-row" id="colorAiPreview"></div>
                            <div class="ai-status color-ai-status" id="colorAiStatus" aria-live="polite"></div>
                        </div>
                        <div class="color-tool-box">
                            <div class="color-tool-title"><i class="fas fa-sliders"></i> ألوان مخصصة</div>
                            <div class="color-picker-row"><label for="customColor1">اللون الأول (داكن)</label><input type="color" id="customColor1" value="#1e3a8a"></div>
                            <div class="color-picker-row"><label for="customColor2">اللون الثاني (أساسي)</label><input type="color" id="customColor2" value="#a970ff"></div>
                            <div class="color-picker-row"><label for="customColor3">اللون الثالث (فاتح)</label><input type="color" id="customColor3" value="#c18aff"></div>
                            <button class="ai-action color-custom-btn" id="colorCustomBtn" type="button"><i class="fas fa-check"></i> تطبيق الألوان</button>
                            <div class="color-preview-row" id="colorCustomPreview"></div>
                        </div>
                    </div>
                    <div class="palette-grid" id="paletteGrid"></div></div>
                    <div class="es-pane" data-pane="ai"><div class="ai-pane">
                        <div class="ai-head"><i class="fas fa-robot"></i><h4 class="ai-title">مساعد AI</h4></div>
                        <p class="ai-description">اكتب وصفًا لتصميمك وسيملأ المساعد جميع الحقول النصية تلقائيًا: العنوان، الوصف، البطاقات، وأزرار الدعوة.</p>
                        <textarea class="ai-input" placeholder="اكتب وصف التصميم هنا… مثل: تطبيق لمطعم، عنوان «وجبتك المفضلة بخطوة»" aria-label="طلب AI"></textarea>
                        <div class="ai-modes" role="group" aria-label="نمط التوليد">
                            <button class="ai-mode" type="button" data-mode="direct">مباشر</button>
                            <button class="ai-mode active" type="button" data-mode="balanced">متوازن</button>
                            <button class="ai-mode" type="button" data-mode="creative">إبداعي</button>
                        </div>
                        <button class="ai-action" type="button" disabled><i class="fas fa-wand-magic-sparkles"></i> توليد التصميم</button>
                        <button class="ai-regenerate" type="button" disabled><i class="fas fa-rotate"></i> إعادة توليد</button>
                        <div class="ai-status" aria-live="polite"></div>
                    </div></div>
                </div>
                <div class="sidebar-zoom">
                    <button type="button" id="zoomOut" title="تصغير"><i class="fas fa-minus"></i></button>
                    <input type="text" id="zoomValue" value="100" inputmode="numeric" aria-label="نسبة التكبير">
                    <button type="button" id="zoomIn" title="تكبير"><i class="fas fa-plus"></i></button>
                </div>
            </aside>
        `;
    document.body.appendChild(ui);
}