import { NextResponse } from "next/server";
import { runOgBackfill } from "../../../../features/ingestion/server/backfill-og";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runOgBackfill();
  return NextResponse.json(result);
}
