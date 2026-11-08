import { PHOTOS } from "@/lib/site-data";
import { PhotoSpread } from "./photo-spread";
import { Section } from "./section";

// Photography & travel: a loose, overlapping spread of prints below the globe.
export function PhotoSection() {
  return (
    <Section id="photos" command="ls ~/photos" title="Photography & Travel">
      <PhotoSpread photos={PHOTOS} />
    </Section>
  );
}
