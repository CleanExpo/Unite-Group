"""Full-screen type moments rendered with PIL to a transparent overlay.

Doctrine: type lives in the world, never on a flat card. So a "full-screen"
moment is this overlay laid over the speaker's own footage, which the
compositor blurs and darkens for the window. Captions are off for the window.

One thing at a time (never parallel-reveal), cubic easing (never linear),
final frame held at least one second.
"""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 24
FONT = "/System/Library/Fonts/Avenir Next.ttc"
HEAVY, DEMI = 8, 2


def ease_out_cubic(t: float) -> float:
    t = min(max(t, 0.0), 1.0)
    return 1 - (1 - t) ** 3


def fit_font(text: str, size: int, index: int, max_w: int) -> ImageFont.FreeTypeFont:
    """Largest font (down from `size`) whose rendered text fits `max_w` pixels."""
    while size > 24:
        font = ImageFont.truetype(FONT, size, index=index)
        if font.getbbox(text)[2] <= max_w:
            return font
        size -= 4
    return ImageFont.truetype(FONT, size, index=index)


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def list_reveal_frames(title: str, items: list[str], duration: float,
                       accent: str = "#2BB0A6",
                       item_times: list[float] | None = None) -> list[Image.Image]:
    """Title lands, then each item slides in on its own beat, then hold.

    `item_times` (seconds from the insert's start) lands each item on the
    moment it is spoken; without them items are spaced evenly.
    """
    margin = 90
    title_font = fit_font(title.upper(), 92, HEAVY, W - 2 * margin)
    longest = max(items, key=len) if items else ""
    item_font = fit_font(longest, 66, DEMI, W - 2 * margin - 120)
    num_font = ImageFont.truetype(FONT, 66, index=HEAVY)
    acc = hex_rgb(accent)
    n_frames = int(round(duration * FPS))
    hold = 1.0
    reveal_window = max(0.6, duration - hold - 0.4)
    step = reveal_window / max(1, len(items))
    top = 560
    frames = []
    for f in range(n_frames):
        t = f / FPS
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        k = ease_out_cubic(t / 0.35)
        ty = top - int((1 - k) * 40)
        d.text((90, ty), title.upper(), font=title_font, fill=(255, 255, 255, int(255 * k)))
        d.rectangle([90, ty + 118, 90 + int(220 * k), ty + 128], fill=acc + (int(255 * k),))
        for i, item in enumerate(items):
            t0 = item_times[i] - 0.15 if item_times else 0.4 + i * step
            k = ease_out_cubic((t - t0) / 0.32)
            if k <= 0:
                continue
            y = top + 200 + i * 118
            x = 90 + int((1 - k) * 70)
            a = int(255 * k)
            d.text((x, y), f"{i + 1:02d}", font=num_font, fill=acc + (a,))
            d.text((x + 120, y), item, font=item_font, fill=(255, 255, 255, a))
        frames.append(img)
    return frames


def render_overlay(frames: list[Image.Image], out: Path) -> Path:
    """Write RGBA frames to a .mov with alpha (PNG codec) for ffmpeg overlay."""
    with tempfile.TemporaryDirectory() as td:
        for i, fr in enumerate(frames):
            fr.save(Path(td) / f"f{i:04d}.png")
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-framerate", str(FPS),
             "-i", str(Path(td) / "f%04d.png"), "-c:v", "png",
             "-pix_fmt", "rgba", str(out)],
            check=True,
        )
    return out
