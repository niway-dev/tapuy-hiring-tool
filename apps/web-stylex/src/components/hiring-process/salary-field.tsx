import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@interviews-tool/web-ui";
import { useTranslations } from "@interviews-tool/i18n";
import {
  CURRENCY_INFO,
  CURRENCY_VALUES,
  SALARY_RATE_TYPES,
  type Currency,
  type SalaryRateType,
} from "@interviews-tool/domain/constants";
import type { HiringProcessFormApi } from "./hiring-process-form";

export const SALARY_MAX = 25000;

interface SalaryFieldProps {
  form: HiringProcessFormApi;
  isSubmitting: boolean;
}

/* Composed amount + rate + currency control — "Numbers, not vibes" */
export function SalaryField({ form, isSubmitting }: SalaryFieldProps): React.ReactElement {
  const t = useTranslations("processForm");

  return (
    <form.Field
      name="salary"
      validators={{
        onSubmit: ({ value }) =>
          value !== undefined && value > SALARY_MAX ? t("salaryMaxError") : undefined,
      }}
    >
      {(salaryField) => (
        <form.Field name="salaryRateType">
          {(rateField) => (
            <form.Field name="currency">
              {(currencyField) => (
                <div className="grid gap-2">
                  <Label htmlFor="salary">
                    {rateField.state.value === SALARY_RATE_TYPES.HOURLY
                      ? t("hourlyRate")
                      : t("monthlySalary")}
                  </Label>
                  <div className="flex h-11 max-w-[420px] items-stretch divide-x divide-border overflow-hidden rounded-md border border-border bg-surface-2 transition-colors focus-within:[box-shadow:var(--focus-ring)] hover:border-border-strong">
                    <span className="mono flex w-12 shrink-0 items-center justify-center text-base text-text-muted">
                      {CURRENCY_INFO[currencyField.state.value]?.symbol ?? "$"}
                    </span>
                    <input
                      id="salary"
                      type="number"
                      min={0}
                      max={SALARY_MAX}
                      value={salaryField.state.value ?? ""}
                      onChange={(e) =>
                        salaryField.handleChange(
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      placeholder={t("salaryPlaceholder")}
                      disabled={isSubmitting}
                      className="mono min-w-0 flex-1 bg-transparent px-3 text-lg text-text outline-none [appearance:textfield] focus-visible:shadow-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <Select
                      value={rateField.state.value}
                      onValueChange={(value) => rateField.handleChange(value as SalaryRateType)}
                    >
                      <SelectTrigger
                        className="h-full shrink-0 rounded-none border-0 bg-transparent text-text-secondary focus-visible:shadow-none"
                        disabled={isSubmitting}
                      >
                        <SelectValue>
                          {rateField.state.value === SALARY_RATE_TYPES.HOURLY
                            ? t("perHour")
                            : t("perMonth")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SALARY_RATE_TYPES.MONTHLY}>{t("perMonth")}</SelectItem>
                        <SelectItem value={SALARY_RATE_TYPES.HOURLY}>{t("perHour")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={currencyField.state.value}
                      onValueChange={(value) => currencyField.handleChange(value as Currency)}
                    >
                      <SelectTrigger
                        className="h-full shrink-0 rounded-none border-0 bg-transparent text-text-secondary focus-visible:shadow-none"
                        disabled={isSubmitting}
                      >
                        <SelectValue>{currencyField.state.value}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_VALUES.map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {salaryField.state.meta.errors.length > 0 && (
                    <p className="text-xs text-danger">{salaryField.state.meta.errors[0]}</p>
                  )}
                </div>
              )}
            </form.Field>
          )}
        </form.Field>
      )}
    </form.Field>
  );
}
