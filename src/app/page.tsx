import Link from "next/link";
import { SessionCreateForm } from "@/components/session-create-form";
import { listSessions } from "@/lib/services/session-service";
import { formatDate } from "@/lib/utils/format";

export default async function HomePage() {
  const sessions = await listSessions();

  return (
    <div className="space-y-6">
      <SessionCreateForm />
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sessions</h2>
          <p className="text-xs text-ink/65">{sessions.length} total</p>
        </div>

        <div className="space-y-3">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/s/${session.id}`}
              className="block rounded-lg border border-ink/15 bg-white px-4 py-3 transition hover:border-accent/60 hover:bg-white"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium text-ink">{session.title}</h3>
                <div className="flex items-center gap-2">
                  <span className="badge">Runs {session._count.runs}</span>
                  <span className="badge">Msgs {session._count.messages}</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-ink/60">Updated {formatDate(session.updatedAt)}</p>
              {session.runs[0] ? (
                <p className="mt-1 text-xs text-ink/70">
                  Last run: {session.runs[0].mode} · {session.runs[0].status}
                </p>
              ) : (
                <p className="mt-1 text-xs text-ink/70">No runs yet</p>
              )}
            </Link>
          ))}

          {sessions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-ink/20 px-3 py-6 text-center text-sm text-ink/65">
              No sessions yet. Create one above.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
