import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import {
  provideHttpClientTesting,
  HttpTestingController,
} from "@angular/common/http/testing";
import { FormControl, FormGroup } from "@angular/forms";
import { APP_CONFIG } from "../../src/app/core/config";
import { Api } from "../../src/app/core/api";
import { Auth, authInterceptor } from "../../src/app/core/auth";
import {
  integer,
  passwordBytes,
  positiveMoney,
  availability,
  hoursPair,
} from "../../src/app/core/forms";
import { safeDestination } from "../../src/app/core/guards";
const origin = "http://127.0.0.1:8080";
let http: HttpTestingController;
beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      { provide: APP_CONFIG, useValue: { API_BASE_URL: origin } },
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  http = TestBed.inject(HttpTestingController);
});
afterEach(() => {
  http.verify();
  TestBed.resetTestingModule();
});
it("loads the typed public catalog without authorization", async () => {
  const promise = TestBed.inject(Api).hotels();
  const req = http.expectOne(origin + "/api/hotels");
  expect(req.request.headers.has("Authorization")).toBe(false);
  req.flush([]);
  expect(await promise).toEqual([]);
});
it("shares concurrent refresh and attaches the owner token only to owner requests", async () => {
  const api = TestBed.inject(Api),
    auth = TestBed.inject(Auth);
  const promises = [api.ownerHotel(), api.ownerHotel()];
  http
    .expectOne(origin + "/api/auth/csrf")
    .flush({ token: "csrf", headerName: "X-XSRF-TOKEN" });
  await vi.waitFor(() => {
    const req = http.expectOne(origin + "/api/auth/refresh");
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get("X-XSRF-TOKEN")).toBe("csrf");
    req.flush({
      accessToken: "owner-token",
      expiresIn: 600,
      user: { id: 1, email: "owner@example.com" },
    });
  });
  await vi.waitFor(() => {
    const requests = http.match(origin + "/api/owner/hotel");
    expect(requests).toHaveLength(2);
    for (const r of requests) {
      expect(r.request.headers.get("Authorization")).toBe("Bearer owner-token");
      r.flush({ detail: { id: 1 }, published: false });
    }
  });
  await Promise.all(promises);
  expect(auth.admin.user()).toBeNull();
});
it("retries a private request once after a 401 and does not recurse on auth endpoints", async () => {
  const auth = TestBed.inject(Auth);
  const login = auth.owner.signIn("a@b.com", "password");
  http
    .expectOne(origin + "/api/auth/csrf")
    .flush({ token: "csrf", headerName: "X-XSRF-TOKEN" });
  await vi.waitFor(() =>
    http.expectOne(origin + "/api/auth/login").flush({
      accessToken: "old",
      expiresIn: 600,
      user: { id: 1, email: "a@b.com" },
    }),
  );
  await login;
  const promise = TestBed.inject(Api).ownerHotel();
  await vi.waitFor(() =>
    http
      .expectOne(origin + "/api/owner/hotel")
      .flush({}, { status: 401, statusText: "Unauthorized" }),
  );
  await vi.waitFor(() =>
    http
      .expectOne(origin + "/api/auth/csrf")
      .flush({ token: "new-csrf", headerName: "X-XSRF-TOKEN" }),
  );
  await vi.waitFor(() =>
    http.expectOne(origin + "/api/auth/refresh").flush({
      accessToken: "new",
      expiresIn: 600,
      user: { id: 1, email: "a@b.com" },
    }),
  );
  await vi.waitFor(() => {
    const req = http.expectOne(origin + "/api/owner/hotel");
    expect(req.request.headers.get("Authorization")).toBe("Bearer new");
    req.flush({ detail: { id: 1 }, published: false });
  });
  await promise;
});
it("validates amounts, UTF-8 limits, integers and paired hours", () => {
  expect(integer(new FormControl(1.2))).toEqual({ integer: true });
  expect(positiveMoney(new FormControl(0))).toEqual({ money: true });
  expect(positiveMoney(new FormControl(1.234))).toEqual({ money: true });
  expect(positiveMoney(new FormControl(1.23))).toBeNull();
  expect(passwordBytes(new FormControl("é".repeat(37)))).toEqual({
    bytes: true,
  });
  expect(
    availability(
      new FormGroup({
        totalUnits: new FormControl(1),
        availableUnits: new FormControl(2),
      }),
    ),
  ).toEqual({ availability: true });
  expect(
    hoursPair(
      new FormGroup({
        openingTime: new FormControl("08:00"),
        closingTime: new FormControl(""),
      }),
    ),
  ).toEqual({ hours: true });
});
it("allows only supported internal destinations", () => {
  expect(safeDestination("/panel/habitaciones")).toBe("/panel/habitaciones");
  expect(safeDestination("/hoteles/42?reserva=7")).toBe(
    "/hoteles/42?reserva=7",
  );
  expect(safeDestination("/mis-reservas")).toBe("/mis-reservas");
  for (const value of [
    "https://evil.com",
    "//evil.com",
    "/admin",
    "panel/informacion/",
    "/panel/../admin",
  ])
    expect(safeDestination(value)).toBe("/");
});
