import type { ObjectProperties } from "../types";

/**
 * Query vocabulary for hiring process list/board reads:
 * scope (active vs archived), sortable fields, sort direction.
 */
export const HIRING_PROCESS_SCOPES = {
  ACTIVE: "active",
  ARCHIVED: "archived",
} as const;

export type HiringProcessScope = ObjectProperties<typeof HIRING_PROCESS_SCOPES>;

export const HIRING_PROCESS_SCOPE_VALUES = [
  HIRING_PROCESS_SCOPES.ACTIVE,
  HIRING_PROCESS_SCOPES.ARCHIVED,
] as const;

export const HIRING_PROCESS_SORT_FIELDS = {
  UPDATED_AT: "updatedAt",
  COMPANY_NAME: "companyName",
  JOB_TITLE: "jobTitle",
  STATUS: "status",
  SALARY: "salary",
  ARCHIVED_AT: "archivedAt",
} as const;

export type HiringProcessSortField = ObjectProperties<typeof HIRING_PROCESS_SORT_FIELDS>;

export const HIRING_PROCESS_SORT_FIELD_VALUES = [
  HIRING_PROCESS_SORT_FIELDS.UPDATED_AT,
  HIRING_PROCESS_SORT_FIELDS.COMPANY_NAME,
  HIRING_PROCESS_SORT_FIELDS.JOB_TITLE,
  HIRING_PROCESS_SORT_FIELDS.STATUS,
  HIRING_PROCESS_SORT_FIELDS.SALARY,
  HIRING_PROCESS_SORT_FIELDS.ARCHIVED_AT,
] as const;

export const SORT_DIRECTIONS = {
  ASC: "asc",
  DESC: "desc",
} as const;

export type SortDirection = ObjectProperties<typeof SORT_DIRECTIONS>;

export const SORT_DIRECTION_VALUES = [SORT_DIRECTIONS.ASC, SORT_DIRECTIONS.DESC] as const;
