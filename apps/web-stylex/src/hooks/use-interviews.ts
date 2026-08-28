import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientTreaty } from "@/lib/client-treaty";
import { getErrorMessage } from "@/lib/error";
import type {
  HiringProcessBase,
  CreateHiringProcess,
  UpdateHiringProcess,
} from "@interviews-tool/domain/schemas";

// Re-export types from domain package
export type { Currency, HiringProcessStatus } from "@interviews-tool/domain/constants";

// Note: Interviews are currently aliased to hiring processes
// Re-export domain types for convenience
export type Interview = HiringProcessBase;
export type CreateInterviewInput = CreateHiringProcess;
export type UpdateInterviewInput = UpdateHiringProcess;

// Query keys
const interviewKeys = {
  all: ["interviews"] as const,
  lists: () => [...interviewKeys.all, "list"] as const,
  list: () => [...interviewKeys.lists()] as const,
  details: () => [...interviewKeys.all, "detail"] as const,
  detail: (id: string) => [...interviewKeys.details(), id] as const,
};

// Fetch all interviews
export function useInterviews() {
  return useQuery({
    queryKey: interviewKeys.list(),
    queryFn: async () => {
      const result = await clientTreaty.api.v1["hiring-processes"].get();
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      return result.data;
    },
  });
}

// Fetch single interview
export function useInterview(id: string) {
  return useQuery({
    queryKey: interviewKeys.detail(id),
    queryFn: async () => {
      const result = await clientTreaty.api.v1["hiring-processes"]({ id }).get();
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      return result.data;
    },
    enabled: !!id,
  });
}

// Create interview mutation
export function useCreateInterview() {
  const queryClient = useQueryClient();

  return useMutation<Interview, Error, CreateInterviewInput>({
    mutationFn: async (data: CreateInterviewInput): Promise<Interview> => {
      const result = await clientTreaty.api.v1["hiring-processes"].post(data);
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      // Backend returns { data: Interview }, so we need to access result.data.data
      return (result.data as { data: Interview }).data;
    },
    onSuccess: () => {
      // Invalidate and refetch interviews list
      queryClient.invalidateQueries({ queryKey: interviewKeys.list() });
    },
  });
}

// Update interview mutation
export function useUpdateInterview() {
  const queryClient = useQueryClient();

  return useMutation<Interview, Error, { id: string; data: UpdateInterviewInput }>({
    mutationFn: async ({ id, data }): Promise<Interview> => {
      const result = await clientTreaty.api.v1["hiring-processes"]({ id }).put(data);
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      // TODO: check this, a weird object we should check the error to trigger a message
      // Backend returns { data: Interview }, so we need to access result.data.data
      return (result.data as { data: Interview }).data;
    },
    onSuccess: (_, variables) => {
      // Invalidate both list and specific detail
      queryClient.invalidateQueries({ queryKey: interviewKeys.list() });
      queryClient.invalidateQueries({ queryKey: interviewKeys.detail(variables.id) });
    },
  });
}

// Delete interview mutation
export function useDeleteInterview() {
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
      // Invalidate interviews list
      queryClient.invalidateQueries({ queryKey: interviewKeys.list() });
    },
  });
}
