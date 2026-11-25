import type { CSSProperties } from "react";
import Image from "next/image";
import { IconBrandGithub, IconBrandLinkedin, IconBrandSteam, IconMail } from "@tabler/icons-react";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  certifications,
  type Contact,
  education,
  experience,
  profile,
  projects,
  skillGroups,
} from "@/lib/site-data";
import { cn } from "@/lib/utils";
import { DetailsHint } from "./details-hint";
import { OrgLogo } from "./org-logo";
import { PortraitCard } from "./portrait-card";
import { ProjectFlip } from "./project-flip";
import { ProjectPager } from "./project-pager";
import { Reveal } from "./reveal";
import { Section } from "./section";
import { UptimeDots } from "./uptime-dots";

// CV content for the middle of the home page (between the hero and the globe).
// All copy lives in site-data.ts; these components only lay it out.

// Contact icons (Tabler: consistent outline set that includes brand marks).
const CONTACT_ICON = {
  mail: IconMail,
  linkedin: IconBrandLinkedin,
  github: IconBrandGithub,
  steam: IconBrandSteam,
} satisfies Record<Contact["icon"], unknown>;

const period = "shrink-0 font-mono text-xs text-muted-foreground tabular-nums";

// Heading row shared by experience and education entries: title left, dates right.
function EntryHead({ title, sub, when }: { title: string; sub: string; when: string }) {
  return (
    <>
      <div className="flex flex-col gap-x-4 gap-y-0.5 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="font-medium">{title}</h3>
        <span className={period}>{when}</span>
      </div>
      <p className="text-sm text-muted-foreground">{sub}</p>
    </>
  );
}

// Stagger index for .reveal children (multiplied by the step in globals.css).
const at = (i: number) => ({ "--i": i }) as CSSProperties;

// The portrait (portrait-card.tsx): a straight print on phones; on desktop it floats and
// tilts towards the mouse. Clicking turns it over to show where it was taken. 3:4 frame;
// a 4:3 original is cropped by object-cover around `position`. Placeholder until set.
function PortraitPrint({ className }: { className?: string }) {
  const p = profile.portrait;
  return (
    <figure className={cn("reveal reveal-photo", className)} style={at(1.5)}>
      {p ? (
        <PortraitCard portrait={p} />
      ) : (
        <div className="rounded-[3px] bg-white p-1.5 shadow-md ring-1 ring-black/5 dark:bg-neutral-200">
          <div
            role="img"
            aria-label="Portrait coming soon"
            className="flex aspect-3/4 items-center justify-center rounded-[2px] bg-muted font-mono text-2xl tracking-widest text-neutral-400"
          >
            VW
          </div>
        </div>
      )}
    </figure>
  );
}

