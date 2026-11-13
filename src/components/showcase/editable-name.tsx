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

// "denied" = wrong password after Enter (shakes); "limited" = too many attempts (429);
// "offline" = the login API is unreachable or not configured on this server (503).
type State = "idle" | "checking" | "granted" | "denied" | "limited" | "offline";

const HINT: Partial<Record<State, string>> = {
  denied: "wrong password",
  limited: "too many attempts, try again in a few minutes",
  offline: "admin login isn't available on this server",
};

/** What is sent as the password: ASCII forms of full-width input, no stray whitespace. */
const passwordOf = (text: string) => text.normalize("NFKC").slice(PREFIX.length).trim();

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

  // CJK input methods can produce full-width "＠" / "！"; NFKC maps them to ASCII.
  const isAttempt = (text: string) => text.normalize("NFKC").startsWith(PREFIX);

  async function tryLogin(text: string, explicit: boolean) {
    if (!isAttempt(text) || !passwordOf(text)) return;
    setState("checking");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passwordOf(text) }),
    }).catch(() => null);
    if (res?.ok) {
      setState("granted");
      input.current?.blur();
      setTimeout(() => router.push("/admin"), 450);
    } else if (res?.status === 429) {
      setState("limited");
    } else if (!res || res.status >= 500) {
      setState("offline");
    } else {
      // Silent while typing; a visible "no" only when Enter was pressed.
      setState(explicit ? "denied" : "idle");
    }
  }

  function update(next: string) {
    setTouched(true);
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    if (state === "denied" || state === "offline") setState("idle");
    if (isAttempt(next) && passwordOf(next)) {
      timer.current = setTimeout(() => tryLogin(next, false), SUBMIT_DEBOUNCE_MS);
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
    // Pasting with nothing focused lands on <body>; route it into the name too.
    function onPaste(e: ClipboardEvent) {
      const el = input.current;
      if (!el || e.target !== document.body) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const text = e.clipboardData?.getData("text") ?? "";
      if (!text) return;
      e.preventDefault();
      el.focus({ preventScroll: true });
      update(value + text.replace(/\s+/g, " "));
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("paste", onPaste);
    };
  }); // re-subscribes each render, so `value` is always current

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    update(e.target.value);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Leave keys alone while an input method (e.g. Chinese pinyin) is composing: its
    // Enter commits the text and must not be swallowed.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    // Caret always at the end, like a terminal line.
    if (["ArrowLeft", "ArrowRight", "Home", "End", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (timer.current) clearTimeout(timer.current);
      tryLogin(value, true);
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
    if (state !== "granted" && isAttempt(value)) reset();
  }

  const shown =
    state === "granted"
      ? "access granted"
      : isAttempt(value)
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
        <span
          aria-hidden
          // key restarts the shake on every failed Enter
          key={state === "denied" ? `denied-${value}` : "name"}
          className={cn(
            "inline-block",
            state === "checking" && "opacity-60",
            state === "denied" && "name-shake",
          )}
        >
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
      {HINT[state] && (
        <span
          role="status"
          className="absolute top-full left-0 mt-1 font-mono text-xs font-normal tracking-normal whitespace-nowrap text-muted-foreground"
        >
          {HINT[state]}
        </span>
      )}
      <input
        ref={input}
        tabIndex={-1}
        aria-label="Name"
        value={value}
        onChange={onChange}
        onCompositionEnd={(e) => update(e.currentTarget.value)}
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
