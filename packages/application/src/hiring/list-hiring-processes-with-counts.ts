import type {
  IHiringProcessArchiveRepository,
  IHiringProcessRepository,
  PaginatedResult,
} from "@interviews-tool/domain/repositories";
import type { HiringProcessBase } from "@interviews-tool/domain/schemas";
import type {
  HiringProcessCounts,
  HiringProcessFilterParams,
  HiringProcessSortParams,
  PaginationParams,
  Result,
} from "@interviews-tool/domain/types";

export interface ListWithCountsResult {
  page: PaginatedResult<HiringProcessBase>;
  counts: HiringProcessCounts;
}

/**
 * The dashboard read: one page of processes plus the global counters.
 *
 * The counters are deliberately independent of the active filters — they feed
 * the Active/Archived segments and the stale strip, which must show the whole
 * picture even while you are looking at a narrow slice of it. Fetching them
 * together means the segments have their numbers on the first render.
 */
export async function listHiringProcessesWithCounts(params: {
  repo: IHiringProcessRepository & IHiringProcessArchiveRepository;
  userId: string;
  pagination: PaginationParams;
  filters?: HiringProcessFilterParams;
  sort?: HiringProcessSortParams;
}): Promise<Result<ListWithCountsResult>> {
  const { repo, userId, pagination, filters, sort } = params;

  try {
    const [page, counts] = await Promise.all([
      repo.findPaginated(userId, pagination, filters, sort),
      repo.counts(userId),
    ]);

    return { data: { page, counts }, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