export function About() {
  return (
    <Reveal>
      <Section id="about" command="cat about.md" title="About">
        <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-start sm:gap-10 md:grid-cols-[minmax(0,1fr)_14rem]">
          <div className="min-w-0">
            <div className="flex flex-col gap-4">
              {profile.intro.map((para, n) => (
                <p
                  key={n}
                  style={at(1 + n * 0.5)}
                  className="reveal text-[1.0625rem] leading-relaxed text-pretty text-foreground/85 sm:text-lg sm:leading-relaxed"
                >
                  {para}
                </p>
              ))}
            </div>

            <ul aria-label="Highlights" className="mt-6 flex flex-wrap gap-2">
              {profile.tags.map((tag, n) => (
                <li
                  key={tag}
                  style={at(2 + n * 0.35)}
                  className="reveal inline-flex h-8 items-center rounded-full border bg-muted/50 px-3 text-sm"
                >
                  {tag}
                </li>
              ))}
            </ul>

            <ul
              aria-label="Contact"
              style={at(2 + profile.tags.length * 0.35 + 0.5)}
              className="reveal mt-8 grid gap-x-6 gap-y-1 border-t border-dashed pt-5 sm:grid-cols-[repeat(2,auto)] sm:justify-start"
            >
              {profile.contacts.map((c) => {
                const Icon = CONTACT_ICON[c.icon];
                const external = c.href.startsWith("http");
                return (
                  <li key={c.label} className="flex min-h-10 min-w-0 items-center gap-2.5 text-sm">
                    <Icon aria-hidden stroke={1.6} className="size-[1.125rem] shrink-0 text-muted-foreground" />
                    <span className="shrink-0 text-muted-foreground">{c.label}:</span>
                    <a
                      href={c.href}
                      lang={c.lang}
                      {...(external && { target: "_blank", rel: "noreferrer" })}
                      className="group inline-flex min-w-0 items-center gap-1 font-medium underline decoration-foreground/25 underline-offset-4 transition-colors hover:decoration-foreground"
                    >
                      <span className="truncate">{c.value}</span>
                      {external && (
                        <ArrowUpRight
                          aria-hidden
                          className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-(--dur-2) ease-move group-hover:-translate-y-px group-hover:translate-x-px"
                        />
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Phones: the photo comes first, at a modest width. */}
          <PortraitPrint className="order-first w-40 sm:order-none sm:w-auto" />
        </div>
      </Section>
    </Reveal>
  );
}

export function Experience() {
  return (
    <Reveal>
      <Section id="experience" command="cat experience.md" title="Experience">
        <ol className="flex flex-col gap-7">
          {experience.map((e, n) => (
            <li key={e.role + e.org} className="reveal flex gap-4" style={at(1 + n * 1.5)}>
              <OrgLogo logo={e.logo} className="reveal-logo" />
              <div className="min-w-0 flex-1">
                <EntryHead title={e.role} sub={`${e.org} · ${e.place}`} when={e.period} />
                {e.note && <p className="mt-0.5 text-xs text-muted-foreground">{e.note}</p>}
                <p className="mt-2 text-sm leading-relaxed text-foreground/80">{e.summary}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>
    </Reveal>
  );
}

export function Projects() {
  return (
    <Reveal>
    <Section id="projects" command="ls projects/" title="Projects">
      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((p, n) => {
          const card = (
            <Card className="h-full transition-colors duration-(--dur-1) ease-move group-hover:bg-muted/50">
              <CardHeader>
                <div className="flex items-baseline justify-between gap-3">
                  <CardTitle className="flex items-center gap-1">
                    {p.name}
                    {p.href && !p.details && (
                      <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-(--dur-2) ease-move group-hover:-translate-y-px group-hover:translate-x-px" />
                    )}
                  </CardTitle>
                  <span className={period}>{p.period}</span>
                </div>
                <CardDescription className="flex items-center justify-between gap-3">
                  <span>
                    {p.kind}
                    {p.grade && ` · ${p.grade}`}
                  </span>
                  {p.uptime && <UptimeDots {...p.uptime} />}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 text-sm leading-relaxed text-foreground/80">
                {p.details ? <DetailsHint text={p.summary} /> : p.summary}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-1.5">
                {p.stack.map((t) => (
                  <Badge key={t} variant="outline">
                    {t}
                  </Badge>
                ))}
              </CardFooter>
            </Card>
          );
          // Cards side by side arrive together and are staggered left to right.
          const style = at(1 + n);
          if (p.details) {
            return (
              <div key={p.name} className="reveal" style={style}>
                <ProjectFlip title={p.name} front={card} back={<ProjectDetails project={p} />} />
              </div>
            );
          }
          return p.href ? (
            <a key={p.name} href={p.href} target="_blank" rel="noreferrer" className="group reveal" style={style}>
              {card}
            </a>
          ) : (
            <div key={p.name} className="reveal" style={style}>
              {card}
            </div>
          );
        })}
      </div>
    </Section>
    </Reveal>
  );
}

// A project's details panel (project-flip.tsx). One page: photo beside the text (above it on
// phones), then the overview, the sections, the stack and the links. Only `morePages` adds
// further pages, and then a ProjectPager.
type Details = NonNullable<(typeof projects)[number]["details"]>;
type DetailSection = Details["sections"][number];

function SectionList({ sections }: { sections: DetailSection[] }) {
  return sections.map((sec) => (
    <section key={sec.title}>
      <h4 className="font-mono text-xs text-muted-foreground">{sec.title}</h4>
      <ul className="mt-2 flex flex-col gap-1.5 text-sm leading-relaxed text-foreground/85">
        {sec.items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <span aria-hidden className="text-muted-foreground">
              –
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  ));
}

function ProjectDetails({ project: p }: { project: (typeof projects)[number] }) {
  const d = p.details!;
  // The card's own link joins the list unless the details already give it.
  const links = [...(d.links ?? [])];
  if (p.href && !links.some((l) => l.href === p.href)) links.push({ label: "View project", href: p.href });
  const main = (
    <div className={cn("grid gap-5 p-5 sm:gap-6 sm:p-8", d.image && "sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] sm:items-center sm:gap-8")}>
      {d.image && (
        // The whole photo at its own shape, never cropped. Phones: centred above the text, as
        // tall as fits the panel's width but at most 42 % of the screen. sm up: beside the
        // text, filling its column, centred against the text.
        <div
          className="relative mx-auto aspect-(--ratio) h-[min(42svh,calc((100vw-4.5rem)*var(--inv)))] overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10 sm:h-auto sm:w-full"
          style={{ "--ratio": `${d.image.width} / ${d.image.height}`, "--inv": d.image.height / d.image.width } as CSSProperties}
        >
          <Image
            src={d.image.src}
            alt={d.image.alt}
            fill
            sizes="(min-width: 640px) 320px, 60vw"
            className="object-cover"
          />
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
        <header className="pr-10">
          <h3 className="text-xl font-semibold tracking-tight">{p.name}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <span>
              {p.kind}
              {p.grade && ` · ${p.grade}`}
            </span>
            <span aria-hidden>·</span>
            <span className="font-mono text-xs tabular-nums">{p.period}</span>
          </p>
        </header>
        <p className="text-sm leading-relaxed text-foreground/85">{d.overview}</p>
        <SectionList sections={d.sections} />
        <div className="flex flex-wrap gap-1.5">
          {d.stack.map((t) => (
            <Badge key={t} variant="outline">
              {t}
            </Badge>
          ))}
        </div>
        {links.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors hover:bg-muted"
              >
                {l.href.includes("github.com") && <IconBrandGithub aria-hidden className="size-4" stroke={1.6} />}
                {l.label}
                <ArrowUpRight aria-hidden className="size-4 text-muted-foreground" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (!d.morePages?.length) {
    return (
      // Text alone reads better on a narrower panel: about 80 characters a line.
      <div className="h-full overflow-y-auto overscroll-contain" data-page-body data-panel-max={d.image ? undefined : 640}>
        {main}
        {/* "More below": fades out as you reach the end; absent when it all fits (globals.css). */}
        <div aria-hidden className="details-more pointer-events-none sticky bottom-0 -mt-14 h-14 bg-linear-to-t from-card to-transparent" />
      </div>
    );
  }
  const pages = [
    { label: "Overview", content: main },
    ...d.morePages.map((pg) => ({
      label: pg.label,
      content: (
        <div className="flex flex-col gap-5 p-6 pr-14 sm:p-8 sm:pr-16">
          <h3 className="text-xl font-semibold tracking-tight">{pg.label}</h3>
          <SectionList sections={pg.sections} />
        </div>
      ),
    })),
  ];
  return <ProjectPager pages={pages} />;
}

export function Skills() {
  return (
    <Reveal>
    <Section id="skills" command="cat skills.md" title="Skills">
      <dl className="flex flex-col gap-4">
        {skillGroups.map((g, n) => (
          <div key={g.area} className="reveal grid gap-2 sm:grid-cols-[10rem_1fr] sm:gap-4" style={at(1 + n * 0.75)}>
            <dt className="text-sm text-muted-foreground sm:pt-0.5">{g.area}</dt>
            <dd className="flex flex-wrap gap-1.5">
              {g.items.map((item) => (
                <Badge key={item} variant="secondary">
                  {item}
                </Badge>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
    </Reveal>
  );
}

export function Education() {
  return (
    <Reveal>
      <Section id="education" command="cat education.md" title="Education">
        <ol className="flex flex-col gap-7">
          {education.map((e, n) => (
            <li key={e.degree} className="reveal flex gap-4" style={at(1 + n * 1.5)}>
              <OrgLogo logo={e.logo} className="reveal-logo" />
              <div className="min-w-0 flex-1">
                <EntryHead title={e.degree} sub={`${e.org} · ${e.place}`} when={e.period} />
                <p className="mt-0.5 text-xs text-muted-foreground">{e.detail}</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/80">{e.summary}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>
    </Reveal>
  );
}

export function Certifications() {
  return (
    <Reveal>
    <Section id="certifications" command="ls certifications/" title="Certifications">
      <ul className="flex flex-col divide-y">
        {certifications.map((c, n) => (
          <li
            key={c.name}
            style={at(1 + n * 0.75)}
            className="reveal flex items-center gap-4 py-3 first:pt-0 last:pb-0"
          >
            <OrgLogo logo={c.logo} size="sm" className="reveal-logo" />
            <div className="flex min-w-0 flex-1 flex-col gap-x-4 gap-y-0.5 sm:flex-row sm:items-baseline sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.issuer}
                  {c.note && ` · ${c.note}`}
                </p>
              </div>
              <span className={period}>{c.date}</span>
            </div>
          </li>
        ))}
      </ul>
    </Section>
    </Reveal>
  );
}
