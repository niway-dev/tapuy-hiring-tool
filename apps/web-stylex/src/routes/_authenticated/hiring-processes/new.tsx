import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { useTranslations } from "@interviews-tool/i18n";
import { HiringProcessForm } from "@/components/hiring-process/hiring-process-form";
import { useCreateHiringProcess } from "@/hooks/use-hiring-processes";
import { useCreateCompanyDetails } from "@/hooks/use-company-details";

export const Route = createFileRoute("/_authenticated/hiring-processes/new")({
  component: NewHiringProcessPage,
});

function NewHiringProcessPage() {
  const t = useTranslations("processForm");
  const tProcess = useTranslations("process");
  const tCommon = useTranslations("common");
  const navigate = useNavigate();
  const createMutation = useCreateHiringProcess();
  const createCompanyDetailsMutation = useCreateCompanyDetails();

  const handleSubmit = async (
    data: Parameters<typeof createMutation.mutateAsync>[0],
    companyDetails?: Parameters<typeof createCompanyDetailsMutation.mutateAsync>[0]["data"],
  ) => {
    try {
      const hiringProcess = await createMutation.mutateAsync(data);
      const hiringProcessId = hiringProcess.id;

      if (companyDetails) {
        try {
          await createCompanyDetailsMutation.mutateAsync({ hiringProcessId, data: companyDetails });
        } catch (error) {
          // The process itself was created; company details can be added from edit.
          console.error("Failed to create company details:", error);
        }
      }

      toast.success(t("createdToast"));
      navigate({ to: "/hiring-processes/$id", params: { id: hiringProcessId } });
    } catch (error) {
      toast.error(tCommon("error"));
      console.error(error);
    }
  };

  return (
    <main className="mx-auto max-w-[680px] px-8 pb-24 pt-9">
      <Link
        to="/hiring-processes"
        className="mb-6 inline-flex items-center gap-2 text-[13px] text-text-secondary transition-colors hover:text-text"
      >
        <ArrowLeft className="size-3.5" />
        {tProcess("backToProcesses")}
      </Link>

      <h1 className="text-[32px] font-medium tracking-[-0.01em] text-text">{t("newTitle")}</h1>
      <p className="mb-9 mt-1 text-sm text-text-secondary">{t("subtitle")}</p>

      <HiringProcessForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => navigate({ to: "/hiring-processes" })}
        isSubmitting={createMutation.isPending || createCompanyDetailsMutation.isPending}
      />
    </main>
  );
}
