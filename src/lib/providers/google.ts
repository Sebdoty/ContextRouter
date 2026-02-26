import { estimateCostUsd, getModelById } from "@/lib/models/catalog";
import { renderCanonicalPrompt } from "@/lib/providers/prompt-renderer";
import { mockProvider } from "@/lib/providers/mock";
import { type ModelCallOptions, type ModelCallResult, type ProviderAdapter, type RenderPromptInput } from "@/lib/providers/types";

function tokenizeApprox(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export class GoogleProviderAdapter implements ProviderAdapter {
  provider = "google" as const;

  renderPrompt(input: RenderPromptInput): string {
    return renderCanonicalPrompt(input);
  }

  isEnabled(): boolean {
    return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  }

  async callModel(renderedPrompt: string, options: ModelCallOptions): Promise<ModelCallResult> {
    const demoMode = process.env.DEMO_MODE !== "false";
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!geminiApiKey || demoMode) {
      return mockProvider.callModel(renderedPrompt, {
        ...options,
        provider: "mock"
      });
    }

    const startedAt = Date.now();

    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${geminiApiKey}`
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
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini HTTP ${response.status}`);
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
      return mockProvider.callModel(renderedPrompt, {
        ...options,
        provider: "mock"
      });
    }
  }
}

export const googleProvider = new GoogleProviderAdapter();
