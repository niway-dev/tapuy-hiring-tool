import { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@interviews-tool/web-ui";
import { useTranslations } from "@interviews-tool/i18n";
import { INTERACTION_TYPE_VALUES, type InteractionType } from "@interviews-tool/domain/constants";
import {
  useUpdateInteraction,
  type Interaction,
  type UpdateInteractionInput,
} from "@/hooks/use-interactions";
import { useInteractionTypeLabel } from "@/lib/i18n-labels";
import { CONTENT_MAX, CONTENT_MIN } from "./interaction-form";
import { toast } from "sonner";

interface EditInteractionDialogProps {
  interaction: Interaction;
  hiringProcessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditInteractionDialog({
  interaction,
  hiringProcessId,
  open,
  onOpenChange,
}: EditInteractionDialogProps): React.ReactElement {
  const t = useTranslations("interaction");
  const tCommon = useTranslations("common");
  const typeLabel = useInteractionTypeLabel();
  const [title, setTitle] = useState(interaction.title || "");
  const [content, setContent] = useState(interaction.content);
  const [type, setType] = useState<InteractionType>(interaction.type || "note");
  const [contentError, setContentError] = useState<"min" | "max" | null>(null);

  const updateMutation = useUpdateInteraction();

  useEffect(() => {
    if (open) {
      setTitle(interaction.title || "");
      setContent(interaction.content);
      setType(interaction.type || "note");
      setContentError(null);
    }
  }, [open, interaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (content.length < CONTENT_MIN || content.length > CONTENT_MAX) {
      setContentError(content.length > CONTENT_MAX ? "max" : "min");
      return;
    }

    const data: UpdateInteractionInput = {
      content,
      title: title || undefined,
      type,
    };

    try {
      await updateMutation.mutateAsync({
        hiringProcessId,
        interactionId: interaction.id,
        data,
      });
      toast.success(t("savedToast"));
      onOpenChange(false);
    } catch (error) {
      toast.error(tCommon("error"));
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="wide"
        className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-xl border-border-strong bg-surface p-6"
      >
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
            <div className="grid gap-2">
              <Label htmlFor="edit-interaction-title">
                {t("title")} <span className="font-normal text-text-muted">{t("optional")}</span>
              </Label>
              <Input
                id="edit-interaction-title"
                className="h-9"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-interaction-type">{t("type")}</Label>
              <Select value={type} onValueChange={(value) => setType(value as InteractionType)}>
                <SelectTrigger id="edit-interaction-type" className="h-9 w-full">
                  <SelectValue>{typeLabel(type)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {INTERACTION_TYPE_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {typeLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-interaction-content">{t("content")}</Label>
            <textarea
              id="edit-interaction-content"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (
                  contentError &&
                  e.target.value.length >= CONTENT_MIN &&
                  e.target.value.length <= CONTENT_MAX
                ) {
                  setContentError(null);
                }
              }}
              className="mono min-h-[220px] w-full resize-y rounded-md border border-border bg-surface-2 px-3 py-2 text-[13px] leading-[1.65] text-text"
            />
            {contentError && (
              <p className="text-xs text-danger">
                {contentError === "max" ? t("contentMaxError") : t("contentMinError")}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? t("saving") : t("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
