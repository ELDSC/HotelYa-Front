import { test, expect, hotel, api } from "./fixtures";
import { base } from "../environment";
const account = {
  accessToken: "owner-token",
  expiresIn: 600,
  user: { id: 1, email: "owner@example.com" },
};
async function session(page: import("@playwright/test").Page) {
  await page.route(`${api}/api/auth/refresh`, (r) =>
    r.fulfill({ json: account }),
  );
}
async function owner(page: import("@playwright/test").Page) {
  await session(page);
  let current = { detail: structuredClone(hotel), published: false };
  current.detail.roomTypes.forEach((r) => {
    r.totalUnits = 3;
    r.availableUnits = 1;
  });
  await page.route(`${api}/api/owner/hotel`, async (r) => {
    if (r.request().method() !== "GET")
      current = {
        ...current,
        detail: { ...current.detail, ...r.request().postDataJSON() },
      };
    await r.fulfill({ json: current });
  });
  return {
    get current() {
      return current;
    },
    set current(v) {
      current = v;
    },
  };
}
async function navigatePanel(
  page: import("@playwright/test").Page,
  name: string,
) {
  if (page.viewportSize()!.width < 761)
    await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("link", { name, exact: true }).click();
}
for (const width of [1280, 390]) {
  test(`catalog, detail, modal and SPA history at ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base);
    await expect(page.locator(".hotel-card")).toHaveCount(1);
    await page.evaluate(() => {
      (window as unknown as { spaMarker: string }).spaMarker = "persist";
    });
    await page.getByRole("link", { name: "Ver hotel", exact: true }).click();
    await expect(page).toHaveURL(new RegExp("hoteles/1$"));
    await expect(page.locator(".hero-title")).toContainText(hotel.name);
    expect(
      await page.evaluate(
        () => (window as unknown as { spaMarker: string }).spaMarker,
      ),
    ).toBe("persist");
    await expect(page.locator(".editorial-room-card")).toHaveCount(3);
    await page.locator(".catalog-rate-option").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("Consulta tu estadía");
    await page.getByRole("button", { name: "Cerrar consulta" }).click();
    await page.reload();
    await expect(page.locator(".hero-title")).toContainText(hotel.name);
    await page.goBack();
    await expect(page.locator(".hotel-card")).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`home-${width}.png`),
      fullPage: true,
    });
  });
  test(`owner forms, nested navigation and unsaved changes at ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const state = await owner(page);
    await page.goto(base + "panel/informacion");
    await expect(page.getByLabel("Nombre del hotel *")).toHaveValue(hotel.name);
    await page.getByLabel("Nombre del hotel *").fill("Nuevo nombre");
    page.once("dialog", (d) => d.dismiss());
    await navigatePanel(page, "Habitaciones");
    await expect(page.getByLabel("Nombre del hotel *")).toHaveValue(
      "Nuevo nombre",
    );
    await page
      .getByRole("button", { name: "Guardar cambios", exact: true })
      .click();
    await expect(page.locator("ngb-toast")).toContainText(
      "Información guardada.",
    );
    expect(state.current.detail.name).toBe("Nuevo nombre");
    await page
      .getByRole("button", { name: "Añadir tarjeta", exact: true })
      .click();
    await expect(page.locator(".presentation-card")).toHaveCount(2);
    await page
      .locator(".presentation-card")
      .nth(1)
      .getByLabel("Título *")
      .fill("Nueva tarjeta");
    await page
      .locator(".presentation-card")
      .nth(1)
      .getByLabel("Texto *")
      .fill("Descripción");
    await page.route(`${api}/api/owner/hotel/stay-cards`, async (r) => {
      state.current = {
        ...state.current,
        detail: {
          ...state.current.detail,
          stayCards: r.request().postDataJSON(),
        },
      };
      await r.fulfill({ json: state.current });
    });
    await page.getByRole("button", { name: "Guardar presentación" }).click();
    await expect(page.locator("ngb-toast")).toContainText(
      "Presentación guardada.",
    );
    await navigatePanel(page, "Habitaciones");
    await expect(page.locator("#section-rooms")).toBeVisible();
    await page.goBack();
    await expect(page.locator("#section-hotel")).toBeVisible();
    await page.reload();
    await expect(page.locator(".presentation-card")).toHaveCount(2);
    await page.screenshot({
      path: info.outputPath(`owner-${width}.png`),
      fullPage: true,
    });
  });
}
test("unknown and retired routes show not found", async ({ page }) => {
  for (const path of ["hotel-central.html?id=1", "acceder.html", "no-existe"]) {
    await page.goto(base + path);
    await expect(
      page.getByRole("heading", { name: "Página no encontrada" }),
    ).toBeVisible();
  }
});
test("unauthenticated owner returns to the requested route after login", async ({
  page,
}) => {
  await page.goto(base + "panel/habitaciones");
  await expect(page).toHaveURL(/acceder\?next=/);
  await page.route(`${api}/api/auth/login`, (r) =>
    r.fulfill({ json: account }),
  );
  await page.route(`${api}/api/owner/hotel`, (r) =>
    r.fulfill({ json: { detail: hotel, published: false } }),
  );
  await page
    .getByRole("button", { name: "Ingresar al panel", exact: true })
    .click();
  await expect(page).toHaveURL(/panel\/habitaciones$/);
  await expect(page.locator("#section-rooms")).toBeVisible();
});
test("invalid registration and server field errors preserve entered values", async ({
  page,
}) => {
  await page.goto(base + "acceder");
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await page.getByLabel("Correo electrónico").fill("new@example.com");
  await page
    .getByLabel("Contraseña", { exact: false })
    .first()
    .fill("password123");
  await page.getByLabel("Confirmar contraseña").fill("different");
  await page
    .getByRole("button", { name: "Crear cuenta", exact: true })
    .last()
    .click();
  await expect(page.getByRole("alert")).toContainText([
    "Las contraseñas no coinciden.",
  ]);
  await page.getByLabel("Confirmar contraseña").fill("password123");
  await page.route(`${api}/api/auth/register`, (r) =>
    r.fulfill({
      status: 409,
      json: {
        message: "Ya existe una cuenta con ese correo.",
        fields: { email: "Este correo ya está registrado." },
      },
    }),
  );
  await page
    .getByRole("button", { name: "Crear cuenta", exact: true })
    .last()
    .click();
  await expect(page.getByLabel("Correo electrónico")).toHaveValue(
    "new@example.com",
  );
  await expect(page.locator("app-field-error").first()).toContainText(
    "Este correo ya está registrado.",
  );
});
test("owner room editing, ordering photos, validation, create and delete", async ({
  page,
}) => {
  const state = await owner(page);
  await page.goto(base + "panel/habitaciones");
  await page.getByRole("button", { name: "+ Nuevo tipo" }).click();
  await expect(
    page.getByRole("heading", { name: "Nuevo tipo de habitación" }),
  ).toBeVisible();
  await page.getByLabel("Nombre *", { exact: true }).fill("Suite nueva");
  await page
    .getByLabel("Descripción *", { exact: true })
    .fill("Descripción nueva");
  await page.getByLabel("Cantidad total *").fill("2");
  await page.getByLabel("Disponibles ahora *").fill("3");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(
    page.getByText("Disponibles entre cero y la cantidad total."),
  ).toBeVisible();
  await page.getByLabel("Disponibles ahora *").fill("1");
  await page.route(`${api}/api/owner/hotel/room-types`, async (r) => {
    const body = r.request().postDataJSON();
    state.current.detail.roomTypes.push({
      ...body,
      id: 99,
      code: body.photoScope,
      rates: [],
      photos: [],
      details: [],
    });
    await r.fulfill({ json: state.current });
  });
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.locator(".room-list-item")).toHaveCount(4);
  await page.route(`${api}/api/owner/hotel/room-types/99`, async (r) => {
    state.current.detail.roomTypes = state.current.detail.roomTypes.filter(
      (room) => room.id !== 99,
    );
    await r.fulfill({ json: state.current });
  });
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Eliminar tipo de habitación" })
    .click();
  await expect(page.locator(".room-list-item")).toHaveCount(3);
});
test("publication setting restores its value after rejection", async ({
  page,
}) => {
  await owner(page);
  await page.route(`${api}/api/owner/hotel/publication`, (r) =>
    r.fulfill({
      status: 409,
      json: { message: "Completa las habitaciones.", fields: {} },
    }),
  );
  await page.goto(base + "panel");
  const toggle = page.getByRole("switch", { name: "Hotel publicado" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(page.getByRole("alert")).toContainText([
    "Completa las habitaciones.",
  ]);
});
test("admin uses its separate session and authenticated API", async ({
  page,
}) => {
  await page.route(`${api}/api/admin/auth/csrf`, (r) =>
    r.fulfill({ json: { token: "admin-csrf", headerName: "X-XSRF-TOKEN" } }),
  );
  await page.route(`${api}/api/admin/auth/refresh`, (r) =>
    r.fulfill({ json: { ...account, accessToken: "admin-token" } }),
  );
  await page.route(`${api}/api/admin/hotels`, (r) => {
    expect(r.request().headers()["authorization"]).toBe("Bearer admin-token");
    return r.fulfill({ json: [hotel] });
  });
  await page.goto(base + "admin");
  await expect(page.locator(".admin-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".admin-table")).toContainText(hotel.name);
  await page.getByLabel("Buscar hotel").fill("inexistente");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.locator(".admin-table")).toContainText(
    "No se encontraron hoteles.",
  );
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((k) => /token/i.test(k)),
    ),
  ).toBe(false);
});
test("network failure supports retry without inventing catalog data", async ({
  page,
}) => {
  await page.route(`${api}/api/hotels`, (r) =>
    r.fulfill({ status: 503, json: {} }),
  );
  await page.goto(base);
  await expect(
    page.getByText("No pudimos cargar los hoteles. Inténtalo de nuevo."),
  ).toBeVisible();
  await page.route(`${api}/api/hotels`, (r) => r.fulfill({ json: [hotel] }));
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.locator(".hotel-card")).toHaveCount(1);
});

