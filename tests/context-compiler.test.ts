import { beforeAll, beforeEach, vi } from "vitest";

const dbMock = {
  message: {
    findMany: vi.fn()
  },
  memoryItem: {
    findMany: vi.fn()
  }
};

let compileContextPack!: typeof import("@/lib/context/compiler").compileContextPack;

beforeAll(async () => {
  vi.resetModules();
  vi.doMock("@/lib/db", () => ({
    prisma: dbMock
  }));

  ({ compileContextPack } = await import("@/lib/context/compiler"));
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("context compiler", () => {
  it("truncates turns and selects relevant top-K memory", async () => {
    dbMock.message.findMany.mockResolvedValueOnce([
      {
        id: "msg2",
        sessionId: "s1",
        role: "assistant",
        content: "A".repeat(500),
        createdAt: new Date("2026-01-01T10:01:00.000Z")
      },
      {
        id: "msg1",
        sessionId: "s1",
        role: "user",
        content: "B".repeat(500),
        createdAt: new Date("2026-01-01T10:00:00.000Z")
      }
    ]);

    dbMock.memoryItem.findMany.mockResolvedValueOnce([
      {
        id: "m1",
        sessionId: "s1",
        type: "FACT",
        key: "typescript_router_pattern",
        value: { note: "Use deterministic scoring" },
        confidence: 0.9,
        enabled: true,
        updatedAt: new Date("2026-01-01T11:00:00.000Z")
      },
      {
        id: "m2",
        sessionId: "s1",
        type: "FACT",
        key: "gardening_notes",
        value: { note: "Water every morning" },
        confidence: 0.8,
        enabled: true,
        updatedAt: new Date("2026-01-01T10:30:00.000Z")
      }
    ]);

    const result = await compileContextPack("s1", "Need TypeScript router design");

    expect(result.recentTurns[0].content.length).toBeLessThanOrEqual(320);
    expect(result.memoryRefs.length).toBeLessThanOrEqual(6);
    expect(result.memoryRefs.some((item) => item.memoryItemId === "m1")).toBe(true);
    expect(result.summary.length).toBeGreaterThan(0);
  });
});
