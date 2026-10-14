import type { RateInfo } from '../types/catalog';
export function rateLabel(rate: RateInfo): string {
    const money = (value: number | null): string => value === null ? 'Por confirmar' : new Intl.NumberFormat('es-PE', {
        style: 'currency', currency: rate.currency,
    }).format(value);
    if (rate.mode === 'HOUR') return `${money(rate.amount)} por hora`;
    if (rate.mode === 'PACKAGE') return `${money(rate.amount)} por paquete de ${rate.packageHours} horas${rate.additionalHourAmount === null ? '' : ` · Hora adicional: ${money(rate.additionalHourAmount)}`}`;
    return `${money(rate.amount)} por noche`;
}
