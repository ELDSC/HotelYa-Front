/// <reference types="vite/client" />
interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    readonly VITE_OWNER_LOGIN_EMAIL: string;
    readonly VITE_OWNER_LOGIN_PASSWORD: string;
    readonly VITE_ADMIN_LOGIN_EMAIL: string;
    readonly VITE_ADMIN_LOGIN_PASSWORD: string;
}
interface ImportMeta { readonly env: ImportMetaEnv; }
