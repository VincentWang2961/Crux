"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy } from "lucide-react";
import type { Lang } from "@/lib/posts";

const noop = () => () => {};

// Repost notice under each post, in the post's language, with the original URL and a
// copy button so credit is one click away.
export function PostCopyright({ lang, year, path }: { lang: Lang; year: string; path: string }) {
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const url = origin + path;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <section
      aria-label={lang === "zh" ? "版权声明" : "Copyright"}
      className="rounded-xl border border-dashed p-4 text-sm leading-relaxed text-muted-foreground sm:p-5"
    >
      <p>
        {lang === "zh"
          ? `© ${year} Vincent Wang。欢迎转载或分享本文，请注明作者并附上原文链接。`
          : `© ${year} Vincent Wang. You're welcome to repost or share this article, as long as you credit the author and link to the original.`}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs">
        <span>{lang === "zh" ? "原文：" : "Original:"}</span>
        <a href={path} className="break-all text-foreground underline underline-offset-4">
          {url}
        </a>
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border px-3 transition-colors hover:bg-muted"
        >
          {copied ? <Check aria-hidden className="size-3.5" /> : <Copy aria-hidden className="size-3.5" />}
          <span aria-live="polite">
            {copied ? (lang === "zh" ? "已复制" : "Copied") : lang === "zh" ? "复制链接" : "Copy link"}
          </span>
        </button>
      </div>
    </section>
  );
}
