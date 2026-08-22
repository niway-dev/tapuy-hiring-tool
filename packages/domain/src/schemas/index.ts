// Hiring Process schemas
export {
  hiringProcessBaseSchema,
  createHiringProcessSchema,
  updateHiringProcessSchema,
  partialUpdateHiringProcessSchema,
  changeHiringProcessStatusSchema,
  filterHiringProcessSchema,
  type HiringProcessBase,
  type CreateHiringProcess,
  type UpdateHiringProcess,
  type PartialUpdateHiringProcess,
  type ChangeHiringProcessStatus,
  type FilterHiringProcess,
} from "./hiring-process";

// Company Details schemas
export {
  companyDetailsBaseSchema,
  createCompanyDetailsSchema,
  updateCompanyDetailsSchema,
  type CompanyDetailsBase,
  type CreateCompanyDetails,
  type UpdateCompanyDetails,
} from "./company-details";

// Interaction schemas
export {
  interactionBaseSchema,
  createInteractionSchema,
  updateInteractionSchema,
  type InteractionBase,
  type CreateInteraction,
  type UpdateInteraction,
} from "./interaction";

// Pagination schemas
export {
  paginationQuerySchema,
  hiringProcessFilterSchema,
  hiringProcessQuerySchema,
  hiringProcessListQuerySchema,
  type PaginationQuery,
  type HiringProcessFilter,
  type HiringProcessQuery,
  type HiringProcessListQuery,
} from "./pagination";
