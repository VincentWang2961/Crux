import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { PostView } from "@/components/posts/post-view";
import { getAlternateVersions, getPost } from "@/lib/posts";

// /posts/<slug>/<lang>: another language of a post (e.g. /posts/x/zh).
export async function generateStaticParams() {
  return getAlternateVersions();
}

export async function generateMetadata({ params }: PageProps<"/posts/[slug]/[lang]">): Promise<Metadata> {
  const { slug, lang } = await params;
  const post = await getPost(slug, lang);
  if (!post) return { title: "Post not found · Vincent Wang" };
  return {
    title: `${post.title} · Vincent Wang`,
    description: post.summary,
    alternates: { languages: Object.fromEntries(post.versions.map((v) => [v.lang, v.href])) },
  };
}

export default async function PostLangPage({ params }: PageProps<"/posts/[slug]/[lang]">) {
  const { slug, lang } = await params;
  const post = await getPost(slug, lang);
  if (!post) notFound();
  // The default language has the shorter URL; keep one canonical address per version.
  const own = post.versions.find((v) => v.lang === post.lang)!;
  if (own.href !== `/posts/${slug}/${lang}`) permanentRedirect(own.href);
  return <PostView post={post} />;
}
