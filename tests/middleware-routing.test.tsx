import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import middleware from "../src/middleware";

test("portal routes bypass locale routing", async () => {
  const response = await middleware(new NextRequest("http://localhost:3000/portal/x7k2p9"));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
});

test("API routes bypass locale routing", async () => {
  const response = await middleware(new NextRequest("http://localhost:3000/api/admin-session"));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
});
