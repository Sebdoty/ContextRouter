import { cpirSchema } from "@/lib/schemas";

describe("cpirSchema", () => {
  it("accepts a valid CPIR payload", () => {
    const parsed = cpirSchema.parse({
      intent: "Build an API endpoint",
      taskType: "coding",
      depth: "deep",
      constraints: {
        format: "markdown",
        citations: false,
        tone: "concise",
        maxCostUsd: 1.5,
        maxLatencyMs: 8000
      },
      inputs: {
        userText: "Implement a secure endpoint"
      },
      contextPack: {
        summary: "User is building a Next.js app",
        facts: ["Stack is TypeScript"],
        decisions: ["Use route handlers"],
        openQuestions: ["Need auth strategy"],
        constraints: ["No vendor lock"],
        recentTurns: [{ role: "user", content: "Need API design" }],
        memoryRefs: [{ memoryItemId: "m1", key: "stack" }]
      },
      outputContract: {
        type: "sections"
      }
    });

    expect(parsed.taskType).toBe("coding");
    expect(parsed.depth).toBe("deep");
  });

  it("rejects invalid task type", () => {
    expect(() =>
      cpirSchema.parse({
        intent: "Invalid",
        taskType: "unsupported",
        depth: "medium",
        constraints: {},
        inputs: { userText: "x" },
        contextPack: {
          summary: "",
          facts: [],
          decisions: [],
          openQuestions: [],
          constraints: [],
          recentTurns: [],
          memoryRefs: []
        },
        outputContract: {
          type: "freeform"
        }
      })
    ).toThrow();
  });
});
