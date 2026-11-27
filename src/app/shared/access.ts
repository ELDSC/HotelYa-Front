import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Auth } from "../core/auth";
import { APP_CONFIG } from "../core/config";
import { passwordBytes, serverError } from "../core/forms";
import { safeDestination } from "../core/guards";
import { FieldError } from "./field";
@Component({
  imports: [ReactiveFormsModule, RouterLink, FieldError],
  template: `<div class="owner-app">
    <header class="access-header">
      <a routerLink="/" class="owner-brand"
        ><img
          src="assets/images/logoHoteleriasYa.png"
          width="40"
          alt=""
        />HoteleriasYa</a
      >
    </header>
    <main class="auth-shell">
      <div class="auth-box">
        @if (!admin) {
          <div class="auth-tabs">
            <button
              type="button"
              [attr.aria-selected]="!register()"
              (click)="switch(false)"
            >
              Ingresar</button
            ><button
              type="button"
              [attr.aria-selected]="register()"
              (click)="switch(true)"
            >
              Crear cuenta
            </button>
          </div>
        }
        <h1>
          {{
            admin
              ? "Acceso administrativo"
              : register()
                ? "Crea tu cuenta de dueño"
                : "Bienvenido de nuevo"
          }}
        </h1>
        <form
          [formGroup]="form"
          (ngSubmit)="submit()"
          [attr.aria-busy]="busy()"
        >
          <fieldset [disabled]="busy()">
            <label
              >Correo electrónico <span class="required-mark">*</span
              ><input
                id="email"
                formControlName="email"
                type="email"
                autocomplete="username" /><app-field-error
                [control]="form.controls.email" /></label
            ><label
              >Contraseña <span class="required-mark">*</span
              ><input
                id="password"
                formControlName="password"
                type="password"
                [attr.autocomplete]="
                  register() ? 'new-password' : 'current-password'
                " /><app-field-error [control]="form.controls.password"
            /></label>
            @if (register()) {
              <label
                >Confirmar contraseña <span class="required-mark">*</span
                ><input
                  formControlName="confirmation"
                  type="password"
                  autocomplete="new-password" /><app-field-error
                  [control]="form.controls.confirmation"
              /></label>
            }
            <div class="notice error" role="alert">{{ message() }}</div>
            <button
              class="primary"
              type="submit"
              [disabled]="busy()"
              [attr.aria-busy]="busy()"
              [class.is-loading]="busy()"
            >
              <span class="button-label">{{
                admin
                  ? "Ingresar"
                  : register()
                    ? "Crear cuenta"
                    : destination.startsWith("/hoteles/")
                      ? "Ingresar"
                      : "Ingresar al panel"
              }}</span>
              @if (busy()) {
                <span class="spinner" aria-label="Ingresando"></span>
              }
            </button>
          </fieldset>
        </form>
      </div>
      <a routerLink="/" class="back-link">← Volver al catálogo</a>
    </main>
  </div>`,
})
export class Access {
  readonly auth = inject(Auth);
  private config = inject(APP_CONFIG);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly admin = !!this.route.snapshot.data["admin"];
  readonly register = signal(false);
  readonly busy = signal(false);
  readonly message = signal("");
  readonly form = inject(FormBuilder).nonNullable.group({
    email: [
      this.admin
        ? this.config.ADMIN_LOGIN_EMAIL
        : this.config.OWNER_LOGIN_EMAIL,
      [Validators.required, Validators.email, Validators.maxLength(254)],
    ],
    password: [
      this.admin
        ? this.config.ADMIN_LOGIN_PASSWORD
        : this.config.OWNER_LOGIN_PASSWORD,
      [Validators.required],
    ],
    confirmation: [""],
  });
  constructor() {
    void this.session
      .restore()
      .then((user) => {
        if (user) void this.router.navigateByUrl(this.destination);
      })
      .catch(() => null);
  }
  get session() {
    return this.admin ? this.auth.admin : this.auth.owner;
  }
  get destination() {
    return this.admin
      ? "/admin"
      : safeDestination(this.route.snapshot.queryParamMap.get("next"));
  }
  switch(value: boolean) {
    this.register.set(value);
    this.message.set("");
    this.form.controls.password.setValidators(
      value
        ? [Validators.required, Validators.minLength(8), passwordBytes]
        : [Validators.required],
    );
    this.form.controls.password.updateValueAndValidity();
    this.form.controls.confirmation.setValidators(
      value ? [Validators.required] : [],
    );
    this.form.controls.confirmation.updateValueAndValidity();
  }
  async submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    if (
      this.register() &&
      this.form.controls.password.value !==
        this.form.controls.confirmation.value
    ) {
      this.form.controls.confirmation.setErrors({
        server: "Las contraseñas no coinciden.",
      });
      return;
    }
    this.busy.set(true);
    this.message.set("");
    try {
      const v = this.form.getRawValue();
      await this.session.signIn(v.email, v.password, this.register());
      await this.router.navigateByUrl(this.destination);
    } catch (e) {
      this.message.set(serverError(e, this.form));
    } finally {
      this.busy.set(false);
    }
  }
}
