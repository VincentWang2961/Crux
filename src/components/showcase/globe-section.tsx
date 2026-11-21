import type { CSSProperties } from "react";
import { MatrixGlobe } from "./matrix-globe";
import { Reveal } from "./reveal";
import { SectionHeader } from "./section";

// Servers: the same rule and "$ command" header as the other sections, then the globe
// floating on the page background (no card), centred. It scrolls in like the rest: the
// header rises, then the globe grows in from 92 % (`.reveal-scale`).
export function GlobeSection() {
  return (
    <Reveal>
      <section id="servers" aria-labelledby="servers-title" className="scroll-mt-8 border-t pt-8 md:pt-10">
        <SectionHeader id="servers" command="ls servers/" title="Servers" />
        <div className="reveal reveal-scale mt-6 flex justify-center md:mt-8" style={{ "--i": 1.5 } as CSSProperties}>
          <MatrixGlobe />
        </div>
      </section>
    </Reveal>
  );
}
