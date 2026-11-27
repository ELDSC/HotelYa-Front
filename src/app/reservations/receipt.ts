import { Component, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ActivatedRoute, RouterLink } from "@angular/router";
import type { Reservation } from "../../types/reservations";
import { formatMoney } from "../../utils/rates";
import {
  reservationDateTime,
  reservationModeLabel,
} from "../../utils/reservations";
import { Api } from "../core/api";
import { serverError } from "../core/forms";
import { Header } from "../shared/header";

@Component({
  imports: [Header, RouterLink],
  template: `
    <app-header [solid]="true" />
    <main class="guest-reservations">
      <a class="screen-only" routerLink="/mis-reservas">← Mis reservas</a>
      <h1>Comprobante de reserva</h1>
      @if (loading()) {
        <p role="status">Cargando comprobante…</p>
      }
      @if (error()) {
        <p role="alert">{{ error() }}</p>
        <button
          class="btn btn-outline-secondary"
          type="button"
          (click)="load()"
        >
          Reintentar
        </button>
      }
      @if (reservation(); as item) {
        <article class="reservation-receipt">
          <p class="receipt-status">Reserva confirmada</p>
          <h2>{{ item.hotelName }}</h2>
          <dl>
            <div>
              <dt>Habitación</dt>
              <dd>{{ item.roomName }}</dd>
            </div>
            <div>
              <dt>Modalidad</dt>
              <dd>{{ modeLabel[item.mode] }} · {{ item.quantity }}</dd>
            </div>
            <div>
              <dt>Entrada</dt>
              <dd>{{ formatDate(item.startsAt) }}</dd>
            </div>
            <div>
              <dt>Salida</dt>
              <dd>{{ formatDate(item.endsAt) }}</dd>
            </div>
            <div>
              <dt>Total de la reserva</dt>
              <dd>{{ formatMoney(item.total, item.currency) }}</dd>
            </div>
            <div>
              <dt>Cuenta</dt>
              <dd>{{ item.guestEmail }}</dd>
            </div>
            <div>
              <dt>Código de reserva</dt>
              <dd class="code">{{ item.code }}</dd>
            </div>
          </dl>
          <p>Horarios de Perú.</p>
        </article>
        <button
          class="btn btn-primary screen-only"
          type="button"
          (click)="print()"
        >
          Imprimir o guardar como PDF
        </button>
      }
    </main>
  `,
  styleUrl: "./reservations.scss",
})
export class Receipt {
  private readonly api = inject(Api);
  private readonly route = inject(ActivatedRoute);
  readonly reservation = signal<Reservation | null>(null);
  readonly loading = signal(false);
  readonly error = signal("");
  readonly formatMoney = formatMoney;
  readonly modeLabel = reservationModeLabel;
  private generation = 0;

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed())
      .subscribe(() => void this.load());
  }

  formatDate(value: string) {
    return reservationDateTime.format(new Date(value));
  }

  print() {
    window.print();
  }

  async load() {
    const generation = ++this.generation;
    this.loading.set(true);
    this.error.set("");
    this.reservation.set(null);
    try {
      const result = await this.api.receipt(
        this.route.snapshot.paramMap.get("code") ?? "",
      );
      if (generation === this.generation) this.reservation.set(result);
    } catch (error) {
      if (generation === this.generation) this.error.set(serverError(error));
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
}
