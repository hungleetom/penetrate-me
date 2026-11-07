import { handleApi } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
async function handler(req: Request, ctx: Context) {
  return handleApi(req, (await ctx.params).path);
}
export {
  handler as GET,
  handler as POST,
  handler as PATCH,
  handler as DELETE,
  handler as PUT,
};
