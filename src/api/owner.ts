import { ownerFetch } from '../features/auth';
import type { HotelDetail, RoomDetail, RateMode, StayCard } from '../types/catalog';
export interface OwnerHotel { detail: HotelDetail; published: boolean }
export type HotelWrite = Omit<HotelDetail, 'id' | 'roomTypes' | 'stayCards'>;
export interface RoomRateWrite { mode: RateMode; amount: number; packageHours: number | null }
export interface RoomWrite {
    name: string; description: string; displayOrder: number; totalUnits: number | null; availableUnits: number | null;
    photoScope: string; photos: { path: string }[]; details: RoomDetail[]; rates: RoomRateWrite[];
}
export interface MediaInfo { id: string; path: string; contentType: string; originalName: string; byteSize: number }
async function json<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await ownerFetch(path, { method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
    return response.status === 204 ? undefined as T : await response.json() as T;
}
export const getOwnerHotel = (): Promise<OwnerHotel> => json('/owner/hotel');
export const saveHotel = (body: HotelWrite, create: boolean): Promise<OwnerHotel> => json('/owner/hotel', create ? 'POST' : 'PUT', body);
export const saveRoom = (body: RoomWrite, id?: number): Promise<OwnerHotel> => json(`/owner/hotel/room-types${id === undefined ? '' : `/${id}`}`, id === undefined ? 'POST' : 'PUT', body);
export const deleteRoom = (id: number): Promise<OwnerHotel> => json(`/owner/hotel/room-types/${id}`, 'DELETE');
export const setPublication = (published: boolean): Promise<OwnerHotel> => json('/owner/hotel/publication', 'PUT', { published });
export const saveCards = (cards: StayCard[]): Promise<OwnerHotel> => json('/owner/hotel/stay-cards', 'PUT', cards);
export const deleteMedia = (id: string): Promise<void> => json(`/owner/media/${id}`, 'DELETE');
export async function uploadMedia(file: File, roomScope?: string): Promise<MediaInfo> {
    const body = new FormData(); body.set('file', file); if (roomScope) body.set('roomScope', roomScope);
    return await (await ownerFetch('/owner/media', { method: 'POST', body })).json() as MediaInfo;
}
export async function mediaPreview(path: string): Promise<string> {
    const response = await ownerFetch(`/owner/media/${encodeURIComponent(path.slice('/api/media/'.length))}`);
    return URL.createObjectURL(await response.blob());
}
