import { NgTemplateOutlet } from "@angular/common";
import {
  Component,
  inject,
  signal,
  TemplateRef,
  OnDestroy,
  viewChild,
} from "@angular/core";
import {
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
  Router,
  NavigationEnd,
} from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { filter, map } from "rxjs";
import { NgbOffcanvas, NgbToast } from "@ng-bootstrap/ng-bootstrap";
import { Api } from "../core/api";
import { Auth } from "../core/auth";
import { serverError } from "../core/forms";
import { PendingChanges } from "../core/guards";
import { Notice } from "./notice";
@Component({
  imports: [
    NgTemplateOutlet,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgbToast,
  ],
  template: `<div class="owner-app">
    <header class="owner-mobile-header">
      <span>HoteleriasYa</span
      ><button id="sidebarToggle" aria-label="Abrir menú" (click)="open(menu)">
        ☰
      </button>
    </header>
    <div class="owner-layout">
      <aside
        class="owner-sidebar desktop-sidebar"
        aria-label="Menú de administración"
      >
        <ng-container [ngTemplateOutlet]="menu" />
      </aside>
      <main class="owner-main">
        <header class="panel-heading">
          <h1>{{ heading() }}</h1>
        </header>
        @if (logoutError()) {
          <p class="notice error" role="alert">{{ logoutError() }}</p>
        }
        @if (loading()) {
          <p role="status">Cargando panel…</p>
        } @else if (error()) {
          <p role="alert">{{ error() }}</p>
          <button (click)="load()">Reintentar</button>
        } @else if (!api.current() && path() !== "/panel/informacion") {
          <p>Todavía no has creado tu hotel.</p>
          <a class="primary" routerLink="/panel/informacion">Crear un hotel</a>
        } @else {
          <router-outlet />
        }
      </main>
    </div>
    <ng-template #menu let-mobilePanel
      ><div class="owner-sidebar-header">
        <a routerLink="/" class="owner-brand"
          ><img
            src="assets/images/logoHoteleriasYa.png"
            width="40"
            alt=""
          />HoteleriasYa</a
        ><button
          class="owner-sidebar-close"
          (click)="offcanvas.dismiss()"
          aria-label="Cerrar menú"
        >
          ×
        </button>
      </div>
      <nav
        [attr.id]="mobilePanel ? 'panelNav' : null"
        aria-label="Administración"
      >
        @for (page of pages; track page.path) {
          <a
            [routerLink]="page.path"
            routerLinkActive="selected"
            [routerLinkActiveOptions]="{ exact: true }"
            (click)="offcanvas.dismiss()"
            >{{ page.title }}</a
          >
        }
      </nav>
      <div class="owner-sidebar-footer">
        @if (api.current(); as hotel) {
          <a
            [routerLink]="
              hotel.published
                ? ['/hoteles', hotel.detail.id]
                : ['/panel/vista-previa']
            "
            target="_blank"
            class="owner-page-link"
            >Ver mi página ↗</a
          >
        }
        <div class="owner-account">
          <span>{{ auth.owner.user()?.email }}</span
          ><button (click)="logout()" [disabled]="signingOut()">
            Cerrar sesión
          </button>
        </div>
      </div></ng-template
    >
    <div class="owner-toast-container">
      @for (revision of [notice.revision()]; track revision) {
        @if (notice.message()) {
          <ngb-toast
            class="owner-toast"
            [autohide]="true"
            [delay]="3500"
            (hidden)="notice.message.set('')"
            >{{ notice.message()
            }}<button
              class="toast-close"
              (click)="notice.message.set('')"
              aria-label="Cerrar notificación"
            >
              ×
            </button></ngb-toast
          >
        }
      }
    </div>
  </div>`,
})
export class OwnerLayout implements OnDestroy {
  ngOnDestroy() {
    this.offcanvas.dismiss();
  }
  private readonly outlet = viewChild(RouterOutlet);
  readonly signingOut = signal(false);
  readonly logoutError = signal("");
  readonly api = inject(Api);
  readonly auth = inject(Auth);
  readonly offcanvas = inject(NgbOffcanvas);
  readonly notice = inject(Notice);
  readonly router = inject(Router);
  readonly path = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.split("?")[0]),
    ),
    { initialValue: this.router.url.split("?")[0] },
  );
  readonly loading = signal(true);
  readonly error = signal("");
  readonly pages = [
    { path: "/panel", title: "Inicio" },
    { path: "/panel/informacion", title: "Información" },
    { path: "/panel/habitaciones", title: "Habitaciones" },
    { path: "/panel/multimedia", title: "Multimedia" },
    { path: "/panel/reservas", title: "Reservas" },
    { path: "/panel/reportes", title: "Reportes" },
  ];
  constructor() {
    void this.load();
  }
  heading() {
    return this.pages.find((p) => p.path === this.path())?.title ?? "Mi hotel";
  }
  async load() {
    this.loading.set(true);
    this.error.set("");
    try {
      await this.api.ownerHotel();
    } catch (e) {
      this.error.set(serverError(e));
    } finally {
      this.loading.set(false);
    }
  }
  open(menu: TemplateRef<unknown>) {
    this.offcanvas.open(menu, {
      panelClass: "owner-app owner-mobile-menu",
      ariaLabelledBy: "panelNav",
    });
  }
  async logout() {
    const outlet = this.outlet();
    const editor = outlet?.isActivated
      ? (outlet.component as Partial<PendingChanges>)
      : null;
    if (this.signingOut() || editor?.busy?.()) return;
    if (
      editor?.hasChanges?.() &&
      !confirm("Hay cambios sin guardar. ¿Deseas cerrar sesión y descartarlos?")
    )
      return;
    this.logoutError.set("");
    this.signingOut.set(true);
    try {
      await this.auth.owner.signOut();
      editor?.approveLeave?.();
      this.api.current.set(null);
      await this.router.navigateByUrl("/acceder");
    } catch (e) {
      this.logoutError.set(serverError(e));
    } finally {
      this.signingOut.set(false);
    }
  }
}
