import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { SiteBar } from "@/components/site/site-bar";
import { hero } from "@/lib/site-data";
import { EditableName } from "./editable-name";
import { Typed, delay } from "./typed";

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
  cta: 1.32,
  hint: 1.45,
};

// First screen: at least one *large* viewport tall (lvh = browser toolbars retracted),
// so the next section never peeks in on iOS Safari, whose toolbars collapse or float
// over the page. The scroll hint is lifted by (lvh - svh) so it sits just above the
// toolbar while it is shown; on desktop lvh == svh and that offset is 0.
//
// Phone vs desktop: the block is vertically centred on both (slightly above centre on
// phones). Roles stack as a list on phones, touch targets are 40px and safe-area insets
// (notch / home indicator) are respected. From `sm` up roles sit on one line. The heading
// size is fluid (10vw, clamped) so it fills the width on any phone without wrapping the name.
export function Hero() {
  const title = `${hero.greeting} ${hero.name}!`;
  const titleEnd = T.title + title.length * T.titleStep;

  return (
    <section
      lang="en-GB"
      className="relative flex min-h-lvh flex-col px-[max(1.25rem,env(safe-area-inset-left))] font-mono sm:px-10"
    >
      <div className="hero-rise relative z-30" style={delay(T.bar)}>
        <SiteBar />
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-5 pb-[6svh] sm:justify-center sm:gap-8 sm:pb-0">
        <p className="text-xs text-muted-foreground sm:text-sm" aria-label="$ whoami">
          <Typed text="$ whoami" start={T.prompt} step={T.promptStep} />
        </p>

        <h1
          aria-label={title}
          className="text-[clamp(2rem,10vw,4.5rem)] font-bold leading-[1.1] tracking-tight text-balance"
        >
          <Typed text={hero.greeting} start={T.title} step={T.titleStep} />
          {/* The name always starts its own line. */}
          <br />
          {/* The name types in, then stays editable: typing "admin@<password>" over it
              logs in to the admin page (editable-name.tsx). */}
          <EditableName
            name={`${hero.name}!`}
            start={T.title + (hero.greeting.length + 1) * T.titleStep}
            step={T.titleStep}
            caretDelay={titleEnd}
          />
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

        {/* A plain, obvious way into the writing for any visitor. */}
        <Link
          href="/posts"
          style={delay(T.cta)}
          className="hero-rise group inline-flex h-11 w-fit items-center gap-2 rounded-full bg-foreground px-5 text-sm text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          Read my posts
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>
      </div>

      <a
        href="#content"
        aria-label="Scroll to content"
        style={delay(T.hint)}
        className="hero-rise mx-auto mb-[calc(100lvh-100svh+max(1rem,env(safe-area-inset-bottom)))] flex min-h-11 flex-col items-center justify-center gap-1 px-4 text-xs text-muted-foreground transition-colors hover:text-foreground sm:mb-6"
      >
        scroll
        <ChevronDown className="size-4 animate-bounce motion-reduce:animate-none" />
      </a>
    </section>
  );
}
