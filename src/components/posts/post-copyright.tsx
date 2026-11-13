"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy } from "lucide-react";
import type { Lang } from "@/lib/posts";

const noop = () => () => {};

const LICENSE = {
  en: "https://creativecommons.org/licenses/by/4.0/",
  zh: "https://creativecommons.org/licenses/by/4.0/deed.zh-hans",
};

// Licence notice (CC BY 4.0) under each post, in the post's language, with the original URL and a
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
      {lang === "zh" ? (
        <p>
          © {year} Vincent Wang。本文采用{" "}
          <a href={LICENSE.zh} rel="license noreferrer" target="_blank" className="text-foreground underline underline-offset-4">
            知识共享署名 4.0 国际许可协议（CC BY 4.0）
          </a>
          。欢迎转载、分享或改编，请注明作者并附上原文链接。
        </p>
      ) : (
        <p>
          © {year} Vincent Wang. Licensed under{" "}
          <a href={LICENSE.en} rel="license noreferrer" target="_blank" className="text-foreground underline underline-offset-4">
            Creative Commons Attribution 4.0 International (CC BY 4.0)
          </a>
          . You&apos;re welcome to repost, share or adapt it, as long as you credit the author and link to the original.
        </p>
      )}
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
