import { InjectionToken } from "@angular/core";
export interface AppConfig {
  API_BASE_URL: string;
  OWNER_LOGIN_EMAIL: string;
  OWNER_LOGIN_PASSWORD: string;
  ADMIN_LOGIN_EMAIL: string;
  ADMIN_LOGIN_PASSWORD: string;
}
declare const HOTELYA_CONFIG: AppConfig;
export const APP_CONFIG = new InjectionToken<AppConfig>(
  "Configuración pública",
  { providedIn: "root", factory: () => HOTELYA_CONFIG },
);
