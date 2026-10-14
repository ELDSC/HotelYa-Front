import { element } from './dom';
import { groupPhoneDigits, nationalPhone, phoneDigits, phonePrefix } from '../utils/phone';

export function phoneField(value: string | null | undefined): HTMLElement {
    const wrapper = element('div', 'form-field');
    const label = element('label', '', 'Teléfono y WhatsApp'); label.htmlFor = 'hotel-phone';
    const control = element('div', 'phone-control');
    const prefix = element('span', 'phone-prefix', phonePrefix); prefix.id = 'hotel-phone-prefix';
    const input = element('input'); input.id = 'hotel-phone'; input.name = 'phone';
    input.type = 'tel'; input.inputMode = 'numeric'; input.autocomplete = 'tel-national';
    input.pattern = '[0-9]{3} [0-9]{3} [0-9]{3}'; input.maxLength = 11;
    input.title = 'Ingresa un celular de exactamente 9 dígitos, sin el prefijo +51.';
    input.setAttribute('aria-describedby', 'hotel-phone-prefix hotel-phone-hint');
    input.value = groupPhoneDigits(nationalPhone(value));
    const hint = element('span', 'muted', 'Celular de 9 dígitos. Se utilizará para llamadas y consultas por WhatsApp.'); hint.id = 'hotel-phone-hint';
    function format(): void {
        const position = input.selectionStart ?? input.value.length;
        const digitPosition = phoneDigits(input.value.slice(0, position)).length;
        input.value = groupPhoneDigits(input.value);
        let cursor = 0; let count = 0;
        while (cursor < input.value.length && count < digitPosition) {
            if (/[0-9]/.test(input.value[cursor]!)) count++;
            cursor++;
        }
        input.setSelectionRange(cursor, cursor);
    }
    input.addEventListener('input', format);
    input.addEventListener('beforeinput', event => {
        if (event.data && /[^0-9]/.test(event.data) && event.inputType === 'insertText') { event.preventDefault(); return; }
        const start = input.selectionStart ?? 0;
        if (start !== input.selectionEnd) return;
        if (event.inputType === 'deleteContentBackward' && input.value[start - 1] === ' ') {
            event.preventDefault(); input.setRangeText('', start - 2, start, 'start');
            input.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (event.inputType === 'deleteContentForward' && input.value[start] === ' ') {
            event.preventDefault(); input.setRangeText('', start, start + 2, 'start');
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });
    input.addEventListener('paste', event => {
        const text = event.clipboardData?.getData('text');
        if (text === undefined) return;
        event.preventDefault();
        const digits = phoneDigits(nationalPhone(text.trim()));
        input.setRangeText(digits, input.selectionStart ?? 0, input.selectionEnd ?? input.value.length, 'end');
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    control.append(prefix, input); wrapper.append(label, control, hint); return wrapper;
}
