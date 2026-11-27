import { Routes } from "@angular/router";
import { ownerGuard, adminGuard, changesGuard } from "./core/guards";
export const routes: Routes = [
  {
    path: "",
    loadComponent: () => import("./public/home").then((m) => m.Home),
    title: "HoteleriasYa",
  },
  {
    path: "participantes",
    loadComponent: () =>
      import("./public/participants").then((m) => m.Participants),
    title: "Sobre nosotros | Participantes de HotelYa",
  },
  {
    path: "hoteles/:id/contactos",
    title: "Contactos | HoteleriasYa",
    loadComponent: () => import("./public/contacts").then((m) => m.Contacts),
  },
  {
    path: "hoteles/:id",
    title: "Hotel | HoteleriasYa",
    loadComponent: () => import("./public/detail").then((m) => m.Detail),
  },
  {
    path: "acceder",
    loadComponent: () => import("./shared/access").then((m) => m.Access),
    title: "Acceder | HoteleriasYa",
  },
  {
    path: "panel/vista-previa",
    title: "Vista previa privada | HoteleriasYa",
    canActivate: [ownerGuard],
    loadComponent: () => import("./public/detail").then((m) => m.Detail),
    data: { preview: true },
  },
  {
    path: "panel",
    title: "Mi panel | HoteleriasYa",
    canActivate: [ownerGuard],
    loadComponent: () => import("./owner/layout").then((m) => m.OwnerLayout),
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./owner/dashboard").then((m) => m.Dashboard),
      },
      {
        path: "informacion",
        title: "Información | HoteleriasYa",
        canDeactivate: [changesGuard],
        loadComponent: () =>
          import("./owner/information").then((m) => m.Information),
      },
      {
        path: "habitaciones",
        title: "Habitaciones | HoteleriasYa",
        canDeactivate: [changesGuard],
        loadComponent: () => import("./owner/rooms").then((m) => m.Rooms),
      },
      {
        path: "multimedia",
        title: "Multimedia | HoteleriasYa",
        canDeactivate: [changesGuard],
        loadComponent: () => import("./owner/media").then((m) => m.Media),
      },
    ],
  },
  {
    path: "admin/acceder",
    title: "Acceso administrativo | HoteleriasYa",
    loadComponent: () => import("./shared/access").then((m) => m.Access),
    data: { admin: true },
  },
  {
    path: "admin",
    title: "Administración global | HoteleriasYa",
    canActivate: [adminGuard],
    loadComponent: () => import("./admin/panel").then((m) => m.AdminPanel),
  },
  {
    path: "**",
    loadComponent: () => import("./shared/not-found").then((m) => m.NotFound),
    title: "Página no encontrada",
  },
];
