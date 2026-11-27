import { Component, input, output } from "@angular/core";
import { Photo } from "../../types/catalog";
import { MediaPreview } from "../shared/media-preview";
@Component({
  selector: "app-photo-editor",
  imports: [MediaPreview],
  template: `<div class="room-photo-grid">
    @for (photo of photos(); track photo.path; let i = $index) {
      <figure class="room-photo">
        <app-media-preview
          [path]="photo.path"
          [private]="true"
          [alt]="photo.altText"
        />
        <figcaption class="photo-caption">
          {{ i === 0 ? "Portada" : "Foto " + (i + 1) }}
        </figcaption>
        <div class="photo-actions">
          <button
            type="button"
            class="icon-button"
            aria-label="Mover foto arriba"
            [disabled]="i === 0"
            (click)="reordered.emit({ index: i, direction: -1 })"
          >
            ←</button
          ><button
            type="button"
            class="icon-button"
            aria-label="Mover foto abajo"
            [disabled]="i === photos().length - 1"
            (click)="reordered.emit({ index: i, direction: 1 })"
          >
            →</button
          ><button
            type="button"
            class="icon-button remove-icon"
            [attr.aria-label]="'Eliminar fotografía ' + (i + 1)"
            (click)="removed.emit(i)"
          >
            ×
          </button>
        </div>
      </figure>
    }
  </div>`,
})
export class PhotoEditor {
  readonly photos = input.required<Photo[]>();
  readonly reordered = output<{ index: number; direction: number }>();
  readonly removed = output<number>();
}
