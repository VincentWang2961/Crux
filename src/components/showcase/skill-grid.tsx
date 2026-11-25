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

// One chip style for every skill, outlined like the project badges. Phones get slightly
// smaller chips so the groups take fewer lines.
const chip =
  "inline-flex h-6.5 items-center gap-1.5 rounded-full border px-2 text-xs whitespace-nowrap text-foreground/80 sm:h-7 sm:px-2.5";

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
                  )}
                >
                  <Glyph
                    aria-hidden
                    stroke={1.75}
                    className="size-3.5 shrink-0 text-muted-foreground transition-[transform,color] group-hover/chip:text-foreground duration-(--dur-2) ease-enter group-hover/chip:-rotate-8 group-hover/chip:scale-115"
                  />
                  {s.name}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
