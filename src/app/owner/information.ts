import { Component, inject } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Api, HotelWrite } from "../core/api";
import { serverError, trimmedRequired, hoursPair } from "../core/forms";
import { nationalPhone, phoneValue, groupPhoneDigits } from "../../utils/phone";
import { PhoneInput } from "../shared/phone-input";
import { FieldError } from "../shared/field";
import { Editor } from "./editor";
import { Notice } from "./notice";
@Component({
  imports: [ReactiveFormsModule, FieldError, PhoneInput],
  template: `<section id="section-hotel">
    <form class="editor-card" [formGroup]="form" (ngSubmit)="save()">
      <fieldset [disabled]="busy()">
        <div class="form-grid">
          @for (field of fields; track field.key) {
            <label
              class="form-field"
              [class.full-width]="field.type === 'textarea'"
              >{{ field.label }}
              @if (field.type === "textarea") {
                <textarea
                  [formControlName]="field.key"
                  [attr.maxlength]="field.max"
                ></textarea>
              } @else if (field.key === "phone") {
                <span class="phone-control"
                  ><span class="phone-prefix" id="hotel-phone-prefix">+51</span
                  ><input
                    formControlName="phone"
                    appPhone
                    type="tel"
                    id="hotel-phone"
                    autocomplete="tel-national"
                    pattern="[0-9]{3} [0-9]{3} [0-9]{3}"
                    aria-describedby="hotel-phone-prefix hotel-phone-hint"
                    inputmode="numeric"
                    maxlength="11"
                    aria-label="Teléfono y WhatsApp" /></span
                ><span id="hotel-phone-hint" class="muted"
                  >Celular de 9 dígitos. Se utilizará para llamadas y consultas
                  por WhatsApp.</span
                >
              } @else {
                <input
                  [type]="field.type"
                  [formControlName]="field.key"
                  [attr.maxlength]="field.max"
                />
              }
              <app-field-error [control]="form.get(field.key)"
            /></label>
          }
        </div>
        @if (form.errors?.["hours"] && (form.touched || form.dirty)) {
          <p class="field-error">Completa las horas de apertura y cierre.</p>
        }
        <div class="notice error" role="alert">{{ error() }}</div>
        <div class="form-actions">
          <button class="primary" [disabled]="busy() || !informationChanged()">
            {{
              api.current() ? "Guardar cambios" : "Crear mi hotel en borrador"
            }}
            @if (busy()) {
              <span class="spinner"></span>
            }
          </button>
        </div>
      </fieldset>
    </form>
    @if (api.current()) {
      <form
        class="editor-card presentation-editor"
        [formGroup]="presentation"
        (ngSubmit)="saveCards()"
      >
        <fieldset [disabled]="busy()">
          <div class="presentation-heading">
            <div>
              <h2>Presentación</h2>
              <p class="muted">
                Personaliza las tarjetas de «Tu próxima estadía» en tu página.
                Máximo 3 tarjetas.
              </p>
            </div>
            <span>{{ cards.length }} / 3</span>
          </div>
          <div class="presentation-grid" formArrayName="cards">
            @for (card of cards.controls; track card; let i = $index) {
              <fieldset class="presentation-card" [formGroupName]="i">
                <legend>Tarjeta {{ i + 1 }}</legend>
                <label class="form-field"
                  >Título *<input
                    formControlName="title"
                    maxlength="200" /><app-field-error
                    [control]="card.controls.title" /></label
                ><label class="form-field"
                  >Texto *<textarea
                    formControlName="description"
                    maxlength="5000"
                  ></textarea
                  ><app-field-error [control]="card.controls.description"
                /></label>
                <div class="presentation-card-actions">
                  <button
                    type="button"
                    class="icon-button"
                    aria-label="Mover tarjeta antes"
                    [disabled]="i === 0"
                    (click)="move(i, -1)"
                  >
                    ←</button
                  ><button
                    type="button"
                    class="icon-button"
                    aria-label="Mover tarjeta después"
                    [disabled]="i === cards.length - 1"
                    (click)="move(i, 1)"
                  >
                    →</button
                  ><button
                    type="button"
                    class="danger-link"
                    (click)="cards.removeAt(i)"
                  >
                    Quitar tarjeta
                  </button>
                </div>
              </fieldset>
            } @empty {
              <p class="muted">
                Añade una tarjeta para presentar lo que ofrece tu hotel.
              </p>
            }
          </div>
          <div class="form-actions">
            <button
              type="button"
              class="secondary"
              [hidden]="cards.length >= 3"
              (click)="addCard()"
            >
              Añadir tarjeta</button
            ><button class="primary" [disabled]="busy() || !cardsChanged()">
              Guardar presentación
            </button>
          </div>
          <p class="notice error" role="alert">{{ cardsError }}</p>
        </fieldset>
      </form>
    }
  </section>`,
})
export class Information extends Editor {
  readonly api = inject(Api);
  private fb = inject(FormBuilder).nonNullable;
  private notice = inject(Notice);
  readonly fields = [
    { key: "name", label: "Nombre del hotel *", type: "text", max: 200 },
    { key: "location", label: "Zona o distrito *", type: "text", max: 200 },
    { key: "address", label: "Dirección *", type: "text", max: 500 },
    { key: "phone", label: "Teléfono y WhatsApp", type: "tel", max: 9 },
    {
      key: "description",
      label: "Descripción *",
      type: "textarea",
      max: 10000,
    },
    { key: "mapUrl", label: "URL del lugar", type: "url", max: 2048 },
    { key: "openingTime", label: "Hora de apertura", type: "time", max: null },
    { key: "closingTime", label: "Hora de cierre", type: "time", max: null },
    {
      key: "checkInOutConditions",
      label: "Condiciones de entrada y salida",
      type: "textarea",
      max: 5000,
    },
  ];
  readonly form = this.fb.group(
    {
      name: ["", [trimmedRequired, Validators.maxLength(200)]],
      location: ["", [trimmedRequired, Validators.maxLength(200)]],
      address: ["", [trimmedRequired, Validators.maxLength(500)]],
      phone: ["", Validators.pattern(/^[0-9]{3} [0-9]{3} [0-9]{3}$/)],
      description: ["", [trimmedRequired, Validators.maxLength(10000)]],
      mapUrl: [
        "",
        [Validators.maxLength(2048), Validators.pattern(/^https:\/\/[^\s]+$/)],
      ],
      openingTime: [""],
      closingTime: [""],
      checkInOutConditions: ["", Validators.maxLength(5000)],
    },
    { validators: hoursPair },
  );
  readonly cards = this.fb.array<
    FormGroup<{ title: FormControl<string>; description: FormControl<string> }>
  >([]);
  readonly presentation = this.fb.group({ cards: this.cards });
  cardsError = "";
  private saved = "";
  private savedCards = "";
  constructor() {
    super();
    const h = this.api.current()?.detail;
    if (h) {
      this.form.patchValue({
        ...h,
        phone: groupPhoneDigits(nationalPhone(h.phone)),
        mapUrl: h.mapUrl ?? "",
        openingTime: h.openingTime?.slice(0, 5) ?? "",
        closingTime: h.closingTime?.slice(0, 5) ?? "",
        checkInOutConditions: h.checkInOutConditions ?? "",
      });
      for (const card of h.stayCards)
        this.addCard(card.title, card.description, true);
    }
    this.saved = JSON.stringify(this.form.getRawValue());
    this.savedCards = JSON.stringify(this.cards.getRawValue());
  }
  addCard(title = "", description = "", restoring = false) {
    if (!restoring && this.cards.length >= 3) return;
    this.cards.push(
      this.fb.group({
        title: [title, [trimmedRequired, Validators.maxLength(200)]],
        description: [
          description,
          [trimmedRequired, Validators.maxLength(5000)],
        ],
      }),
    );
  }
  move(i: number, delta: number) {
    const card = this.cards.at(i);
    this.cards.removeAt(i);
    this.cards.insert(i + delta, card);
  }
  informationChanged() {
    return (
      !this.api.current() ||
      JSON.stringify(this.form.getRawValue()) !== this.saved
    );
  }
  cardsChanged() {
    return JSON.stringify(this.cards.getRawValue()) !== this.savedCards;
  }
  hasChanges() {
    return (
      JSON.stringify(this.form.getRawValue()) !== this.saved ||
      this.cardsChanged()
    );
  }
  async save() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set("");
    try {
      const v = this.form.getRawValue(),
        h = this.api.current()?.detail;
      const body: HotelWrite = {
        name: v.name.trim(),
        location: v.location.trim(),
        address: v.address.trim(),
        description: v.description.trim(),
        phone: phoneValue(v.phone),
        mapUrl: v.mapUrl.trim() || null,
        openingTime: v.openingTime || null,
        closingTime: v.closingTime || null,
        openingHours: null,
        checkInOutConditions: v.checkInOutConditions.trim() || null,
        latitude: h?.latitude ?? null,
        longitude: h?.longitude ?? null,
        hasParking: h?.hasParking ?? null,
        logoPath: h?.logoPath ?? null,
        facadePath: h?.facadePath ?? null,
        videoPath: h?.videoPath ?? null,
      };
      const create = !this.api.current();
      await this.api.saveHotel(body, create);
      this.saved = JSON.stringify(v);
      this.form.markAsPristine();
      this.notice.show(
        create ? "Hotel creado en borrador." : "Información guardada.",
      );
    } catch (e) {
      this.error.set(serverError(e, this.form));
    } finally {
      this.busy.set(false);
    }
  }
  async saveCards() {
    this.cards.markAllAsTouched();
    if (this.cards.invalid || this.busy()) return;
    this.busy.set(true);
    this.cardsError = "";
    try {
      await this.api.cards(
        this.cards.getRawValue().map((c) => ({
          title: c.title.trim(),
          description: c.description.trim(),
        })),
      );
      this.savedCards = JSON.stringify(this.cards.getRawValue());
      this.presentation.markAsPristine();
      this.notice.show("Presentación guardada.");
    } catch (e) {
      this.cardsError = serverError(e, this.presentation);
    } finally {
      this.busy.set(false);
    }
  }
}
