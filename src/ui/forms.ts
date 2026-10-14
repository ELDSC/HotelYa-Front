import { HttpError } from '../api/client';
import { element } from './dom';
export function notify(target: HTMLElement, message: string, error = false): void {
    target.textContent = message; target.className = error ? 'notice error' : 'notice success';
    target.setAttribute('role', error ? 'alert' : 'status');
}
export function showFailure(form: HTMLFormElement | HTMLElement, target: HTMLElement, error: unknown): void {
    form.querySelectorAll('.field-error').forEach(node => node.remove());
    form.querySelectorAll('[aria-invalid]').forEach(node => { node.removeAttribute('aria-invalid'); node.removeAttribute('aria-describedby'); });
    notify(target, error instanceof HttpError ? error.message : 'No pudimos conectar con el servidor. Conservamos tus cambios para que puedas reintentar.', true);
    if (error instanceof HttpError) {
        for (const [name, message] of Object.entries(error.fields)) {
            const input = [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[name]')].find(node => node.name === name);
            if (!input) { const hint = element('p', '', message); target.append(hint); continue; }
            input.setAttribute('aria-invalid', 'true');
            const hint = element('span', 'field-error', message); hint.id = `${input.id}-error`;
            input.setAttribute('aria-describedby', hint.id); input.parentElement?.append(hint);
        }
        form.querySelector<HTMLElement>('[aria-invalid]')?.focus();
    }
}
export function watchForm(form: HTMLFormElement): void {
    const dirty = () => { form.dataset.dirty = 'true'; };
    form.addEventListener('input', dirty); form.addEventListener('change', dirty);
}
export function markDirty(form: HTMLFormElement): void { form.dataset.dirty = 'true'; }
export function markSaved(form: HTMLFormElement): void { delete form.dataset.dirty; }
export function hasChanges(): boolean { return Boolean(document.querySelector('form[data-dirty="true"]')); }
export function protectChanges(): void {
    window.addEventListener('beforeunload', event => { if (hasChanges()) { event.preventDefault(); event.returnValue = ''; } });
}
export async function busy(button: HTMLButtonElement, task: () => Promise<void>): Promise<void> {
    const label = button.textContent; button.disabled = true; button.textContent = 'Guardando…';
    const form = button.closest('form');
    if (form) { form.inert = true; form.setAttribute('aria-busy', 'true'); }
    try { await task(); } finally { button.disabled = false; button.textContent = label; if (form) { form.inert = false; form.removeAttribute('aria-busy'); } }
}
