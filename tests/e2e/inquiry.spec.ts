import { test, expect, hotel, api } from './fixtures';

const room = hotel.roomTypes[0]!;
const recommendations = [
    { kind: 'RECOMMENDATION', text: 'Presenta tu documento al llegar.' },
    { kind: 'PROHIBITION', text: 'No fumar dentro de la habitación.' },
] as const;

test('detail respects missing map, structured hours, and presentation contrast', async ({ page }, testInfo) => {
    await page.route(`${api}/api/hotels/1`, route => route.fulfill({ json: {
        ...hotel, mapUrl: null, latitude: -12.1, longitude: -77.1,
        openingTime: '08:30:00', closingTime: '23:00:00', openingHours: 'Horario anterior',
    } }));
    await page.goto('hotel-central.html?id=1');
    await expect(page.locator('#ubicacion')).toContainText(hotel.address);
    await expect(page.locator('#ubicacion a')).toHaveCount(0);
    await expect(page.locator('#informacion')).toContainText('Horarios: 08:30 a 23:00');
    await expect(page.locator('#informacion')).not.toContainText('Horario anterior');
    await expect(page.locator('#clientes')).toHaveClass(/section-audience/);
    const colors = await page.locator('#clientes .audience-card-desc').evaluate(node => ({
        text: getComputedStyle(node).color, background: getComputedStyle(node.closest('section')!).backgroundColor,
    }));
    expect(colors.text).toBe('rgb(244, 241, 234)');
    expect(colors.background).toBe('rgb(8, 19, 76)');
    await page.locator('#clientes').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('presentation-and-location.png'), fullPage: true });
});

test('configured map uses the exact backend URL and aligns with its heading', async ({ page }) => {
    const mapUrl = 'https://maps.app.goo.gl/hotel-configurado';
    await page.route(`${api}/api/hotels/1`, route => route.fulfill({ json: { ...hotel, mapUrl } }));
    await page.goto('hotel-central.html?id=1');
    const map = page.getByRole('link', { name: 'Ver ubicación en el mapa' });
    await expect(map).toHaveAttribute('href', mapUrl);
    for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        const centers = await page.locator('#ubicacion').evaluate(node => {
            const heading = node.querySelector('h2')!.getBoundingClientRect();
            const button = node.querySelector('a')!.getBoundingClientRect();
            return [heading.x + heading.width / 2, button.x + button.width / 2];
        });
        expect(Math.abs(centers[0]! - centers[1]!)).toBeLessThan(1);
    }
});

test('rate opens recommendations only in a dialog and missing WhatsApp prevents consultation', async ({ page }, testInfo) => {
    await page.route(`${api}/api/hotels/1`, route => route.fulfill({ json: {
        ...hotel, phone: null, roomTypes: [{ ...room, details: [...room.details, ...recommendations] }],
    } }));
    await page.goto('hotel-central.html?id=1');
    await expect(page.getByText(recommendations[0].text)).toHaveCount(0);
    const trigger = page.getByRole('button', { name: /Consultar Temática: Paquete/ });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Consulta tu estadía' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(recommendations[0].text)).toBeVisible();
    await expect(dialog.getByText(recommendations[1].text)).toBeVisible();
    await expect(dialog.getByLabel('Modalidad')).toHaveValue('1');
    await dialog.getByLabel('Cantidad de paquetes').fill('2');
    await expect(dialog.locator('.inquiry-duration')).toHaveText('2 paquetes de 3 horas (6 horas en total)');
    await expect(dialog.locator('.inquiry-total')).toContainText('120.00');
    await expect(dialog.getByRole('button', { name: 'Consultar por WhatsApp' })).toBeDisabled();
    await expect(dialog.getByRole('status')).toContainText('no tiene un teléfono y WhatsApp válido configurado');
    await page.screenshot({ path: testInfo.outputPath('inquiry-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(dialog.getByRole('button', { name: 'Consultar por WhatsApp' })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath('inquiry-mobile.png') });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(page.locator('body')).not.toHaveClass(/inquiry-open/);
    await trigger.click();
    await expect(dialog.getByLabel('Cantidad de paquetes')).toHaveValue('1');
    await dialog.getByRole('button', { name: 'Cerrar consulta' }).click();
    await expect(dialog).not.toBeVisible();
});

test('WhatsApp consultation contains the configured number, selected mode, duration and total', async ({ page, context }) => {
    await context.route('https://wa.me/**', route => route.fulfill({ contentType: 'text/html', body: 'Consulta de prueba' }));
    await page.route(`${api}/api/hotels/1`, route => route.fulfill({ json: {
        ...hotel, phone: '+51912345678', roomTypes: [room],
    } }));
    await page.goto('hotel-central.html?id=1');
    await expect(page.locator('#informacion')).toContainText('Teléfono y WhatsApp: +51 912 345 678');
    await expect(page.locator('#hotelFooterContact a')).toHaveAttribute('href', 'tel:+51912345678');
    await expect(page.locator('#hotelFooterContact a')).toHaveText('+51 912 345 678');
    await page.getByRole('button', { name: /Consultar Temática: Por hora/ }).click();
    const dialog = page.getByRole('dialog');
    for (const [mode, label, quantity, duration, total] of [
        ['0', 'Cantidad de horas', '4', '4 horas', '100.00'],
        ['1', 'Cantidad de paquetes', '2', '2 paquetes de 3 horas (6 horas en total)', '120.00'],
        ['2', 'Cantidad de noches', '3', '3 noches', '360.00'],
    ]) {
        await dialog.getByLabel('Modalidad').selectOption(mode!);
        await dialog.getByLabel(label!).fill(quantity!);
        await expect(dialog.locator('.inquiry-total')).toContainText(total!);
        const opened = context.waitForEvent('page');
        await dialog.getByRole('button', { name: 'Consultar por WhatsApp' }).click();
        const popup = await opened;
        await popup.waitForURL('https://wa.me/**');
        const url = new URL(popup.url());
        expect(url.pathname).toBe('/51912345678');
        expect(url.searchParams.get('text')).toContain(hotel.name);
        expect(url.searchParams.get('text')).toContain('Habitación: Temática');
        expect(url.searchParams.get('text')).toContain(`Estadía: ${duration}`);
        expect(url.searchParams.get('text')).toContain(total);
        await popup.close();
    }
    for (const invalid of ['0', '-1', '1.5', '']) {
        await dialog.getByLabel('Cantidad de noches').fill(invalid);
        await expect(dialog.locator('.inquiry-total')).toHaveCount(0);
        await dialog.getByRole('button', { name: 'Consultar por WhatsApp' }).click();
        expect(context.pages()).toHaveLength(1);
    }
});

test('a room without rates can be consulted without inventing a price or duration', async ({ page }) => {
    await page.route(`${api}/api/hotels/1`, route => route.fulfill({ json: {
        ...hotel, stayCards: [], videoPath: null, roomTypes: [{ ...room, rates: [], details: recommendations }],
    } }));
    await page.goto('hotel-central.html?id=1');
    await expect(page.locator('a[href="#clientes"]:visible, a[href="#video"]:visible')).toHaveCount(0);
    await page.getByRole('button', { name: 'Consultar Temática' }).click();
    await expect(page.getByRole('dialog').getByText(recommendations[0].text)).toBeVisible();
    await expect(page.getByLabel('Modalidad')).toHaveCount(0);
    await expect(page.locator('.inquiry-summary')).toHaveText('Consulta las tarifas directamente con el hotel.');
});
