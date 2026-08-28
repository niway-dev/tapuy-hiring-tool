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

interface DeleteConfirmDialogProps {
  companyName: string;
  /** When unknown (e.g. from the table), the confirmation omits the count. */
  interactionCount?: number;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function DeleteConfirmDialog({
  companyName,
  interactionCount,
  onConfirm,
  onCancel,
  isDeleting = false,
}: DeleteConfirmDialogProps) {
  const t = useTranslations("process");
  const tCommon = useTranslations("common");

  return (
    <AlertDialog open onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="rounded-xl border-border-strong bg-surface p-6">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-medium">
            {interactionCount === undefined
              ? t("deleteConfirmSimple", { company: companyName })
              : t("deleteConfirm", { company: companyName, count: interactionCount })}
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{tCommon("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-status-rejected-bg text-status-rejected-text hover:bg-danger"
          >
            {t("deleteAction")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
