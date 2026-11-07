import { secureHeaders } from "@/lib/media";
export function GET(req: Request) {
  const source = new URL(req.url),
    next = source.searchParams.get("next") || "/";
  try {
    const dest = new URL(next, source);
    if (
      dest.origin !== source.origin ||
      !next.startsWith("/") ||
      next.startsWith("//")
    )
      return new Response("Local destination required", {
        status: 400,
        headers: secureHeaders,
      });
    return new Response(null, {
      status: 302,
      headers: { Location: dest.href, ...secureHeaders },
    });
  } catch {
    return new Response("Invalid destination", {
      status: 400,
      headers: secureHeaders,
    });
  }
}
