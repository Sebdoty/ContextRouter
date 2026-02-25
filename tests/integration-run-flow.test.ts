import { beforeAll, beforeEach, vi } from "vitest";

type SessionRecord = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

type MessageRecord = {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};

type RunRecord = {
  id: string;
  sessionId: string;
  mode: "AUTO" | "COMPARE" | "CHAIN";
  userMessageId: string | null;
  selectedModelIds: string[];
  preferencesJson: Record<string, unknown> | null;
  cpirJson: Record<string, unknown>;
  contextPackJson: Record<string, unknown>;
  routerDecisionJson: Record<string, unknown> | null;
  status: "PENDING" | "RUNNING" | "DONE" | "ERROR";
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  totalLatencyMs: number;
  createdAt: Date;
  updatedAt: Date;
};

type StepRecord = {
  id: string;
  runId: string;
  type: string;
  provider: string;
  modelId: string;
  renderedPrompt: string;
  outputRaw: string;
  outputParsedJson: Record<string, unknown> | null;
  status: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ArtifactRecord = {
  id: string;
  sessionId: string;
  runId: string | null;
  kind: "FINAL_ANSWER" | "CODE" | "MEMO" | "JSON";
  title: string;
  content: string;
  createdAt: Date;
};

type MemoryRecord = {
  id: string;
  sessionId: string;
  type: "FACT" | "PREFERENCE" | "DECISION" | "ARTIFACT_REF";
  key: string;
  value: Record<string, unknown>;
  confidence: number;
  enabled: boolean;
  sourceRunId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type InMemoryState = {
  sessions: SessionRecord[];
  messages: MessageRecord[];
  runs: RunRecord[];
  steps: StepRecord[];
  artifacts: ArtifactRecord[];
  memoryItems: MemoryRecord[];
};

function createInMemoryPrisma() {
  const state: InMemoryState = {
    sessions: [],
    messages: [],
    runs: [],
    steps: [],
    artifacts: [],
    memoryItems: []
  };

  let idCounter = 0;

  function nextId(prefix: string) {
    idCounter += 1;
    return `${prefix}_${idCounter}`;
  }

  function touchSession(sessionId: string) {
    const session = state.sessions.find((record) => record.id === sessionId);
    if (session) {
      session.updatedAt = new Date();
    }
  }

  const prisma = {
    __state: state,
    session: {
      async create({ data }: { data: { title: string } }) {
        const record: SessionRecord = {
          id: nextId("session"),
          title: data.title,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        state.sessions.push(record);
        return record;
      },
      async findMany() {
        return [...state.sessions];
      },
      async findUnique({ where }: { where: { id: string } }) {
        return state.sessions.find((record) => record.id === where.id) ?? null;
      }
    },
    message: {
      async create({ data }: { data: { sessionId: string; role: "user" | "assistant"; content: string } }) {
        const record: MessageRecord = {
          id: nextId("message"),
          sessionId: data.sessionId,
          role: data.role,
          content: data.content,
          createdAt: new Date()
        };
        state.messages.push(record);
        touchSession(data.sessionId);
        return record;
      },
      async findMany(args: {
        where: { sessionId: string };
        orderBy?: { createdAt: "asc" | "desc" };
        take?: number;
      }) {
        let rows = state.messages.filter((record) => record.sessionId === args.where.sessionId);

        if (args.orderBy?.createdAt === "desc") {
          rows = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }

        if (args.orderBy?.createdAt === "asc") {
          rows = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        }

        if (args.take !== undefined) {
          rows = rows.slice(0, args.take);
        }

        return rows;
      }
    },
    run: {
      async create({ data }: { data: Omit<RunRecord, "id" | "createdAt" | "updatedAt" | "totalInputTokens" | "totalOutputTokens" | "totalCostUsd" | "totalLatencyMs"> & Partial<Pick<RunRecord, "totalInputTokens" | "totalOutputTokens" | "totalCostUsd" | "totalLatencyMs">> }) {
        const record: RunRecord = {
          id: nextId("run"),
          sessionId: data.sessionId,
          mode: data.mode,
          userMessageId: data.userMessageId ?? null,
          selectedModelIds: data.selectedModelIds ?? [],
          preferencesJson: data.preferencesJson ?? null,
          cpirJson: data.cpirJson,
          contextPackJson: data.contextPackJson,
          routerDecisionJson: data.routerDecisionJson ?? null,
          status: data.status,
          totalInputTokens: data.totalInputTokens ?? 0,
          totalOutputTokens: data.totalOutputTokens ?? 0,
          totalCostUsd: data.totalCostUsd ?? 0,
          totalLatencyMs: data.totalLatencyMs ?? 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        state.runs.push(record);
        touchSession(record.sessionId);
        return record;
      },
      async findUnique(args: {
        where: { id: string };
        include?: {
          steps?: boolean;
          session?: boolean;
          userMessage?: boolean;
          artifacts?: boolean;
        };
      }) {
        const run = state.runs.find((record) => record.id === args.where.id);
        if (!run) {
          return null;
        }

        return {
          ...run,
          ...(args.include?.steps
            ? {
                steps: state.steps.filter((step) => step.runId === run.id)
              }
            : {}),
          ...(args.include?.session
            ? {
                session: state.sessions.find((session) => session.id === run.sessionId) ?? null
              }
            : {}),
          ...(args.include?.userMessage
            ? {
                userMessage:
                  state.messages.find((message) => message.id === run.userMessageId) ?? null
              }
            : {}),
          ...(args.include?.artifacts
            ? {
                artifacts: state.artifacts.filter((artifact) => artifact.runId === run.id)
              }
            : {})
        };
      },
      async update({ where, data }: { where: { id: string }; data: Partial<RunRecord> }) {
        const run = state.runs.find((record) => record.id === where.id);
        if (!run) {
          throw new Error("Run not found");
        }

        Object.assign(run, data, { updatedAt: new Date() });
        return run;
      },
      async updateMany(args: { where: { id: string; status?: RunRecord["status"] }; data: Partial<RunRecord> }) {
        const targets = state.runs.filter((record) => {
          if (record.id !== args.where.id) {
            return false;
          }

          if (args.where.status && record.status !== args.where.status) {
            return false;
          }

          return true;
        });

        for (const run of targets) {
          Object.assign(run, args.data, { updatedAt: new Date() });
        }

        return { count: targets.length };
      }
    },
    step: {
      async create({ data }: { data: Partial<StepRecord> & { runId: string; type: string; provider: string; modelId: string; status: string } }) {
        const step: StepRecord = {
          id: nextId("step"),
          runId: data.runId,
          type: data.type,
          provider: data.provider,
          modelId: data.modelId,
          renderedPrompt: data.renderedPrompt ?? "",
          outputRaw: data.outputRaw ?? "",
          outputParsedJson: (data.outputParsedJson as Record<string, unknown>) ?? null,
          status: data.status,
          startedAt: (data.startedAt as Date) ?? null,
          finishedAt: (data.finishedAt as Date) ?? null,
          inputTokens: data.inputTokens ?? 0,
          outputTokens: data.outputTokens ?? 0,
          costUsd: data.costUsd ?? 0,
          latencyMs: data.latencyMs ?? 0,
          errorMessage: (data.errorMessage as string) ?? null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        state.steps.push(step);
        return step;
      },
      async update({ where, data }: { where: { id: string }; data: Partial<StepRecord> }) {
        const step = state.steps.find((record) => record.id === where.id);
        if (!step) {
          throw new Error("Step not found");
        }

        Object.assign(step, data, { updatedAt: new Date() });
        return step;
      },
      async findMany(args: {
        where: {
          runId?: string;
          status?:
            | string
            | {
                in: string[];
              };
        };
      }) {
        return state.steps.filter((record) => {
          if (args.where.runId && record.runId !== args.where.runId) {
            return false;
          }

          if (args.where.status) {
            if (typeof args.where.status === "string" && record.status !== args.where.status) {
              return false;
            }

            if (
              typeof args.where.status !== "string" &&
              !args.where.status.in.includes(record.status)
            ) {
              return false;
            }
          }

          return true;
        });
      },
      async aggregate({ where }: { where: { runId: string } }) {
        const rows = state.steps.filter((step) => step.runId === where.runId);
        return {
          _sum: {
            inputTokens: rows.reduce((sum, row) => sum + row.inputTokens, 0),
            outputTokens: rows.reduce((sum, row) => sum + row.outputTokens, 0),
            costUsd: rows.reduce((sum, row) => sum + row.costUsd, 0),
            latencyMs: rows.reduce((sum, row) => sum + row.latencyMs, 0)
          }
        };
      }
    },
    artifact: {
      async create({ data }: { data: Omit<ArtifactRecord, "id" | "createdAt"> }) {
        const artifact: ArtifactRecord = {
          id: nextId("artifact"),
          sessionId: data.sessionId,
          runId: data.runId,
          kind: data.kind,
          title: data.title,
          content: data.content,
          createdAt: new Date()
        };
        state.artifacts.push(artifact);
        return artifact;
      }
    },
    memoryItem: {
      async findMany(args: { where: { sessionId: string; enabled?: boolean }; orderBy?: { updatedAt: "desc" | "asc" } }) {
        let rows = state.memoryItems.filter((item) => item.sessionId === args.where.sessionId);

        if (args.where.enabled !== undefined) {
          rows = rows.filter((item) => item.enabled === args.where.enabled);
        }

        if (args.orderBy?.updatedAt === "desc") {
          rows = [...rows].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        }

        if (args.orderBy?.updatedAt === "asc") {
          rows = [...rows].sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
        }

        return rows;
      },
      async create({ data }: { data: Omit<MemoryRecord, "id" | "createdAt" | "updatedAt"> }) {
        const record: MemoryRecord = {
          id: nextId("memory"),
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        state.memoryItems.push(record);
        return record;
      },
      async upsert(args: {
        where: {
          sessionId_key: {
            sessionId: string;
            key: string;
          };
        };
        update: Partial<MemoryRecord>;
        create: Omit<MemoryRecord, "id" | "createdAt" | "updatedAt">;
      }) {
        const existing = state.memoryItems.find(
          (item) =>
            item.sessionId === args.where.sessionId_key.sessionId &&
            item.key === args.where.sessionId_key.key
        );

        if (existing) {
          Object.assign(existing, args.update, { updatedAt: new Date() });
          return existing;
        }

        const created: MemoryRecord = {
          id: nextId("memory"),
          ...args.create,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        state.memoryItems.push(created);
        return created;
      },
      async update({ where, data }: { where: { id: string }; data: Partial<MemoryRecord> }) {
        const item = state.memoryItems.find((record) => record.id === where.id);
        if (!item) {
          throw new Error("Memory not found");
        }

        Object.assign(item, data, { updatedAt: new Date() });
        return item;
      },
      async delete({ where }: { where: { id: string } }) {
        const index = state.memoryItems.findIndex((record) => record.id === where.id);
        if (index === -1) {
          throw new Error("Memory not found");
        }

        const [item] = state.memoryItems.splice(index, 1);
        return item;
      }
    }
  };

  return { prisma, state };
}

const { prisma, state } = createInMemoryPrisma();

let executeRun!: typeof import("@/lib/engine/executor").executeRun;
let createMessageAndRun!: typeof import("@/lib/services/session-service").createMessageAndRun;
let createSession!: typeof import("@/lib/services/session-service").createSession;

beforeAll(async () => {
  vi.resetModules();
  vi.doMock("@/lib/db", () => ({
    prisma
  }));

  ({ executeRun } = await import("@/lib/engine/executor"));
  ({ createMessageAndRun, createSession } = await import("@/lib/services/session-service"));
});

beforeEach(() => {
  state.sessions.length = 0;
  state.messages.length = 0;
  state.runs.length = 0;
  state.steps.length = 0;
  state.artifacts.length = 0;
  state.memoryItems.length = 0;
});

describe("integration: session -> run execution", () => {
  it("creates a run and persists steps + final artifact in mock mode", async () => {
    const session = await createSession({ title: "Integration test session" });

    const { run } = await createMessageAndRun(session.id, {
      content: "Compare options for building a deterministic router with TypeScript",
      mode: "COMPARE",
      selectedModels: ["mock-balanced", "mock-creative", "mock-analyst"],
      preferences: {
        qualityBias: 65,
        costCapEnabled: false,
        latencyCapEnabled: false
      }
    });

    const executed = await executeRun(run.id);

    expect(executed?.status).toBe("DONE");

    const runSteps = state.steps.filter((step) => step.runId === run.id);
    expect(runSteps.length).toBeGreaterThanOrEqual(5);
    expect(runSteps.some((step) => step.type === "ROUTER")).toBe(true);
    expect(runSteps.some((step) => step.type === "JUDGE")).toBe(true);

    const finalArtifact = state.artifacts.find(
      (artifact) => artifact.runId === run.id && artifact.kind === "FINAL_ANSWER"
    );
    expect(finalArtifact).toBeDefined();

    const assistantMessage = state.messages.find(
      (message) => message.sessionId === session.id && message.role === "assistant"
    );
    expect(assistantMessage).toBeDefined();
  });

  it("is idempotent when execute is called again for the same run", async () => {
    const session = await createSession({ title: "Idempotency session" });
    const { run } = await createMessageAndRun(session.id, {
      content: "Route this request and generate a final answer",
      mode: "AUTO",
      selectedModels: ["mock-balanced"],
      preferences: {
        qualityBias: 50,
        costCapEnabled: false,
        latencyCapEnabled: false
      }
    });

    await executeRun(run.id);
    const firstStepCount = state.steps.filter((step) => step.runId === run.id).length;

    await executeRun(run.id);
    const secondStepCount = state.steps.filter((step) => step.runId === run.id).length;

    expect(secondStepCount).toBe(firstStepCount);
    expect(state.artifacts.filter((artifact) => artifact.runId === run.id).length).toBe(1);
    expect(state.memoryItems.filter((item) => item.sourceRunId === run.id).length).toBe(1);
  });
});
