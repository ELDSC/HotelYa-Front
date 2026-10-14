import { describe, expect, it } from 'vitest';
import { validateApiOrigin } from '../../src/config/env';
describe('API origin', () => {
    it.each(['http://localhost:8080', 'https://api.example.com/'])('normalizes %s', value => {
        expect(validateApiOrigin(value)).toBe(new URL(value).origin);
    });
    it.each([undefined, '', ' /api ', '/api', 'ftp://api.example.com', 'https://user:pass@example.com',
        'https://example.com/api', 'https://example.com?', 'https://example.com#', 'http://localhost:8080/a/..'])('rejects %s', value => {
        expect(() => validateApiOrigin(value)).toThrow('VITE_API_BASE_URL');
    });
});
