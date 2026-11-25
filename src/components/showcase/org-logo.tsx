import type { CSSProperties } from "react";
import { LOGO_METRICS } from "@/lib/logo-metrics";
import { certifications, education, experience, type OrgLogoKey } from "@/lib/site-data";
import { cn } from "@/lib/utils";

// Organisation marks for the Experience, Education and Certifications sections. Each is a file in
// public/logos/ (<key>.svg or .png, plus <key>-dark.svg where the dark theme needs other
// colours), cropped to its ink by scripts/measure-logos.py. Sources (official artwork):
// - Woolworths Group: woolworthsgroup.com.au logo.svg, wave mark only (wordmark removed).
// - Centre for Accessibility Australia: accessibility.org.au cfa-logo-2022(-footer).svg,
//   the three squares; light and dark use the organisation's own light / dark logo colours.
// - Outlier: outlier.ai favicon (gradient ring on a black disc).
// - Uber: wordmark from Simple Icons, near-black / near-white per theme.
// - The University of Western Australia: crest only (wordmark removed). Light: the positive
//   logo (blue ribbon, white lettering; Wikipedia's "The University of Western Australia logo.svg").
//   Dark: uwa.edu.au uwacrest-small-white.svg (white ribbon, blue lettering) → uwa-dark.svg.
// - Jiangsu University of Technology: jsut.edu.cn logo.svg (a PNG inside an SVG), emblem only.
// - Certification issuers (CompTIA, Oracle, Neo4j, GitHub): Simple Icons paths in each brand's
//   colour (Oracle in its current Oracle Red, GitHub near-black / near-white per theme).
// To add one: drop the file in public/logos/, add its key to OrgLogoKey (site-data.ts) and
// re-run `python3 scripts/measure-logos.py --trim`.

// Optical sizing, so every mark reads at the same visual size whatever its shape.
// Two marks look the same size when the convex hulls of their *visible* parts have the same
// area (scripts/measure-logos.py measures that `footprint` per theme: a disc fills 80 % of
// its box, a shield 83 %, the UWA crest only 69 % on white, where its white ribbon vanishes).
// So each mark's box gets the area that makes its hull equal to everyone else's:
//   box area = T² · footprint⁻¹ · elongation^-G,  width = √(area · aspect), height = √(area / aspect)
// The elongation term (elongation = max(aspect, 1 / aspect)) trims very wide or tall marks
// a little, since a long thin shape spreads its area out and reads larger (the Uber
// wordmark, CfAA's tall stack). T is the largest size at which every mark of a set fits its
// slot, worked out per theme, so no mark is clamped out of proportion.
// Two sets, two slots: Experience and Education share the 56 × 48 slot; Certifications have
// their own 56 × 36 slot (as wide as the one above, so the columns line up, but shorter for compact rows), and its wide CompTIA wordmark sets only that
// set's T, so it can't shrink the marks above.
const G = 0.35;

type Size = "md" | "sm";
const SLOT: Record<Size, { w: number; h: number; keys: OrgLogoKey[] }> = {
  md: { w: 56, h: 48, keys: [...experience, ...education].map((e) => e.logo) },
  sm: { w: 56, h: 36, keys: certifications.map((c) => c.logo) },
};

type Theme = "light" | "dark";
type Metrics = (typeof LOGO_METRICS)[OrgLogoKey];

const shape = (m: Metrics, theme: Theme) => {
  const elongation = Math.max(m.aspect, 1 / m.aspect);
  const area = elongation ** -G / m.footprint[theme];
  return { w: Math.sqrt(area * m.aspect), h: Math.sqrt(area / m.aspect) };
};

const scale = (size: Size, theme: Theme) =>
  Math.min(
    ...SLOT[size].keys.map((key) => {
      const { w, h } = shape(LOGO_METRICS[key], theme);
      return Math.min(SLOT[size].w / w, SLOT[size].h / h);
    }),
  );
const T = {
  md: { light: scale("md", "light"), dark: scale("md", "dark") },
  sm: { light: scale("sm", "light"), dark: scale("sm", "dark") },
};

const rem = (px: number) => `${(px / 16).toFixed(3)}rem`;

/** The organisation's mark, optically sized and bare on the page; decorative (the name is next to it). */
export function OrgLogo({ logo, size = "md", className }: { logo: OrgLogoKey; size?: Size; className?: string }) {
  const m = LOGO_METRICS[logo];
  const t = T[size];
  const light = shape(m, "light");
  const dark = shape(m, "dark");
  const vars = {
    "--logo-w": rem(t.light * light.w),
    "--logo-h": rem(t.light * light.h),
    "--logo-w-dark": rem(t.dark * dark.w),
    "--logo-h-dark": rem(t.dark * dark.h),
  } as CSSProperties;
  const img = "h-(--logo-h) w-(--logo-w) max-w-none dark:h-(--logo-h-dark) dark:w-(--logo-w-dark)";
  const darkSrc = "darkSrc" in m ? m.darkSrc : undefined;
  return (
    <span aria-hidden style={vars} className={cn("flex shrink-0 items-center justify-center", size === "md" ? "h-12 w-14" : "h-9 w-14", className)}>
      {/* Plain <img>: tiny static files drawn at their own size; nothing to optimise. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={m.src} alt="" className={cn(img, darkSrc && "dark:hidden")} />
      {darkSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={darkSrc} alt="" className={cn(img, "hidden dark:block")} />
      )}
    </span>
  );
}
