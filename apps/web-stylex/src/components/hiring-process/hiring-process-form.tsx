import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { ChevronDown } from "lucide-react";

import { Button, Input, Label, cn } from "@interviews-tool/web-ui";
import { useTranslations } from "@interviews-tool/i18n";
import {
  CURRENCIES,
  DEFAULT_HIRING_PROCESS_STATUS,
  SALARY_RATE_TYPES,
  type Currency,
  type HiringProcessStatus,
  type SalaryRateType,
} from "@interviews-tool/domain/constants";
import type { CreateHiringProcessInput } from "@/hooks/use-hiring-processes";
import type { CreateCompanyDetailsInput } from "@/hooks/use-company-details";
import { StatusField } from "./status-field";
import { SalaryField } from "./salary-field";
import { CompanyDetailsFields } from "./company-details-fields";

export interface HiringProcessFormValues {
  companyName: string;
  jobTitle: string;
  status: HiringProcessStatus;
  salary: number | undefined;
  currency: Currency;
  salaryRateType: SalaryRateType;
  website: string;
  location: string;
  contactedVia: string;
  contactPerson: string;
  interviewSteps: number | undefined;
  benefits: string;
}

/* Typed handle for the field components in this folder. Kept as a hook so
   ReturnType captures TanStack Form's full generic without spelling it out. */
function useHiringProcessForm(
  defaultValues: HiringProcessFormValues,
  onSubmitValues: (values: HiringProcessFormValues) => void,
) {
  return useForm({
    defaultValues,
    onSubmit: async ({ value }) => onSubmitValues(value),
  });
}

export type HiringProcessFormApi = ReturnType<typeof useHiringProcessForm>;

interface HiringProcessFormProps {
  initialValues?: Partial<CreateHiringProcessInput>;
  initialCompanyDetails?: Partial<CreateCompanyDetailsInput>;
  onSubmit: (data: CreateHiringProcessInput, companyDetails?: CreateCompanyDetailsInput) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  mode: "create" | "edit";
}

export function HiringProcessForm({
  initialValues,
  initialCompanyDetails,
  onSubmit,
  onCancel,
  isSubmitting = false,
  mode,
}: HiringProcessFormProps): React.ReactElement {
  const t = useTranslations("processForm");

  const hasInitialDetails = Boolean(
    initialCompanyDetails &&
    Object.values(initialCompanyDetails).some((v) => v !== undefined && v !== "" && v !== null),
  );
  const [showCompanyDetails, setShowCompanyDetails] = useState(hasInitialDetails);

  const form = useHiringProcessForm(
    {
      companyName: initialValues?.companyName ?? "",
      jobTitle: initialValues?.jobTitle ?? "",
      status: initialValues?.status ?? DEFAULT_HIRING_PROCESS_STATUS,
      salary: initialValues?.salary as number | undefined,
      currency: initialValues?.currency ?? CURRENCIES.USD,
      salaryRateType: initialValues?.salaryRateType ?? SALARY_RATE_TYPES.MONTHLY,
      website: initialCompanyDetails?.website ?? "",
      location: initialCompanyDetails?.location ?? "",
      contactedVia: initialCompanyDetails?.contactedVia ?? "",
      contactPerson: initialCompanyDetails?.contactPerson ?? "",
      interviewSteps: initialCompanyDetails?.interviewSteps as number | undefined,
      benefits: initialCompanyDetails?.benefits ?? "",
    },
    (value) => {
      const companyDetails: CreateCompanyDetailsInput = {
        website: value.website || undefined,
        location: value.location || undefined,
        contactedVia: value.contactedVia || undefined,
        contactPerson: value.contactPerson || undefined,
        interviewSteps: value.interviewSteps || undefined,
        benefits: value.benefits || undefined,
      };
      const hasDetails = Object.values(companyDetails).some((v) => v !== undefined);

      onSubmit(
        {
          companyName: value.companyName,
          jobTitle: value.jobTitle || undefined,
          status: value.status,
          salary: value.salary,
          currency: value.currency,
          salaryRateType: value.salaryRateType,
        },
        hasDetails ? companyDetails : undefined,
      );
    },
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="grid gap-7"
    >
      {/* Company name — the only required field, and it shows */}
      <form.Field
        name="companyName"
        validators={{
          onSubmit: ({ value }) => (!value.trim() ? t("companyNameRequired") : undefined),
        }}
      >
        {(field) => (
          <div className="grid gap-2">
            <Label htmlFor="companyName">{t("companyName")}</Label>
            <Input
              id="companyName"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder={t("companyPlaceholder")}
              disabled={isSubmitting}
              className={cn(
                "h-[52px] text-xl",
                field.state.meta.errors.length > 0 && "border-danger",
              )}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-xs text-danger">{field.state.meta.errors[0]}</p>
            )}
          </div>
        )}
      </form.Field>

      {/* Job title | Status with live badge */}
      <div className="grid grid-cols-1 gap-7 sm:grid-cols-[1fr_220px] sm:gap-6">
        <form.Field name="jobTitle">
          {(field) => (
            <div className="grid content-start gap-2">
              <Label htmlFor="jobTitle">{t("jobTitle")}</Label>
              <Input
                id="jobTitle"
                className="h-9"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder={t("jobTitlePlaceholder")}
                disabled={isSubmitting}
              />
            </div>
          )}
        </form.Field>

        <StatusField form={form} isSubmitting={isSubmitting} />
      </div>

      {/* Salary — "Numbers, not vibes" */}
      <SalaryField form={form} isSubmitting={isSubmitting} />

      {/* Company details — collapsible */}
      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setShowCompanyDetails((open) => !open)}
          className="flex w-full items-center justify-between text-left"
          disabled={isSubmitting}
        >
          <span className="text-sm font-medium text-text">{t("companyDetails")}</span>
          <ChevronDown
            className={cn(
              "size-4 text-text-muted transition-transform",
              showCompanyDetails && "rotate-180",
            )}
          />
        </button>

        {showCompanyDetails && <CompanyDetailsFields form={form} isSubmitting={isSubmitting} />}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 border-t border-border pt-6">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("saving") : mode === "create" ? t("create") : t("save")}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            {t("cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
