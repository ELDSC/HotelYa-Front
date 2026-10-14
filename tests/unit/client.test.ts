import { afterEach, expect, it, vi } from 'vitest';
import { getJson, HttpError } from '../../src/api/client';
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });
it('requests the configured backend and clears its timer on success', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080/');
    vi.useFakeTimers();
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: 1 }])));
    vi.stubGlobal('fetch', fetch);
    await expect(getJson('/hotels')).resolves.toEqual([{ id: 1 }]);
    expect(fetch.mock.calls[0]?.[0]).toBe('http://localhost:8080/api/hotels');
    expect(vi.getTimerCount()).toBe(0);
});
it.each([404, 503])('propagates HTTP %i and clears the timer', async status => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status })));
    const result = getJson('/hotels/1');
    await expect(result).rejects.toBeInstanceOf(HttpError);
    await expect(result).rejects.toHaveProperty('status', status);
    expect(vi.getTimerCount()).toBe(0);
});
it('cancels a pending request after ten seconds and clears the timer', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
        options.signal?.addEventListener('abort', () => reject(new DOMException('Timeout', 'AbortError')));
    })));
    const pending = expect(getJson('/hotels')).rejects.toHaveProperty('name', 'AbortError');
    await vi.advanceTimersByTimeAsync(10_000);
    await pending;
    expect(vi.getTimerCount()).toBe(0);
});
