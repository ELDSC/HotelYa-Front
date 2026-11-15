import { Directive, HostListener, signal } from "@angular/core";
@Directive()
export abstract class Editor {
  readonly busy = signal(false);
  readonly error = signal("");
  abstract hasChanges(): boolean;
  private leaveApproved = false;
  approveLeave() {
    this.leaveApproved = true;
  }
  consumeLeaveApproval() {
    const approved = this.leaveApproved;
    this.leaveApproved = false;
    return approved;
  }
  @HostListener("window:beforeunload", ["$event"]) beforeUnload(
    event: BeforeUnloadEvent,
  ) {
    if (this.hasChanges() || this.busy()) {
      event.preventDefault();
      event.returnValue = "";
    }
  }
}
