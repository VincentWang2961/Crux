// Content for the home page, taken from Vincent's CV. British English throughout.

// Hero (first screen). British English copy.
export const hero = {
  name: "Vincent Wang",
  greeting: "Hi, I'm",
  roles: ["IT Support & Service Desk", "Site & Infrastructure Support", "Home-lab Tinkerer"],
  intro:
    "Master of IT graduate from UWA, based in Perth. I keep Windows fleets, networks and Linux " +
    "servers running, and look after a small self-hosted fleet across Australia and Asia.",
  links: {
    github: "https://github.com/VincentWang2961",
  },
};

// Contact details shown publicly. The phone number and referees from the CV are
// deliberately left out of the website.
export const profile = {
  headline: "IT Support & Service Desk · Site & Infrastructure Support",
  summary: [
    "Master of Information Technology graduate from The University of Western Australia (Distinction average), " +
      "with hands-on experience in Windows imaging and deployment, hardware and peripheral troubleshooting, " +
      "networking and Linux administration.",
    "I run a self-hosted Linux and Synology home lab with Docker services, a WireGuard VPN, a reverse proxy with " +
      "SSL, RAID storage, backups and monitoring. My first degree was in engineering, with a grounding in " +
      "electronics and microcontrollers.",
  ],
  facts: [
    { label: "Based in", value: "Perth, WA" },
    { label: "Work rights", value: "Full Australian work rights" },
    { label: "Open to", value: "Perth, regional WA and FIFO rosters, including on-call support" },
    { label: "Languages", value: "Mandarin Chinese (native), English (advanced)" },
  ],
  contacts: [
    { label: "Email", value: "vincent@vincentwang.au", href: "mailto:vincent@vincentwang.au" },
    {
      label: "LinkedIn",
      value: "vincent-wang-6967b5307",
      href: "https://www.linkedin.com/in/vincent-wang-6967b5307",
    },
    { label: "GitHub", value: "VincentWang2961", href: "https://github.com/VincentWang2961" },
  ],
};

export type ExperienceItem = {
  role: string;
  org: string;
  place: string;
  period: string;
  note?: string;
  points: string[];
};

export const experience: ExperienceItem[] = [
  {
    role: "IT Development Intern",
    org: "Centre for Accessibility Australia",
    place: "Perth, WA",
    period: "Feb 2026 – May 2026",
    note: "Through UWA's McCusker Centre for Citizenship internship programme",
    points: [
      "Built a standardised Windows image with the organisation's software and configuration, and deployed it to about 10 workstations with Clonezilla.",
      "Built SharePoint team pages for internal departments, and reviewed and updated organisational documentation.",
      "Evaluated Jira and Asana against the organisation's needs in a written report covering features, costs and migration.",
      "Tested web pages and documents against WCAG guidelines with screen reader software and the Microsoft Office Accessibility Checker.",
    ],
  },
  {
    role: "Assistant Nightfill Manager",
    org: "Woolworths Supermarkets",
    place: "Perth, WA",
    period: "Oct 2025 – Present",
    note: "Promoted from Nightfill Team Member within 12 months",
    points: [
      "Allocate tasks and coordinate overnight operations for a team of up to 8, and lead the department when the manager is absent.",
      "Set priorities against fixed overnight deadlines; triage operational, customer and team issues and escalate where required.",
    ],
  },
];

export type Project = {
  name: string;
  kind: string;
  period: string;
  grade?: string;
  stack: string[];
  summary: string;
  href?: string;
};

export const projects: Project[] = [
  {
    name: "Personal Home Lab",
    kind: "Self-hosted infrastructure",
    period: "Ongoing",
    stack: ["Ubuntu", "Synology NAS", "Docker", "WireGuard", "SSL/TLS"],
    summary:
      "Ubuntu and Synology servers running 5–10 Docker containers behind a reverse proxy on my own domain, " +
      "hardened with SSH keys, firewall rules and fail2ban, with RAID/SHR storage, scheduled backups and monitoring.",
  },
  {
    name: "AI Study Planner",
    kind: "University capstone project",
    period: "2026",
    grade: "High Distinction",
    stack: ["Next.js", "TypeScript", "PostgreSQL", "Prisma", "OpenAI API"],
    summary:
      "Led AI integration in a team of six, using the OpenAI API to generate personalised study plans and handle " +
      "conversational changes; also looked after the database and Docker deployment.",
  },
  {
    name: "High-Performance 2D Convolution",
    kind: "Parallel computing",
    period: "2025",
    grade: "High Distinction",
    stack: ["C", "MPI", "OpenMP", "Pawsey Setonix"],
    summary:
      "Hybrid MPI/OpenMP 2D convolution on UWA Kaya2 and the Pawsey Setonix supercomputer, with an analysis of " +
      "workload distribution and scalability.",
  },
  {
    name: "Smart Plant Caring System",
    kind: "IoT sensor monitoring",
    period: "2025",
    stack: ["ESP32", "C", "Wi-Fi"],
    summary:
      "ESP32 firmware in C that collects plant sensor readings and sends them over Wi-Fi for processing and storage, " +
      "with validated telemetry and documentation.",
  },
  {
    name: "Crux",
    kind: "This website",
    period: "2026",
    stack: ["Next.js", "Tailwind CSS", "Docker", "Cloudflare Tunnel"],
    summary:
      "Personal site built with Next.js and shadcn/ui, self-hosted in Docker behind a Cloudflare Tunnel and " +
      "redeployed automatically from GitHub.",
    href: "https://github.com/VincentWang2961/Crux",
  },
];

