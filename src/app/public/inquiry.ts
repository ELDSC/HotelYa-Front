import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { HotelDetail, RoomTypeDetail, RateInfo } from "../../types/catalog";
import {
  effectiveRateAmount,
  formatMoney,
  rateTotal,
  rateModeLabel,
  rateLabel,
  stayDuration,
} from "../../utils/rates";
import { integer } from "../core/forms";
@Component({
  imports: [ReactiveFormsModule],
  template: `<div class="inquiry-header">
      <div>
        <p class="inquiry-eyebrow">{{ hotel().name }}</p>
        <h2 id="inquiry-title">Consulta tu estadía</h2>
      </div>
      <button
        class="inquiry-close"
        aria-label="Cerrar consulta"
        (click)="modal.close()"
      >
        ×
      </button>
    </div>
    <form class="inquiry-form" [formGroup]="form" (ngSubmit)="submit()">
      <h3 class="inquiry-room-name">{{ room().name }}</h3>
      @if (room().rates.length) {
        <div class="inquiry-fields">
          <label
            >Modalidad<select
              formControlName="rate"
              (change)="form.controls.quantity.setValue(1)"
            >
              @for (rate of room().rates; track rate.mode; let i = $index) {
                <option [ngValue]="i">
                  {{ rateModeLabel(rate) }} ·
                  {{ formatMoney(effectiveRateAmount(rate), rate.currency) }}
                </option>
              }
            </select></label
          ><label
            >{{
              selected()?.mode === "NIGHT"
                ? "Cantidad de noches"
                : selected()?.mode === "PACKAGE"
                  ? "Cantidad de paquetes"
                  : "Cantidad de horas"
            }}<input type="number" formControlName="quantity" min="1" step="1"
          /></label>
        </div>
        <div class="inquiry-summary" aria-live="polite">
          @if (form.valid && selected(); as rate) {
            <p class="inquiry-duration">
              {{ stayDuration(rate, form.controls.quantity.value) }}
            </p>
            @if (rate.discountPercent; as discount) {
              <p class="inquiry-duration">
                {{ discount }} % de descuento aplicado a la tarifa
              </p>
            }
            <strong class="inquiry-total"
              >Total de referencia:
              {{
                formatMoney(
                  rateTotal(rate, form.controls.quantity.value),
                  rate.currency
                )
              }}</strong
            >
          } @else {
            <p class="field-error" role="alert">
              Introduce una cantidad entera mayor que cero.
            </p>
          }
        </div>
      } @else {
        <div class="inquiry-summary">
          Consulta las tarifas directamente con el hotel.
        </div>
      }
      @for (detail of room().details; track $index) {
        @if (
          detail.kind === "RECOMMENDATION" || detail.kind === "PROHIBITION"
        ) {
          <p>{{ detail.text }}</p>
        }
      }
      @if (hotel().checkInOutConditions) {
        <h4>Entrada y salida</h4>
        <p>{{ hotel().checkInOutConditions }}</p>
      }
      <p class="inquiry-disclaimer">
        El hotel confirmará disponibilidad, condiciones y el importe final por
        WhatsApp.
      </p>
      @if (!phone()) {
        <p>
          Este hotel aún no tiene un teléfono y WhatsApp válido configurado para
          consultas.
        </p>
      }
      <button class="btn btn-primary" [disabled]="!phone() || form.invalid">
        Consultar por WhatsApp
      </button>
    </form>`,
})
export class Inquiry {
  readonly modal = inject(NgbActiveModal);
  readonly hotel = signal<HotelDetail>(null!);
  readonly room = signal<RoomTypeDetail>(null!);
  readonly form = inject(FormBuilder).nonNullable.group({
    rate: [0],
    quantity: [1, [Validators.required, Validators.min(1), integer]],
  });
  readonly formatMoney = formatMoney;
  readonly effectiveRateAmount = effectiveRateAmount;
  readonly rateTotal = rateTotal;
  readonly rateModeLabel = rateModeLabel;
  readonly stayDuration = stayDuration;
  selected(): RateInfo | undefined {
    return this.room().rates[this.form.controls.rate.value];
  }
  phone() {
    const p = this.hotel().phone;
    return p && /^\+51[0-9]{9}$/.test(p) ? p.slice(1) : null;
  }
  submit() {
    if (!this.phone() || this.form.invalid) return;
    const rate = this.selected(),
      q = this.form.controls.quantity.value;
    if (rate && !Number.isFinite(rateTotal(rate, q))) return;
    const message = [
      `Hola, quisiera consultar una estadía en ${this.hotel().name}.`,
      `Habitación: ${this.room().name}.`,
    ];
    if (rate)
      message.push(
        `Modalidad: ${rateModeLabel(rate)}.`,
        `Estadía: ${stayDuration(rate, q)}.`,
        `Tarifa: ${rateLabel(rate)}.`,
        `Total de referencia: ${formatMoney(rateTotal(rate, q), rate.currency)}.`,
      );
    message.push("¿Podrían confirmar disponibilidad y condiciones?");
    window.open(
      `https://wa.me/${this.phone()}?text=${encodeURIComponent(message.join("\n"))}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
}
