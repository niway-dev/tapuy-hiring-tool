import { StatusBadge as TapuyStatusBadge } from "@interviews-tool/web-ui";
import type { HiringProcessStatus } from "@interviews-tool/domain/constants";
import { useStatusLabel } from "@/lib/i18n-labels";

interface StatusBadgeProps {
  status: HiringProcessStatus;
  className?: string;
}

/* Thin wrapper over the design-system StatusBadge that localizes the label
   (active statuses render tinted with a border, terminal ones solid). */
export function StatusBadge({ status, className }: StatusBadgeProps): React.ReactElement {
  const statusLabel = useStatusLabel();
  return <TapuyStatusBadge status={status} label={statusLabel(status)} className={className} />;
}
