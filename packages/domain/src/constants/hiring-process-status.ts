import type { ObjectProperties } from "../types";

/**
 * Hiring Process Status Constants
 * Represents the current stage of a hiring process
 */
export const HIRING_PROCESS_STATUSES = {
  FIRST_CONTACT: "first-contact",
  ONGOING: "ongoing",
  ON_HOLD: "on-hold",
  REJECTED: "rejected",
  DROPPED_OUT: "dropped-out",
  HIRED: "hired",
  OFFER_MADE: "offer-made",
  OFFER_ACCEPTED: "offer-accepted",
} as const;

/**
 * Type for hiring process status values
 */
export type HiringProcessStatus = ObjectProperties<typeof HIRING_PROCESS_STATUSES>;

export const HIRING_PROCESS_STATUS_VALUES = [
  HIRING_PROCESS_STATUSES.FIRST_CONTACT,
  HIRING_PROCESS_STATUSES.ONGOING,
  HIRING_PROCESS_STATUSES.ON_HOLD,
  HIRING_PROCESS_STATUSES.REJECTED,
  HIRING_PROCESS_STATUSES.DROPPED_OUT,
  HIRING_PROCESS_STATUSES.HIRED,
  HIRING_PROCESS_STATUSES.OFFER_MADE,
  HIRING_PROCESS_STATUSES.OFFER_ACCEPTED,
] as const;

/**
 * Pipeline order — board columns, status <select> order, and the sort
 * criterion for the Status column. This is DISPLAY order and is intentionally
 * different from HIRING_PROCESS_STATUS_VALUES (which feeds the pgEnum and
 * must never be reordered) and from HIRING_PROCESS_STATUS_INFO[x].order.
 */
export const HIRING_PROCESS_STATUS_ORDER = [
  HIRING_PROCESS_STATUSES.FIRST_CONTACT,
  HIRING_PROCESS_STATUSES.ONGOING,
  HIRING_PROCESS_STATUSES.ON_HOLD,
  HIRING_PROCESS_STATUSES.OFFER_MADE,
  HIRING_PROCESS_STATUSES.OFFER_ACCEPTED,
  HIRING_PROCESS_STATUSES.HIRED,
  HIRING_PROCESS_STATUSES.REJECTED,
  HIRING_PROCESS_STATUSES.DROPPED_OUT,
] as const satisfies readonly HiringProcessStatus[];

/** First 4 of the pipeline: statuses that keep a process "open" */
export const OPEN_STATUSES: readonly HiringProcessStatus[] = HIRING_PROCESS_STATUS_ORDER.slice(
  0,
  4,
);

/** Last 4 of the pipeline: terminal statuses */
export const CLOSED_STATUSES: readonly HiringProcessStatus[] = HIRING_PROCESS_STATUS_ORDER.slice(4);

/** Index of a status within the pipeline; sort comparator for the Status column */
export function statusPipelineIndex(status: HiringProcessStatus): number {
  return HIRING_PROCESS_STATUS_ORDER.indexOf(status);
}

/**
 * Status metadata for UI display and business logic
 */
export const HIRING_PROCESS_STATUS_INFO: Record<
  HiringProcessStatus,
  {
    label: string;
    description: string;
    order: number;
    category: "active" | "terminal";
    color: string;
  }
