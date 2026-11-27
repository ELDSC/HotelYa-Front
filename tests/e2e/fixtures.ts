import { test as base, expect } from '@playwright/test';
import type { HotelDetail, HotelSummary } from '../../src/types/catalog';
import { api } from '../environment';
export { api };
export const hotel: HotelDetail = {
    id: 1, code: "lumis-hotel", name: "Lumi's Hotel", description: 'Hotel de prueba', location: 'Lima',
    address: 'Dirección de prueba', phone: '+51999999999', logoPath: 'assets/images/lumis-hotel-logo.jpg',
    facadePath: 'assets/images/lumis-hotel-fachada.jpg', videoPath: 'assets/videos/lumis-promocional.mp4',
    latitude: null, longitude: null, openingHours: null, checkInOutConditions: null,
    hasParking: null, acceptsReservations: true, nightCheckIn: '14:00', nightCheckOut: '11:00', stayCards: [{ title: 'Una escapada en pareja', description: 'Haz espacio para compartir y descansar.' }],
    roomTypes: ['Temática', 'Matrimonial', 'Premium'].map((name, index) => ({
        id: index + 1, code: name, name, description: 'Descripción de prueba', totalUnits: 3, availableUnits: 1,
        photos: [{ path: `assets/images/lumis-cuarto-${['tematico', 'matrimonial', 'premium'][index]}.jpg`, altText: name }],
        details: [{ kind: 'FEATURE', text: 'Detalle de prueba' }],
        rates: [
            { mode: 'HOUR', amount: 25, currency: 'PEN', packageHours: null, additionalHourAmount: null, simulated: false },
            { mode: 'PACKAGE', amount: 60, currency: 'PEN', packageHours: 3, additionalHourAmount: 20, simulated: false },
            { mode: 'NIGHT', amount: 120, currency: 'PEN', packageHours: null, additionalHourAmount: null, simulated: false },
        ],
    })),
};
export const summary: HotelSummary = hotel;
export const test = base.extend({
    page: async ({ page }, use) => {
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => {
            if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text());
        });
        page.on('response', response => {
            if (response.url().startsWith('http://127.0.0.1:') && !response.url().startsWith(api) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
        });
        page.on('requestfailed', request => {
            if (request.url().startsWith('http://127.0.0.1:') && !request.url().startsWith(api) && request.failure()?.errorText !== 'net::ERR_ABORTED') {
                errors.push(`${request.failure()?.errorText} ${request.url()}`);
            }
        });
        // External fonts and the demo video are unrelated to API/build correctness.
        await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
        await page.route('https://fonts.gstatic.com/**', route => route.abort());
        await page.route('https://commondatastorage.googleapis.com/**', route => route.fulfill({ path: 'public/assets/videos/lumis-promocional.mp4', contentType: 'video/mp4' }));
        await page.route(`${api}/api/hotels`, route => route.fulfill({ json: [summary] }));
        await page.route(`${api}/api/hotels/*`, route => {
            const id = new URL(route.request().url()).pathname.split('/').at(-1);
            return id === '1' ? route.fulfill({ json: hotel }) : route.fulfill({ status: 404, json: {} });
        });
        await page.route(`${api}/api/hotels/1/room-types/*/availability?*`, route => {
            const url = new URL(route.request().url());
            const date = url.searchParams.get('date')!;
            const quantity = Number(url.searchParams.get('quantity'));
            const mode = url.searchParams.get('mode');
            const startsAt = new Date(`${date}T14:00:00-05:00`);
            const duration = quantity * (mode === 'PACKAGE' ? 3 : 1);
            const endsAt = new Date(startsAt.getTime() + duration * 3_600_000);
            return route.fulfill({ json: {
                today: date, total: (mode === 'PACKAGE' ? 60 : 25) * quantity, currency: 'PEN',
                slots: [
                    { startsAt, endsAt, available: true },
                    { startsAt: new Date(startsAt.getTime() + 3_600_000),
                      endsAt: new Date(endsAt.getTime() + 3_600_000), available: false },
                ],
            } });
        });
        await page.route(`${api}/api/owner/hotel/exists`, route => route.fulfill({ json: { hasHotel: false } }));
        await page.route(`${api}/api/auth/csrf`, route => route.fulfill({ json: { token: 'csrf-test', headerName: 'X-XSRF-TOKEN' } }));
        await page.route(`${api}/api/auth/refresh`, route => route.fulfill({ status: 401, json: { message: 'Sin sesión', fields: {} } }));
        await use(page);
        expect(errors).toEqual([]);
    },
});
export { expect };
