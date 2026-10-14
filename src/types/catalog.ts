export interface HotelSummary {
    id: number; name: string; description: string; location: string; logoPath: string | null;
}
export interface HotelDetail extends HotelSummary {
    address: string; phone: string | null; facadePath: string | null; videoPath: string | null;
    latitude: number | null; longitude: number | null;
    openingHours: string | null; checkInOutConditions: string | null;
    mapUrl?: string | null; openingTime?: string | null; closingTime?: string | null;
    hasParking: boolean | null; roomTypes: RoomTypeDetail[]; stayCards: StayCard[];
}
export interface RoomTypeDetail {
    id: number; code: string; name: string; description: string;
    photos: Photo[]; details: RoomDetail[]; rates: RateInfo[]; totalUnits: number | null; availableUnits: number | null;
}
export interface Photo { path: string; altText: string; }
export type DetailKind = 'FEATURE' | 'SERVICE' | 'RECOMMENDATION' | 'PROHIBITION';
export interface RoomDetail { kind: DetailKind; text: string; }
export type RateMode = 'HOUR' | 'PACKAGE' | 'NIGHT';
export interface RateInfo {
    mode: RateMode; amount: number; currency: string; packageHours: number | null;
    additionalHourAmount: number | null; simulated: boolean;
}

export interface StayCard { title: string; description: string }