test("phone preserves international paste and edits at digit separators", async ({
  page,
}) => {
  const state = await owner(page);
  await page.goto(base + "panel/informacion");
  const phone = page.getByRole("textbox", {
    name: "Teléfono y WhatsApp",
    exact: true,
  });
  await phone.fill("");
  await phone.pressSequentially("abc987654321");
  await expect(phone).toHaveValue("987 654 321");
  await phone.evaluate((node) =>
    (node as HTMLInputElement).setSelectionRange(4, 4),
  );
  await phone.press("Backspace");
  await expect(phone).toHaveValue("986 543 21");
  expect(
    await phone.evaluate((node) => (node as HTMLInputElement).selectionStart),
  ).toBe(2);
  await phone.pressSequentially("7");
  await expect(phone).toHaveValue("987 654 321");
  await phone.selectText();
  await phone.evaluate((node) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text", "+51 912 345 678");
    node.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await expect(phone).toHaveValue("912 345 678");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.locator("ngb-toast")).toContainText(
    "Información guardada.",
  );
  expect(state.current.detail.phone).toBe("+51912345678");
});

test("logout confirms unsaved changes once and only then revokes the session", async ({
  page,
}) => {
  await owner(page);
  let loggedOut = false,
    calls = 0,
    dialogs = 0;
  await page.route(`${api}/api/auth/refresh`, (r) =>
    r.fulfill(
      loggedOut
        ? { status: 401, json: { fields: {}, message: "Sin sesión" } }
        : { json: account },
    ),
  );
  await page.route(`${api}/api/auth/logout`, (r) => {
    calls++;
    loggedOut = true;
    return r.fulfill({ status: 204 });
  });
  await page.goto(base + "panel/informacion");
  await page.getByLabel("Nombre del hotel *").fill("Cambios pendientes");
  page.on("dialog", async (d) => {
    dialogs++;
    await d.accept();
  });
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/acceder$/);
  expect(calls).toBe(1);
  expect(dialogs).toBe(1);
});

