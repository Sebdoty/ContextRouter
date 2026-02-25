import { z } from "zod";
import { preferenceSchema } from "@/lib/schemas/cpir";

export const createSessionSchema = z.object({
  title: z.string().min(1).max(200)
});

export const postMessageSchema = z.object({
  content: z.string().min(1),
  mode: z.enum(["AUTO", "COMPARE", "CHAIN"]).default("AUTO"),
  selectedModels: z.array(z.string()).min(1).max(4).optional(),
  preferences: preferenceSchema.optional(),
  constraints: z
    .object({
      format: z.string().optional(),
      citations: z.boolean().optional(),
      tone: z.string().optional(),
      maxCostUsd: z.number().positive().optional(),
      maxLatencyMs: z.number().int().positive().optional()
    })
    .optional()
});

export const createMemorySchema = z.object({
  type: z.enum(["FACT", "PREFERENCE", "DECISION", "ARTIFACT_REF"]),
  key: z.string().min(1).max(200),
  value: z.record(z.unknown()),
  confidence: z.number().min(0).max(1).optional(),
  enabled: z.boolean().optional()
});

export const patchMemorySchema = z.object({
  enabled: z.boolean().optional(),
  confidence: z.number().min(0).max(1).optional(),
  value: z.record(z.unknown()).optional()
});
