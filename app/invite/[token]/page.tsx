"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function EmployeeInvitationPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [tokenHash, setTokenHash] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [existingAccount, setExistingAccount] = useState(false);
  const invitation = useQuery(api.profiles.getEmployeeInvitation, tokenHash ? { tokenHash } : "skip");

  useEffect(() => {
    let active = true;
    void hashToken(token).then((hash) => {
      if (active) setTokenHash(hash);
    }).catch(() => {
      if (active) setError("This invitation link could not be checked. Open it in a current browser and try again.");
    });
    return () => { active = false; };
  }, [token]);

  async function accept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!invitation) return;
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setCreating(true);
    try {
      const { error: signUpError } = await authClient.signUp.email({
        name: invitation.name,
        email: invitation.accountEmail,
        password,
        callbackURL: "/mail",
      });
      if (signUpError) {
        if (/already|exists|registered/i.test(signUpError.message ?? "")) {
          setExistingAccount(true);
          return;
        }
        throw new Error(signUpError.message ?? "Could not create your account.");
      }
      setVerificationSent(true);
      setPassword("");
      setConfirmPassword("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create your account.");
    } finally {
      setCreating(false);
    }
  }

  const loading = !tokenHash || invitation === undefined;

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f5f0] px-4 py-8 text-[#1c2824]">
      <Card className="w-full max-w-lg rounded-none border-[#d9ddd6] shadow-none">
        <CardHeader>
          <Link href="/" className="mb-3 flex w-fit items-center gap-2 text-sm font-semibold" aria-label="Mailico home">
            <span className="flex size-8 items-center justify-center bg-[#193e37] text-white"><EnvelopeSimple size={17} /></span>
            Mailico
          </Link>
          <CardTitle className="text-3xl font-medium tracking-[-0.04em]">
            {verificationSent ? "Verify your email" : existingAccount ? "Sign in to finish setup" : "Set up your company account"}
          </CardTitle>
          <CardDescription>
            {existingAccount
              ? `An account already exists for ${invitation?.accountEmail}. Sign in with that account to accept the company invitation.`
              : verificationSent
              ? `We sent a verification link to ${invitation?.accountEmail}. Verify that address before signing in.`
              : "Accept your administrator’s invitation, create a password, and verify your real email address. Your department HR Lead can review messages sent from department accounts."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Checking invitation…</p>
          ) : !invitation ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">This invitation is invalid, expired, or has already been used.</p>
              <p className="text-sm text-muted-foreground">Ask your administrator to send a new invitation.</p>
            </div>
          ) : existingAccount ? (
            <div className="space-y-3 border border-[#d9ddd6] bg-[#fbfbf8] p-4 text-sm">
              <p><span className="font-medium">Company address:</span> {invitation.assignedEmail}</p>
              <p><span className="font-medium">Department:</span> {invitation.department}</p>
              <p className="text-muted-foreground">After signing in, Mailico will attach this address and department to your account. If your email is not verified yet, sign-in will send a verification link.</p>
              <Button asChild className="min-h-11 w-full rounded-none bg-[#286653] text-white hover:bg-[#1f5544]">
                <Link href="/login">Sign in to accept invitation</Link>
              </Button>
            </div>
          ) : verificationSent ? (
            <div className="space-y-3 border border-[#d9ddd6] bg-[#fbfbf8] p-4 text-sm">
              <p><span className="font-medium">Company address:</span> {invitation.assignedEmail}</p>
              <p><span className="font-medium">Department:</span> {invitation.department}</p>
              <p className="text-muted-foreground">The verification link expires according to the email instructions. After verification, your account can sign in to Mailico.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="border border-[#d9ddd6] bg-[#fbfbf8] p-4 text-sm">
                <p className="font-medium">{invitation.name}</p>
                <p className="break-all text-muted-foreground">{invitation.accountEmail}</p>
                <p className="mt-2 font-medium text-[#286653]">{invitation.assignedEmail}</p>
                <p className="text-xs text-muted-foreground">{invitation.department} · {invitation.role === "hrLead" ? "Department HR Lead" : "Employee"}</p>
              </div>
              <form onSubmit={accept} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employee-new-password">Create password</Label>
                  <Input id="employee-new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee-confirm-password">Confirm password</Label>
                  <Input id="employee-confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
                </div>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={creating} className="min-h-11 w-full rounded-none bg-[#286653] text-white hover:bg-[#1f5544]">
                  {creating ? "Creating account…" : "Create account and verify email"}
                </Button>
              </form>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t border-[#e5e8e1] pt-4">
          <p className="text-sm text-muted-foreground">Already finished setup? <Link href="/login" className="font-medium text-[#286653] hover:underline">Sign in</Link></p>
        </CardFooter>
      </Card>
    </main>
  );
}
