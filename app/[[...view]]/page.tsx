import SocialApp from "@/components/social-app";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export default async function Page({
  params,
}: {
  params: Promise<{ view?: string[] }>;
}) {
  const { view = [] } = await params;
  const allowed =
    view.length === 0 ||
    (view.length === 1 &&
      [
        "login",
        "register",
        "reset",
        "explore",
        "search",
        "messages",
        "photos",
        "notifications",
        "settings",
      ].includes(view[0])) ||
    (view.length === 2 &&
      ["u", "profile", "messages", "photos"].includes(view[0]));
  if (!allowed) notFound();
  return (
    <Suspense
      fallback={
        <div className="loading">
          <div className="spinner" />
          Getting the good stuff…
        </div>
      }
    >
      <SocialApp />
    </Suspense>
  );
}
