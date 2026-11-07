import { test, expect } from "@playwright/test";
import { baseURL, json, password } from "./helpers";

test("guest feed and responsive navigation look like an ordinary social network", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(
    page.getByText("penetrate.me", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Jessica Park", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText(/scoreboard|vulnerabilities found|scan results/i),
  ).toHaveCount(0);
  await expect(page.locator("img").first()).toBeVisible();
  await expect.poll(() => page.getByRole("img", { name: /A moment shared by/ }).first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.screenshot({ path: "outputs/penetrate-me-desktop.png", animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await expect(
    page.getByText("penetrate.me", { exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({ path: "outputs/penetrate-me-mobile.png", animations: "disabled" });
});

test("sign in form and feed composer persist an actual post", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill("alexm");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByLabel("Write a post")).toBeVisible();
  const text = "A small browser-tested moment of calm.";
  await page.getByLabel("Write a post").fill(text);
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await expect(page.getByText(text, { exact: true })).toBeVisible();
  const post = (
    await json(page.request, "get", "/api/posts?user=alexm")
  ).posts.find((p: any) => p.body === text);
  expect(post).toBeTruthy();
  await json(page.request, "delete", `/api/posts/${post.id}`);
});

test("stored comment survives persistence and executes in a different controlled account; safe view escapes it", async ({
  browser,
  playwright,
}) => {
  const writer = await playwright.request.newContext({ baseURL });
  await json(writer, "post", "/api/auth/login", {
    username: "alexm",
    password,
  });
  const post = (
    await json(writer, "post", "/api/posts", {
      body: "Testing the light before another weekend walk.",
    })
  ).post;
  const marker =
    '<img src="/not-a-real-image" onerror="window.__storedFixture=1">';
  const comment = (
    await json(writer, "post", `/api/posts/${post.id}/comments`, {
      body: marker,
    })
  ).comment;
  expect(
    (await json(writer, "get", "/api/posts?user=alexm")).posts
      .find((p: any) => p.id === post.id)
      .comments.find((c: any) => c.id === comment.id).body,
  ).toBe(marker);
  const reader = await browser.newContext();
  await json(reader.request, "post", "/api/auth/login", {
    username: "jessp",
    password,
  });
  const page = await reader.newPage();
  await page.goto(`${baseURL}/u/alexm`);
  await page
    .getByRole("button", { name: `Comments on ${post.id}`, exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__storedFixture))
    .toBe(1);
  await page.goto(`${baseURL}/api/secure/comments/${comment.id}`);
  expect(
    await page.evaluate(() => (window as any).__storedFixture),
  ).toBeUndefined();
  await expect(page.locator("body")).toContainText("<img");
  await json(writer, "delete", `/api/posts/${post.id}`);
  await reader.close();
  await writer.dispose();
});
