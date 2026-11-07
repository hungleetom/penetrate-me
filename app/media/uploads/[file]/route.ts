import { serveUpload } from "@/lib/media";
export const runtime = "nodejs";
export async function GET(
  _: Request,
  context: { params: Promise<{ file: string }> },
) {
  return serveUpload((await context.params).file);
}
