import { pgEnum } from "drizzle-orm/pg-core";
import { ARCHIVE_REASON_VALUES } from "@interviews-tool/domain/constants";

export const archiveReasonEnum = pgEnum("archive_reason", ARCHIVE_REASON_VALUES);
