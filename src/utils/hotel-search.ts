import type { HotelSummary } from '../types/catalog';

function normalizeName(value: string): string {
    return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function filterHotels(hotels: readonly HotelSummary[], query: string): HotelSummary[] {
    const name = normalizeName(query);
    const code = query.trim().toLowerCase();
    return hotels.filter(hotel => normalizeName(hotel.name).includes(name)
        || hotel.code.toLowerCase().includes(code));
}
