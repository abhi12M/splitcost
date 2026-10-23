// Lets the browser confirm it can reach the server again after going offline.
// Answered by the server every time, never from a build-time copy.
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
