import { MemoryItemType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createMemorySchema, patchMemorySchema } from "@/lib/schemas";
import { asInputJson } from "@/lib/utils/prisma-json";

export async function listMemoryBySession(sessionId: string) {
  return prisma.memoryItem.findMany({
    where: {
      sessionId
    },
    include: {
      sourceRun: {
        select: {
          id: true,
          createdAt: true
        }
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });
}

export async function createMemory(sessionId: string, input: unknown) {
  const payload = createMemorySchema.parse(input);

  return prisma.memoryItem.create({
    data: {
      sessionId,
      type: payload.type as MemoryItemType,
      key: payload.key,
      value: asInputJson(payload.value),
      confidence: payload.confidence ?? 0.5,
      enabled: payload.enabled ?? true
    }
  });
}

export async function patchMemory(memoryId: string, input: unknown) {
  const payload = patchMemorySchema.parse(input);

  return prisma.memoryItem.update({
    where: {
      id: memoryId
    },
    data: {
      ...(payload.enabled !== undefined ? { enabled: payload.enabled } : {}),
      ...(payload.confidence !== undefined ? { confidence: payload.confidence } : {}),
      ...(payload.value !== undefined ? { value: asInputJson(payload.value) } : {})
    }
  });
}

export async function deleteMemory(memoryId: string) {
  return prisma.memoryItem.delete({
    where: {
      id: memoryId
    }
  });
}
