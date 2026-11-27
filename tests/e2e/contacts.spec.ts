import { api, expect, test } from "./fixtures";

const reviewsUrl = `${api}/api/hotels/1/reviews`;
const createdAt = "2026-11-26T15:00:00Z";
const reviews = Array.from({ length: 7 }, (_, i) => ({
  id: 7 - i,
  roomTypeName: "Matrimonial",
  createdAt,
  comment: `Opinión ${7 - i}`,
}));

test("Contactos es público y lista reseñas de tres en tres", async ({
  page,
}) => {
  await page.route(`${reviewsUrl}*`, async (route) => {
    expect(route.request().headers()["authorization"]).toBeUndefined();
    const before = new URL(route.request().url()).searchParams.get("before");
    const start = before
      ? reviews.findIndex((item) => String(item.id) === before) + 1
      : 0;
    const items = reviews.slice(start, start + 3);
    await route.fulfill({
      json: {
        items,
        nextCursor:
          start + 3 < reviews.length ? String(items.at(-1)?.id) : null,
      },
    });
  });
  await page.route("https://maps.google.com/maps?**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<p>Mapa de prueba</p>",
    }),
  );

  await page.goto("hoteles/1");
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Contactos" })
    .click();
  await expect(page).toHaveURL(/\/hoteles\/1\/contactos$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Lumi's Hotel",
  );
  await expect(
    page.getByText("Inicia sesión para dejar una reseña."),
  ).toBeVisible();
  await expect(page.getByLabel("Tipo de habitación")).toHaveCount(0);
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    /output=embed.*Direcci%C3%B3n/,
  );
  await expect(
    page.getByRole("link", { name: "Abrir ubicación en el mapa" }),
  ).toHaveCount(0);
  const list = page.locator(".review-list");
  await expect(list.getByRole("listitem")).toHaveCount(3);
  await page.getByRole("button", { name: "Cargar más" }).click();
  await expect(list.getByRole("listitem")).toHaveCount(6);
  await page.getByRole("button", { name: "Cargar más" }).click();
  await expect(list.getByRole("listitem")).toHaveCount(7);
  await expect(page.getByRole("button", { name: "Cargar más" })).toHaveCount(0);
  await expect(page.locator("footer")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Contactos" }),
  ).toBeVisible();
  const formBox = await page
    .getByRole("region", { name: "Deja una reseña" })
    .boundingBox();
  const mapBox = await page
    .getByRole("region", { name: "Ubicación" })
    .boundingBox();
  expect(mapBox!.y).toBeGreaterThanOrEqual(formBox!.y + formBox!.height);
  expect(mapBox!.x).toBe(formBox!.x);
});

test("el acceso vuelve a Contactos y la reseña bloquea el formulario tras recargar", async ({
  page,
}) => {
  const session = {
    accessToken: "test-token",
    expiresIn: 300,
    user: { id: 12, email: "cliente@example.com" },
  };
  let signedIn = false;
  let published = false;
  const review = {
    id: 1,
    roomTypeName: "Temática",
    comment: "Muy cómoda.",
    createdAt,
  };
  await page.route(`${api}/api/auth/login`, async (route) => {
    signedIn = true;
    await route.fulfill({ json: session });
  });
  await page.route(`${api}/api/auth/refresh`, (route) =>
    signedIn
      ? route.fulfill({ json: session })
      : route.fulfill({ status: 401, json: {} }),
  );
  await page.route(`${reviewsUrl}/me`, async (route) => {
    expect(route.request().headers()["authorization"]).toBe(
      "Bearer test-token",
    );
    await route.fulfill({ json: { reviewed: published } });
  });
  await page.route(reviewsUrl, async (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().headers()["authorization"]).toBe(
        "Bearer test-token",
      );
      expect(route.request().postDataJSON()).toEqual({
        roomTypeId: 1,
        comment: review.comment,
      });
      published = true;
      await route.fulfill({ status: 201, json: review });
    } else {
      await route.fulfill({
        json: { items: published ? [review] : [], nextCursor: null },
      });
    }
  });
  await page.route("https://maps.google.com/maps?**", (route) =>
    route.fulfill({ body: "Mapa de prueba" }),
  );

  await page.goto("hoteles/1/contactos");
  await page.getByRole("link", { name: "Iniciar sesión" }).click();
  await page.getByLabel("Correo electrónico").fill(session.user.email);
  await page.getByLabel("Contraseña", { exact: false }).fill("password123");
  await page
    .getByRole("button", { name: "Ingresar", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/\/hoteles\/1\/contactos$/);
  await page
    .getByLabel("Tipo de habitación")
    .selectOption({ label: "Temática" });
  await page.getByLabel("Tu opinión").fill(review.comment);
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(
    page.getByText("Ya publicaste una reseña para este hotel."),
  ).toBeVisible();
  await expect(page.getByText(review.comment)).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Ya publicaste una reseña para este hotel."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publicar", exact: true }),
  ).toHaveCount(0);
});
