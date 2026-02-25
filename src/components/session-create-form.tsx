"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function SessionCreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            title
          })
        });

        if (!response.ok) {
          setError("Could not create session.");
          return;
        }

        setTitle("");
        router.refresh();
      })();
    });
  }

  return (
    <form className="card flex flex-col gap-3" onSubmit={onSubmit}>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink/70">
            New Session
          </label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Build deployment migration plan"
            className="w-full rounded-lg border border-ink/20 bg-white px-3 py-2 text-sm outline-none ring-accent focus:ring"
          />
        </div>
        <button className="button-primary" type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create"}
        </button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </form>
  );
}
