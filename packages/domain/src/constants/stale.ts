import { OPEN_STATUSES } from "./hiring-process-status";
import type { HiringProcessStatus } from "./hiring-process-status";

/**
 * A process is stale when it is active (not archived), in an OPEN status,
 * and its updatedAt is strictly older than STALE_DAYS.
 * Single source for the threshold — DB queries and UI both derive from here.
 */
export const STALE_DAYS = 45;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The updatedAt cutoff: anything strictly older than this is stale. */
export function staleCutoff(now: Date): Date {
  return new Date(now.getTime() - STALE_DAYS * DAY_MS);
}

export function isStaleProcess(
  process: { status: HiringProcessStatus; updatedAt: Date; archivedAt?: Date | null },
  now: Date,
): boolean {
  if (process.archivedAt) return false;
  if (!OPEN_STATUSES.includes(process.status)) return false;
  return now.getTime() - process.updatedAt.getTime() > STALE_DAYS * DAY_MS;
}

/**
 * Relative age for cards and stale rows: "today" | "4d" | "2mo" | "1y".
 * The UI translates only the "today" literal; suffixed forms render as-is in mono.
 */
export function formatAge(date: Date, now: Date): string {
  const days = Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS));
  if (days < 1) return "today";
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.max(1, Math.floor(days / 365))}y`;
}
