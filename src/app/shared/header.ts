import {
  Component,
  computed,
  inject,
  input,
  signal,
  HostListener,
} from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { MediaPreview } from "./media-preview";
import { Auth } from "../core/auth";
@Component({
  selector: "app-header",
  imports: [RouterLink, RouterLinkActive, MediaPreview],
  templateUrl: "./header.html",
})
export class Header {
  readonly hotel = input<import("../../types/catalog").HotelDetail | null>(
    null,
  );
  readonly preview = input(false);
  readonly hotelHome = computed(() => {
    const hotel = this.hotel();
    return hotel && !this.preview() ? ["/hoteles", hotel.id] : [];
  });
  readonly auth = inject(Auth);
  readonly scrolled = signal(false);
  @HostListener("window:scroll") onScroll() {
    this.scrolled.set(window.scrollY > 50);
  }
  constructor() {
    void this.auth.owner.restore().catch(() => null);
  }
}
