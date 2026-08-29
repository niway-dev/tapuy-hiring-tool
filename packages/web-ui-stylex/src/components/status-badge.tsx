import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import * as React from "react";

import { colors } from "@interviews-tool/design-tokens/tokens.stylex";

/* The 8 hiring-process statuses. Kept as literals here so the design system
   stays dependency-free; the domain package owns the canonical list. */
export type StatusBadgeStatus =
  | "first-contact"
  | "ongoing"
  | "on-hold"
  | "offer-made"
  | "offer-accepted"
  | "hired"
  | "rejected"
  | "dropped-out";

const base = stylex.create({
  root: {
    display: "inline-flex",
    width: "fit-content",
    alignItems: "center",
    whiteSpace: "nowrap",
    borderRadius: 5,
    borderWidth: 1,
    borderStyle: "solid",
    paddingInline: 8,
    paddingBlock: 2,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: "18px",
  },
});

/* One namespace per hiring status, plus "unknown" for a status string outside
   the known set. Token triples transcribed straight from
   packages/web-ui/src/components/status-badge.tsx's cva block: active
   statuses (first-contact, ongoing, on-hold, offer-made) are tinted with a
   border; terminal statuses (offer-accepted, hired, rejected, dropped-out)
   are solid — the source never sets a border color for those (only the
   shared `border-transparent` base class applies), so borderColor:
   "transparent" here reproduces that omission rather than adding a real
   border that would shift layout. "unknown" mirrors the source's fallback
   span (bg-surface-2 / text-text-secondary, also border-transparent). */
const byStatus = stylex.create({
  "first-contact": {
    backgroundColor: colors.stFirstContactBg,
    color: colors.stFirstContactText,
    borderColor: colors.stFirstContactBorder,
  },
  ongoing: {
    backgroundColor: colors.stOngoingBg,
    color: colors.stOngoingText,
    borderColor: colors.stOngoingBorder,
  },
  "on-hold": {
    backgroundColor: colors.stOnHoldBg,
    color: colors.stOnHoldText,
    borderColor: colors.stOnHoldBorder,
  },
  "offer-made": {
    backgroundColor: colors.stOfferMadeBg,
    color: colors.stOfferMadeText,
    borderColor: colors.stOfferMadeBorder,
  },
  "offer-accepted": {
    backgroundColor: colors.stOfferAcceptedBg,
    color: colors.stOfferAcceptedText,
    borderColor: "transparent",
  },
  hired: {
    backgroundColor: colors.stHiredBg,
    color: colors.stHiredText,
    borderColor: "transparent",
  },
  rejected: {
    backgroundColor: colors.stRejectedBg,
    color: colors.stRejectedText,
    borderColor: "transparent",
  },
  "dropped-out": {
    backgroundColor: colors.stDroppedOutBg,
    color: colors.stDroppedOutText,
    borderColor: "transparent",
  },
  unknown: {
    backgroundColor: colors.surface2,
    color: colors.textSecondary,
    borderColor: "transparent",
  },
});

/* Sentence case, per the brand voice */
const statusLabels: Record<StatusBadgeStatus, string> = {
  "first-contact": "First contact",
  ongoing: "Ongoing",
  "on-hold": "On hold",
  "offer-made": "Offer made",
  "offer-accepted": "Offer accepted",
  hired: "Hired",
  rejected: "Rejected",
  "dropped-out": "Dropped out",
};

export type StatusBadgeProps = Omit<React.ComponentProps<"span">, "className" | "style"> & {
  status: StatusBadgeStatus | (string & {});
  /** Overrides the built-in sentence-case label */
  label?: string;
  style?: StyleXStyles;
};

export function StatusBadge({ status, label, style, ...props }: StatusBadgeProps) {
  const known = status in statusLabels ? (status as StatusBadgeStatus) : undefined;

  /* Not routed through the shared `variant()` helper (packages/web-ui-stylex
     /src/lib/variants.ts): `@stylexjs/babel-plugin`'s dead-style elimination
     only keeps a `stylex.create()` binding alive when it finds a literal
     MemberExpression on that binding inside the `stylex.props()` call's own
     argument list — passing the whole namespace object through a function
     (as `variant(map, key, fallback)` does) is invisible to that check, so
     the plugin deletes the `byStatus` declaration outright and this becomes
     `ReferenceError: byStatus is not defined` at runtime, in both dev/test
     and production (runtimeInjection) builds. Confirmed with a minimal
     `stylex.create` + arg-passing repro against this repo's installed
     @stylexjs/babel-plugin@0.19.0. Indexing directly in the call below,
     `byStatus[key]`, IS a MemberExpression the plugin's argument-traversal
     sees, so it keeps the whole namespace (it cannot resolve the key
     statically, so it keeps every entry) — this is the pattern to use for
     any future stylex.create() map indexed by a runtime-only key. */
  return (
    <span
      data-slot="status-badge"
      data-status={known}
      {...stylex.props(base.root, byStatus[known ?? "unknown"], style)}
      {...props}
    >
      {label ?? (known ? statusLabels[known] : status)}
    </span>
  );
}

export { statusLabels };
