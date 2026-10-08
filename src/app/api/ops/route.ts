import { NextResponse } from "next/server";
import { getSystemHealth } from "@/lib/ops/health";

export async function GET() {
  try {
    const health = await getSystemHealth();
    return NextResponse.json(health);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
