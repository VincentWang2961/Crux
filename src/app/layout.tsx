import type { Metadata, Viewport } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Developer-flavoured monospace (VS Code / terminal feel) used by the hero and code-ish UI.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Crux",
  description: "Crux",
};

// viewport-fit=cover enables env(safe-area-inset-*) on notched phones.
// themeColor tints mobile browser chrome to match the light/dark --background tokens.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

// Theme: follows the OS (prefers-color-scheme) unless the visitor picked one with the
// toggle, which is stored in localStorage["theme"]. Runs before first paint so there is
// no light flash in dark mode, and keeps following live OS changes (e.g. auto dark at
// sunset) while no explicit choice is stored. See theme-toggle.tsx.
const themeScript = `(function(){try{var d=document.documentElement,m=matchMedia("(prefers-color-scheme: dark)");function a(){var t=null;try{t=localStorage.getItem("theme")}catch(e){}var k=t==="dark"||(t!=="light"&&m.matches);d.classList.toggle("dark",k);d.style.colorScheme=k?"dark":"light"}a();m.addEventListener("change",a);window.__applyTheme=a}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${jetbrainsMono.variable} h-full antialiased motion-safe:scroll-smooth`}
      // The theme script adds `dark` / color-scheme before hydration.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
