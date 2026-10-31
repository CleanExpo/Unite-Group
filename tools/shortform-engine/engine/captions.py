"""Captions and stacked type as one ASS subtitle file, burned LAST.

* One-line captions hang from a chin line (a fraction of frame height), so
  they sit just under the face and never cover it.
* Captions are suppressed while a B-roll or full-screen insert is on screen.
* Stacked big type (up to three short lines) holds for a readable time and
  sits in its own band, clear of the caption line.

All timings are on the OUTPUT timeline (video-use Hard Rule 5).
"""

from __future__ import annotations

from dataclasses import dataclass

from .cutplan import is_noise, normalise, words_from_transcript

W, H = 1080, 1920


@dataclass
class CaptionStyle:
    # Full face names, Bold flag off: libass via CoreText resolves the bare
    # family "Avenir Next" with Bold=1 to the Bold Italic face (seen on job-001 v1).
    font: str = "Avenir Next Demi Bold"
    size: int = 64
    max_chars: int = 26
    max_words: int = 5
    chin_line: float = 0.58        # top of caption as fraction of height
    stack_font: str = "Avenir Next Heavy"
    stack_size: int = 118
    stack_top: float = 0.66        # top of the stacked-type block
    stack_colour: str = "FFFFFF"
    accent_colour: str = "F26B1D"  # highlight colour for the accent line
    uppercase_stack: bool = True
    hide_under_stack: bool = False  # drop the caption line while stacked type is up


