import { treaty } from "@elysiajs/eden";
import type { App } from "../../../server/src/index";

export const clientTreaty = treaty<App>(
  typeof window !== "undefined" ? window.location.origin : "http://localhost:3001",
  {
    fetch: {
      credentials: "include",
    },
  },
);
