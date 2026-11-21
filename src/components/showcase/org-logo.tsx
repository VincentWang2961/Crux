import type { ReactNode } from "react";
import type { ExperienceItem } from "@/lib/site-data";
import { cn } from "@/lib/utils";

// Organisation marks for the Experience section, inline SVG so they stay crisp, need no
// request, and can recolour per theme. Sources (official artwork, cropped to the mark):
// - Woolworths Group: woolworthsgroup.com.au logo.svg, wave mark only (wordmark removed).
// - Centre for Accessibility Australia: accessibility.org.au cfa-logo-2022(-footer).svg,
//   the three squares; light and dark use the site's own light / dark logo colours.
// - Outlier: outlier.ai favicon (gradient ring on a black disc).
// - Uber: wordmark from Simple Icons, drawn in the text colour.
// To add one, add its key to ExperienceItem["logo"] and an entry here.

const MARK: Record<ExperienceItem["logo"], ReactNode> = {
  woolworths: (
    <svg viewBox="0 0 70.5 66.351" className="h-full w-full">
      <path fill="#1b79ff" transform="translate(-2187.291 -79.933)" d="M2255.562,114.167c0,12.261-6.954,22.7-16.65,28.73a24.482,24.482,0,0,1-12.975,3.387c-10.705,0-17.587-5.122-20.24-9.529-1.263-2.1-2.57-4.268-5.171-5.786a12.736,12.736,0,0,0-3.72-1.237,11.489,11.489,0,0,1-5.754-3.533c-.964-.994-3.557-4.685-3.754-11.511,0-.178-.007-.356-.007-.534a34.956,34.956,0,0,1,.273-4.462l.44.085c.432,5.552,2.626,11.3,8.515,12.565,2.437.522,5.261.448,7.494,1.618a14.945,14.945,0,0,1,5.543,5.038c5.349,8.89,16.909,10.3,25.7,6.094,14.955-7.151,20.531-27.863,12.369-42.273,0,0,.283-.189.294-.193a34.047,34.047,0,0,1,7.641,21.541m-11.321-25.409c-2.942,1.747-4.659,5.006-5.663,8.277s-1.445,6.7-2.614,9.919c-1.4,3.834-4.693,8.363-9.246,8.347-4.6-.017-6.851-5.056-9.846-7.783A15.666,15.666,0,0,0,2206,103.461c-2.579,0-6.154.74-8.342-.984-3.349-2.64-2.043-7.537-.205-10.65.189-.32,2.24-3.54,2.243-3.536l-.284-.346a27.105,27.105,0,0,0-7.569,8.737c-1.7,3.171-1.463,8.1.966,10.9a7.712,7.712,0,0,0,4.388,2.325,14.926,14.926,0,0,0,2.335.275c2.98.128,5.919-.36,8.729.824,4.1,1.729,5.941,5.771,8.79,8.9,4.759,5.22,14.522,4.817,19.368-1.253,6.934-8.688,2.744-20.39,8.068-29.663Zm-20.058-8.109.11-.353c-1.99-.562-11.393-1.166-16.908,3.965a6.7,6.7,0,0,0-2.231,5.765,4.621,4.621,0,0,0,4.23,3.725c1.731.111,4.2-.852,5.882-.424,1.734.442,2.7,1.861,4.059,2.932a7.649,7.649,0,0,0,4.69,1.855c3.808.045,5.669-2.728,7.7-5.557,4.512-6.273,8.518-6.261,9.061-6.246l.086-.306c-1.782-.638-4.308-.067-6.087.4a15.359,15.359,0,0,0-5.6,2.858c-1.439,1.147-2.493,2.679-4.522,2.745-3.587.118-2.431-4.588-8.507-3.921a5.359,5.359,0,0,1-2.728-.074,2.346,2.346,0,0,1-1.363-1.838c-.281-2.376,3.07-4.139,4.934-4.695.211-.064.424-.118.638-.168l.033-.007a26.3,26.3,0,0,1,6.519-.656" />
    </svg>
  ),
  cfaa: (
    <svg viewBox="0 3.52 48.82 73.22" className="h-full w-full">
      <rect x="24.41" y="3.52" width="24.41" height="24.41" className="fill-[#f64747] dark:fill-[#baf73c]" />
      <rect y="27.92" width="24.41" height="24.41" className="fill-[#b500b5] dark:fill-[#f27927]" />
      <rect x="24.41" y="52.33" width="24.41" height="24.41" className="fill-[#336e7b] dark:fill-[#00bfff]" />
    </svg>
  ),
  outlier: (
    <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
      <defs>
        <linearGradient id="outlier-ring" x1="9.5" x2="23" y1="7" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F7C7C8" />
          <stop offset=".508" stopColor="#C7CEDA" />
          <stop offset="1" stopColor="#63DDFF" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="16" fill="#000" />
      <circle cx="16" cy="16" r="7.5" stroke="url(#outlier-ring)" strokeWidth="5" />
    </svg>
  ),
  uber: (
    <svg viewBox="0 7.9 24 8.2" className="h-full w-full fill-foreground">
      <path d="M0 7.97v4.958c0 1.867 1.302 3.101 3 3.101.826 0 1.562-.316 2.094-.87v.736H6.27V7.97H5.082v4.888c0 1.257-.85 2.106-1.947 2.106-1.11 0-1.946-.827-1.946-2.106V7.971H0zm7.44 0v7.925h1.13v-.725c.521.532 1.257.86 2.06.86a3.006 3.006 0 0 0 3.034-3.01 3.01 3.01 0 0 0-3.033-3.024 2.86 2.86 0 0 0-2.049.861V7.971H7.439zm9.869 2.038c-1.687 0-2.965 1.37-2.965 3 0 1.72 1.334 3.01 3.066 3.01 1.053 0 1.913-.463 2.49-1.233l-.826-.611c-.43.577-.996.847-1.664.847-.973 0-1.753-.7-1.912-1.64h4.697v-.373c0-1.72-1.222-3-2.886-3zm6.295.068c-.634 0-1.098.294-1.381.758v-.713h-1.131v5.774h1.142V12.61c0-.894.544-1.47 1.291-1.47H24v-1.065h-.396zm-6.319.928c.85 0 1.564.588 1.756 1.47H15.52c.203-.882.916-1.47 1.765-1.47zm-6.732.012c1.086 0 1.98.883 1.98 2.004a1.993 1.993 0 0 1-1.98 2.001A1.989 1.989 0 0 1 8.56 13.02a1.99 1.99 0 0 1 1.992-2.004z" />
    </svg>
  ),
};

// Wordmarks are wide, so they get less padding than square marks to read at the same weight.
const PAD: Partial<Record<ExperienceItem["logo"], string>> = { uber: "p-1.5", outlier: "p-1.5" };

/** The organisation's mark in a small square tile; decorative (the name is next to it). */
export function OrgLogo({ logo, className }: { logo: ExperienceItem["logo"]; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background p-2",
        PAD[logo],
        className,
      )}
    >
      {MARK[logo]}
    </span>
  );
}
