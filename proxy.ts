import { NextRequest, NextResponse } from "next/server";
export function proxy(req: NextRequest) {
  const authority = (req.headers.get("host") || "").toLowerCase();
  const host = authority.split(":")[0];
  // Explicit opt-in for the bridge-only socat forwarder used by Shannon.
  const dockerBridge =
    process.env.SHANNON_DOCKER_ACCESS === "1" &&
    authority === "172.17.0.1:3001";
  if (!["localhost", "127.0.0.1"].includes(host) && !dockerBridge)
    return new NextResponse("Local development host only", { status: 403 });
  const res = NextResponse.next();
  res.headers.set("Cache-Control", "no-store");
  const path = req.nextUrl.pathname;
  const appPages = [
    "/",
    "/search",
    "/explore",
    "/settings",
    "/notifications",
    "/messages",
    "/photos",
    "/login",
    "/register",
    "/reset",
  ];
  if (
    appPages.includes(path) ||
    /^\/(u|profile|messages|photos)\//.test(path)
  ) {
    res.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-src 'none'; form-action 'self'; base-uri 'self'",
    );
  }
  if (req.nextUrl.pathname === "/discover")
    res.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-src 'none'; form-action 'self'; base-uri 'self'",
    );
  if (req.nextUrl.pathname === "/discover-safe") {
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Referrer-Policy", "no-referrer");
    res.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'",
    );
  }
  return res;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
