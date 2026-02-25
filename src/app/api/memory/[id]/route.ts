import { NextResponse } from "next/server";
import { deleteMemory, patchMemory } from "@/lib/services/memory-service";
import { toErrorResponse } from "@/lib/utils/http";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const memoryItem = await patchMemory(id, body);
    return NextResponse.json({ memoryItem });
  } catch (error) {
    const mapped = toErrorResponse(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    await deleteMemory(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const mapped = toErrorResponse(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
