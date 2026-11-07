import { fixtureHtmlHeaders } from "@/lib/media";
export function GET(req: Request) {
  const term = (
    new URL(req.url).searchParams.get("term") || "Your next adventure"
  ).slice(0, 2000);
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>Shared search · penetrate.me</title><style>body{background:#10131e;color:#ececf7;font:18px system-ui;padding:10vh 12vw}a{color:#ac99fc}main{margin-top:55px;padding:36px;border:1px solid #333449;border-radius:24px}h1{font-size:36px}</style></head><body><a href="/search">← Back to explore</a><main><small>penetrate.me / SHARED SEARCH</small><h1>${term}</h1><p>A little curiosity goes a long way.</p></main></body></html>`,
    { headers: fixtureHtmlHeaders },
  );
}
