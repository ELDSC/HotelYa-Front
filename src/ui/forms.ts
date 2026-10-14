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
export function markSaved(form: HTMLFormElement): void {
    delete form.dataset.dirty;
    form.querySelectorAll('.field-error').forEach(node => node.remove());
    form.querySelectorAll('[aria-invalid]').forEach(node => { node.removeAttribute('aria-invalid'); node.removeAttribute('aria-describedby'); });
}
export function loader(label = 'Cargando'): HTMLElement {
    const node = element('span', 'loading-indicator'); node.setAttribute('role', 'status'); node.setAttribute('aria-label', label);
    node.append(element('span', 'spinner')); return node;
}
export function hasChanges(): boolean { return Boolean(document.querySelector('form[data-dirty="true"]')); }
export function protectChanges(): void {
    window.addEventListener('beforeunload', event => { if (hasChanges()) { event.preventDefault(); event.returnValue = ''; } });
}
export async function busy(button: HTMLButtonElement, task: () => Promise<void>): Promise<void> {
    if (button.disabled) return;
    const children = [...button.childNodes]; const label = element('span', 'button-label'); label.append(...children);
    const indicator = loader(); indicator.setAttribute('aria-hidden', 'true');
    button.replaceChildren(label, indicator); button.disabled = true; button.classList.add('is-loading'); button.setAttribute('aria-busy', 'true');
    const form = button.closest('form');
    if (form) { form.inert = true; form.setAttribute('aria-busy', 'true'); }
    try { await task(); } finally {
        button.disabled = false; button.replaceChildren(...children); button.classList.remove('is-loading'); button.removeAttribute('aria-busy');
        if (form) { form.inert = false; form.removeAttribute('aria-busy'); }
    }
}
