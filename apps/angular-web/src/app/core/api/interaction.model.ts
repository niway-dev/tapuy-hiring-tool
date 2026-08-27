import type { InteractionType } from "@interviews-tool/domain/constants";

/* Wire shape: dates are ISO strings because they come straight from JSON,
   exactly like HiringProcess in hiring-process.model.ts. */
export interface Interaction {
  id: string;
  hiringProcessId: string;
  title: string | null;
  content: string;
  type: InteractionType;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}
