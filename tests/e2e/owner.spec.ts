import { execFileSync } from "node:child_process";
import { test, expect, Page } from "@playwright/test";
const backend = "http://127.0.0.1:8081";
async function navigate(page: Page, name: string) {
  if (page.viewportSize()!.width < 761)
    await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("link", { name, exact: true }).click();
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
  await dialog.getByLabel("Cantidad de horas").fill("2");
  await expect(dialog.locator(".inquiry-total")).toContainText("60.00");
  await expect(dialog).toContainText("25 % de descuento aplicado a la tarifa");
  await dialog.locator(".modal-content").screenshot({
    path: info.outputPath("consulta-ofertas.png"),
    animations: "disabled",
  });
  await page
    .context()
    .route("https://wa.me/**", (route) =>
      route.fulfill({ body: "Consulta de prueba" }),
    );
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    dialog.getByRole("button", { name: "Consultar por WhatsApp" }).click(),
  ]);
  const message = new URL(popup.url()).searchParams.get("text");
  expect(message).toMatch(/Tarifa: .*30.00 por hora/);
  expect(message).toMatch(/Total de referencia: .*60.00/);
  await popup.close();
  await page.getByRole("button", { name: "Cerrar consulta" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("public-detail.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.reload();
  await expect(page.locator(".hero-title")).toHaveText(name);
  await page.goto("/panel");
  await page.getByRole("switch", { name: "Hotel publicado" }).click();
  await expect(
    page.getByRole("switch", { name: "Hotel publicado" }),
  ).toHaveAttribute("aria-checked", "false");
  await navigate(page, "Habitaciones");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Eliminar tipo de habitación" })
    .click();
  await expect(page.locator(".room-list-item")).toHaveCount(0);
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
