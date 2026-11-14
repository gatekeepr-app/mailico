"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function LogoutPage() {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    setError(null);

    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError(result.error.message ?? "Could not sign out. Please try again.");
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setError("Could not sign out. Check your connection and try again.");
    } finally {
      setSigningOut(false);
    }
  }, [router]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void signOut();
  }, [signOut]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f5f0] px-5 text-[#1c2824]">
      <section className="w-full max-w-sm border border-[#e0e4dd] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex size-11 items-center justify-center border border-[#d9e4dc] bg-[#f3f7f3] text-[#286653]">
          <EnvelopeSimple size={20} />
        </div>
        <h1 className="mt-5 text-xl font-semibold">{error ? "Sign out paused" : "Signing you out"}</h1>
        <p className="mt-2 text-sm leading-6 text-[#68746e]">
          {error ?? "Your Mailico session is being closed."}
        </p>
        {error && (
          <Button
            type="button"
            onClick={() => void signOut()}
            disabled={signingOut}
            className="mt-6 w-full rounded-none bg-[#286653] text-white hover:bg-[#1f5544]"
          >
            {signingOut ? "Signing out…" : "Try again"}
          </Button>
        )}
      </section>
    </main>
  );
}
