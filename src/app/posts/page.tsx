import type { Metadata } from "next";
import Link from "next/link";
import { PostList } from "@/components/posts/post-list";
import { PostShell } from "@/components/posts/post-shell";
import { getAllPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Posts · Vincent Wang",
  description: "Short notes on IT, infrastructure and the news around them.",
};

export default async function PostsPage() {
  const posts = await getAllPosts();
  return (
    <PostShell
      path={
        <>
          <span>/</span>
          <Link href="/posts" aria-current="page" className="text-foreground">
            posts
          </Link>
        </>
      }
    >
      <p aria-hidden className="font-mono text-xs text-muted-foreground">
        $ ls ~/posts
      </p>
      <h1 className="mt-1 mb-8 text-2xl font-semibold tracking-tight">Posts</h1>
      <PostList posts={posts} />
    </PostShell>
  );
}
