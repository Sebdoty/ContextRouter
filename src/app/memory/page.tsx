import { MemoryDashboard } from "@/components/memory-dashboard";
import { listMemoryBySession } from "@/lib/services/memory-service";
import { listSessions } from "@/lib/services/session-service";

type SearchParams = {
  searchParams: Promise<{ sessionId?: string }>;
};

export default async function MemoryPage({ searchParams }: SearchParams) {
  const [{ sessionId }, sessions] = await Promise.all([searchParams, listSessions()]);

  const selectedSessionId = sessionId ?? sessions[0]?.id ?? null;
  const items = selectedSessionId ? await listMemoryBySession(selectedSessionId) : [];

  return (
    <MemoryDashboard
      sessions={sessions.map((session) => ({
        id: session.id,
        title: session.title
      }))}
      selectedSessionId={selectedSessionId}
      items={items.map((item) => ({
        id: item.id,
        type: item.type,
        key: item.key,
        value: item.value as Record<string, unknown>,
        confidence: item.confidence,
        enabled: item.enabled,
        sourceRunId: item.sourceRunId,
        updatedAt: item.updatedAt.toISOString()
      }))}
    />
  );
}
