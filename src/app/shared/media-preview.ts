import {
  Component,
  input,
  inject,
  effect,
  signal,
  OnDestroy,
} from "@angular/core";
import { Api } from "../core/api";
@Component({
  selector: "app-media-preview",
  template: `<div class="media-preview">
    @if (url(); as source) {
      @if (video()) {
        <video
          [src]="source"
          controls
          preload="metadata"
          [attr.aria-label]="alt()"
        ></video>
      } @else {
        <img
          [src]="source"
          [alt]="alt()"
          [loading]="priority() ? 'eager' : 'lazy'"
        />
      }
    } @else {
      <span role="status">{{
        error() ? "No pudimos cargar el archivo." : "Cargando archivo…"
      }}</span>
    }
  </div>`,
})
export class MediaPreview implements OnDestroy {
  readonly path = input.required<string>();
  readonly priority = input(false);
  readonly video = input(false);
  readonly alt = input("Archivo del hotel");
  readonly private = input(false);
  readonly url = signal<string | null>(null);
  readonly error = signal(false);
  private api = inject(Api);
  private objectUrl: string | null = null;
  private generation = 0;
  constructor() {
    effect(() => {
      const path = this.path(),
        priv = this.private();
      const n = ++this.generation;
      this.release();
      this.url.set(null);
      this.error.set(false);
      if (priv && path.startsWith("/api/media/"))
        void this.api
          .blob(path)
          .then((blob) => {
            if (n !== this.generation) return;
            this.objectUrl = URL.createObjectURL(blob);
            this.url.set(this.objectUrl);
          })
          .catch(() => {
            if (n === this.generation) this.error.set(true);
          });
      else this.url.set(this.api.asset(path));
    });
  }
  private release() {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }
  ngOnDestroy() {
    ++this.generation;
    this.release();
  }
}
