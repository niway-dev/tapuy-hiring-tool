import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import type { CreateInteraction, UpdateInteraction } from "@interviews-tool/domain/schemas";
import type { ApiResponse } from "@interviews-tool/domain/types";
import { firstValueFrom, type Observable } from "rxjs";
import type { Interaction } from "./interaction.model";

/* Interactions are nested under their hiring process, so every call needs the
   process id — there is no top-level /interactions collection. */
function base(hiringProcessId: string): string {
  return `/api/v1/hiring-processes/${hiringProcessId}/interactions`;
}

@Injectable({ providedIn: "root" })
export class InteractionsApi {
  private readonly http = inject(HttpClient);

  async list(hiringProcessId: string): Promise<Interaction[]> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<Interaction[]>>(base(hiringProcessId)),
    );
    // The endpoint returns a flat array with no pagination envelope.
    return res.data ?? [];
  }

  create(hiringProcessId: string, body: CreateInteraction): Promise<Interaction> {
    return this.unwrap(this.http.post<ApiResponse<Interaction>>(base(hiringProcessId), body));
  }

  update(
    hiringProcessId: string,
    interactionId: string,
    body: UpdateInteraction,
  ): Promise<Interaction> {
    return this.unwrap(
      this.http.put<ApiResponse<Interaction>>(`${base(hiringProcessId)}/${interactionId}`, body),
    );
  }

  async delete(hiringProcessId: string, interactionId: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${base(hiringProcessId)}/${interactionId}`));
  }

  private async unwrap<T>(request: Observable<ApiResponse<T>>): Promise<T> {
    const res = await firstValueFrom(request);
    if (res.data === null || res.data === undefined) {
      throw new Error(res.error?.message ?? "Empty response");
    }
    return res.data;
  }
}
