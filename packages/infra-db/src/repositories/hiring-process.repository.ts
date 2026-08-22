import {
  eq,
  and,
  desc,
  sql,
  isNull,
  isNotNull,
  inArray,
  gte,
  lte,
  or,
  type SQL,
} from "drizzle-orm";
import { hiringProcessTable } from "../schema";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import type * as schema from "../schema";
import type {
  IHiringProcessRepository,
  PaginatedResult,
} from "@interviews-tool/domain/repositories";
import type { ArchiveReason } from "@interviews-tool/domain/constants";
import type { HiringProcessBase } from "@interviews-tool/domain/schemas";
import type { PaginationParams, HiringProcessFilterParams } from "@interviews-tool/domain/types";
import { HiringProcessMapper } from "../mappers/hiring-process.mapper";

/**
 * Drizzle implementation of the HiringProcess repository
 *
 * This class provides concrete data access operations using Drizzle ORM.
 * It implements the IHiringProcessRepository interface from the domain layer.
 */
export class HiringProcessRepository implements IHiringProcessRepository {
  constructor(private readonly db: NeonHttpDatabase<typeof schema>) {}

  /**
   * Find a hiring process by ID for a specific user
   */
  async findById(id: string, userId: string): Promise<HiringProcessBase | null> {
    const row = await this.db.query.hiringProcessTable.findFirst({
      where: and(
        eq(hiringProcessTable.id, id),
        eq(hiringProcessTable.userId, userId),
        isNull(hiringProcessTable.deletedAt),
      ),
    });

    return row ? HiringProcessMapper.toDomain(row) : null;
  }

  /**
   * Build filter conditions from filter params
   */
  private buildFilterConditions(filters?: HiringProcessFilterParams): SQL[] {
    const conditions: SQL[] = [];

    if (filters?.statuses && filters.statuses.length > 0) {
      conditions.push(inArray(hiringProcessTable.status, filters.statuses));
    }

    if (filters?.salaryDeclared === true) {
      conditions.push(isNotNull(hiringProcessTable.salary));
      // Also exclude zero since it effectively means "not declared"
      conditions.push(sql`${hiringProcessTable.salary} > 0`);
    } else if (filters?.salaryDeclared === false) {
      conditions.push(or(isNull(hiringProcessTable.salary), eq(hiringProcessTable.salary, 0))!);
    }

    if (filters?.salaryMin != null) {
      conditions.push(gte(hiringProcessTable.salary, filters.salaryMin));
    }

    if (filters?.salaryMax != null) {
      conditions.push(lte(hiringProcessTable.salary, filters.salaryMax));
    }

    return conditions;
  }

  /**
   * Find paginated hiring processes for a user
   */
  async findPaginated(
    userId: string,
    params: PaginationParams,
    filters?: HiringProcessFilterParams,
  ): Promise<PaginatedResult<HiringProcessBase>> {
    const safeLimit = Math.min(100, Math.max(1, params.limit ?? 5));
    const safePage = Math.max(1, params.page ?? 1);
    const offset = (safePage - 1) * safeLimit;

    const baseConditions = [
      eq(hiringProcessTable.userId, userId),
      isNull(hiringProcessTable.deletedAt),
    ];
    const filterConditions = this.buildFilterConditions(filters);
    const whereClause = and(...baseConditions, ...filterConditions);

    const [processes, countResult] = await Promise.all([
      this.db
        .select()
        .from(hiringProcessTable)
        .where(whereClause)
        .orderBy(desc(hiringProcessTable.updatedAt))
        .limit(safeLimit)
        .offset(offset),
      this.db.select({ count: sql<number>`count(*)` }).from(hiringProcessTable).where(whereClause),
    ]);

    const total = countResult[0] ? Number(countResult[0].count) : 0;

    return {
      data: processes.map((row) => HiringProcessMapper.toDomain(row)),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * Save a hiring process (create or update)
   */
  async save(hiringProcess: HiringProcessBase): Promise<void> {
    const persistence = HiringProcessMapper.toPersistence(hiringProcess);
    await this.db.insert(hiringProcessTable).values(persistence);
  }

  /**
   * Update a hiring process
   */
  async update(
    id: string,
    userId: string,
    data: Partial<Omit<HiringProcessBase, "id" | "userId" | "createdAt">>,
  ): Promise<HiringProcessBase> {
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    const [updated] = await this.db
      .update(hiringProcessTable)
      .set(updateData)
      .where(
        and(
          eq(hiringProcessTable.id, id),
          eq(hiringProcessTable.userId, userId),
          isNull(hiringProcessTable.deletedAt),
        ),
      )
      .returning();

    if (!updated) {
      throw new Error("Hiring process not found or unauthorized");
    }

    return HiringProcessMapper.toDomain(updated);
  }

  /**
   * Archive: sets archivedAt + archiveReason and NOTHING else.
   * updatedAt is pinned to itself to defeat the schema-level $onUpdate (invariant I2).
   * Returns null if not found, not owned, soft-deleted, or already archived.
   */
  async archive(
    id: string,
    userId: string,
    reason: ArchiveReason,
  ): Promise<HiringProcessBase | null> {
    const [updated] = await this.db
      .update(hiringProcessTable)
      .set({
        archivedAt: new Date(),
        archiveReason: reason,
        updatedAt: sql`${hiringProcessTable.updatedAt}`,
      })
      .where(
        and(
          eq(hiringProcessTable.id, id),
          eq(hiringProcessTable.userId, userId),
          isNull(hiringProcessTable.deletedAt),
          isNull(hiringProcessTable.archivedAt),
        ),
      )
      .returning();

    return updated ? HiringProcessMapper.toDomain(updated) : null;
  }

  /**
   * Restore: clears archivedAt + archiveReason, preserves updatedAt (invariant I2)
   * so the process returns to its previous position in updatedAt ordering.
   */
  async restore(id: string, userId: string): Promise<HiringProcessBase | null> {
    const [updated] = await this.db
      .update(hiringProcessTable)
      .set({
        archivedAt: null,
        archiveReason: null,
        updatedAt: sql`${hiringProcessTable.updatedAt}`,
      })
      .where(
        and(
          eq(hiringProcessTable.id, id),
          eq(hiringProcessTable.userId, userId),
          isNull(hiringProcessTable.deletedAt),
          isNotNull(hiringProcessTable.archivedAt),
        ),
      )
      .returning();

    return updated ? HiringProcessMapper.toDomain(updated) : null;
  }

  /**
   * Soft delete a hiring process
   */
  async delete(id: string, userId: string): Promise<void> {
    await this.db
      .update(hiringProcessTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(hiringProcessTable.id, id),
          eq(hiringProcessTable.userId, userId),
          isNull(hiringProcessTable.deletedAt),
        ),
      );
  }
}
