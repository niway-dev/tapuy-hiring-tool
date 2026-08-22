import { relations, sql } from "drizzle-orm";
import { text, integer, index, timestamp, check } from "drizzle-orm/pg-core";
import { createTable } from "../utils/table-creator";
import { timestamps } from "../utils/timestamps";
import { userTable } from "./auth";
import { companyDetailsTable } from "./company-details";
import { interactionTable } from "./interaction";
import {
  hiringProcessStatusEnum,
  currencyEnum,
  salaryRateTypeEnum,
  archiveReasonEnum,
} from "../enums";

export const hiringProcessTable = createTable(
  "hiring_process",
  {
    id: text("id").primaryKey(),
    companyName: text("company_name").notNull(),
    jobTitle: text("job_title"), // Optional job title (e.g., "Frontend Developer", "React Native Developer", "DevOps Engineer")
    status: hiringProcessStatusEnum("status").notNull(),
    salary: integer("salary"), // Optional salary amount
    currency: currencyEnum("currency").default("USD").notNull(),
    salaryRateType: salaryRateTypeEnum("salary_rate_type").default("monthly").notNull(),
    archivedAt: timestamp("archived_at"), // null = active; orthogonal to status AND deletedAt
    archiveReason: archiveReasonEnum("archive_reason"), // set iff archivedAt is set (CHECK below)
    ...timestamps,
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("hiring_process_userId_idx").on(table.userId),
    index("hiring_process_status_idx").on(table.status),
    index("hiring_process_deletedAt_idx").on(table.deletedAt),
    index("hiring_process_user_archived_idx").on(table.userId, table.archivedAt),
    check(
      "hiring_process_archive_consistency",
      sql`(${table.archivedAt} IS NULL) = (${table.archiveReason} IS NULL)`,
    ),
  ],
);

export const hiringProcessRelations = relations(hiringProcessTable, ({ one, many }) => ({
  user: one(userTable, {
    fields: [hiringProcessTable.userId],
    references: [userTable.id],
  }),
  companyDetails: one(companyDetailsTable, {
    fields: [hiringProcessTable.id],
    references: [companyDetailsTable.hiringProcessId],
  }),
  interactions: many(interactionTable),
  // interviews: many(interviewTable), // Prepared for future - will be uncommented when interview entity is implemented
}));

// Type exports for TypeScript
export type HiringProcess = typeof hiringProcessTable.$inferSelect;
export type NewHiringProcess = typeof hiringProcessTable.$inferInsert;
