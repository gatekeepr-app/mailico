import { timingSafeEqual } from "node:crypto";
import { api } from "@/convex/_generated/api";
import { fetchAuthQuery } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SETUP_BODY_BYTES = 8_192;

export async function POST(request: Request) {
  let profileData;
  try {
    profileData = await fetchAuthQuery(api.profiles.getMyProfile, {});
  } catch {
    return Response.json({ error: "Sign in before completing company setup." }, { status: 401 });
  }
  const user = profileData?.user;
  if (!user?._id || !user.email) {
    return Response.json({ error: "Sign in before completing company setup." }, { status: 401 });
  }
  if (profileData?.companySettings) {
    return Response.json({ error: "Company setup has already been completed." }, { status: 409 });
  }

  const bootstrapToken = process.env.MAILICO_OWNER_SETUP_TOKEN;
  if (!bootstrapToken || bootstrapToken.length < 32) {
    return Response.json(
      { error: "Owner setup is not configured. Ask the deployment operator to configure a strong setup token." },
      { status: 503 },
    );
  }

  const internalSecret = process.env.MAILICO_INTERNAL_SECRET;
  const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  if (!internalSecret || !convexSiteUrl) {
    return Response.json({ error: "Owner setup is not configured on the server." }, { status: 503 });
  }

  let payload: unknown;
  try {
    const declaredLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_SETUP_BODY_BYTES) {
      return Response.json({ error: "Setup request is too large." }, { status: 413 });
    }
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_SETUP_BODY_BYTES) {
      return Response.json({ error: "Setup request is too large." }, { status: 413 });
    }
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid setup request." }, { status: 400 });
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return Response.json({ error: "Invalid setup request." }, { status: 400 });
  }
  const data = payload as Record<string, unknown>;
  if (
    typeof data.bootstrapToken !== "string" ||
    typeof data.domain !== "string" ||
    typeof data.ownerLocalPart !== "string"
  ) {
    return Response.json({ error: "Complete all owner setup fields." }, { status: 400 });
  }

  const candidate = Buffer.from(data.bootstrapToken, "utf8");
  const expected = Buffer.from(bootstrapToken, "utf8");
  if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) {
    return Response.json({ error: "The owner setup token is invalid." }, { status: 403 });
  }

  let response: Response;
  try {
    response = await fetch(`${convexSiteUrl.replace(/\/$/, "")}/setup/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mailico-secret": internalSecret,
      },
      body: JSON.stringify({
        domain: data.domain,
        ownerLocalPart: data.ownerLocalPart,
        ownerAuthUserId: user._id,
        ownerEmail: user.email,
        ownerName: user.name ?? "",
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return Response.json({ error: "Could not save company setup. Try again." }, { status: 502 });
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return Response.json(
      { error: result?.error ?? "Could not save company setup." },
      { status: response.status },
    );
  }
  return Response.json(result);
}
