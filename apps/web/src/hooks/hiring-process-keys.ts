import type { HiringProcessStatus } from "@interviews-tool/domain/constants";

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface FilterParams {
  statuses?: HiringProcessStatus[];
  salaryDeclared?: boolean;
  salaryMin?: number;
  salaryMax?: number;
}

export interface HiringProcessListParams extends PaginationParams {
  filters?: FilterParams;
}

export type BoardParams = Pick<FilterParams, "salaryDeclared" | "salaryMin" | "salaryMax">;

/**
 * Shared query keys. Lives in its own module so the board hooks can do cache
 * surgery on the list (and vice versa) without a circular import.
 */
export const hiringProcessKeys = {
  all: ["hiringProcesses"] as const,
  lists: () => [...hiringProcessKeys.all, "list"] as const,
  list: (params?: HiringProcessListParams) => [...hiringProcessKeys.lists(), params] as const,
  details: () => [...hiringProcessKeys.all, "detail"] as const,
  detail: (id: string) => [...hiringProcessKeys.details(), id] as const,
  boards: () => [...hiringProcessKeys.all, "board"] as const,
  board: (params?: BoardParams) => [...hiringProcessKeys.boards(), params] as const,
};
