// Motion tokens: the one set of curves and durations every animation on the site uses.
// CSS has the same values in globals.css (`--ease-*` in @theme, `--dur-*` on :root), so Tailwind
// classes (`ease-enter`, `duration-(--dur-2)`) and Web Animations here stay in step.
// Keep the two lists identical.
//
// Curves, by what the motion does:
// - enter: something arrives or settles (scroll-in, intro, lightbox open). Expo-out: quick
//   start, long gentle landing.
// - move: something already on screen changes place or size (a panel growing, an indicator
//   gliding). Emphasised decelerate.
// - exit: something leaves (a panel closing). Accelerates away, so it never lingers.
// - swap: one state turns into another in place (a card flip, the theme circle). Symmetric.
//
// Durations, by how far and how big:
// - 1 (150 ms): colour and opacity feedback (hover, focus, press).
// - 2 (240 ms): small UI (an icon, a dot, a popover row).
// - 3 (420 ms): a panel or an image travelling, closing.
// - 4 (560 ms): a large surface opening or the whole page changing.
// Entrances on scroll are longer (REVEAL), because they are read, not waited for.

export const EASE = {
  enter: "cubic-bezier(0.16, 1, 0.3, 1)",
  move: "cubic-bezier(0.2, 0, 0, 1)",
  exit: "cubic-bezier(0.4, 0, 1, 1)",
  swap: "cubic-bezier(0.65, 0, 0.35, 1)",
} as const;

export const DUR = { 1: 150, 2: 240, 3: 420, 4: 560 } as const;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
