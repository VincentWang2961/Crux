// Placeholder content for the showcase page. Replace with real data later
// (or move to MDX / a CMS once the blog is implemented).

// Hero (first screen). British English copy.
export const hero = {
  name: "Vincent Wang",
  greeting: "Hi, I'm",
  roles: ["Software Engineer", "Cloud & Self-hosting", "Open-source Tinkerer"],
  intro:
    "I build things for the web and look after a small fleet of servers across Australia and Asia. " +
    "This site is where I keep my projects, notes and favourite experiments.",
  links: {
    github: "https://github.com/VincentWang2961",
  },
};

export const skillGroups = [
  { name: "前端", items: ["TypeScript", "React", "Next.js", "Tailwind CSS"] },
  { name: "后端", items: ["Node.js", "PostgreSQL", "Redis"] },
  { name: "工具", items: ["Docker", "Git", "Linux", "CI/CD"] },
];

export const proficiency = [
  { name: "TypeScript", value: 90 },
  { name: "React / Next.js", value: 85 },
  { name: "Node.js", value: 75 },
  { name: "Docker", value: 65 },
];

export type TimelineItem = {
  role: string;
  org: string;
  period: string;
  description: string;
  tags?: string[];
};

export const experience: TimelineItem[] = [
  {
    role: "高级前端工程师",
    org: "Example Tech",
    period: "2024 — 至今",
    description: "负责核心产品的前端架构与性能优化，推动组件库与设计系统建设。",
    tags: ["Next.js", "Design System"],
  },
  {
    role: "全栈工程师",
    org: "Startup Co.",
    period: "2021 — 2024",
    description: "从零搭建 SaaS 平台，覆盖前端、API 与部署流水线。",
    tags: ["React", "Node.js", "Docker"],
  },
];

export const education: TimelineItem[] = [
  {
    role: "计算机科学 学士",
    org: "Example University",
    period: "2017 — 2021",
    description: "主修软件工程与分布式系统。",
  },
];

export const projects = [
  {
    name: "Crux",
    description: "个人博客与简历站点，基于 Next.js 与 shadcn/ui 构建，Docker 部署。",
    tags: ["Next.js", "shadcn/ui", "Docker"],
    href: "https://github.com/VincentWang2961/Crux",
    status: "进行中",
  },
  {
    name: "Project Two",
    description: "Placeholder project — a small CLI tool that automates daily workflows.",
    tags: ["TypeScript", "CLI"],
    href: "#",
    status: "已完成",
  },
  {
    name: "Project Three",
    description: "占位项目：数据可视化仪表盘，支持实时更新与自定义图表。",
    tags: ["React", "Charts"],
    href: "#",
    status: "已完成",
  },
];

export const posts = [
  {
    title: "用 Docker 部署 Next.js Standalone 应用",
    date: "2026-11-01",
    readingTime: "6 分钟",
    excerpt: "介绍多阶段构建、非 root 运行与健康检查的最佳实践。",
    tags: ["Docker", "Next.js"],
  },
  {
    title: "Designing with shadcn/ui",
    date: "2026-10-18",
    readingTime: "4 min",
    excerpt: "Why copy-in components beat a black-box UI library for personal projects.",
    tags: ["UI"],
  },
  {
    title: "中文网页的字体选择",
    date: "2026-09-30",
    readingTime: "5 分钟",
    excerpt: "如何为中英文混排选择合适的无衬线字体栈。",
    tags: ["Typography"],
  },
];

// Server deployment locations shown on the matrix globe (see AGENTS.md → "Matrix globe").
// `id` is stable and will be referenced by future SERVER_LINKS (node-to-node arcs).
// `label` picks the quadrant the name tag is drawn in, to avoid overlaps.
export type LabelPlacement = "ne" | "nw" | "se" | "sw";

export type ServerNode = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  label: LabelPlacement;
};

export const SERVER_NODES: ServerNode[] = [
  { id: "shanghai", name: "Shanghai", lat: 31.23, lon: 121.47, label: "ne" },
  { id: "singapore", name: "Singapore", lat: 1.35, lon: 103.82, label: "nw" },
  { id: "perth", name: "Perth", lat: -31.95, lon: 115.86, label: "sw" },
  { id: "sydney", name: "Sydney", lat: -33.87, lon: 151.21, label: "se" },
];
