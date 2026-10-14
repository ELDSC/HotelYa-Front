import { expect, it } from 'vitest';
import { formatPhone, groupPhoneDigits, nationalPhone, phoneValue } from '../../src/utils/phone';

it('groups partial and complete national numbers in blocks of three', () => {
    expect(['9', '98', '987', '9876', '987654', '987654321'].map(groupPhoneDigits))
        .toEqual(['9', '98', '987', '987 6', '987 654', '987 654 321']);
    expect(groupPhoneDigits('17557324')).toBe('175 573 24');
});

it('only emits ASCII digits in the national number', () => {
    expect(groupPhoneDigits('9a8b7-654.321')).toBe('987 654 321');
    expect(groupPhoneDigits('abc !')).toBe('');
});

it('keeps the prefix separate from the national number and compact on submission', () => {
    expect(nationalPhone('+51987654321')).toBe('987654321');
    expect(phoneValue('987 654 321')).toBe('+51987654321');
    expect(formatPhone('+51987654321')).toBe('+51 987 654 321');
    expect(formatPhone('+5117557324')).toBe('+51 175 573 24');
});

it('never fills an absent contact number with a default', () => {
    expect(nationalPhone(null)).toBe('');
    expect(formatPhone(null)).toBe('');
    expect(phoneValue('')).toBeNull();
    expect(phoneValue('   ')).toBeNull();
});
