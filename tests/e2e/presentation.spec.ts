import { test, expect, hotel, api } from './fixtures';
import type { StayCard } from '../../src/types/catalog';

test('presentation belongs to Information and saves compact cards independently', async ({ page }, testInfo) => {
    let saved: StayCard[] = [
        { title: 'Una escapada en pareja', description: 'Haz espacio para compartir y descansar.' },
        { title: 'Descansa a tu ritmo', description: 'Encuentra el espacio ideal para desconectar.' },
    ];
    let failSave = false;
    const writes: StayCard[][] = [];
    const owner = () => ({ detail: { ...hotel, stayCards: saved }, published: false });
    await page.route(`${api}/api/auth/refresh`, route => route.fulfill({ json: {
        accessToken: 'presentation-test', expiresIn: 3600, user: { id: 1, email: 'owner@example.com' },
    } }));
    await page.route(`${api}/api/owner/hotel`, route => {
        expect(route.request().method()).toBe('GET');
        return route.fulfill({ json: owner() });
    });
    await page.route(`${api}/api/owner/hotel/stay-cards`, route => {
        expect(route.request().method()).toBe('PUT');
        const body = route.request().postDataJSON() as StayCard[]; writes.push(body);
        if (failSave) return route.fulfill({ status: 503, json: { message: 'No pudimos guardar la presentación.', fields: {} } });
        saved = body; return route.fulfill({ json: owner() });
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('panel/');
    await expect(page.locator('[data-section="content"]')).toHaveCount(0);
    await page.getByRole('link', { name: 'Información', exact: true }).click();
    const form = page.getByRole('form', { name: 'Presentación', exact: true });
    const cards = form.locator('.presentation-card');
    const add = form.getByRole('button', { name: 'Añadir tarjeta' });
    const save = form.getByRole('button', { name: 'Guardar presentación' });
    const informationSave = page.getByRole('button', { name: 'Guardar cambios', exact: true });
    const description = page.locator('#section-hotel').getByLabel('Descripción *', { exact: true });
    await expect(form.getByRole('heading', { name: 'Presentación', exact: true })).toBeVisible();
    await expect(cards).toHaveCount(2);
    await expect(save).toBeDisabled();
    await form.scrollIntoViewIfNeeded();
    let bounds = await cards.evaluateAll(nodes => nodes.map(node => ({ x: node.getBoundingClientRect().x, y: node.getBoundingClientRect().y })));
    expect(bounds[0]!.y).toBe(bounds[1]!.y);
    expect(bounds[1]!.x).toBeGreaterThan(bounds[0]!.x);
    await page.screenshot({ path: testInfo.outputPath('presentation-two-desktop.png'), fullPage: true });

    await add.click();
    await expect(cards).toHaveCount(3);
    await expect(add).toBeHidden();
    await expect(form.locator('.presentation-count')).toHaveText('3 / 3');
    await expect(cards.nth(2).getByLabel('Título *')).toBeFocused();
    await cards.nth(2).getByLabel('Título *').fill('Una visita especial');
    await cards.nth(2).getByLabel('Texto *').fill('Comparte un momento diferente.');
    await cards.nth(2).getByRole('button', { name: 'Mover tarjeta antes', exact: true }).click();
    await expect(cards.nth(1).getByLabel('Título *')).toHaveValue('Una visita especial');
    bounds = await cards.evaluateAll(nodes => nodes.map(node => ({ x: node.getBoundingClientRect().x, y: node.getBoundingClientRect().y })));
    expect(new Set(bounds.map(box => box.y)).size).toBe(1);
    expect(bounds[2]!.x).toBeGreaterThan(bounds[1]!.x);
    await page.screenshot({ path: testInfo.outputPath('presentation-three-desktop.png'), fullPage: true });

    await description.fill('Edición de la ficha pendiente.');
    failSave = true;
    await save.click();
    await expect(form.getByRole('alert')).toHaveText('No pudimos guardar la presentación.');
    await expect(cards.nth(1).getByLabel('Título *')).toHaveValue('Una visita especial');
    await expect(save).toBeEnabled();
    failSave = false;
    await save.click();
    await expect(page.locator('#ownerToastMessage')).toHaveText('Presentación guardada.');
    await expect(save).toBeDisabled();
    await expect(informationSave).toBeEnabled();
    await expect(description).toHaveValue('Edición de la ficha pendiente.');
    expect(writes.at(-1)?.map(card => card.title)).toEqual(['Una escapada en pareja', 'Una visita especial', 'Descansa a tu ritmo']);
    await description.fill(hotel.description);

    for (const width of [1024, 390]) {
        await page.setViewportSize({ width, height: 844 });
        await form.scrollIntoViewIfNeeded();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (width === 390) {
            bounds = await cards.evaluateAll(nodes => nodes.map(node => ({ x: node.getBoundingClientRect().x, y: node.getBoundingClientRect().y })));
            expect(new Set(bounds.map(box => box.x)).size).toBe(1);
            expect(bounds[1]!.y).toBeGreaterThan(bounds[0]!.y);
            expect(bounds[2]!.y).toBeGreaterThan(bounds[1]!.y);
        }
        await page.screenshot({ path: testInfo.outputPath(`presentation-${width}.png`), fullPage: true });
    }
    await cards.nth(2).getByRole('button', { name: 'Quitar tarjeta' }).click();
    await expect(add).toBeVisible();
    await save.click();
    await expect(save).toBeDisabled();
    await page.reload();
    await expect(page).toHaveURL(/panel\/informacion\/$/);
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(1).getByLabel('Título *')).toHaveValue('Una visita especial');
    await expect(save).toBeDisabled();
});
