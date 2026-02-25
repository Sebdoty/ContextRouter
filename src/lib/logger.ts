import { randomUUID } from "node:crypto";

type LogLevel = "info" | "warn" | "error";

type LogMeta = Record<string, string | number | boolean | undefined | null>;

export type TraceContext = {
  traceId: string;
  runId?: string;
  stepId?: string;
};

export function newTrace(runId?: string): TraceContext {
  return {
    traceId: randomUUID(),
    runId
  };
}

export function log(level: LogLevel, message: string, context: TraceContext, meta: LogMeta = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    trace_id: context.traceId,
    run_id: context.runId,
    step_id: context.stepId,
    ...meta
  };

  const raw = JSON.stringify(payload);
  if (level === "error") {
    console.error(raw);
    return;
  }

  if (level === "warn") {
    console.warn(raw);
    return;
  }

  console.log(raw);
}
