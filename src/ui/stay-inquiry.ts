import type { HotelDetail, RateInfo, RoomTypeDetail } from '../types/catalog';
import { formatMoney, rateLabel, rateModeLabel, stayDuration } from '../utils/rates';
import { element } from './dom';

export function createStayInquiry(hotel: HotelDetail): { dialog: HTMLDialogElement; open: (room: RoomTypeDetail, rate?: RateInfo) => void } {
    const dialog = element('dialog', 'stay-inquiry');
    dialog.setAttribute('aria-labelledby', 'inquiry-title');
    const header = element('div', 'inquiry-header');
    const heading = element('div');
    heading.append(element('p', 'inquiry-eyebrow', hotel.name), element('h2', '', 'Consulta tu estadía'));
    heading.querySelector('h2')!.id = 'inquiry-title';
    const close = element('button', 'inquiry-close', '×');
    close.type = 'button'; close.setAttribute('aria-label', 'Cerrar consulta');
    close.addEventListener('click', () => dialog.close());
    header.append(heading, close);
    const body = element('div', 'inquiry-body');
    dialog.append(header, body);
    dialog.addEventListener('click', event => {
        const bounds = dialog.getBoundingClientRect();
        if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
    dialog.addEventListener('close', () => document.body.classList.remove('inquiry-open'));

    function open(room: RoomTypeDetail, initialRate?: RateInfo): void {
        const form = element('form', 'inquiry-form');
        const roomName = element('h3', 'inquiry-room-name', room.name);
        const fields = element('div', 'inquiry-fields');
        const modeField = element('div');
        const modeLabel = element('label', '', 'Modalidad'); modeLabel.htmlFor = 'inquiry-rate';
        const mode = element('select', 'form-select'); mode.id = 'inquiry-rate';
        room.rates.forEach((rate, index) => {
            const option = element('option', '', `${rateModeLabel(rate)} · ${formatMoney(rate.amount, rate.currency)}`);
            option.value = String(index); mode.append(option);
        });
        mode.value = String(Math.max(0, room.rates.indexOf(initialRate ?? room.rates[0]!)));
        modeField.append(modeLabel, mode);
        const quantityField = element('div');
        const quantityLabel = element('label'); quantityLabel.htmlFor = 'inquiry-quantity';
        const quantity = element('input', 'form-control'); quantity.id = 'inquiry-quantity';
        quantity.type = 'number'; quantity.min = '1'; quantity.step = '1'; quantity.required = true; quantity.value = '1';
        quantityField.append(quantityLabel, quantity);
        if (room.rates.length) fields.append(modeField, quantityField);
        const summary = element('div', 'inquiry-summary'); summary.setAttribute('aria-live', 'polite');
        const actions = element('div', 'inquiry-actions');
        const error = element('p', 'inquiry-contact-note'); error.setAttribute('role', 'status');
        const submit = element('button', 'btn btn-primary', 'Consultar por WhatsApp'); submit.type = 'submit';
        const whatsapp = hotel.phone && /^\+51[0-9]{9}$/.test(hotel.phone) ? hotel.phone.slice(1) : null;
        submit.disabled = !whatsapp;
        if (!whatsapp) error.textContent = 'Este hotel aún no tiene un teléfono y WhatsApp válido configurado para consultas.';
        const selectedRate = () => room.rates[Number(mode.value)];
        function update(): void {
            const rate = selectedRate();
            const count = quantity.valueAsNumber;
            quantityLabel.textContent = rate?.mode === 'HOUR' ? 'Cantidad de horas' : rate?.mode === 'NIGHT' ? 'Cantidad de noches' : 'Cantidad de paquetes';
            summary.replaceChildren();
            if (!rate) { summary.append(element('p', '', 'Consulta las tarifas directamente con el hotel.')); return; }
            summary.append(element('p', 'inquiry-unit-price', rateLabel(rate)));
            if (quantity.validity.valid && Number.isSafeInteger(count) && Number.isFinite(rate.amount * count)) {
                summary.append(element('p', 'inquiry-duration', stayDuration(rate, count)),
                    element('p', 'inquiry-total', `Total de referencia: ${formatMoney(rate.amount * count, rate.currency)}`));
            }
        }
        mode.addEventListener('change', () => { quantity.value = '1'; update(); });
        quantity.addEventListener('input', update);
        form.append(roomName, fields, summary);
        for (const [kind, title] of [['RECOMMENDATION', 'Recomendaciones'], ['PROHIBITION', 'Restricciones']] as const) {
            const details = room.details.filter(detail => detail.kind === kind);
            if (!details.length) continue;
            const section = element('section', 'inquiry-guidance');
            const list = element('ul'); details.forEach(detail => list.append(element('li', '', detail.text)));
            section.append(element('h4', '', title), list); form.append(section);
        }
        if (hotel.checkInOutConditions) {
            const conditions = element('section', 'inquiry-guidance');
            conditions.append(element('h4', '', 'Entrada y salida'), element('p', '', hotel.checkInOutConditions)); form.append(conditions);
        }
        form.append(element('p', 'inquiry-disclaimer', 'El hotel confirmará disponibilidad, condiciones y el importe final por WhatsApp.'));
        actions.append(error, submit); form.append(actions);
        form.addEventListener('submit', event => {
            event.preventDefault();
            if (!whatsapp || !form.reportValidity()) return;
            const rate = selectedRate(); const count = quantity.valueAsNumber;
            if (rate && (!Number.isSafeInteger(count) || count < 1 || !Number.isFinite(rate.amount * count))) return;
            const message = [`Hola, quisiera consultar una estadía en ${hotel.name}.`, `Habitación: ${room.name}.`];
            if (rate) message.push(`Modalidad: ${rateModeLabel(rate)}.`, `Estadía: ${stayDuration(rate, count)}.`,
                `Tarifa: ${rateLabel(rate)}.`, `Total de referencia: ${formatMoney(rate.amount * count, rate.currency)}.`);
            message.push('¿Podrían confirmar disponibilidad y condiciones?');
            const url = new URL(`https://wa.me/${whatsapp}`); url.searchParams.set('text', message.join('\n'));
            window.open(url.href, '_blank', 'noopener,noreferrer');
        });
        update(); body.replaceChildren(form);
        dialog.showModal(); document.body.classList.add('inquiry-open');
        (room.rates.length ? mode : close).focus();
    }
    return { dialog, open };
}
