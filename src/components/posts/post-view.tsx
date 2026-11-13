import { ViewTransition } from "react";
import { BackLink } from "./back-link";
import { PostCopyright } from "./post-copyright";
import { PostImageZoom } from "./post-image-zoom";
import { PostLanguage } from "./post-language";
import { PostShell } from "./post-shell";
import { PostToc } from "./post-toc";
import { HTML_LANG, LANG_NAME_IN, formatPostDate, type Post } from "@/lib/posts";

// One post in one language (shared by /posts/<slug> and /posts/<slug>/<lang>).
// Header (back button, date, title, summary, language pill), Markdown body, repost
// notice, and from lg a sticky contents list. The title morphs in from the list row
// (and between languages); the body rises in.
export function PostView({ post }: { post: Post }) {
  const zh = post.lang === "zh";
  const bodyId = `post-body-${post.slug}`;
  const path = post.versions.find((v) => v.lang === post.lang)!.href;
  const original = post.versions.find((v) => v.lang === post.sourceLang)!;

  return (
    <PostShell
      crumbs={[{ label: "posts", href: "/posts" }, { label: post.slug }]}
      back={{ href: "/posts", label: zh ? "全部文章" : "All posts" }}
    >
      {/* Reading progress (CSS scroll-driven; md and up only). */}
      <div aria-hidden className="read-progress" />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_13rem] lg:gap-16">
        <article lang={HTML_LANG[post.lang]} className="min-w-0">
          <header className="mb-10 max-w-[68ch]">
            <p className="font-mono text-xs text-muted-foreground">
              <time dateTime={post.date}>{formatPostDate(post.date, post.lang)}</time> ·{" "}
              {zh ? `${post.readingMinutes} 分钟阅读` : `${post.readingMinutes} min read`}
            </p>
            <ViewTransition name={`post-title-${post.slug}`} share="post-morph" default="none">
              <h1 className="mt-3 text-[clamp(1.75rem,5vw,2.5rem)] leading-tight font-semibold tracking-tight text-balance">
                {post.title}
              </h1>
            </ViewTransition>
            {post.summary && (
              <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">{post.summary}</p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
              <PostLanguage current={post.lang} versions={post.versions} />
              {post.translated && (
                <p className="text-xs text-muted-foreground">
                  {zh ? (
                    <>
                      本文由 AI 从{LANG_NAME_IN.zh[post.sourceLang]}翻译 ·{" "}
                      <a href={original.href} className="underline underline-offset-4 hover:text-foreground">
                        查看原文
                      </a>
                    </>
                  ) : (
                    <>
                      Translated from {LANG_NAME_IN.en[post.sourceLang]} by AI ·{" "}
                      <a href={original.href} className="underline underline-offset-4 hover:text-foreground">
                        read the original
                      </a>
                    </>
                  )}
                </p>
              )}
            </div>
          </header>

          <ViewTransition enter="post-enter" default="none">
            <div id={bodyId} className="post-prose" dangerouslySetInnerHTML={{ __html: post.html }} />
          </ViewTransition>
          <PostImageZoom targetId={bodyId} />

          <footer className="mt-14 flex max-w-[68ch] flex-col gap-8 border-t pt-8">
            <PostCopyright lang={post.lang} year={post.date.slice(0, 4)} path={path} />
            <BackLink href="/posts" label={zh ? "返回全部文章" : "Back to all posts"} />
          </footer>
        </article>

        {post.toc.length > 0 && (
          <aside className="hidden lg:block">
            <PostToc items={post.toc} title={zh ? "目录" : "contents"} />
          </aside>
        )}
      </div>
    </PostShell>
  );
}
