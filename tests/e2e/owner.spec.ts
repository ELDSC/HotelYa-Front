import { test, expect } from '@playwright/test';

const backend = 'http://127.0.0.1:8081';

test('login shows a centered spinner without resizing and preserves inputs on failure', async ({ page }, testInfo) => {
    await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
    await page.goto('acceder.html');
    await expect(page.locator('.access-header .owner-brand')).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(page.locator('.back-link')).toHaveCSS('color', 'rgb(83, 99, 93)');
    await page.screenshot({ path: testInfo.outputPath('login-initial.png'), fullPage: true });
    await page.getByLabel('Correo electrónico').fill('invalid@example.com');
    await page.getByLabel('Contraseña *', { exact: true }).fill('wrong-password');
    const submit = page.locator('#accessSubmit');
    const before = await submit.boundingBox();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route(`${backend}/api/auth/login`, async route => {
        await gate;
        await route.fulfill({ status: 401, json: { message: 'Correo o contraseña incorrectos.', fields: {} } });
    });
    await submit.click();
    await expect(submit).toHaveAttribute('aria-busy', 'true');
    await expect(submit.locator('.spinner')).toBeVisible();
    expect(await submit.boundingBox()).toEqual(before);
    await expect(submit.locator('.button-label')).toBeHidden();
    await expect(page.getByText('Guardando…')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('login-loading.png'), fullPage: true });
    release();
    await expect(page.getByRole('alert')).toHaveText('Correo o contraseña incorrectos.');
    await expect(submit).toBeEnabled();
    await expect(submit).toHaveText('Ingresar al panel');
    await expect(page.getByLabel('Correo electrónico')).toHaveValue('invalid@example.com');
    await expect(page.getByLabel('Contraseña *', { exact: true })).toHaveValue('wrong-password');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('login.png'), fullPage: true });
});
