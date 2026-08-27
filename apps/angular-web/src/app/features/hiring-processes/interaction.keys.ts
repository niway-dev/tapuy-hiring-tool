/* Mirrors the hiringProcessKeys shape so both resources read the same way.
   Interactions are always scoped to one hiring process — there is no
   "all interactions" list in the API, so list() takes the id, not a filter. */
export const interactionKeys = {
  all: ["interactions"] as const,
  lists: () => [...interactionKeys.all, "list"] as const,
  list: (hiringProcessId: string) => [...interactionKeys.lists(), hiringProcessId] as const,
};
