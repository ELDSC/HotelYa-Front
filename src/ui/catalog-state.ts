import { element } from './dom';
export function state(container: HTMLElement, text: string, retry?: () => Promise<void>, isError = false): void {
    const panel = element('div', 'catalog-state');
    panel.setAttribute('role', isError ? 'alert' : 'status');
    panel.append(element('p', '', text));
    if (retry) {
        const button = element('button', 'btn btn-primary btn-sm', 'Reintentar');
        button.type = 'button';
        button.addEventListener('click', () => { void retry(); });
        panel.append(button);
    }
    container.replaceChildren(panel);
}
