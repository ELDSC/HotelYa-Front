import type { RateInfo, RateMode } from '../types/catalog';
import type { RoomRateWrite } from '../api/owner';
import { element } from './dom';

const modes: [RateMode, string, string][] = [['HOUR', 'Por hora', 'por hora'], ['PACKAGE', 'Paquete de horas', 'del paquete'], ['NIGHT', 'Por noche', 'por noche']];
export function roomRates(existing: RateInfo[], changed: () => void): { table: HTMLTableElement; value: () => RoomRateWrite[] } {
    const table = element('table', 'rate-table'); const head = element('thead'); const headings = element('tr');
    for (const label of ['Modalidad', 'Activa', 'Precio (S/)', 'Duración (horas)']) { const cell = element('th', '', label); cell.scope = 'col'; headings.append(cell); }
    head.append(headings); const body = element('tbody'); table.append(head, body);
    const rows = modes.map(([mode, label, suffix]) => {
        const initial = existing.find(rate => rate.mode === mode);
        const row = element('tr'); row.dataset.mode = mode;
        const title = element('th', '', label); title.scope = 'row';
        const state = element('td', 'rate-state');
        const active = element('input', 'form-check-input rate-active'); active.type = 'checkbox'; active.checked = Boolean(initial);
        active.setAttribute('role', 'switch'); active.setAttribute('aria-label', `Activar tarifa ${suffix}`); state.append(active);
        const price = element('td', 'rate-value'); price.dataset.label = 'Precio (S/)';
        const amount = element('input', 'form-control'); amount.type = 'number'; amount.min = '0.01'; amount.step = '0.01';
        amount.value = initial ? String(initial.amount) : ''; amount.setAttribute('aria-label', `Precio ${suffix}`); price.append(amount);
        const duration = element('td', mode === 'PACKAGE' ? 'rate-value' : 'rate-value rate-empty'); duration.dataset.label = 'Duración (horas)';
        const hours = element('input', 'form-control'); hours.type = 'number'; hours.min = '1'; hours.step = '1';
        hours.value = String(initial?.packageHours ?? 3); hours.setAttribute('aria-label', 'Duración del paquete');
        if (mode === 'PACKAGE') duration.append(hours); else duration.textContent = '—';
        row.append(title, state, price, duration); body.append(row);
        active.addEventListener('change', () => { sync(); changed(); });
        amount.addEventListener('input', changed); hours.addEventListener('input', changed);
        return { mode, active, amount, hours, row };
    });
    function sync(): void {
        let index = 0;
        for (const item of rows) {
            item.row.classList.toggle('rate-inactive', !item.active.checked);
            item.amount.disabled = !item.active.checked; item.amount.required = item.active.checked;
            item.hours.disabled = !item.active.checked; item.hours.required = item.active.checked && item.mode === 'PACKAGE';
            item.amount.id = `rate-${item.mode}-amount`; item.hours.id = `rate-${item.mode}-hours`;
            item.amount.name = item.active.checked ? `rates.${index}.amount` : `disabled-${item.mode}-amount`; item.hours.name = item.active.checked ? `rates.${index}.packageHours` : `disabled-${item.mode}-hours`;
            if (item.active.checked) index++;
        }
    }
    sync();
    return { table, value: () => rows.filter(item => item.active.checked).map(item => ({
        mode: item.mode, amount: Number(item.amount.value), packageHours: item.mode === 'PACKAGE' ? Number(item.hours.value) : null,
    })) };
}
