import type { HiringProcessBase } from "@interviews-tool/domain/schemas";

/**
 * Mapper class to convert between database rows and domain entities
 *
 * This keeps the domain layer independent of database structure
 * and allows for easy transformation between layers.
 */
export class HiringProcessMapper {
  /**
   * Convert a database row to a domain entity
   *
   * @param row - Raw database row
   * @returns Domain entity
   */
  static toDomain(row: any): HiringProcessBase {
    return {
      id: row.id,
      userId: row.userId,
      companyName: row.companyName,
      jobTitle: row.jobTitle,
      status: row.status,
      salary: row.salary,
      currency: row.currency,
      salaryRateType: row.salaryRateType,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
      archivedAt: row.archivedAt,
      archiveReason: row.archiveReason,
    };
  }

  /**
   * Convert a domain entity to a database record
   *
   * @param hiringProcess - Domain entity
   * @returns Database persistence object
   */
  static toPersistence(hiringProcess: HiringProcessBase): any {
    return {
      id: hiringProcess.id,
      userId: hiringProcess.userId,
      companyName: hiringProcess.companyName,
      jobTitle: hiringProcess.jobTitle,
      status: hiringProcess.status,
      salary: hiringProcess.salary,
      currency: hiringProcess.currency,
      salaryRateType: hiringProcess.salaryRateType,
      createdAt: hiringProcess.createdAt,
      updatedAt: hiringProcess.updatedAt,
      deletedAt: hiringProcess.deletedAt,
      archivedAt: hiringProcess.archivedAt,
      archiveReason: hiringProcess.archiveReason,
    };
  }
}
