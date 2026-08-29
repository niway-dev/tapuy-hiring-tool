import type { StyleXStyles } from "@stylexjs/stylex";

import { StatusBadge as TapuyStatusBadge } from "@interviews-tool/web-ui-stylex";
import type { HiringProcessStatus } from "@interviews-tool/domain/constants";
import { useStatusLabel } from "@/lib/i18n-labels";

interface StatusBadgeProps {
  status: HiringProcessStatus;
  style?: StyleXStyles;
}

/* Thin wrapper over the design-system StatusBadge that localizes the label
   (active statuses render tinted with a border, terminal ones solid). */
export function StatusBadge({ status, style }: StatusBadgeProps): React.ReactElement {
  const statusLabel = useStatusLabel();
  return <TapuyStatusBadge status={status} label={statusLabel(status)} style={style} />;
}
