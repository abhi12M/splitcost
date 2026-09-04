import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "splitcost_admin_session";
const SESSION_VERSION = "v1";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

type AdminConfiguration = {
  loginId: string;
  password: string;
  sessionSecret: string;
};

function getAdminConfiguration(): AdminConfiguration | null {
  const loginId = process.env.ADMIN_LOGIN_ID?.trim();
  const password = process.env.ADMIN_LOGIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;

  return loginId && password && sessionSecret
    ? { loginId, password, sessionSecret }
    : null;
}

function signaturesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return (
    leftBuffer.length > 0 &&
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function signSessionPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const entry of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = entry.trim().split("=");
    if (rawName === name) {
      try {
        return decodeURIComponent(rawValue.join("="));
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function verifyAdminCredentials(loginId: string, password: string) {
  const configuration = getAdminConfiguration();
  if (!configuration) return false;

  const suppliedId = createHmac("sha256", configuration.sessionSecret)
    .update(loginId.trim())
    .digest("hex");
  const expectedId = createHmac("sha256", configuration.sessionSecret)
    .update(configuration.loginId)
    .digest("hex");
  const suppliedPassword = createHmac("sha256", configuration.sessionSecret)
    .update(password)
    .digest("hex");
  const expectedPassword = createHmac("sha256", configuration.sessionSecret)
    .update(configuration.password)
    .digest("hex");

  return signaturesMatch(suppliedId, expectedId) &&
    signaturesMatch(suppliedPassword, expectedPassword);
}

export function createAdminSessionToken(now = Date.now()) {
  const configuration = getAdminConfiguration();
  if (!configuration) throw new Error("Admin authentication is not configured");

  const expiresAt = Math.floor(now / 1000) + SESSION_DURATION_SECONDS;
  const payload = `${SESSION_VERSION}.${expiresAt}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${signSessionPayload(payload, configuration.sessionSecret)}`;
}

export function verifyAdminSessionToken(token: string | null, now = Date.now()) {
  const configuration = getAdminConfiguration();
  if (!configuration || !token) return false;

  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== SESSION_VERSION) return false;

  const [version, rawExpiry, nonce, suppliedSignature] = parts;
  if (!/^[0-9a-f]{32}$/.test(nonce) || !/^[0-9a-f]{64}$/.test(suppliedSignature)) {
    return false;
  }
  const expiresAt = Number(rawExpiry);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) {
    return false;
  }

  const payload = `${version}.${rawExpiry}.${nonce}`;
  const expectedSignature = signSessionPayload(payload, configuration.sessionSecret);
  return signaturesMatch(suppliedSignature, expectedSignature);
}

export function isAuthorizedAdminRequest(request: Request) {
  return verifyAdminSessionToken(readCookie(request, ADMIN_SESSION_COOKIE));
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  };
}
