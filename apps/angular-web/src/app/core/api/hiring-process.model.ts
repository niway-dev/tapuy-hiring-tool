import type {
  ArchiveReason,
  Currency,
  HiringProcessStatus,
  SalaryRateType,
} from "@interviews-tool/domain/constants";
import type { PaginationMeta } from "@interviews-tool/domain/types";

/**
 * Wire shape of a hiring process. Dates are ISO strings because they come
 * straight from JSON (domain's HiringProcessBase types them as Date).
 */
export interface HiringProcess {
  id: string;
  companyName: string;
  jobTitle?: string | null;
  status: HiringProcessStatus;
  salary: number | null;
  currency: Currency;
  salaryRateType: SalaryRateType;
  userId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  archiveReason?: ArchiveReason | null;
}

export interface HiringProcessListParams {
  page: number;
  limit: number;
  statuses?: HiringProcessStatus[];
  salaryDeclared?: boolean;
}

export interface HiringProcessListResult {
  items: HiringProcess[];
  pagination: PaginationMeta;
}
