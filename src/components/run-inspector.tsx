"use client";

import { useMemo, useState } from "react";
import { PromptDiffViewer } from "@/components/prompt-diff-viewer";
import { formatDate, formatLatency, formatUsd } from "@/lib/utils/format";

type InspectorStep = {
  id: string;
  type: string;
  provider: string;
  modelId: string;
  renderedPrompt: string;
  outputRaw: string;
  outputParsedJson: Record<string, unknown> | null;
  status: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  createdAt: string;
};

type InspectorRun = {
  id: string;
  mode: string;
  status: string;
  totalCostUsd: number;
  totalLatencyMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  routerDecisionJson: Record<string, unknown> | null;
  createdAt: string;
};

type Artifact = {
  id: string;
  kind: string;
  title: string;
  content: string;
};

type Props = {
  run: InspectorRun;
  steps: InspectorStep[];
  artifacts: Artifact[];
};

const tabs = ["timeline", "prompts", "diff", "compare"] as const;

type TabId = (typeof tabs)[number];

type DisagreementItem = {
  claim: string;
  disagreesWith: string[];
};

function parseDisagreements(value: unknown): DisagreementItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is DisagreementItem =>
      typeof item === "object" &&
      item !== null &&
      "claim" in item &&
      "disagreesWith" in item &&
      typeof (item as { claim: unknown }).claim === "string" &&
      Array.isArray((item as { disagreesWith: unknown }).disagreesWith) &&
      (item as { disagreesWith: unknown[] }).disagreesWith.every(
        (value) => typeof value === "string"
      )
  );
}

export function RunInspector({ run, steps, artifacts }: Props) {
  const [tab, setTab] = useState<TabId>("timeline");

  const routerReasoning = useMemo(() => {
    if (!run.routerDecisionJson) {
      return null;
    }

    const reasoning = run.routerDecisionJson.reasoning;
    const chosen = run.routerDecisionJson.chosen;

    if (!reasoning || typeof reasoning !== "string") {
      return null;
    }

    return {
      reasoning,
      chosen: chosen as { provider?: string; modelId?: string }
    };
  }, [run.routerDecisionJson]);

  const modelSteps = steps.filter((step) =>
    ["MODEL_CALL", "DRAFT", "REFINE", "CRITIQUE", "COMPRESS"].includes(step.type)
  );

  const judgeStep = steps.find((step) => step.type === "JUDGE");
  const disagreements = parseDisagreements(judgeStep?.outputParsedJson?.disagreements);

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Run Inspector</h1>
            <p className="text-sm text-ink/70">
              {run.id} · {run.mode} · {run.status} · {formatDate(run.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge">Cost {formatUsd(run.totalCostUsd)}</span>
            <span className="badge">Latency {formatLatency(run.totalLatencyMs)}</span>
            <span className="badge">
              Tokens {run.totalInputTokens}/{run.totalOutputTokens}
            </span>
          </div>
        </div>

        {routerReasoning ? (
          <div className="rounded-lg border border-accent/40 bg-accent/10 p-3">
            <h2 className="text-sm font-semibold">Why this model?</h2>
            <p className="mt-1 text-sm text-ink/90">{routerReasoning.reasoning}</p>
            <p className="mt-1 text-xs text-ink/70">
              Chosen: {routerReasoning.chosen?.provider}/{routerReasoning.chosen?.modelId}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {tabs.map((tabId) => (
            <button
              key={tabId}
              className={`rounded-lg border px-3 py-2 text-sm ${
                tab === tabId
                  ? "border-accent bg-accent/20"
                  : "border-ink/20 bg-white hover:bg-ink/5"
              }`}
              type="button"
              onClick={() => setTab(tabId)}
            >
              {tabId.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      {tab === "timeline" ? (
        <section className="space-y-2">
          {steps.map((step) => (
            <article key={step.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  {step.type} · {step.provider}/{step.modelId}
                </h3>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="badge">{step.status}</span>
                  <span className="badge">{formatUsd(step.costUsd)}</span>
                  <span className="badge">{formatLatency(step.latencyMs)}</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-ink/65">{formatDate(step.createdAt)}</p>

              <details className="mt-2 rounded-lg border border-ink/15 bg-white p-3">
                <summary className="cursor-pointer text-sm font-medium">View details</summary>
                <div className="mt-2 space-y-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">Prompt</p>
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded border border-ink/10 bg-ink/5 p-2 text-xs">
                      {step.renderedPrompt || "(none)"}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">Output</p>
                    <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded border border-ink/10 bg-ink/5 p-2 text-xs">
                      {step.outputRaw || "(none)"}
                    </pre>
                  </div>
                </div>
              </details>
            </article>
          ))}
        </section>
      ) : null}

      {tab === "prompts" ? (
        <section className="space-y-2">
          {steps
            .filter((step) => step.renderedPrompt)
            .map((step) => (
              <article key={step.id} className="card">
                <h3 className="text-sm font-semibold">
                  {step.type} · {step.provider}/{step.modelId}
                </h3>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded border border-ink/10 bg-white p-3 text-xs">
                  {step.renderedPrompt}
                </pre>
              </article>
            ))}
        </section>
      ) : null}

      {tab === "diff" ? (
        <section className="card">
          <PromptDiffViewer
            steps={steps
              .filter((step) => step.renderedPrompt)
              .map((step) => ({
                id: step.id,
                modelId: step.modelId,
                type: step.type,
                renderedPrompt: step.renderedPrompt
              }))}
          />
        </section>
      ) : null}

      {tab === "compare" ? (
        <section className="space-y-4">
          {modelSteps.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-3">
              {modelSteps.map((step) => (
                <article key={step.id} className="card min-h-[240px]">
                  <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 rounded-t-xl border-b border-ink/10 bg-white/95 px-4 py-3 backdrop-blur">
                    <h3 className="text-sm font-semibold">{step.modelId}</h3>
                    <p className="text-xs text-ink/65">
                      {step.provider} · {formatUsd(step.costUsd)} · {formatLatency(step.latencyMs)}
                    </p>
                  </div>
                  <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap text-xs leading-relaxed">
                    {step.outputRaw}
                  </pre>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink/65">No model outputs for compare view.</p>
          )}

          <section className="card">
            <h3 className="text-sm font-semibold">Disagreements</h3>
            <div className="mt-2 space-y-2">
              {Array.isArray(disagreements) && disagreements.length > 0 ? (
                disagreements.map((item, index) => (
                  <article key={index} className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</pre>
                  </article>
                ))
              ) : (
                <p className="text-xs text-ink/65">No major disagreement signals detected.</p>
              )}
            </div>
          </section>

          <section className="card space-y-2">
            <h3 className="text-sm font-semibold">Artifacts</h3>
            {artifacts.map((artifact) => (
              <article key={artifact.id} className="rounded-lg border border-ink/15 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">
                  {artifact.kind} · {artifact.title}
                </p>
                <pre className="mt-2 whitespace-pre-wrap text-xs">{artifact.content}</pre>
              </article>
            ))}
            {artifacts.length === 0 ? <p className="text-xs text-ink/65">No artifacts yet.</p> : null}
          </section>
        </section>
      ) : null}
    </div>
  );
}
