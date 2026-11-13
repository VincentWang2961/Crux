import type { Metadata } from "next";
import { BackLink } from "@/components/posts/back-link";
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
    <PostShell>
      <BackLink href="/" label="Home" className="mb-8" />
      <p aria-hidden className="font-mono text-xs text-muted-foreground">
        $ ls ~/posts
      </p>
      <h1 className="mt-1 mb-2 text-2xl font-semibold tracking-tight">Posts</h1>
      <p className="mb-8 max-w-prose text-sm text-muted-foreground">
        Notes on IT, infrastructure and the news around them. Most posts can be read in English or Chinese.
      </p>
      <PostList posts={posts} />
    </PostShell>
  );
}
