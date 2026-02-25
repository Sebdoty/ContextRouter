import { renderCanonicalPrompt } from "@/lib/providers/prompt-renderer";
import { mockProvider } from "@/lib/providers/mock";
import { type ModelCallOptions, type ModelCallResult, type ProviderAdapter, type RenderPromptInput } from "@/lib/providers/types";

export class MistralProviderAdapter implements ProviderAdapter {
  provider = "mistral" as const;

  renderPrompt(input: RenderPromptInput): string {
    return renderCanonicalPrompt(input);
  }

  isEnabled(): boolean {
    // TODO: wire MISTRAL_API_KEY and official API call.
    return false;
  }

  async callModel(renderedPrompt: string, options: ModelCallOptions): Promise<ModelCallResult> {
    return mockProvider.callModel(`[TODO mistral adapter]\n${renderedPrompt}`, {
      ...options,
      provider: "mock"
    });
  }
}

export const mistralProvider = new MistralProviderAdapter();
