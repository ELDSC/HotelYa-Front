import { inject } from "@angular/core";
import { CanActivateFn, CanDeactivateFn, Router } from "@angular/router";
import { Auth } from "./auth";
export const ownerGuard: CanActivateFn = async (_, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  try {
    return (await auth.owner.restore())
      ? true
      : router.createUrlTree(["/acceder"], {
          queryParams: { next: state.url },
        });
  } catch {
    return router.createUrlTree(["/acceder"], {
      queryParams: { next: state.url },
    });
  }
};
export const adminGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  try {
    return (await auth.admin.restore())
      ? true
      : router.createUrlTree(["/admin/acceder"]);
  } catch {
    return router.createUrlTree(["/admin/acceder"]);
  }
};
export interface PendingChanges {
  hasChanges(): boolean;
  busy?: () => boolean;
  approveLeave?: () => void;
  consumeLeaveApproval?: () => boolean;
}
export const changesGuard: CanDeactivateFn<PendingChanges> = (c) =>
  c.busy?.()
    ? false
    : c.consumeLeaveApproval?.() ||
      !c.hasChanges() ||
      confirm("Hay cambios sin guardar. ¿Deseas descartarlos?");
export function safeDestination(value: string | null) {
  return value &&
    (/^\/panel(?:\/(?:informacion|habitaciones|multimedia|vista-previa|reservas|reportes))?$/.test(
      value,
    ) ||
      /^\/hoteles\/[1-9]\d*(?:\/contactos|\?reserva=[1-9]\d*)$/.test(value) ||
      /^\/mis-reservas(?:\/[a-f0-9-]{36})?$/.test(value))
    ? value
    : "/";
}
