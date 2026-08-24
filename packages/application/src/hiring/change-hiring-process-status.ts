import type { IHiringProcessRepository } from "@interviews-tool/domain/repositories";
import type { HiringProcessBase } from "@interviews-tool/domain/schemas";
import type { Result } from "@interviews-tool/domain/types";
import type { HiringProcessStatus } from "@interviews-tool/domain/constants";

export interface ChangeStatusResult {
  process: HiringProcessBase;
  /** Previous value, so the caller can offer an Undo */
  previous: { status: HiringProcessStatus };
}

/**
 * Move a process to another status (board drag, or the card's ⋯ menu).
 *
 * Writes ONLY the status — never the other fields — so a move can't rewrite
 * companyName/jobTitle/salary the way a full-body update would. Changing the
 * status is a new fact about the process, so updatedAt advances (invariant I3).
 *
 * Any target status is allowed: the board lets you correct a mistake in any
 * direction, so STATUS_TRANSITIONS is deliberately not enforced here.
 */
export async function changeHiringProcessStatus(params: {
  repo: IHiringProcessRepository;
  id: string;
  userId: string;
  status: HiringProcessStatus;
}): Promise<Result<ChangeStatusResult>> {
  const { repo, id, userId, status } = params;

  try {
    const existing = await repo.findById(id, userId);

    if (!existing) {
      return { data: null, error: new Error("Hiring process not found") };
    }

    if (existing.status === status) {
      return { data: { process: existing, previous: { status: existing.status } }, error: null };
    }

    const updated = await repo.update(id, userId, { status });

    return {
      data: { process: updated, previous: { status: existing.status } },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
