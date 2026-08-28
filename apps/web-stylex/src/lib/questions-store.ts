import { useCallback, useEffect, useState } from "react";

/* Questions to ask — spec §4 of documentation/CAPTURE-V2.md.
   Client-side store (localStorage) until a backend model lands:
   - default list shared across processes
   - per-process questions
   - done-state tracked per process (a default question ticked in one
     process stays open in the others) */

export type QuestionScope = "default" | "process";

export interface Question {
  id: string;
  text: string;
  scope: QuestionScope;
  createdAt: number;
}

export interface QuestionWithState extends Question {
  done: boolean;
  /** Set when a process-scoped question was left unasked in a previous conversation */
  carriedFrom: Date | null;
}

const DEFAULTS_KEY = "tapuy:questions:default";
const processKey = (id: string): string => `tapuy:questions:proc:${id}`;
const doneKey = (id: string): string => `tapuy:questions:done:${id}`;

const SEED_DEFAULTS: Question[] = [
  {
    id: "d-week",
    text: "What does the team's week actually look like?",
    scope: "default",
    createdAt: 0,
  },
  {
    id: "d-comp",
    text: "How is compensation reviewed, and when?",
    scope: "default",
    createdAt: 0,
  },
  {
    id: "d-last",
    text: "What happened to the last person in this role?",
    scope: "default",
    createdAt: 0,
  },
];

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

export interface UseQuestionsResult {
  questions: QuestionWithState[];
  open: QuestionWithState[];
  asked: QuestionWithState[];
  addQuestion: (text: string) => void;
  toggle: (id: string) => void;
}

export function useQuestions(
  processId: string,
  lastInteractionAt?: Date | string | null,
): UseQuestionsResult {
  const [defaults, setDefaults] = useState<Question[]>([]);
  const [processQuestions, setProcessQuestions] = useState<Question[]>([]);
  const [doneIds, setDoneIds] = useState<string[]>([]);

  useEffect(() => {
    const stored = readJSON<Question[] | null>(DEFAULTS_KEY, null);
    if (stored === null) {
      writeJSON(DEFAULTS_KEY, SEED_DEFAULTS);
      setDefaults(SEED_DEFAULTS);
    } else {
      setDefaults(stored);
    }
    setProcessQuestions(readJSON<Question[]>(processKey(processId), []));
    setDoneIds(readJSON<string[]>(doneKey(processId), []));
  }, [processId]);

  const addQuestion = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const question: Question = {
        id: `p-${Date.now().toString(36)}`,
        text: trimmed,
        scope: "process",
        createdAt: Date.now(),
      };
      setProcessQuestions((prev) => {
        const next = [...prev, question];
        writeJSON(processKey(processId), next);
        return next;
      });
    },
    [processId],
  );

  const toggle = useCallback(
    (id: string) => {
      setDoneIds((prev) => {
        const next = prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id];
        writeJSON(doneKey(processId), next);
        return next;
      });
    },
    [processId],
  );

  const lastAt = lastInteractionAt ? new Date(lastInteractionAt) : null;

  const questions: QuestionWithState[] = [...defaults, ...processQuestions].map((q) => ({
    ...q,
    done: doneIds.includes(q.id),
    carriedFrom:
      q.scope === "process" && lastAt && q.createdAt > 0 && q.createdAt < lastAt.getTime()
        ? lastAt
        : null,
  }));

  const open = questions.filter((q) => !q.done);
  const asked = questions.filter((q) => q.done);

  return { questions, open, asked, addQuestion, toggle };
}
