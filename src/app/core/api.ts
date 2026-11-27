import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { APP_CONFIG } from "./config";
import { asset } from "../../utils/assets";
import type { ReportPeriod, ReservationReport } from "../../types/reports";
import type {
  Availability,
  Confirmation,
  Reservation,
  ReservationPage,
} from "../../types/reservations";
import type {
  HotelDetail,
  HotelSummary,
  HotelReview,
  HotelReviewPage,
  RoomDetail,
  RateMode,
  StayCard,
} from "../../types/catalog";
export interface OwnerHotel {
  detail: HotelDetail;
  published: boolean;
}
export type HotelWrite = Omit<
  HotelDetail,
  "id" | "code" | "roomTypes" | "stayCards" | "acceptsReservations"
>;
export interface RoomWrite {
  name: string;
  description: string;
  displayOrder: number;
  totalUnits: number | null;
  availableUnits: number | null;
  photoScope: string;
  photos: { path: string }[];
  details: RoomDetail[];
  rateDiscounts?: Partial<Record<RateMode, number>>;
  rates: { mode: RateMode; amount: number; packageHours: number | null }[];
}
export interface MediaInfo {
  id: string;
  path: string;
  contentType: string;
  originalName: string;
  byteSize: number;
}
@Injectable({ providedIn: "root" })
export class Api {
  private http = inject(HttpClient);
  readonly config = inject(APP_CONFIG);
  readonly current = signal<OwnerHotel | null>(null);
  private url(path: string) {
    return this.config.API_BASE_URL + "/api" + path;
  }
  hotels() {
    return firstValueFrom(
      this.http.get<HotelSummary[]>(this.url("/hotels"), { timeout: 10000 }),
    );
  }
  hotel(id: string) {
    return firstValueFrom(
      this.http.get<HotelDetail>(this.url("/hotels/" + id), { timeout: 10000 }),
    );
  }
  hotelReviews(id: number, before: string | null = null) {
    return firstValueFrom(
      this.http.get<HotelReviewPage>(this.url(`/hotels/${id}/reviews`), {
        params: before ? { before } : {},
        timeout: 10000,
      }),
    );
  }
  hotelReviewStatus(id: number) {
    return firstValueFrom(
      this.http.get<{ reviewed: boolean }>(
        this.url(`/hotels/${id}/reviews/me`),
        { timeout: 10000 },
      ),
    );
  }
  publishHotelReview(id: number, roomTypeId: number, comment: string) {
    return firstValueFrom(
      this.http.post<HotelReview>(
        this.url(`/hotels/${id}/reviews`),
        {
          roomTypeId,
          comment,
        },
        { timeout: 10000 },
      ),
    );
  }
  adminHotels() {
    return firstValueFrom(
      this.http.get<HotelSummary[]>(this.url("/admin/hotels"), {
        timeout: 30000,
      }),
    );
  }
  availability(
    hotelId: number,
    roomTypeId: number,
    mode: RateMode,
    quantity: number,
    date: string,
  ) {
    return firstValueFrom(
      this.http.get<Availability>(
        this.url(`/hotels/${hotelId}/room-types/${roomTypeId}/availability`),
        {
          params: { mode, quantity, date },
          timeout: 10000,
        },
      ),
    );
  }
  confirmReservation(body: Confirmation) {
    return firstValueFrom(
      this.http.post<Reservation>(this.url("/reservations"), body, {
        timeout: 15000,
      }),
    );
  }
  reservations(page: number, owner = false) {
    return firstValueFrom(
      this.http.get<ReservationPage>(
        this.url(owner ? "/owner/hotel/reservations" : "/reservations"),
        {
          params: { page },
          timeout: 10000,
        },
      ),
    );
  }
  reservationReport(period: ReportPeriod) {
    return firstValueFrom(
      this.http.get<ReservationReport>(
        this.url("/owner/hotel/reservations/report"),
        { params: { ...period }, timeout: 15000 },
      ),
    );
  }
  reservationExcel(period: ReportPeriod) {
    return firstValueFrom(
      this.http.get(this.url("/owner/hotel/reservations/export.xlsx"), {
        params: { ...period },
        responseType: "blob",
        timeout: 60000,
      }),
    );
  }
  receipt(code: string) {
    return firstValueFrom(
      this.http.get<Reservation>(
        this.url(`/reservations/${encodeURIComponent(code)}`),
        { timeout: 10000 },
      ),
    );
  }
  async hasHotel() {
    const result = await firstValueFrom(
      this.http.get<{ hasHotel: boolean }>(this.url("/owner/hotel/exists"), {
        timeout: 10000,
      }),
    );
    return result.hasHotel;
  }
  async ownerHotel() {
    try {
      const data = await firstValueFrom(
        this.http.get<OwnerHotel>(this.url("/owner/hotel"), { timeout: 30000 }),
      );
      this.current.set(data);
      return data;
    } catch (e) {
      if ((e as { status: number }).status === 404) {
        this.current.set(null);
        return null;
      }
      throw e;
    }
  }
  async write(path: string, method: string, body?: unknown) {
    const data = await firstValueFrom(
      this.http.request<OwnerHotel>(method, this.url("/owner/hotel" + path), {
        body,
        timeout: 30000,
      }),
    );
    this.current.set(data);
    return data;
  }
  saveHotel(body: HotelWrite, create = false) {
    return this.write("", create ? "POST" : "PUT", body);
  }
  saveRoom(body: RoomWrite, id?: number) {
    return this.write(
      "/room-types" + (id === undefined ? "" : "/" + id),
      id === undefined ? "POST" : "PUT",
      body,
    );
  }
  deleteRoom(id: number) {
    return this.write("/room-types/" + id, "DELETE");
  }
  publish(published: boolean) {
    return this.write("/publication", "PUT", { published });
  }
  cards(cards: StayCard[]) {
    return this.write("/stay-cards", "PUT", cards);
  }
  upload(file: File, scope?: string) {
    const body = new FormData();
    body.set("file", file);
    if (scope) body.set("roomScope", scope);
    return firstValueFrom(
      this.http.post<MediaInfo>(this.url("/owner/media"), body, {
        timeout: 120000,
      }),
    );
  }
  deleteMedia(path: string) {
    return firstValueFrom(
      this.http.delete<void>(
        this.url(
          "/owner/media/" + encodeURIComponent(path.replace("/api/media/", "")),
        ),
        { timeout: 30000 },
      ),
    );
  }
  blob(path: string) {
    return firstValueFrom(
      this.http.get(
        this.url(
          "/owner/media/" + encodeURIComponent(path.replace("/api/media/", "")),
        ),
        { responseType: "blob", timeout: 30000 },
      ),
    );
  }
  asset(path: unknown): string | null {
    return asset(
      path,
      new URL(document.baseURI).pathname,
      document.baseURI,
      this.config.API_BASE_URL,
    );
  }
}
