import type { Metadata } from "next";
import { ViewTransition } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostShell } from "@/components/posts/post-shell";
import { PostToc } from "@/components/posts/post-toc";
import { formatPostDate, getAllPosts, getPost } from "@/lib/posts";

export async function generateStaticParams() {
  return (await getAllPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/posts/[slug]">): Promise<Metadata> {
  const post = await getPost((await params).slug);
  return post
    ? { title: `${post.title} · Vincent Wang`, description: post.summary }
    : { title: "Post not found · Vincent Wang" };
}

// One post: header, Markdown body and (from lg) a sticky contents list on the right.
// The title morphs from the list row (shared view-transition name); the body rises in.
export default async function PostPage({ params }: PageProps<"/posts/[slug]">) {
  const post = await getPost((await params).slug);
  if (!post) notFound();

  return (
    <PostShell
      path={
        <>
          <span>/</span>
          <Link href="/posts" className="underline-offset-4 hover:text-foreground hover:underline">
            posts
          </Link>
        </>
      }
    >
      {/* Reading progress (CSS scroll-driven animation; hidden where unsupported). */}
      <div aria-hidden className="read-progress" />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_13rem] lg:gap-16">
        <article lang="en-GB" className="min-w-0">
          <header className="mb-10 max-w-[68ch]">
            <p className="font-mono text-xs text-muted-foreground">
              <time dateTime={post.date}>{formatPostDate(post.date)}</time> · {post.readingMinutes} min read
            </p>
            <ViewTransition name={`post-title-${post.slug}`} share="post-morph" default="none">
              <h1 className="mt-3 text-[clamp(1.75rem,5vw,2.5rem)] leading-tight font-semibold tracking-tight text-balance">
                {post.title}
              </h1>
            </ViewTransition>
            {post.summary && (
              <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">{post.summary}</p>
            )}
          </header>

          <ViewTransition enter="post-enter" default="none">
            <div className="post-prose" dangerouslySetInnerHTML={{ __html: post.html }} />
          </ViewTransition>

          <footer className="mt-14 max-w-[68ch] border-t pt-6">
            <Link
              href="/posts"
              className="font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              ← all posts
            </Link>
          </footer>
        </article>

        {post.toc.length > 0 && (
          <aside className="hidden lg:block">
            <PostToc items={post.toc} />
          </aside>
        )}
      </div>
    </PostShell>
  );
}
