import { readFile } from "node:fs/promises";
import type { ReservationReport } from "../../src/types/reports";
import { base } from "../environment";
import { test, expect, hotel, api } from "./fixtures";

const result: ReservationReport = {
  hotelName: hotel.name,
  from: "2026-11-01",
  to: "2026-11-14",
  total: 30,
  byDate: [
    { date: "2026-11-02", count: 4 },
    { date: "2026-11-03", count: 2 },
    { date: "2026-11-06", count: 3 },
    { date: "2026-11-07", count: 8 },
    { date: "2026-11-08", count: 6 },
    { date: "2026-11-09", count: 2 },
    { date: "2026-11-13", count: 5 },
  ],
  byWeekday: [
    { weekday: 1, count: 6 },
    { weekday: 2, count: 2 },
    { weekday: 5, count: 8 },
    { weekday: 6, count: 8 },
    { weekday: 7, count: 6 },
  ],
  byHour: [
    { hour: 10, count: 3 },
    { hour: 13, count: 2 },
    { hour: 14, count: 7 },
    { hour: 16, count: 4 },
    { hour: 19, count: 9 },
    { hour: 20, count: 5 },
  ],
  byRoom: [
    { roomTypeId: 1, name: "Matrimonial", count: 17 },
    { roomTypeId: 2, name: "Temática", count: 9 },
    { roomTypeId: 3, name: "Premium", count: 4 },
  ],
  byMode: [
    { mode: "HOUR", count: 12 },
    { mode: "PACKAGE", count: 10 },
    { mode: "NIGHT", count: 8 },
  ],
};

for (const width of [1280, 390]) {
  test(`owner reports filter and export at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.clock.setFixedTime(new Date("2026-11-26T20:00:00.000Z"));
    await page.route(`${api}/api/auth/refresh`, (route) =>
      route.fulfill({
        json: {
          accessToken: "owner-token",
          expiresIn: 600,
          user: { id: 1, email: "owner@example.com" },
        },
      }),
    );
    await page.route(`${api}/api/owner/hotel`, (route) =>
      route.fulfill({ json: { detail: hotel, published: true } }),
    );
    await page.route(
      `${api}/api/owner/hotel/reservations/report?*`,
      (route) => {
        expect(route.request().headers().authorization).toBe(
          "Bearer owner-token",
        );
        const params = new URL(route.request().url()).searchParams;
        const from = params.get("from");
        const to = params.get("to");
        const data =
          from === "2026-10-01"
            ? {
                ...result,
                total: 0,
                byDate: [],
                byWeekday: [],
                byHour: [],
                byRoom: [],
                byMode: [],
              }
            : result;
        return route.fulfill({ json: { ...data, from, to } });
      },
    );
    await page.route(
      `${api}/api/owner/hotel/reservations/export.xlsx?*`,
      (route) => {
        const params = new URL(route.request().url()).searchParams;
        expect(params.get("from")).toBe("2026-11-01");
        expect(params.get("to")).toBe("2026-11-14");
        return route.fulfill({
          body: "test-workbook",
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
      },
    );

    await page.goto(base + "panel");
    if (width < 761)
      await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.getByRole("link", { name: "Reportes", exact: true }).click();
    await expect(page).toHaveURL(/\/panel\/reportes$/);
    await expect(page.getByLabel("Desde")).toHaveValue("2026-10-28");
    await expect(page.getByLabel("Hasta")).toHaveValue("2026-11-26");
    await expect(
      page.getByRole("img", { name: "Reservas por fecha" }),
    ).toBeVisible();
    await page.getByLabel("Desde").fill("2026-11-01");
    await page.getByLabel("Hasta").fill("2026-11-14");
    await page.getByRole("button", { name: "Aplicar filtro" }).click();
    await expect(
      page.getByRole("heading", { name: "30 reservas confirmadas" }),
    ).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(5);
    await expect(page.locator("app-report-chart article > p")).toHaveCount(5);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`reportes-${width}.png`),
      fullPage: true,
    });

    await page
      .getByText("Ver datos del gráfico", { exact: true })
      .nth(3)
      .click();
    await expect(
      page.getByRole("row", { name: "Matrimonial 17" }),
    ).toBeVisible();
    const formats = width === 1280 ? ["Word", "PDF", "Excel"] : ["Excel"];
    const filenames: Record<string, string> = {
      Word: "reporte-reservas-2026-11-01-2026-11-14.docx",
      PDF: "reporte-reservas-2026-11-01-2026-11-14.pdf",
      Excel: "reservas-2026-11-01-2026-11-14.xlsx",
    };
    for (const format of formats) {
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 18000 }),
        page.getByRole("button", { name: `Descargar ${format}` }).click(),
      ]);
      expect(download.suggestedFilename()).toBe(filenames[format]);
      const file = info.outputPath(download.suggestedFilename());
      await download.saveAs(file);
      const marker =
        format === "Word" ? "PK" : format === "PDF" ? "%PDF" : "test-workbook";
      expect((await readFile(file)).subarray(0, marker.length).toString()).toBe(
        marker,
      );
    }

    await page.getByLabel("Desde").fill("2026-10-01");
    await page.getByLabel("Hasta").fill("2026-10-07");
    await page.getByRole("button", { name: "Aplicar filtro" }).click();
    await expect(
      page.getByText(
        "No hay reservas confirmadas con llegada en este período.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Descargar PDF" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Descargar Excel" }),
    ).toBeEnabled();
  });
}
