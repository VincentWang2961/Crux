import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostView } from "@/components/posts/post-view";
import { getAllPosts, getPost } from "@/lib/posts";

// /posts/<slug>: the default (English-first) version of a post.
export async function generateStaticParams() {
  return (await getAllPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/posts/[slug]">): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return { title: "Post not found · Vincent Wang" };
  return {
    title: `${post.title} · Vincent Wang`,
    description: post.summary,
    alternates: { languages: Object.fromEntries(post.versions.map((v) => [v.lang, v.href])) },
  };
}

export default async function PostPage({ params }: PageProps<"/posts/[slug]">) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  return <PostView post={post} />;
}
