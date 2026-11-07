import type { ReactNode } from "react";

// Shared frame for the CV sections between the hero and the globe. On `md` and up the
// title sits in a narrow left column; on phones it stacks above the content. The mono
// "$ command" line echoes the terminal style of the hero.
export function Section({
  id,
  command,
  title,
  children,
}: {
  id: string;
  command: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="grid scroll-mt-8 gap-5 border-t pt-8 md:grid-cols-[10rem_1fr] md:gap-10 md:pt-10"
    >
      <header>
        <p aria-hidden className="font-mono text-xs text-muted-foreground">
          $ {command}
        </p>
        <h2 id={`${id}-title`} className="mt-1 text-lg font-semibold tracking-tight">
          {title}
        </h2>
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
