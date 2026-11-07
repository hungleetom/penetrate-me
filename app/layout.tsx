import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "penetrate.me — A little less filtered",
  description:
    "The internet's least secure social network. Find your people, share your everyday.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