export const skillGroups = [
  {
    area: "Windows & Microsoft",
    items: ["Windows 10/11", "Imaging (Clonezilla)", "Microsoft 365", "SharePoint", "Active Directory", "Group Policy"],
  },
  {
    area: "End-user support",
    items: ["Hardware diagnostics", "Component replacement", "Boot troubleshooting", "Printers & peripherals", "Drivers"],
  },
  {
    area: "Networking",
    items: ["TCP/IP", "DHCP", "DNS", "Router, switch & Wi-Fi", "Port forwarding", "WireGuard VPN"],
  },
  {
    area: "Linux & infrastructure",
    items: ["Ubuntu", "SSH", "Firewalls & fail2ban", "Synology DSM", "RAID/SHR & backups", "Docker", "Reverse proxy & SSL/TLS"],
  },
  {
    area: "Data & development",
    items: ["SQL", "PostgreSQL", "MySQL", "Neo4j", "Python", "Bash", "TypeScript", "Git", "AWS & Azure"],
  },
  {
    area: "Professional",
    items: ["Technical documentation", "WCAG testing", "Jira & Asana", "Customer service", "Team leadership"],
  },
];

export type EducationItem = {
  degree: string;
  org: string;
  place: string;
  period: string;
  detail: string;
  points: string[];
};

export const education: EducationItem[] = [
  {
    degree: "Master of Information Technology",
    org: "The University of Western Australia",
    place: "Perth, WA",
    period: "2024 – 2026",
    detail: "Software Systems specialisation · Distinction average (WAM 74.3)",
    points: [
      "High Distinctions in the IT Capstone Project, High Performance Computing, Introduction to Cybersecurity and Computational Thinking with Python.",
      "Recognised by the Department of Computer Science and Software Engineering (2024) for peer learning support in a cybersecurity study group.",
    ],
  },
  {
    degree: "Bachelor of Engineering (Automotive Service Engineering)",
    org: "Jiangsu University of Technology",
    place: "Changzhou, China",
    period: "2019 – 2023",
    detail: "C programming, microcontrollers, electrical and electronic technology",
    points: ["Final-year project: a Java-based vehicle rental management system."],
  },
];

export const certifications = [
  { name: "CompTIA A+ Core 1 (220-1201)", date: "Jan 2026", note: "Core 2 in preparation" },
  { name: "Oracle Certified Professional – MySQL 8.0 Database Administrator", date: "Jul 2025" },
  { name: "Neo4j Certified Professional", date: "Jul 2025" },
  { name: "GitHub Foundations", date: "2025" },
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

// Photography & travel (bottom of the home page). Drop photos into public/photos/
// (chmod 644) and list them here with their pixel size (used for the
// aspect ratio, so portrait, landscape and square shots all lay out correctly).
export type Photo = {
  src: string;
  alt: string;
  place: string;
  date?: string;
  width: number;
  height: number;
};

export const PHOTOS: Photo[] = [
  { src: "/photos/golden-gate-bridge.jpg", alt: "The Golden Gate Bridge seen from a rocky beach, waves breaking over dark boulders", place: "Golden Gate Bridge, San Francisco", width: 2576, height: 1716 },
  { src: "/photos/osaka-skyline.jpg", alt: "Dense city blocks and a long straight avenue at dusk, seen from high above", place: "Osaka, Japan", width: 1125, height: 1500 },
  { src: "/photos/lake-tahoe.jpg", alt: "Pine trees leaning over clear turquoise water", place: "Lake Tahoe, California", width: 2576, height: 1717 },
  { src: "/photos/kyoto-yasaka-pagoda.jpg", alt: "A five-storey wooden pagoda rising above tiled rooftops and green trees", place: "Yasaka Pagoda, Kyoto", width: 2000, height: 1500 },
  { src: "/photos/shanghai-lujiazui.jpg", alt: "The Oriental Pearl Tower and the Lujiazui skyscrapers under a bright sky", place: "Lujiazui, Shanghai", width: 768, height: 1024 },
  { src: "/photos/santa-monica-pier.jpg", alt: "The Route 66 End of the Trail sign above a crowd on the pier", place: "Santa Monica Pier, Los Angeles", width: 1086, height: 724 },
  { src: "/photos/yosemite-half-dome.jpg", alt: "A lone figure silhouetted on a road, facing Half Dome between dark pines", place: "Half Dome, Yosemite", width: 2000, height: 1333 },
  { src: "/photos/hot-creek.jpg", alt: "A creek winding through a rocky valley below the Sierra Nevada", place: "Hot Creek, Eastern Sierra", width: 2576, height: 1717 },
];
