import { modelCatalog, type ModelCatalogEntry } from "@/lib/models/catalog";
import { type CPIR, type RouterCandidate, type RouterDecision, type RouterPreferences } from "@/lib/schemas";

const TASK_QUALITY_BONUS: Record<CPIR["taskType"], number> = {
  coding: 1.2,
  reasoning: 1,
  creative: 0.8,
  research: 1.1,
  extraction: 0.7,
  planning: 0.9,
  critique: 1
};

const DEPTH_MULTIPLIER: Record<CPIR["depth"], number> = {
  shallow: 0.7,
  medium: 1,
  deep: 1.25
};

function getPreferenceWeights(prefs: RouterPreferences) {
  const qualityFactor = prefs.qualityBias / 100;

  return {
    quality: 0.9 + qualityFactor,
    cost: 1.1 - qualityFactor * 0.8,
    latency: 0.9 - qualityFactor * 0.5,
    risk: 0.6,
    preference: 0.3 + qualityFactor * 0.4
  };
}

function getRisk(entry: ModelCatalogEntry, cpir: CPIR): number {
  let risk = 0;

  if (cpir.outputContract.type === "json" && !entry.supportsJson) {
    risk += 2;
  }

  if (cpir.depth === "deep" && entry.qualityTier < 3) {
    risk += 1.2;
  }

  return risk;
}

function getPreferenceBonus(entry: ModelCatalogEntry, prefs: RouterPreferences): number {
  const qualityFactor = prefs.qualityBias / 100;
  const qualityBias = entry.qualityTier * qualityFactor;
  const speedCostBias = ((entry.speedTier + (6 - entry.costTier)) / 2) * (1 - qualityFactor);
  return qualityBias + speedCostBias;
}

function applyCaps(
  entry: ModelCatalogEntry,
  cpir: CPIR,
  prefs: RouterPreferences,
  tokenEstimate: number
): string[] {
  const penalties: string[] = [];
  const projectedOutput = Math.max(250, Math.round(tokenEstimate * 0.6));
  const projectedCost = (tokenEstimate / 1000) * entry.inputUsdPer1k + (projectedOutput / 1000) * entry.outputUsdPer1k;
  const projectedLatency = (6 - entry.speedTier) * 600 + (cpir.depth === "deep" ? 1200 : 400);

  if ((cpir.constraints.maxCostUsd ?? (prefs.costCapEnabled ? prefs.maxCostUsd : undefined)) && projectedCost > (cpir.constraints.maxCostUsd ?? prefs.maxCostUsd ?? Infinity)) {
    penalties.push(`Projected cost ${projectedCost.toFixed(4)} exceeds cap.`);
  }

  if (
    (cpir.constraints.maxLatencyMs ?? (prefs.latencyCapEnabled ? prefs.maxLatencyMs : undefined)) &&
    projectedLatency > (cpir.constraints.maxLatencyMs ?? prefs.maxLatencyMs ?? Infinity)
  ) {
    penalties.push(`Projected latency ${projectedLatency}ms exceeds cap.`);
  }

  return penalties;
}

export function estimateTokenNeed(cpir: CPIR): number {
  const userTokens = Math.ceil(cpir.inputs.userText.length / 4);
  const summaryTokens = Math.ceil(cpir.contextPack.summary.length / 4);
  const factsTokens = cpir.contextPack.facts.reduce((acc, fact) => acc + Math.ceil(fact.length / 4), 0);
  const decisionsTokens = cpir.contextPack.decisions.reduce((acc, d) => acc + Math.ceil(d.length / 4), 0);
  const turnsTokens = cpir.contextPack.recentTurns.reduce((acc, t) => acc + Math.ceil(t.content.length / 4), 0);
  return userTokens + summaryTokens + factsTokens + decisionsTokens + turnsTokens + 200;
}

export function scoreCandidates(cpir: CPIR, prefs: RouterPreferences): RouterCandidate[] {
  const weights = getPreferenceWeights(prefs);
  const tokenEstimate = estimateTokenNeed(cpir);
  const depthMultiplier = DEPTH_MULTIPLIER[cpir.depth];

  return modelCatalog.map((entry) => {
    const quality = entry.qualityTier * TASK_QUALITY_BONUS[cpir.taskType] * depthMultiplier;
    const cost = entry.costTier;
    const latency = 6 - entry.speedTier;
    const risk = getRisk(entry, cpir);
    const preference = getPreferenceBonus(entry, prefs);

    const score =
      weights.quality * quality -
      weights.cost * cost -
      weights.latency * latency -
      weights.risk * risk +
      weights.preference * preference;

    const reasons = [
      `quality=${quality.toFixed(2)}`,
      `costTier=${entry.costTier}`,
      `speedTier=${entry.speedTier}`,
      `risk=${risk.toFixed(2)}`
    ];

    const capPenalties = applyCaps(entry, cpir, prefs, tokenEstimate);
    if (capPenalties.length > 0) {
      reasons.push(...capPenalties);
      return {
        provider: entry.provider,
        modelId: entry.modelId,
        score: score - capPenalties.length * 4,
        reasons
      };
    }

    return {
      provider: entry.provider,
      modelId: entry.modelId,
      score,
      reasons
    };
  });
}

export function buildRouterDecision(cpir: CPIR, prefs: RouterPreferences): RouterDecision {
  const candidates = scoreCandidates(cpir, prefs).sort((a, b) => b.score - a.score);
  const chosen = candidates[0];
  const tokenEstimate = estimateTokenNeed(cpir);

  return {
    chosen: {
      provider: chosen.provider,
      modelId: chosen.modelId
    },
    candidates,
    tokenEstimate,
    reasoning: `Selected ${chosen.modelId} for ${cpir.taskType}/${cpir.depth} with preference bias ${prefs.qualityBias}.`
  };
}
