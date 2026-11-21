// Content for the home page, taken from Vincent's CV. British English throughout.

// Hero (first screen). British English copy.
export const hero = {
  name: "Vincent Wang",
  greeting: "Hi, I'm",
  roles: ["IT Support & Developer", "Vehicle Engineering Grad", "Gamer & Photographer"],
  intro:
    "Master of IT graduate from UWA with a background in vehicle engineering, based in Perth. " +
    "I fix hardware, build for the web and run servers around the world, and I'm looking for " +
    "a full-time IT role in Australia or New Zealand.",
  links: {
    github: "https://github.com/VincentWang2961",
  },
};

// Contact details shown publicly. The phone number and referees from the CV are
// deliberately left out of the website.
/** Portrait shown in About. `src` is a file in public/; `position` is the focal point
 *  for the 3:4 crop (CSS object-position), so a 4:3 original can be used as it is. */
export type Portrait = {
  src: string;
  alt: string;
  width: number;
  height: number;
  position?: string;
  /** Shown on the back when the photo is flipped: place lines (first is the headline)… */
  place?: string[];
  /** …and the date it was taken, YYYY-MM-DD. */
  taken?: string;
};

export type Contact = {
  icon: "mail" | "linkedin" | "github" | "steam";
  label: string;
  value: string;
  href: string;
  lang?: string;
};

export const profile = {
  // Up to three short paragraphs; the tags below carry the headlines.
  intro: [
    "Hi, I'm Vincent, an IT support specialist and developer based in Perth, Western Australia. " +
      "I hold a Master of Information Technology from the University of Western Australia, majoring in " +
      "Software Engineering and graduating with a GPA of 6/7. I build and maintain modern websites, have " +
      "worked on IoT projects, and am at home with all kinds of electronic hardware. Before IT, I studied " +
      "Automotive Service Engineering at Jiangsu University of Technology, which gave me a solid grounding " +
      "in mechanics and a very hands-on approach to problems.",
    "These days I work part-time as an Assistant Department Manager at Woolworths, where I run the night " +
      "shift, and as a casual data annotator with Outlier, reviewing and labelling data used to train AI " +
      "models. Alongside that, I look after servers spread around the world and a small collection of " +
      "network gear at home. I'm now looking for a full-time role in IT support or DevOps, and would be " +
      "just as happy working as a developer. I love the working culture and the outdoors in Australia and " +
      "New Zealand, so I'm open to opportunities anywhere in either country.",
    "Away from the keyboard, I'm usually outside: hiking a new trail, swimming, or playing badminton. I " +
      "rarely go anywhere without a camera, and some of my favourite shots from the road are further down " +
      "this page. When I'm in, I'm gaming, whether on Steam, PlayStation, Xbox or Switch.",
  ],
  // Highlights: four at most.
  tags: ["Information Technology", "Vehicle Engineering", "English & Mandarin", "Full Australian Work Rights"],
  // Set to a Portrait once the photo is in public/ (null shows a quiet placeholder).
  portrait: {
    src: "/portrait.jpg",
    alt: "Vincent Wang in sunglasses on a clifftop above a turquoise cove, with a tree-topped rocky islet behind him",
    width: 1500,
    height: 2000,
    position: "50% 50%",
    place: ["McWay Falls", "Big Sur, California"],
    taken: "2026-09-27",
  } as Portrait | null,
  // Shown as icon + name + link. `icon` picks a Tabler icon in cv-sections.tsx;
  // `lang` marks a value that isn't English (so screen readers pronounce it right).
  contacts: [
    { icon: "mail", label: "Email", value: "vincent@vincentwang.au", href: "mailto:vincent@vincentwang.au" },
    {
      icon: "linkedin",
      label: "LinkedIn",
      value: "Vincent Wang",
      href: "https://www.linkedin.com/in/vincent-wang-6967b5307/",
    },
    { icon: "github", label: "GitHub", value: "VincentWang2961", href: "https://github.com/VincentWang2961" },
    { icon: "steam", label: "Steam", value: "淼表", lang: "zh", href: "https://steamcommunity.com/id/miaobiao/" },
  ] as Contact[],
};

/** Organisation marks drawn by org-logo.tsx (Experience and Education). */
export type OrgLogoKey = "outlier" | "woolworths" | "cfaa" | "uber" | "uwa" | "jsut";

export type ExperienceItem = {
  role: string;
  org: string;
  /** Mark shown before the entry (org-logo.tsx). */
  logo: OrgLogoKey;
  place: string;
  period: string;
  /** One short line under the heading, e.g. how the role came about. */
  note?: string;
  /** One short paragraph. */
  summary: string;
};

