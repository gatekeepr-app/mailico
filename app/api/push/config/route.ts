export const runtime = "nodejs";

export async function GET() {
  const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  const secret = process.env.MAILICO_INTERNAL_SECRET;
  if (!convexSiteUrl || !secret) {
    return Response.json({ enabled: false }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  try {
    const response = await fetch(`${convexSiteUrl.replace(/\/$/, "")}/notifications/config`, {
      headers: { "x-mailico-secret": secret },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Push configuration is unavailable.");
    const config = await response.json() as { enabled?: unknown; publicKey?: unknown };
    const enabled = config.enabled === true && typeof config.publicKey === "string";
    return Response.json(
      enabled ? { enabled: true, publicKey: config.publicKey } : { enabled: false },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return Response.json({ enabled: false }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
