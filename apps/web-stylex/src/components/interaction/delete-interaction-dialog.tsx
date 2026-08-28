import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@interviews-tool/web-ui";
import { useTranslations } from "@interviews-tool/i18n";
import { useDeleteInteraction } from "@/hooks/use-interactions";
import { toast } from "sonner";

interface DeleteInteractionDialogProps {
  interactionId: string;
  hiringProcessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteInteractionDialog({
  interactionId,
  hiringProcessId,
  open,
  onOpenChange,
}: DeleteInteractionDialogProps) {
  const t = useTranslations("interaction");
  const tCommon = useTranslations("common");
  const deleteMutation = useDeleteInteraction();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ hiringProcessId, interactionId });
      toast.success(t("deletedToast"));
      onOpenChange(false);
    } catch (error) {
      toast.error(tCommon("error"));
      console.error(error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-xl border-border-strong bg-surface p-6">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-medium">
            {t("deleteConfirm")}
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-status-rejected-bg text-status-rejected-text hover:bg-danger"
          >
            {t("deleteAction")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
