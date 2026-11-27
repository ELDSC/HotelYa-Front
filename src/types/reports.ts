import type { RateMode } from "./catalog";

export interface ReportPeriod {
  from: string;
  to: string;
}

export interface ReservationReport extends ReportPeriod {
  hotelName: string;
  total: number;
  byDate: { date: string; count: number }[];
  byHour: { hour: number; count: number }[];
  byWeekday: { weekday: number; count: number }[];
  byRoom: { roomTypeId: number; name: string; count: number }[];
  byMode: { mode: RateMode; count: number }[];
}
