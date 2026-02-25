import { estimateCostUsd, getModelById } from "@/lib/models/catalog";
import { renderCanonicalPrompt } from "@/lib/providers/prompt-renderer";
import { mockProvider } from "@/lib/providers/mock";
import { type ModelCallOptions, type ModelCallResult, type ProviderAdapter, type RenderPromptInput } from "@/lib/providers/types";

function tokenizeApprox(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export class OpenAIProviderAdapter implements ProviderAdapter {
  provider = "openai" as const;

  renderPrompt(input: RenderPromptInput): string {
    return renderCanonicalPrompt(input);
  }

  isEnabled(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  async callModel(renderedPrompt: string, options: ModelCallOptions): Promise<ModelCallResult> {
    const demoMode = process.env.DEMO_MODE !== "false";
    if (!process.env.OPENAI_API_KEY || demoMode) {
      return mockProvider.callModel(renderedPrompt, {
        ...options,
        provider: "mock",
        modelId: options.modelId
      });
    }

    const startedAt = Date.now();

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: options.modelId,
          temperature: options.temperature ?? 0.2,
          response_format: options.jsonMode ? { type: "json_object" } : undefined,
          messages: [
            {
              role: "user",
              content: renderedPrompt
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI HTTP ${response.status}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };

      const text = data.choices?.[0]?.message?.content ?? "";
      const inputTokens = data.usage?.prompt_tokens ?? tokenizeApprox(renderedPrompt);
      const outputTokens = data.usage?.completion_tokens ?? tokenizeApprox(text);

      const catalog = getModelById(options.modelId);

      return {
        text,
        inputTokens,
        outputTokens,
        costUsd: catalog ? estimateCostUsd(catalog, inputTokens, outputTokens) : 0,
        latencyMs: Date.now() - startedAt
      };
    } catch {
      // If upstream fails, keep the run alive in mock mode to preserve UX.
      return mockProvider.callModel(renderedPrompt, {
        ...options,
        provider: "mock"
      });
    }
  }
}

export const openAIProvider = new OpenAIProviderAdapter();
