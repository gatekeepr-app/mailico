import { api } from "@/convex/_generated/api";
import { fetchAuthMutation, fetchAuthQuery } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESEND_PAGE_SIZE = 100;
const RESEND_MAX_PAGES = 10;
const RESEND_TOTAL_TIMEOUT_MS = 10_000;

type SetupStatus =
  | "missing_key"
  | "invalid_key"
  | "domain_missing"
  | "pending"
  | "partially_verified"
  | "failed"
  | "verified";

async function saveAndReturn(status: SetupStatus, message?: string) {
  await fetchAuthMutation(api.profiles.setResendStatus, { status });
  return Response.json({ status, message });
}

export async function POST() {
  let profileData;
  try {
    profileData = await fetchAuthQuery(api.profiles.getMyProfile, {});
  } catch {
    return Response.json({ error: "Sign in to check Resend setup." }, { status: 401 });
  }

  const settings = profileData?.companySettings;
  if (!settings || !settings.isOwner || profileData?.profile?.role !== "admin") {
    return Response.json({ error: "Only the business owner can check Resend setup." }, { status: 403 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return await saveAndReturn("missing_key");

  let cursor: string | undefined;
  const seenCursors = new Set<string>();
  let domain: {
    name?: unknown;
    status?: unknown;
    capabilities?: { sending?: unknown };
  } | undefined;
  const deadline = Date.now() + RESEND_TOTAL_TIMEOUT_MS;

  for (let page = 0; page < RESEND_MAX_PAGES; page += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      return Response.json({ error: "Resend could not be reached. Try again shortly." }, { status: 502 });
    }

    const url = new URL("https://api.resend.com/domains");
    url.searchParams.set("limit", String(RESEND_PAGE_SIZE));
    if (cursor) url.searchParams.set("after", cursor);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(remainingMs),
        cache: "no-store",
      });
    } catch {
      return Response.json({ error: "Resend could not be reached. Try again shortly." }, { status: 502 });
    }

    if (response.status === 401 || response.status === 403) {
      return await saveAndReturn("invalid_key");
    }
    if (!response.ok) {
      return Response.json({ error: "Resend returned an error while checking domains." }, { status: 502 });
    }

    const result = await response.json().catch(() => null);
    if (!result || !Array.isArray(result.data) || typeof result.has_more !== "boolean") {
      return Response.json({ error: "Resend returned an invalid domain response. Try again shortly." }, { status: 502 });
    }

    const domains: Array<{
      id?: unknown;
      name?: unknown;
      status?: unknown;
      capabilities?: { sending?: unknown };
    }> = result.data;
    domain = domains.find(
      (item) => typeof item.name === "string" && item.name.toLowerCase() === settings.domain,
    );
    if (domain) break;

    if (!result.has_more) break;
    const nextCursor = domains.at(-1)?.id;
    if (typeof nextCursor !== "string" || nextCursor.length === 0 || seenCursors.has(nextCursor)) {
      return Response.json({ error: "Resend returned an invalid domain response. Try again shortly." }, { status: 502 });
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;

    if (page === RESEND_MAX_PAGES - 1) {
      return Response.json({ error: "Resend domain lookup is incomplete. Try again shortly." }, { status: 502 });
    }
  }

  if (!domain) return await saveAndReturn("domain_missing");

  const resendStatus = typeof domain.status === "string" ? domain.status.toLowerCase() : "pending";
  const status: SetupStatus =
    resendStatus === "verified" && domain.capabilities?.sending === "enabled"
      ? "verified"
      : resendStatus === "partially_verified"
        ? "partially_verified"
        : resendStatus === "failed"
          ? "failed"
          : "pending";
  return await saveAndReturn(status);
}
