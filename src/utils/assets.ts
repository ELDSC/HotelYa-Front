export function asset(path: unknown, base = import.meta.env.BASE_URL, pageUrl = window.location.href): string | null {
    if (typeof path !== 'string' || !/^\/?assets\/(images|videos)\/[^?#%\\]+$/.test(path)) return null;
    if ([...path].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return null;
    const relative = path.replace(/^\//, '');
    if (relative.split('/').some(segment => !segment || segment === '.' || segment === '..')) return null;
    try {
        const root = new URL(base, pageUrl);
        const url = new URL(relative, root);
        return url.origin === root.origin && ['images', 'videos'].some(dir => url.pathname.startsWith(`${root.pathname}assets/${dir}/`)) ? url.href : null;
    } catch { return null; }
}
