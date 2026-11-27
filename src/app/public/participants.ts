import { NgTemplateOutlet } from "@angular/common";
import { Component, inject, signal, type TemplateRef } from "@angular/core";
import { RouterLink } from "@angular/router";
import { NgbCarouselModule, NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { developerProfiles } from "../../data/developer-profiles";
import { coordinator, team } from "../../data/team";
import { SiteFooter } from "../shared/site-footer";

@Component({
  imports: [RouterLink, NgTemplateOutlet, NgbCarouselModule, SiteFooter],
  templateUrl: "./participants.html",
  styleUrl: "./participants.scss",
})
export class Participants {
  readonly coordinator = coordinator;
  readonly team = team;
  readonly developers = [coordinator, ...team];
  readonly gallery = this.developers.slice(0, 3);
  readonly profiles = developerProfiles;
  readonly activeSlide = signal("1");
  private readonly modal = inject(NgbModal);

  openProfile(template: TemplateRef<unknown>, trigger: HTMLButtonElement) {
    trigger.focus();
    this.modal.open(template, {
      ariaLabelledBy: "cv-title",
      centered: true,
      scrollable: true,
      size: "lg",
    });
  }
}