> = {
  [HIRING_PROCESS_STATUSES.FIRST_CONTACT]: {
    label: "First Contact",
    description: "Initial outreach via LinkedIn, email, or other channel",
    order: 1,
    category: "active" as const,
    color: "#8b5cf6",
  },
  [HIRING_PROCESS_STATUSES.ONGOING]: {
    label: "Ongoing",
    description: "Active interview process",
    order: 2,
    category: "active" as const,
    color: "#3b82f6",
  },
  [HIRING_PROCESS_STATUSES.ON_HOLD]: {
    label: "On Hold",
    description: "Position is cold, stopped, or no recent updates",
    order: 3,
    category: "active" as const,
    color: "#f59e0b",
  },
  [HIRING_PROCESS_STATUSES.REJECTED]: {
    label: "Rejected",
    description: "Application or interview was rejected",
    order: 4,
    category: "terminal" as const,
    color: "#ef4444",
  },
  [HIRING_PROCESS_STATUSES.DROPPED_OUT]: {
    label: "Dropped Out",
    description: "Candidate withdrew from the process",
    order: 5,
    category: "terminal" as const,
    color: "#6b7280",
  },
  [HIRING_PROCESS_STATUSES.HIRED]: {
    label: "Hired",
    description: "Successfully hired",
    order: 6,
    category: "terminal" as const,
    color: "#22c55e",
  },
  [HIRING_PROCESS_STATUSES.OFFER_MADE]: {
    label: "Offer Made",
    description: "Company has made an offer to the candidate",
    order: 7,
    category: "active" as const,
    color: "#06b6d4",
  },
  [HIRING_PROCESS_STATUSES.OFFER_ACCEPTED]: {
    label: "Offer Accepted",
    description: "Candidate has accepted the offer",
    order: 8,
    category: "terminal" as const,
    color: "#10b981",
  },
} as const;

/**
 * Valid status transitions
 * Defines which statuses can transition to which other statuses
 */
export const STATUS_TRANSITIONS: Record<HiringProcessStatus, HiringProcessStatus[]> = {
  [HIRING_PROCESS_STATUSES.FIRST_CONTACT]: [
    HIRING_PROCESS_STATUSES.ONGOING,
    HIRING_PROCESS_STATUSES.ON_HOLD,
    HIRING_PROCESS_STATUSES.REJECTED,
    HIRING_PROCESS_STATUSES.DROPPED_OUT,
  ],
  [HIRING_PROCESS_STATUSES.ONGOING]: [
    HIRING_PROCESS_STATUSES.ON_HOLD,
    HIRING_PROCESS_STATUSES.REJECTED,
    HIRING_PROCESS_STATUSES.DROPPED_OUT,
    HIRING_PROCESS_STATUSES.HIRED,
  ],
  [HIRING_PROCESS_STATUSES.ON_HOLD]: [
    HIRING_PROCESS_STATUSES.ONGOING,
    HIRING_PROCESS_STATUSES.REJECTED,
    HIRING_PROCESS_STATUSES.DROPPED_OUT,
    HIRING_PROCESS_STATUSES.HIRED,
    HIRING_PROCESS_STATUSES.OFFER_MADE,
  ],
  [HIRING_PROCESS_STATUSES.REJECTED]: [], // Terminal status
  [HIRING_PROCESS_STATUSES.DROPPED_OUT]: [], // Terminal status
  [HIRING_PROCESS_STATUSES.HIRED]: [], // Terminal status
  [HIRING_PROCESS_STATUSES.OFFER_MADE]: [
    HIRING_PROCESS_STATUSES.OFFER_ACCEPTED,
    HIRING_PROCESS_STATUSES.REJECTED,
    HIRING_PROCESS_STATUSES.DROPPED_OUT,
    HIRING_PROCESS_STATUSES.ON_HOLD,
  ],
  [HIRING_PROCESS_STATUSES.OFFER_ACCEPTED]: [], // Terminal status
};

/**
 * Check if a value is a valid hiring process status
 */
export function isValidHiringProcessStatus(value: string): value is HiringProcessStatus {
  return HIRING_PROCESS_STATUS_VALUES.includes(value as HiringProcessStatus);
}

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(
  from: HiringProcessStatus,
  to: HiringProcessStatus,
): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

/**
 * Get all active statuses (non-terminal)
 */
export function getActiveStatuses(): HiringProcessStatus[] {
  return HIRING_PROCESS_STATUS_VALUES.filter(
    (status) => HIRING_PROCESS_STATUS_INFO[status].category === "active",
  );
}

/**
 * Get all terminal statuses
 */
export function getTerminalStatuses(): HiringProcessStatus[] {
  return HIRING_PROCESS_STATUS_VALUES.filter(
    (status) => HIRING_PROCESS_STATUS_INFO[status].category === "terminal",
  );
}

/**
 * Default status for new hiring processes
 */
export const DEFAULT_HIRING_PROCESS_STATUS = HIRING_PROCESS_STATUSES.FIRST_CONTACT;
