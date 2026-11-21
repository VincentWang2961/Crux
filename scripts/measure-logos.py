#!/usr/bin/env python3
"""Measure the organisation logos in public/logos/ for optical sizing (org-logo.tsx).

What makes two marks look the same size is mostly the area of their *visible outline*: the
convex hull of the parts that stand out from the page. Not their bounding box (a disc fills
less of its box than a shield), and not their ink (an open wave reads as one shape). So for
every logo (<key>.svg or <key>.png; <key>-dark.* is its dark-theme twin,
same aspect), and for each theme, this script:
  1. renders the file and weighs each pixel by alpha × its lightness contrast with that
     theme's page background (CIE L*), so white on white or black on near-black counts
     as unseen;
  2. takes the pixels with weight > VISIBLE as the visible part and finds its convex hull;
  3. records `footprint` = hull area / the file's full box area (0..1).
It also records `aspect` = width / height of the file's box. With --trim it first crops
each file to its ink (SVG viewBox rewritten, PNG cropped).

The numbers are written to src/lib/logo-metrics.ts; the sizing formula lives in org-logo.tsx.

Needs rsvg-convert (librsvg) and Pillow:
  brew install librsvg && python3 -m pip install pillow
  python3 scripts/measure-logos.py --trim
"""

import io
import json
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
LOGOS = ROOT / "public" / "logos"
OUT = ROOT / "src" / "lib" / "logo-metrics.ts"
RENDER = 512  # px on the longer side, for trimming
MEASURE = 200  # px on the longer side, for the hull
ALPHA_MIN = 8
VISIBLE = 0.08  # alpha × ΔL*/100 above which a pixel counts as visible
# Page backgrounds (globals.css --background): white, and oklch(0.235 0 0) ≈ #1e1e1e.
BACKGROUND = {"light": (255, 255, 255), "dark": (30, 30, 30)}


def lightness(r: int, g: int, b: int) -> float:
    """CIE L* (0..100) of an sRGB colour."""

    def lin(c: float) -> float:
        c /= 255
        return ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92

    y = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
    return 116 * y ** (1 / 3) - 16 if y > 0.008856 else 903.3 * y


def render(path: Path, size: int) -> Image.Image:
    if path.suffix == ".png":
        img = Image.open(path).convert("RGBA")
        img.thumbnail((size, size), Image.LANCZOS)
        return img
    out = subprocess.run(["rsvg-convert", "-w", str(size), str(path)], check=True, capture_output=True).stdout
    img = Image.open(io.BytesIO(out)).convert("RGBA")
    if img.height > img.width:
        out = subprocess.run(["rsvg-convert", "-h", str(size), str(path)], check=True, capture_output=True).stdout
        img = Image.open(io.BytesIO(out)).convert("RGBA")
    return img


def ink_box(img: Image.Image):
    return img.getchannel("A").point(lambda a: 255 if a > ALPHA_MIN else 0).getbbox()


def trim_svg(path: Path, img: Image.Image, box) -> None:
    text = path.read_text()
    m = re.search(r'viewBox="([-\d.\s,]+)"', text)
    x, y, w, h = (float(v) for v in re.split(r"[\s,]+", m.group(1).strip()))
    sx, sy = w / img.width, h / img.height
    x0, y0, x1, y1 = box
    vb = f"{x + x0 * sx:.3f} {y + y0 * sy:.3f} {(x1 - x0) * sx:.3f} {(y1 - y0) * sy:.3f}"
    path.write_text(text.replace(m.group(0), f'viewBox="{vb}"', 1))


def hull_area(points) -> float:
    """Area of the convex hull of integer points (Andrew's monotone chain + shoelace)."""
    pts = sorted(set(points))

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    h = lower[:-1] + upper[:-1]
    return abs(sum(h[i][0] * h[i - 1][1] - h[i - 1][0] * h[i][1] for i in range(len(h)))) / 2


def footprint(path: Path, background) -> float:
    img = render(path, MEASURE)
    bg = lightness(*background)
    px = img.load()
    pts = []
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a / 255 * abs(lightness(r, g, b) - bg) / 100 > VISIBLE:
                pts += [(x, y), (x + 1, y), (x, y + 1), (x + 1, y + 1)]  # pixel corners
    return hull_area(pts) / (img.width * img.height) if pts else 0.0


def main() -> None:
    trim = "--trim" in sys.argv
    files = sorted(p for p in LOGOS.iterdir() if p.suffix in {".svg", ".png"} and "-dark" not in p.stem)
    metrics = {}
    for path in files:
        if trim:  # each file by its own ink: a dark twin may be drawn differently
            for f in [path, *LOGOS.glob(f"{path.stem}-dark.*")]:
                img = render(f, RENDER)
                box = ink_box(img)
                if box == (0, 0, img.width, img.height):
                    continue
                if f.suffix == ".svg":
                    trim_svg(f, img, box)
                else:
                    Image.open(f).crop(box).save(f, optimize=True)
        img = render(path, RENDER)
        dark = next(iter(LOGOS.glob(f"{path.stem}-dark.*")), None)
        metrics[path.stem] = {
            "src": f"/logos/{path.name}",
            **({"darkSrc": f"/logos/{dark.name}"} if dark else {}),
            "aspect": round(img.width / img.height, 4),
            "footprint": {
                "light": round(footprint(path, BACKGROUND["light"]), 4),
                "dark": round(footprint(dark or path, BACKGROUND["dark"]), 4),
            },
        }
        m = metrics[path.stem]
        print(f"{path.stem:12} aspect {m['aspect']:.3f}  footprint light {m['footprint']['light']:.3f}  dark {m['footprint']['dark']:.3f}")

    OUT.write_text(
        "// Generated by scripts/measure-logos.py from public/logos/. Do not edit by hand.\n"
        "// aspect = width / height of the (trimmed) file; footprint = area of the convex hull of\n"
        "// the parts visible on that theme's background, as a share of the file's box (0..1).\n\n"
        "export type LogoMetrics = {\n  src: string;\n  darkSrc?: string;\n  aspect: number;\n"
        "  footprint: { light: number; dark: number };\n};\n\n"
        f"export const LOGO_METRICS = {json.dumps(metrics, indent=2)} satisfies Record<string, LogoMetrics>;\n"
    )
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
