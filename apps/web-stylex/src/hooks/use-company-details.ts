import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientTreaty } from "@/lib/client-treaty";
import { getErrorMessage } from "@/lib/error";
import type {
  CompanyDetailsBase,
  CreateCompanyDetails,
  UpdateCompanyDetails,
} from "@interviews-tool/domain/schemas";

// Re-export domain types for convenience
export type CompanyDetails = CompanyDetailsBase;
export type CreateCompanyDetailsInput = CreateCompanyDetails;
export type UpdateCompanyDetailsInput = UpdateCompanyDetails;

// Query keys
const companyDetailsKeys = {
  all: ["company-details"] as const,
  lists: () => [...companyDetailsKeys.all, "list"] as const,
  list: () => [...companyDetailsKeys.lists()] as const,
  details: () => [...companyDetailsKeys.all, "detail"] as const,
  detail: (hiringProcessId: string) => [...companyDetailsKeys.details(), hiringProcessId] as const,
};

// Fetch company details for hiring process
export function useCompanyDetails(hiringProcessId: string) {
  return useQuery<{ data: CompanyDetails | null }>({
    queryKey: companyDetailsKeys.detail(hiringProcessId),
    queryFn: async () => {
      const result = await clientTreaty.api.v1["hiring-processes"]({ id: hiringProcessId })[
        "company-details"
      ].get();
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      // Backend returns { data: CompanyDetails | null }
      return result.data as { data: CompanyDetails | null };
    },
    enabled: !!hiringProcessId,
  });
}

// Create company details mutation
export function useCreateCompanyDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      hiringProcessId,
      data,
    }: {
      hiringProcessId: string;
      data: CreateCompanyDetailsInput;
    }) => {
      const result = await clientTreaty.api.v1["hiring-processes"]({ id: hiringProcessId })[
        "company-details"
      ].post(data);
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      return result.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate company details for this hiring process
      queryClient.invalidateQueries({
        queryKey: companyDetailsKeys.detail(variables.hiringProcessId),
      });
    },
  });
}

// Update company details mutation
export function useUpdateCompanyDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      hiringProcessId,
      data,
    }: {
      hiringProcessId: string;
      data: UpdateCompanyDetailsInput;
    }) => {
      const result = await clientTreaty.api.v1["hiring-processes"]({ id: hiringProcessId })[
        "company-details"
      ].put(data);
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      return result.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate company details for this hiring process
      queryClient.invalidateQueries({
        queryKey: companyDetailsKeys.detail(variables.hiringProcessId),
      });
    },
  });
}

// Delete company details mutation
export function useDeleteCompanyDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hiringProcessId: string) => {
      const result = await clientTreaty.api.v1["hiring-processes"]({ id: hiringProcessId })[
        "company-details"
      ].delete();
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      return result.data;
    },
    onSuccess: (_, hiringProcessId) => {
      // Invalidate company details for this hiring process
      queryClient.invalidateQueries({
        queryKey: companyDetailsKeys.detail(hiringProcessId),
      });
    },
  });
}
