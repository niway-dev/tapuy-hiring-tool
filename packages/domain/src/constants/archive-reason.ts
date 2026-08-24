import type { ObjectProperties } from "../types";

/**
 * Archive Reason Constants
 * Why a process left the active radar. Orthogonal to status:
 * archiving records WHERE it stopped (status stays) and WHY (this enum).
 */
export const ARCHIVE_REASONS = {
  NO_REPLY: "no-reply",
  THEY_PASSED: "they-passed",
  I_WITHDREW: "i-withdrew",
  ROLE_CLOSED: "role-closed",
} as const;

export type ArchiveReason = ObjectProperties<typeof ARCHIVE_REASONS>;

export const ARCHIVE_REASON_VALUES = [
  ARCHIVE_REASONS.NO_REPLY,
  ARCHIVE_REASONS.THEY_PASSED,
  ARCHIVE_REASONS.I_WITHDREW,
  ARCHIVE_REASONS.ROLE_CLOSED,
] as const;

export function isValidArchiveReason(value: string): value is ArchiveReason {
  return ARCHIVE_REASON_VALUES.includes(value as ArchiveReason);
}
