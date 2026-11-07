import { test, expect, APIRequestContext } from "@playwright/test";
import { account, baseURL, json, password } from "./helpers";

test.describe
  .serial("Isolated intentional security fixtures and secure controls", () => {
  let alex: APIRequestContext;
  let dan: APIRequestContext;
  let admin: APIRequestContext;
  test.beforeAll(async () => {
    alex = await account("alexm");
    dan = await account("dan.codes");
    admin = await account("kevin_admin");
  });
  test.afterAll(async () => {
    await Promise.all([alex?.dispose(), dan?.dispose(), admin?.dispose()]);
  });

  test("user SQL injection reaches real hidden snapshot row; bound query does not", async ({
    request,
  }) => {
    const payload = encodeURIComponent("' OR 1=1 --");
    const ordinary = (await json(request, "get", "/api/search/users?q=alex"))
      .users;
    expect(ordinary.some((u: any) => u.username === "alexm")).toBeTruthy();
    expect(
      ordinary.some((u: any) => u.username === "definitely_not_a_hacker"),
    ).toBe(false);
    const users = (await json(request, "get", `/api/search/users?q=${payload}`))
      .users;
    const hidden = users.find(
      (u: any) => u.username === "definitely_not_a_hacker",
    );
    expect(hidden).toBeTruthy();
    expect(JSON.stringify(hidden)).toContain(
      "we need to talk about your hobbies",
    );
    expect(
      (await json(request, "get", `/api/secure/search/users?q=${payload}`))
        .users,
    ).toHaveLength(0);
    await request.get(
      `/api/search/users?q=${encodeURIComponent("'; DELETE FROM users; --")}`,
    );
    expect(
      (await json(request, "get", "/api/search/users?q=alex")).users.some(
        (u: any) => u.username === "alexm",
      ),
    ).toBe(true);
  });

  test("post and authenticated account injection are independent with secure controls", async ({
    request,
  }) => {
    const payload = encodeURIComponent("' OR 1=1 --");
    const posts = (await json(request, "get", `/api/search/posts?q=${payload}`))
      .posts;
    expect(posts.length).toBeGreaterThanOrEqual(50);
    expect(
      (await json(request, "get", `/api/secure/search/posts?q=${payload}`))
        .posts,
    ).toHaveLength(0);
    expect(
      (await request.get(`/api/account/lookup?q=${payload}`)).status(),
    ).toBe(401);
    expect(
      (await json(alex, "get", `/api/account/lookup?q=${payload}`)).accounts
        .length,
    ).toBeGreaterThan(2);
    expect(
      (await json(alex, "get", `/api/secure/account/lookup?q=${payload}`))
        .accounts,
    ).toHaveLength(0);
  });

  test("reflected HTML executes only in unsafe preview", async ({ page }) => {
    const term = encodeURIComponent(
      '<svg onload="window.__reflectedFixture=1"></svg>',
    );
    await page.goto(`/search/preview?term=${term}`);
    await expect
      .poll(() => page.evaluate(() => (window as any).__reflectedFixture))
      .toBe(1);
    await page.goto(`/search/preview-safe?term=${term}`);
    expect(
      await page.evaluate(() => (window as any).__reflectedFixture),
    ).toBeUndefined();
    await expect(page.locator("body")).toContainText("<svg");
  });

  test("DOM input executes only in unsafe Discover rendering", async ({
    page,
  }) => {
    const label = encodeURIComponent(
      '<img src="/not-an-image" onerror="window.__domFixture=1">',
    );
    await page.goto(`/discover?label=${label}`);
    await expect
      .poll(() => page.evaluate(() => (window as any).__domFixture))
      .toBe(1);
    await page.goto(`/discover-safe?label=${label}`);
    expect(
      await page.evaluate(() => (window as any).__domFixture),
    ).toBeUndefined();
    await expect(page.locator("body")).toContainText("<img");
  });

  test("private message IDOR exposes another conversation; participant control rejects it", async () => {
    const leaked = (await json(dan, "get", "/api/messages/convo-1"))
      .conversation;
    expect(leaked.participants.every((p: any) => p.userId !== "u-dan")).toBe(
      true,
    );
    expect(JSON.stringify(leaked.messages)).toContain(
      "some random cybersecurity scanner",
    );
    expect((await dan.get("/api/secure/messages/convo-1")).status()).toBe(403);
    expect(
      (await json(alex, "get", "/api/secure/messages/convo-1")).conversation.id,
    ).toBe("convo-1");
    expect((await alex.get("/api/secure/messages/convo-2")).status()).toBe(403);
    await json(alex, "get", "/api/conversations/convo-1");
    const readBack = (await json(alex, "get", "/api/messages/convo-1")).conversation;
    expect(readBack.messages.find((m: any) => m.senderId === "u-jess").readAt).toEqual(expect.any(String));
  });

  test("private photo IDOR serves actual media; owner control rejects another user", async () => {
    const leaked = await dan.get("/api/photos/photo-1");
    expect(leaked.ok()).toBeTruthy();
    expect(leaked.headers()["content-type"]).toMatch(/^image\//);
    expect((await leaked.body()).length).toBeGreaterThan(100);
    expect((await dan.get("/api/secure/photos/photo-1")).status()).toBe(403);
    expect((await alex.get("/api/secure/photos/photo-1")).ok()).toBeTruthy();
  });

  test("missing authentication and missing role checks expose fictional read-only records", async ({
    request,
  }) => {
    const exposed = await request.get("/api/account/export?userId=u-alex");
    expect(exposed.ok()).toBeTruthy();
    expect(await exposed.text()).toContain("alexm");
    expect(
      (await request.get("/api/secure/account/export?userId=u-alex")).status(),
    ).toBe(401);
    expect(
      (await dan.get("/api/secure/account/export?userId=u-alex")).status(),
    ).toBe(403);
    expect(
      (await alex.get("/api/secure/account/export?userId=u-alex")).ok(),
    ).toBeTruthy();
    const overview = await json(alex, "get", "/api/admin/overview");
    expect(JSON.stringify(overview)).toContain("since 2022");
    expect((await alex.get("/api/secure/admin/overview")).status()).toBe(403);
    expect((await admin.get("/api/secure/admin/overview")).ok()).toBeTruthy();
  });

  test("logout revocation is enforced normally but ignored by legacy activity fixture", async ({
    playwright,
  }) => {
    const context = await account("jessp");
    const saved = await context.storageState();
    await json(context, "post", "/api/auth/logout");
    const replay = await playwright.request.newContext({
      baseURL,
      storageState: saved,
    });
    expect((await json(replay, "get", "/api/me")).user).toBeNull();
    expect((await replay.get("/api/account/activity")).ok()).toBeTruthy();
    expect((await replay.get("/api/secure/account/activity")).status()).toBe(
      401,
    );
    await Promise.all([context.dispose(), replay.dispose()]);
  });

  test("mass assignment changes cosmetic local state while role remains protected", async () => {
    const before = (await json(dan, "get", "/api/me")).user;
    const data = {
      isVerified: true,
      premiumStatus: "LIFETIME",
      profileBadge: "Fixture observer",
      role: "ADMIN",
      credits: 999999999,
    };
    expect(
      (await dan.patch("/api/secure/account/profile", { data })).status(),
    ).toBeGreaterThanOrEqual(400);
    const unchanged = (await json(dan, "get", "/api/me")).user;
    expect(unchanged.verification).toEqual(before.verification);
    expect(unchanged.premium).toEqual(before.premium);
    expect(unchanged.role).toBe(before.role);
    await json(dan, "patch", "/api/account/profile", data);
    const after = (await json(dan, "get", "/api/me")).user;
    expect(after.verification.isVerified).toBe(true);
    expect(after.verification.profileBadge).toBe("Fixture observer");
    expect(after.premium.status).toBe("LIFETIME");
    expect(after.role).toBe(before.role);
    expect(after.premium.credits).toBe(before.premium.credits);
    await json(dan, "patch", "/api/account/profile", {
      isVerified: before.verification.isVerified,
      premiumStatus: before.premium.status,
      profileBadge: before.verification.profileBadge,
    });
  });

  test("public directory leaks fictional metadata; secure projection excludes it", async ({
    request,
  }) => {
    const exposed = (await json(request, "get", "/api/directory/alexm")).user;
    const safe = (await json(request, "get", "/api/secure/directory/alexm"))
      .user;
    expect(Object.keys(exposed).length).toBeGreaterThan(
      Object.keys(safe).length,
    );
    expect(JSON.stringify(exposed)).toContain("@example.test");
    expect(safe).not.toHaveProperty("email");
    for (const text of [JSON.stringify(exposed), JSON.stringify(safe)]) {
      expect(text).not.toMatch(/passwordHash|sessionToken|sk-proj-/);
    }
  });

  test("HTML upload executes only as browser content; secure raster upload rejects it", async ({
    browser,
  }) => {
    const contents =
      '<!doctype html><meta charset="utf-8"><p>Disposable uploaded media</p><script>window.__uploadFixture=1</script>';
    const unsafe = await alex.post("/api/upload", {
      multipart: {
        file: {
          name: "harmless.html",
          mimeType: "text/html",
          buffer: Buffer.from(contents),
        },
      },
    });
    expect(unsafe.ok(), await unsafe.text()).toBeTruthy();
    const { url } = await unsafe.json();
    expect(url).toMatch(/^\/media\/uploads\/[a-zA-Z0-9._-]+$/);
    const ctx = await browser.newContext({
      storageState: await alex.storageState(),
    });
    const page = await ctx.newPage();
    await page.goto(`${baseURL}${url}`);
    await expect
      .poll(() => page.evaluate(() => (window as any).__uploadFixture))
      .toBe(1);
    const safe = await alex.post("/api/secure/upload", {
      multipart: {
        file: {
          name: "harmless.html",
          mimeType: "image/png",
          buffer: Buffer.from(contents),
        },
      },
    });
    expect(safe.status()).toBeGreaterThanOrEqual(400);
    const hostCode = '<?php echo "this must remain data"; ?>';
    const stored = await alex.post("/api/upload", {
      multipart: {
        file: {
          name: "not-executable.php",
          mimeType: "text/plain",
          buffer: Buffer.from(hostCode),
        },
      },
    });
    expect(stored.ok()).toBeTruthy();
    const download = await alex.get((await stored.json()).url);
    expect(await download.text()).toBe(hostCode);
    expect(download.headers()["content-type"]).not.toMatch(/php/);
    const traversal = await alex.get("/media/uploads/..%2F..%2F.env");
    expect(traversal.status()).toBeGreaterThanOrEqual(400);
    await ctx.close();
  });

  test("metrics and diagnostics contain fictional values and all expected records", async ({
    request,
  }) => {
    const metrics = await request.get("/metrics");
    expect(metrics.headers()["content-type"]).toContain("text/plain");
    const text = await metrics.text();
    expect(text).toMatch(/security_audits_completed\s+0/);
    expect(text).toMatch(/bugs_introduced_this_week\s+47/);
    expect(text).toMatch(/developer_confidence\s+100/);
    for (const line of text
      .split("\n")
      .filter((l) => l && !l.startsWith("#"))) {
      expect(line).toMatch(
        /^[a-zA-Z_:][a-zA-Z0-9_:]*(\{[^}]*\})?\s+-?[\d.]+(?:\s+\d+)?$/,
      );
    }
    const config = await json(request, "get", "/api/diagnostics/config");
    expect(Object.keys(config).sort()).toEqual(
      [
        "application",
        "environment",
        "version",
        "security_level",
        "developer_note",
        "release_note",
      ].sort(),
    );
    expect(JSON.stringify(config)).toContain("trust_me_bro");
    expect(JSON.stringify(config)).toContain("We tested it once. It worked.");
    expect(JSON.stringify(config)).toContain(
      "Our security team is currently on lunch break.",
    );
    expect(JSON.stringify(config)).not.toMatch(
      /process\.env|sk-proj-|BEGIN .*PRIVATE KEY/,
    );
    const report = await request.get("/api/diagnostics/report");
    expect(await report.text()).toContain(
      "Security review postponed until further notice.",
    );
    expect(report.headers()["content-disposition"]).toContain(
      "security-audit-final-FINAL-v7.txt",
    );
    for (const path of [
      "/metrics-safe",
      "/api/secure/diagnostics/config",
      "/api/secure/diagnostics/report",
    ]) {
      expect((await request.get(path)).status()).toBe(401);
      expect((await alex.get(path)).status()).toBe(403);
      const protectedResult = await admin.get(path);
      expect(protectedResult.ok()).toBeTruthy();
      expect(protectedResult.headers()["x-content-type-options"]).toBe(
        "nosniff",
      );
    }
    const administrator = (await json(admin, "get", "/api/me")).user;
    expect(administrator.premium.status).toBe("LIFETIME");
    expect(administrator.premium.credits).toBe(999999999);
    expect(administrator.verification.profileBadge).toBe(
      "Financially irresponsible",
    );
    expect(
      JSON.stringify(await json(alex, "get", "/api/admin/overview")),
    ).toContain("Congratulations. You have more access than our developers.");
    expect(
      JSON.stringify(await json(request, "get", "/api/directory/alexm")),
    ).toContain("If this shows up in your scan report");
    const albums = (await json(alex, "get", "/api/albums")).albums;
    const egg = albums.find((a: any) => a.id === "album-1");
    expect(egg.name).toBe("Evidence I was productive today");
    expect(egg.photos).toHaveLength(4);
  });

  test("open redirect is verified from Location without visiting external destination", async ({
    request,
  }) => {
    const destination = "https://example.invalid/fixture-only";
    const redirect = await request.get(
      `/go?next=${encodeURIComponent(destination)}`,
      { maxRedirects: 0 },
    );
    expect([302, 303, 307]).toContain(redirect.status());
    expect(redirect.headers().location).toBe(destination);
    const safe = await request.get(
      `/go-safe?next=${encodeURIComponent(destination)}`,
      { maxRedirects: 0 },
    );
    expect(safe.status()).toBeGreaterThanOrEqual(400);
    const internal = await request.get("/go-safe?next=%2Fmessages", {
      maxRedirects: 0,
    });
    expect([302, 303, 307]).toContain(internal.status());
    expect(new URL(internal.headers().location, baseURL).pathname).toBe(
      "/messages",
    );
  });

  test("secure comparison routes add security headers omitted by unsafe preview", async ({
    request,
  }) => {
    const unsafe = await request.get("/search/preview?term=coffee");
    const safe = await request.get("/search/preview-safe?term=coffee");
    expect(unsafe.headers()["content-security-policy"]).toContain(
      "script-src 'self' 'unsafe-inline'",
    );
    expect(unsafe.headers()["x-content-type-options"]).toBeUndefined();
    expect(unsafe.headers()["referrer-policy"]).toBeUndefined();
    expect(safe.headers()["content-security-policy"]).toContain("default-src");
    expect(safe.headers()["content-security-policy"]).not.toMatch(
      /script-src[^;]*'unsafe-inline'/,
    );
    expect(safe.headers()["x-content-type-options"]).toBe("nosniff");
    expect(safe.headers()["referrer-policy"]).toBeTruthy();
    const application = await request.get("/");
    const policy = application.headers()["content-security-policy"];
    expect(policy).toContain("connect-src 'self'");
    expect(policy).toContain("img-src 'self' data:");
    expect(policy).toContain("form-action 'self'");
    expect((await request.get("/", { headers: { host: "example.invalid:3000" } })).status()).toBe(403);
  });

  test("private profile and block restrictions can be bypassed only on archive fixture", async () => {
    const previous = (await json(alex, "get", "/api/settings")).settings;
    await json(alex, "patch", "/api/settings", { privateAccount: true });
    await json(alex, "post", "/api/users/u-dan/block");
    expect(
      (await json(dan, "get", "/api/profile/alexm/archive")).posts.length,
    ).toBeGreaterThan(0);
    expect((await dan.get("/api/secure/profile/alexm/archive")).status()).toBe(
      403,
    );
    expect(
      (await json(dan, "get", "/api/posts?user=alexm")).posts,
    ).toHaveLength(0);
    await json(alex, "post", "/api/users/u-dan/block");
    await json(alex, "patch", "/api/settings", {
      privateAccount: previous.privateAccount,
    });
  });

  test("premium activation trusts amount only in designated workflow fixture", async () => {
    const order = (
      await json(dan, "post", "/api/premium/checkout", { plan: "LIFETIME" })
    ).order;
    expect(order.price).toBeGreaterThan(0);
    expect(
      (
        await dan.post("/api/secure/premium/activate", {
          data: { orderId: order.id, amount: 0 },
        })
      ).status(),
    ).toBeGreaterThanOrEqual(400);
    expect(
      (
        await json(dan, "post", "/api/premium/activate", {
          orderId: order.id,
          amount: 0,
        })
      ).premium.status,
    ).toBe("LIFETIME");
    const another = (
      await json(alex, "post", "/api/premium/checkout", { plan: "MONTHLY" })
    ).order;
    expect(
      (
        await dan.post("/api/premium/activate", {
          data: { orderId: another.id, amount: 0 },
        })
      ).status(),
    ).toBeGreaterThanOrEqual(400);
  });

  test("verification completion trusts client approval only in designated workflow fixture", async () => {
    const started = await json(dan, "post", "/api/verification/claim", {
      step: "start",
    });
    expect(started.requestId).toBeTruthy();
    expect(
      (
        await dan.post("/api/secure/verification/claim", {
          data: {
            step: "complete",
            requestId: started.requestId,
            approved: true,
          },
        })
      ).status(),
    ).toBeGreaterThanOrEqual(400);
    await json(dan, "post", "/api/verification/claim", {
      step: "complete",
      requestId: started.requestId,
      approved: true,
    });
    expect(
      (await json(dan, "get", "/api/me")).user.verification.isVerified,
    ).toBe(true);
  });
});
