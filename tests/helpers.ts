import { APIRequestContext, expect, request } from "@playwright/test";

export const baseURL = "http://127.0.0.1:3000";
export const password = "CoffeeAndChaos!42";

export async function account(username: string): Promise<APIRequestContext> {
  const context = await request.newContext({ baseURL });
  const response = await context.post("/api/auth/login", {
    data: { username, password },
  });
  expect(response.status(), await response.text()).toBe(200);
  expect((await response.json()).user.username).toBe(username);
  return context;
}

export async function json(
  context: APIRequestContext,
  method: "get" | "post" | "patch" | "delete",
  path: string,
  data?: unknown,
) {
  const response = await context[method](
    path,
    data === undefined ? {} : { data },
  );
  expect(
    response.ok(),
    `${method.toUpperCase()} ${path}: ${response.status()} ${await response.text()}`,
  ).toBeTruthy();
  return response.json();
}

export const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9ZkAAAAASUVORK5CYII=",
  "base64",
);
