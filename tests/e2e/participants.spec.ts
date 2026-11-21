import { readFile } from 'node:fs/promises';
import { test, expect } from './fixtures';

test('Participantes está en el menú y el carrusel manual tiene tres fotos', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Productos', exact: true })).toHaveAttribute('href', '#productos');
    await page.getByRole('link', { name: 'Participantes', exact: true }).click();
    await expect(page).toHaveURL(/\/sobre_nosotros_participantes\.html$/);
    await expect(page.getByRole('heading', { name: 'Participantes de HotelYa', exact: true })).toBeVisible();

    const gallery = page.getByRole('group', { name: 'Galería del equipo' });
    const slides = gallery.locator('figure');
    const org = page.getByRole('region', { name: 'Mapa organizacional' });
    expect(await org.evaluate(section => parseFloat(getComputedStyle(section).paddingBlockStart))).toBeGreaterThan(0);
    await expect(slides).toHaveCount(3);
    await expect(gallery.locator('figure.active img')).toHaveJSProperty('complete', true);
    expect(await gallery.locator('figure.active img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(gallery.getByRole('button', { name: 'Imagen 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await gallery.getByRole('button', { name: 'Imagen siguiente' }).click();
    await expect(gallery.locator('figure.active')).toHaveText('Josué Sarango');
    const third = gallery.getByRole('button', { name: 'Imagen 3', exact: true });
    await expect(third).toBeVisible();
    expect(await third.evaluate(dot => getComputedStyle(dot, '::before').borderTopStyle)).toBe('solid');
    await third.focus();
    await page.keyboard.press('Enter');
    await expect(gallery.locator('figure.active')).toHaveText('Jessus Hemir Chu Díaz');
    await gallery.getByRole('button', { name: 'Imagen siguiente' }).click();
    await expect(gallery.locator('figure.active')).toHaveText('Álvaro Ramírez');
    await gallery.getByRole('button', { name: 'Imagen anterior' }).click();
    await expect(gallery.locator('figure.active')).toHaveText('Jessus Hemir Chu Díaz');

    const footer = page.getByRole('contentinfo');
    await expect(footer.getByRole('heading', { name: 'Contacto', exact: true })).toBeVisible();
    await footer.getByRole('link', { name: 'Productos', exact: true }).click();
    await expect(page).toHaveURL(/\/index\.html#productos$/);
});

test('el organigrama, el dueño referencial y los CV del equipo se muestran en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./');
    await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Productos', exact: true })).toHaveAttribute('href', '#productos');
    await page.getByRole('link', { name: 'Participantes', exact: true }).click();
    await expect(page).toHaveURL(/\/sobre_nosotros_participantes\.html$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    const org = page.getByRole('region', { name: 'Mapa organizacional' });
    await expect(org.getByRole('group', { name: 'Coordinación' })).toContainText('Álvaro Ramírez');
    await expect(org.getByRole('list', { name: 'Encargados e integrantes' })).toContainText('Josué Sarango');
    const christianName = 'Christian Hernán Villanueva Álvarez';
    await expect(org.getByRole('heading', { name: christianName })).toBeVisible();
    await expect(page.getByText(/Andrés Pisfil|Andres Pisfil/i)).toHaveCount(0);

    const institution = page.getByRole('region', { name: 'El hotel y el proyecto' });
    await expect(institution.getByRole('heading', { name: 'Dueño del hotel' })).toBeVisible();
    await expect(institution.getByText('Mateo Vargas')).toBeVisible();
    await expect(institution.getByRole('heading', { name: 'Finalidad' })).toBeVisible();
    await expect(institution.getByRole('heading', { name: 'Agradecimiento del hotel' })).toBeVisible();

    const developers = page.getByRole('region', { name: 'Desarrolladores Full Stack' });
    const josue = developers.getByRole('article').filter({ hasText: 'Josué Sarango' });
    const trigger = josue.getByRole('button', { name: 'Ver CV de Josué Sarango' });
    const portrait = josue.locator('img');
    await portrait.scrollIntoViewIfNeeded();
    const bounds = await portrait.boundingBox();
    if (!bounds) throw new Error('Falta el retrato del desarrollador.');
    await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    const dialog = page.getByRole('dialog', { name: 'Josué Sarango' });
    await expect(dialog.getByRole('heading', { name: 'Habilidades blandas' })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Certificaciones y capacitación' })).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Abrir PDF completo' })).toHaveAttribute('href', /drive\.google\.com\/file\/d\//);
    await expect(dialog.getByRole('link', { name: 'Descargar CV' })).toHaveAttribute('href', /[?&]export=download/);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    const alvaro = org.getByRole('button', { name: 'Ver CV de Álvaro Ramírez' });
    await alvaro.focus();
    await page.keyboard.press('Enter');
    const other = page.getByRole('dialog', { name: 'Álvaro Ramírez' });
    await expect(other.getByRole('heading', { name: 'Lenguajes de programación' })).toBeVisible();
    await other.getByRole('button', { name: 'Cerrar perfil' }).click();
    await expect(other).toBeHidden();
    const christian = developers.getByRole('article').filter({ hasText: christianName });
    await expect(christian).toContainText('Maquetación web y diseño adaptable.');
    const rafael = developers.getByRole('article').filter({
        has: page.getByRole('heading', { name: 'Rafael Palomino', exact: true }),
    });
    await expect.poll(async () => {
        const photo = christian.locator('img');
        await photo.scrollIntoViewIfNeeded();
        return photo.evaluate(image => (image as HTMLImageElement).naturalWidth);
    }).toBeGreaterThan(0);
    const download = await rafael.getByRole('link', { name: 'Descargar CV de Rafael Palomino' }).getAttribute('href');
    if (!download) throw new Error('Falta el enlace al CV de Rafael.');
    await expect(christian.getByRole('link', { name: 'Descargar CV de Rafael Palomino' })).toHaveAttribute('href', download);
    await christian.getByRole('button', { name: 'Ver CV de Rafael Palomino' }).click();
    const christianProfile = page.getByRole('dialog', { name: christianName });
    await expect(christianProfile.getByRole('link', { name: 'Abrir CV de Rafael Palomino' })).toBeVisible();
});

test('el CV adjunto de Jessus se puede abrir y descargar como PDF', async ({ page }) => {
    await page.goto('sobre_nosotros_participantes.html');
    const developers = page.getByRole('region', { name: 'Desarrolladores Full Stack' });
    await expect(developers.getByRole('link', { name: /Descargar CV de/ })).toHaveCount(5);
    await developers.getByRole('button', { name: 'Ver CV de Jessus Hemir Chu Díaz' }).click();
    const dialog = page.getByRole('dialog', { name: 'Jessus Hemir Chu Díaz' });
    const view = dialog.getByRole('link', { name: 'Abrir PDF completo' });
    const href = await view.getAttribute('href');
    if (!href) throw new Error('Falta el enlace al PDF.');
    const response = await page.request.get(new URL(href, page.url()).href);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('application/pdf');
    expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');

    const [downloaded] = await Promise.all([
        page.waitForEvent('download'),
        dialog.getByRole('link', { name: 'Descargar CV' }).click(),
    ]);
    expect(downloaded.suggestedFilename()).toBe('jessus-chu.pdf');
    expect(await readFile(await downloaded.path())).toEqual(await response.body());
});
