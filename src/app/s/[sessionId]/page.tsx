import { notFound } from "next/navigation";
import { SessionWorkbench } from "@/components/session-workbench";
import { modelCatalog } from "@/lib/models/catalog";
import { getSessionById } from "@/lib/services/session-service";

type Params = {
  params: Promise<{ sessionId: string }>;
};

export default async function SessionPage({ params }: Params) {
  const { sessionId } = await params;
  const session = await getSessionById(sessionId);

  if (!session) {
    notFound();
  }

  const modelOptions = modelCatalog.map((entry) => ({
    provider: entry.provider,
    modelId: entry.modelId
  }));

  return (
    <div className="space-y-4">
      <div className="card">
        <h1 className="text-xl font-semibold">{session.title}</h1>
        <p className="mt-1 text-sm text-ink/70">
          Session {session.id} · {session.messages.length} messages · {session.runs.length} runs
        </p>
      </div>

      <SessionWorkbench
        sessionId={session.id}
        messages={session.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          createdAt: message.createdAt.toISOString()
        }))}
        runs={session.runs.map((run) => ({
          id: run.id,
          mode: run.mode,
          status: run.status,
          totalCostUsd: run.totalCostUsd,
          totalLatencyMs: run.totalLatencyMs,
          totalInputTokens: run.totalInputTokens,
          totalOutputTokens: run.totalOutputTokens,
          createdAt: run.createdAt.toISOString()
        }))}
        modelOptions={modelOptions}
      />
    </div>
  );
}
