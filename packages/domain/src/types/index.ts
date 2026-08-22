/**
 * Utility type to extract object property values
 * Useful for creating type-safe constants
 */
export type ObjectProperties<T> = T[keyof T];

// Export Result types
export type { Success, Failure, Result } from "./result";

export { tryCatch, isSuccess, isFailure, unwrap } from "./result";

// Export API Response types
export type {
  ApiResponse,
  PaginationMeta,
  PaginationParams,
  PaginationResult,
  HiringProcessFilterParams,
  HiringProcessSortParams,
  HiringProcessCounts,
} from "./api-response";
