import {
  eq,
  and,
  asc,
  desc,
  sql,
  isNull,
  isNotNull,
  inArray,
  gte,
  lt,
  lte,
  or,
  type SQL,
} from "drizzle-orm";
import { hiringProcessTable } from "../schema";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import type * as schema from "../schema";
import type {
  IHiringProcessArchiveRepository,
  IHiringProcessRepository,
  PaginatedResult,
} from "@interviews-tool/domain/repositories";
import type { ArchiveReason, HiringProcessSortField } from "@interviews-tool/domain/constants";
import {
  HIRING_PROCESS_STATUS_ORDER,
  OPEN_STATUSES,
  staleCutoff,
} from "@interviews-tool/domain/constants";
import type { HiringProcessBase } from "@interviews-tool/domain/schemas";
import type {
  PaginationParams,
  HiringProcessFilterParams,
  HiringProcessSortParams,
  HiringProcessCounts,
} from "@interviews-tool/domain/types";
import { HiringProcessMapper } from "../mappers/hiring-process.mapper";

/**
 * Drizzle implementation of the HiringProcess repository
 *
 * This class provides concrete data access operations using Drizzle ORM.
 * It implements the IHiringProcessRepository interface from the domain layer.
 */
export class HiringProcessRepository
  implements IHiringProcessRepository, IHiringProcessArchiveRepository
{
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
   * Build salary-only conditions (shared by the list and the board)
   */
  private buildSalaryConditions(
    filters?: Pick<HiringProcessFilterParams, "salaryDeclared" | "salaryMin" | "salaryMax">,
  ): SQL[] {
    const conditions: SQL[] = [];

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
   * Build filter conditions from filter params
   */
  private buildFilterConditions(filters?: HiringProcessFilterParams): SQL[] {
    const conditions: SQL[] = [];

    // Scope is not opt-in: active (the default) must always exclude archived (I4)
    if (filters?.scope === "archived") {
      conditions.push(isNotNull(hiringProcessTable.archivedAt));
    } else {
      conditions.push(isNull(hiringProcessTable.archivedAt));

      if (filters?.stale) {
        conditions.push(inArray(hiringProcessTable.status, [...OPEN_STATUSES]));
        conditions.push(lt(hiringProcessTable.updatedAt, staleCutoff(new Date())));
      }
    }

    if (filters?.statuses && filters.statuses.length > 0) {
      conditions.push(inArray(hiringProcessTable.status, filters.statuses));
    }

    conditions.push(...this.buildSalaryConditions(filters));

    return conditions;
  }

  /**
   * Resolve the ORDER BY expression for a sort field.
   * Status sorts by pipeline position, never alphabetically (I5).
   */
  private sortExpression(field: HiringProcessSortField): SQL | typeof hiringProcessTable.updatedAt {
    switch (field) {
      case "companyName":
        return sql`${hiringProcessTable.companyName}`;
      case "jobTitle":
        return sql`${hiringProcessTable.jobTitle}`;
      case "salary":
        return sql`${hiringProcessTable.salary}`;
      case "archivedAt":
        return sql`${hiringProcessTable.archivedAt}`;
      case "status":
        return sql`array_position(ARRAY[${sql.join(
          HIRING_PROCESS_STATUS_ORDER.map((s) => sql`${s}`),
          sql`, `,
        )}]::text[], ${hiringProcessTable.status}::text)`;
      case "updatedAt":
        return hiringProcessTable.updatedAt;
    }
  }

  /**
   * Find paginated hiring processes for a user
   */
  async findPaginated(
    userId: string,
    params: PaginationParams,
    filters?: HiringProcessFilterParams,
    sort?: HiringProcessSortParams,
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

    const sortField: HiringProcessSortField =
      sort?.sort ?? (filters?.scope === "archived" ? "archivedAt" : "updatedAt");
    const sortDir =
      sort?.dir ?? (sortField === "updatedAt" || sortField === "archivedAt" ? "desc" : "asc");
    const orderExpr = this.sortExpression(sortField);

    const [processes, countResult] = await Promise.all([
      this.db
        .select()
        .from(hiringProcessTable)
        .where(whereClause)
        .orderBy(sortDir === "asc" ? asc(orderExpr) : desc(orderExpr))
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
   * Global per-user counters in ONE aggregated query (COUNT FILTER).
   * Independent of the active filters — these feed the scope segments.
   */
  async counts(userId: string): Promise<HiringProcessCounts> {
    const openList = sql.join(
      OPEN_STATUSES.map((s) => sql`${s}`),
      sql`, `,
    );
    const cutoff = staleCutoff(new Date());

    const [row] = await this.db
      .select({
        active: sql<number>`count(*) filter (where ${hiringProcessTable.archivedAt} is null)`,
        archived: sql<number>`count(*) filter (where ${hiringProcessTable.archivedAt} is not null)`,
        open: sql<number>`count(*) filter (where ${hiringProcessTable.archivedAt} is null and ${hiringProcessTable.status}::text in (${openList}))`,
        closed: sql<number>`count(*) filter (where ${hiringProcessTable.archivedAt} is null and ${hiringProcessTable.status}::text not in (${openList}))`,
        stale: sql<number>`count(*) filter (where ${hiringProcessTable.archivedAt} is null and ${hiringProcessTable.status}::text in (${openList}) and ${hiringProcessTable.updatedAt} < ${cutoff})`,
      })
      .from(hiringProcessTable)
      .where(and(eq(hiringProcessTable.userId, userId), isNull(hiringProcessTable.deletedAt)));

    return {
      active: Number(row?.active ?? 0),
      archived: Number(row?.archived ?? 0),
      open: Number(row?.open ?? 0),
      closed: Number(row?.closed ?? 0),
      stale: Number(row?.stale ?? 0),
    };
  }

  /**
   * All active processes for the board.
   * Grouping into status columns happens in the use case (N is small).
   */
  async findBoard(
    userId: string,
    filters?: Pick<HiringProcessFilterParams, "salaryDeclared" | "salaryMin" | "salaryMax">,
  ): Promise<HiringProcessBase[]> {
    const rows = await this.db
      .select()
      .from(hiringProcessTable)
      .where(
        and(
          eq(hiringProcessTable.userId, userId),
          isNull(hiringProcessTable.deletedAt),
          isNull(hiringProcessTable.archivedAt),
          ...this.buildSalaryConditions(filters),
        ),
      )
      .orderBy(desc(hiringProcessTable.updatedAt));

    return rows.map((row) => HiringProcessMapper.toDomain(row));
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
