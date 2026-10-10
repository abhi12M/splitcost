import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { readJsonObject } from "@/lib/api/request";
import { SUCCESS_MESSAGES, successJson } from "@/lib/api/success";

const COOKIE_NAME = "splitcost_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function safelyEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  if (process.env.NODE_ENV === "production" && request.headers.get("origin") !== requestOrigin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const loginId = process.env.ADMIN_LOGIN_ID;
  const password = process.env.ADMIN_LOGIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!loginId || !password || !secret) {
    console.error("Admin authentication is not configured");
    return NextResponse.json({ error: "Admin authentication is not configured" }, { status: 503 });
  }

  const parsed = await readJsonObject(request, { allowedKeys: ["loginId", "password"] });
  const body = parsed.ok ? parsed.data : null;
  if (typeof body?.loginId !== "string" || typeof body.password !== "string" || !safelyEqual(body.loginId, loginId) || !safelyEqual(body.password, password)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `admin.${expiresAt}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  const response = successJson({ ok: true }, SUCCESS_MESSAGES.signedIn);
  response.cookies.set(COOKIE_NAME, `${payload}.${signature}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}

export async function DELETE() {
  const response = successJson({ ok: true }, SUCCESS_MESSAGES.signedOut);
  response.cookies.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
