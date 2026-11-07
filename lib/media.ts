import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

export const secureHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy":
    "default-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'",
};
export const fixtureHtmlHeaders = {
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-src 'none'; form-action 'self'; base-uri 'self'",
};
const mime: Record<string, string> = {
  html: "text/html",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  txt: "text/plain",
};
export async function storeUpload(file: File, secure: boolean) {
  if (
    !file ||
    typeof file.arrayBuffer !== "function" ||
    file.size > 2 * 1024 * 1024 ||
    file.size === 0
  )
    throw new Error("Choose a file between 1 byte and 2 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  let ext = "txt";
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    ext = "png";
  else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    ext = "jpg";
  else if (
    bytes
      .subarray(0, 6)
      .toString()
      .match(/^GIF8[79]a$/)
  )
    ext = "gif";
  else if (
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP"
  )
    ext = "webp";
  else if (!secure) {
    if (file.type === "text/html" || /\.html?$/i.test(file.name)) ext = "html";
    else if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name))
      ext = "svg";
  }
  if (secure && !["png", "jpg", "gif", "webp"].includes(ext))
    throw new Error("Only raster PNG, JPEG, GIF, or WebP images are accepted.");
  const filename = `${randomUUID()}.${ext}`;
  const directory = resolve(process.cwd(), "data", "uploads");
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, filename), bytes, { flag: "wx" });
  return {
    url: `/media/uploads/${filename}`,
    filename,
    mimeType: mime[ext],
    size: bytes.length,
  };
}
export async function serveUpload(filename: string) {
  if (!/^[0-9a-f-]{36}\.(?:html|svg|png|jpg|gif|webp|txt)$/.test(filename))
    return new Response("Not found", { status: 404 });
  try {
    const ext = filename.split(".").pop()!;
    const bytes = await readFile(
      resolve(process.cwd(), "data", "uploads", filename),
    );
    return new Response(bytes, {
      headers: {
        "Content-Type": mime[ext],
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
        "Content-Security-Policy":
          "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
export async function servePhoto(url: string, secure = false) {
  if (!/^\/media\/(?:avatar-\d+|scene-\d+|cat-[1-3]|todo)\.svg$/.test(url)) {
    if (url.startsWith("/media/uploads/"))
      return serveUpload(url.slice("/media/uploads/".length));
    return new Response("Not found", { status: 404 });
  }
  try {
    const bytes = await readFile(
      resolve(process.cwd(), "public", url.slice(1)),
    );
    return new Response(bytes, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-store",
        ...(secure ? secureHeaders : {}),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
export function escapeHtml(text: string) {
  return text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
