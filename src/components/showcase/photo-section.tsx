import { PHOTOS } from "@/lib/site-data";
import { PhotoSpread } from "./photo-spread";
import { Reveal } from "./reveal";
import { SectionHeader } from "./section";

// Photography & travel: a loose, overlapping spread of prints below the globe. Unlike
// the CV sections it is full-bleed: the header lines up with the other sections, and the
// spread uses the whole page width (inside the usual side gutters), up to 110rem.
export function PhotoSection() {
  return (
    <Reveal>
      <section
        id="photos"
        aria-labelledby="photos-title"
        className="scroll-mt-8 px-[max(1.25rem,env(safe-area-inset-left))] sm:px-10"
      >
        <div className="mx-auto max-w-5xl border-t pt-8 md:pt-10">
          <SectionHeader id="photos" command="ls ~/photos" title="Photography & Travel" />
        </div>
        <div className="mx-auto mt-6 max-w-[110rem] md:mt-8">
          <PhotoSpread photos={PHOTOS} />
        </div>
      </section>
    </Reveal>
  );
}
