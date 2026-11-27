import type { RateMode } from "./catalog";

export interface ReservationSlot {
  startsAt: string;
  endsAt: string;
  available: boolean;
}

export interface Availability {
  today: string;
  total: number;
  currency: string;
  slots: ReservationSlot[];
}

export interface Confirmation {
  hotelId: number;
  roomTypeId: number;
  mode: RateMode;
  quantity: number;
  startsAt: string;
  endsAt: string;
  total: number;
  currency: string;
  requestId: string;
}

export interface Reservation {
  code: string;
  hotelId: number;
  hotelName: string;
  roomName: string;
  guestEmail: string;
  mode: RateMode;
  quantity: number;
  startsAt: string;
  endsAt: string;
  currency: string;
  total: number;
  createdAt: string;
  status: "CONFIRMED";
}

export interface ReservationPage {
  items: Reservation[];
  hasMore: boolean;
}
