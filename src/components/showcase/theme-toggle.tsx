"use client";

import type { MouseEvent } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    __applyTheme?: () => void;
  }
}

// Length and easing of the circular reveal (see the ::view-transition rules in globals.css).
const REVEAL_MS = 650;
const REVEAL_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

// Stateless toggle: icons switch via the `dark` class, so no hydration mismatch.
// The default theme follows the OS (see the theme script in app/layout.tsx). Clicking
// stores an explicit choice; choosing the same theme as the OS clears it, so the page
// goes back to following the OS automatically.
function switchTheme() {
  const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
  const os = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  try {
    if (next === os) localStorage.removeItem("theme");
    else localStorage.setItem("theme", next);
    if (window.__applyTheme) return window.__applyTheme();
  } catch {}
  // Storage blocked: still switch for this page view.
  document.documentElement.classList.toggle("dark", next === "dark");
  document.documentElement.style.colorScheme = next;
}

// The new theme grows out of the button as a circle until it covers the whole page.
// A View Transition snapshots the old page; the new one is revealed with a clip-path
// circle centred on the button. Without View Transitions, or under reduced motion,
// the theme switches instantly.
export function ThemeToggle({ className }: { className?: string }) {
  function toggle(e: MouseEvent<HTMLButtonElement>) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduce) return switchTheme();

    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    // Scope the "no root cross-fade" rule in globals.css to this transition only, so
    // route transitions keep their own cross-fade.
    const html = document.documentElement;
    html.classList.add("theme-switching");
    const transition = document.startViewTransition(switchTheme);
    transition.finished.finally(() => html.classList.remove("theme-switching"));
    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${radius}px at ${x}px ${y}px)`,
            ],
          },
          { duration: REVEAL_MS, easing: REVEAL_EASE, pseudoElement: "::view-transition-new(root)" },
        );
      })
      .catch(() => {});
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn("rounded-full", className)}
      aria-label="Toggle dark mode"
      onClick={toggle}
    >
      <Sun className="dark:hidden" />
      <Moon className="hidden dark:block" />
    </Button>
  );
}
