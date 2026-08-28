import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { INTERACTION_TYPE_VALUES, type InteractionType } from "@interviews-tool/domain/constants";

/* Draft persistence — spec §5 of documentation/CAPTURE-V2.md.
   One draft per process, shared by the notepad form and the live mode.
   Writes are debounced (localStorage is synchronous on the main thread)
   and flushed on unmount / tab hide so nothing is lost. */

export interface InteractionDraft {
  content: string;
  title: string;
  type: InteractionType;
  at: number;
}

/* Malformed storage must never crash the editors: title/type/at fall back,
   a missing content invalidates the draft. */
const draftSchema = z.object({
  content: z.string(),
  title: z.string().catch(""),
  type: z.enum(INTERACTION_TYPE_VALUES).catch("note"),
  at: z.number().catch(() => Date.now()),
});

const DEBOUNCE_MS = 300;

const draftKey = (processId: string): string => `tapuy:draft:v2:${processId}`;

function readDraft(processId: string): InteractionDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(processId));
    if (!raw) return null;
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

interface DraftValues {
  content: string;
  title: string;
  type: InteractionType;
}

export function useInteractionDraft(processId: string) {
  const [content, setContentState] = useState("");
  const [title, setTitleState] = useState("");
  const [type, setTypeState] = useState<InteractionType>("note");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [restoredFrom, setRestoredFrom] = useState<number | null>(null);
  const hydrated = useRef(false);
  /* Latest values, so consecutive setter calls in one tick persist coherently */
  const latest = useRef<DraftValues>({ content: "", title: "", type: "note" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const writeNow = useCallback(
    (values: DraftValues): void => {
      try {
        if (!values.content.trim()) {
          localStorage.removeItem(draftKey(processId));
          setSavedAt(null);
          return;
        }
        const at = Date.now();
        localStorage.setItem(draftKey(processId), JSON.stringify({ ...values, at }));
        setSavedAt(at);
      } catch {
        /* storage full/unavailable — writing continues in memory */
      }
    },
    [processId],
  );

  const flush = useCallback((): void => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (dirty.current) {
      dirty.current = false;
      writeNow(latest.current);
    }
  }, [writeNow]);

  const persist = useCallback((): void => {
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      dirty.current = false;
      writeNow(latest.current);
    }, DEBOUNCE_MS);
  }, [writeNow]);

  /* Flush pending writes when the tab hides, the page unloads, or the
     screen unmounts. */
  useEffect(() => {
    const onVisibility = (): void => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  /* Restore once on mount (client only) */
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const draft = readDraft(processId);
    if (draft && draft.content.trim()) {
      latest.current = {
        content: draft.content,
        title: draft.title,
        type: draft.type,
      };
      setContentState(draft.content);
      setTitleState(draft.title);
      setTypeState(draft.type);
      setSavedAt(draft.at);
      setRestoredFrom(draft.at);
    }
  }, [processId]);

  const setContent = useCallback(
    (value: string): void => {
      latest.current = { ...latest.current, content: value };
      setContentState(value);
      persist();
    },
    [persist],
  );

  const setTitle = useCallback(
    (value: string): void => {
      latest.current = { ...latest.current, title: value };
      setTitleState(value);
      persist();
    },
    [persist],
  );

  const setType = useCallback(
    (value: InteractionType): void => {
      latest.current = { ...latest.current, type: value };
      setTypeState(value);
      persist();
    },
    [persist],
  );

  const cancelPending = useCallback((): void => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    dirty.current = false;
  }, []);

  /* Discard the restored draft (strip action) */
  const discard = useCallback((): void => {
    cancelPending();
    try {
      localStorage.removeItem(draftKey(processId));
    } catch {
      /* noop */
    }
    latest.current = { content: "", title: "", type: "note" };
    setContentState("");
    setTitleState("");
    setTypeState("note");
    setSavedAt(null);
    setRestoredFrom(null);
  }, [processId, cancelPending]);

  /* Clear after a successful save */
  const clear = useCallback((): void => {
    cancelPending();
    try {
      localStorage.removeItem(draftKey(processId));
    } catch {
      /* noop */
    }
    latest.current = { ...latest.current, content: "", title: "" };
    setContentState("");
    setTitleState("");
    setSavedAt(null);
    setRestoredFrom(null);
  }, [processId, cancelPending]);

  const dismissRestored = useCallback((): void => setRestoredFrom(null), []);

  return {
    content,
    title,
    type,
    setContent,
    setTitle,
    setType,
    savedAt,
    restoredFrom,
    dismissRestored,
    discard,
    clear,
  };
}

export type InteractionDraftState = ReturnType<typeof useInteractionDraft>;
