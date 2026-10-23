import { NextResponse } from "next/server";

export const INVALID_BODY_ERROR = "Invalid request body";
export const BODY_TOO_LARGE_ERROR = "Request body too large";

export const MAX_JSON_BODY_BYTES = 102_400; // 100 KB
export const MAX_FORM_BODY_BYTES = 10 * 1024 * 1024; // 10 MB

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = Record<string, any>;

type BodyResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

function invalidBody(): { ok: false; response: NextResponse } {
  return { ok: false, response: NextResponse.json({ error: INVALID_BODY_ERROR }, { status: 400 }) };
}

function tooLarge(): { ok: false; response: NextResponse } {
  return { ok: false, response: NextResponse.json({ error: BODY_TOO_LARGE_ERROR }, { status: 413 }) };
}

type ReadJsonOptions = {
  maxBytes?: number;
  allowedKeys?: readonly string[];
};

export async function readJsonObject(
  req: Request,
  options?: ReadJsonOptions
): Promise<BodyResult<JsonObject>> {
  const { maxBytes = MAX_JSON_BODY_BYTES, allowedKeys } = options ?? {};

  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    return tooLarge();
  }

  let buf: ArrayBuffer;
  try {
    buf = await req.arrayBuffer();
  } catch {
    return invalidBody();
  }

  if (buf.byteLength > maxBytes) {
    return tooLarge();
  }

  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(buf));
  } catch {
    return invalidBody();
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) return invalidBody();

  if (allowedKeys) {
    const raw = body as Record<string, unknown>;
    const filtered: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (key in raw) {
        filtered[key] = raw[key];
      }
    }
    return { ok: true, data: filtered };
  }

  return { ok: true, data: body as JsonObject };
}

export async function readFormData(
  req: Request,
  options?: { maxBytes?: number }
): Promise<BodyResult<FormData>> {
  const { maxBytes = MAX_FORM_BODY_BYTES } = options ?? {};

  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    return tooLarge();
  }

  try {
    return { ok: true, data: await req.formData() };
  } catch {
    return invalidBody();
  }
}
