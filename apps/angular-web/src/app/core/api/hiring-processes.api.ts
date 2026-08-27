import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import type { ArchiveReason, HiringProcessStatus } from "@interviews-tool/domain/constants";
import type { CreateHiringProcess, UpdateHiringProcess } from "@interviews-tool/domain/schemas";
import type { ApiResponse } from "@interviews-tool/domain/types";
import type { Observable } from "rxjs";
import { firstValueFrom } from "rxjs";
import type {
  ArchiveTransition,
  HiringProcess,
  HiringProcessListParams,
  HiringProcessListResult,
  StatusTransition,
} from "./hiring-process.model";

const BASE = "/api/v1/hiring-processes";

@Injectable({ providedIn: "root" })
export class HiringProcessesApi {
  private readonly http = inject(HttpClient);

  async list(params: HiringProcessListParams): Promise<HiringProcessListResult> {
    let query = new HttpParams().set("page", params.page).set("limit", params.limit);
    // Elysia + zod expect the key repeated for arrays: statuses=a&statuses=b
    for (const status of params.statuses ?? []) query = query.append("statuses", status);
    if (params.salaryDeclared !== undefined) {
      query = query.set("salaryDeclared", String(params.salaryDeclared));
    }
    const res = await firstValueFrom(
      this.http.get<ApiResponse<HiringProcess[]>>(BASE, { params: query }),
    );
    return {
      items: res.data ?? [],
      pagination: res.meta?.pagination ?? {
        page: params.page,
        limit: params.limit,
        total: 0,
        totalPages: 0,
      },
    };
  }

  get(id: string): Promise<HiringProcess> {
    return this.unwrap(this.http.get<ApiResponse<HiringProcess>>(`${BASE}/${id}`));
  }

  create(body: CreateHiringProcess): Promise<HiringProcess> {
    return this.unwrap(this.http.post<ApiResponse<HiringProcess>>(BASE, body));
  }

  update(id: string, body: UpdateHiringProcess): Promise<HiringProcess> {
    return this.unwrap(this.http.put<ApiResponse<HiringProcess>>(`${BASE}/${id}`, body));
  }

  // The server returns { process, previous } (an undo-friendly envelope), not
  // the process directly. No call site needs `previous` yet, so the public
  // return type stays Promise<HiringProcess> and we take `.process` off the
  // unwrapped transition here rather than lying about the wire shape.
  async changeStatus(id: string, status: HiringProcessStatus): Promise<HiringProcess> {
    const transition = await this.unwrap(
      this.http.patch<ApiResponse<StatusTransition>>(`${BASE}/${id}/status`, { status }),
    );
    return transition.process;
  }

  async archive(id: string, reason: ArchiveReason): Promise<HiringProcess> {
    const transition = await this.unwrap(
      this.http.post<ApiResponse<ArchiveTransition>>(`${BASE}/${id}/archive`, { reason }),
    );
    return transition.process;
  }

  async restore(id: string): Promise<HiringProcess> {
    const transition = await this.unwrap(
      this.http.post<ApiResponse<ArchiveTransition>>(`${BASE}/${id}/restore`, {}),
    );
    return transition.process;
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${BASE}/${id}`));
  }

  private async unwrap<T>(request: Observable<ApiResponse<T>>): Promise<T> {
    const res = await firstValueFrom(request);
    if (res.data === null || res.data === undefined) {
      throw new Error(res.error?.message ?? "Empty response");
    }
    return res.data;
  }
}
