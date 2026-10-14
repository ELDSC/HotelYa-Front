export const phonePrefix = '+51';

export function phoneDigits(value: string): string {
    return value.replace(/[^0-9]/g, '');
}

export function groupPhoneDigits(value: string): string {
    return phoneDigits(value).match(/.{1,3}/g)?.join(' ') ?? '';
}

export function nationalPhone(value: string | null | undefined): string {
    return value?.startsWith(phonePrefix) ? value.slice(phonePrefix.length) : value ?? '';
}

export function formatPhone(value: string | null): string {
    if (!value) return '';
    if (!value.startsWith(phonePrefix)) return value;
    return `${phonePrefix} ${groupPhoneDigits(nationalPhone(value))}`;
}

export function phoneValue(value: string): string | null {
    const digits = phoneDigits(value);
    return digits ? `${phonePrefix}${digits}` : null;
}
