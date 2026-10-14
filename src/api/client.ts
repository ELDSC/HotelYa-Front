import { getApiBaseUrl } from '../config/env';

export class HttpError extends Error {
    constructor(public readonly status: number, message?: string, public readonly fields: Record<string, string> = {}) {
        super(message ?? (status === 404 ? 'Hotel no encontrado.' : 'No pudimos cargar los datos.'));
        this.name = 'HttpError';
    }
}
export async function getJson<T>(path: string): Promise<T> {
    const base = getApiBaseUrl();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
        const response = await fetch(`${base}/api${path}`, { signal: controller.signal });
        if (!response.ok) throw new HttpError(response.status);
        return await response.json() as T;
    } finally {
        clearTimeout(timer);
    }
}
