import { secureHeaders, escapeHtml } from "@/lib/media";
export function GET(req: Request) {
  const term = (
    new URL(req.url).searchParams.get("term") || "Your next adventure"
  ).slice(0, 2000);
  return new Response(
    `<!doctype html><html><head><title>Shared search · penetrate.me</title></head><body><a href="/search">Explore</a><h1>${escapeHtml(term)}</h1></body></html>`,
    {
      headers: { ...secureHeaders, "Content-Type": "text/html; charset=utf-8" },
    },
  );
}
