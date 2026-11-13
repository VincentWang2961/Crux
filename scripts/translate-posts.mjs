#!/usr/bin/env node
// Translate blog posts between English and Chinese with Claude.
//
//   npm run translate                # every post whose translation is missing or out of date
//   npm run translate -- <slug> ...  # only these posts
//   npm run translate -- --force     # re-translate even if up to date
//
// For each original content/posts/<slug>.md (language from its `lang:` frontmatter,
// default en) it writes content/posts/<slug>.<other>.md for every other language in
// LANGS. A translation records the original's sourceHash; when you edit the original,
// the next run notices and re-translates. Translations are plain Markdown, so you can
// review or hand-edit them before committing.
//
// Credentials: ANTHROPIC_API_KEY (or an `ant auth login` profile). Runs on your machine,
// not in Docker; commit the generated files and redeploy.

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

const LANGS = ["en", "zh"];
const LANG_NAME = { en: "British English", zh: "Simplified Chinese (简体中文)" };
const MODEL = "claude-opus-5-5";
const DIR = path.join(process.cwd(), "content", "posts");

// Must match sourceHash() in src/lib/posts.ts.
const hash = (raw) => createHash("sha256").update(raw).digest("hex").slice(0, 16);

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const data = {};
  if (!match) return { data, body: raw };
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) data[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return { data, body: raw.slice(match[0].length) };
}

const SYSTEM = `You translate blog posts for Vincent Wang's personal website (IT support and infrastructure).

You receive one Markdown document with a YAML-style frontmatter block. Return the complete translated document and nothing else:
- Keep the frontmatter block. Translate the values of "title" and "summary"; keep every other key and value exactly as given. Keep each value on a single line.
- Translate the body naturally and idiomatically for a native reader, keeping the author's voice and opinions. Don't add, drop or soften content.
- Preserve Markdown structure exactly: the same headings, lists, blockquotes, emphasis, tables and paragraph breaks.
- Never change URLs, image paths, inline code, code blocks, error codes, product names, KB numbers or raw HTML. Translate link text and image alt text and titles (the quoted caption after an image URL).
- Dates, numbers and units stay correct for the target language.
- Do not wrap the output in a code fence and do not add any commentary.`;

async function translate(client, raw, from, to) {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Translate this post from ${LANG_NAME[from]} into ${LANG_NAME[to]}.\n\n${raw}`,
      },
    ],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new Error("the model declined to translate this post");
  if (message.stop_reason === "max_tokens") throw new Error("the translation was cut off (max_tokens)");
  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim()
    .replace(/^```(?:markdown|md)?\n([\s\S]*?)\n```$/, "$1");
  return text;
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const only = args.filter((a) => !a.startsWith("--"));

  const files = (await fs.readdir(DIR)).filter((f) => /^[a-z0-9-]+\.md$/.test(f));
  const slugs = files.map((f) => f.slice(0, -3)).filter((s) => only.length === 0 || only.includes(s));
  if (slugs.length === 0) return console.log("No matching posts.");

  const client = new Anthropic();
  let done = 0;

  for (const slug of slugs) {
    const raw = await fs.readFile(path.join(DIR, `${slug}.md`), "utf8");
    const source = parseFrontmatter(raw);
    const from = LANGS.includes(source.data.lang) ? source.data.lang : "en";
    const sourceHash = hash(raw);

    for (const to of LANGS.filter((l) => l !== from)) {
      const out = path.join(DIR, `${slug}.${to}.md`);
      const existing = await fs.readFile(out, "utf8").catch(() => null);
      if (!force && existing && parseFrontmatter(existing).data.sourceHash === sourceHash) {
        console.log(`✓ ${slug} (${to}) is up to date`);
        continue;
      }

      process.stdout.write(`… translating ${slug} ${from} → ${to} `);
      const translated = parseFrontmatter(await translate(client, raw, from, to));
      const front = [
        "---",
        `title: ${(translated.data.title || source.data.title || slug).replace(/\n/g, " ")}`,
        `date: ${source.data.date ?? ""}`,
        `summary: ${(translated.data.summary || "").replace(/\n/g, " ")}`,
        `lang: ${to}`,
        `translatedFrom: ${from}`,
        `sourceHash: ${sourceHash}`,
        "---",
        "",
      ].join("\n");
      await fs.writeFile(out, front + translated.body.trimStart());
      console.log(`→ ${path.relative(process.cwd(), out)}`);
      done++;
    }
  }
  console.log(done ? `\nDone: ${done} translation(s). Review, commit and redeploy.` : "\nNothing to translate.");
}

main().catch((err) => {
  if (err instanceof Anthropic.AuthenticationError) {
    console.error("\nNo valid Anthropic credentials. Set ANTHROPIC_API_KEY (or run `ant auth login`).");
  } else if (err instanceof Anthropic.RateLimitError) {
    console.error("\nRate limited by the API; wait a moment and run it again.");
  } else if (err instanceof Anthropic.APIError) {
    console.error(`\nAPI error ${err.status}: ${err.message}`);
  } else {
    console.error(`\n${err.message ?? err}`);
  }
  process.exit(1);
});
