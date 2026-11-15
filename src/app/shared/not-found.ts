import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
@Component({
  imports: [RouterLink],
  template:
    '<main class="container catalog-state"><h1>Página no encontrada</h1><a routerLink="/">Volver al catálogo</a></main>',
})
export class NotFound {}
