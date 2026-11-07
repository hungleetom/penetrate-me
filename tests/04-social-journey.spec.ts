import { test, expect } from "@playwright/test";
import { json, password, png } from "./helpers";

test("profile, messaging, private photos, settings, premium, and verification work through the UI", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await json(page.request, "post", "/api/auth/register", {
    username: "tessa.ui",
    displayName: "Tessa Rowan",
    email: "tessa.rowan@example.test",
    password,
  });
  await page.goto("/u/tessa.ui");
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Make yourself at home" });
  await editor
    .getByLabel("Bio", { exact: true })
    .fill("Weekend walks and coffee worth the detour.");
  await editor
    .getByLabel("Interests", { exact: true })
    .fill("Walking, coffee, photography");
  await editor
    .getByRole("button", { name: "Save profile", exact: true })
    .click();
  await expect(editor).not.toBeVisible();
  await expect(
    page.getByText("Weekend walks and coffee worth the detour.", {
      exact: true,
    }),
  ).toBeVisible();
  expect((await json(page.request, "get", "/api/me")).user.profile.bio).toBe(
    "Weekend walks and coffee worth the detour.",
  );

  await page.goto("/messages");
  await page.getByRole("button", { name: "New message", exact: true }).click();
  const newMessage = page.getByRole("dialog", { name: "Start with a hello" });
  await newMessage.getByLabel("Find message recipient").fill("jessp");
  await newMessage.getByText("Jessica Park", { exact: true }).click();
  await newMessage
    .getByLabel("First message")
    .fill("Your cafe recommendations are excellent.");
  await newMessage.getByRole("button", { name: "Start conversation" }).click();
  await expect(
    page.getByText("Your cafe recommendations are excellent.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Write a message")
    .fill("See you for a flat white next week!");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByText("See you for a flat white next week!", { exact: true }),
  ).toBeVisible();
  const conversationId = new URL(page.url()).pathname.split("/").at(-1);
  expect(
    (
      await json(page.request, "get", `/api/conversations/${conversationId}`)
    ).conversation.messages.some(
      (m: any) => m.body === "See you for a flat white next week!",
    ),
  ).toBe(true);

  await page.goto("/photos");
  await page.getByRole("button", { name: "New album", exact: true }).click();
  const albumModal = page.getByRole("dialog", {
    name: "Give your moments a home",
  });
  await albumModal
    .getByLabel("Album name", { exact: true })
    .fill("Quiet mornings");
  await albumModal
    .getByRole("button", { name: "Private album", exact: true })
    .click();
  await albumModal
    .getByRole("button", { name: "Create album", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Quiet mornings", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Upload album photo")
    .setInputFiles({
      name: "morning-light.png",
      mimeType: "image/png",
      buffer: png,
    });
  const photo = page.getByRole("img", { name: "morning-light", exact: true });
  await expect(photo).toBeVisible();
  await expect
    .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  await photo.click();
  await expect(
    page.getByRole("dialog", { name: "Album photo preview" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close photo preview", exact: true })
    .click();
  const album = (await json(page.request, "get", "/api/albums")).albums.find(
    (a: any) => a.name === "Quiet mornings",
  );
  expect(album.isPrivate).toBe(true);
  expect(album.photos).toHaveLength(1);

  await page.goto("/settings");
  await page
    .getByRole("button", { name: "Private account", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Private account", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    (await json(page.request, "get", "/api/settings")).settings.privateAccount,
  ).toBe(true);
  await page.getByLabel("Premium plan").selectOption("MONTHLY");
  await page.getByRole("button", { name: "Get a little extra" }).click();
  await page
    .getByRole("dialog", { name: "Your next chapter looks good" })
    .getByRole("button", { name: "Activate Premium", exact: true })
    .click();
  await expect(
    page.getByText("You’re enjoying monthly Premium. Looking good.", {
      exact: true,
    }),
  ).toBeVisible();
  const premium = (await json(page.request, "get", "/api/me")).user.premium;
  expect(premium.status).toBe("MONTHLY");
  expect(premium.credits).toBe(75);
  await page
    .getByRole("button", { name: "Request verification", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pending review", exact: true }),
  ).toBeDisabled();
  expect(
    (await json(page.request, "get", "/api/me")).user.verification.state,
  ).toBe("PENDING");
});
