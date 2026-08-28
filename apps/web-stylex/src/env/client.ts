import { webClientEnvSchema } from "@interviews-tool/infra-env";

export const env = webClientEnvSchema.parse(import.meta.env);
