import { afterEach, describe, expect, it, vi } from 'vitest';
afterEach(() => vi.unstubAllEnvs());
import { asset } from '../../src/utils/assets';
describe('catalog media', () => {
    it.each(['/', '/hotelya/'])('resolves stable API paths under %s', base => {
        for (const path of ['assets/images/lumis-hotel-logo.jpg', '/assets/videos/lumis-promocional.mp4']) {
            expect(asset(path, base, 'https://example.com/hotelya/hotel-central.html?id=1'))
                .toBe(`https://example.com${base}${path.replace(/^\//, '')}`);
        }
    });
    it.each([null, 1, '', 'https://evil.example/assets/images/a.jpg', '//evil.example/a.jpg',
        'assets/images/../../.env', 'assets/images/../a.jpg', 'assets/images/%2e%2e/a.jpg',
        'assets/images/a.jpg?url=1', 'assets/images/a.jpg#x', 'assets/images/', 'assets/images/a\\b.jpg',
        '/src/assets/a.jpg', 'assets/images//a.jpg', 'assets/images/\n../x.js'])('rejects %s', path => {
        expect(asset(path, '/', 'https://example.com/index.html')).toBeNull();
    });
});

it('resolves uploaded media only against the configured backend origin', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8080');
    expect(asset('/api/media/12345678-1234-1234-1234-123456789abc', '/hotelya/', 'https://example.com/hotelya/index.html'))
        .toBe('http://127.0.0.1:8080/api/media/12345678-1234-1234-1234-123456789abc');
    for (const path of ['/api/media/1-1-1-1-1', '/api/media/../../.env', '/api/media/12345678-1234-1234-1234-123456789abc?token=x']) {
        expect(asset(path, '/', 'https://example.com/index.html')).toBeNull();
    }
});
