"use client";

import { useEffect, useRef } from "react";
import {
  LAND_GRID_COLS,
  LAND_GRID_ROWS,
  LAND_GRID_STEP,
  LAND_MASK_BASE64,
} from "@/lib/land-mask";
import { SERVER_NODES, type LabelPlacement } from "@/lib/site-data";

// Minimal dotted globe showing server deployment locations (style reference:
// the "Region: Earth" globe on cloudflare.com, rendered monochrome).
//
// - Very light grey sphere.
// - Land only, as a dense field of tiny dots on a Fibonacci (golden-angle spiral)
//   lattice: near-uniform spacing everywhere with no rings, seams or pole artefacts
//   (latitude-ring layouts form visible concentric circles near the poles). No ocean dots.
// - Dots get more opaque towards the limb (rim), which gives the sphere depth.
// - Server nodes: white badge with a dark border, pulsing ring and a name pill.
//
// Draw order (back to front): shadow + sphere → land dots →
// [future: node-to-node link arcs] → node markers → labels.
// See AGENTS.md → "Matrix globe" for the planned SERVER_LINKS feature.

const DEG = Math.PI / 180;

// Dots
const DOT_SPACING = 1.0 * DEG; // angular distance between neighbouring dots
const DOT_SIZE = 0.3; // dot radius as a fraction of DOT_SPACING (< 0.5 → gaps)
const ALPHA_CENTER = 0.35; // dot opacity facing the viewer
const ALPHA_LIMB = 1; // dot opacity at the rim
const ALPHA_LEVELS = 8;

// Motion
const AUTO_SPEED = 0.06; // rad/s
const IDLE_RESUME_MS = 2500;
const MIN_PITCH = -1.2;
const MAX_PITCH = 1.2;
const INITIAL_VIEW = { lat: 2, lon: 125 }; // centred on the current nodes

// Palette (monochrome)
const SPHERE_INNER = "#fafafa";
const SPHERE_OUTER = "#e4e4e4";
const RIM = "rgba(0,0,0,0.12)";
const LAND_RGB = "85,85,85";
const NODE = "#ffffff";
const NODE_BORDER = "#3a3a3a";
const NODE_RING = "40,40,40"; // rgb triplet, alpha animated
const LABEL_BG = "rgba(18,18,18,0.88)";
const LABEL_BORDER = "rgba(255,255,255,0.28)";

type Vec3 = [number, number, number];

function toVec(lat: number, lon: number): Vec3 {
  return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
}

function landLookup() {
  const bin = atob(LAND_MASK_BASE64);
  return (latRad: number, lonRad: number) => {
    const lat = latRad / DEG;
    const lon = lonRad / DEG;
    const r = Math.min(LAND_GRID_ROWS - 1, Math.max(0, Math.floor((90 - lat) / LAND_GRID_STEP)));
    const c = Math.min(LAND_GRID_COLS - 1, Math.max(0, Math.floor((lon + 180) / LAND_GRID_STEP)));
    const k = r * LAND_GRID_COLS + c;
    return ((bin.charCodeAt(k >> 3) >> (k & 7)) & 1) === 1;
  };
}

// Land dots on a Fibonacci sphere lattice; returns a flat array of unit vectors.
// N is chosen so each dot covers the area of a hexagonal cell with DOT_SPACING pitch.
function buildLandDots(): Float32Array {
  const isLand = landLookup();
  const n = Math.round((4 * Math.PI) / ((Math.sqrt(3) / 2) * DOT_SPACING * DOT_SPACING));
  const golden = Math.PI * (3 - Math.sqrt(5));
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * i + 1) / n;
    const lat = Math.asin(y);
    const lon = (((i * golden) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    if (isLand(lat, lon)) pts.push(...toVec(lat, lon));
  }
  return new Float32Array(pts);
}

const LABEL_DIR: Record<LabelPlacement, [number, number]> = {
  ne: [1, -1],
  nw: [-1, -1],
  se: [1, 1],
  sw: [-1, 1],
};

