import { NextResponse } from "next/server";
import { createMemory, listMemoryBySession } from "@/lib/services/memory-service";
import { toErrorResponse } from "@/lib/utils/http";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const memory = await listMemoryBySession(id);
    return NextResponse.json({ memory });
  } catch (error) {
    const mapped = toErrorResponse(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const item = await createMemory(id, body);
    return NextResponse.json({ memoryItem: item }, { status: 201 });
  } catch (error) {
    const mapped = toErrorResponse(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
