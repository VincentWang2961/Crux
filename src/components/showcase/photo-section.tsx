import { PHOTOS } from "@/lib/site-data";
import { PhotoSpread } from "./photo-spread";
import { Reveal } from "./reveal";
import { SectionHeader } from "./section";

// Photography & travel: a loose, overlapping spread of prints below the globe. Unlike
// the CV sections it is wider than the 64rem text column: the header lines up with the
// other sections, and the spread gets up to 80rem (max-w-7xl). Side gutters grow on large
// screens (lg:px-16, xl:px-24) so it never runs close to the edges of a full-screen window.
export function PhotoSection() {
  return (
    <Reveal>
      <section id="photos" aria-labelledby="photos-title" className="scroll-mt-8">
        {/* Same box as the CV column in page.tsx, so the rule and header line up exactly. */}
        <div className="mx-auto max-w-5xl px-[max(1.25rem,env(safe-area-inset-left))] sm:px-10">
          <div className="border-t pt-8 md:pt-10">
            <SectionHeader id="photos" command="ls ~/photos" title="Photography & Travel" />
          </div>
        </div>
        <div className="mt-6 px-[max(1.25rem,env(safe-area-inset-left))] sm:px-10 md:mt-8 lg:px-16 xl:px-24">
          <div className="mx-auto max-w-7xl">
            <PhotoSpread photos={PHOTOS} />
          </div>
        </div>
      </section>
    </Reveal>
  );
}
