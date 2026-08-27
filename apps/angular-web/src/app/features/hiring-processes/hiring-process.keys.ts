import type { HiringProcessListParams } from "../../core/api/hiring-process.model";

/** Same shape as apps/web/src/hooks/hiring-process-keys.ts so both clients stay aligned. */
export const hiringProcessKeys = {
  all: ["hiringProcesses"] as const,
  lists: () => [...hiringProcessKeys.all, "list"] as const,
  list: (params: HiringProcessListParams) => [...hiringProcessKeys.lists(), params] as const,
  details: () => [...hiringProcessKeys.all, "detail"] as const,
  detail: (id: string) => [...hiringProcessKeys.details(), id] as const,
};
