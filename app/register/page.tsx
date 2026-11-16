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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: signUpError } = await authClient.signUp.email({
      email,
      password,
      name: name.trim(),
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message ?? "Something went wrong. Try again.");
      toast.error(signUpError.message ?? "Something went wrong. Try again.");
      return;
    }

    toast.success("Account created. Check your real email to verify it before signing in.");
    router.push("/login");
  }

  return (
    <main className="grid min-h-[100dvh] bg-[#f5f5f0] text-[#1c2824] lg:grid-cols-[minmax(18rem,0.78fr)_minmax(0,1.22fr)]">
      <aside className="flex flex-col justify-between bg-[#193e37] px-7 py-8 text-[#f4f5ef] sm:px-10 lg:min-h-[100dvh] lg:px-12 lg:py-12">
        <Link href="/" className="flex w-fit items-center gap-3" aria-label="Mailico home">
          <span className="flex size-10 items-center justify-center border border-white/20 bg-white/5"><EnvelopeSimple size={19} /></span>
          <span className="text-sm font-semibold tracking-wide">Mailico</span>
        </Link>
        <div className="my-12 max-w-sm lg:my-auto">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#b7d6c9]">Start with your team</p>
          <p className="mt-4 text-3xl font-medium leading-tight tracking-[-0.035em] sm:text-4xl">Set up the address your business sends from.</p>
          <p className="mt-4 text-sm leading-6 text-white/70">Create your account first. We’ll guide you through the company domain and owner mailbox next.</p>
        </div>
        <p className="hidden text-xs text-white/45 lg:block">A shared workspace, ready for your team</p>
      </aside>

      <section className="flow-enter flex min-w-0 items-center justify-center px-5 py-10 sm:px-10 lg:px-[8%]">
      <Card className="w-full max-w-md rounded-none border-0 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle className="text-3xl font-medium tracking-[-0.04em]">Create your account</CardTitle>
          <CardDescription>
            Create the business owner account here. After setup, employees join through an invitation from the administrator.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                autoComplete="name"
                required
              />
            </div>
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
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
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
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Sign up"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-[#286653] hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
      </section>
    </main>
  );
}
