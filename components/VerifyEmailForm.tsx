"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function VerifyEmailForm({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signedInEmail = session?.user?.email;
  const address = signedInEmail ?? email;
  const alreadyVerified = Boolean(session?.user?.emailVerified);

  async function resendVerification() {
    if (!address.trim()) {
      setError("Enter the real email address on your Mailico account.");
      return;
    }
    setSending(true);
    setError(null);
    setSent(false);
    const { error: resendError } = await authClient.sendVerificationEmail({
      email: address.trim(),
      callbackURL: "/mail",
    });
    setSending(false);
    if (resendError) {
      setError(resendError.message ?? "Could not send the verification email. Try signing in again.");
      return;
    }
    setSent(true);
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f5f0] px-4 py-10 text-[#1c2824]">
      <section className="flow-enter w-full max-w-lg border border-[#d9ddd6] bg-white p-6 shadow-sm sm:p-9">
        <span className="mb-5 flex size-11 items-center justify-center bg-[#193e37] text-white">
          <EnvelopeSimple size={21} />
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#286653]">Secure account access</p>
        <h1 className="mt-2 text-2xl font-medium tracking-[-0.035em] sm:text-3xl">Verify your real email</h1>
        <p className="mt-3 text-sm leading-6 text-[#68746e]">
          Mailico needs a verified real email before it can open your company mailbox. We’ll send a secure link that returns you to your inbox.
        </p>

        {alreadyVerified ? (
          <div className="mt-6 rounded border border-[#d9e7de] bg-[#f3f8f4] p-4">
            <p className="text-sm text-[#245b49]">This account is verified. Continue to your mailbox.</p>
            <Button onClick={() => { router.push("/mail"); router.refresh(); }} className="mt-4 min-h-11 rounded-none bg-[#286653] text-white hover:bg-[#1f5544]">
              Open Mailico
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <label htmlFor="verification-email" className="text-sm font-medium text-[#24352e]">Real email address</label>
            <Input
              id="verification-email"
              type="email"
              autoComplete="email"
              value={address}
              onChange={(event) => setEmail(event.target.value)}
              readOnly={Boolean(signedInEmail)}
              className="min-h-11 rounded-none border-[#cbd3cc]"
              placeholder="you@example.com"
            />
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            {sent && (
              <p role="status" className="rounded border border-[#d9e7de] bg-[#f3f8f4] p-3 text-sm leading-5 text-[#245b49]">
                If this address has an unverified Mailico account, a verification link is on its way. Check your inbox and spam folder.
              </p>
            )}
            <Button onClick={() => void resendVerification()} disabled={sending || !address.trim()} className="min-h-11 w-full rounded-none bg-[#286653] text-white hover:bg-[#1f5544]">
              {sending ? "Sending…" : sent ? "Resend verification email" : "Send verification email"}
            </Button>
          </div>
        )}

        <div className="mt-6 border-t border-[#e5e8e1] pt-4 text-sm text-[#68746e]">
          <Link href="/login" className="font-medium text-[#286653] underline-offset-4 hover:underline">Back to sign in</Link>
        </div>
      </section>
    </main>
  );
}
