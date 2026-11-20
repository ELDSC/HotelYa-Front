import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { validateApiOrigin } from './src/config/env.ts';

export default defineConfig(({ mode, isPreview }) => {
    if (!isPreview) validateApiOrigin(loadEnv(mode, process.cwd(), 'VITE_').VITE_API_BASE_URL);
    return {
        plugins: [{
            name: 'hotelya-site-footer',
            transformIndexHtml: {
                order: 'pre',
                handler(html) {
                    const marker = '    <!-- HotelYa site footer -->';
                    if (!html.includes(marker)) return html;
                    const footer = readFileSync(fileURLToPath(new URL('./src/ui/site-footer.html', import.meta.url)), 'utf-8');
                    return html.replace(marker, () => footer.trimEnd());
                },
            },
        }],
        appType: 'mpa',
        input: ['index.html', 'nosotros.html', 'hotel-central.html', 'acceder.html', 'panel/index.html', 'panel/informacion/index.html', 'panel/habitaciones/index.html', 'panel/multimedia/index.html'],
        server: { host: '127.0.0.1', port: 5173, strictPort: true },
        preview: { host: '127.0.0.1', port: 4173, strictPort: true },
        build: { outDir: 'dist' },
    };
});
