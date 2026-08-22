import type {
  IHiringProcessArchiveRepository,
  IHiringProcessRepository,
} from "@interviews-tool/domain/repositories";
import type { HiringProcessBase } from "@interviews-tool/domain/schemas";
import type { Result } from "@interviews-tool/domain/types";
import type { ArchiveReason } from "@interviews-tool/domain/constants";

export interface ArchiveResult {
  process: HiringProcessBase;
  /** Previous values, so the caller can offer an Undo */
  previous: { archivedAt: Date | null; archiveReason: ArchiveReason | null };
}

export class AlreadyArchivedError extends Error {
  constructor() {
    super("Hiring process is already archived");
    this.name = "AlreadyArchivedError";
  }
}

export class NotArchivedError extends Error {
  constructor() {
    super("Hiring process is not archived");
    this.name = "NotArchivedError";
  }
}

type ArchiveRepo = IHiringProcessRepository & IHiringProcessArchiveRepository;

/**
 * Take a process off the active radar.
 *
 * Archiving is orthogonal to status: the process keeps the status it died in,
 * which is the truth of where it stopped, and keeps every note. Neither status
 * nor updatedAt move, so restoring puts it back exactly where it was.
 */
export async function archiveHiringProcess(params: {
  repo: ArchiveRepo;
  id: string;
  userId: string;
  reason: ArchiveReason;
}): Promise<Result<ArchiveResult>> {
  const { repo, id, userId, reason } = params;

  try {
    const existing = await repo.findById(id, userId);

    if (!existing) {
      return { data: null, error: new Error("Hiring process not found") };
    }

    const archived = await repo.archive(id, userId, reason);

    if (!archived) {
      return { data: null, error: new AlreadyArchivedError() };
    }

    return {
      data: { process: archived, previous: { archivedAt: null, archiveReason: null } },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Put an archived process back on the radar, with its status untouched.
 */
export async function restoreHiringProcess(params: {
  repo: ArchiveRepo;
  id: string;
  userId: string;
}): Promise<Result<ArchiveResult>> {
  const { repo, id, userId } = params;

  try {
    const existing = await repo.findById(id, userId);

    if (!existing) {
      return { data: null, error: new Error("Hiring process not found") };
    }

    const restored = await repo.restore(id, userId);

    if (!restored) {
      return { data: null, error: new NotArchivedError() };
    }

    return {
      data: {
        process: restored,
        previous: {
          archivedAt: existing.archivedAt ?? null,
          archiveReason: existing.archiveReason ?? null,
        },
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
