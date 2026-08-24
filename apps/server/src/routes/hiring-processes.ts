import { Elysia, t } from "elysia";
import { createDatabaseClient } from "@interviews-tool/infra-db/client";
import { HiringProcessRepository } from "@interviews-tool/infra-db/repositories";
import { createPrismaClient } from "@interviews-tool/infra-prisma-db/client";
import { PrismaHiringProcessRepository } from "@interviews-tool/infra-prisma-db/repositories";
import {
  createHiringProcessSchema,
  updateHiringProcessSchema,
  changeHiringProcessStatusSchema,
  archiveHiringProcessSchema,
  hiringProcessQuerySchema,
} from "@interviews-tool/domain/schemas";
import {
  createHiringProcess,
  getHiringProcess,
  listHiringProcesses,
  updateHiringProcess,
  changeHiringProcessStatus,
  archiveHiringProcess,
  restoreHiringProcess,
  AlreadyArchivedError,
  NotArchivedError,
  deleteHiringProcess,
} from "@interviews-tool/application/hiring";
import { ConflictError, NotFoundError } from "../utils/errors";
import { successBody, createdBody, successWithPaginationBody } from "../utils/response-helpers";
import { errorHandlerPlugin } from "../utils/error-handler-plugin";
import { env } from "../env";
import { authMacro } from "@/plugins/auth.plugin";

export const hiringProcessRoutes = new Elysia({ prefix: "/hiring-processes" })
  .use(errorHandlerPlugin)
  .decorate("db", createDatabaseClient(env.DATABASE_URL))
  // Prisma repository over the same tables. Opt a single endpoint into Prisma by using
  // `hiringProcessRepoPrisma` instead of `hiringProcessRepo` in that handler — the rest stay
  // on Drizzle, untouched.
  .decorate(
    "hiringProcessRepoPrisma",
    new PrismaHiringProcessRepository(createPrismaClient(env.DATABASE_URL)),
  )
  .derive(({ db }) => ({
    hiringProcessRepo: new HiringProcessRepository(db),
  }))
  .use(authMacro)
  .get(
    "/",
    async ({ query, status, hiringProcessRepoPrisma, user }) => {
      // This endpoint (GET /hiring-processes) is served by Prisma. All other endpoints in
      // this file keep using `hiringProcessRepo` (Drizzle).
      const result = await listHiringProcesses({
        repo: hiringProcessRepoPrisma,
        userId: user.id,
        pagination: {
          page: query.page || 1,
          limit: query.limit || 10,
        },
        filters: {
          statuses: query.statuses,
          salaryDeclared: query.salaryDeclared,
          salaryMin: query.salaryMin,
          salaryMax: query.salaryMax,
        },
      });

      if (result.error) {
        throw result.error;
      }

      const paginationResult = {
        page: result.data.page,
        limit: result.data.limit,
        offset: (result.data.page - 1) * result.data.limit,
      };

      return status(
        200,
        successWithPaginationBody(result.data.data, paginationResult, result.data.total),
      );
    },
    {
      query: hiringProcessQuerySchema,
      isAuth: true,
    },
  )
  // Get single hiring process
  .get(
    "/:id",
    async ({ params, hiringProcessRepo, user }) => {
      const result = await getHiringProcess({
        repo: hiringProcessRepo,
        id: params.id,
        userId: user.id,
      });

      if (result.error) {
        throw new NotFoundError("Hiring process");
      }

      return successBody(result.data);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      isAuth: true,
    },
  )
  // Create new hiring process
  .post(
    "/",
    async ({ body, status, hiringProcessRepo, user }) => {
      const result = await createHiringProcess({
        repo: hiringProcessRepo,
        input: body,
        userId: user.id,
      });

      if (result.error) {
        throw result.error;
      }

      return status(201, createdBody(result.data));
    },
    {
      body: createHiringProcessSchema,
      isAuth: true,
    },
  )
  // Update hiring process
  .put(
    "/:id",
    async ({ params, body, hiringProcessRepo, user }) => {
      const result = await updateHiringProcess({
        repo: hiringProcessRepo,
        id: params.id,
        userId: user.id,
        input: body,
      });

      if (result.error) {
        throw new NotFoundError("Hiring process");
      }

      return successBody(result.data);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: updateHiringProcessSchema,
      isAuth: true,
    },
  )
  // Move a process to another status (board drag / card menu).
  // Status-only: never rewrites the other fields the way PUT /:id does.
  .patch(
    "/:id/status",
    async ({ params, body, hiringProcessRepo, user }) => {
      const result = await changeHiringProcessStatus({
        repo: hiringProcessRepo,
        id: params.id,
        userId: user.id,
        status: body.status,
      });

      if (result.error) {
        throw new NotFoundError("Hiring process");
      }

      return successBody(result.data);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: changeHiringProcessStatusSchema,
      isAuth: true,
    },
  )
  // Archive: off the radar, status and notes intact
  .post(
    "/:id/archive",
    async ({ params, body, hiringProcessRepo, user }) => {
      const result = await archiveHiringProcess({
        repo: hiringProcessRepo,
        id: params.id,
        userId: user.id,
        reason: body.reason,
      });

      if (result.error) {
        if (result.error instanceof AlreadyArchivedError) {
          throw new ConflictError(result.error.message);
        }
        throw new NotFoundError("Hiring process");
      }

      return successBody(result.data);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: archiveHiringProcessSchema,
      isAuth: true,
    },
  )
  // Restore: back on the radar, exactly where it was
  .post(
    "/:id/restore",
    async ({ params, hiringProcessRepo, user }) => {
      const result = await restoreHiringProcess({
        repo: hiringProcessRepo,
        id: params.id,
        userId: user.id,
      });

      if (result.error) {
        if (result.error instanceof NotArchivedError) {
          throw new ConflictError(result.error.message);
        }
        throw new NotFoundError("Hiring process");
      }

      return successBody(result.data);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      isAuth: true,
    },
  )
  // Delete hiring process
  .delete(
    "/:id",
    async ({ params, status, hiringProcessRepo, user }) => {
      const result = await deleteHiringProcess({
        repo: hiringProcessRepo,
        id: params.id,
        userId: user.id,
      });

      if (result.error) {
        throw new NotFoundError("Hiring process");
      }

      return status(204);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      isAuth: true,
    },
  );
