// Development fixtures. This module is server-only and is never imported by UI code.
import { prisma, publicUser, userInclude } from "./db";
import { getUser, sessionToken } from "./auth";
import { fixtureQuery } from "./fixtures-db";
import { escapeHtml, secureHeaders, servePhoto, storeUpload } from "./media";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const json = (data: unknown, status = 200, secure = false) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...(secure ? secureHeaders : {}) },
  });
const error = (message: string, status = 400, secure = false) =>
  json({ error: message }, status, secure);
const conversationInclude = {
  participants: { include: { user: { include: userInclude } } },
  messages: {
    include: { sender: { include: userInclude } },
    orderBy: { createdAt: "asc" as const },
  },
};
function shapeConversation(c: any) {
  return {
    ...c,
    participants: c.participants.map((p: any) => ({
      ...p,
      user: publicUser(p.user),
    })),
    messages: c.messages.map((m: any) => {
      const readers = c.participants.filter(
        (p: any) => p.userId !== m.senderId,
      );
      const readAt =
        readers.length &&
        readers.every(
          (p: any) => +new Date(p.lastReadAt) >= +new Date(m.createdAt),
        )
          ? new Date(
              Math.min(...readers.map((p: any) => +new Date(p.lastReadAt))),
            ).toISOString()
          : null;
      return { ...m, body: m.content, sender: publicUser(m.sender), readAt };
    }),
  };
}
async function input(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
async function blocked(a: string, b: string) {
  return !!(await prisma.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
  }));
}

