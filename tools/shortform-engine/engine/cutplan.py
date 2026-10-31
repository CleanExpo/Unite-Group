"""Automatic cut planning from a word-level transcript.

Removes long pauses, filler words, bracketed noises (throat-clears, coughs)
and failed takes, and returns keep-ranges in video-use's EDL range format.

Production rules inherited from video-use (hard, not taste):
  * every cut edge sits on a word boundary (never inside a word);
  * every cut edge is padded inside the 30-200 ms working window;
  * output-timeline offsets are computed from the kept ranges only.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

FILLERS = {"um", "umm", "uh", "uhh", "er", "erm", "ah", "ahh", "hmm", "mm", "mmm"}
RESTART_MARKERS = (
    ("let", "me", "start", "again"), ("start", "again"), ("take", "two"),
    ("let", "me", "try", "that", "again"), ("scratch", "that"),
)
SENTENCE_END = re.compile(r"[.!?]$")


@dataclass
class CutSettings:
    max_pause: float = 0.30   # gaps longer than this are cut
    pad_in: float = 0.05      # kept before the first word of a range
    pad_out: float = 0.08     # kept after the last word of a range
    min_range: float = 0.25   # shorter keep-ranges merge into a neighbour
    restart_ngram: int = 3    # words that must repeat to count as a retake
    restart_window: float = 15.0


@dataclass
class Word:
    text: str
    start: float
    end: float
    norm: str = field(init=False)

    def __post_init__(self) -> None:
        self.norm = normalise(self.text)


def normalise(text: str) -> str:
    return re.sub(r"[^a-z0-9']", "", text.lower())


def is_noise(text: str) -> bool:
    t = text.strip()
    if t.startswith(("(", "[")) and t.endswith((")", "]")):
        return True
    return normalise(t) in FILLERS


def words_from_transcript(transcript: dict) -> list[Word]:
    return [Word(w["text"], float(w["start"]), float(w["end"]))
            for w in transcript.get("words", []) if w.get("type", "word") == "word"]


def _sentence_starts(words: list[Word]) -> list[int]:
    starts = [0]
    for i, w in enumerate(words[:-1]):
        if SENTENCE_END.search(w.text.strip()):
            starts.append(i + 1)
    return starts


def find_failed_takes(words: list[Word], s: CutSettings) -> set[int]:
    """Indices of words that belong to an abandoned take.

    Two signals:
      1. An explicit restart marker ("let me start again") drops everything
         from the start of the sentence it interrupts through the marker.
      2. A restart: the first `restart_ngram` words of a sentence reappear
         later within the window, before that sentence ended cleanly. The
         earlier attempt is dropped and the later take kept.
    """
    drop: set[int] = set()
    norms = [w.norm for w in words]
    starts = _sentence_starts(words)

    for marker in RESTART_MARKERS:
        n = len(marker)
        for i in range(len(norms) - n + 1):
            if tuple(norms[i:i + n]) == marker:
                sent_start = max([st for st in starts if st <= i] or [0])
                drop.update(range(sent_start, i + n))

    n = s.restart_ngram
    for i in range(len(words) - n):
        head = norms[i:i + n]
        if any(not h for h in head) or any(h in FILLERS for h in head):
            continue
        # only consider attempts that begin a phrase (sentence start or after a pause)
        begins = i in starts or (i > 0 and words[i].start - words[i - 1].end > 0.25)
        if not begins:
            continue
        for j in range(i + 1, len(words) - n + 1):
            if words[j].start - words[i].start > s.restart_window:
                break
            if norms[j:j + n] == head:
                # did the first attempt finish its sentence before j?
                finished = any(SENTENCE_END.search(words[k].text.strip())
                               for k in range(i, j - 1))
                if not finished:
                    drop.update(range(i, j))
                break
    return drop


def plan_cuts(transcript: dict, source: str, s: CutSettings | None = None) -> list[dict]:
    s = s or CutSettings()
    words = words_from_transcript(transcript)
    failed = find_failed_takes(words, s)
    kept = [(i, w) for i, w in enumerate(words) if i not in failed and not is_noise(w.text)]

    ranges: list[dict] = []
    group: list[tuple[int, Word]] = []

    def flush() -> None:
        if not group:
            return
        first, last = group[0][1], group[-1][1]
        ranges.append({
            "source": source,
            "start": first.start, "end": last.end,
            "quote": " ".join(w.text.strip() for _, w in group),
            "first_index": group[0][0], "last_index": group[-1][0],
        })

    for i, w in kept:
        if group:
            prev_i, prev = group[-1]
            removed_between = any(k in failed or is_noise(words[k].text)
                                  for k in range(prev_i + 1, i))
            if w.start - prev.end > s.max_pause or removed_between:
                flush()
                group = []
        group.append((i, w))
    flush()

    # pad edges without crossing into neighbouring (removed) words
    for r in ranges:
        fi, li = r.pop("first_index"), r.pop("last_index")
        lo = words[fi - 1].end if fi > 0 else 0.0
        hi = words[li + 1].start if li + 1 < len(words) else r["end"] + s.pad_out
        r["start"] = round(max(lo, r["start"] - s.pad_in, 0.0), 3)
        r["end"] = round(min(hi, r["end"] + s.pad_out), 3)

    # merge ranges too short to stand alone
    merged: list[dict] = []
    for r in ranges:
        if merged and (r["end"] - r["start"] < s.min_range
                       or r["start"] - merged[-1]["end"] < 0.02):
            merged[-1]["end"] = r["end"]
            merged[-1]["quote"] += " " + r["quote"]
        else:
            merged.append(r)
    for r in merged:
        r["reason"] = "auto: pauses, fillers and failed takes removed"
    return merged


def output_time(src_time: float, ranges: list[dict], source: str) -> float | None:
    """Map a source timestamp onto the edited output timeline (Hard Rule 5)."""
    offset = 0.0
    for r in ranges:
        if r["source"] == source and r["start"] <= src_time <= r["end"]:
            return round(offset + (src_time - r["start"]), 3)
        offset += r["end"] - r["start"]
    return None


def total_duration(ranges: list[dict]) -> float:
    return round(sum(r["end"] - r["start"] for r in ranges), 3)
