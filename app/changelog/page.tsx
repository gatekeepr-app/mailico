import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

export default async function ChangelogPage() {
  const file = await readFile(path.join(process.cwd(), "opencode.md"), "utf8");
  const lines = file.split("\n");

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-10 text-foreground">
      <article className="mx-auto max-w-4xl min-w-0 rounded-2xl border bg-background p-4 shadow-sm sm:p-6 md:p-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-muted-foreground">Mailico</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Project Changelog
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Rendered from <code>opencode.md</code> so future agent sessions and
            the app route share the same source of truth.
          </p>
        </div>

        <div className="space-y-2">
          {lines.map((line, index) => {
            if (line.startsWith("# ")) {
              return null;
            }
            if (line.startsWith("## ")) {
              return (
                <h2
                  key={index}
                  className="pt-6 text-xl font-semibold tracking-tight"
                >
                  {line.replace(/^## /, "")}
                </h2>
              );
            }
            if (line.startsWith("- ")) {
              return (
                <p key={index} className="pl-4 text-sm leading-6 text-muted-foreground">
                  <span className="mr-2 text-foreground">•</span>
                  {line.replace(/^- /, "")}
                </p>
              );
            }
            if (line.trim() === "") {
              return <div key={index} className="h-2" />;
            }
            return (
              <p key={index} className="break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
                {line}
              </p>
            );
          })}
        </div>
      </article>
    </main>
  );
}
