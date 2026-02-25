import { renderCanonicalPrompt } from "@/lib/providers/prompt-renderer";
import { mockProvider } from "@/lib/providers/mock";
import { type ModelCallOptions, type ModelCallResult, type ProviderAdapter, type RenderPromptInput } from "@/lib/providers/types";

export class AnthropicProviderAdapter implements ProviderAdapter {
  provider = "anthropic" as const;

  renderPrompt(input: RenderPromptInput): string {
    return renderCanonicalPrompt(input);
  }

  isEnabled(): boolean {
    // TODO: wire ANTHROPIC_API_KEY and real API call.
    return false;
  }

  async callModel(renderedPrompt: string, options: ModelCallOptions): Promise<ModelCallResult> {
    return mockProvider.callModel(`[TODO anthropic adapter]\n${renderedPrompt}`, {
      ...options,
      provider: "mock"
    });
  }
}

export const anthropicProvider = new AnthropicProviderAdapter();
