import type {
  HiringProcessScope,
  HiringProcessSortField,
  HiringProcessStatus,
  SortDirection,
} from "../constants";

/**
 * Standard API response structure
 * All API responses follow this format for consistency
 */
export interface ApiResponse<T> {
  data: T | null;
  error: { message: string } | null;
  meta?: {
    pagination?: PaginationMeta;
    counts?: HiringProcessCounts;
  };
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Pagination query parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Filter parameters for hiring process queries
 */
export interface HiringProcessFilterParams {
  statuses?: HiringProcessStatus[];
  salaryDeclared?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  /** default "active" — the repository applies archived_at IS NULL unless "archived" */
  scope?: HiringProcessScope;
  /** active scope only: OPEN status + updated_at older than STALE_DAYS */
  stale?: boolean;
}

/**
 * Sort parameters for hiring process lists
 */
export interface HiringProcessSortParams {
  sort?: HiringProcessSortField;
  dir?: SortDirection;
}

/**
 * Global per-user counters, independent of active filters
 */
export interface HiringProcessCounts {
  active: number;
  archived: number;
  open: number;
  closed: number;
  stale: number;
}

/**
 * Calculated pagination values
 */
export interface PaginationResult {
  page: number;
  limit: number;
  offset: number;
}
