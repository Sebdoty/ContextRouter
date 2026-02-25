import { NextResponse } from "next/server";
import { createMessageAndRun } from "@/lib/services/session-service";
import { toErrorResponse } from "@/lib/utils/http";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const payload = await createMessageAndRun(id, body);
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    const mapped = toErrorResponse(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
