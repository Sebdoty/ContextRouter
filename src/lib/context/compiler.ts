import { MemoryItemType, MessageRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { contextPackSchema, type ContextPack } from "@/lib/schemas";

const RECENT_TURN_LIMIT = 8;
const RECENT_TURN_MAX_CHARS = 320;
const MEMORY_TOP_K = 6;

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars - 3)}...`;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function summarizeTurns(turns: { role: MessageRole; content: string }[]): string {
  if (turns.length === 0) {
    return "No prior context yet.";
  }

  const latestUser = turns.find((turn) => turn.role === "user");
  const latestAssistant = turns.find((turn) => turn.role === "assistant");

  const userSnippet = latestUser ? truncate(latestUser.content, 160) : "No user message yet.";
  const assistantSnippet = latestAssistant
    ? truncate(latestAssistant.content, 160)
    : "No assistant response yet.";

  return `Recent focus: user asked \"${userSnippet}\". Assistant context: \"${assistantSnippet}\".`;
}

function scoreMemoryRelevance(userText: string, key: string, value: unknown): number {
  const queryTokens = new Set(tokenize(userText));
  const material = `${key} ${JSON.stringify(value)}`;
  const memoryTokens = tokenize(material);

  let score = 0;
  for (const token of memoryTokens) {
    if (queryTokens.has(token)) {
      score += 1;
    }
  }

  return score;
}

export async function compileContextPack(sessionId: string, userText: string): Promise<ContextPack> {
  const [messages, memoryItems] = await Promise.all([
    prisma.message.findMany({
      where: {
        sessionId
      },
      orderBy: {
        createdAt: "desc"
      },
      take: RECENT_TURN_LIMIT
    }),
    prisma.memoryItem.findMany({
      where: {
        sessionId,
        enabled: true
      },
      orderBy: {
        updatedAt: "desc"
      }
    })
  ]);

  const orderedTurns = [...messages].reverse();
  const scoredMemory = memoryItems
    .map((item) => ({
      item,
      score: scoreMemoryRelevance(userText, item.key, item.value)
    }))
    .sort((a, b) => b.score - a.score || Number(b.item.confidence - a.item.confidence))
    .slice(0, MEMORY_TOP_K)
    .map(({ item }) => item);

  const facts: string[] = [];
  const decisions: string[] = [];
  const constraints: string[] = [];
  const openQuestions: string[] = [];

  for (const memory of scoredMemory) {
    const content = truncate(`${memory.key}: ${JSON.stringify(memory.value)}`, 200);

    if (memory.type === MemoryItemType.FACT) {
      facts.push(content);
      continue;
    }

    if (memory.type === MemoryItemType.DECISION) {
      decisions.push(content);
      continue;
    }

    if (memory.type === MemoryItemType.PREFERENCE) {
      constraints.push(content);
      continue;
    }

    if (memory.type === MemoryItemType.ARTIFACT_REF) {
      openQuestions.push(content);
    }
  }

  const contextPack: ContextPack = {
    summary: summarizeTurns(orderedTurns),
    facts,
    decisions,
    openQuestions,
    constraints,
    recentTurns: orderedTurns.map((turn) => ({
      role: turn.role,
      content: truncate(turn.content, RECENT_TURN_MAX_CHARS)
    })),
    memoryRefs: scoredMemory.map((item) => ({
      memoryItemId: item.id,
      key: item.key
    }))
  };

  return contextPackSchema.parse(contextPack);
}
