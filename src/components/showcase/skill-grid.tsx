import type { CSSProperties } from "react";
import {
  IconAccessible,
  IconAffiliate,
  IconBrandAsana,
  IconBrandAws,
  IconBrandAzure,
  IconBrandCloudflare,
  IconBrandDocker,
  IconBrandGit,
  IconBrandJira,
  IconBrandMysql,
  IconBrandNextjs,
  IconBrandOffice,
  IconBrandPython,
  IconBrandReact,
  IconBrandTypescript,
  IconBrandUbuntu,
  IconBrandWindows,
  IconCertificate,
  IconCopy,
  IconCpu,
  IconDatabase,
  IconDatabaseExport,
  IconFileText,
  IconHeadset,
  IconNetwork,
  IconPrinter,
  IconRouter,
  IconServer2,
  IconShieldCog,
  IconShieldLock,
  IconSitemap,
  IconTerminal,
  IconTerminal2,
  IconUsersGroup,
  IconWall,
  type Icon,
} from "@tabler/icons-react";
import { skillGroups, type SkillIcon } from "@/lib/site-data";
import { cn } from "@/lib/utils";

// Skills: one row per group (label, then a wrap of icon chips), so the whole stack reads at a
// glance in a few lines. Tabler outline icons throughout, for one stroke style: the brand mark
// where a tool has one, a plain symbol otherwise. Monochrome, like the rest of the site.
// - Solid chips are what I use every week (`daily`), outlined ones what I have used; a small
//   legend under the rows says so.
// - Scroll-in: each row rises with <Reveal> (`.reveal`), then its chips pop in one after
//   another (`.skill-chip`, `--j` × 35 ms, globals.css). Hover nudges the icon.

const SKILL_ICON: Record<SkillIcon, Icon> = {
  windows: IconBrandWindows,
  office: IconBrandOffice,
  directory: IconSitemap,
  policy: IconShieldCog,
  imaging: IconCopy,
  hardware: IconCpu,
  printer: IconPrinter,
  network: IconNetwork,
  router: IconRouter,
  vpn: IconShieldLock,
  firewall: IconWall,
  certificate: IconCertificate,
  cloudflare: IconBrandCloudflare,
  ubuntu: IconBrandUbuntu,
  docker: IconBrandDocker,
  ssh: IconTerminal2,
  nas: IconServer2,
  backup: IconDatabaseExport,
  aws: IconBrandAws,
  azure: IconBrandAzure,
  python: IconBrandPython,
  typescript: IconBrandTypescript,
  nextjs: IconBrandNextjs,
  react: IconBrandReact,
  bash: IconTerminal,
  git: IconBrandGit,
  database: IconDatabase,
  mysql: IconBrandMysql,
  graph: IconAffiliate,
  docs: IconFileText,
  accessibility: IconAccessible,
  jira: IconBrandJira,
  asana: IconBrandAsana,
  support: IconHeadset,
  team: IconUsersGroup,
};

// Phones get slightly smaller chips so the groups take fewer lines.
const chip = "inline-flex h-6.5 items-center gap-1.5 rounded-full border text-xs whitespace-nowrap sm:h-7";
// Weekly: a filled, outlined chip in full ink. Used: the same chip with no surface, in muted ink,
// so the eye picks out the weekly set first, in either theme.
const daily = "border-foreground/15 bg-secondary px-2 text-foreground sm:px-2.5";
// No surface, so less side padding: the text sits closer to its neighbours.
const used = "border-transparent px-1.5 text-muted-foreground";

// Stagger index for .reveal rows (multiplied by the step in reveal.tsx).
const at = (i: number) => ({ "--i": i }) as CSSProperties;

export function SkillGrid() {
  return (
    <div className="flex flex-col gap-3.5">
      {skillGroups.map((g, n) => (
        <div key={g.area} className="reveal grid gap-1.5 sm:grid-cols-[8.5rem_1fr] sm:gap-3" style={at(1 + n * 0.75)}>
          <h3 className="text-sm text-muted-foreground sm:pt-1">{g.area}</h3>
          <ul className="flex flex-wrap gap-1 sm:gap-1.5">
            {g.items.map((s, j) => {
              const Glyph = SKILL_ICON[s.icon];
              return (
                <li
                  key={s.name}
                  style={{ "--j": j } as CSSProperties}
                  className={cn(
                    "skill-chip group/chip transition-colors duration-(--dur-1) hover:border-foreground/25 hover:text-foreground",
                    chip,
                    s.daily ? daily : used,
                  )}
                >
                  <Glyph
                    aria-hidden
                    stroke={1.75}
                    className="size-3.5 shrink-0 transition-transform duration-(--dur-2) ease-enter group-hover/chip:-rotate-8 group-hover/chip:scale-115"
                  />
                  {s.name}
                  {s.daily && <span className="sr-only"> (use weekly)</span>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p
        className="reveal flex items-center gap-4 font-mono text-[0.6875rem] text-muted-foreground sm:pl-[calc(8.5rem+0.75rem)]"
        style={at(1 + skillGroups.length * 0.75)}
      >
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-4 rounded-full border border-foreground/15 bg-secondary" />
          use weekly
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className={cn("h-2.5 w-4 rounded-full border border-dashed border-muted-foreground/40")} />
          have used
        </span>
      </p>
    </div>
  );
}
