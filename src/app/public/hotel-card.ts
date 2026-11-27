import { Component, input, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Api } from "../core/api";
import { HotelSummary } from "../../types/catalog";
@Component({
  selector: "app-hotel-card",
  imports: [RouterLink],
  template: `<article class="hotel-card">
    <div class="hotel-card-image hotel-card-image-logo">
      @if (api.asset(hotel().logoPath); as logo) {
        <img [src]="logo" [alt]="hotel().name" loading="lazy" />
      }
    </div>
    <div class="hotel-card-content">
      <div class="hotel-header">
        <h3 class="hotel-name">{{ hotel().name }}</h3>
      </div>
      <p class="hotel-code">Código: {{ hotel().code }}</p>
      <p class="hotel-location">{{ hotel().location }}</p>
      <p class="hotel-description">{{ hotel().description }}</p>
      <div class="hotel-footer">
        <a
          class="btn btn-primary btn-sm"
          [routerLink]="['/hoteles', hotel().id]"
          >Ver hotel</a
        >
      </div>
    </div>
  </article>`,
})
export class HotelCard {
  readonly hotel = input.required<HotelSummary>();
  readonly api = inject(Api);
}
