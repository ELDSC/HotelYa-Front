import { test, expect, hotel, summary, api } from './fixtures';

test('catalog, detail, stable media, prices, return, and mobile layout', async ({ page }, testInfo) => {
    const dataRequests: string[] = [];
    page.on('request', request => { if (request.resourceType() === 'fetch' && request.url().startsWith(`${api}/api/hotels`)) dataRequests.push(request.url()); });
    await page.goto('./');
    await expect(page.locator('.hotel-card')).toHaveCount(1);
    await expect(page.locator('.hotel-name')).toHaveText(hotel.name);
    await page.screenshot({ path: testInfo.outputPath('home-desktop.png'), fullPage: true });
    await page.getByRole('link', { name: 'Ver hotel', exact: true }).click();
    await expect(page).toHaveURL(/hotel-central.html\?id=1$/);
    await expect(page.locator('.editorial-room-card')).toHaveCount(3);
    await expect(page.locator('.catalog-rates li')).toHaveCount(9);
    await expect(page.locator('.catalog-rates').first()).toContainText('60.00 por paquete de 3 horas');
    await expect(page.locator('#informacion')).toContainText('Estacionamiento: Por confirmar');
    await expect(page.locator('video')).toHaveAttribute('src', /assets\/videos\/lumis-promocional.mp4$/);
    await page.locator('#productos').scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator('main img').evaluateAll(nodes => nodes.every(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('detail-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('detail-mobile.png'), fullPage: true });
    await page.getByRole('link', { name: 'Volver a HoteleriasYa', exact: true }).first().click();
    await expect(page.locator('.hotel-card')).toHaveCount(1);
    expect(dataRequests.every(url => url.startsWith(`${api}/api/hotels`))).toBe(true);
});

test('direct and legacy detail entries only request the needed data', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', request => { if (request.resourceType() === 'fetch' && request.url().startsWith(`${api}/api/hotels`)) requests.push(request.url()); });
    await page.goto('hotel-central.html?id=1');
    await expect(page.locator('.editorial-room-card')).toHaveCount(3);
    expect(requests).toEqual([`${api}/api/hotels/1`]);
    await page.goto('hotel-central.html');
    await expect(page.locator('.editorial-room-card')).toHaveCount(3);
    expect(requests.slice(1)).toEqual([`${api}/api/hotels`, `${api}/api/hotels/1`]);
});

test('invalid id and missing hotel', async ({ page }) => {
    for (const id of ['invalid', '0', '99999999']) {
        await page.goto(`hotel-central.html?id=${id}`);
        await expect(page.getByRole('alert')).toContainText('Hotel no encontrado.');
    }
});

test('loading, empty list and legacy empty detail', async ({ page }) => {
    let release: () => void = () => {};
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route(`${api}/api/hotels`, async route => { await gate; await route.fulfill({ json: [] }); });
    await page.goto('./');
    await expect(page.getByRole('status')).toContainText('Cargando hoteles');
    await expect(page.locator('#hotelListContainer')).toHaveAttribute('aria-busy', 'true');
    release();
    await expect(page.getByRole('status')).toContainText('No hay hoteles registrados.');
    await expect(page.locator('#hotelListContainer')).toHaveAttribute('aria-busy', 'false');
    await page.goto('hotel-central.html');
    await expect(page.getByRole('status')).toContainText('No hay hoteles registrados.');
});

test('list and detail errors can be retried', async ({ page }) => {
    let failing = true;
    await page.route(`${api}/api/hotels`, route => failing ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: [summary] }));
    await page.goto('./');
    await expect(page.getByRole('alert')).toContainText('No pudimos cargar los hoteles.');
    failing = false;
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.locator('.hotel-card')).toHaveCount(1);
    failing = true;
    await page.route(`${api}/api/hotels/1`, route => failing ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: hotel }));
    await page.goto('hotel-central.html?id=1');
    await expect(page.getByRole('alert')).toContainText('No pudimos cargar el hotel.');
    failing = false;
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.locator('.editorial-room-card')).toHaveCount(3);
});

test('API text is literal and external media is rejected', async ({ page }) => {
    const attack = '<img src=x onerror="alert(1)">';
    await page.route(`${api}/api/hotels`, route => route.fulfill({ json: [{ ...summary, name: attack, logoPath: 'https://evil.example/a.jpg' }] }));
    await page.goto('./');
    await expect(page.locator('.hotel-name')).toHaveText(attack);
    await expect(page.locator('.hotel-card img, .hotel-card [onerror]')).toHaveCount(0);
    await page.route(`${api}/api/hotels/1`, route => route.fulfill({ json: { ...hotel, description: attack } }));
    await page.goto('hotel-central.html?id=1');
    await expect(page.locator('#informacion .editorial-paragraph')).toHaveText(attack);
    await expect(page.locator('#hotelDetailContainer [onerror]')).toHaveCount(0);
});

test('carousel, scroll header and video controls', async ({ page }) => {
    await page.goto('./');
    await page.locator('#carouselNextBtn').click();
    await expect(page.locator('.carousel-slide').nth(1)).toHaveClass(/active/);
    await page.locator('#carouselPrevBtn').click();
    await expect(page.locator('.carousel-slide').first()).toHaveClass(/active/);
    await page.locator('.carousel-dot').nth(2).click();
    await expect(page.locator('.carousel-slide').nth(2)).toHaveClass(/active/);
    await page.locator('#video').scrollIntoViewIfNeeded();
    await expect(page.locator('#mainHeader')).toHaveClass(/scrolled/);
    await page.locator('#customPlayBtn').click();
    await expect(page.locator('#videoOverlay')).toHaveClass(/hidden/);
    await page.locator('#hotelVideo').evaluate(node => (node as HTMLVideoElement).pause());
    await expect(page.locator('#videoOverlay')).not.toHaveClass(/hidden/);
});

test('Acceder opens the dedicated owner access page and ignores the old demo session', async ({ page }) => {
    await page.goto('./');
    await page.evaluate(() => { localStorage.setItem('isLoggedIn', 'true'); localStorage.setItem('userEmail', 'demo@example.com'); });
    await page.reload();
    await expect(page.locator('#authButtonLabel')).toHaveText('Acceder');
    await page.locator('#loginBtnTrigger').click();
    await expect(page).toHaveURL(/acceder.html$/);
    await expect(page.locator('#accessForm')).toBeVisible();
    await page.locator('#registerTab').click();
    await expect(page.locator('#confirmationField')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('isLoggedIn'))).toBeNull();
});
