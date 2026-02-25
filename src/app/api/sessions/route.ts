import { NextResponse } from "next/server";
import { createSession, listSessions } from "@/lib/services/session-service";
import { toErrorResponse } from "@/lib/utils/http";

export async function GET() {
  try {
    const sessions = await listSessions();
    return NextResponse.json({ sessions });
  } catch (error) {
    const mapped = toErrorResponse(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = await createSession(body);
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    const mapped = toErrorResponse(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
