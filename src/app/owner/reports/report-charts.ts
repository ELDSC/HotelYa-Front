import Chart from "chart.js/auto";
import type { ChartConfiguration, ChartOptions } from "chart.js";
import type { ReservationReport } from "../../../types/reports";
import type { RateMode } from "../../../types/catalog";
import { reservationModeLabel } from "../../../utils/reservations";

type Count = { label: string; count: number };
type DailySeries = {
  first: number;
  last: number;
  points: { x: number; y: number }[];
};

export type ReportGraph = {
  id: string;
  title: string;
  description: string;
  rows: Count[];
} & (
  | { kind: "line"; daily: DailySeries }
  | { kind: "bar" | "horizontal" | "doughnut" }
);

const dayMilliseconds = 86_400_000;
const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeZone: "UTC",
});
const tickFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const monthFormatter = new Intl.DateTimeFormat("es-PE", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});
const numberFormatter = new Intl.NumberFormat("es-PE");
const green = "#28765a";
const modeColors = [green, "#355d9d", "#b36a25"];

function dayNumber(date: string) {
  return Date.parse(`${date}T00:00:00Z`) / dayMilliseconds;
}

export function reportDate(date: string) {
  return dateFormatter.format(dayNumber(date) * dayMilliseconds);
}

function dailySeries(report: ReservationReport): DailySeries {
  const first = dayNumber(report.from);
  const last = dayNumber(report.to);
  const points: DailySeries["points"] = [];
  // Two zeroes describe a gap of any length without allocating one entry per day.
  let previous = first - 1;
  for (const item of report.byDate) {
    const day = dayNumber(item.date);
    if (previous + 1 < day) points.push({ x: previous + 1, y: 0 });
    if (previous + 2 < day) points.push({ x: day - 1, y: 0 });
    points.push({ x: day, y: item.count });
    previous = day;
  }
  if (previous < last) points.push({ x: previous + 1, y: 0 });
  if (previous + 1 < last) points.push({ x: last, y: 0 });
  return { first, last, points };
}

export function reportGraphs(report: ReservationReport): ReportGraph[] {
  const hours = new Map(report.byHour.map(({ hour, count }) => [hour, count]));
  const weekdays = new Map(
    report.byWeekday.map(({ weekday, count }) => [weekday, count]),
  );
  const modes = new Map(report.byMode.map(({ mode, count }) => [mode, count]));
  const nameUses = new Map<string, number>();
  for (const { name } of report.byRoom)
    nameUses.set(name, (nameUses.get(name) ?? 0) + 1);
  const rooms = report.byRoom
    .slice(0, 10)
    .map(({ name, roomTypeId, count }) => ({
      label: nameUses.get(name) === 1 ? name : `${name} (#${roomTypeId})`,
      count,
    }));
  if (report.byRoom.length > 10) {
    rooms.push({
      label: "Otros tipos",
      count: report.byRoom
        .slice(10)
        .reduce((total, room) => total + room.count, 0),
    });
  }

  return [
    {
      id: "por-fecha",
      kind: "line",
      title: "Reservas por fecha",
      description:
        "Cuenta las reservas confirmadas que comienzan en cada fecha del período.",
      daily: dailySeries(report),
      rows: report.byDate.map(({ date, count }) => ({
        label: reportDate(date),
        count,
      })),
    },
    {
      id: "por-hora",
      kind: "bar",
      title: "Horas de llegada más reservadas",
      description:
        "Agrupa las reservas por su hora de llegada en Perú, desde las 00:00 hasta las 23:00.",
      rows: Array.from({ length: 24 }, (_, hour) => ({
        label: `${String(hour).padStart(2, "0")}:00`,
        count: hours.get(hour) ?? 0,
      })),
    },
    {
      id: "por-dia",
      kind: "bar",
      title: "Reservas por día de la semana",
      description:
        "Suma las llegadas de todos los lunes del período, de todos los martes y así hasta el domingo.",
      rows: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(
        (label, index) => ({
          label,
          count: weekdays.get(index + 1) ?? 0,
        }),
      ),
    },
    {
      id: "por-habitacion",
      kind: "horizontal",
      title: "Tipos de habitación más reservados",
      description:
        "Ordena los tipos por cantidad de reservas. Si hay más de diez, reúne los restantes en Otros tipos.",
      rows: rooms,
    },
    {
      id: "por-modalidad",
      kind: "doughnut",
      title: "Reservas por modalidad",
      description:
        "Muestra qué parte del total corresponde a reservas por hora, por paquete de horas y por noche.",
      rows: (
        ["HOUR", "PACKAGE", "NIGHT"] as const satisfies readonly RateMode[]
      ).map((mode) => ({
        label: reservationModeLabel[mode],
        count: modes.get(mode) ?? 0,
      })),
    },
  ];
}