// Matches LinkedIn (Peer Learning Support is deliberately left off). Newest first.
export const experience: ExperienceItem[] = [
  {
    role: "Data Annotator",
    org: "Outlier",
    logo: "outlier",
    place: "Remote · Freelance",
    period: "Oct 2026 – Present",
    summary: "Annotate and review data used to train and evaluate AI models, on Outlier's platform.",
  },
  {
    role: "Assistant Department Manager",
    org: "Woolworths Group",
    logo: "woolworths",
    place: "Balcatta, WA · Part-time",
    period: "Oct 2025 – Present",
    note: "Promoted from Operations Team Member (Oct 2025 – Sep 2026)",
    summary:
      "Plan the nightly workload and allocate tasks across the nightfill team, receive and check deliveries, " +
      "and keep the store safe, stocked and ready for trading.",
  },
  {
    role: "IT Development Intern",
    org: "Centre for Accessibility Australia",
    logo: "cfaa",
    place: "Perth, WA · Internship",
    period: "Feb 2026 – May 2026",
    note: "Through UWA's McCusker Centre for Citizenship internship programme",
    summary:
      "IT support for an accessibility not-for-profit: deployed a standard Windows image to about 10 workstations, " +
      "built SharePoint pages, compared Jira and Asana in a written report, and tested content against WCAG.",
  },
  {
    role: "Delivery Driver",
    org: "Uber",
    logo: "uber",
    place: "Perth, WA · Freelance",
    period: "Nov 2024 – Oct 2025",
    summary: "Self-employed deliveries across Greater Perth, planning my own hours and routes.",
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
  /**
   * Live uptime lights (UptimeRobot) on the card. `monitor` is the monitor's numeric ID
   * (the number in its dashboard URL); `subject` names it in the spoken label.
   */
  uptime?: { monitor: string; subject: string };
  /**
   * Opens the card into a details panel (project-flip.tsx). Everything fits on one page:
   * photo, overview, sections, stack and links. Only a project with more to say (several
   * services, say) adds `morePages`, which turns the panel into a pager.
   */
  details?: {
    /** Photo beside the text; width/height set its aspect ratio. Files in public/projects/. */
    image?: { src: string; alt: string; width: number; height: number };
    /** A short paragraph on what it is and why. */
    overview: string;
    /** Short titled lists under the overview, e.g. "What I did". Keep them brief. */
    sections: { title: string; items: string[] }[];
    /** Technologies, shown as badges. */
    stack: string[];
    /** Further reading (repository, report, demo). */
    links?: { label: string; href: string }[];
    /** Extra pages after the first, only when one page can't hold it all. */
    morePages?: { label: string; sections: { title: string; items: string[] }[] }[];
  };
};

export const projects: Project[] = [
  {
    name: "Crux",
    kind: "Personal portfolio website",
    period: "2026–Present",
    stack: ["Next.js", "Tailwind CSS", "Docker", "Cloudflare Tunnel"],
    summary:
      "My personal portfolio website (this website), built with Next.js and shadcn/ui, self-hosted in Docker " +
      "behind a Cloudflare Tunnel and redeployed automatically from GitHub.",
    href: "https://github.com/VincentWang2961/Crux",
    uptime: { monitor: "804588170", subject: "Website" }, // vincentwang.au
  },
  {
    name: "Personal Home Lab",
    kind: "Self-hosted infrastructure",
    uptime: { monitor: "804697004", subject: "Home lab" }, // nas.vincentwang.au
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
    kind: "IoT plant care platform · team of four",
    period: "2025",
    stack: ["ESP32-S3", "C/C++", "MQTT", "Flask", "GPT-4o"],
    summary:
      "An indoor growing box that waters, lights and climate-controls plants from ESP32 sensors, with a Flask " +
      "dashboard and weekly GPT-4o care reports. I built the LLM analysis, the dashboard pages and the camera firmware.",
    details: {
      image: {
        src: "/projects/smart-plant-care.webp",
        alt: "Seedlings in a foil-lined grow box under LED lights, with the ESP32 board, relays, sensors and a fan wired above them",
        width: 1500,
        height: 2000,
      },
      overview:
        "A modular IoT platform that looks after indoor plants on its own. Sensors in a foil-lined grow box track " +
        "soil moisture, light, temperature and water level; the system waters, lights, heats and ventilates to match, " +
        "keeps a camera on the plants, and asks GPT-4o for a weekly care report. Built by a team of four for a UWA IoT unit.",
      sections: [
        {
          title: "What I did",
          items: [
            "Built the LLM analysis: a Flask service that sends seven days of sensor data and photos to GPT-4o and returns a structured plant health report.",
            "Designed and built the dashboard, plant setup, plant details and analysis pages.",
            "Wrote the ESP32 camera firmware for periodic photos and live streaming.",
            "Top contributor to the repository (26 commits).",
          ],
        },
      ],
      stack: ["XIAO ESP32S3", "C/C++", "MQTT", "Python", "Flask", "SQLite", "Chart.js", "OpenAI GPT-4o"],
      links: [{ label: "GitHub", href: "https://github.com/Cynthiachen2023/Smart-plant-care-system" }],
    },
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
  /** Mark shown before the entry (org-logo.tsx). */
  logo: OrgLogoKey;
  place: string;
  period: string;
  /** One short line under the heading: specialisation, result. */
  detail: string;
  /** One short paragraph. */
  summary: string;
};

export const education: EducationItem[] = [
  {
    degree: "Master of Information Technology",
    org: "The University of Western Australia",
    logo: "uwa",
    place: "Perth, WA",
    period: "2024 – 2026",
    detail: "Software Systems specialisation · Distinction average (WAM 74.3)",
    summary:
      "High Distinctions in the IT Capstone Project, High Performance Computing, Introduction to Cybersecurity " +
      "and Computational Thinking with Python; recognised by the CSSE department for peer learning support.",
  },
  {
    degree: "Bachelor of Engineering (Automotive Service Engineering)",
    org: "Jiangsu University of Technology",
    logo: "jsut",
    place: "Changzhou, China",
    period: "2019 – 2023",
    detail: "C programming, microcontrollers, electrical and electronic technology",
    summary: "Final-year project: a Java-based vehicle rental management system.",
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
  { src: "/photos/jewel-changi-rain-vortex.jpg", alt: "The Rain Vortex waterfall pouring through a glass dome into a terraced indoor forest, with a sky train crossing in front", place: "Jewel Changi Airport, Singapore", width: 1500, height: 1125 },
  { src: "/photos/perth-government-house.jpg", alt: "Government House, a red-brick building with slate-roofed turrets on a green lawn, under modern office towers", place: "Government House, Perth", width: 2000, height: 1500 },
];
