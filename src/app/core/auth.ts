import { Injectable, inject, signal } from "@angular/core";
import {
  HttpClient,
  HttpErrorResponse,
  HttpInterceptorFn,
} from "@angular/common/http";
import { firstValueFrom, lastValueFrom, from } from "rxjs";
import { APP_CONFIG } from "./config";
export interface Account {
  id: number;
  email: string;
}
interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: Account;
}
class Session {
  readonly user = signal<Account | null>(null);
  token = "";
  private expires = 0;
  private pending: Promise<Account | null> | null = null;
  private channel: BroadcastChannel | null = null;
  constructor(
    private http: HttpClient,
    private origin: string,
    readonly path: string,
    private lock: string,
  ) {
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(lock);
      this.channel.onmessage = () => this.clear();
    }
  }
  clear() {
    this.user.set(null);
    this.token = "";
    this.expires = 0;
  }
  private accept(data: AuthResponse) {
    this.token = data.accessToken;
    this.expires = Date.now() + data.expiresIn * 1000;
    this.user.set(data.user);
    return data.user;
  }
  private async post(action: string, body?: unknown) {
    const csrf = await firstValueFrom(
      this.http.get<{ token: string; headerName: string }>(
        `${this.origin}/api/${this.path}/csrf`,
        { withCredentials: true, timeout: 30000 },
      ),
    );
    return firstValueFrom(
      this.http.post<AuthResponse | null>(
        `${this.origin}/api/${this.path}/${action}`,
        body ?? {},
        {
          withCredentials: true,
          headers: { [csrf.headerName]: csrf.token },
          timeout: 30000,
        },
      ),
    );
  }
  async signIn(email: string, password: string, register = false) {
    const data = await this.post(register ? "register" : "login", {
      email,
      password,
    });
    if (!data) throw Error("Respuesta vacía.");
    return this.accept(data);
  }
  restore(force = false): Promise<Account | null> {
    if (!force && this.user() && this.expires > Date.now() + 30000)
      return Promise.resolve(this.user());
    if (this.pending) return this.pending;
    const refresh = async () => {
      try {
        const data = await this.post("refresh");
        return data ? this.accept(data) : null;
      } catch (e) {
        if (e instanceof HttpErrorResponse && e.status === 401) {
          this.clear();
          return null;
        }
        throw e;
      }
    };
    this.pending = (
      typeof navigator !== "undefined" && navigator.locks
        ? navigator.locks.request(this.lock, refresh)
        : refresh()
    ).finally(() => (this.pending = null));
    return this.pending;
  }
  async signOut() {
    const logout = async () => {
      await this.post("logout");
      this.clear();
      this.channel?.postMessage("logout");
    };
    if (navigator.locks) await navigator.locks.request(this.lock, logout);
    else {
      if (this.pending) await this.pending;
      await logout();
    }
  }
}
@Injectable({ providedIn: "root" })
export class Auth {
  private http = inject(HttpClient);
  private config = inject(APP_CONFIG);
  readonly owner = new Session(
    this.http,
    this.config.API_BASE_URL,
    "auth",
    "hotelya-session",
  );
  readonly admin = new Session(
    this.http,
    this.config.API_BASE_URL,
    "admin/auth",
    "hotelya-admin-session",
  );
}
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(APP_CONFIG);
  const auth = inject(Auth);
  const path = req.url.startsWith(config.API_BASE_URL + "/api/")
    ? req.url.slice((config.API_BASE_URL + "/api/").length)
    : "";
  const session = path.startsWith("owner/")
    ? auth.owner
    : path.startsWith("admin/") && !path.startsWith("admin/auth/")
      ? auth.admin
      : null;
  if (!session) return next(req);
  const perform = async () => {
    if (!(await session.restore()))
      throw new HttpErrorResponse({
        status: 401,
        error: { message: "Inicia sesión para continuar.", fields: {} },
      });
    const request = () =>
      lastValueFrom(
        next(
          req.clone({
            setHeaders: { Authorization: `Bearer ${session.token}` },
          }),
        ),
      );
    try {
      return await request();
    } catch (error) {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        (await session.restore(true))
      )
        return request();
      throw error;
    }
  };
  return from(perform());
};
