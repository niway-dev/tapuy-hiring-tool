import type { IHiringProcessArchiveRepository } from "@interviews-tool/domain/repositories";
import type { HiringProcessBase } from "@interviews-tool/domain/schemas";
import type { HiringProcessCounts, HiringProcessFilterParams } from "@interviews-tool/domain/types";
import type { Result } from "@interviews-tool/domain/types";
import {
  HIRING_PROCESS_STATUS_ORDER,
  type HiringProcessStatus,
} from "@interviews-tool/domain/constants";

export interface BoardColumn {
  status: HiringProcessStatus;
  count: number;
  cards: HiringProcessBase[];
}

export interface BoardResult {
  columns: BoardColumn[];
  counts: HiringProcessCounts;
}

/**
 * The board: every active process grouped into the 8 pipeline columns.
 *
 * Always returns all 8 columns in HIRING_PROCESS_STATUS_ORDER, empty ones
 * included — a column that disappears when it empties would make the pipeline
 * unreadable. Cards keep the repository order (updatedAt desc) within a column.
 */
export async function getHiringBoard(params: {
  repo: IHiringProcessArchiveRepository;
  userId: string;
  filters?: Pick<HiringProcessFilterParams, "salaryDeclared" | "salaryMin" | "salaryMax">;
}): Promise<Result<BoardResult>> {
  const { repo, userId, filters } = params;

  try {
    const [rows, counts] = await Promise.all([repo.findBoard(userId, filters), repo.counts(userId)]);

    const byStatus = new Map<HiringProcessStatus, HiringProcessBase[]>();
    for (const status of HIRING_PROCESS_STATUS_ORDER) {
      byStatus.set(status, []);
    }
    for (const row of rows) {
      byStatus.get(row.status)?.push(row);
    }

    const columns = HIRING_PROCESS_STATUS_ORDER.map((status) => {
      const cards = byStatus.get(status) ?? [];
      return { status, count: cards.length, cards };
    });

    return { data: { columns, counts }, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
