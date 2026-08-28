import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@interviews-tool/web-ui";
import { useTranslations } from "@interviews-tool/i18n";
import type { HiringProcessFormApi } from "./hiring-process-form";

const CONTACTED_VIA_VALUES = ["LinkedIn", "Email", "Facebook", "Other"] as const;

function isValidWebsite(value: string): boolean {
  try {
    new URL(value.startsWith("http") ? value : `https://${value}`);
    return value.includes(".");
  } catch {
    return false;
  }
}

interface CompanyDetailsFieldsProps {
  form: HiringProcessFormApi;
  isSubmitting: boolean;
}

/* The optional company-details grid inside the collapsible section */
export function CompanyDetailsFields({
  form,
  isSubmitting,
}: CompanyDetailsFieldsProps): React.ReactElement {
  const t = useTranslations("processForm");

  return (
    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <form.Field
        name="website"
        validators={{
          onSubmit: ({ value }) =>
            value && !isValidWebsite(value) ? t("websiteInvalid") : undefined,
        }}
      >
        {(field) => (
          <div className="grid content-start gap-2">
            <Label htmlFor="website">{t("website")}</Label>
            <Input
              id="website"
              className="h-9"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder={t("websitePlaceholder")}
              disabled={isSubmitting}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-xs text-danger">{field.state.meta.errors[0]}</p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="location">
        {(field) => (
          <div className="grid content-start gap-2">
            <Label htmlFor="location">{t("location")}</Label>
            <Input
              id="location"
              className="h-9"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder={t("locationPlaceholder")}
              disabled={isSubmitting}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="contactedVia">
        {(field) => (
          <div className="grid content-start gap-2">
            <Label htmlFor="contactedVia">{t("contactedVia")}</Label>
            <Select
              value={field.state.value || undefined}
              onValueChange={(value) => field.handleChange(value ?? "")}
            >
              <SelectTrigger id="contactedVia" className="h-9 w-full" disabled={isSubmitting}>
                <SelectValue>
                  {field.state.value ? (
                    field.state.value === "Other" ? (
                      t("otherOption")
                    ) : (
                      field.state.value
                    )
                  ) : (
                    <span className="text-text-muted">{t("contactedViaPlaceholder")}</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CONTACTED_VIA_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value === "Other" ? t("otherOption") : value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </form.Field>

      <form.Field name="contactPerson">
        {(field) => (
          <div className="grid content-start gap-2">
            <Label htmlFor="contactPerson">{t("contactPerson")}</Label>
            <Input
              id="contactPerson"
              className="h-9"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder={t("contactPersonPlaceholder")}
              disabled={isSubmitting}
            />
          </div>
        )}
      </form.Field>

      <form.Field
        name="interviewSteps"
        validators={{
          onSubmit: ({ value }) =>
            value !== undefined && (!Number.isInteger(value) || value < 0)
              ? t("interviewStepsInvalid")
              : undefined,
        }}
      >
        {(field) => (
          <div className="grid content-start gap-2">
            <Label htmlFor="interviewSteps">{t("interviewSteps")}</Label>
            <Input
              id="interviewSteps"
              type="number"
              min={0}
              className="mono h-9"
              value={field.state.value ?? ""}
              onChange={(e) =>
                field.handleChange(e.target.value ? Number(e.target.value) : undefined)
              }
              disabled={isSubmitting}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-xs text-danger">{field.state.meta.errors[0]}</p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="benefits">
        {(field) => (
          <div className="col-span-1 grid content-start gap-2 sm:col-span-2">
            <Label htmlFor="benefits">{t("benefits")}</Label>
            <Textarea
              id="benefits"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder={t("benefitsPlaceholder")}
              rows={3}
              disabled={isSubmitting}
            />
          </div>
        )}
      </form.Field>
    </div>
  );
}
