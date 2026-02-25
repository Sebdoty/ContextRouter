import { z } from "zod";

export const taskTypeSchema = z.enum([
  "coding",
  "reasoning",
  "creative",
  "research",
  "extraction",
  "planning",
  "critique"
]);

export const depthSchema = z.enum(["shallow", "medium", "deep"]);

export const contextTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string()
});

export const memoryRefSchema = z.object({
  memoryItemId: z.string(),
  key: z.string()
});

export const contextPackSchema = z.object({
  summary: z.string(),
  facts: z.array(z.string()),
  decisions: z.array(z.string()),
  openQuestions: z.array(z.string()),
  constraints: z.array(z.string()),
  recentTurns: z.array(contextTurnSchema),
  memoryRefs: z.array(memoryRefSchema)
});

export const outputContractSchema = z.object({
  type: z.enum(["freeform", "sections", "json"]),
  schema: z.record(z.unknown()).optional()
});

export const cpirSchema = z.object({
  intent: z.string(),
  taskType: taskTypeSchema,
  depth: depthSchema,
  constraints: z.object({
    format: z.string().optional(),
    citations: z.boolean().optional(),
    tone: z.string().optional(),
    maxCostUsd: z.number().positive().optional(),
    maxLatencyMs: z.number().positive().optional()
  }),
  inputs: z.object({
    userText: z.string().min(1),
    attachments: z.array(z.unknown()).optional()
  }),
  contextPack: contextPackSchema,
  outputContract: outputContractSchema
});

export const candidateSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google", "mistral", "mock"]),
  modelId: z.string(),
  score: z.number(),
  reasons: z.array(z.string())
});

export const routerDecisionSchema = z.object({
  chosen: candidateSchema.pick({ provider: true, modelId: true }),
  candidates: z.array(candidateSchema),
  tokenEstimate: z.number().int().nonnegative(),
  reasoning: z.string()
});

export const preferenceSchema = z.object({
  qualityBias: z.number().min(0).max(100).default(50),
  costCapEnabled: z.boolean().default(false),
  maxCostUsd: z.number().positive().optional(),
  latencyCapEnabled: z.boolean().default(false),
  maxLatencyMs: z.number().int().positive().optional()
});

export type CPIR = z.infer<typeof cpirSchema>;
export type ContextPack = z.infer<typeof contextPackSchema>;
export type RouterDecision = z.infer<typeof routerDecisionSchema>;
export type RouterCandidate = z.infer<typeof candidateSchema>;
export type RouterPreferences = z.infer<typeof preferenceSchema>;
export type TaskType = z.infer<typeof taskTypeSchema>;
export type Depth = z.infer<typeof depthSchema>;
