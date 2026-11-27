import { Component, inject, signal } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Api, RoomWrite } from "../core/api";
import {
  serverError,
  trimmedRequired,
  integer,
  availability,
  positiveMoney,
} from "../core/forms";
import {
  RoomTypeDetail,
  Photo,
  DetailKind,
  RateMode,
} from "../../types/catalog";
import { PhotoEditor } from "./photo-editor";
import { FieldError } from "../shared/field";
import { Editor } from "./editor";
import { Notice } from "./notice";
@Component({
  imports: [ReactiveFormsModule, PhotoEditor, FieldError],
  templateUrl: "./rooms.html",
})
export class Rooms extends Editor {
  readonly api = inject(Api);
  private fb = inject(FormBuilder).nonNullable;
  private notice = inject(Notice);
  readonly selected = signal<number | undefined>(undefined);
  readonly photos = signal<Photo[]>([]);
  private originalPhotos: Photo[] = [];
  private scope = "";
  private saved = "";
  readonly kinds = [
    { id: "FEATURE", label: "Característica" },
    { id: "SERVICE", label: "Servicio" },
    { id: "RECOMMENDATION", label: "Recomendación" },
    { id: "PROHIBITION", label: "Prohibición" },
  ];
  readonly details = this.fb.array<
    FormGroup<{ kind: FormControl<DetailKind>; text: FormControl<string> }>
  >([]);
  readonly rates = this.fb.array([
    this.rate("HOUR", "Por hora"),
    this.rate("PACKAGE", "Paquete de horas"),
    this.rate("NIGHT", "Por noche"),
  ]);
  readonly form = this.fb.group(
    {
      name: ["", [trimmedRequired, Validators.maxLength(200)]],
      description: ["", [trimmedRequired, Validators.maxLength(10000)]],
      displayOrder: [0, [Validators.required, Validators.min(0), integer]],
      totalUnits: new FormControl<number | null>(null, [
        Validators.required,
        Validators.min(0),
        integer,
      ]),
      availableUnits: new FormControl<number | null>(null, [
        Validators.required,
        Validators.min(0),
        integer,
      ]),
      details: this.details,
      rates: this.rates,
    },
    { validators: availability },
  );
  constructor() {
    super();
    this.edit(this.api.current()?.detail.roomTypes[0], true);
  }
  private rate(mode: RateMode, label: string) {
    return this.fb.group({
      mode: [mode],
      label: [label],
      active: [false],
      amount: new FormControl<number | null>(null),
      packageHours: new FormControl<number | null>(3),
    });
  }
  edit(room?: RoomTypeDetail, force = false) {
    if (
      !force &&
      (this.busy() ||
        (this.hasChanges() &&
          !confirm(
            "Hay cambios sin guardar en esta habitación. ¿Deseas descartarlos?",
          )))
    )
      return;
    this.selected.set(room?.id);
    this.scope = room?.code ?? `room-${crypto.randomUUID()}`;
    this.photos.set(structuredClone(room?.photos ?? []));
    this.originalPhotos = structuredClone(room?.photos ?? []);
    this.details.clear();
    for (const d of room?.details ?? []) this.addDetail(d.kind, d.text);
    this.form.patchValue({
      name: room?.name ?? "",
      description: room?.description ?? "",
      displayOrder: room
        ? this.api
            .current()!
            .detail.roomTypes.findIndex((r) => r.id === room.id)
        : (this.api.current()?.detail.roomTypes.length ?? 0),
      totalUnits: room?.totalUnits ?? null,
      availableUnits: room?.availableUnits ?? null,
    });
    for (const rate of this.rates.controls) {
      const existing = room?.rates.find(
        (r) => r.mode === rate.controls.mode.value,
      );
      rate.patchValue({
        active: !!existing,
        amount: existing?.amount ?? null,
        packageHours: existing?.packageHours ?? 3,
      });
      this.syncRate(rate);
    }
    this.form.markAsPristine();
    this.error.set("");
    this.saved = this.snapshot();
  }
  syncRate(rate: (typeof this.rates.controls)[number]) {
    const active = rate.controls.active.value;
    rate.controls.amount.setValidators(
      active ? [Validators.required, positiveMoney] : [],
    );
    rate.controls.packageHours.setValidators(
      active && rate.controls.mode.value === "PACKAGE"
        ? [Validators.required, Validators.min(1), integer]
        : [],
    );
    rate.controls.amount.updateValueAndValidity();
    rate.controls.packageHours.updateValueAndValidity();
  }
  addDetail(kind: DetailKind = "FEATURE", text = "") {
    if (this.details.length >= 100) return;
    this.details.push(
      this.fb.group({
        kind: [kind, Validators.required],
        text: [text, [trimmedRequired, Validators.maxLength(5000)]],
      }),
    );
  }
  movePhoto(i: number, delta: number) {
    this.photos.update((photos) => {
      const next = [...photos];
      [next[i], next[i + delta]] = [next[i + delta], next[i]];
      return next;
    });
  }
  private snapshot() {
    return JSON.stringify([this.form.getRawValue(), this.photos()]);
  }
  hasChanges() {
    return this.snapshot() !== this.saved;
  }
  async upload(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = [...(input.files ?? [])];
    if (!files.length || this.busy()) return;
    if (this.photos().length + files.length > 50) {
      this.error.set("Máximo 50 fotografías.");
      return;
    }
    this.busy.set(true);
    try {
      for (const file of files) {
        const saved = await this.api.upload(file, this.scope);
        this.photos.update((items) => [
          ...items,
          {
            path: saved.path,
            altText: "Habitación " + this.form.controls.name.value,
          },
        ]);
      }
      this.notice.show(
        "Fotografías subidas. Guarda la habitación para confirmar.",
      );
    } catch (e) {
      this.error.set(serverError(e, this.form, (path) => this.errorPath(path)));
    } finally {
      this.busy.set(false);
      input.value = "";
    }
  }
  removePhoto(i: number) {
    this.photos.update((p) => p.filter((_, n) => n !== i));
  }
  async cleanup(photos: Photo[]) {
    const paths = [
      ...new Set(
        photos.map((p) => p.path).filter((p) => p.startsWith("/api/media/")),
      ),
    ];
    const results = await Promise.allSettled(
      paths.map((p) => this.api.deleteMedia(p)),
    );
    return results.every((r) => r.status === "fulfilled");
  }
  private errorPath(path: string) {
    return path.replace(/^rates\.(\d+)/, (_, index: string) => {
      const active = this.rates.controls
        .map((rate, i) => ({ active: rate.controls.active.value, index: i }))
        .filter((rate) => rate.active);
      return "rates." + (active[Number(index)]?.index ?? index);
    });
  }
  async save() {
    this.form.markAllAsTouched();
    if (this.busy() || this.form.invalid) return;
    this.busy.set(true);
    this.error.set("");
    try {
      const v = this.form.getRawValue();
      const body: RoomWrite = {
        name: v.name.trim(),
        description: v.description.trim(),
        displayOrder: v.displayOrder,
        totalUnits: v.totalUnits,
        availableUnits: v.availableUnits,
        photoScope: this.scope,
        photos: this.photos().map((p) => ({ path: p.path })),
        details: v.details.map((d) => ({ kind: d.kind, text: d.text.trim() })),
        rates: v.rates
          .filter((r) => r.active)
          .map((r) => ({
            mode: r.mode,
            amount: r.amount!,
            packageHours: r.mode === "PACKAGE" ? r.packageHours : null,
          })),
      };
      const ids = this.api.current()!.detail.roomTypes.map((r) => r.id);
      const data = await this.api.saveRoom(body, this.selected());
      const clean = await this.cleanup(
        this.originalPhotos.filter(
          (p) => !this.photos().some((n) => n.path === p.path),
        ),
      );
      const selected = data.detail.roomTypes.find((r) =>
        this.selected() === undefined
          ? !ids.includes(r.id)
          : r.id === this.selected(),
      );
      this.edit(selected, true);
      this.notice.show(
        clean
          ? "Tipo de habitación guardado."
          : "Habitación guardada. No pudimos eliminar algún archivo retirado.",
      );
    } catch (e) {
      this.error.set(serverError(e, this.form, (path) => this.errorPath(path)));
    } finally {
      this.busy.set(false);
    }
  }
  async remove() {
    const id = this.selected();
    if (
      id === undefined ||
      this.busy() ||
      !confirm(
        `¿Eliminar ${this.form.controls.name.value} y sus fotos asociadas, detalles y tarifas?`,
      )
    )
      return;
    this.busy.set(true);
    try {
      await this.api.deleteRoom(id);
      const clean = await this.cleanup([
        ...this.originalPhotos,
        ...this.photos(),
      ]);
      this.edit(undefined, true);
      this.notice.show(
        clean
          ? "Tipo de habitación eliminado."
          : "Tipo de habitación eliminado. No pudimos eliminar algún archivo asociado.",
      );
    } catch (e) {
      this.error.set(serverError(e, this.form, (path) => this.errorPath(path)));
    } finally {
      this.busy.set(false);
    }
  }
}
