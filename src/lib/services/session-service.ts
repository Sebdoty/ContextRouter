import { MessageRole, RunMode, RunStatus } from "@prisma/client";
import { compileContextPack } from "@/lib/context/compiler";
import { prisma } from "@/lib/db";
import { resolveSelectedModels } from "@/lib/models/catalog";
import { buildCPIR } from "@/lib/router";
import { createSessionSchema, postMessageSchema } from "@/lib/schemas";
import { asInputJson } from "@/lib/utils/prisma-json";

export async function listSessions() {
  return prisma.session.findMany({
    include: {
      runs: {
        orderBy: {
          createdAt: "desc"
        },
        take: 1
      },
      _count: {
        select: {
          runs: true,
          messages: true
        }
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });
}

export async function getSessionById(sessionId: string) {
  return prisma.session.findUnique({
    where: {
      id: sessionId
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc"
        }
      },
      runs: {
        include: {
          steps: {
            orderBy: {
              createdAt: "asc"
            }
          },
          artifacts: true
        },
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });
}

export async function createSession(input: unknown) {
  const payload = createSessionSchema.parse(input);

  return prisma.session.create({
    data: {
      title: payload.title
    }
  });
}

export async function createMessageAndRun(sessionId: string, input: unknown) {
  const payload = postMessageSchema.parse(input);
  const preferences = payload.preferences ?? {
    qualityBias: 50,
    costCapEnabled: false,
    latencyCapEnabled: false
  };

  const selectedModels = resolveSelectedModels(payload.selectedModels);

  const userMessage = await prisma.message.create({
    data: {
      sessionId,
      role: MessageRole.user,
      content: payload.content
    }
  });

  const contextPack = await compileContextPack(sessionId, payload.content);
  const cpir = buildCPIR({
    userText: payload.content,
    contextPack,
    constraints: {
      ...payload.constraints,
      ...(preferences.costCapEnabled && preferences.maxCostUsd
        ? { maxCostUsd: preferences.maxCostUsd }
        : {}),
      ...(preferences.latencyCapEnabled && preferences.maxLatencyMs
        ? { maxLatencyMs: preferences.maxLatencyMs }
        : {})
    }
  });

  const run = await prisma.run.create({
    data: {
      sessionId,
      mode: payload.mode as RunMode,
      userMessageId: userMessage.id,
      selectedModelIds: selectedModels.map((model) => model.modelId),
      preferencesJson: asInputJson(preferences),
      cpirJson: asInputJson(cpir),
      contextPackJson: asInputJson(cpir.contextPack),
      status: RunStatus.PENDING
    }
  });

  return {
    userMessage,
    run
  };
}
