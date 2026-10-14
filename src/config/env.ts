export function validateApiOrigin(value: string | undefined): string {
    const message = 'VITE_API_BASE_URL debe ser un origen HTTP(S), sin credenciales, rutas, query ni fragmento.';
    if (!value || !/^https?:\/\/[^/?#\\@\s]+\/?$/i.test(value)) throw new Error(message);
    let url: URL;
    try { url = new URL(value); } catch { throw new Error(message); }
    if (!/^https?:$/.test(url.protocol) || !url.hostname || url.username || url.password
        || url.pathname !== '/' || value.includes('?') || value.includes('#') || value.includes('\\')) {
        throw new Error(message);
    }
    return url.origin;
}
export function getApiBaseUrl(): string {
    return validateApiOrigin(import.meta.env.VITE_API_BASE_URL);
}
