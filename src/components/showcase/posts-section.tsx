import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { PostList } from "@/components/posts/post-list";
import { Section } from "./section";

const HOME_LIMIT = 3;

// Latest posts on the home page; the full list lives at /posts.
export async function PostsSection() {
  const posts = await getAllPosts();
  return (
    <Section id="posts" command="ls ~/posts" title="Posts">
      <PostList posts={posts.slice(0, HOME_LIMIT)} />
      {posts.length > HOME_LIMIT && (
        <Link
          href="/posts"
          className="mt-4 inline-block font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          all posts →
        </Link>
      )}
    </Section>
  );
}
