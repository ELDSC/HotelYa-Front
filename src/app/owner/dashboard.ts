import { Component, inject, signal } from "@angular/core";
import { Api } from "../core/api";
import { Notice } from "./notice";
import { serverError } from "../core/forms";
@Component({
  template: `<section id="section-dashboard">
    <div class="settings-list">
      @if (api.current(); as hotel) {
        @for (setting of settings; track setting.key) {
          <div class="setting-row">
            <div class="setting-copy">
              <span class="setting-label">{{ setting.label }}</span>
              <div class="notice error" role="alert">
                {{ errors()[setting.key] }}
              </div>
            </div>
            <div class="setting-controls">
              <span class="setting-value">{{
                value(setting.key) ? "Sí" : "No"
              }}</span
              ><button
                class="setting-switch"
                role="switch"
                [attr.aria-label]="setting.label"
                [attr.aria-checked]="value(setting.key)"
                [disabled]="busy()"
                (click)="toggle(setting.key)"
              >
                <span class="switch-track"
                  ><span class="switch-thumb"></span
                ></span>
              </button>
            </div>
          </div>
        }
      }
    </div>
  </section>`,
})
export class Dashboard {
  readonly api = inject(Api);
  private notice = inject(Notice);
  readonly busy = signal(false);
  readonly errors = signal<Record<string, string>>({});
  readonly settings = [
    { key: "published", label: "Hotel publicado" },
    { key: "parking", label: "Estacionamiento" },
  ];
  value(key: string) {
    return key === "published"
      ? this.api.current()?.published === true
      : this.api.current()?.detail.hasParking === true;
  }
  async toggle(key: string) {
    if (this.busy() || !this.api.current()) return;
    this.busy.set(true);
    this.errors.set({});
    try {
      const next = !this.value(key);
      if (key === "published") await this.api.publish(next);
      else
        await this.api.saveHotel({
          ...this.api.current()!.detail,
          hasParking: next,
        });
      this.notice.show();
    } catch (e) {
      this.errors.set({ [key]: serverError(e) });
    } finally {
      this.busy.set(false);
    }
  }
}
