"use client";

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Typed, delay } from "./typed";

// Hidden admin entry. The name in the hero heading types in like the rest of the intro,
// then stays editable: click it (or just start typing while the hero is on screen) and
// type or delete like a terminal line. Anything after "admin@" is shown as "*". Once the
// text is "admin@<password>", it logs in through POST /api/admin/login (the password is
// checked on the server only) and opens /admin.
//
// A transparent <input> sits over the name, so phones get a keyboard on tap and IME /
// paste work. It is kept out of the tab order on purpose: this is an easter egg.

const PREFIX = "admin@";
const SUBMIT_DEBOUNCE_MS = 350;

type State = "idle" | "checking" | "granted";

export function EditableName({
  name,
  start,
  step,
  caretDelay,
}: {
  name: string;
  start: number;
  step: number;
  caretDelay: number;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(name);
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState<State>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function tryLogin(text: string) {
    if (!text.startsWith(PREFIX) || text.length === PREFIX.length) return;
    setState("checking");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: text.slice(PREFIX.length) }),
    }).catch(() => null);
    if (res?.ok) {
      setState("granted");
      input.current?.blur();
      setTimeout(() => router.push("/admin"), 450);
    } else {
      setState("idle");
    }
  }

  function update(next: string) {
    setTouched(true);
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    if (next.startsWith(PREFIX) && next.length > PREFIX.length) {
      timer.current = setTimeout(() => tryLogin(next), SUBMIT_DEBOUNCE_MS);
    }
  }

  // Typing anywhere while the hero is visible edits the name (no need to click first).
  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      const el = input.current;
      if (!el || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target !== document.body) return; // something else has focus
      if (document.querySelector("dialog[open]")) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return; // hero scrolled away
      const isChar = e.key.length === 1 && (e.key !== " " || touched); // keep space-to-scroll
      if (!isChar && e.key !== "Backspace") return;
      e.preventDefault();
      el.focus({ preventScroll: true });
      update(e.key === "Backspace" ? value.slice(0, -1) : value + e.key);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }); // re-subscribes each render, so `value` is always current

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    update(e.target.value);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Caret always at the end, like a terminal line.
    if (["ArrowLeft", "ArrowRight", "Home", "End", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (timer.current) clearTimeout(timer.current);
      tryLogin(value);
    } else if (e.key === "Escape") {
      reset();
      input.current?.blur();
    }
  }

  function reset() {
    if (timer.current) clearTimeout(timer.current);
    setValue(name);
    setTouched(false);
    setState("idle");
  }

  // Never leave a (masked) password attempt on screen.
  function onBlur() {
    if (state !== "granted" && value.startsWith(PREFIX)) reset();
  }

  const shown =
    state === "granted"
      ? "access granted"
      : value.startsWith(PREFIX)
        ? PREFIX + "*".repeat(value.length - PREFIX.length)
        : value;

  return (
    <span
      className={cn(
        "relative inline-block min-w-[1ch] align-bottom",
        touched ? "break-all" : "whitespace-nowrap",
      )}
    >
      {touched ? (
        <span aria-hidden className={cn(state === "checking" && "opacity-60")}>
          {shown}
        </span>
      ) : (
        <Typed text={name} start={start} step={step} />
      )}
      <span
        aria-hidden
        style={touched ? undefined : delay(caretDelay)}
        className={cn(
          "ml-[0.15em] inline-block h-[0.85em] w-[0.5em] translate-y-[0.1em] bg-foreground",
          touched ? "animate-caret motion-reduce:animate-none" : "hero-caret",
        )}
      />
      <input
        ref={input}
        tabIndex={-1}
        aria-label="Name"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={() => {
          const el = input.current;
          if (el) requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
        }}
        onBlur={onBlur}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="go"
        className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent opacity-0 outline-none"
      />
    </span>
  );
}
