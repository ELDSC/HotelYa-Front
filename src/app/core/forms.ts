import {
  AbstractControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
} from "@angular/forms";
import { HttpErrorResponse } from "@angular/common/http";
export const integer: ValidatorFn = (c) =>
  c.value === null || c.value === "" || Number.isSafeInteger(Number(c.value))
    ? null
    : { integer: true };
export const trimmedRequired: ValidatorFn = (c) =>
  typeof c.value === "string" && c.value.trim() ? null : { required: true };
export const passwordBytes: ValidatorFn = (c) =>
  new TextEncoder().encode(c.value ?? "").length <= 72 ? null : { bytes: true };
export const hoursPair: ValidatorFn = (c) =>
  Boolean(c.get("openingTime")?.value) === Boolean(c.get("closingTime")?.value)
    ? null
    : { hours: true };
export const availability: ValidatorFn = (c) =>
  Number(c.get("availableUnits")?.value) <= Number(c.get("totalUnits")?.value)
    ? null
    : { availability: true };
export const positiveMoney: ValidatorFn = (c) =>
  /^[0-9]+(?:\.[0-9]{1,2})?$/.test(String(c.value)) &&
  Number(c.value) > 0 &&
  Number(c.value) < 1e10
    ? null
    : { money: true };
export function serverError(
  error: unknown,
  form?: FormGroup,
  mapField: (path: string) => string = (path) => path,
): string {
  if (error instanceof HttpErrorResponse) {
    for (const [key, message] of Object.entries(error.error?.fields ?? {})) {
      const mappedKey = mapField(key);
      const control = form?.get(
        mappedKey.startsWith("stayCards.")
          ? mappedKey.replace("stayCards.", "cards.")
          : mappedKey,
      );
      if (control) {
        control.setErrors({ ...control.errors, server: message });
        control.markAsTouched();
      }
    }
    return error.status === 0
      ? "No pudimos conectar con el servidor. Conservamos tus cambios para que puedas reintentar."
      : (error.error?.message ?? "No pudimos completar la operación.");
  }
  return "No pudimos completar la operación. Conservamos tus cambios para que puedas reintentar.";
}
export function controlMessage(c: AbstractControl | null) {
  const e: ValidationErrors | null = c?.errors ?? null;
  if (!e) return "";
  return String(
    e["server"] ??
      (e["required"]
        ? "Este campo es obligatorio."
        : e["email"] || e["pattern"]
          ? "Introduce un valor válido."
          : e["minlength"]
            ? "El valor es demasiado corto."
            : e["maxlength"]
              ? "El texto supera el límite permitido."
              : e["bytes"]
                ? "Máximo 72 bytes UTF-8."
                : e["money"]
                  ? "Introduce un importe positivo con hasta dos decimales."
                  : "Revisa este valor."),
  );
}