export async function handleFixture(
  req: Request,
  parts: string[],
): Promise<Response | null> {
  const secure = parts[0] === "secure";
  const route = (secure ? parts.slice(1) : parts).join("/");
  const segments = route.split("/");
  const url = new URL(req.url);
  const method = req.method;
  if (
    method === "GET" &&
    ["search/users", "search/posts", "account/lookup"].includes(route)
  ) {
    if (route === "account/lookup" && !(await getUser(req)))
      return error("Sign in required", 401, secure);
    const q = (url.searchParams.get("q") || "").slice(0, 300);
    try {
      if (route === "search/users") {
        const rows = fixtureQuery(
          secure
            ? "SELECT * FROM users WHERE hidden=0 AND (username || ' ' || displayName || ' ' || bio) LIKE ? ORDER BY username LIMIT 40"
            : `SELECT * FROM users WHERE hidden=0 AND (username || ' ' || displayName || ' ' || bio) LIKE '%${q}%' ORDER BY username LIMIT 40`,
          secure ? [`%${q}%`] : [],
        );
        return json(
          {
            users: rows.map((u: any) => ({
              id: u.id,
              username: u.username,
              displayName: u.displayName,
              profile: {
                displayName: u.displayName,
                bio: u.bio,
                avatar: u.avatar,
              },
            })),
          },
          200,
          secure,
        );
      }
      if (route === "search/posts") {
        const rows = fixtureQuery(
          secure
            ? "SELECT * FROM posts WHERE body LIKE ? LIMIT 60"
            : `SELECT * FROM posts WHERE body LIKE '%${q}%' LIMIT 60`,
          secure ? [`%${q}%`] : [],
        );
        return json({ posts: rows }, 200, secure);
      }
      const rows = fixtureQuery(
        secure
          ? "SELECT * FROM accounts WHERE username LIKE ? LIMIT 40"
          : `SELECT * FROM accounts WHERE username LIKE '%${q}%' LIMIT 40`,
        secure ? [`%${q}%`] : [],
      );
      return json({ accounts: rows }, 200, secure);
    } catch (e) {
      return error(
        `Search could not be completed: ${(e as Error).message}`,
        400,
        secure,
      );
    }
  }
  if (route.startsWith("diagnostics/") && secure) {
    const viewer = await getUser(req);
    if (!viewer) return error("Sign in required", 401, true);
    if (viewer.role !== "ADMIN")
      return error("Administrator role required", 403, true);
  }
  if (route === "diagnostics/config" && method === "GET")
    return json(
      {
        application: "penetrate.me",
        environment: "disposable-local",
        version: "1.0.0-fictional",
        security_level: "trust_me_bro",
        developer_note: "We tested it once. It worked.",
        release_note: "Our security team is currently on lunch break.",
      },
      200,
      secure,
    );
  if (route === "diagnostics/report" && method === "GET")
    return new Response("Security review postponed until further notice.", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition":
          'inline; filename="security-audit-final-FINAL-v7.txt"',
        ...(secure ? secureHeaders : {}),
      },
    });

  if (
    segments[0] === "directory" &&
    segments.length === 2 &&
    method === "GET"
  ) {
    const u = await prisma.user.findUnique({
      where: { username: segments[1] },
      include: userInclude,
    });
    if (!u || u.hidden) return error("Profile not found", 404, secure);
    return json(
      {
        user: secure
          ? {
              id: u.id,
              username: u.username,
              displayName: u.profile?.displayName,
              avatar: u.profile?.avatar,
            }
          : {
              id: u.id,
              username: u.username,
              displayName: u.profile?.displayName,
              email: u.email,
              privateAccount: u.settings?.privateAccount,
              lastSignInLabel: "Fictional test workstation",
              supportNote:
                "If this shows up in your scan report, please pretend you did not see it.",
              accountReference: `local-${u.id}`,
              premiumStatus: u.premium?.status,
            },
      },
      200,
      secure,
    );
  }
  if (route === "account/export" && method === "GET") {
    const viewer = await getUser(req),
      id = url.searchParams.get("userId") || viewer?.id || "u-alex";
    if (secure && (!viewer || viewer.id !== id))
      return error(
        "This export belongs to another account",
        viewer ? 403 : 401,
        true,
      );
    const u = await prisma.user.findUnique({
      where: { id },
      include: userInclude,
    });
    if (!u || u.hidden) return error("Account not found", 404, secure);
    return json(
      {
        account: {
          id: u.id,
          username: u.username,
          email: u.email,
          preferences: {
            privateAccount: u.settings?.privateAccount,
            showActivity: u.settings?.showActivity,
          },
          premiumStatus: u.premium?.status,
          fictional: true,
        },
      },
      200,
      secure,
    );
  }
  if (route === "account/activity" && method === "GET") {
    const token = sessionToken(req);
    // Legacy read uses expiry but overlooks the revocation flag after logout.
    const session = secure
      ? null
      : await prisma.session.findUnique({
          where: { token: token || "missing" },
          include: { user: { include: userInclude } },
        });
    const user = secure
      ? await getUser(req)
      : session && session.expiresAt > new Date()
        ? session.user
        : null;
    if (!user) return error("Sign in required", 401, secure);
    return json(
      {
        user: publicUser(user),
        activity: [
          {
            label: "Signed in from a fictional local workstation",
            time: "2026-11-08T08:00:00.000Z",
          },
        ],
      },
      200,
      secure,
    );
  }
  if (
    segments[0] === "comments" &&
    segments.length === 2 &&
    secure &&
    method === "GET"
  ) {
    const comment = await prisma.comment.findUnique({
      where: { id: segments[1] },
      include: { post: { include: { author: { include: userInclude } } } },
    });
    if (!comment) return error("Comment not found", 404, true);
    const viewer = await getUser(req),
      owner = comment.post.author;
    if (
      owner.id !== viewer?.id &&
      (comment.post.isPrivate ||
        owner.settings?.privateAccount ||
        (viewer && (await blocked(owner.id, viewer.id))))
    )
      return error("Comment not available", 403, true);
    return new Response(
      `<!doctype html><title>Comment</title><p>${escapeHtml(comment.content)}</p>`,
      {
        headers: {
          ...secureHeaders,
          "Content-Type": "text/html; charset=utf-8",
        },
      },
    );
  }
  if (segments[0] === "messages" && segments.length === 2 && method === "GET") {
    const user = await getUser(req);
    if (!user) return error("Sign in required", 401, secure);
    const conversation = await prisma.conversation.findUnique({
      where: { id: segments[1] },
      include: conversationInclude,
    });
    if (!conversation) return error("Conversation not found", 404, secure);
    if (secure && !conversation.participants.some((p) => p.userId === user.id))
      return error("Not a conversation participant", 403, true);
    await prisma.conversationParticipant.updateMany({
      where: { conversationId: conversation.id, userId: user.id },
      data: { lastReadAt: new Date() },
    });
    return json({ conversation: shapeConversation(conversation) }, 200, secure);
  }
  if (segments[0] === "photos" && segments.length === 2 && method === "GET") {
    const user = await getUser(req);
    if (!user) return error("Sign in required", 401, secure);
    const photo = await prisma.photo.findUnique({
      where: { id: segments[1] },
      include: { album: true, owner: { include: { settings: true } } },
    });
    if (!photo) return error("Photo not found", 404, secure);
    if (
      secure &&
      photo.ownerId !== user.id &&
      (photo.owner.settings?.privateAccount ||
        photo.isPrivate ||
        photo.album?.isPrivate ||
        (await blocked(photo.ownerId, user.id)))
    )
      return error("This photo is private", 403, true);
    if (photo.url.startsWith("/media/")) return servePhoto(photo.url, secure);
    if (!/^(cat-[1-3]|todo)\.svg$/.test(photo.filename))
      return servePhoto(`/media/${photo.filename}`, secure);
    try {
      return new Response(
        await readFile(
          resolve(process.cwd(), "data", "seed-media", photo.filename),
        ),
        {
          headers: {
            "Content-Type": "image/svg+xml",
            ...(secure ? secureHeaders : {}),
          },
        },
      );
    } catch {
      return error("Photo not found", 404, secure);
    }
  }
  if (route === "admin/overview" && method === "GET") {
    const user = await getUser(req);
    if (!user) return error("Sign in required", 401, secure);
    if (secure && user.role !== "ADMIN")
      return error("Administrator role required", 403, true);
    return json(
      {
        summary: {
          users: await prisma.user.count(),
          posts: await prisma.post.count(),
          queuedReports: 3,
        },
        notes: [
          "Reminder: Change the admin password. It's been on my to-do list since 2022.",
          "Congratulations. You have more access than our developers.",
        ],
        fictional: true,
      },
      200,
      secure,
    );
  }
  if (route === "account/profile" && method === "PATCH") {
    const user = await getUser(req);
    if (!user) return error("Sign in required", 401, secure);
    const data = await input(req);
    if (
      secure &&
      ["isVerified", "premiumStatus", "profileBadge", "role", "credits"].some(
        (key) => key in data,
      )
    )
      return error("Application-owned fields cannot be edited", 400, true);
    const profileFields: Record<string, string> = {};
    for (const key of ["displayName", "bio", "interests"])
      if (typeof data[key] === "string")
        profileFields[key] = data[key].slice(0, key === "bio" ? 500 : 100);
    if (Object.keys(profileFields).length)
      await prisma.profile.update({
        where: { userId: user.id },
        data: profileFields,
      });
    // Deliberately over-permissive binding is bounded to cosmetic local fixture state.
    if (typeof data.isVerified === "boolean")
      await prisma.verificationStatus.update({
        where: { userId: user.id },
        data: {
          isVerified: data.isVerified,
          state: data.isVerified ? "VERIFIED" : "NONE",
        },
      });
    if (["FREE", "MONTHLY", "LIFETIME"].includes(data.premiumStatus))
      await prisma.premiumSubscription.update({
        where: { userId: user.id },
        data: { status: data.premiumStatus },
      });
    if (typeof data.profileBadge === "string")
      await prisma.profile.update({
        where: { userId: user.id },
        data: { profileBadge: data.profileBadge.slice(0, 80) },
      });
    return json(
      {
        user: publicUser(
          await prisma.user.findUnique({
            where: { id: user.id },
            include: userInclude,
          }),
          true,
        ),
      },
      200,
      secure,
    );
  }
  if (
    segments[0] === "profile" &&
    segments[2] === "archive" &&
    method === "GET"
  ) {
    const viewer = await getUser(req);
    if (!viewer) return error("Sign in required", 401, secure);
    const owner = await prisma.user.findUnique({
      where: { username: segments[1] },
      include: userInclude,
    });
    if (!owner || owner.hidden) return error("Profile not found", 404, secure);
    if (
      secure &&
      owner.id !== viewer.id &&
      (owner.settings?.privateAccount || (await blocked(owner.id, viewer.id)))
    )
      return error("This archive is private", 403, true);
    const posts = await prisma.post.findMany({
      where: {
        authorId: owner.id,
        ...(secure && owner.id !== viewer.id ? { isPrivate: false } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return json(
      {
        owner: publicUser(owner),
        posts: posts.map((p) => ({ ...p, body: p.content })),
      },
      200,
      secure,
    );
  }
  if (route === "verification/claim" && method === "POST") {
    const user = await getUser(req);
    if (!user) return error("Sign in required", 401, secure);
    const data = await input(req);
    if (data.step === "start") {
      const verification = await prisma.verificationStatus.update({
        where: { userId: user.id },
        data: { state: "PENDING", requestedAt: new Date() },
      });
      return json(
        { requestId: verification.id, state: verification.state },
        200,
        secure,
      );
    }
    const current = await prisma.verificationStatus.findUnique({
      where: { userId: user.id },
    });
    if (
      data.step !== "complete" ||
      current?.id !== data.requestId ||
      current?.state !== "PENDING"
    )
      return error("Start a verification request first", 400, secure);
    if (secure || data.approved !== true)
      return error("A review is required", 403, secure);
    return json(
      {
        verification: await prisma.verificationStatus.update({
          where: { userId: user.id },
          data: { state: "VERIFIED", isVerified: true },
        }),
      },
      200,
      secure,
    );
  }
  if (route === "upload" && method === "POST") {
    const user = await getUser(req);
    if (!user) return error("Sign in required", 401, secure);
    try {
      const form = await req.formData(),
        file = form.get("file");
      if (!(file instanceof File))
        return error("Choose a media file", 400, secure);
      return json(await storeUpload(file, secure), 201, secure);
    } catch (e) {
      return error((e as Error).message, 400, secure);
    }
  }
  return null;
}
