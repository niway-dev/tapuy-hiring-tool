import { useMutation, useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { clientTreaty } from "@/lib/client-treaty";
import { getErrorMessage } from "@/lib/error";
import { getHiringProcesses } from "@/functions/get-hiring-processes";
import type {
  HiringProcessBase,
  CreateHiringProcess,
  UpdateHiringProcess,
} from "@interviews-tool/domain/schemas";
import { hiringProcessKeys, type HiringProcessListParams } from "./hiring-process-keys";

// Re-export types from domain package
export type { Currency, HiringProcessStatus } from "@interviews-tool/domain/constants";

// Re-export domain types for convenience
export type HiringProcess = HiringProcessBase;
export type CreateHiringProcessInput = CreateHiringProcess;
export type UpdateHiringProcessInput = UpdateHiringProcess;

export { hiringProcessKeys };
export type {
  PaginationParams,
  FilterParams,
  HiringProcessListParams,
  BoardParams,
} from "./hiring-process-keys";

// Standalone query options — usable in both hooks and route loaders
export function hiringProcessesQueryOptions(
  params: HiringProcessListParams = { page: 1, limit: 5 },
) {
  return queryOptions({
    queryKey: hiringProcessKeys.list(params),
    queryFn: () =>
      getHiringProcesses({
        data: {
          page: params.page,
          limit: params.limit,
          ...params.filters,
        },
      }),
    placeholderData: (previousData) => previousData,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

// Fetch all hiring processes with pagination and filters
export function useHiringProcesses(params: HiringProcessListParams = { page: 1, limit: 5 }) {
  return useQuery(hiringProcessesQueryOptions(params));
}

// Fetch single hiring process
export function useHiringProcess(id: string) {
  return useQuery({
    queryKey: hiringProcessKeys.detail(id),
    queryFn: async () => {
      const result = await clientTreaty.api.v1["hiring-processes"]({ id }).get();
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      if (!result.data) {
        throw new Error("No data returned from server");
      }
      const { error, data } = result.data;
      if (error) {
        throw new Error(error?.message || "An error occurred");
      }
      return data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Create hiring process mutation
export function useCreateHiringProcess() {
  const queryClient = useQueryClient();

  return useMutation<HiringProcess, Error, CreateHiringProcessInput>({
    mutationFn: async (data: CreateHiringProcessInput): Promise<HiringProcess> => {
      const result = await clientTreaty.api.v1["hiring-processes"].post(data);
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      // Backend returns { data: HiringProcess }, so we need to access result.data.data
      return (result.data as { data: HiringProcess }).data;
    },
    onSuccess: () => {
      // Invalidate lists and board alike
      queryClient.invalidateQueries({ queryKey: hiringProcessKeys.all });
    },
  });
}

// Update hiring process mutation
export function useUpdateHiringProcess() {
  const queryClient = useQueryClient();

  return useMutation<HiringProcess, Error, { id: string; data: UpdateHiringProcessInput }>({
    mutationFn: async ({ id, data }): Promise<HiringProcess> => {
      const result = await clientTreaty.api.v1["hiring-processes"]({ id }).put(data);
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      // Backend returns { data: HiringProcess }, so we need to access result.data.data
      return (result.data as { data: HiringProcess }).data;
    },
    onSuccess: (_, variables) => {
      // Invalidate lists, board and the specific detail
      queryClient.invalidateQueries({ queryKey: hiringProcessKeys.all });
      queryClient.invalidateQueries({ queryKey: hiringProcessKeys.detail(variables.id) });
    },
  });
}

// Delete hiring process mutation
export function useDeleteHiringProcess() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const result = await clientTreaty.api.v1["hiring-processes"]({ id }).delete();
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      return;
    },
    onSuccess: () => {
      // Invalidate lists and board alike
      queryClient.invalidateQueries({ queryKey: hiringProcessKeys.all });
    },
  });
}
