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
    name = `Hotel Angular ${suffix}`;
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
  await page.getByLabel("Nombre *", { exact: true }).fill("Suite Angular");
  await page
    .getByLabel("Descripción *", { exact: true })
    .fill("Suite con fotografías y tarifa real.");
  await page.getByLabel("Cantidad total *").fill("3");
  await page.getByLabel("Disponibles ahora *").fill("2");
  await page
    .getByRole("switch", { name: "Activar tarifa Por hora", exact: true })
    .check();
  await page.getByLabel("Precio Por hora", { exact: true }).fill("25.50");
  await page
    .getByLabel("Subir fotografías", { exact: true })
    .setInputFiles([
      "public/assets/images/logoHoteleriasYa.png",
      "public/assets/images/hero1.jpg",
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
  await navigate(page, "Multimedia");
  await page
    .getByLabel("Subir logo", { exact: true })
    .setInputFiles("public/assets/images/logoHoteleriasYa.png");
  await expect(page.locator("ngb-toast")).toContainText(
    "Logo guardado correctamente.",
  );
  await page
    .getByLabel("Subir portada", { exact: true })
    .setInputFiles("public/assets/images/hero1.jpg");
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
    "Suite Angular",
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
  await page.locator(".catalog-rate-option").first().click();
  await expect(page.getByRole("dialog")).toContainText("Total de referencia:");
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
