import { Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";
import type { HotelDetail } from "../../types/catalog";
import { formatPhone } from "../../utils/phone";
import { MediaPreview } from "../shared/media-preview";

@Component({
  selector: "app-hotel-hero",
  imports: [MediaPreview],
  templateUrl: "./hotel-hero.html",
  styles: [":host { display: block; }"],
})
export class HotelHero {
  readonly hotel = input.required<HotelDetail>();
  readonly preview = input(false);
}

@Component({
  selector: "app-hotel-footer",
  imports: [RouterLink, MediaPreview],
  templateUrl: "./hotel-footer.html",
  styles: [":host { display: block; }"],
})
export class HotelFooter {
  readonly hotel = input.required<HotelDetail>();
  readonly preview = input(false);
  readonly formatPhone = formatPhone;
}
