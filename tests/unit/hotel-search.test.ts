import { expect, it } from 'vitest';
import { filterHotels } from '../../src/utils/hotel-search';
import type { HotelSummary } from '../../src/types/catalog';

const hotels: HotelSummary[] = [
    { id: 7, code: 'CENTRO-01', name: 'Hotel Céntrico', description: '', location: '', logoPath: null },
    { id: 9, code: 'PLAYA-02', name: 'Hotel del Mar', description: '', location: '', logoPath: null },
    { id: 12, code: 'CENTRO-03', name: 'Hotel Central', description: '', location: '', logoPath: null },
];

it('finds partial names regardless of accents, case and surrounding whitespace', () => {
    expect(filterHotels(hotels, '  CENTRICO  ').map(h => h.id)).toEqual([7]);
    expect(filterHotels(hotels, ' céntr ').map(h => h.id)).toEqual([7, 12]);
});

it('matches either name or the real code with one query', () => {
    expect(filterHotels(hotels, ' centro-0 ').map(h => h.id)).toEqual([7, 12]);
    expect(filterHotels(hotels, '  PLAYA  ').map(h => h.id)).toEqual([9]);
    expect(filterHotels(hotels, 'central').map(h => h.id)).toEqual([12]);
    const shared = [...hotels, { ...hotels[1]!, id: 20, code: 'OTHER', name: 'Hostal Centro-01' }];
    expect(filterHotels(shared, 'CENTRO-01').map(h => h.id)).toEqual([7, 20]);
    expect(filterHotels(hotels, '7')).toEqual([]);
    expect(filterHotels(hotels, 'inexistente')).toEqual([]);
});

it('restores all hotels for a blank query without changing the original order or collection', () => {
    const original = structuredClone(hotels);
    const results = filterHotels(hotels, '   ');
    expect(results).toEqual(hotels);
    expect(results).not.toBe(hotels);
    filterHotels(hotels, 'mar');
    expect(hotels).toEqual(original);
});
