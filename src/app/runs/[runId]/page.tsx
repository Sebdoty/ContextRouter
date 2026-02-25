import { notFound } from "next/navigation";
import { RunInspector } from "@/components/run-inspector";
import { getRunById } from "@/lib/services/run-service";

type Params = {
  params: Promise<{ runId: string }>;
};

export default async function RunInspectorPage({ params }: Params) {
  const { runId } = await params;
  const run = await getRunById(runId);

  if (!run) {
    notFound();
  }

  return (
    <RunInspector
      run={{
        id: run.id,
        mode: run.mode,
        status: run.status,
        totalCostUsd: run.totalCostUsd,
        totalLatencyMs: run.totalLatencyMs,
        totalInputTokens: run.totalInputTokens,
        totalOutputTokens: run.totalOutputTokens,
        routerDecisionJson: (run.routerDecisionJson as Record<string, unknown> | null) ?? null,
        createdAt: run.createdAt.toISOString()
      }}
      steps={run.steps.map((step) => ({
        id: step.id,
        type: step.type,
        provider: step.provider,
        modelId: step.modelId,
        renderedPrompt: step.renderedPrompt,
        outputRaw: step.outputRaw,
        outputParsedJson: (step.outputParsedJson as Record<string, unknown> | null) ?? null,
        status: step.status,
        inputTokens: step.inputTokens,
        outputTokens: step.outputTokens,
        costUsd: step.costUsd,
        latencyMs: step.latencyMs,
        createdAt: step.createdAt.toISOString()
      }))}
      artifacts={run.artifacts.map((artifact) => ({
        id: artifact.id,
        kind: artifact.kind,
        title: artifact.title,
        content: artifact.content
      }))}
    />
  );
}
