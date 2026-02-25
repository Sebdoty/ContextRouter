"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatDate } from "@/lib/utils/format";

type SessionOption = {
  id: string;
  title: string;
};

type MemoryItemView = {
  id: string;
  type: string;
  key: string;
  value: Record<string, unknown>;
  confidence: number;
  enabled: boolean;
  sourceRunId: string | null;
  updatedAt: string;
};

type Props = {
  sessions: SessionOption[];
  selectedSessionId: string | null;
  items: MemoryItemView[];
};

export function MemoryDashboard({ sessions, selectedSessionId, items }: Props) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState(selectedSessionId ?? sessions[0]?.id ?? "");
  const [type, setType] = useState("FACT");
  const [key, setKey] = useState("");
  const [value, setValue] = useState('{"note":""}');
  const [confidence, setConfidence] = useState("0.7");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function changeSession(nextSessionId: string) {
    setSessionId(nextSessionId);
    router.push(`/memory?sessionId=${nextSessionId}`);
    router.refresh();
  }

  async function toggleEnabled(memoryId: string, enabled: boolean) {
    await fetch(`/api/memory/${memoryId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ enabled })
    });

    router.refresh();
  }

  async function remove(memoryId: string) {
    await fetch(`/api/memory/${memoryId}`, {
      method: "DELETE"
    });
    router.refresh();
  }

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!sessionId) {
      setError("Select a session first.");
      return;
    }

    let parsedValue: Record<string, unknown>;
    try {
      parsedValue = JSON.parse(value) as Record<string, unknown>;
    } catch {
      setError("Value must be valid JSON.");
      return;
    }

    startTransition(() => {
      void (async () => {
        const response = await fetch(`/api/sessions/${sessionId}/memory`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            type,
            key,
            value: parsedValue,
            confidence: Number(confidence),
            enabled: true
          })
        });

        if (!response.ok) {
          setError("Failed to create memory item.");
          return;
        }

        setKey("");
        setValue('{"note":""}');
        router.refresh();
      })();
    });
  }

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Session
            <select
              className="mt-1 w-full rounded border border-ink/20 bg-white px-3 py-2"
              value={sessionId}
              onChange={(event) => changeSession(event.target.value)}
            >
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <form className="space-y-3" onSubmit={onCreate}>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm">
              Type
              <select
                className="mt-1 w-full rounded border border-ink/20 bg-white px-3 py-2"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                <option value="FACT">FACT</option>
                <option value="PREFERENCE">PREFERENCE</option>
                <option value="DECISION">DECISION</option>
                <option value="ARTIFACT_REF">ARTIFACT_REF</option>
              </select>
            </label>

            <label className="text-sm">
              Key
              <input
                className="mt-1 w-full rounded border border-ink/20 bg-white px-3 py-2"
                value={key}
                onChange={(event) => setKey(event.target.value)}
              />
            </label>

            <label className="text-sm">
              Confidence
              <input
                className="mt-1 w-full rounded border border-ink/20 bg-white px-3 py-2"
                type="number"
                min={0}
                max={1}
                step="0.05"
                value={confidence}
                onChange={(event) => setConfidence(event.target.value)}
              />
            </label>
          </div>

          <label className="text-sm">
            Value JSON
            <textarea
              rows={4}
              className="mt-1 w-full rounded border border-ink/20 bg-white px-3 py-2 font-mono text-xs"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <button className="button-primary" type="submit" disabled={isPending}>
            {isPending ? "Adding..." : "Add Memory Item"}
          </button>
        </form>
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Memory Items</h2>
          <span className="badge">{items.length}</span>
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border border-ink/15 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">{item.key}</h3>
                  <p className="text-xs text-ink/65">
                    {item.type} · confidence {item.confidence.toFixed(2)} · updated {formatDate(item.updatedAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="button-secondary"
                    type="button"
                    onClick={() => toggleEnabled(item.id, !item.enabled)}
                  >
                    {item.enabled ? "Disable" : "Enable"}
                  </button>
                  <button className="button-secondary" type="button" onClick={() => remove(item.id)}>
                    Delete
                  </button>
                </div>
              </div>

              <pre className="mt-2 whitespace-pre-wrap rounded border border-ink/10 bg-ink/5 p-2 text-xs">
                {JSON.stringify(item.value, null, 2)}
              </pre>

              {item.sourceRunId ? (
                <Link href={`/runs/${item.sourceRunId}`} className="mt-2 inline-block text-xs text-ink underline">
                  Source run: {item.sourceRunId}
                </Link>
              ) : null}
            </article>
          ))}

          {items.length === 0 ? <p className="text-sm text-ink/65">No memory items in this session.</p> : null}
        </div>
      </section>
    </div>
  );
}