export function createReportChart(
  canvas: HTMLCanvasElement,
  graph: ReportGraph,
  responsive = true,
) {
  const doughnut = graph.kind === "doughnut";
  const horizontal = graph.kind === "horizontal";
  const total = doughnut
    ? graph.rows.reduce((sum, row) => sum + row.count, 0)
    : 0;
  const percentage = (count: number) =>
    `${total ? Math.round((count * 100) / total) : 0} %`;
  const countAxis = {
    beginAtZero: true,
    ticks: { precision: 0, maxTicksLimit: 6 },
  };
  const options: ChartOptions = {
    responsive,
    devicePixelRatio: responsive ? undefined : 1,
    maintainAspectRatio: false,
    animation: false,
    color: "#3c4a43",
    font: { size: responsive ? 12 : 16, family: "Arial, sans-serif" },
    plugins: {
      legend: {
        display: doughnut,
        position: "bottom",
        labels: { usePointStyle: true },
      },
      tooltip: {
        callbacks: {
          title: ([item]) => {
            if (!item) return "";
            return graph.kind === "line"
              ? dateFormatter.format(
                  graph.daily.points[item.dataIndex].x * dayMilliseconds,
                )
              : graph.rows[item.dataIndex].label;
          },
          label: ({ dataIndex }) => {
            const count =
              graph.kind === "line"
                ? graph.daily.points[dataIndex].y
                : graph.rows[dataIndex].count;
            return `Reservas: ${numberFormatter.format(count)}${doughnut ? ` (${percentage(count)})` : ""}`;
          },
        },
      },
    },
  };
  const configuration: ChartConfiguration =
    graph.kind === "line"
      ? {
          type: "line",
          data: {
            datasets: [
              {
                data: graph.daily.points,
                borderColor: green,
                backgroundColor: green,
                pointRadius: graph.daily.points.length > 60 ? 0 : 3,
                pointHitRadius: 10,
              },
            ],
          },
          options: {
            ...options,
            scales: {
              x: {
                type: "linear",
                min: graph.daily.first,
                max: Math.max(graph.daily.first + 1, graph.daily.last),
                ticks: {
                  precision: 0,
                  maxTicksLimit: 6,
                  maxRotation: 0,
                  callback: (value) =>
                    Number(value) > graph.daily.last
                      ? ""
                      : (graph.daily.last - graph.daily.first > 370
                          ? monthFormatter
                          : tickFormatter
                        ).format(Number(value) * dayMilliseconds),
                },
              },
              y: countAxis,
            },
          },
        }
      : {
          type: doughnut ? "doughnut" : "bar",
          data: {
            labels: graph.rows.map(({ label, count }) =>
              doughnut ? `${label} · ${percentage(count)}` : label,
            ),
            datasets: [
              {
                data: graph.rows.map(({ count }) => count),
                backgroundColor: doughnut ? modeColors : green,
                borderRadius: doughnut ? 0 : 4,
              },
            ],
          },
          options: doughnut
            ? options
            : {
                ...options,
                indexAxis: horizontal ? "y" : "x",
                scales: horizontal
                  ? {
                      x: countAxis,
                      y: {
                        grid: { display: false },
                        ticks: {
                          autoSkip: false,
                          callback: (value) => {
                            const label = graph.rows[Number(value)].label;
                            const maxLength = responsive ? 18 : 37;
                            return label.length > maxLength
                              ? `${label.slice(0, maxLength - 1)}…`
                              : label;
                          },
                        },
                      },
                    }
                  : {
                      x: {
                        grid: { display: false },
                        ticks: {
                          maxRotation: 0,
                          autoSkip: responsive,
                          font: { size: responsive ? 12 : 14 },
                        },
                      },
                      y: countAxis,
                    },
              },
        };
  return new Chart(canvas, configuration);
}
