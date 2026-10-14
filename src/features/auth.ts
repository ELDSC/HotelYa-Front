import { getApiBaseUrl } from '../config/env';
import { HttpError } from '../api/client';
import { appPath } from '../utils/urls';
import { ownerPages } from '../config/owner-pages';
export interface Account { id: number; email: string }
interface AuthResponse { accessToken: string; expiresIn: number; user: Account }
let accessToken = '';
let expiresAt = 0;
let account: Account | null = null;
let pending: Promise<Account | null> | null = null;
let channel: BroadcastChannel | null = null;
function initSessionChannel(): void {
    if (channel || typeof BroadcastChannel === 'undefined') return;
    channel = new BroadcastChannel('hotelya-session');
    channel.addEventListener('message', () => { accessToken = ''; expiresAt = 0; account = null; });
}
export async function responseError(response: Response): Promise<HttpError> {
    let message = response.status === 401 ? 'Tu sesión ha terminado. Vuelve a ingresar.' : 'No pudimos completar la operación. Inténtalo de nuevo.';
    let fields: Record<string, string> = {};
    try {
        const body = await response.json() as { message?: unknown; fields?: unknown };
        if (typeof body.message === 'string') message = body.message;
        if (body.fields && typeof body.fields === 'object') {
            fields = Object.fromEntries(Object.entries(body.fields).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
        }
    } catch { /* A proxy may return a non-JSON error. */ }
    return new HttpError(response.status, message, fields);
}
async function raw(path: string, init: RequestInit = {}): Promise<Response> {
    return fetch(`${getApiBaseUrl()}/api${path}`, { ...init, signal: init.signal ?? AbortSignal.timeout(path === '/owner/media' && init.method === 'POST' ? 120_000 : 30_000) });
}
async function authPost(path: string, body?: unknown): Promise<AuthResponse | null> {
    const csrfResponse = await raw('/auth/csrf', { credentials: 'include' });
    if (!csrfResponse.ok) throw await responseError(csrfResponse);
    const csrf = await csrfResponse.json() as { token: string; headerName: string };
    const response = await raw(`/auth/${path}`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw await responseError(response);
    if (response.status === 204) return null;
    return await response.json() as AuthResponse;
}
function accept(data: AuthResponse): Account {
    initSessionChannel();
    accessToken = data.accessToken; expiresAt = Date.now() + data.expiresIn * 1000; account = data.user;
    localStorage.removeItem('isLoggedIn'); localStorage.removeItem('userEmail');
    return data.user;
}
export async function signIn(email: string, password: string, register = false): Promise<Account> {
    const data = await authPost(register ? 'register' : 'login', { email, password });
    if (!data) throw new Error('Respuesta de autenticación vacía.');
    return accept(data);
}
export async function restoreSession(force = false): Promise<Account | null> {
    if (!force && account && expiresAt > Date.now() + 30_000) return account;
    if (pending) return pending;
    const refresh = async () => {
        try { const data = await authPost('refresh'); return data ? accept(data) : null; }
        catch (error) {
            if (error instanceof HttpError && error.status === 401) { accessToken = ''; expiresAt = 0; account = null; return null; }
            throw error;
        }
    };
    // Serialize cookie rotation across tabs as well as within this page.
    pending = (navigator.locks ? navigator.locks.request('hotelya-refresh', refresh) : refresh()).finally(() => { pending = null; });
    return pending;
}
export async function signOut(): Promise<void> {
    const logout = async () => {
        await authPost('logout'); accessToken = ''; expiresAt = 0; account = null; channel?.postMessage('logout');
    };
    if (navigator.locks) await navigator.locks.request('hotelya-refresh', logout);
    else { if (pending) await pending; await logout(); }
}
export async function ownerFetch(path: string, init: RequestInit = {}): Promise<Response> {
    if (!await restoreSession()) throw new HttpError(401, 'Inicia sesión para continuar.');
    const perform = () => raw(path, { ...init, headers: { ...Object.fromEntries(new Headers(init.headers)), Authorization: `Bearer ${accessToken}` } });
    let response = await perform();
    if (response.status === 401 && await restoreSession(true)) response = await perform();
    if (!response.ok) throw await responseError(response);
    return response;
}
export async function initAuthHeader(): Promise<void> {
    localStorage.removeItem('isLoggedIn'); localStorage.removeItem('userEmail');
    const button = document.getElementById('loginBtnTrigger');
    button?.addEventListener('click', () => { window.location.href = appPath(account ? ownerPages.dashboard.path : 'acceder.html'); });
    try {
        const user = await restoreSession();
        const label = document.getElementById('authButtonLabel');
        if (label) label.textContent = user ? 'Mi panel' : 'Acceder';
        button?.setAttribute('aria-label', user ? 'Mi panel' : 'Acceder');
        const name = document.getElementById('userNameDisplay');
        if (name) name.textContent = user?.email ?? 'Invitado';
        document.getElementById('userProfileBtn')?.classList.toggle('active', Boolean(user));
    } catch { /* The public catalog remains usable when authentication is unavailable. */ }
}
