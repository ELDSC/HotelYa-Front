import { Component, inject, signal } from "@angular/core";
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
    @if (!owner) {
      <app-header [solid]="true" />
    }
    <section
      [class.guest-reservations]="!owner"
      [attr.role]="owner ? null : 'main'"
      aria-label="Reservas"
    >
      @if (!owner) {
        <h1>Mis reservas</h1>
      }
      @if (error()) {
        <p role="alert">{{ error() }}</p>
        <button
          type="button"
          class="btn btn-outline-secondary"
          (click)="load()"
        >
          Reintentar
        </button>
      } @else if (!loading() && !items().length) {
        <p>
          {{
            owner
              ? "Todavía no hay reservas para tu hotel."
              : "Todavía no tienes reservas."
          }}
        </p>
        @if (!owner) {
          <a class="btn btn-primary" routerLink="/">Explorar hoteles</a>
        }
      }
      @if (items().length) {
        <ol class="reservation-list">
          @for (reservation of items(); track reservation.code) {
            <li>
              <div>
                <h2>
                  {{ owner ? reservation.roomName : reservation.hotelName }}
                </h2>
                <p>
                  {{ owner ? reservation.guestEmail : reservation.roomName }}
                </p>
                <p>
                  {{ modeLabel[reservation.mode] }} ·
                  {{ formatMoney(reservation.total, reservation.currency) }}
                </p>
              </div>
              <dl>
                <div>
                  <dt>Entrada</dt>
                  <dd>{{ formatDate(reservation.startsAt) }}</dd>
                </div>
                <div>
                  <dt>Salida</dt>
                  <dd>{{ formatDate(reservation.endsAt) }}</dd>
                </div>
              </dl>
              <div class="reservation-reference">
                @if (owner) {
                  <p class="code">{{ reservation.code }}</p>
                } @else {
                  <a
                    class="btn btn-outline-secondary"
                    [routerLink]="['/mis-reservas', reservation.code]"
                    >Ver comprobante</a
                  >
                }
              </div>
            </li>
          }
        </ol>
      }
      @if (loading()) {
        <p role="status">Cargando reservas…</p>
      }
      @if (hasMore() && !error()) {
        <button
          type="button"
          class="btn btn-outline-secondary"
          [disabled]="loading()"
          (click)="load()"
        >
          Ver más
        </button>
      }
    </section>
  `,
  styleUrl: "./reservations.scss",
})
export class ReservationList {
  private readonly api = inject(Api);
  readonly owner = !!inject(ActivatedRoute).snapshot.data["owner"];
  readonly items = signal<Reservation[]>([]);
  readonly hasMore = signal(false);
  readonly loading = signal(false);
  readonly error = signal("");
  readonly formatMoney = formatMoney;
  readonly modeLabel = reservationModeLabel;
  private page = 0;

  constructor() {
    void this.load();
  }

  formatDate(value: string) {
    return reservationDateTime.format(new Date(value));
  }

  async load() {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set("");
    try {
      const result = await this.api.reservations(this.page, this.owner);
      this.items.update((items) => [
        ...items,
        ...result.items.filter(
          (item) => !items.some((previous) => previous.code === item.code),
        ),
      ]);
      this.hasMore.set(result.hasMore);
      ++this.page;
    } catch (error) {
      this.error.set(serverError(error));
    } finally {
      this.loading.set(false);
    }
  }
}
