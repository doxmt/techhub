import { NextResponse } from "next/server";
import { runIngestion } from "../../../../features/ingestion/server/service";

type IngestSection = "article" | "news" | "contest";

export async function handleIngestCron(req: Request, section?: IngestSection) {
  const cronSecret = process.env.CRON_SECRET;

  // CRON_SECRET 미설정 또는 빈 문자열이면 401
  if (!cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runIngestion(section ? { section } : undefined);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
