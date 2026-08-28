import { createServerFn } from "@tanstack/react-start";
import { getAuthSession } from "@/lib/auth/get-auth-session";
import { createDatabaseClient } from "@interviews-tool/infra-db/client";
import { HiringProcessRepository } from "@interviews-tool/infra-db/repositories";
import { getHiringBoard, type BoardResult } from "@interviews-tool/application/hiring";
import type { ApiResponse, HiringProcessFilterParams } from "@interviews-tool/domain/types";
import { env } from "@/env/server";

type GetHiringBoardInput = Pick<
  HiringProcessFilterParams,
  "salaryDeclared" | "salaryMin" | "salaryMax"
>;

export const getHiringBoardData = createServerFn({ method: "GET" })
  .inputValidator((input: GetHiringBoardInput) => input)
  .handler(async (ctx): Promise<ApiResponse<BoardResult>> => {
    const session = await getAuthSession();

    if (!session) {
      return { data: null, error: { message: "Unauthorized" } };
    }

    const repo = new HiringProcessRepository(createDatabaseClient(env.DATABASE_URL));
    const result = await getHiringBoard({
      repo,
      userId: session.user.id,
      filters: ctx.data,
    });

    if (result.error) {
      return { data: null, error: { message: result.error.message } };
    }

    return { data: result.data, error: null };
  });
