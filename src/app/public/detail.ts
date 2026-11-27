import { Component, inject, signal, OnDestroy } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Title, Meta } from "@angular/platform-browser";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { Api } from "../core/api";
import { Header } from "../shared/header";
import { MediaPreview } from "../shared/media-preview";
import { HotelHero, HotelFooter } from "./hotel-chrome";
import { Booking, BookingDraft, bookingDraftKey } from "./booking";
import { isBookable } from "../../utils/reservations";
import { HotelDetail, RoomTypeDetail } from "../../types/catalog";
import {
  effectiveRateAmount,
  formatMoney,
  rateModeLabel,
} from "../../utils/rates";
import { formatPhone } from "../../utils/phone";
@Component({
  imports: [RouterLink, Header, MediaPreview, HotelHero, HotelFooter],
  templateUrl: "./detail.html",
})
export class Detail implements OnDestroy {
  readonly api = inject(Api);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private title = inject(Title);
  private meta = inject(Meta);
  private modal = inject(NgbModal);
  readonly hotel = signal<HotelDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal("");
  readonly preview = !!this.route.snapshot.data["preview"];
  readonly formatMoney = formatMoney;
  readonly effectiveRateAmount = effectiveRateAmount;
  readonly rateModeLabel = rateModeLabel;
  readonly formatPhone = formatPhone;
  readonly isBookable = isBookable;
  private generation = 0;
  private subscription = this.route.paramMap.subscribe(() => void this.load());
  async load() {
    const generation = ++this.generation;
    this.loading.set(true);
    this.error.set("");
    try {
      const id = this.route.snapshot.paramMap.get("id");
      if (!this.preview && (!id || !/^\d+$/.test(id) || Number(id) < 1))
        throw { status: 404 };
      const hotel = this.preview
        ? (await this.api.ownerHotel())?.detail
        : await this.api.hotel(id!);
      if (!hotel) throw { status: 404 };
      if (generation !== this.generation) return;
      this.hotel.set(hotel);
      if (!this.preview) this.resumeBooking(hotel);
      this.title.setTitle(hotel.name + " | HoteleriasYa");
      this.meta.updateTag({ name: "description", content: hotel.description });
    } catch (e) {
      if (generation === this.generation)
        this.error.set(
          (e as { status: number }).status === 404
            ? "Hotel no encontrado."
            : "No pudimos cargar el hotel. Inténtalo de nuevo.",
        );
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  book(
    hotel: HotelDetail,
    room: RoomTypeDetail,
    mode: RoomTypeDetail["rates"][number]["mode"],
    draft?: BookingDraft,
  ) {
    const rate = room.rates.find((item) => item.mode === mode);
    if (this.preview || !rate || !isBookable(hotel, room, rate)) return;
    const ref = this.modal.open(Booking, {
      centered: true,
      scrollable: true,
      ariaLabelledBy: "booking-title",
      windowClass: "hotel-theme",
      modalDialogClass: "stay-inquiry-modal",
      beforeDismiss: () => !ref.componentInstance.submitting(),
    });
    ref.componentInstance.setup(hotel, room, rate, draft);
  }

  private resumeBooking(hotel: HotelDetail) {
    const roomId = Number(this.route.snapshot.queryParamMap.get("reserva"));
    if (!roomId) return;
    const key = bookingDraftKey(hotel.id);
    const stored = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { reserva: null },
      queryParamsHandling: "merge",
      replaceUrl: true,
    });
    const room = hotel.roomTypes.find((item) => item.id === roomId);
    if (!stored || !room) return;
    try {
      const draft: BookingDraft = JSON.parse(stored);
      if (draft.roomId === roomId) this.book(hotel, room, draft.mode, draft);
    } catch {
      // A stale browser draft can be discarded without affecting the catalog.
    }
  }

  ngOnDestroy() {
    ++this.generation;
    this.subscription.unsubscribe();
    this.modal.dismissAll();
  }
}
