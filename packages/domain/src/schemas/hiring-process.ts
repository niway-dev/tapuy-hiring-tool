import { z } from "zod";
import {
  HIRING_PROCESS_STATUSES,
  CURRENCIES,
  SALARY_RATE_TYPES,
  ARCHIVE_REASON_VALUES,
} from "../constants";

/**
 * Base schema for HiringProcess
 * Represents the complete domain model with all fields
 * This is the single source of truth for the hiring process structure
 */
export const hiringProcessBaseSchema = z.object({
  id: z.uuid(),
  companyName: z.string().min(1, "Company name is required"),
  jobTitle: z.string().nullable().optional(), // Optional job title (e.g., "Frontend Developer", "React Native Developer", "DevOps Engineer")
  status: z.enum(HIRING_PROCESS_STATUSES),
  salary: z.number().min(0, "Salary must be positive").nullable(),
  currency: z.enum([CURRENCIES.USD, CURRENCIES.PEN]),
  salaryRateType: z.enum(SALARY_RATE_TYPES),
  userId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable().optional(),
  archivedAt: z.coerce.date().nullable().optional(), // null = active; orthogonal to status
  archiveReason: z.enum(ARCHIVE_REASON_VALUES).nullable().optional(), // set iff archivedAt is set
});

/**
 * Create schema - derived from base
 * Fields needed to create a new hiring process
 * Omits id, userId, timestamps (server-generated)
 */
export const createHiringProcessSchema = hiringProcessBaseSchema
  .pick({
    companyName: true,
    status: true,
  })
  .extend({
    // Make salary and currency optional on creation
    salary: z.number().min(0, "Salary must be positive").optional(),
    currency: z.enum([CURRENCIES.USD, CURRENCIES.PEN]).optional(),
    salaryRateType: z.enum(SALARY_RATE_TYPES).optional(),
    jobTitle: z.string().optional(), // Optional job title
  });

/**
 * Update schema - derived from create
 * Fields that can be updated (same as create for hiring process)
 */
export const updateHiringProcessSchema = createHiringProcessSchema;

/**
 * Partial update schema
 * All fields optional for partial updates
 */
export const partialUpdateHiringProcessSchema = updateHiringProcessSchema.partial();

/**
 * Status-only change (board move).
 * Deliberately separate from the full update: moving a card must never
 * touch companyName/jobTitle/salary, which a full-body PUT would rewrite.
 */
export const changeHiringProcessStatusSchema = z.object({
  status: z.enum(HIRING_PROCESS_STATUSES),
});

/**
 * Query/Filter schema
 * For filtering hiring processes
 */
export const filterHiringProcessSchema = z.object({
  status: z.enum(HIRING_PROCESS_STATUSES).optional(),
  companyName: z.string().optional(),
});

// Type exports for TypeScript
export type HiringProcessBase = z.infer<typeof hiringProcessBaseSchema>;
export type CreateHiringProcess = z.infer<typeof createHiringProcessSchema>;
export type UpdateHiringProcess = z.infer<typeof updateHiringProcessSchema>;
export type PartialUpdateHiringProcess = z.infer<typeof partialUpdateHiringProcessSchema>;
export type ChangeHiringProcessStatus = z.infer<typeof changeHiringProcessStatusSchema>;
export type FilterHiringProcess = z.infer<typeof filterHiringProcessSchema>;
