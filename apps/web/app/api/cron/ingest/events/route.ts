import { handleIngestCron } from "../_handler";

export const maxDuration = 60;

export async function GET(req: Request) {
  return handleIngestCron(req, "event");
}
