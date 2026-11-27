import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { test, expect, Page } from "@playwright/test";
import { todayInPeru } from "../../src/utils/reservations";
const backend = "http://127.0.0.1:8081";
async function navigate(page: Page, name: string) {
  const mobile = page.viewportSize()!.width < 761;
  const mobilePanel = page.locator("ngb-offcanvas-panel");
  if (mobile) {
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await expect(mobilePanel.getByRole("navigation")).toHaveCSS(
      "flex-direction",
      "column",
    );
  }
  await page.getByRole("link", { name, exact: true }).click();
  if (mobile) await expect(mobilePanel).toBeHidden();
}
test.beforeAll(() => {
  execFileSync("../HotelYa-Back/scripts/clean-browser-test-data.sh", {
    stdio: "pipe",
  });
});
test.afterAll(() => {
  execFileSync("../HotelYa-Back/scripts/clean-browser-test-data.sh", {
    stdio: "pipe",
  });
});
test("real owner: register, draft, rooms, uploads, private preview, publication and logout", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://fonts.googleapis.com/**", (r) =>
    r.fulfill({ contentType: "text/css", body: "" }),
  );
  const suffix = Date.now() + "-" + info.project.name;
  const email = `angular-${suffix}@example.com`,
    name = "Hotel Vista Lima";
  await page.goto("/acceder");
  await page
    .locator(".auth-tabs")
    .getByRole("button", { name: "Crear cuenta", exact: true })
    .click();
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña *", { exact: true }).fill("password123");
  await page.getByLabel("Confirmar contraseña").fill("password123");
  await page
    .locator("form")
    .getByRole("button", { name: "Crear cuenta", exact: true })
    .click();
  await expect(page).toHaveURL(/5174\/$/);
  await page.getByRole("button", { name: "Mi perfil" }).click();
  await expect(
    page.getByRole("link", { name: "Mis reservas", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Crear un hotel", exact: true }).click();
  await expect(page).toHaveURL(/panel\/informacion$/);
  await page.getByLabel("Nombre del hotel *").fill(name);
  await page.getByLabel("Zona o distrito *").fill("Lima");
  await page.getByLabel("Dirección *").fill("Av. Universidad 123");
  await page
    .getByLabel("Descripción *", { exact: true })
    .fill("Hotel creado mediante el frontend Angular y la API real.");
  await page
    .getByLabel("Teléfono y WhatsApp", { exact: true })
    .fill("987654321");
  await expect(
    page.getByLabel("Teléfono y WhatsApp", { exact: true }),
  ).toHaveValue("987 654 321");
  await page.getByLabel("URL del lugar").fill("https://maps.example.com/hotel");
  await page.getByLabel("Entrada por noche").selectOption("14:00");
  await page.getByLabel("Salida por noche").selectOption("11:00");
  await page
    .getByRole("button", { name: "Crear mi hotel en borrador" })
    .click();
  await expect(page.locator("ngb-toast")).toContainText(
    "Hotel creado en borrador.",
  );
  await page.getByRole("button", { name: "Añadir tarjeta" }).click();
  await page
    .locator(".presentation-card")
    .getByLabel("Título *")
    .fill("Tu próxima estadía");
  await page
    .locator(".presentation-card")
    .getByLabel("Texto *")
    .fill("Descansa con comodidad.");
  await page.getByRole("button", { name: "Guardar presentación" }).click();
  await expect(page.locator("ngb-toast")).toContainText(
    "Presentación guardada.",
  );
  await navigate(page, "Habitaciones");
  await page.getByLabel("Nombre *", { exact: true }).fill("Suite matrimonial");
  await page
    .getByLabel("Descripción *", { exact: true })
    .fill("Habitación amplia con cama matrimonial y luz natural.");
  await page.getByLabel("Cantidad total *").fill("3");
  await page.getByLabel("Disponibles ahora *").fill("2");
  await page
    .getByRole("switch", { name: "Activar tarifa Por hora", exact: true })
    .check();
  await page.getByLabel("Precio Por hora", { exact: true }).fill("40");
  await page.getByLabel("Descuento Por hora", { exact: true }).fill("25");
  await page
    .getByRole("switch", { name: "Activar tarifa Paquete de horas" })
    .check();
  await page.getByLabel("Precio Paquete de horas").fill("80");
  await page.getByLabel("Descuento Paquete de horas").fill("15");
  await page.getByRole("switch", { name: "Activar tarifa Por noche" }).check();
  await page.getByLabel("Precio Por noche").fill("120");
  await page
    .getByLabel("Subir fotografías", { exact: true })
    .setInputFiles([
      "public/assets/images/lumis-cuarto-matrimonial.jpg",
      "public/assets/images/lumis-cuarto-premium.jpg",
    ]);
  await expect(page.locator(".room-photo")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Guardar cambios", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Mover foto abajo" }).first().click();
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.locator("ngb-toast")).toContainText(
    "Tipo de habitación guardado.",
  );
  await expect(page.locator(".room-list-item")).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByLabel("Descuento Por hora", { exact: true }),
  ).toHaveValue("25");
  await expect(page.getByLabel("Descuento Paquete de horas")).toHaveValue("15");
  await expect(page.getByLabel("Descuento Por noche")).toHaveValue("");
  await page
    .getByRole("heading", { name: "Tarifas", exact: true })
    .locator("..")
    .screenshot({
      path: info.outputPath("editor-ofertas.png"),
      animations: "disabled",
    });
  await navigate(page, "Multimedia");
  await page
    .getByLabel("Subir logo", { exact: true })
    .setInputFiles("public/assets/images/lumis-hotel-logo.jpg");
  await expect(page.locator("ngb-toast")).toContainText(
    "Logo guardado correctamente.",
  );
  await page
    .getByLabel("Subir portada", { exact: true })
    .setInputFiles("public/assets/images/lumis-hotel-fachada.jpg");
  await expect(page.locator("ngb-toast")).toContainText(
    "Portada guardado correctamente.",
  );
  await page
    .getByLabel("Subir video", { exact: true })
    .setInputFiles("../HotelYa-Back/src/test/resources/media/valid.mp4");
  await expect(page.locator("ngb-toast")).toContainText(
    "Video guardado correctamente.",
  );
  await page.goto("/panel/vista-previa");
  await expect(page.locator(".catalog-preview-banner")).toBeVisible();
  await expect(page.locator(".hero-title")).toHaveText(name);
  await expect(page.locator(".editorial-room-card")).toContainText(
    "Suite matrimonial",
  );
  await expect(page.locator(".editorial-room-image img")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("private-preview.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.goto("/panel");
  await page.getByRole("switch", { name: "Hotel publicado" }).click();
  await expect(
    page.getByRole("switch", { name: "Hotel publicado" }),
  ).toHaveAttribute("aria-checked", "true");
  await page.goto("/");
  await page
    .locator(".hotel-card")
    .filter({ hasText: name })
    .getByRole("link", { name: "Ver hotel" })
    .click();
  await expect(page.locator(".hero-title")).toHaveText(name);
  const rates = page.locator(".catalog-rate-option");
  await expect(rates.nth(0)).toContainText("25 % de descuento");
  await expect(rates.nth(0)).toContainText("30.00");
  await expect(rates.nth(1)).toContainText("15 % de descuento");
  await expect(rates.nth(1)).toContainText("68.00");
  await expect(rates.nth(2)).toContainText("120.00");
  await expect(rates.nth(2).locator("del")).toHaveCount(0);
  await page.locator(".editorial-room-card").screenshot({
    path: info.outputPath("ficha-ofertas.png"),
    animations: "disabled",
    style: "#mainHeader { visibility: hidden; }",
  });

  await rates.first().click();
  const dialog = page.getByRole("dialog");
  const confirmReservation = dialog.getByRole("button", {
    name: "Confirmar reserva",
  });
  await expect(confirmReservation).toBeInViewport();
  await dialog.getByLabel("Cantidad de horas").fill("2");
  await expect(dialog.locator(".inquiry-total")).toContainText("60.00");
  await dialog.getByRole("button", { name: "Fecha de llegada" }).click();
  const calendar = dialog.locator("ngb-datepicker");
  await expect(calendar).toBeVisible();
  await calendar
    .locator('[role="gridcell"]:not([aria-disabled="true"])')
    .nth(1)
    .click();
  await dialog.locator(".booking-slots button:not(:disabled)").first().click();
  await dialog.locator(".modal-content").screenshot({
    path: info.outputPath("reserva-horarios.png"),
    animations: "disabled",
  });
  await confirmReservation.click();
  await expect(
    page.getByRole("heading", { name: "Comprobante de reserva" }),
  ).toBeVisible();
  await expect(page.locator(".reservation-receipt")).toContainText(name);
  await expect(page.locator(".reservation-receipt")).toContainText("60.00");
  await expect(
    page.getByRole("button", { name: "Imprimir o guardar como PDF" }),
  ).toBeVisible();
  const receiptCode = await page
    .locator(".reservation-receipt .code")
    .textContent();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#mainHeader")).toBeHidden();
  await expect(page.locator(".reservation-receipt")).toBeVisible();
  await page.emulateMedia({ media: "screen" });
  await page.screenshot({
    path: info.outputPath("comprobante.png"),
    fullPage: true,
  });
  await page.goto("/mis-reservas");
  await page.getByRole("link", { name: "Ver comprobante" }).click();
  await expect(page.locator(".reservation-receipt .code")).toHaveText(
    receiptCode!,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("mis-reservas.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.reload();
  await expect(page.locator(".reservation-receipt .code")).toHaveText(
    receiptCode!,
  );
  const otherSession = await browser.newContext({
    baseURL: new URL(page.url()).origin,
  });
  try {
    const guestPage = await otherSession.newPage();
    await guestPage.goto(`/mis-reservas/${receiptCode}`);
    await expect(guestPage).toHaveURL(/acceder\?next=/);
    await guestPage.getByLabel("Correo electrónico").fill(email);
    await guestPage.getByLabel("Contraseña *").fill("password123");
    await guestPage
      .locator("form")
      .getByRole("button", { name: "Ingresar" })
      .click();
    await expect(guestPage.locator(".reservation-receipt .code")).toHaveText(
      receiptCode!,
    );
    await guestPage.getByRole("button", { name: "Mi perfil" }).click();
    await guestPage.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(guestPage).toHaveURL(/5174\/$/);
    await expect(
      guestPage.getByRole("link", { name: "Acceder", exact: true }),
    ).toBeVisible();
  } finally {
    await otherSession.close();
  }
  await page.getByRole("button", { name: "Mi perfil" }).click();
  await page.getByRole("link", { name: "Mi panel", exact: true }).click();
  await navigate(page, "Reservas");
  await expect(page.locator(".reservation-list")).toContainText(email);
  await expect(page.locator(".reservation-list")).toContainText(receiptCode!);
  await page.screenshot({ path: info.outputPath("reservas-panel.png") });
  await navigate(page, "Reportes");
  const reportEnd = new Date(`${todayInPeru()}T00:00:00Z`);
  reportEnd.setUTCDate(reportEnd.getUTCDate() + 3);
  await page.getByLabel("Hasta").fill(reportEnd.toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Aplicar filtro" }).click();
  await expect(
    page.getByRole("heading", { name: "1 reserva confirmada" }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(5);
  const [excel] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Descargar Excel" }).click(),
  ]);
  const workbook = info.outputPath(excel.suggestedFilename());
  await excel.saveAs(workbook);
  expect((await readFile(workbook)).subarray(0, 2).toString()).toBe("PK");
  await navigate(page, "Inicio");
  await page.getByRole("switch", { name: "Hotel publicado" }).click();
  await expect(
    page.getByRole("switch", { name: "Hotel publicado" }),
  ).toHaveAttribute("aria-checked", "false");
  await navigate(page, "Habitaciones");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Eliminar tipo de habitación" })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Este tipo de habitación tiene reservas vigentes." }),
  ).toBeVisible();
  await expect(page.locator(".room-list-item")).toHaveCount(1);
  await navigate(page, "Multimedia");
  for (const key of ["logoPath", "facadePath", "videoPath"]) {
    const row = page.locator(`[data-media="${key}"]`);
    await row.getByRole("button", { name: "Eliminar", exact: true }).click();
    await expect(row.getByText("Sin archivo")).toBeVisible();
  }
  if (page.viewportSize()!.width < 761)
    await page.getByRole("button", { name: "Abrir menú" }).click();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/acceder$/);
  await page.goto("/panel");
  await expect(page).toHaveURL(/acceder\?next=/);
  expect(errors).toEqual([]);
});
test("real login failure preserves values and button geometry", async ({
  page,
}, info) => {
  await page.goto("/acceder");
  await page.getByLabel("Correo electrónico").fill("invalid@example.com");
  await page.getByLabel("Contraseña *", { exact: true }).fill("wrong-password");
  const button = page.locator("form button[type=submit]");
  const before = await button.boundingBox();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route(`${backend}/api/auth/login`, async (route) => {
    await gate;
    await route.continue();
  });
  await button.click();
  await expect(button).toHaveAttribute("aria-busy", "true");
  await expect(button.locator(".spinner")).toBeVisible();
  expect(await button.boundingBox()).toEqual(before);
  release();
  await expect(page.getByRole("alert")).toHaveText(
    "Correo o contraseña incorrectos.",
  );
  await expect(page.getByLabel("Correo electrónico")).toHaveValue(
    "invalid@example.com",
  );
  await expect(page.getByLabel("Contraseña *", { exact: true })).toHaveValue(
    "wrong-password",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("access.png"),
    fullPage: true,
  });
});
