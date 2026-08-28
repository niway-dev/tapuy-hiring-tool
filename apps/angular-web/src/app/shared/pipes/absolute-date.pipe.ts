import { Pipe, PipeTransform } from "@angular/core";

export type AbsoluteDatePart = "full" | "date" | "time";

/* UTC on purpose: the API stores instants and the React client renders the same
   wall-clock string for everyone, so the two apps can be compared without the
   reviewer's timezone changing the screenshot. */
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

@Pipe({ name: "absoluteDate" })
export class AbsoluteDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined, part: AbsoluteDatePart = "full"): string {
    if (!value) return "—";
    const date = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return "—";
    if (part === "date") return DATE_FORMAT.format(date);
    if (part === "time") return TIME_FORMAT.format(date);
    return `${DATE_FORMAT.format(date)} · ${TIME_FORMAT.format(date)}`;
  }
}
