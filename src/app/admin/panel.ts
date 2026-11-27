import { Component, inject, signal, computed, effect } from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { Api } from "../core/api";
import { Auth } from "../core/auth";
import { HotelSummary } from "../../types/catalog";
import { serverError } from "../core/forms";
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  template: `<div class="owner-app">
    <main class="admin-main">
      <header class="admin-topbar">
        <a routerLink="/" class="owner-brand"
          ><img
            src="assets/images/logoHoteleriasYa.png"
            width="40"
            alt=""
          />HoteleriasYa
          <span class="admin-label">Administración global</span></a
        ><button class="secondary" (click)="logout()">Cerrar sesión</button>
      </header>
      <h1>Hoteles publicados</h1>
      <form
        class="admin-tools"
        (submit)="$event.preventDefault(); term.set(query.value)"
      >
        <label class="form-field admin-search"
          >Buscar hotel<input
            [formControl]="query"
            type="search"
            id="hotelSearch" /></label
        ><button class="primary" [disabled]="loading()">Buscar</button>
      </form>
      @if (error()) {
        <div class="admin-error" role="alert">
          {{ error()
          }}<button class="secondary" (click)="load()">Reintentar</button>
        </div>
      }
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Hotel</th>
              <th>Ubicación</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr>
                <td colspan="3">Cargando hoteles…</td>
              </tr>
            } @else {
              @for (hotel of filtered(); track hotel.id) {
                <tr>
                  <td>
                    <div class="admin-hotel-cell">
                      <span class="admin-hotel-logo">
                        @if (api.asset(hotel.logoPath); as logo) {
                          <img
                            [src]="logo"
                            alt=""
                            (error)="$any($event.target).hidden = true"
                          />
                        } @else {
                          {{ hotel.name.charAt(0) }}
                        }</span
                      >{{ hotel.name }}
                    </div>
                  </td>
                  <td>{{ hotel.location || "Sin ubicación" }}</td>
                  <td class="admin-action">
                    <a
                      class="secondary admin-view-link"
                      [routerLink]="['/hoteles', hotel.id]"
                      target="_blank"
                      rel="noopener noreferrer"
                      >Ver ficha ↗</a
                    >
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="3">
                    {{
                      hotels().length
                        ? "No se encontraron hoteles."
                        : "No hay hoteles publicados."
                    }}
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </main>
  </div>`,
})
export class AdminPanel {
  readonly api = inject(Api);
  readonly auth = inject(Auth);
  private router = inject(Router);
  readonly query = new FormControl("", { nonNullable: true });
  readonly term = signal("");
  readonly hotels = signal<HotelSummary[]>([]);
  readonly loading = signal(false);
  readonly error = signal("");
  readonly filtered = computed(() =>
    this.hotels().filter((h) =>
      `${h.name} ${h.location}`
        .toLocaleLowerCase("es")
        .includes(this.term().trim().toLocaleLowerCase("es")),
    ),
  );
  constructor() {
    effect(() => {
      if (!this.auth.admin.user())
        void this.router.navigateByUrl("/admin/acceder");
    });
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set("");
    try {
      this.hotels.set(await this.api.adminHotels());
    } catch (e) {
      if ((e as { status: number }).status === 401)
        await this.router.navigateByUrl("/admin/acceder");
      else this.error.set(serverError(e));
    } finally {
      this.loading.set(false);
    }
  }
  async logout() {
    try {
      await this.auth.admin.signOut();
      await this.router.navigateByUrl("/admin/acceder");
    } catch (e) {
      this.error.set(serverError(e));
    }
  }
}
