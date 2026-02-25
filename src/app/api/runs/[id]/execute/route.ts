import { NextResponse } from "next/server";
import { executeRunById } from "@/lib/services/run-service";
import { toErrorResponse } from "@/lib/utils/http";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const run = await executeRunById(id);
    return NextResponse.json({ run });
  } catch (error) {
    const mapped = toErrorResponse(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
