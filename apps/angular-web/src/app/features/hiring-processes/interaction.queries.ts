import { inject } from "@angular/core";
import type { CreateInteraction, UpdateInteraction } from "@interviews-tool/domain/schemas";
import {
  injectMutation,
  injectQuery,
  injectQueryClient,
} from "@tanstack/angular-query-experimental";
import { InteractionsApi } from "../../core/api/interactions.api";
import { interactionKeys } from "./interaction.keys";

export function injectInteractionList(hiringProcessId: () => string) {
  const api = inject(InteractionsApi);
  return injectQuery(() => {
    const id = hiringProcessId();
    return {
      // queryKey stays stable even when id is empty so the route input
      // resolving later doesn't change the query's identity mid-flight.
      queryKey: interactionKeys.list(id),
      queryFn: () => api.list(id),
      enabled: !!id,
    };
  });
}

function injectInvalidateList() {
  const queryClient = injectQueryClient();
  return (hiringProcessId: string) =>
    queryClient.invalidateQueries({ queryKey: interactionKeys.list(hiringProcessId) });
}

export function injectCreateInteraction() {
  const api = inject(InteractionsApi);
  const invalidate = injectInvalidateList();
  return injectMutation(() => ({
    mutationFn: (input: { hiringProcessId: string; body: CreateInteraction }) =>
      api.create(input.hiringProcessId, input.body),
    onSuccess: (_data, input) => invalidate(input.hiringProcessId),
  }));
}

export function injectUpdateInteraction() {
  const api = inject(InteractionsApi);
  const invalidate = injectInvalidateList();
  return injectMutation(() => ({
    mutationFn: (input: {
      hiringProcessId: string;
      interactionId: string;
      body: UpdateInteraction;
    }) => api.update(input.hiringProcessId, input.interactionId, input.body),
    onSuccess: (_data, input) => invalidate(input.hiringProcessId),
  }));
}

export function injectDeleteInteraction() {
  const api = inject(InteractionsApi);
  const invalidate = injectInvalidateList();
  return injectMutation(() => ({
    mutationFn: (input: { hiringProcessId: string; interactionId: string }) =>
      api.delete(input.hiringProcessId, input.interactionId),
    onSuccess: (_data, input) => invalidate(input.hiringProcessId),
  }));
}
