import { DatePipe } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { Component, computed, inject, OnDestroy, signal } from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { DomSanitizer, Title } from "@angular/platform-browser";
import { ActivatedRoute, RouterLink } from "@angular/router";
import type { HotelDetail, HotelReview } from "../../types/catalog";
import { Api } from "../core/api";
import { Auth } from "../core/auth";
import { serverError, trimmedRequired } from "../core/forms";
import { FieldError } from "../shared/field";
import { Header } from "../shared/header";
import { HotelFooter, HotelHero } from "./hotel-chrome";

@Component({
  imports: [
    RouterLink,
    ReactiveFormsModule,
    DatePipe,
    FieldError,
    Header,
    HotelHero,
    HotelFooter,
  ],
  templateUrl: "./contacts.html",
  styleUrl: "./contacts.scss",
})
export class Contacts implements OnDestroy {
  private readonly api = inject(Api);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly title = inject(Title);
  readonly session = inject(Auth).owner;

  readonly hotel = signal<HotelDetail | null>(null);
  readonly hotelError = signal("");
  readonly reviews = signal<HotelReview[]>([]);
  readonly cursor = signal<string | null>(null);
  readonly listLoading = signal(true);
  readonly listError = signal("");
  readonly statusLoading = signal(true);
  readonly statusError = signal("");
  readonly reviewed = signal(false);
  readonly publishing = signal(false);
  readonly publishError = signal("");
  readonly form = new FormGroup({
    roomTypeId: new FormControl<number | null>(null, Validators.required),
    comment: new FormControl("", {
      nonNullable: true,
      validators: [trimmedRequired, Validators.maxLength(1000)],
    }),
  });

  private readonly mapQuery = computed(() => {
    const hotel = this.hotel();
    if (!hotel) return "";
    const { latitude, longitude, address } = hotel;
    return latitude !== null && longitude !== null
      ? `${latitude},${longitude}`
      : address;
  });
  readonly mapEmbed = computed(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://maps.google.com/maps?output=embed&q=${encodeURIComponent(this.mapQuery())}`,
    ),
  );
  readonly mapLink = computed(
    () =>
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.mapQuery())}`,
  );

  private generation = 0;
  private readonly subscription = this.route.paramMap.subscribe(
    () => void this.load(),
  );

  async load() {
    const generation = ++this.generation;
    this.hotel.set(null);
    this.hotelError.set("");
    this.reviews.set([]);
    this.cursor.set(null);
    this.listError.set("");
    this.listLoading.set(true);
    this.reviewed.set(false);
    this.statusLoading.set(true);
    this.statusError.set("");
    this.publishing.set(false);
    this.publishError.set("");
    this.form.reset();
    const id = this.route.snapshot.paramMap.get("id");
    try {
      if (
        !id ||
        !/^\d+$/.test(id) ||
        !Number.isSafeInteger(Number(id)) ||
        Number(id) < 1
      )
        throw new HttpErrorResponse({ status: 404 });
      const hotel = await this.api.hotel(id);
      if (generation !== this.generation) return;
      this.hotel.set(hotel);
      this.title.setTitle(`Contactos | ${hotel.name} | HoteleriasYa`);
      void this.loadReviews();
      void this.loadStatus();
    } catch (error) {
      if (generation !== this.generation) return;
      this.hotelError.set(
        error instanceof HttpErrorResponse && error.status === 404
          ? "Hotel no encontrado."
          : "No pudimos cargar el hotel.",
      );
    }
  }

  async loadReviews(before: string | null = null) {
    const hotel = this.hotel();
    if (!hotel) return;
    const generation = this.generation;
    this.listLoading.set(true);
    this.listError.set("");
    try {
      const page = await this.api.hotelReviews(hotel.id, before);
      if (generation !== this.generation) return;
      this.reviews.update((current) => [
        ...current,
        ...page.items.filter(
          (review) => !current.some((existing) => existing.id === review.id),
        ),
      ]);
      this.cursor.set(page.nextCursor);
    } catch {
      if (generation === this.generation)
        this.listError.set("No pudimos cargar las reseñas.");
    } finally {
      if (generation === this.generation) this.listLoading.set(false);
    }
  }

  async loadStatus() {
    const hotel = this.hotel();
    if (!hotel) return;
    const generation = this.generation;
    this.statusLoading.set(true);
    this.statusError.set("");
    try {
      if (!(await this.session.restore()) || generation !== this.generation)
        return;
      const result = await this.api.hotelReviewStatus(hotel.id);
      if (generation === this.generation) this.reviewed.set(result.reviewed);
    } catch (error) {
      if (
        generation === this.generation &&
        (!(error instanceof HttpErrorResponse && error.status === 401) ||
          this.session.user())
      )
        this.statusError.set(
          "No pudimos comprobar si ya publicaste una reseña.",
        );
    } finally {
      if (generation === this.generation) this.statusLoading.set(false);
    }
  }

  async publish() {
    const hotel = this.hotel();
    if (!hotel || !this.session.user() || this.reviewed() || this.publishing())
      return;
    this.form.markAllAsTouched();
    const { roomTypeId, comment } = this.form.getRawValue();
    if (this.form.invalid || roomTypeId === null) return;
    const generation = this.generation;
    this.publishing.set(true);
    this.publishError.set("");
    try {
      const review = await this.api.publishHotelReview(
        hotel.id,
        roomTypeId,
        comment.trim(),
      );
      if (generation !== this.generation) return;
      this.reviewed.set(true);
      this.reviews.update((items) => [
        review,
        ...items.filter((item) => item.id !== review.id),
      ]);
      this.form.reset();
    } catch (error) {
      if (generation !== this.generation) return;
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.reviewed.set(true);
      } else {
        this.publishError.set(serverError(error, this.form));
      }
    } finally {
      if (generation === this.generation) this.publishing.set(false);
    }
  }

  ngOnDestroy() {
    ++this.generation;
    this.subscription.unsubscribe();
  }
}
