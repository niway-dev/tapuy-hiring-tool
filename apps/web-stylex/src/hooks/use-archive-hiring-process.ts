import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clientTreaty } from "@/lib/client-treaty";
import { getErrorMessage } from "@/lib/error";
import { hiringProcessKeys } from "./hiring-process-keys";
import type { ArchiveReason } from "@interviews-tool/domain/constants";
import type { ApiResponse } from "@interviews-tool/domain/types";
import type { HiringProcessBase } from "@interviews-tool/domain/schemas";

type ListResponse = ApiResponse<HiringProcessBase[]>;

/**
 * Drops the row from whichever list is on screen and adjusts the totals.
 * The row leaves the current scope either way: archiving removes it from
 * Active, restoring removes it from Archived.
 */
function dropRow(old: ListResponse | undefined, id: string, direction: "archive" | "restore") {
  if (!old?.data) return old;
  if (!old.data.some((row) => row.id === id)) return old;

  const data = old.data.filter((row) => row.id !== id);
  const pagination = old.meta?.pagination;
  const counts = old.meta?.counts;

  return {
    ...old,
    data,
    meta: {
      ...old.meta,
      pagination: pagination
        ? { ...pagination, total: Math.max(0, pagination.total - 1) }
        : pagination,
      counts: counts
        ? {
            ...counts,
            active: counts.active + (direction === "archive" ? -1 : 1),
            archived: counts.archived + (direction === "archive" ? 1 : -1),
          }
        : counts,
    },
  };
}

function useScopeChangeMutation(direction: "archive" | "restore") {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; reason?: ArchiveReason }, { snapshot: unknown }>({
    mutationFn: async ({ id, reason }) => {
      const endpoint = clientTreaty.api.v1["hiring-processes"]({ id });
      const result =
        direction === "archive"
          ? await endpoint.archive.post({ reason: reason as ArchiveReason })
          : await endpoint.restore.post();

      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
    },

    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: hiringProcessKeys.all });
      const snapshot = queryClient.getQueriesData({ queryKey: hiringProcessKeys.all });

      queryClient.setQueriesData<ListResponse>({ queryKey: hiringProcessKeys.lists() }, (old) =>
        dropRow(old, id, direction),
      );

      return { snapshot };
    },

    onError: (_error, _variables, context) => {
      for (const [key, data] of (context?.snapshot ?? []) as [readonly unknown[], unknown][]) {
        queryClient.setQueryData(key, data);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: hiringProcessKeys.all });
    },
  });
}

export function useArchiveHiringProcess() {
  return useScopeChangeMutation("archive");
}

export function useRestoreHiringProcess() {
  return useScopeChangeMutation("restore");
}
