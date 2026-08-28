import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Skeleton } from "@interviews-tool/web-ui";
import { useTranslations } from "@interviews-tool/i18n";
import { HiringProcessForm } from "@/components/hiring-process/hiring-process-form";
import { useHiringProcess, useUpdateHiringProcess } from "@/hooks/use-hiring-processes";
import {
  useCompanyDetails,
  useCreateCompanyDetails,
  useUpdateCompanyDetails,
  type CreateCompanyDetailsInput,
} from "@/hooks/use-company-details";

export const Route = createFileRoute("/_authenticated/hiring-processes/$id_/edit")({
  component: EditHiringProcessPage,
});

function EditHiringProcessPage() {
  const { id } = Route.useParams();
  const t = useTranslations("processForm");
  const tProcess = useTranslations("process");
  const tCommon = useTranslations("common");
  const navigate = useNavigate();
  const { data: hiringProcess, isLoading, error } = useHiringProcess(id);
  const { data: companyDetailsData, isLoading: isLoadingCompanyDetails } = useCompanyDetails(id);
  const updateMutation = useUpdateHiringProcess();
  const createCompanyDetailsMutation = useCreateCompanyDetails();
  const updateCompanyDetailsMutation = useUpdateCompanyDetails();

  const handleSubmit = async (
    formData: Parameters<typeof updateMutation.mutateAsync>[0]["data"],
    companyDetails?: CreateCompanyDetailsInput,
  ) => {
    try {
      const previousStatus = hiringProcess?.status;
      await updateMutation.mutateAsync({ id, data: formData });

      if (companyDetails) {
        if (companyDetailsData?.data) {
          await updateCompanyDetailsMutation.mutateAsync({
            hiringProcessId: id,
            data: companyDetails,
          });
        } else {
          await createCompanyDetailsMutation.mutateAsync({
            hiringProcessId: id,
            data: companyDetails,
          });
        }
      }

      /* Status changes get their own quiet acknowledgement — no confetti. */
      if (formData.status === "rejected" && previousStatus !== "rejected") {
        toast.success(t("markedRejectedToast"));
      } else if (formData.status === "hired" && previousStatus !== "hired") {
        toast.success(t("markedHiredToast"));
      } else {
        toast.success(t("savedToast"));
      }
      navigate({ to: "/hiring-processes/$id", params: { id } });
    } catch (err) {
      toast.error(tCommon("error"));
      console.error(err);
    }
  };

  return (
    <main className="mx-auto max-w-[680px] px-8 pb-24 pt-9">
      <Link
        to="/hiring-processes/$id"
        params={{ id }}
        className="mb-6 inline-flex items-center gap-2 text-[13px] text-text-secondary transition-colors hover:text-text"
      >
        <ArrowLeft className="size-3.5" />
        {tProcess("backToProcesses")}
      </Link>

      <h1 className="text-[32px] font-medium tracking-[-0.01em] text-text">{t("editTitle")}</h1>
      <p className="mb-9 mt-1 text-sm text-text-secondary">{t("subtitle")}</p>

      {error ? (
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-base font-medium text-text">{tProcess("loadErrorTitle")}</h2>
          <p className="mt-1 text-sm text-text-secondary">{tProcess("loadErrorBody")}</p>
        </div>
      ) : isLoading || isLoadingCompanyDetails ? (
        <div className="grid gap-7">
          <Skeleton className="h-[52px] w-full bg-surface-2" />
          <div className="grid grid-cols-[1fr_220px] gap-6">
            <Skeleton className="h-9 bg-surface-2" />
            <Skeleton className="h-9 bg-surface-2" />
          </div>
          <Skeleton className="h-11 max-w-[420px] bg-surface-2" />
        </div>
      ) : !hiringProcess ? (
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-base font-medium text-text">{tProcess("notFoundTitle")}</h2>
          <p className="mt-1 text-sm text-text-secondary">{tProcess("notFoundBody")}</p>
        </div>
      ) : (
        <HiringProcessForm
          mode="edit"
          initialValues={{
            companyName: hiringProcess.companyName,
            jobTitle: hiringProcess.jobTitle || undefined,
            status: hiringProcess.status,
            salary: hiringProcess.salary || undefined,
            currency: hiringProcess.currency,
            salaryRateType: hiringProcess.salaryRateType as "monthly" | "hourly" | undefined,
          }}
          initialCompanyDetails={
            companyDetailsData?.data
              ? {
                  website: companyDetailsData.data.website || undefined,
                  location: companyDetailsData.data.location || undefined,
                  benefits: companyDetailsData.data.benefits || undefined,
                  contactedVia: companyDetailsData.data.contactedVia || undefined,
                  contactPerson: companyDetailsData.data.contactPerson || undefined,
                  interviewSteps: companyDetailsData.data.interviewSteps || undefined,
                }
              : undefined
          }
          onSubmit={handleSubmit}
          onCancel={() => navigate({ to: "/hiring-processes/$id", params: { id } })}
          isSubmitting={
            updateMutation.isPending ||
            updateCompanyDetailsMutation.isPending ||
            createCompanyDetailsMutation.isPending
          }
        />
      )}
    </main>
  );
}
