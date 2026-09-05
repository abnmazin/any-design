import { fileURLToPath, URL } from 'node:url';
import { readdirSync, cpSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';

// The editor entry (assets/js/editor.js) is bundled by Rollup, but the classic
// assets/js/site-settings.js and assets/css/site.css are still loaded as raw
// static files. Vite only copies public/ to dist/, so this plugin mirrors the
// project-root assets/ tree into dist/ after every build to keep those
// <script>/<link> references working.
function copyRootAssets() {
    const src = resolve('assets');
    const dest = resolve('dist/assets');
    return {
        name: 'copy-root-assets',
        closeBundle: async (ctx) => {
            try {
                if (readdirSync(src).length) cpSync(src, dest, { recursive: true });
            } catch (err) {
                ctx.warn('copy-root-assets: ' + err.message);
            }
        },
    };
}

// Text models granted to the account key (see Groq dashboard), ordered by
// preference: Arabic quality + JSON reliability first, capacity as fallback.
// GROQ_MODEL (single) overrides the chain entirely when set.
const DEFAULT_AI_MODELS = [
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-120b',
    'groq/compound-mini',
    'qwen/qwen3.6-27b',
    'openai/gpt-oss-20b',
    'groq/compound',
];

function aiProxyPlugin(env) {
    const apiKey = env.GROQ_API_KEY || '';
    const models = env.GROQ_MODEL ? [env.GROQ_MODEL] : DEFAULT_AI_MODELS;
    const middleware = aiProxyMiddleware(apiKey, models);
    return {
        name: 'ai-proxy',
        configureServer(server) {
            server.middlewares.use(middleware);
        },
        configurePreviewServer(server) {
            server.middlewares.use(middleware);
        },
    };
}

// Server-side proxy for the AI auto-fill feature. The Groq API key lives in
// .env (git-ignored) and never reaches the browser; the editor calls
// POST /api/ai/fill with { prompt, schema } and receives { fields }.
// When the active model is rate-limited, down, or rejects the JSON mode, the
// proxy automatically moves to the next model in the chain before giving up.
// Required env vars (see .env):
//   GROQ_API_KEY            mandatory — Groq key (gsk_...)
//   GROQ_MODEL              optional — single model; default is a fallback chain
function aiProxyMiddleware(apiKey, models) {
    const readBody = (req) => new Promise((resolveBody, rejectBody) => {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk;
            if (body.length > 1e6) rejectBody(new Error('payload too large'));
        });
        req.on('end', () => resolveBody(body));
        req.on('error', rejectBody);
    });

    return async (req, res, next) => {
        if (req.method !== 'POST') return next();
        if (req.url.split('?')[0] !== '/api/ai/fill') return next();

        const json = (code, payload) => {
            res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' });
            res.end(JSON.stringify(payload));
        };

        let body;
        try {
            body = await readBody(req);
        } catch (err) {
            return json(400, { error: 'bad_request', message: String(err.message || 'invalid request') });
        }

        let prompt, schema, options;
        try {
            const parsed = JSON.parse(body || '{}');
            prompt = String(parsed.prompt || '').trim();
            schema = Array.isArray(parsed.schema) ? parsed.schema : [];
            options = parsed.options && typeof parsed.options === 'object' ? parsed.options : {};
        } catch {
            return json(400, { error: 'bad_request', message: 'invalid JSON body' });
        }

        if (!apiKey) return json(503, { error: 'not_configured' });
        if (!prompt || !schema.length) return json(400, { error: 'bad_request', message: 'prompt and schema are required' });

        // Client-chosen generation settings: temperature seeds creativity, and
        // the variation number nudges the model toward a fresh copy each run so
        // "regenerate" produces another context, not a duplicate.
        const temperature = Math.min(1, Math.max(0, Number(options.temperature) || 0.3));
        const variation = Number(options.variation) > 0 ? Number(options.variation) : 1;

        // Strip code-fence noise some models add around JSON, then parse the
        // first balanced object found.
        const extractFields = (content) => {
            const cleaned = String(content || '').trim().replace(/```(?:json)?/gi, '');
            const start = cleaned.indexOf('{');
            const end = cleaned.lastIndexOf('}');
            if (start === -1 || end <= start) return null;
            try {
                const parsed = JSON.parse(cleaned.slice(start, end + 1));
                return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
            } catch {
                return null;
            }
        };

        const callGroq = async (currentModel, jsonMode) => {
            const payload = {
                model: currentModel,
                temperature,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: JSON.stringify({ prompt, schema, variation }) },
                ],
            };
            // Some models reject the strict json_object schema; try it first,
            // and on a 400 the caller retries the same model without it.
            if (jsonMode) payload.response_format = { type: 'json_object' };

            const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'content-type': 'application/json', authorization: 'Bearer ' + apiKey },
                body: JSON.stringify(payload),
            });
            const groq = await groqRes.json().catch(() => ({}));
            return { status: groqRes.status, groq };
        };

        const systemPrompt = [
            'You are a design copywriter for Arabic advertising templates.',
            'You receive a JSON schema describing the fields of the currently open design.',
            'Each field has bindTo (the field key), label (the human label, Arabic), and value (the current text).',
            'The user gives a free-form request describing the brand and offer they want.',
            'Rewrite the field values so the whole design matches the request.',
            'Return ONLY a valid JSON object with one entry per schema key. The value is a concise, fluent string',
            'appropriate to that field: titles/headings short, body features a sentence or two, CTA short.',
            'Keep the Arabic length close to the current value length so the design does not overflow.',
            'Never invent keys outside the schema. Respond in Arabic unless the request is clearly for another language.',
            'The variation number changes on every run: when it changed, return distinctly different wording for the same request.',
        ].join(' ');

        const attempts = [];
        for (const currentModel of models) {
            // First pass with strict JSON mode, second pass without it for
            // models that reject response_format.
            for (const jsonMode of [true, false]) {
                let result;
                try {
                    result = await callGroq(currentModel, jsonMode);
                } catch (err) {
                    attempts.push({ model: currentModel, stage: jsonMode ? 'json' : 'plain', status: 0, reason: String(err.message || 'network error') });
                    continue;
                }
                const { status, groq } = result;

                const providerError = (groq.error && groq.error.message) || '';
                if (status !== 200) {
                    attempts.push({ model: currentModel, stage: jsonMode ? 'json' : 'plain', status, reason: providerError });
                    // Don't waste the plain retry when the provider is down or
                    // rate-limited — the failure is model-level, move on.
                    if (status === 429 || status === 500 || status >= 502 || status === 401 || status === 403) break;
                    continue;
                }

                const content = groq.choices && groq.choices[0] && groq.choices[0].message && groq.choices[0].message.content;
                const fields = extractFields(content);
                if (!fields) {
                    attempts.push({ model: currentModel, stage: jsonMode ? 'json' : 'plain', status, reason: 'invalid JSON in response' });
                    continue;
                }

                const allowed = new Set(schema.map((f) => f.bindTo));
                const safeFields = {};
                Object.keys(fields).forEach((key) => {
                    if (allowed.has(key)) safeFields[key] = String(fields[key]).trim();
                });
                if (!Object.keys(safeFields).length) {
                    attempts.push({ model: currentModel, stage: jsonMode ? 'json' : 'plain', status, reason: 'no valid fields returned' });
                    continue;
                }
                return json(200, { fields: safeFields, usedModel: currentModel });
            }
        }

        const lastAttempt = attempts[attempts.length - 1];
        return json(503, {
            error: 'limits_exceeded',
            message: 'استُنفدت حدود النماذج المتاحة حاليًا. حاول بعد قليل.',
            attempts,
            reason: lastAttempt ? lastAttempt.reason : 'no models configured',
        });
    };
}

export default defineConfig(({ mode }) => {
    // Only server-side secrets (GROQ_*) are read here; nothing leaks into the
    // browser bundle. loadEnv with '' loads all vars, including non-VITE_ ones.
    const env = loadEnv(mode, process.cwd(), '');

    // Client-side flag: bundle knows whether the server proxy can serve AI.
    // Only the boolean reaches the browser, never the key itself. JSON.stringify
    // keeps it a string literal so __VITE_AI_ENABLED__ === '1' stays truthy.
    const aiEnabled = env.GROQ_API_KEY ? '1' : '';

    return {
        define: {
            __VITE_AI_ENABLED__: JSON.stringify(aiEnabled),
        },
        plugins: [copyRootAssets(), aiProxyPlugin(env)],
        build: {
            rollupOptions: {
                input: {
                    main: fileURLToPath(new URL('./index.html', import.meta.url)),
                    login: fileURLToPath(new URL('./app/index.html', import.meta.url)),
                    home: fileURLToPath(new URL('./app/home.html', import.meta.url)),
                    wedding: fileURLToPath(new URL('./templates/wedding/wedding.html', import.meta.url)),
                    story: fileURLToPath(new URL('./templates/story/story.html', import.meta.url)),
                    bento: fileURLToPath(new URL('./templates/bento/bento.html', import.meta.url)),
                    studio: fileURLToPath(new URL('./templates/debt-ledger/studio.html', import.meta.url)),
                    'windows-1': fileURLToPath(new URL('./templates/windows-1/windows-1.html', import.meta.url)),
                    'windows-2': fileURLToPath(new URL('./templates/windows-2/windows-2.html', import.meta.url)),
                    'phone-1': fileURLToPath(new URL('./templates/phone-1/phone-1.html', import.meta.url)),
                    'phone-2': fileURLToPath(new URL('./templates/phone-2/phone-2.html', import.meta.url)),
                },
            },
        },
    };
});