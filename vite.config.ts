import { defineConfig, loadEnv } from 'vite';
import { validateApiOrigin } from './src/config/env.ts';

export default defineConfig(({ mode, isPreview }) => {
    if (!isPreview) validateApiOrigin(loadEnv(mode, process.cwd(), 'VITE_').VITE_API_BASE_URL);
    return {
        appType: 'mpa',
        input: ['index.html', 'hotel-central.html', 'acceder.html'],
        server: { host: '127.0.0.1', port: 5173, strictPort: true },
        preview: { host: '127.0.0.1', port: 4173, strictPort: true },
        build: { outDir: 'dist' },
    };
});
