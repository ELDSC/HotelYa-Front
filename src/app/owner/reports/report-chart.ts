import { Component, ElementRef, effect, input, viewChild } from "@angular/core";
import { DecimalPipe } from "@angular/common";
import { createReportChart, type ReportGraph } from "./report-charts";

@Component({
  selector: "app-report-chart",
  imports: [DecimalPipe],
  template: `
    <article class="report-chart" [attr.aria-labelledby]="graph().id">
      <h2 [id]="graph().id">{{ graph().title }}</h2>
      <p>{{ graph().description }}</p>
      <div class="plot">
        <canvas #plot role="img" [attr.aria-label]="graph().title"></canvas>
      </div>
      <details>
        <summary>Ver datos del gráfico</summary>
        <div class="data-table">
          <table [attr.aria-label]="graph().title">
            <thead>
              <tr>
                <th scope="col">Grupo</th>
                <th scope="col">Reservas</th>
              </tr>
            </thead>
            <tbody>
              @for (row of graph().rows; track $index) {
                <tr>
                  <th scope="row">{{ row.label }}</th>
                  <td>{{ row.count | number }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </details>
    </article>
  `,
  styleUrl: "./report-chart.scss",
})
export class ReportChart {
  readonly graph = input.required<ReportGraph>();
  private readonly plot = viewChild<ElementRef<HTMLCanvasElement>>("plot");

  constructor() {
    effect((onCleanup) => {
      const canvas = this.plot();
      if (!canvas) return;
      const chart = createReportChart(canvas.nativeElement, this.graph());
      onCleanup(() => chart.destroy());
    });
  }
}
