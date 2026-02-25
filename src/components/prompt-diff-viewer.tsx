"use client";

import { useMemo, useState } from "react";
import DiffMatchPatch from "diff-match-patch";

type PromptStep = {
  id: string;
  modelId: string;
  type: string;
  renderedPrompt: string;
};

type Props = {
  steps: PromptStep[];
};

const dmp = new DiffMatchPatch();

export function PromptDiffViewer({ steps }: Props) {
  const [leftId, setLeftId] = useState(steps[0]?.id ?? "");
  const [rightId, setRightId] = useState(steps[1]?.id ?? steps[0]?.id ?? "");

  const left = steps.find((step) => step.id === leftId);
  const right = steps.find((step) => step.id === rightId);

  const diffs = useMemo(() => {
    if (!left || !right) {
      return [];
    }

    return dmp.diff_main(left.renderedPrompt, right.renderedPrompt);
  }, [left, right]);

  if (steps.length === 0) {
    return <p className="text-sm text-ink/65">No rendered prompts captured.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs">
          Left prompt
          <select
            className="mt-1 w-full rounded border border-ink/20 bg-white px-2 py-2 text-sm"
            value={leftId}
            onChange={(event) => setLeftId(event.target.value)}
          >
            {steps.map((step) => (
              <option key={step.id} value={step.id}>
                {step.modelId} ({step.type})
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs">
          Right prompt
          <select
            className="mt-1 w-full rounded border border-ink/20 bg-white px-2 py-2 text-sm"
            value={rightId}
            onChange={(event) => setRightId(event.target.value)}
          >
            {steps.map((step) => (
              <option key={step.id} value={step.id}>
                {step.modelId} ({step.type})
              </option>
            ))}
          </select>
        </label>
      </div>

      <pre className="max-h-[420px] overflow-auto rounded-lg border border-ink/15 bg-white p-3 text-xs leading-relaxed">
        {diffs.map(([kind, text], index) => {
          const className = kind === 1 ? "bg-success/20" : kind === -1 ? "bg-danger/20" : "";
          return (
            <span key={`${kind}-${index}`} className={className}>
              {text}
            </span>
          );
        })}
      </pre>
    </div>
  );
}
