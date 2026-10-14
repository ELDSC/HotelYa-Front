import { getJson } from './client';
import type { HotelDetail, HotelSummary } from '../types/catalog';
export function getHotels(): Promise<HotelSummary[]> { return getJson('/hotels'); }
export function getHotel(id: string | number): Promise<HotelDetail> {
    return getJson(`/hotels/${encodeURIComponent(id)}`);
}
