import { estimateCostUsd, getModelById } from "@/lib/models/catalog";
import { renderCanonicalPrompt } from "@/lib/providers/prompt-renderer";
import { mockProvider } from "@/lib/providers/mock";
import { type ModelCallOptions, type ModelCallResult, type ProviderAdapter, type RenderPromptInput } from "@/lib/providers/types";

function tokenizeApprox(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export class AnthropicProviderAdapter implements ProviderAdapter {
  provider = "anthropic" as const;

  renderPrompt(input: RenderPromptInput): string {
    return renderCanonicalPrompt(input);
  }

  isEnabled(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  async callModel(renderedPrompt: string, options: ModelCallOptions): Promise<ModelCallResult> {
    const demoMode = process.env.DEMO_MODE !== "false";
    if (!process.env.ANTHROPIC_API_KEY || demoMode) {
      return mockProvider.callModel(renderedPrompt, {
        ...options,
        provider: "mock"
      });
    }

    const startedAt = Date.now();

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: options.modelId,
          max_tokens: 1200,
          temperature: options.temperature ?? 0.2,
          messages: [
            {
              role: "user",
              content: renderedPrompt
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic HTTP ${response.status}`);
      }

      const data = (await response.json()) as {
        content?: Array<{ type?: string; text?: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };

      const text =
        data.content
          ?.filter((item) => item.type === "text" && typeof item.text === "string")
          .map((item) => item.text)
          .join("\n") ?? "";

      const inputTokens = data.usage?.input_tokens ?? tokenizeApprox(renderedPrompt);
      const outputTokens = data.usage?.output_tokens ?? tokenizeApprox(text);
      const catalog = getModelById(options.modelId);

      return {
        text,
        inputTokens,
        outputTokens,
        costUsd: catalog ? estimateCostUsd(catalog, inputTokens, outputTokens) : 0,
        latencyMs: Date.now() - startedAt
      };
    } catch {
      return mockProvider.callModel(renderedPrompt, {
        ...options,
        provider: "mock"
      });
    }
  }
}

export const anthropicProvider = new AnthropicProviderAdapter();
