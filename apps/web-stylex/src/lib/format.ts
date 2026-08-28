import { useTranslations, useFormatter } from "@interviews-tool/i18n";
import { SALARY_RATE_TYPES, formatAge } from "@interviews-tool/domain/constants";
import type { Currency, SalaryRateType } from "@interviews-tool/domain/constants";

/**
 * "$5,200 / mo" — locale-aware amount plus the localized short rate
 * (the perMonthShort/perHourShort messages already include the slash).
 * Zero stays "–": the app treats 0 as undeclared.
 */
export function useSalaryFormatter() {
  const format = useFormatter();
  const tForm = useTranslations("processForm");

  return (
    salary: number | null,
    currency: Currency = "USD",
    salaryRateType?: SalaryRateType,
  ): string => {
    if (!salary) return "–";
    const amount = format.number(salary, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    if (!salaryRateType) return amount;
    const short =
      salaryRateType === SALARY_RATE_TYPES.HOURLY ? tForm("perHourShort") : tForm("perMonthShort");
    return `${amount} ${short}`;
  };
}

/**
 * Relative age for board cards and stale rows: "today", "4d", "2mo".
 * On a board, how long a process has been sitting still matters more than the
 * exact date. Only the "today" case is localized; the rest are mono figures.
 */
export function useAgeLabel() {
  const t = useTranslations("dashboard");

  return (date: Date | string): string => {
    const age = formatAge(new Date(date), new Date());
    return age === "today" ? t("today") : age;
  };
}
