export const dynamic = "force-dynamic";
export function GET() {
  return new Response(
    `# HELP penetrate_users_total Fictional seeded user count\n# TYPE penetrate_users_total gauge\npenetrate_users_total 16\n# HELP security_audits_completed Completed fictional security audits\n# TYPE security_audits_completed counter\nsecurity_audits_completed 0\n# TYPE bugs_introduced_this_week gauge\nbugs_introduced_this_week 47\n# TYPE developer_confidence gauge\ndeveloper_confidence 100\n`,
    {
      headers: {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}
