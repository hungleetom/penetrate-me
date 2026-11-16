import { test, expect } from "@playwright/test";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

const originalDockerAccess = process.env.SHANNON_DOCKER_ACCESS;

function request(
  host: string,
  path = "/",
  headers: Record<string, string> = {},
) {
  return new NextRequest(`http://127.0.0.1:3000${path}`, {
    headers: { ...headers, host },
  });
}

test.beforeEach(() => {
  delete process.env.SHANNON_DOCKER_ACCESS;
});

test.afterEach(() => {
  if (originalDockerAccess === undefined)
    delete process.env.SHANNON_DOCKER_ACCESS;
  else process.env.SHANNON_DOCKER_ACCESS = originalDockerAccess;
});

test("Docker access requires the exact opt-in value", async () => {
  for (const value of [undefined, "0", "true"]) {
    if (value === undefined) delete process.env.SHANNON_DOCKER_ACCESS;
    else process.env.SHANNON_DOCKER_ACCESS = value;
    const response = proxy(request("172.17.0.1:3001"));
    expect(response.status, `flag=${value}`).toBe(403);
    expect(await response.text()).toBe("Local development host only");
  }
});

test("loopback access remains available without Docker opt-in", () => {
  for (const host of ["localhost", "LOCALHOST:3000", "127.0.0.1:3000"])
    expect(proxy(request(host)).status, host).toBe(200);
});

test("Docker opt-in accepts only the exact bridge host and port", () => {
  process.env.SHANNON_DOCKER_ACCESS = "1";
  expect(proxy(request("172.17.0.1:3001")).status).toBe(200);
  for (const host of [
    "",
    "172.17.0.1",
    "172.17.0.1:3000",
    "172.17.0.1:30010",
    "172.17.0.2:3001",
    "172.18.0.1:3001",
    "192.168.1.10:3001",
    "203.0.113.10:3001",
    "172.17.0.1.example.test:3001",
    "172.17.0.1:3001:extra",
  ])
    expect(proxy(request(host)).status, host).toBe(403);
});

test("forwarding headers cannot override a rejected Host", () => {
  process.env.SHANNON_DOCKER_ACCESS = "1";
  const headers = {
    "x-forwarded-host": "172.17.0.1:3001",
    forwarded: "host=172.17.0.1:3001",
  };
  expect(proxy(request("example.test:3001", "/", headers)).status).toBe(403);
  expect(proxy(request("172.17.0.1:3000", "/", headers)).status).toBe(403);
});

test("Docker requests retain page security headers", () => {
  process.env.SHANNON_DOCKER_ACCESS = "1";
  const response = proxy(request("172.17.0.1:3001"));
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("Content-Security-Policy")).toContain(
    "default-src 'self'",
  );
  const safeResponse = proxy(request("172.17.0.1:3001", "/discover-safe"));
  expect(safeResponse.headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(safeResponse.headers.get("Referrer-Policy")).toBe("no-referrer");
  expect(safeResponse.headers.get("Content-Security-Policy")).toContain(
    "frame-ancestors 'none'",
  );
});