test("failed logout keeps the editor and all unsaved values", async ({
  page,
}) => {
  await owner(page);
  await page.route(`${api}/api/auth/logout`, (r) =>
    r.fulfill({
      status: 503,
      json: { message: "No se pudo cerrar sesión.", fields: {} },
    }),
  );
  await page.goto(base + "panel/informacion");
  const name = page.getByLabel("Nombre del hotel *");
  await name.fill("Conservar estos cambios");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(name).toHaveValue("Conservar estos cambios");
  await expect(page).toHaveURL(/panel\/informacion$/);
  await expect(page.getByRole("alert")).toContainText(
    "No se pudo cerrar sesión.",
  );
});

test("editing presentation preserves every existing card returned by the API", async ({
  page,
}) => {
  const state = await owner(page);
  state.current.detail.stayCards = Array.from({ length: 4 }, (_, i) => ({
    title: "Tarjeta " + i,
    description: "Descripción " + i,
  }));
  let saved: unknown;
  await page.route(`${api}/api/owner/hotel/stay-cards`, (r) => {
    saved = r.request().postDataJSON();
    return r.fulfill({ json: state.current });
  });
  await page.goto(base + "panel/informacion");
  await expect(page.locator(".presentation-card")).toHaveCount(4);
  await expect(
    page.getByRole("button", { name: "Añadir tarjeta" }),
  ).toBeHidden();
  await page
    .locator(".presentation-card")
    .first()
    .getByLabel("Título *")
    .fill("Título actualizado");
  await page.getByRole("button", { name: "Guardar presentación" }).click();
  await expect(page.locator("ngb-toast")).toContainText(
    "Presentación guardada.",
  );
  expect(saved).toHaveLength(4);
});

