// Failure responses for the APIs. `error` is always the friendly message the
// app may show to anyone. Outside production the exact reason travels along as
// `debug`, so a developer sees what really went wrong (a database error, the
// email provider's refusal, an exception) instead of a generic message.
import { NextResponse } from "next/server";

/** What went wrong, in the words of whatever failed. Development only. */
export type ApiErrorDebug = {
  message: string;
  name?: string;
  code?: string;
  details?: string;
  hint?: string;
  statusCode?: number;
};

const isProduction = () => process.env.NODE_ENV === "production";

const stringField = (source: Record<string, unknown>, key: string) =>
  typeof source[key] === "string" && source[key] ? (source[key] as string) : undefined;

/**
 * Reads the useful parts out of whatever failed: an Error, a Supabase/PostgREST
 * error, the email provider's error object, or a plain string.
 */
export function describeError(cause: unknown): ApiErrorDebug | undefined {
  if (cause === null || cause === undefined) return undefined;
  if (typeof cause === "string") return cause ? { message: cause } : undefined;
  if (typeof cause !== "object") return { message: String(cause) };

  const source = cause as Record<string, unknown>;
  const message = stringField(source, "message") ?? (cause instanceof Error ? cause.name : undefined);
  if (!message) return undefined;

  return {
    message,
    name: stringField(source, "name"),
    code: stringField(source, "code"),
    details: stringField(source, "details"),
    hint: stringField(source, "hint"),
    statusCode: typeof source.statusCode === "number" ? source.statusCode : undefined,
  };
}

/** An error whose message is written for the person using the app, so it is shown as it is. */
export class UserFacingError extends Error {}

const UNIQUE_VIOLATION = "23505";

/**
 * A failure response for something that threw. A UserFacingError keeps its own
 * message; a database unique-key violation says the value is taken; anything
 * else becomes `fallback`, with the real error attached for development.
 */
export function failureJson(error: unknown, fallback: string, status: number) {
  if (error instanceof UserFacingError) return errorJson(error.message, status);
  if (describeError(error)?.code === UNIQUE_VIOLATION) {
    return errorJson("That name or slug is already in use.", status, error);
  }
  return errorJson(fallback, status, error);
}

/**
 * A failure response. `friendly` is what users may see. `cause` is the real
 * error: it is added as `debug` in development and never sent in production.
 * `extra` carries fields the client reads (such as a `code`).
 */
export function errorJson(
  friendly: string,
  status: number,
  cause?: unknown,
  extra?: Record<string, unknown>
) {
  const debug = isProduction() ? undefined : describeError(cause);
  return NextResponse.json({ ...extra, error: friendly, ...(debug ? { debug } : {}) }, { status });
}
