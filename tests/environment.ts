import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { validateApiOrigin } from '../src/config/env';

const env = loadEnv('test', fileURLToPath(new URL('../', import.meta.url)), ['VITE_', 'HOTELYA_E2E_']);
export const api = validateApiOrigin(env.VITE_API_BASE_URL);
export const base = env.HOTELYA_E2E_BASE;
if (!base || !/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) {
    throw new Error('HOTELYA_E2E_BASE es obligatorio: debe ser / o una subruta terminada en /.');
}
if (env.HOTELYA_E2E_REUSE_SERVER !== '0' && env.HOTELYA_E2E_REUSE_SERVER !== '1') {
    throw new Error('HOTELYA_E2E_REUSE_SERVER es obligatorio: debe ser 0 o 1.');
}
export const reuse = env.HOTELYA_E2E_REUSE_SERVER === '1';
