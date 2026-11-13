import Link from "next/link";
import { Languages } from "lucide-react";
import { LANG_NAME, type Lang, type PostVersion } from "@/lib/posts";

// The one language control: a pill naming the other language ("中文" / "English").
// With more languages later, it becomes a short row of the same pills.
export function PostLanguage({ current, versions }: { current: Lang; versions: PostVersion[] }) {
  const others = versions.filter((v) => v.lang !== current);
  if (others.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {others.map((v) => (
        <Link
          key={v.lang}
          href={v.href}
          hrefLang={v.lang}
          lang={v.lang}
          aria-label={v.lang === "zh" ? "阅读中文版" : "Read in English"}
          className="inline-flex h-10 items-center gap-2 rounded-full border px-4 font-mono text-xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          <Languages aria-hidden className="size-4" />
          {LANG_NAME[v.lang]}
        </Link>
      ))}
    </div>
  );
}
