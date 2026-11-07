export function GET(req: Request) {
  const next = new URL(req.url).searchParams.get("next") || "/";
  try {
    const destination = new URL(next, req.url);
    if (!["http:", "https:"].includes(destination.protocol))
      return new Response("Invalid destination", { status: 400 });
    return new Response(null, {
      status: 302,
      headers: { Location: destination.href },
    });
  } catch {
    return new Response("Invalid destination", { status: 400 });
  }
}
