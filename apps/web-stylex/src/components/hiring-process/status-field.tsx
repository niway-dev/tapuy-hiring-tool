import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
} from "@interviews-tool/web-ui";
import { useTranslations } from "@interviews-tool/i18n";
import type { HiringProcessStatus } from "@interviews-tool/domain/constants";
import { useStatusLabel } from "@/lib/i18n-labels";
import type { HiringProcessFormApi } from "./hiring-process-form";

/* Pipeline order for the status select (the domain constant orders terminal
   statuses differently; the pipeline reads better in the picker). */
const PIPELINE_STATUSES: HiringProcessStatus[] = [
  "first-contact",
  "ongoing",
  "on-hold",
  "offer-made",
  "offer-accepted",
  "hired",
  "rejected",
  "dropped-out",
];

interface StatusFieldProps {
  form: HiringProcessFormApi;
  isSubmitting: boolean;
}

export function StatusField({ form, isSubmitting }: StatusFieldProps): React.ReactElement {
  const t = useTranslations("processForm");
  const statusLabel = useStatusLabel();

  return (
    <form.Field name="status">
      {(field) => (
        <div className="grid content-start gap-2">
          <Label htmlFor="status">{t("status")}</Label>
          <Select
            value={field.state.value}
            onValueChange={(value) => field.handleChange(value as HiringProcessStatus)}
          >
            <SelectTrigger id="status" className="h-9 w-full" disabled={isSubmitting}>
              <SelectValue>{statusLabel(field.state.value)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <StatusBadge status={field.state.value} label={statusLabel(field.state.value)} />
        </div>
      )}
    </form.Field>
  );
}
