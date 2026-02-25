import { renderCanonicalPrompt } from "@/lib/providers/prompt-renderer";
import { mockProvider } from "@/lib/providers/mock";
import { type ModelCallOptions, type ModelCallResult, type ProviderAdapter, type RenderPromptInput } from "@/lib/providers/types";

export class GoogleProviderAdapter implements ProviderAdapter {
  provider = "google" as const;

  renderPrompt(input: RenderPromptInput): string {
    return renderCanonicalPrompt(input);
  }

  isEnabled(): boolean {
    // TODO: wire GOOGLE_API_KEY and Gemini endpoint.
    return false;
  }

  async callModel(renderedPrompt: string, options: ModelCallOptions): Promise<ModelCallResult> {
    return mockProvider.callModel(`[TODO google adapter]\n${renderedPrompt}`, {
      ...options,
      provider: "mock"
    });
  }
}

export const googleProvider = new GoogleProviderAdapter();
