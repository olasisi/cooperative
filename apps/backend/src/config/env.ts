import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  APPROVAL_THRESHOLD: z.coerce.number().int().min(1).default(2),
  ALLOW_SELF_APPROVAL: z.literal("false").optional().default("false").transform(() => false)
});

export const env = envSchema.parse(process.env);
