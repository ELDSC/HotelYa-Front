import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  HostListener,
} from "@angular/core";
import { Router, RouterLink, RouterLinkActive } from "@angular/router";
import { MediaPreview } from "./media-preview";
import { Auth } from "../core/auth";
import { Api } from "../core/api";
import { NgbDropdownModule } from "@ng-bootstrap/ng-bootstrap";
import { serverError } from "../core/forms";
@Component({
  selector: "app-header",
  imports: [RouterLink, RouterLinkActive, MediaPreview, NgbDropdownModule],
  templateUrl: "./header.html",
})
export class Header {
  readonly hotel = input<import("../../types/catalog").HotelDetail | null>(
    null,
  );
  readonly preview = input(false);
  readonly solid = input(false);
  readonly hotelHome = computed(() => {
    const hotel = this.hotel();
    if (hotel && !this.preview()) return ["/hoteles", hotel.id];
    return this.solid() ? ["/"] : [];
  });
  readonly auth = inject(Auth);
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  readonly hasHotel = signal<boolean | null>(null);
  readonly profileError = signal("");
  readonly signingOut = signal(false);
  readonly scrolled = signal(false);
  private profileRequest = 0;
  @HostListener("window:scroll") onScroll() {
    this.scrolled.set(window.scrollY > 50);
  }
  constructor() {
    void this.auth.owner.restore().catch(() => null);
    effect(() => {
      const user = this.auth.owner.user();
      this.hasHotel.set(null);
      this.profileError.set("");
      ++this.profileRequest;
      if (user) void this.loadProfile();
    });
  }

  async loadProfile() {
    const request = ++this.profileRequest;
    this.profileError.set("");
    try {
      const hasHotel = await this.api.hasHotel();
      if (request === this.profileRequest) this.hasHotel.set(hasHotel);
    } catch (error) {
      if (request === this.profileRequest)
        this.profileError.set(serverError(error));
    }
  }

  async logout() {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.profileError.set("");
    try {
      await this.auth.owner.signOut();
      this.api.current.set(null);
      await this.router.navigateByUrl("/");
    } catch (error) {
      this.profileError.set(serverError(error));
    } finally {
      this.signingOut.set(false);
    }
  }
}
