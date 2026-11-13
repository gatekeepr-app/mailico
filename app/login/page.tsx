"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EnvelopeSimple, Eye, EyeSlash } from "@phosphor-icons/react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });
    setLoading(false);

    if (signInError) {
      setError(signInError.message ?? "Invalid email or password.");
      toast.error(signInError.message ?? "Invalid email or password.");
      return;
    }

    toast.success("Signed in!");
    router.push("/mail");
    router.refresh();
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      toast.error("Enter a valid email address.");
      return;
    }
    setResetLoading(true);
    const { error: resetError } = await authClient.requestPasswordReset({
      email: resetEmail,
      redirectTo: "/mail",
    });
    setResetLoading(false);
    if (resetError) {
      toast.error(resetError.message ?? "Could not send reset email.");
      return;
    }
    toast.success("If the account exists, a reset link has been sent.");
    setForgotOpen(false);
  }

  return (
    <main className="grid min-h-[100dvh] bg-[#f5f5f0] text-[#1c2824] lg:grid-cols-[minmax(18rem,0.78fr)_minmax(0,1.22fr)]">
      <aside className="flex flex-col justify-between bg-[#193e37] px-7 py-8 text-[#f4f5ef] sm:px-10 lg:min-h-[100dvh] lg:px-12 lg:py-12">
        <Link href="/" className="flex w-fit items-center gap-3" aria-label="Mailico home">
          <span className="flex size-10 items-center justify-center border border-white/20 bg-white/5"><EnvelopeSimple size={19} /></span>
          <span className="text-sm font-semibold tracking-wide">Mailico</span>
        </Link>
        <div className="my-12 max-w-sm lg:my-auto">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#b7d6c9]">Your work, in one place</p>
          <p className="mt-4 text-3xl font-medium leading-tight tracking-[-0.035em] sm:text-4xl">A calmer home for company email.</p>
          <p className="mt-4 text-sm leading-6 text-white/70">Sign in to continue to your team mailbox and workspace.</p>
        </div>
        <p className="hidden text-xs text-white/45 lg:block">Secure access for your organization</p>
      </aside>

      <section className="flow-enter flex min-w-0 items-center justify-center px-5 py-10 sm:px-10 lg:px-[8%]">
      <Card className="w-full max-w-md rounded-none border-0 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle className="text-3xl font-medium tracking-[-0.04em]">Welcome back</CardTitle>
          <CardDescription>Sign in with your account email to open your workspace.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              New to Mailico?{" "}
              <Link href="/register" className="font-medium text-[#286653] hover:underline">
                Create an account
              </Link>
            </p>
            <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="link" className="h-auto p-0">
                  Forgot password?
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset password</DialogTitle>
                  <DialogDescription>
                    Enter your account email and we will send a reset link if
                    the account exists.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(event) => setResetEmail(event.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={resetLoading}>
                      {resetLoading ? "Sending…" : "Send reset link"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </form>
      </Card>
      </section>
    </main>
  );
}
