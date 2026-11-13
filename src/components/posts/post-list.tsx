import { ViewTransition } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HTML_LANG, formatPostDate, type PostMeta } from "@/lib/posts";

// Post rows for the home section and /posts. Each title shares a view-transition name
// with the post page's heading, so opening a post morphs the title into place.
export function PostList({ posts }: { posts: PostMeta[] }) {
  if (posts.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing published yet.</p>;
  }
  return (
    <ul className="flex flex-col">
      {posts.map((post) => (
        <li key={post.slug} className="border-b first:border-t">
          <Link
            href={`/posts/${post.slug}`}
            className="group grid gap-1.5 py-5 outline-none sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-6 focus-visible:bg-muted/50"
          >
            <span className="font-mono text-xs leading-6 text-muted-foreground">
              <time dateTime={post.date}>{formatPostDate(post.date)}</time>
            </span>
            <span lang={HTML_LANG[post.lang]} className="flex min-w-0 flex-col gap-1.5">
              <span className="flex items-start justify-between gap-4">
                <ViewTransition name={`post-title-${post.slug}`} share="post-morph" default="none">
                  <span className="text-base font-semibold tracking-tight text-balance decoration-foreground/30 underline-offset-4 group-hover:underline">
                    {post.title}
                  </span>
                </ViewTransition>
                <ArrowRight
                  aria-hidden
                  className="mt-1 size-4 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-[opacity,translate] duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none"
                />
              </span>
              {post.summary && (
                <span className="text-sm leading-relaxed text-muted-foreground">{post.summary}</span>
              )}
              <span className="font-mono text-[0.6875rem] text-muted-foreground/80">
                {post.readingMinutes} min read
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