def ass_time(t: float) -> str:
    t = max(0.0, t)
    cs = int(round(t * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    s, cs = divmod(cs, 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def ass_colour(hex_rgb: str, alpha: str = "00") -> str:
    r, g, b = hex_rgb[0:2], hex_rgb[2:4], hex_rgb[4:6]
    return f"&H{alpha}{b}{g}{r}".upper()


def escape(text: str) -> str:
    return text.replace("\\", "").replace("{", "(").replace("}", ")").replace("\n", " ")


def chunk_words(words: list[tuple[str, float, float]], max_chars: int,
                max_words: int) -> list[tuple[str, float, float]]:
    """Group (text, start, end) words into one-line caption chunks.

    Breaks on punctuation, on the character/word budget, and on any gap of
    more than 0.6 s (a cut or a breath), so a caption never straddles a cut.
    """
    chunks: list[tuple[str, float, float]] = []
    cur: list[tuple[str, float, float]] = []

    def flush() -> None:
        if cur:
            chunks.append((" ".join(w[0] for w in cur), cur[0][1], cur[-1][2]))
            cur.clear()

    for text, s, e in words:
        candidate = " ".join([w[0] for w in cur] + [text])
        if cur and (len(candidate) > max_chars or len(cur) >= max_words
                    or s - cur[-1][2] > 0.6):
            flush()
        cur.append((text, s, e))
        if text[-1:] in ".?!,;:":
            flush()
    flush()
    return chunks


def apply_corrections(timeline: list[tuple[str, float, float]],
                      corrections: list[dict]) -> list[tuple[str, float, float]]:
    """Replace misheard word runs ({"from": "...", "to": "..."}) on screen.

    Matching ignores case and punctuation; trailing punctuation of the last
    matched word is kept. Replacement words share the matched time span.
    """
    out = list(timeline)
    for c in corrections:
        src = [normalise(x) for x in c["from"].split()]
        dst = c["to"].split()
        n = len(src)
        i = 0
        while i <= len(out) - n:
            if [normalise(w[0]) for w in out[i:i + n]] == src:
                s, e = out[i][1], out[i + n - 1][2]
                tail = out[i + n - 1][0]
                punct = tail[len(tail.rstrip(".,!?;:")):]
                step = (e - s) / len(dst)
                repl = [(w, round(s + k * step, 3), round(s + (k + 1) * step, 3))
                        for k, w in enumerate(dst)]
                if punct and not repl[-1][0].endswith(punct):
                    repl[-1] = (repl[-1][0] + punct, repl[-1][1], repl[-1][2])
                out[i:i + n] = repl
                i += len(dst)
            else:
                i += 1
    return out


def blocked(t0: float, t1: float, windows: list[tuple[float, float]]) -> bool:
    return any(t0 < b1 and t1 > b0 for b0, b1 in windows)


STACK_FONT_FILE = ("/System/Library/Fonts/Avenir Next.ttc", 8)  # Heavy face, matches Stack style


def fit_stack_size(lines: list[str], size: int, max_w: int = W - 140) -> int:
    """Font size at which the widest stacked line fits the frame (libass never wraps here)."""
    try:
        from PIL import ImageFont
    except ImportError:
        return size
    path, index = STACK_FONT_FILE
    while size > 40:
        font = ImageFont.truetype(path, size, index=index)
        if max(font.getbbox(line)[2] for line in lines) <= max_w:
            return size
        size -= 4
    return size


def reading_hold(text: str) -> float:
    """Seconds stacked type must stay up to be read at 1x by a phone viewer."""
    words = len(text.split())
    return max(1.6, 0.8 + words * 0.32)


def build_ass(transcripts: dict[str, dict], ranges: list[dict], style: CaptionStyle,
              stacks: list[dict] | None = None,
              no_caption_windows: list[tuple[float, float]] | None = None,
              corrections: list[dict] | None = None) -> str:
    stacks = stacks or []
    no_caption_windows = list(no_caption_windows or [])

    # words on the output timeline, in output order
    timeline: list[tuple[str, float, float]] = []
    offset = 0.0
    for r in ranges:
        for w in words_from_transcript(transcripts[r["source"]]):
            if w.start >= r["start"] - 1e-3 and w.end <= r["end"] + 1e-3 and not is_noise(w.text):
                timeline.append((w.text.strip(), round(offset + w.start - r["start"], 3),
                                 round(offset + w.end - r["start"], 3)))
        offset += r["end"] - r["start"]
    timeline = apply_corrections(timeline, corrections or [])

    white = ass_colour("FFFFFF")
    black = ass_colour("000000")
    shadow = ass_colour("000000", "80")
    cap_y = int(style.chin_line * H)
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,{style.font},{style.size},{white},{white},{black},{shadow},0,0,0,0,100,100,0,0,1,5,2,8,60,60,0,1
Style: Stack,{style.stack_font},{style.stack_size},{ass_colour(style.stack_colour)},{white},{black},{shadow},0,0,0,0,100,100,-2,0,1,7,3,8,70,70,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    events: list[str] = []
    stack_windows: list[tuple[float, float]] = []
    for st in stacks:
        lines = [escape(x.upper() if style.uppercase_stack else x) for x in st["lines"][:3]]
        start = float(st["at"])
        end = start + max(float(st.get("hold", 0)), reading_hold(" ".join(lines)))
        accent = st.get("accent_line")
        parts = []
        for i, line in enumerate(lines):
            if accent is not None and i == accent:
                parts.append("{\\c" + ass_colour(style.accent_colour) + "}" + line + "{\\c" + ass_colour(style.stack_colour) + "}")
            else:
                parts.append(line)
        y = int(style.stack_top * H)
        fs = fit_stack_size(lines, style.stack_size)
        # quick scale-in pop, then hold
        fx = "{\\pos(540," + str(y) + ")\\fs" + str(fs) + "\\fscx88\\fscy88\\t(0,140,\\fscx100\\fscy100)\\fad(60,120)}"
        events.append(f"Dialogue: 2,{ass_time(start)},{ass_time(end)},Stack,,0,0,0,,{fx}" + "\\N".join(parts))
        stack_windows.append((start, end))

    if style.hide_under_stack:
        no_caption_windows += stack_windows
    for text, s, e in chunk_words(timeline, style.max_chars, style.max_words):
        if blocked(s, e, no_caption_windows):
            continue
        events.append(f"Dialogue: 1,{ass_time(s)},{ass_time(e + 0.05)},Caption,,0,0,0,,"
                      "{\\pos(540," + str(cap_y) + ")}" + escape(text))
    return header + "\n".join(events) + "\n"
