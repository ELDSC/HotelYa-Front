import { defineConfig, loadEnv } from 'vite';
import { validateApiOrigin } from './src/config/env.ts';

export default defineConfig(({ mode, isPreview }) => {
    if (!isPreview) {
        const env = loadEnv(mode, process.cwd(), 'VITE_');
        validateApiOrigin(env.VITE_API_BASE_URL);
        if (!env.VITE_OWNER_LOGIN_EMAIL?.trim() || !env.VITE_OWNER_LOGIN_PASSWORD) {
            throw new Error('Configura VITE_OWNER_LOGIN_EMAIL y VITE_OWNER_LOGIN_PASSWORD; son valores públicos del formulario de dueños.');
        }
        if (!env.VITE_ADMIN_LOGIN_EMAIL?.trim() || !env.VITE_ADMIN_LOGIN_PASSWORD) {
            throw new Error('Configura VITE_ADMIN_LOGIN_EMAIL y VITE_ADMIN_LOGIN_PASSWORD; son valores públicos del formulario administrativo.');
        }
    }
    return {
        appType: 'mpa',
        input: ['index.html', 'hotel-central.html', 'acceder.html', 'admin/index.html', 'admin/acceder/index.html', 'panel/index.html', 'panel/informacion/index.html', 'panel/habitaciones/index.html', 'panel/multimedia/index.html'],
        server: { host: '127.0.0.1', port: 5173, strictPort: true },
        preview: { host: '127.0.0.1', port: 4173, strictPort: true },
        build: { outDir: 'dist' },
    };
});
