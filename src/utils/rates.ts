import type { RateInfo } from '../types/catalog';
export function formatMoney(amount: number, currency: string): string {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(amount);
}
export function rateModeLabel(rate: RateInfo): string {
    return rate.mode === 'HOUR' ? 'Por hora' : rate.mode === 'NIGHT' ? 'Por noche' : `Paquete de ${rate.packageHours} horas`;
}
export function stayDuration(rate: RateInfo, quantity: number): string {
    if (rate.mode === 'HOUR') return `${quantity} ${quantity === 1 ? 'hora' : 'horas'}`;
    if (rate.mode === 'NIGHT') return `${quantity} ${quantity === 1 ? 'noche' : 'noches'}`;
    return `${quantity} ${quantity === 1 ? 'paquete' : 'paquetes'} de ${rate.packageHours} horas (${quantity * rate.packageHours!} horas en total)`;
}
export function rateLabel(rate: RateInfo): string {
    const money = (value: number | null): string => value === null ? 'Por confirmar' : new Intl.NumberFormat('es-PE', {
        style: 'currency', currency: rate.currency,
    }).format(value);
    if (rate.mode === 'HOUR') return `${money(rate.amount)} por hora`;
    if (rate.mode === 'PACKAGE') return `${money(rate.amount)} por paquete de ${rate.packageHours} horas${rate.additionalHourAmount === null ? '' : ` · Hora adicional: ${money(rate.additionalHourAmount)}`}`;
    return `${money(rate.amount)} por noche`;
}
