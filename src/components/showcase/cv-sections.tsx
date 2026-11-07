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
  education,
  experience,
  profile,
  projects,
  skillGroups,
} from "@/lib/site-data";
import { Section } from "./section";

// CV content for the middle of the home page (between the hero and the globe).
// All copy lives in site-data.ts; these components only lay it out.

const period = "shrink-0 font-mono text-xs text-muted-foreground tabular-nums";

function Points({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 flex flex-col gap-1.5 text-sm leading-relaxed text-foreground/80">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5">
          <span aria-hidden className="text-muted-foreground">
            –
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

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

export function About() {
  return (
    <Section id="about" command="cat about.md" title="About">
      <p className="text-sm font-medium">{profile.headline}</p>
      <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-foreground/80">
        {profile.summary.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <dl className="mt-6 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        {profile.facts.map((f) => (
          <div key={f.label}>
            <dt className="text-xs text-muted-foreground">{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
      <ul className="mt-6 flex flex-wrap gap-2">
        {profile.contacts.map((c) => (
          <li key={c.label}>
            <a
              href={c.href}
              {...(c.href.startsWith("http") && { target: "_blank", rel: "noreferrer" })}
              className="group inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors hover:bg-muted"
            >
              <span className="text-muted-foreground">{c.label}</span>
              <span className="font-mono text-xs">{c.value}</span>
              <ArrowUpRight className="size-3.5 text-muted-foreground transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function Experience() {
  return (
    <Section id="experience" command="cat experience.md" title="Experience">
      <ol className="flex flex-col gap-8">
        {experience.map((e) => (
          <li key={e.role + e.org}>
            <EntryHead title={e.role} sub={`${e.org} · ${e.place}`} when={e.period} />
            {e.note && <p className="mt-0.5 text-xs text-muted-foreground">{e.note}</p>}
            <Points items={e.points} />
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function Projects() {
  return (
    <Section id="projects" command="ls projects/" title="Projects">
      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((p) => {
          const card = (
            <Card className="h-full transition-colors group-hover:bg-muted/50">
              <CardHeader>
                <div className="flex items-baseline justify-between gap-3">
                  <CardTitle className="flex items-center gap-1">
                    {p.name}
                    {p.href && (
                      <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
                    )}
                  </CardTitle>
                  <span className={period}>{p.period}</span>
                </div>
                <CardDescription>
                  {p.kind}
                  {p.grade && ` · ${p.grade}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 text-sm leading-relaxed text-foreground/80">
                {p.summary}
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
          return p.href ? (
            <a key={p.name} href={p.href} target="_blank" rel="noreferrer" className="group">
              {card}
            </a>
          ) : (
            <div key={p.name}>{card}</div>
          );
        })}
      </div>
    </Section>
  );
}

export function Skills() {
  return (
    <Section id="skills" command="cat skills.md" title="Skills">
      <dl className="flex flex-col gap-4">
        {skillGroups.map((g) => (
          <div key={g.area} className="grid gap-2 sm:grid-cols-[10rem_1fr] sm:gap-4">
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
  );
}

export function Education() {
  return (
    <Section id="education" command="cat education.md" title="Education">
      <ol className="flex flex-col gap-8">
        {education.map((e) => (
          <li key={e.degree}>
            <EntryHead title={e.degree} sub={`${e.org} · ${e.place}`} when={e.period} />
            <p className="mt-0.5 text-xs text-muted-foreground">{e.detail}</p>
            <Points items={e.points} />
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function Certifications() {
  return (
    <Section id="certifications" command="ls certifications/" title="Certifications">
      <ul className="flex flex-col divide-y">
        {certifications.map((c) => (
          <li
            key={c.name}
            className="flex flex-col gap-x-4 gap-y-0.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between"
          >
            <div>
              <p className="text-sm">{c.name}</p>
              {c.note && <p className="text-xs text-muted-foreground">{c.note}</p>}
            </div>
            <span className={period}>{c.date}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
