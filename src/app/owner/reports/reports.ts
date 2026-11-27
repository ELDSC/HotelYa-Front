import { DecimalPipe } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { Component, computed, inject, signal } from "@angular/core";
import type { ReportPeriod, ReservationReport } from "../../../types/reports";
import { todayInPeru } from "../../../utils/reservations";
import { Api } from "../../core/api";
import { serverError } from "../../core/forms";
import { ReportChart } from "./report-chart";
import { reportDate, reportGraphs } from "./report-charts";

@Component({
  imports: [DecimalPipe, ReportChart],
  templateUrl: "./reports.html",
  styleUrl: "./reports.scss",
})
export class Reports {
  private readonly api = inject(Api);
  readonly to = signal(todayInPeru());
  readonly from = signal(daysBefore(this.to(), 29));
  readonly report = signal<ReservationReport | null>(null);
  readonly graphs = computed(() => {
    const report = this.report();
    return report?.total ? reportGraphs(report) : [];
  });
  readonly loading = signal(false);
  readonly error = signal("");
  readonly exportError = signal("");
  readonly exporting = signal<"docx" | "pdf" | "xlsx" | null>(null);
  readonly dateLabel = reportDate;

  constructor() {
    void this.load();
  }

  async load(event?: Event) {
    event?.preventDefault();
    if (this.loading()) return;

    const period: ReportPeriod = { from: this.from(), to: this.to() };
    if (
      !validDate(period.from) ||
      !validDate(period.to) ||
      period.from > period.to
    ) {
      this.error.set(
        "Selecciona fechas válidas. La fecha final debe ser igual o posterior a la inicial.",
      );
      this.report.set(null);
      return;
    }
    this.loading.set(true);
    this.error.set("");
    this.exportError.set("");
    this.report.set(null);
    try {
      this.report.set(await this.api.reservationReport(period));
    } catch (error) {
      this.error.set(serverError(error));
    } finally {
      this.loading.set(false);
    }
  }

  async download(format: "docx" | "pdf" | "xlsx") {
    const report = this.report();
    if (!report || this.exporting() || (format !== "xlsx" && !report.total))
      return;

    const period: ReportPeriod = { from: report.from, to: report.to };
    this.exporting.set(format);
    this.exportError.set("");
    try {
      const blob =
        format === "xlsx"
          ? await this.api.reservationExcel(period)
          : await import("./report-documents").then(({ reportDocument }) =>
              reportDocument(format, report, reportGraphs(report)),
            );
      saveFile(
        blob,
        `${format === "xlsx" ? "reservas" : "reporte-reservas"}-${period.from}-${period.to}.${format}`,
      );
    } catch (error) {
      const message =
        error instanceof HttpErrorResponse && error.error instanceof Blob
          ? await error.error
              .text()
              .then(
                (body: string) =>
                  (JSON.parse(body) as { message?: string }).message,
              )
              .catch(() => undefined)
          : undefined;
      this.exportError.set(
        message ??
          "No se pudo generar el archivo. Intenta descargarlo de nuevo.",
      );
    } finally {
      this.exporting.set(null);
    }
  }
}

function daysBefore(date: string, days: number) {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - days);
  return day.toISOString().slice(0, 10);
}

function validDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= "1900-01-01";
}

function saveFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
