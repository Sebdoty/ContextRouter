import { estimateCostUsd, getModelById } from "@/lib/models/catalog";
import { renderCanonicalPrompt } from "@/lib/providers/prompt-renderer";
import { type ModelCallOptions, type ModelCallResult, type ProviderAdapter, type RenderPromptInput } from "@/lib/providers/types";

function hash(input: string): number {
  let acc = 0;
  for (let i = 0; i < input.length; i += 1) {
    acc = (acc * 31 + input.charCodeAt(i)) % 1000003;
  }
  return acc;
}

function tokenizeApprox(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function synthesizeAnswer(prompt: string, modelId: string): string {
  const digest = hash(`${modelId}:${prompt}`);
  const angle = digest % 3;

  const framing =
    angle === 0
      ? "Focus on reliability and incremental execution."
      : angle === 1
        ? "Bias toward fast wins and measurable checkpoints."
        : "Optimize for output quality with explicit tradeoffs.";

  const claims = [
    `Claim A (${modelId}): The request needs run-level orchestration primitives before model tuning.`,
    `Claim B (${modelId}): Explanations are strongest when router factors are persisted per step.`,
    `Claim C (${modelId}): Memory selection should stay model-agnostic and relevance-scored.`
  ];

  const actions = [
    "Define CPIR and ContextPack contracts first.",
    "Execute compare/chain through the same DAG runner.",
    "Store per-step prompt, cost, latency, and parsed outputs."
  ];

  return [
    framing,
    "",
    "Answer:",
    `This is a deterministic mock response generated for ${modelId}.`,
    "",
    "Claims:",
    ...claims,
    "",
    "Actions:",
    ...actions,
    "",
    "CodeBlocks:",
    "```ts",
    "type StepPlanNode = { id: string; dependsOn: string[] };",
    "```"
  ].join("\n");
}

export class MockProviderAdapter implements ProviderAdapter {
  provider = "mock" as const;

  renderPrompt(input: RenderPromptInput): string {
    return renderCanonicalPrompt(input);
  }

  async callModel(renderedPrompt: string, options: ModelCallOptions): Promise<ModelCallResult> {
    const startedAt = Date.now();
    const text = synthesizeAnswer(renderedPrompt, options.modelId);
    const inputTokens = tokenizeApprox(renderedPrompt);
    const outputTokens = tokenizeApprox(text);
    const catalog = getModelById(options.modelId) ?? getModelById("mock-balanced");
    const costUsd = catalog ? estimateCostUsd(catalog, inputTokens, outputTokens) : 0;

    return {
      text,
      inputTokens,
      outputTokens,
      costUsd,
      latencyMs: Date.now() - startedAt + 35
    };
  }

  isEnabled(): boolean {
    return true;
  }
}

export const mockProvider = new MockProviderAdapter();
