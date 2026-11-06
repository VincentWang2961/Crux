import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Crux</h1>
      <p className="max-w-md text-muted-foreground">
        Next.js + shadcn/ui starter. Edit <code>src/app/page.tsx</code> to get
        started.
      </p>
      <Button>Get started</Button>
    </main>
  );
}
