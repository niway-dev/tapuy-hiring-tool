import { useMutation, useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { clientTreaty } from "@/lib/client-treaty";
import { getErrorMessage } from "@/lib/error";
import { getHiringBoardData } from "@/functions/get-hiring-board";
import { hiringProcessKeys, type BoardParams } from "./hiring-process-keys";
import { OPEN_STATUSES, type HiringProcessStatus } from "@interviews-tool/domain/constants";
import type { BoardResult } from "@interviews-tool/application/hiring";
import type { ApiResponse } from "@interviews-tool/domain/types";

type BoardResponse = ApiResponse<BoardResult>;

export function hiringBoardQueryOptions(params: BoardParams = {}) {
  return queryOptions({
    queryKey: hiringProcessKeys.board(params),
    queryFn: () => getHiringBoardData({ data: params }),
    placeholderData: (previousData) => previousData,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useHiringBoard(params: BoardParams = {}, options: { enabled?: boolean } = {}) {
  return useQuery({ ...hiringBoardQueryOptions(params), enabled: options.enabled ?? true });
}

export interface MoveStatusVariables {
  id: string;
  status: HiringProcessStatus;
}

/**
 * Moves a card to another column.
 *
 * Optimistic: the card jumps immediately and rolls back if the request fails.
 * The caller owns the toast (it has the translations) and undoes a move by
 * calling this same mutation with the previous status.
 */
export function useMoveHiringProcessStatus() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, MoveStatusVariables, { snapshot: unknown }>({
    mutationFn: async ({ id, status }) => {
      const result = await clientTreaty.api.v1["hiring-processes"]({ id }).status.patch({ status });
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
    },

    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: hiringProcessKeys.boards() });
      const snapshot = queryClient.getQueriesData({ queryKey: hiringProcessKeys.boards() });

      queryClient.setQueriesData<BoardResponse>({ queryKey: hiringProcessKeys.boards() }, (old) =>
        old?.data ? { ...old, data: moveCard(old.data, id, status) } : old,
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

/**
 * Pure board transition: pull the card out of its column, put it at the top of
 * the target one (the board sorts by updatedAt desc and a move refreshes it),
 * and keep the counters consistent.
 */
function moveCard(board: BoardResult, id: string, status: HiringProcessStatus): BoardResult {
  const card = board.columns.flatMap((column) => column.cards).find((c) => c.id === id);
  if (!card || card.status === status) return board;

  const moved = { ...card, status, updatedAt: new Date() };

  const columns = board.columns.map((column) => {
    if (column.status === card.status) {
      const cards = column.cards.filter((c) => c.id !== id);
      return { ...column, cards, count: cards.length };
    }
    if (column.status === status) {
      const cards = [moved, ...column.cards];
      return { ...column, cards, count: cards.length };
    }
    return column;
  });

  const open = columns
    .filter((column) => OPEN_STATUSES.includes(column.status))
    .reduce((total, column) => total + column.count, 0);

  return {
    columns,
    counts: { ...board.counts, open, closed: board.counts.active - open },
  };
}
