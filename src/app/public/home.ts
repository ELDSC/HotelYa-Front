import {
  Component,
  computed,
  inject,
  signal,
  viewChild,
  ElementRef,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { NgbCarouselModule } from "@ng-bootstrap/ng-bootstrap";
import { Api } from "../core/api";
import { Header } from "../shared/header";
import { SiteFooter } from "../shared/site-footer";
import { HotelCard } from "./hotel-card";
import { filterHotels } from "../../utils/hotel-search";
import type { HotelSummary } from "../../types/catalog";
@Component({
  imports: [
    Header,
    SiteFooter,
    HotelCard,
    ReactiveFormsModule,
    NgbCarouselModule,
  ],
  templateUrl: "./home.html",
  styleUrl: "./home.scss",
})
export class Home {
  private readonly video =
    viewChild<ElementRef<HTMLVideoElement>>("hotelVideo");
  private readonly catalog = viewChild<ElementRef<HTMLElement>>("catalog");
  private readonly staticTab =
    viewChild<ElementRef<HTMLButtonElement>>("staticTab");
  private readonly dynamicTab =
    viewChild<ElementRef<HTMLButtonElement>>("dynamicTab");
  readonly playing = signal(false);
  async playVideo() {
    const video = this.video()?.nativeElement;
    try {
      await video?.play();
      this.playing.set(true);
    } catch {
      this.playing.set(false);
    }
  }
  readonly api = inject(Api);
  readonly hotels = signal<HotelSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal("");
  readonly mode = signal<"static" | "dynamic">("static");
  readonly applied = signal("");
  readonly query = new FormControl("", { nonNullable: true });
  readonly filtered = computed(() =>
    filterHotels(this.hotels(), this.applied()),
  );
  constructor() {
    this.query.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      if (this.mode() === "dynamic") this.applied.set(value);
    });
    void this.load();
  }
  tabKey(event: KeyboardEvent, mode: "static" | "dynamic") {
    let target: "static" | "dynamic";
    if (event.key === "ArrowLeft" || event.key === "ArrowRight")
      target = mode === "static" ? "dynamic" : "static";
    else if (event.key === "Home") target = "static";
    else if (event.key === "End") target = "dynamic";
    else return;
    event.preventDefault();
    this.selectMode(target);
    (target === "static"
      ? this.staticTab()
      : this.dynamicTab()
    )?.nativeElement.focus();
  }
  selectMode(mode: "static" | "dynamic") {
    this.mode.set(mode);
    if (mode === "dynamic") this.apply();
  }
  apply() {
    this.applied.set(this.query.value);
  }
  clear() {
    this.query.setValue("");
    this.apply();
  }
  scrollCatalog() {
    this.catalog()?.nativeElement.scrollIntoView({ behavior: "smooth" });
  }
  async load() {
    this.loading.set(true);
    this.error.set("");
    try {
      this.hotels.set(await this.api.hotels());
    } catch {
      this.error.set("No pudimos cargar los hoteles. Inténtalo de nuevo.");
    } finally {
      this.loading.set(false);
    }
  }
}
