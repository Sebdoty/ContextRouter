"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { formatDate, formatLatency, formatUsd } from "@/lib/utils/format";

type SessionMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type SessionRun = {
  id: string;
  mode: "AUTO" | "COMPARE" | "CHAIN";
  status: "PENDING" | "RUNNING" | "DONE" | "ERROR";
  totalCostUsd: number;
  totalLatencyMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  createdAt: string;
};

type ModelOption = {
  provider: string;
  modelId: string;
};

type Props = {
  sessionId: string;
  messages: SessionMessage[];
  runs: SessionRun[];
  modelOptions: ModelOption[];
};

export function SessionWorkbench({ sessionId, messages, runs, modelOptions }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"AUTO" | "COMPARE" | "CHAIN">("AUTO");
  const [content, setContent] = useState("");
  const [qualityBias, setQualityBias] = useState(50);
  const [costCapEnabled, setCostCapEnabled] = useState(false);
  const [maxCostUsd, setMaxCostUsd] = useState("0.50");
  const [latencyCapEnabled, setLatencyCapEnabled] = useState(false);
  const [maxLatencyMs, setMaxLatencyMs] = useState("6000");
  const [selectedModels, setSelectedModels] = useState<string[]>(
    modelOptions.slice(0, 3).map((model) => model.modelId)
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const modeInfo = useMemo(() => {
    if (mode === "AUTO") {
      return "One routed model with explainability.";
    }

    if (mode === "COMPARE") {
      return "Run 2-4 models in parallel + disagreement judge.";
    }

    return "Fixed chain: Draft -> Refine -> Critique -> Compress -> Merge.";
  }, [mode]);

  function toggleModel(modelId: string) {
    setSelectedModels((previous) => {
      if (previous.includes(modelId)) {
        return previous.filter((id) => id !== modelId);
      }

      if (previous.length >= 4) {
        return previous;
      }

      return [...previous, modelId];
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmed = content.trim();
    if (!trimmed) {
      setError("Message is required.");
      return;
    }

    if (mode === "COMPARE" && selectedModels.length < 2) {
      setError("Choose at least 2 models for compare mode.");
      return;
    }

    startTransition(() => {
      void (async () => {
        const messageResponse = await fetch(`/api/sessions/${sessionId}/message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            content: trimmed,
            mode,
            selectedModels,
            preferences: {
              qualityBias,
              costCapEnabled,
              maxCostUsd: Number(maxCostUsd),
              latencyCapEnabled,
              maxLatencyMs: Number(maxLatencyMs)
            }
          })
        });

        if (!messageResponse.ok) {
          setError("Failed to create run.");
          return;
        }

        const { run } = (await messageResponse.json()) as { run: { id: string } };

        const executeResponse = await fetch(`/api/runs/${run.id}/execute`, {
          method: "POST"
        });

        if (!executeResponse.ok) {
          setError("Run created, but execution failed.");
          router.refresh();
          return;
        }

        setContent("");
        router.push(`/runs/${run.id}`);
        router.refresh();
      })();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.25fr,1fr]">
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Session Timeline</h2>
          <span className="badge">{messages.length} turns</span>
        </div>

        <div className="max-h-[540px] space-y-2 overflow-auto pr-1">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`rounded-lg border px-3 py-2 text-sm ${
                message.role === "user"
                  ? "border-ink/20 bg-white"
                  : "border-accent/30 bg-accent/10"
              }`}
            >
              <div className="mb-1 flex items-center justify-between text-xs text-ink/60">
                <span className="font-semibold uppercase tracking-wide">{message.role}</span>
                <span>{formatDate(message.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-ink/90">{message.content}</p>
            </article>
          ))}

          {messages.length === 0 ? (
            <p className="rounded-lg border border-dashed border-ink/20 px-3 py-5 text-center text-sm text-ink/65">
              No messages yet.
            </p>
          ) : null}
        </div>
      </section>

      <div className="space-y-4">
        <form className="card space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink/70">
              Prompt
            </label>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={6}
              placeholder="Ask ContextRouter to route, compare, or chain across models..."
              className="w-full rounded-lg border border-ink/20 bg-white px-3 py-2 text-sm outline-none ring-accent focus:ring"
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/70">Run Mode</p>
            <div className="grid grid-cols-3 gap-2">
              {(["AUTO", "COMPARE", "CHAIN"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    mode === item
                      ? "border-accent bg-accent/20 text-ink"
                      : "border-ink/20 bg-white text-ink/80 hover:bg-ink/5"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink/70">{modeInfo}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-ink/70">
              Preference Slider ({qualityBias})
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={qualityBias}
              onChange={(event) => setQualityBias(Number(event.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-[11px] text-ink/65">
              <span>Cost/Speed</span>
              <span>Quality</span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="rounded-lg border border-ink/20 bg-white px-3 py-2 text-xs">
              <input
                className="mr-2"
                type="checkbox"
                checked={costCapEnabled}
                onChange={(event) => setCostCapEnabled(event.target.checked)}
              />
              Cost cap enabled
              <input
                disabled={!costCapEnabled}
                type="number"
                step="0.01"
                value={maxCostUsd}
                onChange={(event) => setMaxCostUsd(event.target.value)}
                className="mt-2 w-full rounded border border-ink/20 px-2 py-1 text-xs disabled:bg-ink/5"
              />
            </label>

            <label className="rounded-lg border border-ink/20 bg-white px-3 py-2 text-xs">
              <input
                className="mr-2"
                type="checkbox"
                checked={latencyCapEnabled}
                onChange={(event) => setLatencyCapEnabled(event.target.checked)}
              />
              Latency cap enabled
              <input
                disabled={!latencyCapEnabled}
                type="number"
                value={maxLatencyMs}
                onChange={(event) => setMaxLatencyMs(event.target.value)}
                className="mt-2 w-full rounded border border-ink/20 px-2 py-1 text-xs disabled:bg-ink/5"
              />
            </label>
          </div>

          <div className={`${mode === "COMPARE" ? "block" : "hidden"}`}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
              Models (2-4)
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {modelOptions.map((model) => (
                <label
                  key={model.modelId}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink/20 bg-white px-3 py-2 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={selectedModels.includes(model.modelId)}
                    onChange={() => toggleModel(model.modelId)}
                  />
                  <span>
                    {model.modelId}
                    <span className="ml-1 text-ink/60">({model.provider})</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <button className="button-primary w-full" type="submit" disabled={isPending}>
            {isPending ? "Executing run..." : "Send + Execute"}
          </button>
        </form>

        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Runs</h3>
            <span className="badge">{runs.length}</span>
          </div>
          <div className="max-h-[280px] space-y-2 overflow-auto pr-1">
            {runs.map((run) => (
              <Link
                key={run.id}
                href={`/runs/${run.id}`}
                className="block rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm hover:border-accent/60"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{run.mode}</span>
                  <span className="badge">{run.status}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-ink/70">
                  <span>Cost {formatUsd(run.totalCostUsd)}</span>
                  <span>Latency {formatLatency(run.totalLatencyMs)}</span>
                  <span>
                    Tokens {run.totalInputTokens}/{run.totalOutputTokens}
                  </span>
                </div>
              </Link>
            ))}
            {runs.length === 0 ? <p className="text-sm text-ink/65">No runs yet.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
