import type { CSSProperties } from "react";
import { LOGO_METRICS } from "@/lib/logo-metrics";
import type { OrgLogoKey } from "@/lib/site-data";
import { cn } from "@/lib/utils";

// Organisation marks for the Experience and Education sections. Each is a file in
// public/logos/ (<key>.svg or .png, plus <key>-dark.svg where the dark theme needs other
// colours), cropped to its ink by scripts/measure-logos.py. Sources (official artwork):
// - Woolworths Group: woolworthsgroup.com.au logo.svg, wave mark only (wordmark removed).
// - Centre for Accessibility Australia: accessibility.org.au cfa-logo-2022(-footer).svg,
//   the three squares; light and dark use the organisation's own light / dark logo colours.
// - Outlier: outlier.ai favicon (gradient ring on a black disc).
// - Uber: wordmark from Simple Icons, near-black / near-white per theme.
// - The University of Western Australia: uwa.edu.au uwacrest-small-white.svg, crest only.
// - Jiangsu University of Technology: jsut.edu.cn logo.svg (a PNG inside an SVG), emblem only.
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
// wordmark, CfAA's tall stack). T is the largest size at which every mark fits the slot,
// worked out per theme, so no mark is clamped out of proportion.
const G = 0.35;
const SLOT_W = 56;
const SLOT_H = 48;

type Theme = "light" | "dark";
type Metrics = (typeof LOGO_METRICS)[OrgLogoKey];

const shape = (m: Metrics, theme: Theme) => {
  const elongation = Math.max(m.aspect, 1 / m.aspect);
  const area = elongation ** -G / m.footprint[theme];
  return { w: Math.sqrt(area * m.aspect), h: Math.sqrt(area / m.aspect) };
};

const scale = (theme: Theme) =>
  Math.min(
    ...Object.values(LOGO_METRICS).map((m) => {
      const { w, h } = shape(m, theme);
      return Math.min(SLOT_W / w, SLOT_H / h);
    }),
  );
const T = { light: scale("light"), dark: scale("dark") };

const rem = (px: number) => `${(px / 16).toFixed(3)}rem`;

/** The organisation's mark, optically sized and bare on the page; decorative (the name is next to it). */
export function OrgLogo({ logo, className }: { logo: OrgLogoKey; className?: string }) {
  const m = LOGO_METRICS[logo];
  const light = shape(m, "light");
  const dark = shape(m, "dark");
  const size = {
    "--logo-w": rem(T.light * light.w),
    "--logo-h": rem(T.light * light.h),
    "--logo-w-dark": rem(T.dark * dark.w),
    "--logo-h-dark": rem(T.dark * dark.h),
  } as CSSProperties;
  const img = "h-(--logo-h) w-(--logo-w) max-w-none dark:h-(--logo-h-dark) dark:w-(--logo-w-dark)";
  const darkSrc = "darkSrc" in m ? m.darkSrc : undefined;
  return (
    <span aria-hidden style={size} className={cn("flex h-12 w-14 shrink-0 items-center justify-center", className)}>
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
