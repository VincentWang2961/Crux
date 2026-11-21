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
// Perceived size grows with a mark's area and with how much of that area is inked, so a
// sparse mark (an open wave, a thin wordmark) is drawn larger than a solid disc or shield:
//   S = T · coverage^-K                  (density compensation)
//   width = S · aspect^E, height = S · aspect^(E - 1)
// E = 0.5 would give every mark the same area; a little less keeps wide wordmarks from
// growing too wide. T is the largest size at which every mark still fits the slot, so the
// set is as big as the slot allows and no mark is clamped out of proportion.
const K = 0.15;
const E = 0.25;
const SLOT_W = 56;
const SLOT_H = 48;

const shape = (m: { aspect: number; coverage: number }) => {
  const s = m.coverage ** -K;
  return { w: s * m.aspect ** E, h: s * m.aspect ** (E - 1) };
};
const T = Math.min(
  ...Object.values(LOGO_METRICS).map((m) => {
    const { w, h } = shape(m);
    return Math.min(SLOT_W / w, SLOT_H / h);
  }),
);

/** The organisation's mark, optically sized and bare on the page; decorative (the name is next to it). */
export function OrgLogo({ logo, className }: { logo: OrgLogoKey; className?: string }) {
  const m = LOGO_METRICS[logo];
  const { w, h } = shape(m);
  const size = { width: `${((T * w) / 16).toFixed(3)}rem`, height: `${((T * h) / 16).toFixed(3)}rem` } as CSSProperties;
  const darkSrc = "darkSrc" in m ? m.darkSrc : undefined;
  return (
    <span aria-hidden className={cn("flex h-12 w-14 shrink-0 items-center justify-center", className)}>
      {/* Plain <img>: tiny static files drawn at their own size; nothing to optimise. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={m.src} alt="" style={size} className={cn("max-w-none", darkSrc && "dark:hidden")} />
      {darkSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={darkSrc} alt="" style={size} className="hidden max-w-none dark:block" />
      )}
    </span>
  );
}
