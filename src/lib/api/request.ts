// Reading request bodies safely: a body that can't be read answers 400 with a
// clear error instead of crashing the route with a 500.
import { NextResponse } from "next/server";

export const INVALID_BODY_ERROR = "Invalid request body";

/**
 * The same type `req.json()` gives, so existing route code keeps working
 * unchanged. Field-level checks belong to each route's validation.
 */
type JsonObject = Awaited<ReturnType<Request["json"]>>;

type BodyResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

function invalidBody(): { ok: false; response: NextResponse } {
  return { ok: false, response: NextResponse.json({ error: INVALID_BODY_ERROR }, { status: 400 }) };
}

/** A JSON object body. Malformed JSON, or JSON that isn't an object (null, a string, a list), answers 400. */
export async function readJsonObject(req: Request): Promise<BodyResult<JsonObject>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return invalidBody();
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return invalidBody();
  return { ok: true, data: body };
}

/** A multipart form body (file uploads). An unreadable body answers 400. */
export async function readFormData(req: Request): Promise<BodyResult<FormData>> {
  try {
    return { ok: true, data: await req.formData() };
  } catch {
    return invalidBody();
  }
}
