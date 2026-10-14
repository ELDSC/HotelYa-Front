import type { Page } from '@playwright/test';
import { test, expect, hotel, api } from './fixtures';

const account = { accessToken: 'panel-pages-test', expiresIn: 3600, user: { id: 1, email: 'owner@example.com' } };
const pages = [
    { path: 'panel/', key: 'dashboard', title: hotel.name },
    { path: 'panel/informacion/', key: 'hotel', title: 'Información' },
    { path: 'panel/habitaciones/', key: 'rooms', title: 'Habitaciones' },
    { path: 'panel/multimedia/', key: 'media', title: 'Multimedia' },
];

async function follow(page: Page, key: string): Promise<void> {
    if (await page.locator('#sidebarToggle').isVisible()) await page.locator('#sidebarToggle').click();
    await page.locator(`#panelNav a[data-section="${key}"]`).click();
    await expect(page.locator('#panelContent')).toHaveAttribute('aria-busy', 'false');
}

test.beforeEach(async ({ page }) => {
    await page.route(`${api}/api/auth/refresh`, route => route.fulfill({ json: account }));
    await page.route(`${api}/api/owner/hotel`, route => route.fulfill({ json: { detail: hotel, published: false } }));
});

for (const width of [1440, 390]) {
    test(`panel has independent pages, reload and browser history at ${width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        for (const entry of pages) {
            await page.goto(entry.path);
            await expect(page.locator('#hotelHeading')).toHaveText(entry.title);
            await expect(page).toHaveTitle(`${entry.title} | HoteleriasYa`);
            await expect(page.locator('#panelContent > section')).toHaveCount(1);
            await expect(page.locator(`#section-${entry.key}`)).toBeVisible();
            await expect(page.locator('#panelNav [aria-current="page"]')).toHaveAttribute('href', new RegExp(`${entry.path}$`));
            const appRoot = `${testInfo.project.use.baseURL!.replace(/\/$/, '')}/`;
            await expect(page.locator('#publicHotelLink')).toHaveJSProperty('href', new URL('hotel-central.html?id=1&preview=1', appRoot).href);
            await expect(page.locator('.owner-brand')).toHaveAttribute('href', new URL('index.html', appRoot).pathname);
            await expect(page.locator('#panelNav a')).toHaveCount(4);
            await expect(page.locator('#panelNav button')).toHaveCount(0);
            await page.reload();
            await expect(page).toHaveURL(new RegExp(`${entry.path}$`));
            await expect(page.locator(`#section-${entry.key}`)).toBeVisible();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        }
        await follow(page, 'rooms');
        await expect(page).toHaveURL(/panel\/habitaciones\/$/);
        await page.evaluate(() => { document.body.dataset.previousDocument = 'rooms'; });
        await follow(page, 'hotel');
        await expect(page).toHaveURL(/panel\/informacion\/$/);
        expect(await page.locator('body').getAttribute('data-previous-document')).toBeNull();
        await expect(page.getByRole('form', { name: 'Presentación', exact: true })).toBeVisible();
        await page.goBack();
        await expect(page).toHaveURL(/panel\/habitaciones\/$/);
        await expect(page.locator('#section-rooms')).toBeVisible();
        await page.goForward();
        await expect(page).toHaveURL(/panel\/informacion\/$/);
        await expect(page.locator('#section-hotel')).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`information-${width}.png`), fullPage: true });
        if (width === 390) await page.locator('#sidebarToggle').click();
        await page.locator('.owner-brand').click();
        await expect(page).toHaveURL(/index.html$/);
        await expect(page.locator('#authButtonLabel')).toHaveText('Mi panel');
        await page.locator('#loginBtnTrigger').click();
        await expect(page).toHaveURL(/panel\/$/);
        await expect(page.locator('#section-dashboard')).toBeVisible();
    });
}

test('navigation protects unsaved information before leaving its page', async ({ page }) => {
    await page.goto('panel/informacion/');
    await page.getByLabel('Nombre del hotel *', { exact: true }).fill('Edición pendiente');
    page.once('dialog', dialog => { expect(dialog.type()).toBe('beforeunload'); void dialog.dismiss(); });
    await page.getByRole('link', { name: 'Habitaciones', exact: true }).click();
    await expect(page).toHaveURL(/panel\/informacion\/$/);
    await expect(page.getByLabel('Nombre del hotel *', { exact: true })).toHaveValue('Edición pendiente');
    page.once('dialog', dialog => { void dialog.accept(); });
    await page.getByRole('link', { name: 'Habitaciones', exact: true }).click();
    await expect(page).toHaveURL(/panel\/habitaciones\/$/);
    await expect(page.locator('#section-rooms')).toBeVisible();
});

test('a new owner is sent to Information to create the hotel', async ({ page }) => {
    await page.route(`${api}/api/owner/hotel`, route => route.fulfill({ status: 404, json: {} }));
    await page.goto('panel/habitaciones/');
    await expect(page).toHaveURL(/panel\/informacion\/$/);
    await expect(page.getByRole('button', { name: 'Crear mi hotel en borrador' })).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/panel\/informacion\/$/);
    await expect(page.getByRole('button', { name: 'Crear mi hotel en borrador' })).toBeVisible();
});

test('login returns to the requested page and rejects external destinations', async ({ page }) => {
    let authenticated = false;
    await page.route(`${api}/api/auth/refresh`, route => authenticated
        ? route.fulfill({ json: account }) : route.fulfill({ status: 401, json: {} }));
    await page.route(`${api}/api/auth/login`, route => { authenticated = true; return route.fulfill({ json: account }); });
    await page.route(`${api}/api/auth/logout`, route => { authenticated = false; return route.fulfill({ status: 204 }); });
    await page.goto('panel/multimedia/');
    await expect(page).toHaveURL(/acceder.html\?next=panel%2Fmultimedia%2F$/);
    await page.getByLabel('Correo electrónico').fill('owner@example.com');
    await page.getByLabel('Contraseña *', { exact: true }).fill('password123');
    await page.getByRole('button', { name: 'Ingresar al panel' }).click();
    await expect(page).toHaveURL(/panel\/multimedia\/$/);
    await expect(page.locator('#section-media')).toBeVisible();
    await page.goto('acceder.html?next=https://example.com/');
    await expect(page).toHaveURL(/panel\/$/);
    await expect(page.locator('#section-dashboard')).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await expect(page).toHaveURL(/acceder.html$/);
});
