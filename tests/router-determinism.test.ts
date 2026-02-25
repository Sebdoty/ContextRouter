import { buildCPIR, decideRoute } from "@/lib/router";

describe("router determinism", () => {
  it("returns stable candidate ordering for same input", () => {
    const cpir = buildCPIR({
      userText: "Design a robust TypeScript architecture for multi-model routing and observability.",
      contextPack: {
        summary: "Prior discussion about scaling model calls.",
        facts: ["Need deterministic routing", "Need cost controls"],
        decisions: ["Use DAG executor"],
        openQuestions: ["Best compare strategy"],
        constraints: ["Keep API clean"],
        recentTurns: [{ role: "user", content: "How should we route models?" }],
        memoryRefs: [{ memoryItemId: "m1", key: "routing" }]
      }
    });

    const first = decideRoute(cpir, { qualityBias: 72 });
    const second = decideRoute(cpir, { qualityBias: 72 });

    expect(first.chosen.modelId).toBe(second.chosen.modelId);
    expect(first.candidates.map((candidate) => candidate.modelId)).toEqual(
      second.candidates.map((candidate) => candidate.modelId)
    );
    expect(first.tokenEstimate).toBe(second.tokenEstimate);
  });
});
