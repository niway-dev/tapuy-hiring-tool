import { Pipe, PipeTransform } from "@angular/core";

const DAY_MS = 24 * 60 * 60 * 1000;

@Pipe({ name: "relativeDate" })
export class RelativeDatePipe implements PipeTransform {
  /** Overridable clock so tests can pin "today". Not a constructor param: Angular DI cannot inject functions. */
  now: () => Date = () => new Date();

  transform(value: string | Date | null | undefined): string {
    if (!value) return "—";
    const date = typeof value === "string" ? new Date(value) : value;
    const startOfDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const days = Math.round((startOfDay(this.now()) - startOfDay(date)) / DAY_MS);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    if (days <= 30) return `${days} days ago`;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }
}
