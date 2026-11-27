import { registerLocaleData } from "@angular/common";
import localeEsPe from "@angular/common/locales/es-PE";
import { HttpErrorResponse } from "@angular/common/http";
import {
  Component,
  computed,
  DestroyRef,
  inject,
  LOCALE_ID,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router } from "@angular/router";
import { distinctUntilChanged, map } from "rxjs";
import {
  NgbActiveModal,
  NgbDatepickerI18n,
  NgbDatepickerI18nDefault,
  NgbDatepickerModule,
  NgbDateStruct,
} from "@ng-bootstrap/ng-bootstrap";
import type {
  HotelDetail,
  RateInfo,
  RateMode,
  RoomTypeDetail,
} from "../../types/catalog";
import type {
  Availability,
  Confirmation,
  ReservationSlot,
} from "../../types/reservations";
import { formatMoney, rateModeLabel, stayDuration } from "../../utils/rates";
import { isBookable, slotLabel, todayInPeru } from "../../utils/reservations";
import { Api } from "../core/api";
import { Auth } from "../core/auth";
import { integer, serverError } from "../core/forms";

export interface BookingDraft {
  roomId: number;
  mode: RateMode;
  date: string;
  quantity: number;
  startsAt: string;
}

function dateStruct(date: string): NgbDateStruct {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function isoDate({ year, month, day }: NgbDateStruct) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function bookingDraftKey(hotelId: number) {
  return `hotelya-booking-${hotelId}`;
}

registerLocaleData(localeEsPe);

@Component({
  providers: [
    { provide: LOCALE_ID, useValue: "es-PE" },
    { provide: NgbDatepickerI18n, useClass: NgbDatepickerI18nDefault },
  ],
  imports: [ReactiveFormsModule, NgbDatepickerModule],
  templateUrl: "./booking.html",
  styleUrl: "./booking.scss",
})
export class Booking {
  private readonly api = inject(Api);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  readonly modal = inject(NgbActiveModal);
  readonly status = signal<Availability | null>(null);
  readonly availableSlots = computed(
    () => this.status()?.slots.filter((slot) => slot.available) ?? [],
  );
  readonly slot = signal<ReservationSlot | null>(null);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly availabilityError = signal("");
  readonly confirmationError = signal("");
  readonly minDate = signal(dateStruct(todayInPeru()));
  readonly form = new FormGroup({
    mode: new FormControl<RateMode>("HOUR", { nonNullable: true }),
    quantity: new FormControl(1, {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.min(1),
        Validators.max(2147483647),
        integer,
      ],
    }),
    date: new FormControl<NgbDateStruct>(this.minDate(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
  readonly formatMoney = formatMoney;
  readonly rateModeLabel = rateModeLabel;
  readonly stayDuration = stayDuration;
  readonly slotLabel = slotLabel;
  hotel!: HotelDetail;
  room!: RoomTypeDetail;
  rates: RateInfo[] = [];
  private generation = 0;
  private requestId: string | null = null;

  constructor() {
    this.form.valueChanges
      .pipe(
        map(() => {
          const { mode, quantity, date } = this.form.getRawValue();
          return `${mode}:${quantity}:${isoDate(date)}`;
        }),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.confirmationError.set("");
        void this.load();
      });
    this.destroy.onDestroy(() => ++this.generation);
  }

  setup(
    hotel: HotelDetail,
    room: RoomTypeDetail,
    rate: RateInfo,
    draft?: BookingDraft,
  ) {
    this.hotel = hotel;
    this.room = room;
    this.rates = room.rates.filter((candidate) =>
      isBookable(hotel, room, candidate),
    );
    this.form.setValue(
      {
        mode: rate.mode,
        quantity: draft?.quantity ?? 1,
        date:
          draft && draft.date >= todayInPeru()
            ? dateStruct(draft.date)
            : this.minDate(),
      },
      { emitEvent: false },
    );
    void this.load(draft?.startsAt);
  }

  selectedRate() {
    return this.rates.find(
      (rate) => rate.mode === this.form.controls.mode.value,
    );
  }

  choose(slot: ReservationSlot) {
    if (this.slot()?.startsAt === slot.startsAt) return;
    this.slot.set(slot);
    this.requestId = null;
    this.confirmationError.set("");
  }

  async load(restoreStart?: string) {
    const generation = ++this.generation;
    this.status.set(null);
    this.slot.set(null);
    this.requestId = null;
    this.availabilityError.set("");
    if (!this.hotel || this.form.invalid) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    const { mode, quantity, date } = this.form.getRawValue();
    try {
      const status = await this.api.availability(
        this.hotel.id,
        this.room.id,
        mode,
        quantity,
        isoDate(date),
      );
      if (generation !== this.generation) return;
      if (status.today !== isoDate(this.minDate()))
        this.minDate.set(dateStruct(status.today));
      this.status.set(status);
      if (restoreStart)
        this.slot.set(
          status.slots.find(
            (item) => item.startsAt === restoreStart && item.available,
          ) ?? null,
        );
    } catch (error) {
      if (generation === this.generation)
        this.availabilityError.set(serverError(error));
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }

  private signIn(draft: BookingDraft) {
    sessionStorage.setItem(
      bookingDraftKey(this.hotel.id),
      JSON.stringify(draft),
    );
    this.modal.close();
    void this.router.navigate(["/acceder"], {
      queryParams: {
        next: `/hoteles/${this.hotel.id}?reserva=${this.room.id}`,
      },
    });
  }

  async confirm() {
    const slot = this.slot();
    const status = this.status();
    if (this.submitting() || this.form.invalid || !slot || !status) return;
    const { mode, quantity, date } = this.form.getRawValue();
    const draft = {
      roomId: this.room.id,
      mode,
      date: isoDate(date),
      quantity,
      startsAt: slot.startsAt,
    };
    this.confirmationError.set("");
    this.submitting.set(true);
    try {
      if (!(await this.auth.owner.restore())) {
        this.signIn(draft);
        return;
      }
      const body: Confirmation = {
        hotelId: this.hotel.id,
        roomTypeId: this.room.id,
        mode,
        quantity,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        total: status.total,
        currency: status.currency,
        requestId: (this.requestId ??= crypto.randomUUID()),
      };
      const receipt = await this.api.confirmReservation(body);
      this.modal.close();
      await this.router.navigate(["/mis-reservas", receipt.code]);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.signIn(draft);
        return;
      }
      this.confirmationError.set(serverError(error));
      if (
        error instanceof HttpErrorResponse &&
        (error.status === 409 || error.status === 400)
      )
        await this.load(slot.startsAt);
    } finally {
      this.submitting.set(false);
    }
  }
}
