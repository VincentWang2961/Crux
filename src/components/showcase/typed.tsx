import type { CSSProperties } from "react";

// Shared by the hero (server) and the editable name (client); no "use client" so it
// renders in either.

export const delay = (s: number) => ({ "--d": `${s.toFixed(3)}s` }) as CSSProperties;

// Types `text` one character at a time. Words stay unbreakable and real spaces
// sit between them, so line wrapping is the same as for plain text.
export function Typed({
  text,
  start,
  step,
  className,
}: {
  text: string;
  start: number;
  step: number;
  className?: string;
}) {
  let i = 0;
  const words = text.split(" ");
  return (
    <span aria-hidden className={className}>
      {words.map((word, w) => (
        <span key={w}>
          {w > 0 && " "}
          <span className="inline-block whitespace-nowrap">
            {[...word].map((ch, c) => (
              <span key={c} className="hero-char" style={delay(start + (i++ + w) * step)}>
                {ch}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}

