import { test, expect, summary, api } from './fixtures';

const hotels = [
    { ...summary, id: 7, code: 'CENTRO-01', name: 'Hotel Céntrico' },
    { ...summary, id: 9, code: 'PLAYA-02', name: 'Hotel del Mar' },
    { ...summary, id: 12, code: 'CENTRO-03', name: 'Hotel Central' },
];

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    test(`static and dynamic hotel search at ${viewport.width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize(viewport);
        let requests = 0;
        await page.route(`${api}/api/hotels`, route => {
            requests++;
            return route.fulfill({ json: hotels });
        });
        await page.goto('./');
        const cards = page.locator('.hotel-card');
        const section = page.locator('#productos');
        const query = section.getByRole('searchbox', { name: 'Nombre o código del hotel', exact: true });
        await expect(section.getByRole('searchbox')).toHaveCount(1);
        const search = section.getByRole('button', { name: 'Buscar', exact: true });
        const clear = section.getByRole('button', { name: 'Limpiar', exact: true });
        await expect(cards).toHaveCount(3);
        await expect(page.locator('.hotel-code').first()).toHaveText('Código: CENTRO-01');
        await expect(page.locator('#catalogResultCount')).toHaveText('3 hoteles encontrados');
        await expect(section.getByRole('tab', { name: 'Estática', exact: true })).toHaveAttribute('aria-selected', 'true');

        await query.fill('  CENTRICO  ');
        await expect(cards).toHaveCount(3);
        await search.click();
        await expect(cards).toHaveCount(1);
        await expect(page.locator('.hotel-name')).toHaveText('Hotel Céntrico');
        await query.fill('inexistente');
        await expect(cards).toHaveCount(1);
        await query.press('Enter');
        await expect(cards).toHaveCount(0);
        await expect(section).toContainText('No encontramos hoteles con esos criterios');
        await expect(page.locator('#catalogResultCount')).toContainText('0 hoteles encontrados');
        await clear.click();
        await expect(query).toHaveValue('');
        await expect(cards).toHaveCount(3);

        await query.fill('  centro-0  ');
        await search.click();
        await expect(cards).toHaveCount(2);
        await query.fill('central');
        await expect(cards).toHaveCount(2);
        await section.getByRole('tab', { name: 'Dinámica', exact: true }).click();
        await expect(search).toBeHidden();
        await expect(cards).toHaveCount(1);
        await expect(page.locator('.hotel-name')).toHaveText('Hotel Central');
        await query.fill('cen');
        await expect(cards).toHaveCount(2);
        await query.fill('  centro-03  ');
        await expect(cards).toHaveCount(1);
        await clear.click();
        await expect(cards).toHaveCount(3);
        await expect(section.getByRole('tab', { name: 'Dinámica', exact: true })).toHaveAttribute('aria-selected', 'true');
        await query.fill('mar');
        await expect(cards).toHaveCount(1);
        await section.getByRole('tab', { name: 'Estática', exact: true }).click();
        await expect(query).toHaveValue('mar');
        await query.fill('central');
        await expect(page.locator('.hotel-name')).toHaveText('Hotel del Mar');
        await query.press('Enter');
        await expect(page.locator('.hotel-name')).toHaveText('Hotel Central');
        await clear.click();
        await search.click();
        await expect(cards).toHaveCount(3);
        await expect(cards.first().getByRole('link', { name: 'Ver hotel' })).toHaveAttribute('href', 'hotel-central.html?id=7');

        const staticTab = section.getByRole('tab', { name: 'Estática', exact: true });
        const dynamicTab = section.getByRole('tab', { name: 'Dinámica', exact: true });
        await staticTab.focus();
        await page.keyboard.press('ArrowRight');
        await expect(dynamicTab).toBeFocused();
        await expect(dynamicTab).toHaveAttribute('aria-selected', 'true');
        await page.keyboard.press('Home');
        await expect(staticTab).toBeFocused();
        await page.keyboard.press('End');
        await expect(dynamicTab).toBeFocused();
        await page.keyboard.press('ArrowLeft');
        await expect(staticTab).toBeFocused();
        await expect(staticTab).toHaveAttribute('tabindex', '0');
        await expect(dynamicTab).toHaveAttribute('tabindex', '-1');
        expect(requests).toBe(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await section.screenshot({ path: testInfo.outputPath(`catalog-search-${viewport.width}.png`) });
    });
}
