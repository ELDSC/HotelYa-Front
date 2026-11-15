import {
  Directive,
  ElementRef,
  forwardRef,
  HostListener,
  inject,
} from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import {
  groupPhoneDigits,
  nationalPhone,
  phoneDigits,
} from "../../utils/phone";

@Directive({
  selector: "input[appPhone]",
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInput),
      multi: true,
    },
  ],
})
export class PhoneInput implements ControlValueAccessor {
  private input =
    inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private changed: (value: string) => void = () => {};
  private touched: () => void = () => {};

  writeValue(value: string | null) {
    this.input.value = groupPhoneDigits(nationalPhone(value)).slice(0, 11);
  }
  registerOnChange(fn: (value: string) => void) {
    this.changed = fn;
  }
  registerOnTouched(fn: () => void) {
    this.touched = fn;
  }
  setDisabledState(disabled: boolean) {
    this.input.disabled = disabled;
  }
  @HostListener("blur") onBlur() {
    this.touched();
  }
  @HostListener("input") onInput() {
    const position = this.input.selectionStart ?? this.input.value.length;
    const digitPosition = phoneDigits(
      this.input.value.slice(0, position),
    ).length;
    this.input.value = groupPhoneDigits(this.input.value).slice(0, 11);
    let cursor = 0,
      count = 0;
    while (cursor < this.input.value.length && count < digitPosition) {
      if (/[0-9]/.test(this.input.value[cursor])) count++;
      cursor++;
    }
    this.input.setSelectionRange(cursor, cursor);
    this.changed(this.input.value);
  }
  @HostListener("beforeinput", ["$event"]) beforeInput(event: InputEvent) {
    if (
      event.data &&
      /[^0-9]/.test(event.data) &&
      event.inputType === "insertText"
    ) {
      event.preventDefault();
      return;
    }
    const start = this.input.selectionStart ?? 0;
    if (start !== this.input.selectionEnd) return;
    if (
      event.inputType === "deleteContentBackward" &&
      this.input.value[start - 1] === " "
    ) {
      event.preventDefault();
      this.input.setRangeText("", start - 2, start, "start");
      this.onInput();
    } else if (
      event.inputType === "deleteContentForward" &&
      this.input.value[start] === " "
    ) {
      event.preventDefault();
      this.input.setRangeText("", start, start + 2, "start");
      this.onInput();
    }
  }
  @HostListener("paste", ["$event"]) paste(event: ClipboardEvent) {
    const text = event.clipboardData?.getData("text");
    if (text === undefined) return;
    event.preventDefault();
    const digits = phoneDigits(nationalPhone(text.trim()));
    this.input.setRangeText(
      digits,
      this.input.selectionStart ?? 0,
      this.input.selectionEnd ?? this.input.value.length,
      "end",
    );
    this.onInput();
  }
}