export function MatrixGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const land = buildLandDots();
    const nodes = SERVER_NODES.map((node) => ({ ...node, v: toVec(node.lat * DEG, node.lon * DEG) }));

    // Canvas can't resolve CSS variables, so read the page's (sans-serif) font stack.
    const fontFamily = getComputedStyle(canvas).fontFamily || "sans-serif";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let yaw = -INITIAL_VIEW.lon * DEG;
    let pitch = -INITIAL_VIEW.lat * DEG;
    let velocity = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let lastInteraction = 0;

    let width = 0;
    let height = 0;
    let dpr = 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Rotation: yaw around the polar (Y) axis, then pitch around X. Result in `out`.
    let cy = 1, sy = 0, cp = 1, sp = 0;
    const out = new Float32Array(3);
    const rotate = (v: ArrayLike<number>, o: number) => {
      const x = v[o], y = v[o + 1], z = v[o + 2];
      const x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;
      out[0] = x1;
      out[1] = y * cp - z1 * sp;
      out[2] = y * sp + z1 * cp;
    };

    const radiusOf = () => Math.min(width, height) * 0.4;

    const draw = (t: number) => {
      cy = Math.cos(yaw); sy = Math.sin(yaw);
      cp = Math.cos(pitch); sp = Math.sin(pitch);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const R = radiusOf();
      const ox = width / 2;
      const oy = height / 2;

      // Sphere with a soft drop shadow so it floats above the page.
      const grad = ctx.createRadialGradient(ox - R * 0.3, oy - R * 0.35, R * 0.05, ox, oy, R);
      grad.addColorStop(0, SPHERE_INNER);
      grad.addColorStop(1, SPHERE_OUTER);
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowBlur = R * 0.2 * dpr;
      ctx.shadowOffsetY = R * 0.06 * dpr;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(ox, oy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Land dots, batched by opacity level (more opaque towards the rim).
      const r = DOT_SIZE * DOT_SPACING * R;
      const paths = Array.from({ length: ALPHA_LEVELS }, () => new Path2D());
      for (let o = 0; o < land.length; o += 3) {
        rotate(land, o);
        const z = out[2];
        if (z <= 0) continue;
        const px = ox + out[0] * R;
        const py = oy - out[1] * R;
        const level = Math.min(ALPHA_LEVELS - 1, Math.floor((1 - z) * ALPHA_LEVELS));
        const path = paths[level];
        path.moveTo(px + r, py);
        path.arc(px, py, r, 0, Math.PI * 2);
      }
      for (let i = 0; i < ALPHA_LEVELS; i++) {
        const k = (i + 0.5) / ALPHA_LEVELS;
        const a = ALPHA_CENTER + (ALPHA_LIMB - ALPHA_CENTER) * k * k;
        ctx.fillStyle = `rgba(${LAND_RGB},${a.toFixed(3)})`;
        ctx.fill(paths[i]);
      }

      ctx.strokeStyle = RIM;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ox, oy, R, 0, Math.PI * 2);
      ctx.stroke();

      // [Future] SERVER_LINKS: draw great-circle arcs between nodes here, so they sit
      // above the land but below node markers and labels.

      // Server nodes: white badge with a dark border + expanding ring.
      const phase = reducedMotion ? 0.35 : (t % 2400) / 2400;
      for (const node of nodes) {
        rotate(node.v, 0);
        if (out[2] <= 0.02) continue;
        const px = ox + out[0] * R;
        const py = oy - out[1] * R;
        const s = Math.max(0.4, out[2]);

        const ringR = (6 + 16 * phase) * s;
        ctx.strokeStyle = `rgba(${NODE_RING},${0.55 * (1 - phase)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, ringR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 4 * dpr;
        ctx.fillStyle = NODE;
        ctx.beginPath();
        ctx.arc(px, py, 6 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = NODE_BORDER;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = NODE_BORDER;
        ctx.beginPath();
        ctx.arc(px, py, 2 * s, 0, Math.PI * 2);
        ctx.fill();
      }

      // Labels: dark pill with white text, placed in each node's preferred quadrant.
      ctx.font = `600 12px ${fontFamily}`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      for (const node of nodes) {
        rotate(node.v, 0);
        if (out[2] <= 0.12) continue;
        const px = ox + out[0] * R;
        const py = oy - out[1] * R;
        const [dx, dy] = LABEL_DIR[node.label];
        const ex = px + dx * 20;
        const ey = py + dy * 18;
        const padX = 8;
        const h = 22;
        const w = ctx.measureText(node.name).width + padX * 2;
        const bx = dx > 0 ? ex : ex - w;

        ctx.globalAlpha = Math.min(1, (out[2] - 0.12) * 5);
        ctx.strokeStyle = "rgba(30,30,30,0.7)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + dx * 6, py + dy * 6);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        ctx.fillStyle = LABEL_BG;
        ctx.strokeStyle = LABEL_BORDER;
        ctx.beginPath();
        ctx.roundRect(bx, ey - h / 2, w, h, h / 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.fillText(node.name, bx + padX, ey + 0.5);
        ctx.globalAlpha = 1;
      }
    };

    let raf = 0;
    let prev = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - prev) / 1000);
      prev = t;
      if (!dragging) {
        if (Math.abs(velocity) > 0.0001) {
          yaw += velocity;
          velocity *= 0.94; // inertia after a drag
        } else if (!reducedMotion && t - lastInteraction > IDLE_RESUME_MS) {
          yaw += AUTO_SPEED * dt;
        }
      }
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onDown = (e: PointerEvent) => {
      dragging = true;
      velocity = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const R = radiusOf();
      const dx = (e.clientX - lastX) / R;
      const dy = (e.clientY - lastY) / R;
      lastX = e.clientX;
      lastY = e.clientY;
      yaw += dx;
      pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitch + dy));
      velocity = dx;
      lastInteraction = performance.now();
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      lastInteraction = performance.now();
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="aspect-square w-full max-w-[560px] cursor-grab touch-none select-none active:cursor-grabbing"
      role="img"
      aria-label={`服务器节点：${SERVER_NODES.map((n) => n.name).join("、")}`}
    />
  );
}
