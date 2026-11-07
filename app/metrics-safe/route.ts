import { getUser } from "@/lib/auth";
import { secureHeaders } from "@/lib/media";
import { GET as metrics } from "../metrics/route";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const u = await getUser(req);
  if (!u || u.role !== "ADMIN")
    return new Response("Administrator role required", {
      status: u ? 403 : 401,
      headers: secureHeaders,
    });
  const res = metrics();
  for (const [key, value] of Object.entries(secureHeaders))
    res.headers.set(key, value);
  return res;
}
