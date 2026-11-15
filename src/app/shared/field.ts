import { Component, input, effect, signal } from "@angular/core";
import { AbstractControl } from "@angular/forms";
import { controlMessage } from "../core/forms";
@Component({
  selector: "app-field-error",
  template: `@if (show()) {
    <span class="field-error" role="alert">{{ message() }}</span>
  }`,
})
export class FieldError {
  readonly control = input<AbstractControl | null>(null);
  readonly submitted = input(false);
  readonly revision = signal(0);
  constructor() {
    effect((onCleanup) => {
      const subscription = this.control()?.events.subscribe(() =>
        this.revision.update((n) => n + 1),
      );
      onCleanup(() => subscription?.unsubscribe());
    });
  }
  show() {
    this.revision();
    return (
      this.control()?.invalid && (this.control()?.touched || this.submitted())
    );
  }
  message() {
    this.revision();
    return controlMessage(this.control());
  }
}
