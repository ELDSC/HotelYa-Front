import { Injectable, signal } from "@angular/core";
@Injectable({ providedIn: "root" })
export class Notice {
  readonly message = signal("");
  readonly revision = signal(0);
  show(message = "Guardado correctamente.") {
    this.message.set(message);
    this.revision.update((n) => n + 1);
  }
}
