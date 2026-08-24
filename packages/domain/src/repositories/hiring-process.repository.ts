import type { ArchiveReason } from "../constants";
import type { HiringProcessBase } from "../schemas";
import type {
  PaginationParams,
  HiringProcessFilterParams,
  HiringProcessSortParams,
  HiringProcessCounts,
} from "../types/api-response";

/**
 * Paginated result interface
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Repository interface for hiring processes
 * Defines the contract for data access operations
 *
 * This interface lives in the domain layer and is implemented
 * by infrastructure-specific implementations (e.g., Drizzle, Prisma)
 */
export interface IHiringProcessRepository {
  /**
   * Find a hiring process by ID for a specific user
   *
   * @param id - The hiring process ID
   * @param userId - The user ID who owns the hiring process
   * @returns The hiring process or null if not found
   */
  findById(id: string, userId: string): Promise<HiringProcessBase | null>;

  /**
   * Find paginated hiring processes for a user
   *
   * @param userId - The user ID
   * @param params - Pagination parameters (page, limit)
   * @param filters - Optional filter parameters
   * @returns Paginated result with hiring processes
   */
  findPaginated(
    userId: string,
    params: PaginationParams,
    filters?: HiringProcessFilterParams,
    sort?: HiringProcessSortParams,
  ): Promise<PaginatedResult<HiringProcessBase>>;

  /**
   * Save a hiring process (create or update)
   *
   * @param hiringProcess - The hiring process to save
   */
  save(hiringProcess: HiringProcessBase): Promise<void>;

  /**
   * Update a hiring process
   *
   * @param id - The hiring process ID
   * @param userId - The user ID who owns the hiring process
   * @param data - Partial hiring process data to update
   * @returns The updated hiring process
   */
  update(
    id: string,
    userId: string,
    data: Partial<Omit<HiringProcessBase, "id" | "userId" | "createdAt">>,
  ): Promise<HiringProcessBase>;

  /**
   * Soft delete a hiring process
   *
   * @param id - The hiring process ID
   * @param userId - The user ID who owns the hiring process
   */
  delete(id: string, userId: string): Promise<void>;
}

/**
 * Archive/board capabilities — a SEPARATE interface so the frozen Prisma
 * implementation keeps satisfying IHiringProcessRepository untouched.
 * The Drizzle repository implements both.
 */
export interface IHiringProcessArchiveRepository {
  /**
   * Set archivedAt + archiveReason. MUST NOT modify status or updatedAt.
   * @returns the updated process, or null if not found / already archived / soft-deleted
   */
  archive(id: string, userId: string, reason: ArchiveReason): Promise<HiringProcessBase | null>;

  /**
   * Clear archivedAt + archiveReason. MUST NOT modify status or updatedAt.
   * @returns the updated process, or null if not found / not archived / soft-deleted
   */
  restore(id: string, userId: string): Promise<HiringProcessBase | null>;

  /** Global per-user counters (active, archived, open, closed, stale) in ONE query */
  counts(userId: string): Promise<HiringProcessCounts>;

  /** All active processes for the board, updatedAt desc, optional salary filters */
  findBoard(
    userId: string,
    filters?: Pick<HiringProcessFilterParams, "salaryDeclared" | "salaryMin" | "salaryMax">,
  ): Promise<HiringProcessBase[]>;
}
