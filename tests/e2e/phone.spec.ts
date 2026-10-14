import type { HotelDetail } from '../../src/types/catalog';
import { test, expect, hotel, api } from './fixtures';

test('one shared contact has a fixed prefix, numeric input, grouping and compact persistence', async ({ page }, testInfo) => {
    let saved: HotelDetail = { ...hotel, phone: null };
    const writes: Record<string, unknown>[] = [];
    await page.route(`${api}/api/auth/refresh`, route => route.fulfill({ json: {
        accessToken: 'phone-test', expiresIn: 3600, user: { id: 1, email: 'owner@example.com' },
    } }));
    await page.route(`${api}/api/owner/hotel`, route => {
        if (route.request().method() === 'PUT') {
            const body = route.request().postDataJSON() as Record<string, unknown>; writes.push(body);
            saved = { ...saved, phone: body.phone as string | null };
        }
        return route.fulfill({ json: { detail: saved, published: false } });
    });
    await page.goto('panel/informacion/');
    const input = page.getByRole('textbox', { name: 'Teléfono y WhatsApp', exact: true });
    const save = page.locator('#section-hotel').getByRole('button', { name: 'Guardar cambios', exact: true });
    await expect(input).toHaveValue('');
    await expect(page.locator('#hotel-phone-prefix')).toHaveText('+51');
    await expect(page.locator('input[name="whatsapp"]')).toHaveCount(0);
    await expect(input).toHaveAttribute('inputmode', 'numeric');
    await input.pressSequentially('abc9876');
    await expect(input).toHaveValue('987 6');
    expect(await input.evaluate(node => (node as HTMLInputElement).validity.valid)).toBe(false);
    await save.click(); expect(writes).toHaveLength(0);
    await input.pressSequentially('54def321');
    await expect(input).toHaveValue('987 654 321');
    expect(await input.evaluate(node => (node as HTMLInputElement).validity.valid)).toBe(true);
    // Backspace at a separator deletes a digit, rather than getting stuck on a space.
    await input.evaluate(node => (node as HTMLInputElement).setSelectionRange(4, 4));
    await input.press('Backspace');
    await expect(input).toHaveValue('986 543 21');
    expect(await input.evaluate(node => (node as HTMLInputElement).selectionStart)).toBe(2);
    await input.pressSequentially('7');
    await expect(input).toHaveValue('987 654 321');
    await save.click();
    await expect(save).toBeDisabled();
    expect(writes.at(-1)?.phone).toBe('+51987654321');
    expect(writes.at(-1)).not.toHaveProperty('whatsapp');
    await page.reload();
    await expect(input).toHaveValue('987 654 321');
    await expect(save).toBeDisabled();
    for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await input.scrollIntoViewIfNeeded();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: testInfo.outputPath(`phone-${width}.png`) });
    }
    // Pasting a complete international number keeps +51 exactly once.
    await input.selectText();
    await input.evaluate(node => {
        const clipboardData = new DataTransfer(); clipboardData.setData('text', '+51 912 345 678');
        node.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
    });
    await expect(input).toHaveValue('912 345 678');
    await save.click();
    await expect(save).toBeDisabled();
    expect(writes.at(-1)?.phone).toBe('+51912345678');
    await input.fill('17557324');
    await expect(input).toHaveValue('175 573 24');
    expect(await input.evaluate(node => (node as HTMLInputElement).validity.valid)).toBe(false);
    const beforeInvalid = writes.length;
    await save.click();
    expect(writes).toHaveLength(beforeInvalid);
    expect(writes.at(-1)?.phone).toBe('+51912345678');
    await input.fill(''); await input.press('Home'); await input.press('Backspace');
    await expect(page.locator('#hotel-phone-prefix')).toHaveText('+51');
    await expect(input).toHaveValue('');
    await save.click();
    await expect(save).toBeDisabled();
    expect(writes.at(-1)?.phone).toBeNull();
});
