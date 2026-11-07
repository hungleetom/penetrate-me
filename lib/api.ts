import { randomBytes } from "node:crypto";
import { prisma, publicUser, userInclude } from "./db";
import {
  checkPassword,
  createSession,
  getUser,
  hashPassword,
  sessionCookie,
  sessionToken,
} from "./auth";
import { handleFixture } from "./fixtures";
import { secureHeaders } from "./media";

const counts = { posts: true, followers: true, following: true };
const includeUser = { ...userInclude, _count: { select: counts } } as const;
const postInclude = {
  author: { include: includeUser },
  comments: {
    include: { author: { include: userInclude } },
    orderBy: { createdAt: "asc" as const },
  },
  likes: { select: { userId: true } },
  _count: { select: { likes: true, comments: true } },
};
const conversationInclude = {
  participants: { include: { user: { include: userInclude } } },
  messages: {
    include: { sender: { include: userInclude } },
    orderBy: { createdAt: "asc" as const },
  },
};

function json(
  value: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return Response.json(value, { status, headers });
}
function fail(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}
async function body(req: Request) {
  try {
    return await req.json();
  } catch {
    return fail("Invalid JSON body");
  }
}
function text(value: unknown, max = 5000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function requireUser(user: any) {
  if (!user) fail("Please sign in to continue", 401);
  return user;
}
function shapePost(post: any, userId?: string) {
  const { likes, ...data } = post;
  return {
    ...data,
    body: post.content,
    userId: post.authorId,
    author: publicUser(post.author),
    comments: (post.comments || []).map((c: any) => ({
      ...c,
      body: c.content,
      author: publicUser(c.author),
    })),
    liked: (likes || []).some((l: any) => l.userId === userId),
  };
}
function shapeMessage(message: any) {
  return {
    ...message,
    body: message.content,
    sender: publicUser(message.sender),
  };
}
function shapeConversation(conversation: any, viewerId?: string) {
  return {
    ...conversation,
    participants: conversation.participants.map((p: any) => ({
      ...p,
      user: publicUser(p.user),
    })),
    messages: conversation.messages.map((message: any) => {
      const readers =
        viewerId === message.senderId
          ? conversation.participants.filter(
              (p: any) => p.userId !== message.senderId,
            )
          : conversation.participants.filter((p: any) => p.userId === viewerId);
      const readAt =
        readers.length &&
        readers.every(
          (p: any) => +new Date(p.lastReadAt) >= +new Date(message.createdAt),
        )
          ? new Date(
              Math.min(...readers.map((p: any) => +new Date(p.lastReadAt))),
            ).toISOString()
          : null;
      return { ...shapeMessage(message), readAt };
    }),
  };
}
function shapeAlbum(album: any) {
  return { ...album, userId: album.ownerId, owner: publicUser(album.owner) };
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
async function allowedAuthor(author: any, viewer: any) {
  if (author.id === viewer?.id) return true;
  if (viewer && (await blocked(author.id, viewer.id))) return false;
  return !author.settings?.privateAccount;
}
async function visiblePost(post: any, viewer: any) {
  return (
    post &&
    (post.authorId === viewer?.id ||
      (!post.isPrivate && (await allowedAuthor(post.author, viewer))))
  );
}
async function notify(
  userId: string,
  type: string,
  content: string,
  href = "/",
) {
  await prisma.notification.create({ data: { userId, type, content, href } });
}
function validLocalImage(value: unknown) {
  const image = text(value, 240);
  if (!image) return null;
  if (!/^\/media\/[a-zA-Z0-9/_\-.]+$/.test(image) || image.includes(".."))
    fail("Use a photo uploaded to this app");
  return image;
}

export async function handleApi(req: Request, parts: string[]) {
  try {
    const fixture = await handleFixture(req, parts);
    if (fixture) return fixture;
    const path = parts.join("/");
    const method = req.method;
    const url = new URL(req.url);
    const user = await getUser(req);
    if (path === "health" && method === "GET") return json({ ok: true });
    if (path === "posts/search" && method === "GET") {
      const query = text(url.searchParams.get("q") || "", 200);
      const records = await prisma.post.findMany({
        where: { isPrivate: false, content: { contains: query } },
        include: postInclude,
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      const posts = [];
      for (const post of records)
        if (!post.author.hidden && (await visiblePost(post, user)))
          posts.push({
            id: post.id,
            body: post.content,
            username: post.author.username,
            image: post.image,
          });
      return json({ posts });
    }
    if (path === "me" && method === "GET")
      return json({ user: publicUser(user, true) });

    if (path === "auth/register" && method === "POST") {
      const data = await body(req);
      const username = text(data.username, 30);
      const email = text(data.email, 100).toLowerCase();
      const displayName = text(data.displayName, 80);
      if (!/^[a-zA-Z0-9_.]{3,30}$/.test(username))
        fail("Username must be 3–30 letters, numbers, dots or underscores");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        fail("Enter a valid fictional email address");
      if (!displayName) fail("Enter a display name");
      if (
        typeof data.password !== "string" ||
        data.password.length < 8 ||
        data.password.length > 128
      )
        fail("Password must be 8–128 characters");
      if (
        await prisma.user.findFirst({
          where: { OR: [{ username }, { email }] },
        })
      )
        fail("That username or email is already in use", 409);
      const created = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash: hashPassword(data.password),
          profile: {
            create: {
              displayName,
              avatar: "/media/avatar-16.svg",
              cover: "/media/scene-8.svg",
            },
          },
          settings: { create: {} },
          premium: { create: {} },
          verification: { create: {} },
        },
        include: includeUser,
      });
      const token = await createSession(created.id);
      return json({ user: publicUser(created, true) }, 201, {
        "Set-Cookie": sessionCookie(token),
      });
    }
    if (path === "auth/login" && method === "POST") {
      const data = await body(req);
      const username = text(data.username, 100);
      const found = await prisma.user.findFirst({
        where: {
          OR: [{ username }, { email: username.toLowerCase() }],
          hidden: false,
        },
        include: includeUser,
      });
      if (
        !found ||
        typeof data.password !== "string" ||
        !checkPassword(data.password, found.passwordHash)
      )
        fail("Incorrect username or password", 401);
      return json({ user: publicUser(found, true) }, 200, {
        "Set-Cookie": sessionCookie(await createSession(found.id)),
      });
    }
    if (path === "auth/logout" && method === "POST") {
      await prisma.session.updateMany({
        where: { token: sessionToken(req) },
        data: { revoked: true, revokedAt: new Date() },
      });
      return json({ ok: true }, 200, {
        "Set-Cookie": "pm_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
      });
    }
    if (path === "auth/reset" && method === "POST") {
      const data = await body(req);
      if (typeof data.token === "string" && data.password) {
        if (
          typeof data.password !== "string" ||
          data.password.length < 8 ||
          data.password.length > 128
        )
          fail("Password must be 8–128 characters");
        const setting = await prisma.accountSetting.findFirst({
          where: { resetToken: data.token, resetExpires: { gt: new Date() } },
        });
        if (!setting) fail("This reset link has expired or is invalid");
        await prisma.$transaction([
          prisma.user.update({
            where: { id: setting.userId },
            data: { passwordHash: hashPassword(data.password) },
          }),
          prisma.accountSetting.update({
            where: { id: setting.id },
            data: { resetToken: null, resetExpires: null },
          }),
          prisma.session.updateMany({
            where: { userId: setting.userId },
            data: { revoked: true, revokedAt: new Date() },
          }),
        ]);
        return json({ message: "Password updated. You can sign in now." });
      }
      const token = randomBytes(24).toString("hex");
      const found = await prisma.user.findUnique({
        where: { email: text(data.email, 100).toLowerCase() },
      });
      if (found)
        await prisma.accountSetting.update({
          where: { userId: found.id },
          data: {
            resetToken: token,
            resetExpires: new Date(Date.now() + 15 * 60000),
          },
        });
      return json({
        message:
          "If that account exists, a reset link is ready in your local simulated inbox.",
        resetToken: token,
      });
    }

    if (path === "posts" && method === "GET") {
      const username = url.searchParams.get("user");
      const feed = url.searchParams.get("feed");
      const author = username
        ? await prisma.user.findUnique({
            where: { username },
            include: userInclude,
          })
        : null;
      if (username && (!author || author.hidden)) return json({ posts: [] });
      let followingIds: string[] | undefined;
      if (feed === "following" && user)
        followingIds = (
          await prisma.follow.findMany({ where: { followerId: user.id } })
        )
          .map((f) => f.followingId)
          .concat(user.id);
      const records = await prisma.post.findMany({
        where: {
          author: { hidden: false },
          ...(author ? { authorId: author.id } : {}),
          ...(followingIds ? { authorId: { in: followingIds } } : {}),
        },
        include: postInclude,
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      const posts = [];
      for (const post of records)
        if (await visiblePost(post, user))
          posts.push(shapePost(post, user?.id));
      return json({ posts });
    }
    if (path === "posts" && method === "POST") {
      requireUser(user);
      const data = await body(req);
      const content = text(data.body);
      const image = validLocalImage(data.image);
      if (!content && !image) fail("Write something or add a photo");
      const post = await prisma.post.create({
        data: { authorId: user!.id, content, image },
        include: postInclude,
      });
      return json({ post: shapePost(post, user!.id) }, 201);
    }
    if (parts[0] === "posts" && parts[1]) {
      const post = await prisma.post.findUnique({
        where: { id: parts[1] },
        include: postInclude,
      });
      if (!post || !(await visiblePost(post, user)))
        fail("Post not found", 404);
      if (parts.length === 2 && (method === "PATCH" || method === "DELETE")) {
        requireUser(user);
        if (post.authorId !== user!.id)
          fail("This post belongs to someone else", 403);
        if (method === "DELETE") {
          await prisma.post.delete({ where: { id: post.id } });
          return json({ ok: true });
        }
        const data = await body(req);
        const content = text(data.body);
        const image =
          data.image === undefined ? post.image : validLocalImage(data.image);
        if (!content && !image) fail("Write something or add a photo");
        const changed = await prisma.post.update({
          where: { id: post.id },
          data: { content, image },
          include: postInclude,
        });
        return json({ post: shapePost(changed, user!.id) });
      }
      if (parts[2] === "like" && method === "POST") {
        requireUser(user);
        const key = { userId_postId: { userId: user!.id, postId: post.id } };
        const like = await prisma.like.findUnique({ where: key });
        if (like) await prisma.like.delete({ where: key });
        else {
          await prisma.like.create({
            data: { userId: user!.id, postId: post.id },
          });
          if (post.authorId !== user!.id)
            await notify(
              post.authorId,
              "LIKE",
              `${user!.profile?.displayName} liked your post`,
              `/u/${user!.username}`,
            );
        }
        return json({
          liked: !like,
          count: await prisma.like.count({ where: { postId: post.id } }),
        });
      }
      if (parts[2] === "comments" && method === "POST") {
        requireUser(user);
        const data = await body(req);
        const content = text(data.body, 2000);
        if (!content) fail("Write a comment");
        // Deliberate selected rich-text field: stored as submitted; normal views render this as rich text.
        const comment = await prisma.comment.create({
          data: { postId: post.id, authorId: user!.id, content },
          include: { author: { include: userInclude } },
        });
        if (post.authorId !== user!.id)
          await notify(
            post.authorId,
            "COMMENT",
            `${user!.profile?.displayName} commented on your post`,
            `/u/${post.author.username}`,
          );
        return json(
          {
            comment: {
              ...comment,
              body: comment.content,
              author: publicUser(comment.author),
            },
          },
          201,
        );
      }
    }

    if (path === "users" && method === "GET") {
      const query = text(url.searchParams.get("query") || "", 100);
      const users = await prisma.user.findMany({
        where: {
          hidden: false,
          OR: [
            { username: { contains: query } },
            { profile: { displayName: { contains: query } } },
            { profile: { interests: { contains: query } } },
          ],
        },
        include: includeUser,
        take: 30,
      });
      const following = user
        ? new Set(
            (
              await prisma.follow.findMany({
                where: { followerId: user.id },
                select: { followingId: true },
              })
            ).map((f) => f.followingId),
          )
        : new Set<string>();
      const visible = [];
      for (const other of users)
        if (!user || !(await blocked(user.id, other.id)))
          visible.push({
            ...publicUser(other),
            isFollowing: following.has(other.id),
          });
      return json({ users: visible });
    }
    if (parts[0] === "users" && parts[1]) {
      if (parts.length === 2 && method === "GET") {
        const other = await prisma.user.findUnique({
          where: { username: parts[1] },
          include: includeUser,
        });
        if (!other || other.hidden) fail("Profile not found", 404);
        const isBlocked = user ? await blocked(user.id, other.id) : false;
        const isFollowing = user
          ? !!(await prisma.follow.findUnique({
              where: {
                followerId_followingId: {
                  followerId: user.id,
                  followingId: other.id,
                },
              },
            }))
          : false;
        const records = await prisma.post.findMany({
          where: { authorId: other.id },
          include: postInclude,
          orderBy: { createdAt: "desc" },
        });
        const posts = [];
        for (const post of records)
          if (await visiblePost(post, user))
            posts.push(shapePost(post, user?.id));
        return json({
          user: publicUser(other, user?.id === other.id),
          posts,
          isFollowing,
          isBlocked,
        });
      }
      if (
        (parts[2] === "follow" || parts[2] === "block") &&
        method === "POST"
      ) {
        requireUser(user);
        const target = await prisma.user.findUnique({
          where: { id: parts[1] },
        });
        if (!target || target.hidden) fail("User not found", 404);
        if (target.id === user!.id) fail("Choose another account");
        if (parts[2] === "follow") {
          if (await blocked(user!.id, target.id))
            fail("Following is unavailable for this account", 403);
          const key = {
            followerId_followingId: {
              followerId: user!.id,
              followingId: target.id,
            },
          };
          const exists = await prisma.follow.findUnique({ where: key });
          if (exists) await prisma.follow.delete({ where: key });
          else {
            await prisma.follow.create({
              data: { followerId: user!.id, followingId: target.id },
            });
            await notify(
              target.id,
              "FOLLOW",
              `${user!.profile?.displayName} started following you`,
              `/u/${user!.username}`,
            );
          }
          return json({ following: !exists });
        }
        const key = {
          blockerId_blockedId: { blockerId: user!.id, blockedId: target.id },
        };
        const exists = await prisma.blockedUser.findUnique({ where: key });
        if (exists) await prisma.blockedUser.delete({ where: key });
        else {
          await prisma.$transaction([
            prisma.blockedUser.create({
              data: { blockerId: user!.id, blockedId: target.id },
            }),
            prisma.follow.deleteMany({
              where: {
                OR: [
                  { followerId: user!.id, followingId: target.id },
                  { followerId: target.id, followingId: user!.id },
                ],
              },
            }),
          ]);
        }
        return json({ blocked: !exists });
      }
    }
    if (path === "profile" && method === "PATCH") {
      requireUser(user);
      const data = await body(req);
      const update: Record<string, string> = {};
      for (const key of [
        "displayName",
        "bio",
        "interests",
        "location",
        "website",
      ])
        if (typeof data[key] === "string")
          update[key] = text(data[key], key === "bio" ? 1000 : 150);
      for (const key of ["avatar", "cover"])
        if (data[key] !== undefined)
          update[key] = validLocalImage(data[key]) || "";
      if ("displayName" in update && !update.displayName)
        fail("Display name cannot be empty");
      await prisma.profile.update({
        where: { userId: user!.id },
        data: update,
      });
      return json({
        user: publicUser(
          await prisma.user.findUnique({
            where: { id: user!.id },
            include: includeUser,
          }),
          true,
        ),
      });
    }

    if (path === "conversations" && method === "GET") {
      requireUser(user);
      const records = await prisma.conversation.findMany({
        where: { participants: { some: { userId: user!.id } } },
        include: conversationInclude,
      });
      return json({
        conversations: records
          .sort(
            (a, b) =>
              +(b.messages.at(-1)?.createdAt || b.createdAt) -
              +(a.messages.at(-1)?.createdAt || a.createdAt),
          )
          .map((c) => shapeConversation(c, user!.id)),
      });
    }
    if (path === "conversations" && method === "POST") {
      requireUser(user);
      const data = await body(req);
      const other = await prisma.user.findUnique({
        where: { id: text(data.userId) },
        include: userInclude,
      });
      if (!other || other.hidden || other.id === user!.id)
        fail("Choose another account");
      if (!other.settings?.allowMessages || (await blocked(user!.id, other.id)))
        fail("This account is not accepting messages", 403);
      let conversation = await prisma.conversation.findFirst({
        where: {
          AND: [
            { participants: { some: { userId: user!.id } } },
            { participants: { some: { userId: other.id } } },
          ],
        },
        include: conversationInclude,
      });
      if (!conversation)
        conversation = await prisma.conversation.create({
          data: {
            participants: {
              create: [{ userId: user!.id }, { userId: other.id }],
            },
          },
          include: conversationInclude,
        });
      const content = text(data.body, 3000);
      if (content) {
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: user!.id,
            content,
          },
        });
        await notify(
          other.id,
          "MESSAGE",
          `${user!.profile?.displayName} sent you a message`,
          "/messages",
        );
        conversation = (await prisma.conversation.findUnique({
          where: { id: conversation.id },
          include: conversationInclude,
        }))!;
      }
      return json(
        { conversation: shapeConversation(conversation, user!.id) },
        201,
      );
    }
    if (parts[0] === "conversations" && parts[1]) {
      requireUser(user);
      const conversation = await prisma.conversation.findUnique({
        where: { id: parts[1] },
        include: conversationInclude,
      });
      if (
        !conversation ||
        !conversation.participants.some((p) => p.userId === user!.id)
      )
        fail("Conversation not found", 403);
      if (parts.length === 2 && method === "GET") {
        const readTime = new Date();
        await prisma.conversationParticipant.update({
          where: {
            conversationId_userId: {
              conversationId: conversation.id,
              userId: user!.id,
            },
          },
          data: { lastReadAt: readTime },
        });
        conversation.participants.find(
          (p) => p.userId === user!.id,
        )!.lastReadAt = readTime;
        return json({
          conversation: shapeConversation(conversation, user!.id),
        });
      }
      if (parts[2] === "messages" && method === "POST") {
        const others = conversation.participants.filter(
          (p) => p.userId !== user!.id,
        );
        for (const p of others)
          if (
            (await blocked(user!.id, p.userId)) ||
            !p.user.settings?.allowMessages
          )
            fail("Messaging is unavailable for this conversation", 403);
        const data = await body(req);
        const content = text(data.body, 3000);
        if (!content) fail("Write a message");
        const message = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: user!.id,
            content,
          },
          include: { sender: { include: userInclude } },
        });
        for (const p of others)
          await notify(
            p.userId,
            "MESSAGE",
            `${user!.profile?.displayName} sent you a message`,
            "/messages",
          );
        return json({ message: shapeMessage(message) }, 201);
      }
    }

    if (path === "albums" && method === "GET") {
      const username = url.searchParams.get("user");
      const owner = username
        ? await prisma.user.findUnique({
            where: { username },
            include: userInclude,
          })
        : user;
      if (username && (!owner || owner.hidden)) fail("Profile not found", 404);
      if (!owner) {
        const publicAlbums = await prisma.photoAlbum.findMany({
          where: {
            isPrivate: false,
            owner: { hidden: false, settings: { privateAccount: false } },
          },
          include: {
            owner: { include: userInclude },
            photos: { where: { isPrivate: false } },
          },
          orderBy: { createdAt: "desc" },
          take: 30,
        });
        return json({ albums: publicAlbums.map(shapeAlbum) });
      }
      const canView = await allowedAuthor(owner, user);
      const records = await prisma.photoAlbum.findMany({
        where: {
          ownerId: owner.id,
          ...(owner.id !== user?.id ? { isPrivate: false } : {}),
        },
        include: { owner: { include: userInclude }, photos: true },
        orderBy: { createdAt: "desc" },
      });
      return json({ albums: canView ? records.map(shapeAlbum) : [] });
    }
    if (path === "albums" && method === "POST") {
      requireUser(user);
      const data = await body(req);
      const name = text(data.name, 100);
      if (!name) fail("Name your album");
      const album = await prisma.photoAlbum.create({
        data: { ownerId: user!.id, name, isPrivate: data.isPrivate === true },
        include: { photos: true },
      });
      return json({ album: shapeAlbum(album) }, 201);
    }
    if (parts[0] === "albums" && parts[2] === "photos" && method === "POST") {
      requireUser(user);
      const album = await prisma.photoAlbum.findUnique({
        where: { id: parts[1] },
      });
      if (!album || album.ownerId !== user!.id) fail("Album not found", 403);
      const data = await body(req);
      const image = validLocalImage(data.url);
      if (!image) fail("Add an uploaded photo");
      const photo = await prisma.photo.create({
        data: {
          ownerId: user!.id,
          albumId: album.id,
          url: image,
          caption: text(data.caption, 300),
          isPrivate: album.isPrivate,
        },
      });
      return json({ photo }, 201);
    }
    if (path === "notifications") {
      requireUser(user);
      if (method === "GET")
        return json({
          notifications: (
            await prisma.notification.findMany({
              where: { userId: user!.id },
              orderBy: { createdAt: "desc" },
              take: 100,
            })
          ).map((n) => ({ ...n, body: n.content })),
        });
      if (method === "PATCH") {
        const data = await body(req);
        await prisma.notification.updateMany({
          where: {
            userId: user!.id,
            ...(typeof data.id === "string" ? { id: data.id } : {}),
          },
          data: { read: true },
        });
        return json({ ok: true });
      }
    }
    if (path === "settings") {
      requireUser(user);
      if (method === "GET") {
        const blocks = await prisma.blockedUser.findMany({
          where: { blockerId: user!.id },
          include: { blocked: { include: userInclude } },
        });
        return json({
          settings: publicUser(user, true).settings,
          blockedUsers: blocks.map((b) => ({
            ...b,
            blocked: publicUser(b.blocked),
          })),
        });
      }
      if (method === "PATCH") {
        const data = await body(req);
        const update: Record<string, boolean> = {};
        for (const key of [
          "privateAccount",
          "allowMessages",
          "showActivity",
          "emailNotifications",
        ])
          if (typeof data[key] === "boolean") update[key] = data[key];
        await prisma.accountSetting.update({
          where: { userId: user!.id },
          data: update,
        });
        return json({
          settings: publicUser(
            await prisma.user.findUnique({
              where: { id: user!.id },
              include: userInclude,
            }),
            true,
          ).settings,
        });
      }
    }
    if (path === "premium/checkout" && method === "POST") {
      requireUser(user);
      const data = await body(req);
      if (!["MONTHLY", "LIFETIME"].includes(data.plan))
        fail("Choose a valid plan");
      await prisma.premiumSubscription.update({
        where: { userId: user!.id },
        data: { pendingPlan: data.plan },
      });
      return json({
        order: {
          id: `order-${user!.id}-${data.plan}`,
          price: data.plan === "LIFETIME" ? 1000 : 25,
          plan: data.plan,
          currency: "fictional credits",
        },
      });
    }
    if (
      (path === "premium/activate" || path === "secure/premium/activate") &&
      method === "POST"
    ) {
      requireUser(user);
      const data = await body(req);
      const premium = await prisma.premiumSubscription.findUnique({
        where: { userId: user!.id },
      });
      if (
        typeof data.orderId === "string" &&
        data.orderId.startsWith("order-") &&
        !data.orderId.startsWith(`order-${user!.id}-`)
      )
        fail("This order belongs to another account", 403);
      if (
        !premium?.pendingPlan ||
        data.orderId !== `order-${user!.id}-${premium.pendingPlan}`
      )
        fail("Start a checkout first");
      const price = premium.pendingPlan === "LIFETIME" ? 1000 : 25;
      const amount = data.amount;
      if (
        !Number.isSafeInteger(amount) ||
        amount < 0 ||
        amount > premium.credits
      )
        fail("Insufficient fictional credits");
      if (path.startsWith("secure/") && amount !== price)
        fail("The payment amount must match the plan price");
      const updated = await prisma.premiumSubscription.update({
        where: { userId: user!.id },
        data: {
          status: premium.pendingPlan,
          credits: { decrement: amount },
          pendingPlan: null,
          startedAt: new Date(),
        },
      });
      return json(
        { premium: updated },
        200,
        path.startsWith("secure/") ? secureHeaders : {},
      );
    }
    if (path === "verification" && method === "POST") {
      requireUser(user);
      const verification = await prisma.verificationStatus.update({
        where: { userId: user!.id },
        data: { state: "PENDING", requestedAt: new Date() },
      });
      return json({ verification });
    }
    return json(
      { error: "Route not found" },
      404,
      parts[0] === "secure" ? secureHeaders : {},
    );
  } catch (error: any) {
    const headers = parts[0] === "secure" ? secureHeaders : {};
    if (error?.code === "P2002")
      return json({ error: "This record already exists" }, 409, headers);
    if (error?.status)
      return json({ error: error.message }, error.status, headers);
    console.error("Application request failed:", error);
    return json({ error: "The request could not be completed" }, 500, headers);
  }
}
