import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// A clearly labelled "back" button (arrow + words, 40 px tall) for visitors who don't
// rely on the browser's back button or on breadcrumbs.
export function BackLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex h-10 w-fit items-center gap-2 rounded-full border pr-4 pl-3 font-mono text-xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        className,
      )}
    >
      <ArrowLeft
        aria-hidden
        className="size-4 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none"
      />
      {label}
    </Link>
  );
}
