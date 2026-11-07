import {
  About,
  Certifications,
  Education,
  Experience,
  Projects,
  Skills,
} from "@/components/showcase/cv-sections";
import { GlobeSection } from "@/components/showcase/globe-section";
import { Hero } from "@/components/showcase/hero";

export default function Home() {
  return (
    <>
      <Hero />
      <main
        id="content"
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-[max(1.25rem,env(safe-area-inset-left))] py-10 sm:px-10 md:gap-14"
      >
        <About />
        <Experience />
        <Projects />
        <Skills />
        <Education />
        <Certifications />
        <GlobeSection />
        <footer className="pt-4 text-center text-xs text-muted-foreground">
          © 2026 Vincent Wang · Built with Next.js & shadcn/ui
        </footer>
      </main>
    </>
  );
}
