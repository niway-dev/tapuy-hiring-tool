import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientTreaty } from "@/lib/client-treaty";
import { getErrorMessage } from "@/lib/error";
import type {
  InteractionBase,
  CreateInteraction,
  UpdateInteraction,
} from "@interviews-tool/domain/schemas";

// Re-export domain types for convenience
export type Interaction = InteractionBase;
export type CreateInteractionInput = CreateInteraction;
export type UpdateInteractionInput = UpdateInteraction;

const interactionKeys = {
  all: ["interactions"] as const,
  lists: () => [...interactionKeys.all, "list"] as const,
  list: (hiringProcessId: string) => [...interactionKeys.lists(), hiringProcessId] as const,
};

export function useInteractions(hiringProcessId: string) {
  return useQuery<{ data: Interaction[] }>({
    queryKey: interactionKeys.list(hiringProcessId),
    queryFn: async () => {
      const result = await clientTreaty.api.v1["hiring-processes"]({
        id: hiringProcessId,
      }).interactions.get();
      if (result.error) throw new Error(getErrorMessage(result.error));

      // Ensure we always return an array, even if data is null/undefined
      const data = result.data as { data: Interaction[] | null | undefined };
      return { data: data?.data || [] };
    },
    enabled: !!hiringProcessId,
  });
}

export function useCreateInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      hiringProcessId,
      data,
    }: {
      hiringProcessId: string;
      data: CreateInteractionInput;
    }) => {
      const result = await clientTreaty.api.v1["hiring-processes"]({
        id: hiringProcessId,
      }).interactions.post(data);
      if (result.error) throw new Error(getErrorMessage(result.error));
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: interactionKeys.list(variables.hiringProcessId),
      });
    },
  });
}

export function useUpdateInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      hiringProcessId,
      interactionId,
      data,
    }: {
      hiringProcessId: string;
      interactionId: string;
      data: UpdateInteractionInput;
    }) => {
      const result = await clientTreaty.api.v1["hiring-processes"]({ id: hiringProcessId })
        .interactions({ interactionId })
        .put(data);
      if (result.error) throw new Error(getErrorMessage(result.error));
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: interactionKeys.list(variables.hiringProcessId),
      });
    },
  });
}

export function useDeleteInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      hiringProcessId,
      interactionId,
    }: {
      hiringProcessId: string;
      interactionId: string;
    }) => {
      const result = await clientTreaty.api.v1["hiring-processes"]({ id: hiringProcessId })
        .interactions({ interactionId })
        .delete();
      if (result.error) throw new Error(getErrorMessage(result.error));
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: interactionKeys.list(variables.hiringProcessId),
      });
    },
  });
}
