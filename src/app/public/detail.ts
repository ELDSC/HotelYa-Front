import { Component, inject, signal, OnDestroy } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { Title, Meta } from "@angular/platform-browser";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { Api } from "../core/api";
import { Header } from "../shared/header";
import { MediaPreview } from "../shared/media-preview";
import { HotelHero, HotelFooter } from "./hotel-chrome";
import { Inquiry } from "./inquiry";
import { HotelDetail, RoomTypeDetail } from "../../types/catalog";
import { formatMoney, rateModeLabel } from "../../utils/rates";
import { formatPhone } from "../../utils/phone";
@Component({
  imports: [RouterLink, Header, MediaPreview, HotelHero, HotelFooter],
  templateUrl: "./detail.html",
})
export class Detail implements OnDestroy {
  readonly api = inject(Api);
  private route = inject(ActivatedRoute);
  private title = inject(Title);
  private meta = inject(Meta);
  private modal = inject(NgbModal);
  readonly hotel = signal<HotelDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal("");
  readonly preview = !!this.route.snapshot.data["preview"];
  readonly formatMoney = formatMoney;
  readonly rateModeLabel = rateModeLabel;
  readonly formatPhone = formatPhone;
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
  inquire(room: RoomTypeDetail, index = 0) {
    const ref = this.modal.open(Inquiry, {
      centered: true,
      ariaLabelledBy: "inquiry-title",
      windowClass: "hotel-theme",
      modalDialogClass: "stay-inquiry-modal",
    });
    ref.componentInstance.hotel.set(this.hotel());
    ref.componentInstance.room.set(room);
    ref.componentInstance.form.controls.rate.setValue(index);
  }
  ngOnDestroy() {
    ++this.generation;
    this.subscription.unsubscribe();
    this.modal.dismissAll();
  }
}
