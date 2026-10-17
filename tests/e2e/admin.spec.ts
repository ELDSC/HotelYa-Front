import { test, expect, hotel, summary, api } from './fixtures';
import { loadEnv } from 'vite';
const credentials = loadEnv('development', process.cwd(), 'VITE_');

test('admin redirects before requesting any catalog data and prefills its separate login', async ({ page }) => {
    let catalogCalls = 0;
    await page.route(`${api}/api/admin/**`, route => {
        const path = new URL(route.request().url()).pathname;
        if (path.endsWith('/csrf')) return route.fulfill({ json: { token: 'admin-csrf', headerName: 'X-XSRF-TOKEN' } });
        if (path.includes('/hotels')) catalogCalls++;
        return route.fulfill({ status: 401, json: { message: 'Inicia sesión como administrador.', fields: {} } });
    });
    await page.goto('admin/');
    await expect(page).toHaveURL(/\/admin\/acceder\/$/);
    await expect(page.getByLabel('Correo electrónico')).toHaveValue(credentials.VITE_ADMIN_LOGIN_EMAIL!);
    await expect(page.getByLabel('Contraseña')).toHaveValue(credentials.VITE_ADMIN_LOGIN_PASSWORD!);
    expect(catalogCalls).toBe(0);
    await page.screenshot({ path: test.info().outputPath('admin-login.png'), fullPage: true });
});

test('admin list, search, public links and logout use only the authenticated admin API', async ({ page }) => {
    let signedIn = false;
    let logins = 0;
    let detailCalls = 0;
    await page.route(`${api}/api/admin/**`, async route => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path.endsWith('/csrf')) return route.fulfill({ json: { token: 'admin-csrf', headerName: 'X-XSRF-TOKEN' } });
        if (request.method() === 'POST') expect(request.headers()['x-xsrf-token']).toBe('admin-csrf');
        if (path.endsWith('/login')) {
            expect(request.postDataJSON()).toEqual({ email: credentials.VITE_ADMIN_LOGIN_EMAIL, password: credentials.VITE_ADMIN_LOGIN_PASSWORD });
            signedIn = true; logins++;
        }
        if (path.endsWith('/logout')) { signedIn = false; return route.fulfill({ status: 204 }); }
        if (!signedIn) return route.fulfill({ status: 401, json: { message: 'Sin sesión', fields: {} } });
        if (path.includes('/hotels/')) detailCalls++;
        if (path.includes('/hotels')) {
            expect(request.headers().authorization).toBe('Bearer admin-access');
            return route.fulfill({ json: path.endsWith('/hotels') ? [summary] : hotel });
        }
        return route.fulfill({ json: { accessToken: 'admin-access', expiresIn: 900, user: { id: 1, email: credentials.VITE_ADMIN_LOGIN_EMAIL } } });
    });
    await page.goto('admin/acceder/');
    expect(logins).toBe(0);
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/$/);
    await expect(page.locator('#adminShell')).toBeVisible();
    await expect(page.locator('#hotelRows')).toContainText(hotel.name);
    await expect(page.locator('aside, #locationFilter, #refreshButton, #hotelDetail, .admin-stats')).toHaveCount(0);
    const link = page.getByRole('link', { name: `Ver ficha de ${hotel.name}` });
    await expect(link).toHaveAttribute('target', '_blank');
    const popupPromise = page.waitForEvent('popup');
    await link.click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(/hotel-central\.html\?id=1$/);
    await popup.close();
    await page.getByRole('searchbox', { name: 'Buscar hoteles' }).fill('inexistente');
    await expect(page.locator('#hotelRows')).toContainText(hotel.name);
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page.locator('#hotelRows')).toContainText('No se encontraron hoteles.');
    await page.getByRole('searchbox', { name: 'Buscar hoteles' }).fill('');
    await expect(page.locator('#hotelRows')).toContainText('No se encontraron hoteles.');
    await page.getByRole('searchbox', { name: 'Buscar hoteles' }).press('Enter');
    await expect(page.locator('#hotelRows')).toContainText(hotel.name);
    expect(detailCalls).toBe(0);
    await page.reload();
    await expect(page.locator('#hotelRows')).toContainText(hotel.name);
    expect(logins).toBe(1);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)].some(key => /admin|token/i.test(key)))).toBe(false);
    await page.screenshot({ path: test.info().outputPath('admin-panel.png'), fullPage: true });
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/admin\/acceder\/$/);
    await page.goto('admin/');
    await expect(page).toHaveURL(/\/admin\/acceder\/$/);
});

test('admin login preserves inputs and reports a rejected password', async ({ page }) => {
    await page.route(`${api}/api/admin/**`, route => {
        const path = new URL(route.request().url()).pathname;
        if (path.endsWith('/csrf')) return route.fulfill({ json: { token: 'csrf', headerName: 'X-XSRF-TOKEN' } });
        return route.fulfill({ status: 401, json: { message: 'Correo o contraseña incorrectos.', fields: {} } });
    });
    await page.goto('admin/acceder/');
    await page.getByLabel('Contraseña').fill('incorrecta');
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(page.locator('#accessMessage')).toContainText('Correo o contraseña incorrectos.');
    await expect(page.getByLabel('Contraseña')).toHaveValue('incorrecta');
    await expect(page.getByRole('button', { name: 'Ingresar', exact: true })).toBeEnabled();
});

test('admin connection failure keeps the panel hidden and supports retry', async ({ page }) => {
    let failed = true;
    await page.route(`${api}/api/admin/**`, route => {
        if (failed) return route.fulfill({ status: 503, json: { message: 'Sin conexión', fields: {} } });
        const path = new URL(route.request().url()).pathname;
        if (path.endsWith('/csrf')) return route.fulfill({ json: { token: 'csrf', headerName: 'X-XSRF-TOKEN' } });
        return route.fulfill({ status: 401, json: { message: 'Sin sesión', fields: {} } });
    });
    await page.goto('admin/');
    await expect(page.locator('#adminShell')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
    failed = false;
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page).toHaveURL(/\/admin\/acceder\/$/);
});
