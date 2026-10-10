import { NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
  isAuthorizedAdminRequest,
  verifyAdminCredentials,
} from "@/lib/admin-auth";
import { readJsonObject } from "@/lib/api/request";
import { SUCCESS_MESSAGES, successJson } from "@/lib/api/success";

export async function GET(request: Request) {
  return NextResponse.json({ authenticated: isAuthorizedAdminRequest(request) });
}

export async function POST(request: Request) {
  const parsed = await readJsonObject(request, { allowedKeys: ["loginId", "password"] });
  const body = parsed.ok ? parsed.data : null;
  const loginId = typeof body?.loginId === "string" ? body.loginId : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!verifyAdminCredentials(loginId, password)) {
    return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
  }

  const response = successJson({ authenticated: true }, SUCCESS_MESSAGES.signedIn);
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    createAdminSessionToken(),
    getAdminSessionCookieOptions()
  );
  return response;
}

export async function DELETE() {
  const response = successJson({ authenticated: false }, SUCCESS_MESSAGES.signedOut);
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...getAdminSessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}

