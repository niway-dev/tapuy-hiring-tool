import { useTranslations } from "@interviews-tool/i18n";
import type {
  ArchiveReason,
  HiringProcessStatus,
  InteractionType,
} from "@interviews-tool/domain/constants";

/* Domain values are kebab-case; message keys are camelCase (kebab-case keys
   would produce invalid identifiers in the generated IntlMessages interface). */
const statusKeys = {
  "first-contact": "firstContact",
  ongoing: "ongoing",
  "on-hold": "onHold",
  "offer-made": "offerMade",
  "offer-accepted": "offerAccepted",
  hired: "hired",
  rejected: "rejected",
  "dropped-out": "droppedOut",
} as const satisfies Record<HiringProcessStatus, string>;

const interactionTypeKeys = {
  note: "note",
  "phone-call": "phoneCall",
  email: "email",
  "video-call": "videoCall",
  "in-person-meeting": "inPersonMeeting",
  "technical-challenge": "technicalChallenge",
  application: "application",
  offer: "offer",
  rejection: "rejection",
  "follow-up": "followUp",
} as const satisfies Record<InteractionType, string>;

const archiveReasonKeys = {
  "no-reply": "noReply",
  "they-passed": "theyPassed",
  "i-withdrew": "iWithdrew",
  "role-closed": "roleClosed",
} as const satisfies Record<ArchiveReason, string>;

export function useArchiveReasonLabel(): (reason: ArchiveReason) => string {
  const t = useTranslations("archiveReasons");
  return (reason: ArchiveReason) => t(archiveReasonKeys[reason]);
}

export function useStatusLabel(): (status: HiringProcessStatus) => string {
  const t = useTranslations("statuses");
  return (status: HiringProcessStatus) => t(statusKeys[status]);
}

export function useInteractionTypeLabel(): (type: InteractionType) => string {
  const t = useTranslations("interactionTypes");
  return (type: InteractionType) => t(interactionTypeKeys[type]);
}
