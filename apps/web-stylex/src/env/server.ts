import { webServerEnvSchema } from "@interviews-tool/infra-env";

export const env = webServerEnvSchema.parse(process.env);
