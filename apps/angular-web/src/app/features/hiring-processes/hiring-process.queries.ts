import { inject } from "@angular/core";
import type { ArchiveReason, HiringProcessStatus } from "@interviews-tool/domain/constants";
import type { CreateHiringProcess, UpdateHiringProcess } from "@interviews-tool/domain/schemas";
import {
  injectMutation,
  injectQuery,
  injectQueryClient,
} from "@tanstack/angular-query-experimental";
import type { HiringProcessListParams } from "../../core/api/hiring-process.model";
import { HiringProcessesApi } from "../../core/api/hiring-processes.api";
import { hiringProcessKeys } from "./hiring-process.keys";

export function injectHiringProcessList(params: () => HiringProcessListParams) {
  const api = inject(HiringProcessesApi);
  return injectQuery(() => ({
    queryKey: hiringProcessKeys.list(params()),
    queryFn: () => api.list(params()),
  }));
}

export function injectHiringProcess(id: () => string | undefined) {
  const api = inject(HiringProcessesApi);
  return injectQuery(() => {
    const value = id();
    return {
      queryKey: hiringProcessKeys.detail(value ?? ""),
      queryFn: () => api.get(value as string),
      enabled: value !== undefined && value !== "",
    };
  });
}

function injectInvalidateAll() {
  const queryClient = injectQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: hiringProcessKeys.all });
}

export function injectCreateHiringProcess() {
  const api = inject(HiringProcessesApi);
  const invalidate = injectInvalidateAll();
  return injectMutation(() => ({
    mutationFn: (body: CreateHiringProcess) => api.create(body),
    onSuccess: invalidate,
  }));
}

export function injectUpdateHiringProcess() {
  const api = inject(HiringProcessesApi);
  const invalidate = injectInvalidateAll();
  return injectMutation(() => ({
    mutationFn: (input: { id: string; body: UpdateHiringProcess }) =>
      api.update(input.id, input.body),
    onSuccess: invalidate,
  }));
}

export function injectChangeHiringProcessStatus() {
  const api = inject(HiringProcessesApi);
  const invalidate = injectInvalidateAll();
  return injectMutation(() => ({
    mutationFn: (input: { id: string; status: HiringProcessStatus }) =>
      api.changeStatus(input.id, input.status),
    onSuccess: invalidate,
  }));
}

export function injectArchiveHiringProcess() {
  const api = inject(HiringProcessesApi);
  const invalidate = injectInvalidateAll();
  return injectMutation(() => ({
    mutationFn: (input: { id: string; reason: ArchiveReason }) =>
      api.archive(input.id, input.reason),
    onSuccess: invalidate,
  }));
}

export function injectRestoreHiringProcess() {
  const api = inject(HiringProcessesApi);
  const invalidate = injectInvalidateAll();
  return injectMutation(() => ({
    mutationFn: (id: string) => api.restore(id),
    onSuccess: invalidate,
  }));
}

export function injectDeleteHiringProcess() {
  const api = inject(HiringProcessesApi);
  const invalidate = injectInvalidateAll();
  return injectMutation(() => ({
    mutationFn: (id: string) => api.delete(id),
    onSuccess: invalidate,
  }));
}
