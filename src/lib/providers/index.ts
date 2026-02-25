import { type ProviderKey } from "@/lib/models/catalog";
import { anthropicProvider } from "@/lib/providers/anthropic";
import { googleProvider } from "@/lib/providers/google";
import { mistralProvider } from "@/lib/providers/mistral";
import { mockProvider } from "@/lib/providers/mock";
import { openAIProvider } from "@/lib/providers/openai";
import { type ProviderAdapter } from "@/lib/providers/types";

const providerMap: Record<ProviderKey, ProviderAdapter> = {
  openai: openAIProvider,
  anthropic: anthropicProvider,
  google: googleProvider,
  mistral: mistralProvider,
  mock: mockProvider
};

export function getProviderAdapter(provider: ProviderKey): ProviderAdapter {
  return providerMap[provider];
}

export function resolveProvider(provider: ProviderKey): ProviderAdapter {
  const adapter = getProviderAdapter(provider);
  if (adapter.isEnabled()) {
    return adapter;
  }

  return mockProvider;
}
