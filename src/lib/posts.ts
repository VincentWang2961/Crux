// Blog posts: Markdown files in content/posts/<slug>.md with a small frontmatter block.
//
//   ---
//   title: Post title
//   date: 2026-11-14
//   summary: One or two sentences for lists and <meta description>.
//   ---
//   Markdown body…
//
// Headings (## and ###) get stable ids and feed the sidebar contents list. Images become
// <figure>s; a Markdown image title ("…" after the URL) becomes the caption. Put post
// images in public/posts/<slug>/ and link them as /posts/<slug>/file.jpg.
// Content is authored in this repo, so raw HTML in Markdown is trusted.

import { promises as fs } from "node:fs";
import path from "node:path";
import { Marked, type Tokens } from "marked";

export type PostMeta = {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  summary: string;
  readingMinutes: number;
};
export type TocItem = { id: string; text: string; depth: 2 | 3 };
export type Post = PostMeta & { html: string; toc: TocItem[] };

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const data: Record<string, string> = {};
  if (!match) return { data, body: raw };
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) data[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return { data, body: raw.slice(match[0].length) };
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-") || "section";

const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// marked binds renderer methods to an object with the inline parser.
type Ctx = { parser: { parseInline(tokens: Tokens.Generic[]): string } };

function render(body: string) {
  const toc: TocItem[] = [];
  const used = new Map<string, number>();
  const md = new Marked({ gfm: true });

  md.use({
    renderer: {
      heading(this: Ctx, { tokens, depth, text }: Tokens.Heading) {
        const inner = this.parser.parseInline(tokens);
        const base = slugify(text);
        const n = used.get(base) ?? 0;
        used.set(base, n + 1);
        const id = n ? `${base}-${n}` : base;
        if (depth === 2 || depth === 3) toc.push({ id, text: inner.replace(/<[^>]+>/g, ""), depth });
        return `<h${depth} id="${id}"><a href="#${id}" class="heading-anchor" aria-hidden="true" tabindex="-1">#</a>${inner}</h${depth}>\n`;
      },
      image({ href, title, text }: Tokens.Image) {
        const caption = title ? `<figcaption>${title}</figcaption>` : "";
        return `<figure><img src="${escapeAttr(href)}" alt="${escapeAttr(text)}" loading="lazy" decoding="async" />${caption}</figure>`;
      },
      link(this: Ctx, { href, title, tokens }: Tokens.Link) {
        const inner = this.parser.parseInline(tokens);
        const external = /^https?:\/\//.test(href);
        return `<a href="${escapeAttr(href)}"${title ? ` title="${escapeAttr(title)}"` : ""}${external ? ' target="_blank" rel="noreferrer"' : ""}>${inner}</a>`;
      },
    },
  });

  // A lone image paragraph would wrap <figure> in <p>; unwrap it.
  const html = (md.parse(body) as string).replace(/<p>\s*(<figure>[\s\S]*?<\/figure>)\s*<\/p>/g, "$1");
  return { html, toc };
}

async function readPost(slug: string) {
  const raw = await fs.readFile(path.join(POSTS_DIR, `${slug}.md`), "utf8");
  const { data, body } = parseFrontmatter(raw);
  const words = body.replace(/[#>*_`![\]()-]/g, " ").split(/\s+/).filter(Boolean).length;
  const meta: PostMeta = {
    slug,
    title: data.title ?? slug,
    date: data.date ?? "1970-01-01",
    summary: data.summary ?? "",
    readingMinutes: Math.max(1, Math.round(words / 220)),
  };
  return { meta, body };
}

/** All posts, newest first. */
export async function getAllPosts(): Promise<PostMeta[]> {
  "use cache";
  const files = await fs.readdir(POSTS_DIR).catch(() => [] as string[]);
  const posts = await Promise.all(
    files.filter((f) => f.endsWith(".md")).map(async (f) => (await readPost(f.slice(0, -3))).meta),
  );
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPost(slug: string): Promise<Post | null> {
  "use cache";
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    const { meta, body } = await readPost(slug);
    return { ...meta, ...render(body) };
  } catch {
    return null;
  }
}

export const formatPostDate = (date: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
