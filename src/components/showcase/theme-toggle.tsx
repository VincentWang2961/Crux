"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

// Stateless toggle: icons switch via the `dark` class, so no hydration mismatch.
export function ThemeToggle() {
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="切换深色模式"
      onClick={() => document.documentElement.classList.toggle("dark")}
    >
      <Sun className="dark:hidden" />
      <Moon className="hidden dark:block" />
    </Button>
  );
}
