import type { CSSProperties } from "react";
import { ChevronDown } from "lucide-react";
import { hero } from "@/lib/site-data";
import { ThemeToggle } from "./theme-toggle";

// Intro timeline in seconds. Everything is done by about 1.8 s; classes are in globals.css.
const T = {
  bar: 0,
  prompt: 0.05, // "$ whoami" typed in
  promptStep: 0.03,
  title: 0.35, // heading typed in (greeting, then the name)
  titleStep: 0.025,
  roles: 0.95,
  roleStep: 0.08,
  intro: 1.2,
  hint: 1.45,
};

const delay = (s: number) => ({ "--d": `${s.toFixed(3)}s` }) as CSSProperties;

// Types `text` one character at a time. Words stay unbreakable and real spaces
// sit between them, so line wrapping is the same as for plain text.
function Typed({
  text,
  start,
  step,
  className,
}: {
  text: string;
  start: number;
  step: number;
  className?: string;
}) {
  let i = 0;
  const words = text.split(" ");
  return (
    <span aria-hidden className={className}>
      {words.map((word, w) => (
        <span key={w}>
          {w > 0 && " "}
          <span className="inline-block whitespace-nowrap">
            {[...word].map((ch, c) => (
              <span key={c} className="hero-char" style={delay(start + (i++ + w) * step)}>
                {ch}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}

// First screen: fills exactly one viewport (svh handles mobile browser chrome),
// content is pushed below it so visitors scroll to see the rest.
//
// Phone vs desktop: on phones the block is anchored to the lower part of the screen
// (thumb zone, native "onboarding" feel), roles stack as a list, touch targets are
// 40px and safe-area insets (notch / home indicator) are respected. From `sm` up,
// the block is vertically centred and roles sit on one line. The heading size is
// fluid (10vw, clamped) so it fills the width on any phone without wrapping the name.
export function Hero() {
  const title = `${hero.greeting} ${hero.name}!`;
  const titleEnd = T.title + title.length * T.titleStep;

  return (
    <section
      lang="en-GB"
      className="relative flex min-h-svh flex-col px-[max(1.25rem,env(safe-area-inset-left))] font-mono sm:px-10"
    >
      <div
        className="hero-rise flex items-center justify-between pt-[max(1rem,env(safe-area-inset-top))] sm:pt-6"
        style={delay(T.bar)}
      >
        <span className="text-xs text-muted-foreground">~/crux</span>
        <ThemeToggle className="size-10 sm:size-8" />
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-end gap-5 pb-[12svh] sm:justify-center sm:gap-8 sm:pb-0">
        <p className="text-xs text-muted-foreground sm:text-sm" aria-label="$ whoami">
          <Typed text="$ whoami" start={T.prompt} step={T.promptStep} />
        </p>

        <h1
          aria-label={title}
          className="text-[clamp(2rem,10vw,4.5rem)] font-bold leading-[1.1] tracking-tight text-balance"
        >
          <Typed text={hero.greeting} start={T.title} step={T.titleStep} />{" "}
          {/* The name never splits across lines; the caret stays attached to it. */}
          <span className="whitespace-nowrap">
            <Typed
              text={`${hero.name}!`}
              start={T.title + (hero.greeting.length + 1) * T.titleStep}
              step={T.titleStep}
            />
            <span
              aria-hidden
              style={delay(titleEnd)}
              className="hero-caret ml-[0.15em] inline-block h-[0.85em] w-[0.5em] translate-y-[0.1em] bg-foreground"
            />
          </span>
        </h1>

        <ul className="flex flex-col gap-1.5 text-[0.9375rem] text-foreground/80 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2 sm:text-xl">
          {hero.roles.map((role, i) => (
            <li
              key={role}
              style={delay(T.roles + i * T.roleStep)}
              className="hero-rise before:mr-2 before:text-muted-foreground before:content-['>']"
            >
              {role}
            </li>
          ))}
        </ul>

        <p
          style={delay(T.intro)}
          className="hero-rise max-w-2xl border-t border-dashed pt-5 text-[0.8125rem] leading-6 text-muted-foreground sm:border-0 sm:pt-0 sm:text-base sm:leading-relaxed"
        >
          {hero.intro}
        </p>
      </div>

      <a
        href="#content"
        aria-label="Scroll to content"
        style={delay(T.hint)}
        className="hero-rise mx-auto mb-[max(1rem,env(safe-area-inset-bottom))] flex min-h-11 flex-col items-center justify-center gap-1 px-4 text-xs text-muted-foreground transition-colors hover:text-foreground sm:mb-6"
      >
        scroll
        <ChevronDown className="size-4 animate-bounce motion-reduce:animate-none" />
      </a>
    </section>
  );
}
