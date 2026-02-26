export type ProviderKey = "openai" | "anthropic" | "google" | "mistral" | "mock";

export type ModelCatalogEntry = {
  provider: ProviderKey;
  modelId: string;
  qualityTier: number;
  costTier: number;
  speedTier: number;
  supportsJson: boolean;
  inputUsdPer1k: number;
  outputUsdPer1k: number;
};

export const modelCatalog: ModelCatalogEntry[] = [
  {
    provider: "openai",
    modelId: "gpt-4o-mini",
    qualityTier: 3,
    costTier: 2,
    speedTier: 5,
    supportsJson: true,
    inputUsdPer1k: 0.00015,
    outputUsdPer1k: 0.0006
  },
  {
    provider: "openai",
    modelId: "gpt-4.1-mini",
    qualityTier: 4,
    costTier: 3,
    speedTier: 4,
    supportsJson: true,
    inputUsdPer1k: 0.0004,
    outputUsdPer1k: 0.0016
  },
  {
    provider: "openai",
    modelId: "gpt-4.1",
    qualityTier: 5,
    costTier: 5,
    speedTier: 3,
    supportsJson: true,
    inputUsdPer1k: 0.002,
    outputUsdPer1k: 0.008
  },
  {
    provider: "anthropic",
    modelId: "claude-sonnet-4-20250514",
    qualityTier: 5,
    costTier: 4,
    speedTier: 4,
    supportsJson: true,
    inputUsdPer1k: 0.003,
    outputUsdPer1k: 0.015
  },
  {
    provider: "google",
    modelId: "gemini-2.5-flash",
    qualityTier: 4,
    costTier: 2,
    speedTier: 5,
    supportsJson: true,
    inputUsdPer1k: 0.00035,
    outputUsdPer1k: 0.001
  },
  {
    provider: "mistral",
    modelId: "mistral-large",
    qualityTier: 4,
    costTier: 3,
    speedTier: 4,
    supportsJson: true,
    inputUsdPer1k: 0.002,
    outputUsdPer1k: 0.006
  },
  {
    provider: "mock",
    modelId: "mock-balanced",
    qualityTier: 3,
    costTier: 1,
    speedTier: 5,
    supportsJson: true,
    inputUsdPer1k: 0,
    outputUsdPer1k: 0
  },
  {
    provider: "mock",
    modelId: "mock-creative",
    qualityTier: 4,
    costTier: 1,
    speedTier: 4,
    supportsJson: true,
    inputUsdPer1k: 0,
    outputUsdPer1k: 0
  },
  {
    provider: "mock",
    modelId: "mock-analyst",
    qualityTier: 4,
    costTier: 1,
    speedTier: 3,
    supportsJson: true,
    inputUsdPer1k: 0,
    outputUsdPer1k: 0
  }
];

export function getModelById(modelId: string): ModelCatalogEntry | undefined {
  return modelCatalog.find((entry) => entry.modelId === modelId);
}

export function getDefaultAutoModel(): ModelCatalogEntry {
  const envModel = process.env.OPENAI_DEFAULT_MODEL_ID;
  if (envModel) {
    const found = getModelById(envModel);
    if (found) {
      return found;
    }
  }

  return getModelById("gpt-4o-mini") ?? modelCatalog[0];
}

export function getDefaultCompareModels(): ModelCatalogEntry[] {
  const envModels = process.env.OPENAI_COMPARE_MODEL_IDS;
  if (envModels) {
    const fromEnv = envModels
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((id) => getModelById(id))
      .filter((item): item is ModelCatalogEntry => Boolean(item));

    if (fromEnv.length >= 2) {
      return fromEnv.slice(0, 4);
    }
  }

  return ["gpt-4o-mini", "claude-sonnet-4-20250514", "gemini-2.5-flash"]
    .map((id) => getModelById(id))
    .filter((item): item is ModelCatalogEntry => Boolean(item));
}

export function resolveSelectedModels(selectedModelIds?: string[]): ModelCatalogEntry[] {
  if (!selectedModelIds || selectedModelIds.length === 0) {
    return getDefaultCompareModels();
  }

  const models = selectedModelIds
    .map((id) => getModelById(id))
    .filter((item): item is ModelCatalogEntry => Boolean(item));

  return models.length > 0 ? models.slice(0, 4) : getDefaultCompareModels();
}

export function estimateCostUsd(entry: ModelCatalogEntry, inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1000) * entry.inputUsdPer1k;
  const outputCost = (outputTokens / 1000) * entry.outputUsdPer1k;
  return Number((inputCost + outputCost).toFixed(6));
}
