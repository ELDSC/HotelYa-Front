import { Component, inject, input, signal, HostListener } from "@angular/core";
import { RouterLink } from "@angular/router";
import { MediaPreview } from "./media-preview";
import { Auth } from "../core/auth";
@Component({
  selector: "app-header",
  imports: [RouterLink, MediaPreview],
  templateUrl: "./header.html",
})
export class Header {
  readonly hotel = input<import("../../types/catalog").HotelDetail | null>(
    null,
  );
  readonly preview = input(false);
  readonly auth = inject(Auth);
  readonly scrolled = signal(false);
  @HostListener("window:scroll") onScroll() {
    this.scrolled.set(window.scrollY > 50);
  }
  constructor() {
    void this.auth.owner.restore().catch(() => null);
  }
}
