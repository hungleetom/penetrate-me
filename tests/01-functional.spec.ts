import { test, expect, APIRequestContext } from "@playwright/test";
import { account, json, password, png } from "./helpers";

test.describe.serial("Ordinary social network behavior", () => {
  let alex: APIRequestContext;
  let jess: APIRequestContext;
  let dan: APIRequestContext;

  test.beforeAll(async () => {
    alex = await account("alexm");
    jess = await account("jessp");
    dan = await account("dan.codes");
  });
  test.afterAll(async () => {
    await Promise.all([alex?.dispose(), jess?.dispose(), dan?.dispose()]);
  });

  test("public feed contains real seeded posts and local images", async ({
    request,
  }) => {
    const result = await json(request, "get", "/api/posts");
    expect(result.posts.length).toBeGreaterThanOrEqual(20);
    expect(
      result.posts.some((p: any) => p.author.username === "jessp"),
    ).toBeTruthy();
    const pictured = result.posts.find((p: any) => p.image);
    expect(pictured.image).toMatch(/^\/(media|api)\//);
    expect((await request.get(pictured.image)).ok()).toBeTruthy();
    expect(
      (await request.get("/docs/intentional-vulnerabilities.md")).status(),
    ).toBe(404);
  });

  test("registration, session, login, logout, and password reset work", async ({
    playwright,
  }) => {
    const newcomer = await playwright.request.newContext({
      baseURL: "http://127.0.0.1:3000",
    });
    const result = await json(newcomer, "post", "/api/auth/register", {
      username: "tessa.test",
      displayName: "Tessa Reed",
      email: "tessa.reed@example.test",
      password,
    });
    expect(result.user.username).toBe("tessa.test");
    expect((await json(newcomer, "get", "/api/users?query=tessa.test")).users.some((u: any) => u.username === "tessa.test")).toBe(true);
    expect((await json(newcomer, "get", "/api/me")).user.username).toBe(
      "tessa.test",
    );
    expect(
      (
        await newcomer.post("/api/auth/register", {
          data: {
            username: "tessa.test",
            displayName: "Duplicate",
            email: "duplicate@example.test",
            password,
          },
        })
      ).status(),
    ).toBeGreaterThanOrEqual(400);
    await json(newcomer, "post", "/api/auth/logout");
    expect((await json(newcomer, "get", "/api/me")).user).toBeNull();
    await json(newcomer, "post", "/api/auth/login", {
      username: "tessa.test",
      password,
    });
    const reset = await json(newcomer, "post", "/api/auth/reset", {
      email: "tessa.reed@example.test",
    });
    expect(reset.message).toBeTruthy();
    expect(reset.resetToken).toEqual(expect.any(String));
    expect(reset.resetToken.length).toBeGreaterThan(20);
    await json(newcomer, "post", "/api/auth/reset", {
      token: reset.resetToken,
      password: "FreshCoffee!2026",
    });
    expect((await json(newcomer, "get", "/api/me")).user).toBeNull();
    expect(
      (
        await newcomer.post("/api/auth/reset", {
          data: { token: reset.resetToken, password: "AnotherPassword!42" },
        })
      ).status(),
    ).toBeGreaterThanOrEqual(400);
    await json(newcomer, "post", "/api/auth/logout");
    expect(
      (
        await newcomer.post("/api/auth/login", {
          data: { username: "tessa.test", password },
        })
      ).status(),
    ).toBeGreaterThanOrEqual(400);
    await json(newcomer, "post", "/api/auth/login", {
      username: "tessa.test",
      password: "FreshCoffee!2026",
    });
    await newcomer.dispose();
  });

  test("posts persist, support owner edits/deletion, comments, and stored likes", async () => {
    const created = await json(alex, "post", "/api/posts", {
      body: "A quiet morning, a very loud coffee grinder.",
    });
    const id = created.post.id;
    expect(
      (await json(alex, "get", "/api/posts?user=alexm")).posts.some(
        (p: any) => p.id === id,
      ),
    ).toBeTruthy();
    expect(
      (
        await jess.patch(`/api/posts/${id}`, {
          data: { body: "Other person edit" },
        })
      ).status(),
    ).toBe(403);
    await json(alex, "patch", `/api/posts/${id}`, {
      body: "A quiet morning, an excellent coffee.",
    });
    expect((await json(alex, "get", "/api/posts/search?q=excellent%20coffee")).posts.some((p: any) => p.id === id && p.body === "A quiet morning, an excellent coffee.")).toBe(true);
    const liked = await json(jess, "post", `/api/posts/${id}/like`);
    expect(liked.liked).toBe(true);
    const likedPost = (
      await json(jess, "get", "/api/posts?user=alexm")
    ).posts.find((p: any) => p.id === id);
    expect(likedPost.liked).toBe(true);
    expect(likedPost._count.likes).toBeGreaterThan(0);
    const comment = await json(jess, "post", `/api/posts/${id}/comments`, {
      body: "The best kind of morning.",
    });
    expect(comment.comment.body).toBe("The best kind of morning.");
    expect(
      (await json(alex, "get", "/api/posts?user=alexm")).posts
        .find((p: any) => p.id === id)
        .comments.some((c: any) => c.id === comment.comment.id),
    ).toBeTruthy();
    expect(
      (await json(alex, "get", "/api/notifications")).notifications.some(
        (n: any) => /Jessica|jessp|comment|liked/i.test(n.body),
      ),
    ).toBeTruthy();
    expect((await jess.delete(`/api/posts/${id}`)).status()).toBe(403);
    await json(alex, "delete", `/api/posts/${id}`);
    expect(
      (await json(alex, "get", "/api/posts?user=alexm")).posts.some(
        (p: any) => p.id === id,
      ),
    ).toBe(false);
  });

  test("follow/unfollow and profile editing use persistent records", async () => {
    const before = (await json(alex, "get", "/api/users/miac")).isFollowing;
    expect(
      (await json(alex, "post", "/api/users/u-mia/follow")).following,
    ).toBe(!before);
    expect((await json(alex, "get", "/api/users/miac")).isFollowing).toBe(
      !before,
    );
    expect(
      (await json(alex, "post", "/api/users/u-mia/follow")).following,
    ).toBe(before);
    const previous = (await json(alex, "get", "/api/me")).user;
    await json(alex, "patch", "/api/profile", {
      displayName: "Alex Morgan",
      bio: "Coffee, daylight, and a good photo.",
      interests: "photography,coffee,travel",
    });
    expect((await json(alex, "get", "/api/me")).user.profile.bio).toBe(
      "Coffee, daylight, and a good photo.",
    );
    await json(alex, "patch", "/api/profile", {
      displayName: previous.displayName,
      bio: previous.profile.bio,
      interests: previous.profile.interests,
    });
  });

  test("messages persist, participants can read, strangers cannot use ordinary endpoint", async () => {
    const conversation = (
      await json(alex, "post", "/api/conversations", {
        userId: "u-jess",
        body: "Coffee at the usual place?",
      })
    ).conversation;
    const body = "Meet you at ten. Bringing the camera.";
    await json(alex, "post", `/api/conversations/${conversation.id}/messages`, {
      body,
    });
    const unread = (await json(jess, "get", "/api/conversations")).conversations.find(
      (c: any) => c.id === conversation.id,
    );
    expect(unread.messages.find((m: any) => m.body === body).readAt).toBeNull();
    const thread = (
      await json(jess, "get", `/api/conversations/${conversation.id}`)
    ).conversation;
    expect(thread.messages.some((m: any) => m.body === body)).toBeTruthy();
    expect(thread.messages.find((m: any) => m.body === body).readAt).toEqual(expect.any(String));
    const conversationReadBack = (
      await json(jess, "get", "/api/conversations")
    ).conversations.find((c: any) => c.id === conversation.id);
    expect(conversationReadBack).toBeTruthy();
    expect(
      new Date(
        conversationReadBack.participants.find(
          (p: any) => p.userId === "u-jess",
        ).lastReadAt,
      ).getTime(),
    ).toBeGreaterThanOrEqual(
      new Date(
        thread.messages.find((m: any) => m.body === body).createdAt,
      ).getTime(),
    );
    expect(
      (await dan.get(`/api/conversations/${conversation.id}`)).status(),
    ).toBe(403);
    expect(
      (
        await dan.post(`/api/conversations/${conversation.id}/messages`, {
          data: { body: "Uninvited message" },
        })
      ).status(),
    ).toBe(403);
  });

  test("private albums, photo attachments, and profile photo uploads work", async () => {
    const upload = await alex.post("/api/secure/upload", {
      multipart: {
        file: { name: "tiny.png", mimeType: "image/png", buffer: png },
      },
    });
    expect(upload.ok(), await upload.text()).toBeTruthy();
    const { url } = await upload.json();
    const album = (
      await json(alex, "post", "/api/albums", {
        name: "Weekend contact sheets",
        isPrivate: true,
      })
    ).album;
    const photo = (
      await json(alex, "post", `/api/albums/${album.id}/photos`, {
        url,
        caption: "First frame of the weekend.",
      })
    ).photo;
    expect(photo.id).toBeTruthy();
    const own = (await json(alex, "get", "/api/albums")).albums;
    expect(
      own
        .find((a: any) => a.id === album.id)
        .photos.some((p: any) => p.id === photo.id),
    ).toBeTruthy();
    const other = (await json(jess, "get", "/api/albums?user=alexm")).albums;
    expect(other.some((a: any) => a.id === album.id)).toBe(false);
    expect(
      (
        await jess.post(`/api/albums/${album.id}/photos`, {
          data: { url, caption: "Wrong owner" },
        })
      ).status(),
    ).toBe(403);
    const previous = (await json(alex, "get", "/api/me")).user.profile.avatar;
    await json(alex, "patch", "/api/profile", { avatar: url });
    expect((await json(alex, "get", "/api/me")).user.profile.avatar).toBe(url);
    await json(alex, "patch", "/api/profile", { avatar: previous });
  });

  test("settings, blocking, notifications, and ordinary premium workflow work", async () => {
    const previous = (await json(alex, "get", "/api/settings")).settings;
    await json(alex, "patch", "/api/settings", {
      privateAccount: true,
      showActivity: false,
      allowMessages: true,
    });
    expect(
      (await json(alex, "get", "/api/settings")).settings.privateAccount,
    ).toBe(true);
    await json(alex, "patch", "/api/settings", {
      privateAccount: previous.privateAccount,
      showActivity: previous.showActivity,
      allowMessages: previous.allowMessages,
    });
    const blocked = (await json(alex, "post", "/api/users/u-dan/block"))
      .blocked;
    expect(blocked).toBe(true);
    expect((await json(alex, "get", "/api/users/dan.codes")).isBlocked).toBe(
      true,
    );
    expect(
      (await json(alex, "get", "/api/posts?user=dan.codes")).posts,
    ).toHaveLength(0);
    expect((await json(alex, "post", "/api/users/u-dan/block")).blocked).toBe(
      false,
    );
    await json(alex, "patch", "/api/notifications", {});
    expect(
      (await json(alex, "get", "/api/notifications")).notifications.every(
        (n: any) => n.read,
      ),
    ).toBe(true);
    const { order } = await json(alex, "post", "/api/premium/checkout", {
      plan: "MONTHLY",
    });
    expect(order.price).toBeGreaterThan(0);
    expect(
      (
        await json(alex, "post", "/api/secure/premium/activate", {
          orderId: order.id,
          amount: order.price,
        })
      ).premium.status,
    ).toBe("MONTHLY");
    expect(
      (await json(alex, "post", "/api/verification")).verification,
    ).toBeTruthy();
  });
});