test("inquiry rejects invalid totals and sends the selected duration to WhatsApp", async ({
  page,
  context,
}) => {
  await context.route("https://wa.me/**", (r) =>
    r.fulfill({ body: "Consulta de prueba", contentType: "text/html" }),
  );
  await page.goto(base + "hoteles/1");
  await page.locator(".catalog-rate-option").nth(1).click();
  const dialog = page.getByRole("dialog");
  const quantity = dialog.getByLabel("Cantidad de paquetes");
  await quantity.fill("0");
  await expect(dialog.locator(".inquiry-total")).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Consultar por WhatsApp" }),
  ).toBeDisabled();
  await quantity.fill("2");
  await expect(dialog.locator(".inquiry-duration")).toContainText(
    "2 paquetes de 3 horas (6 horas en total)",
  );
  await expect(dialog.locator(".inquiry-total")).toContainText("120.00");
  const opened = context.waitForEvent("page");
  await dialog.getByRole("button", { name: "Consultar por WhatsApp" }).click();
  const popup = await opened;
  await popup.waitForURL("https://wa.me/**");
  const url = new URL(popup.url());
  expect(url.pathname).toBe("/51999999999");
  expect(url.searchParams.get("text")).toContain("6 horas en total");
  await popup.close();
});

test("a room without rates remains consultable without a fabricated amount", async ({
  page,
}) => {
  await page.route(`${api}/api/hotels/1`, (r) =>
    r.fulfill({
      json: { ...hotel, roomTypes: [{ ...hotel.roomTypes[0], rates: [] }] },
    }),
  );
  await page.goto(base + "hoteles/1");
  await page
    .getByRole("button", { name: "Consultar estadía", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".inquiry-summary")).toHaveText(
    "Consulta las tarifas directamente con el hotel.",
  );
  await expect(dialog.getByLabel("Modalidad")).toHaveCount(0);
});
