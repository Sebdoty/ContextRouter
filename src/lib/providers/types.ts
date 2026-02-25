import { type CPIR } from "@/lib/schemas";
import { type ModelCatalogEntry, type ProviderKey } from "@/lib/models/catalog";

export type RenderPromptInput = {
  cpir: CPIR;
  model: ModelCatalogEntry;
};

export type ModelCallOptions = {
  modelId: string;
  provider: ProviderKey;
  temperature?: number;
  jsonMode?: boolean;
  traceId?: string;
};

export type ModelCallResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
};

export interface ProviderAdapter {
  provider: ProviderKey;
  renderPrompt(input: RenderPromptInput): string;
  callModel(renderedPrompt: string, options: ModelCallOptions): Promise<ModelCallResult>;
  isEnabled(): boolean;
}
