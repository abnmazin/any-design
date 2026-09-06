// Account session layer shared by the app pages. Exposes window.Account with
// login/register/reset/oauth/logout. Pages opt into gating via <body data-auth>:
// "guest" sends signed-in visitors to the gallery, "required" sends anonymous
// visitors to the login page.
import { supabase } from './supabase-client.js';

// Public handles for classic (non-module) page scripts.
window.Supabase = supabase;

const AUTH_ERROR_MAP = [
    [/Invalid login credentials/i, 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'],
    [/Email not confirmed/i, 'أكّد بريدك الإلكتروني أولًا عبر الرسالة المرسلة إليك.'],
    [/Invalid email/i, 'أدخل بريدًا إلكترونيًا صحيحًا.'],
    [/rate limit/i, 'طلبات كثيرة جدًا. انتظر قليلًا ثم أعد المحاولة.'],
    [/over (email|request) send rate limit/i, 'طلبات كثيرة جدًا. انتظر قليلًا ثم أعد المحاولة.'],
    [/already registered/i, 'هذا البريد مسجّل من قبل. سجّل دخولك بدلًا من إنشاء حساب جديد.'],
    [/password should be/i, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.'],
    [/at least 6 characters/i, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.'],
    [/user not found/i, 'لا يوجد حساب بهذا البريد. أنشئ حسابًا جديدًا.'],
    [/recover link/i, 'تعذّر إنشاء رابط الاستعادة. أعد المحاولة.'],
    [/validation failed/i, 'البيانات المدخلة غير مكتملة.'],
];

function toArabicError(error) {
    const message = String((error && error.message) || error);
    for (const [pattern, arabic] of AUTH_ERROR_MAP) {
        if (pattern.test(message)) return arabic;
    }
    return 'حدث خطأ غير متوقع. أعد المحاولة.';
}

let accountUser = undefined; // undefined = still loading, null = signed out, object = signed in
let settled = false;
let readyResolve;
const accountReadyPromise = new Promise((resolve) => {
    readyResolve = resolve;
});
const pendingCallbacks = [];

function settle(user) {
    if (settled) return;
    settled = true;
    accountUser = user;
    readyResolve(user);
    pendingCallbacks.splice(0).forEach((cb) => cb(user));
    window.dispatchEvent(new CustomEvent('account:ready', { detail: user }));
}

// Supabase project is out of our control (network, schema not applied yet):
// no step may block the app forever, so every network call is bounded.
function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((resolve) => setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), ms)),
    ]);
}

async function fetchProfile(userId) {
    const result = await withTimeout(
        supabase.from('profiles').select('username, full_name').eq('id', userId).maybeSingle(),
        5000
    );
    return result.data || {};
}

export async function currentUser() {
    const sessionResult = await withTimeout(supabase.auth.getSession(), 5000);
    if (!sessionResult.data || !sessionResult.data.session) return null;
    const session = sessionResult.data.session;
    const profile = await fetchProfile(session.user.id);
    return {
        id: session.user.id,
        email: session.user.email || '',
        username: profile.username || profile.full_name || session.user.email || 'مستخدم',
    };
}

export async function requireUser(redirectTo) {
    const user = await currentUser();
    if (!user) window.location.replace(redirectTo || '/app/index.html');
    return user;
}

const AUTH_TIMEOUT_ERROR = 'تعذّر الاتصال بالمصادقة. أعد المحاولة.';

export async function login(email, password) {
    const result = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        10000
    );
    return result.error
        ? { ok: false, error: result.error.message === 'timeout' ? AUTH_TIMEOUT_ERROR : toArabicError(result.error) }
        : { ok: true };
}

export async function register(username, email, password) {
    const result = await withTimeout(
        supabase.auth.signUp({
            email,
            password,
            options: { data: { username } },
        }),
        10000
    );
    if (result.error) {
        return { ok: false, error: result.error.message === 'timeout' ? AUTH_TIMEOUT_ERROR : toArabicError(result.error) };
    }
    const data = result.data || {};
    const user = data.user;
    // Fire-and-forget: profiles may not exist yet (schema.sql not applied);
    // never block the signup handshake on it.
    if (user) supabase.from('profiles').upsert({ id: user.id, username }).then(() => {}, () => {});
    if (data.session) return { ok: true };
    return { ok: false, pendingConfirmation: true };
}

export async function resetPassword(email) {
    const result = await withTimeout(
        supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/app/reset.html',
        }),
        10000
    );
    return result.error
        ? { ok: false, error: result.error.message === 'timeout' ? AUTH_TIMEOUT_ERROR : toArabicError(result.error) }
        : { ok: true };
}

export async function oauthLogin(provider) {
    const result = await withTimeout(
        supabase.auth.signInWithOAuth({
            provider,
            options: { redirectTo: window.location.origin + '/app/home.html' },
        }),
        10000
    );
    return result.error
        ? { ok: false, error: result.error.message === 'timeout' ? AUTH_TIMEOUT_ERROR : toArabicError(result.error) }
        : { ok: true };
}

export async function logout() {
    await withTimeout(supabase.auth.signOut(), 5000).catch(() => {});
    window.location.replace('/app/index.html');
}

window.Account = {
    onReady(cb) {
        if (accountUser !== undefined) cb(accountUser);
        else pendingCallbacks.push(cb);
    },
    currentUser: () => currentUser(),
    login: (email, password) => login(email, password),
    register: (username, email, password) => register(username, email, password),
    resetPassword: (email) => resetPassword(email),
    oauth: (provider) => oauthLogin(provider),
    logout: () => logout(),
};

// Resolve initial session + apply the page's data-auth gate.
(function gatePage() {
    const mode = document.body.dataset.auth || 'none';
    withTimeout(supabase.auth.getSession(), 5000)
        .then(async ({ data }) => {
            if (!data.session) {
                settle(null);
                if (mode === 'required') window.location.replace('/app/index.html');
                return;
            }
            const user = await currentUser().catch(() => null);
            settle(user);
            if (mode === 'guest') window.location.replace('/app/home.html');
        })
        .catch(() => {
            settle(null);
            if (mode === 'required') window.location.replace('/app/index.html');
        });
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') settle(null);
        if (event === 'SIGNED_IN' && session) {
            currentUser().then(settle).catch(() => settle(null));
        }
    });
    // Absolute fallback: never leave a page waiting for session forever.
    setTimeout(() => {
        if (!settled) {
            settle(null);
            if (mode === 'required') window.location.replace('/app/index.html');
        }
    }, 8000);
})();

export { accountReadyPromise };