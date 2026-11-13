// Blog posts: Markdown files in content/posts/ with a small frontmatter block.
//
//   content/posts/<slug>.md         the original, in either language
//     ---
//     title: Post title
//     date: 2026-11-14
//     summary: One or two sentences for lists and <meta description>.
//     lang: zh            # language of the original: en (default) or zh
//     ---
//   content/posts/<slug>.<lang>.md  AI translations, written by `npm run translate`
//     (same frontmatter plus translatedFrom + sourceHash; edit by hand if you like)
//
// The site speaks English first: /posts/<slug> shows the English version when there is
// one (original or translation), otherwise the original. Other languages live at
// /posts/<slug>/<lang>. Headings (## / ###) get stable ids for the contents sidebar;
// images become <figure>s (Markdown image title → caption). Post images go in
// public/posts/<slug>/. Content is authored in this repo, so raw HTML is trusted.

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Marked, type Tokens } from "marked";

export const LANGS = ["en", "zh"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "en";
/** Name of each language in itself (what the toggle shows). */
export const LANG_NAME: Record<Lang, string> = { en: "English", zh: "中文" };
/** Name of each language in English and in Chinese (for "translated from …"). */
export const LANG_NAME_IN: Record<Lang, Record<Lang, string>> = {
  en: { en: "English", zh: "Chinese" },
  zh: { en: "英文", zh: "中文" },
};
export const HTML_LANG: Record<Lang, string> = { en: "en-GB", zh: "zh-CN" };

export type PostMeta = {
  slug: string;
  lang: Lang;
  title: string;
  date: string; // YYYY-MM-DD
  summary: string;
  readingMinutes: number;
};
export type TocItem = { id: string; text: string; depth: 2 | 3 };
export type PostVersion = { lang: Lang; href: string };
export type Post = PostMeta & {
  html: string;
  toc: TocItem[];
  sourceLang: Lang;
  /** True when this version is an AI translation of the original. */
  translated: boolean;
  /** Every available language of this post, with its URL (current one included). */
  versions: PostVersion[];
};

const POSTS_DIR = path.join(process.cwd(), "content", "posts");
const isLang = (v: string | undefined): v is Lang => LANGS.includes(v as Lang);

export function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const data: Record<string, string> = {};
  if (!match) return { data, body: raw };
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) data[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return { data, body: raw.slice(match[0].length) };
}

/** Fingerprint of an original post; translations record it to detect staleness. */
export const sourceHash = (raw: string) => createHash("sha256").update(raw).digest("hex").slice(0, 16);

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/g, "")
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

/** ~220 English words or ~400 Chinese characters per minute. */
function readingMinutes(body: string) {
  const text = body.replace(/```[\s\S]*?```/g, " ").replace(/[#>*_`![\]()|-]/g, " ");
  const cjk = (text.match(/[㐀-鿿]/g) ?? []).length;
  const words = text.replace(/[㐀-鿿]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220 + cjk / 400));
}

type Version = { lang: Lang; meta: PostMeta; body: string; translated: boolean };

/** Every language version of one post, original first. */
async function readVersions(slug: string): Promise<Version[] | null> {
  let raw: string;
  try {
    raw = await fs.readFile(path.join(POSTS_DIR, `${slug}.md`), "utf8");
  } catch {
    return null;
  }
  const source = parseFrontmatter(raw);
  const sourceLang: Lang = isLang(source.data.lang) ? source.data.lang : DEFAULT_LANG;
  const toVersion = (lang: Lang, data: Record<string, string>, body: string, translated: boolean): Version => ({
    lang,
    body,
    translated,
    meta: {
      slug,
      lang,
      title: data.title ?? slug,
      date: source.data.date ?? "1970-01-01",
      summary: data.summary ?? "",
      readingMinutes: readingMinutes(body),
    },
  });

  const versions = [toVersion(sourceLang, source.data, source.body, false)];
  for (const lang of LANGS) {
    if (lang === sourceLang) continue;
    try {
      const t = parseFrontmatter(await fs.readFile(path.join(POSTS_DIR, `${slug}.${lang}.md`), "utf8"));
      versions.push(toVersion(lang, t.data, t.body, true));
    } catch {
      // no translation yet
    }
  }
  return versions;
}

/** The version shown at /posts/<slug>: English if available, else the original. */
const defaultVersion = (versions: Version[]) => versions.find((v) => v.lang === DEFAULT_LANG) ?? versions[0];

const hrefFor = (slug: string, lang: Lang, versions: Version[]) =>
  defaultVersion(versions).lang === lang ? `/posts/${slug}` : `/posts/${slug}/${lang}`;

async function listSlugs() {
  const files = await fs.readdir(POSTS_DIR).catch(() => [] as string[]);
  // Originals only: "<slug>.md", not "<slug>.<lang>.md".
  return files.filter((f) => /^[a-z0-9-]+\.md$/.test(f)).map((f) => f.slice(0, -3));
}

/** All posts in their default (English-first) version, newest first. */
export async function getAllPosts(): Promise<PostMeta[]> {
  "use cache";
  const all = await Promise.all((await listSlugs()).map(readVersions));
  return all
    .filter((v): v is Version[] => Boolean(v))
    .map((v) => defaultVersion(v).meta)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Non-default language pages to prerender: [{ slug, lang }]. */
export async function getAlternateVersions(): Promise<{ slug: string; lang: Lang }[]> {
  "use cache";
  const out: { slug: string; lang: Lang }[] = [];
  for (const slug of await listSlugs()) {
    const versions = await readVersions(slug);
    if (!versions) continue;
    const def = defaultVersion(versions).lang;
    for (const v of versions) if (v.lang !== def) out.push({ slug, lang: v.lang });
  }
  return out;
}

/**
 * One post in one language. Without `lang`, the default version. Returns null for an
 * unknown slug, or a language the post doesn't have.
 */
export async function getPost(slug: string, lang?: string): Promise<Post | null> {
  "use cache";
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const versions = await readVersions(slug);
  if (!versions) return null;
  const version = lang === undefined ? defaultVersion(versions) : versions.find((v) => v.lang === lang);
  if (!version) return null;
  return {
    ...version.meta,
    ...render(version.body),
    sourceLang: versions[0].lang,
    translated: version.translated,
    versions: versions.map((v) => ({ lang: v.lang, href: hrefFor(slug, v.lang, versions) })),
  };
}

export const formatPostDate = (date: string, lang: Lang = "en") =>
  new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-GB", {
    day: "numeric",
    month: lang === "zh" ? "long" : "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
