import { Provider, RunMode, StepType } from "@prisma/client";
import { type ModelCatalogEntry } from "@/lib/models/catalog";
import { type CPIR, type RouterPreferences } from "@/lib/schemas";

export type StepPlanNode = {
  id: string;
  type: StepType;
  provider: Provider;
  modelId: string;
  dependsOn: string[];
  metadata?: Record<string, unknown>;
};

export type BuiltRun = {
  cpir: CPIR;
  mode: RunMode;
  selectedModels: ModelCatalogEntry[];
  preferences: RouterPreferences;
};

export type StepExecutionResult = {
  provider: Provider;
  modelId: string;
  renderedPrompt: string;
  outputRaw: string;
  outputParsedJson?: Record<string, unknown>;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export type NodeOutput = {
  stepId: string;
  type: StepType;
  provider: Provider;
  modelId: string;
  renderedPrompt: string;
  outputRaw: string;
  outputParsedJson?: Record<string, unknown>;
};
