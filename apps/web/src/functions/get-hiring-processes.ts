import { createServerFn } from "@tanstack/react-start";
import { getAuthSession } from "@/lib/auth/get-auth-session";
import { createDatabaseClient } from "@interviews-tool/infra-db/client";
import { HiringProcessRepository } from "@interviews-tool/infra-db/repositories";
import { listHiringProcessesWithCounts } from "@interviews-tool/application/hiring";
import type {
  ApiResponse,
  HiringProcessFilterParams,
  HiringProcessSortParams,
} from "@interviews-tool/domain/types";
import type { HiringProcessBase } from "@interviews-tool/domain/schemas";
import { env } from "@/env/server";

interface GetHiringProcessesInput extends HiringProcessFilterParams, HiringProcessSortParams {
  page: number;
  limit: number;
}

export const getHiringProcesses = createServerFn({ method: "GET" })
  .inputValidator((input: GetHiringProcessesInput) => input)
  .handler(async (ctx): Promise<ApiResponse<HiringProcessBase[]>> => {
    const { page, limit, sort, dir, ...filters } = ctx.data;
    const session = await getAuthSession();

    if (!session) {
      return { data: null, error: { message: "Unauthorized" } };
    }

    const repo = new HiringProcessRepository(createDatabaseClient(env.DATABASE_URL));
    const result = await listHiringProcessesWithCounts({
      repo,
      userId: session.user.id,
      pagination: { page, limit },
      filters,
      sort: { sort, dir },
    });

    if (result.error) {
      return { data: null, error: { message: result.error.message } };
    }

    const { page: pageResult, counts } = result.data;

    return {
      data: pageResult.data,
      error: null,
      meta: {
        pagination: {
          page: pageResult.page,
          limit: pageResult.limit,
          total: pageResult.total,
          totalPages: pageResult.totalPages,
        },
        counts,
      },
    };
  });
