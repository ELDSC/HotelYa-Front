import { Component, inject } from "@angular/core";
import { Api } from "../core/api";
import { MediaPreview } from "../shared/media-preview";
import { serverError } from "../core/forms";
import { Editor } from "./editor";
import { Notice } from "./notice";
@Component({
  imports: [MediaPreview],
  template: `<section id="section-media">
    <div class="editor-card hotel-media">
      @for (field of fields; track field.key) {
        <div class="hotel-media-row" [attr.data-media]="field.key">
          <div class="hotel-media-copy">
            <h2>{{ field.label }}</h2>
            <p class="muted">
              {{
                field.video
                  ? "MP4 · Hasta 100 MB"
                  : "JPEG, PNG o WebP · Hasta 10 MB"
              }}
            </p>
          </div>
          <div class="identity-preview">
            @if (path(field.key); as source) {
              <app-media-preview
                [path]="source"
                [private]="true"
                [video]="field.video"
                [alt]="field.label"
              />
            } @else {
              <span class="muted">Sin archivo</span>
            }
          </div>
          <div class="compact-actions">
            <input
              #file
              type="file"
              [accept]="
                field.video ? 'video/mp4' : 'image/jpeg,image/png,image/webp'
              "
              [attr.aria-label]="'Subir ' + field.label.toLowerCase()"
              class="sr-only"
              (change)="choose(field.key, $event)"
            /><button
              class="secondary"
              [disabled]="busy()"
              (click)="
                pending[field.key]
                  ? save(field.key, pending[field.key]!)
                  : file.click()
              "
            >
              {{
                pending[field.key]
                  ? "Reintentar"
                  : path(field.key)
                    ? "Cambiar archivo"
                    : "Subir archivo"
              }}
            </button>
            @if (pending[field.key]) {
              <button
                class="secondary"
                [disabled]="busy()"
                (click)="file.click()"
              >
                Elegir otro archivo
              </button>
            }
            @if (path(field.key)) {
              <button
                class="danger"
                [disabled]="busy()"
                (click)="save(field.key, null)"
              >
                Eliminar
              </button>
            }
          </div>
          <p class="notice error" role="alert">{{ errors[field.key] }}</p>
        </div>
      }
    </div>
  </section>`,
})
export class Media extends Editor {
  readonly api = inject(Api);
  private notice = inject(Notice);
  readonly fields = [
    { key: "logoPath", label: "Logo", video: false },
    { key: "facadePath", label: "Portada", video: false },
    { key: "videoPath", label: "Video", video: true },
  ] as const;
  pending: Record<string, File | null> = {};
  errors: Record<string, string> = {};
  hasChanges() {
    return Object.values(this.pending).some(Boolean);
  }
  path(key: "logoPath" | "facadePath" | "videoPath") {
    return this.api.current()?.detail[key];
  }
  choose(key: "logoPath" | "facadePath" | "videoPath", event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.pending[key] = file;
      void this.save(key, file);
    }
    input.value = "";
  }
  async save(key: "logoPath" | "facadePath" | "videoPath", file: File | null) {
    if (this.busy() || !this.api.current()) return;
    this.busy.set(true);
    this.errors[key] = "";
    let uploaded: string | null = null;
    const previous = this.path(key);
    try {
      if (file) uploaded = (await this.api.upload(file)).path;
      await this.api.saveHotel({
        ...this.api.current()!.detail,
        [key]: uploaded,
      });
      this.pending[key] = null;
      if (
        previous &&
        previous !== uploaded &&
        previous.startsWith("/api/media/")
      ) {
        try {
          await this.api.deleteMedia(previous);
        } catch {
          this.notice.show(
            "Archivo guardado. No pudimos eliminar el archivo anterior.",
          );
          return;
        }
      }
      this.notice.show(
        `${this.fields.find((f) => f.key === key)!.label} ${file ? "guardado" : "eliminado"} correctamente.`,
      );
    } catch (e) {
      if (uploaded) await this.api.deleteMedia(uploaded).catch(() => null);
      this.errors[key] = serverError(e);
    } finally {
      this.busy.set(false);
    }
  }
}
