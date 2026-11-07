import { GlobeSection } from "@/components/showcase/globe-section";
import { PostList } from "@/components/showcase/post-list";
import { ProfileHeader } from "@/components/showcase/profile-header";
import { ProjectGrid } from "@/components/showcase/project-grid";
import { SkillsCard } from "@/components/showcase/skills-card";
import { ThemeToggle } from "@/components/showcase/theme-toggle";
import { Timeline } from "@/components/showcase/timeline";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Crux · 组件预览</span>
        <ThemeToggle />
      </header>
      <ProfileHeader />
      <div className="grid gap-6 md:grid-cols-5">
        <div className="md:col-span-3">
          <Timeline />
        </div>
        <div className="md:col-span-2">
          <SkillsCard />
        </div>
      </div>
      <ProjectGrid />
      <PostList />
      <GlobeSection />
      <footer className="pt-4 text-center text-xs text-muted-foreground">
        © 2026 {"Vincent Wang"} · Built with Next.js & shadcn/ui
      </footer>
    </main>
  );
}
