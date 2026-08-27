import { Pipe, PipeTransform } from "@angular/core";
import type { Currency, SalaryRateType } from "@interviews-tool/domain/constants";

const CURRENCY_SYMBOL: Record<Currency, string> = { USD: "$", PEN: "S/ " };
const RATE_SUFFIX: Record<SalaryRateType, string> = { monthly: " / mo", hourly: " / hr" };

/** Human label for a salary rate type, e.g. for the process detail's stats row. */
export const RATE_LABEL: Record<SalaryRateType, string> = {
  monthly: "per month",
  hourly: "per hour",
};

@Pipe({ name: "money" })
export class MoneyPipe implements PipeTransform {
  transform(
    salary: number | null | undefined,
    currency: Currency | null | undefined,
    rateType?: SalaryRateType | null,
  ): string {
    if (salary === null || salary === undefined) return "—";
    const symbol = CURRENCY_SYMBOL[currency ?? "USD"];
    const amount = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(salary);
    const suffix = rateType ? RATE_SUFFIX[rateType] : "";
    return `${symbol}${amount}${suffix}`;
  }
}
