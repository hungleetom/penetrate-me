export default async function DiscoverSafe({
  searchParams,
}: {
  searchParams: Promise<{ label?: string }>;
}) {
  const params = await searchParams;
  const label =
    typeof params.label === "string"
      ? params.label.slice(0, 2000)
      : "A place for your next great idea.";
  return (
    <main style={{ maxWidth: 760, margin: "12vh auto", padding: 36 }}>
      <a href="/search">Explore</a>
      <h1>Follow your curiosity.</h1>
      <div id="discover-preview">{label}</div>
    </main>
  );
}
