"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    __applyTheme?: () => void;
  }
}

// Stateless toggle: icons switch via the `dark` class, so no hydration mismatch.
// The default theme follows the OS (see the theme script in app/layout.tsx). Clicking
// stores an explicit choice; choosing the same theme as the OS clears it, so the page
// goes back to following the OS automatically.
export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
    const os = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    try {
      if (next === os) localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
      if (window.__applyTheme) return window.__applyTheme();
    } catch {}
    // Storage blocked: still switch for this page view.
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(className)}
      aria-label="切换深色模式"
      onClick={toggle}
    >
      <Sun className="dark:hidden" />
      <Moon className="hidden dark:block" />
    </Button>
  );
}
