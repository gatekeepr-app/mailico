import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-xl text-center">
        <p className="text-sm font-medium text-muted-foreground">Mailico</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          Internal mail for teams.
        </h1>
        <p className="mt-4 text-muted-foreground">
          Marketing page placeholder. The authenticated employee mail tool lives
          at <code className="font-mono">/mail</code>.
        </p>
        <Button asChild className="mt-6">
          <Link href="/mail">Open Mailico</Link>
        </Button>
      </div>
    </main>
  );
}
