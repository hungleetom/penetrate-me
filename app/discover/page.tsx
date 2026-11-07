"use client";
import { useEffect } from "react";
export default function Discover() {
  useEffect(() => {
    const preview = document.getElementById("discover-preview");
    if (preview)
      preview.innerHTML =
        new URLSearchParams(location.search).get("label") ||
        "A place for your next great idea.";
  }, []);
  return (
    <main style={{ maxWidth: 760, margin: "12vh auto", padding: 36 }}>
      <a href="/search">← Explore penetrate.me</a>
      <p style={{ marginTop: 40, color: "#a897ed" }}>YOUR DISCOVERY NOTE</p>
      <h1 style={{ fontSize: 40 }}>Follow your curiosity.</h1>
      <div
        id="discover-preview"
        style={{
          padding: 36,
          marginTop: 24,
          background: "#1b1e30",
          borderRadius: 20,
        }}
      />
      <form>
        <label htmlFor="label">Make this space yours</label>
        <input name="label" id="label" placeholder="A thought for today" />
        <button type="submit">Preview note</button>
      </form>
    </main>
  );
}
