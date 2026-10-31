"""Local word-level transcription with faster-whisper (free, on-device).

Writes the same JSON shape ElevenLabs Scribe returns (a `words` list of
`word` / `spacing` entries with start and end seconds), so video-use's
`pack_transcripts.py` and `render.py` subtitle builder read it unchanged.

Whisper tends to drop filler words. An initial prompt written in a
disfluent style keeps most "um" and "uh" tokens in the output, which the
cut planner needs to remove them. Cached per source: a transcript is only
rebuilt when the source file's size or modification time changes.
"""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
from pathlib import Path

DEFAULT_MODEL = os.environ.get("SHORTFORM_WHISPER_MODEL", "small.en")
FILLER_PROMPT = "Um, so, uh, I was, like, you know, thinking. Uh, okay. Hmm."

TRANSCRIBE_OPTIONS = {
    "word_timestamps": True, "language": "en", "initial_prompt": FILLER_PROMPT,
    "vad_filter": True, "condition_on_previous_text": False,
}
# On clean speech with no fillers (HeyGen Margot renders v06 and v08, batch
# 01/11) the filler prompt makes Whisper hallucinate one "Thank you." for the
# whole clip. Normal speech runs about 2.5 words a second; below this floor
# the prompted pass is treated as a hallucination and the clip is
# transcribed again without the prompt.
MIN_WORDS_PER_SPEECH_S = 0.8


def _run(model, wav: Path, **opts) -> tuple[list[dict], object]:
    segments, info = model.transcribe(str(wav), **opts)
    words = [{"text": w.word, "start": w.start, "end": w.end, "probability": w.probability}
             for seg in segments for w in (seg.words or [])]
    return words, info


def source_fingerprint(path: Path) -> dict:
    st = path.stat()
    return {"size": st.st_size, "mtime": int(st.st_mtime)}


def extract_audio(video: Path, wav: Path) -> None:
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(video), "-vn", "-ac", "1",
         "-ar", "16000", "-c:a", "pcm_s16le", str(wav)],
        check=True,
    )


def words_to_scribe(words: list[dict], language: str = "en") -> dict:
    """Convert (text, start, end, probability) words to Scribe's shape.

    A `spacing` entry is inserted between consecutive words so the gap
    length is explicit, exactly as Scribe does.
    """
    out: list[dict] = []
    prev_end = None
    for w in words:
        text = w["text"].strip()
        if not text:
            continue
        if prev_end is not None:
            out.append({"type": "spacing", "text": " ", "start": prev_end,
                        "end": w["start"], "speaker_id": "speaker_0"})
        out.append({"type": "word", "text": text, "start": round(w["start"], 3),
                    "end": round(w["end"], 3), "speaker_id": "speaker_0",
                    "logprob": w.get("probability")})
        prev_end = round(w["end"], 3)
    text = " ".join(x["text"] for x in out if x["type"] == "word")
    return {"language_code": language, "text": text, "words": out,
            "engine": "faster-whisper"}


def transcribe(video: Path, out_json: Path, model_name: str = DEFAULT_MODEL,
               force: bool = False) -> dict:
    fp = source_fingerprint(video)
    if out_json.exists() and not force:
        cached = json.loads(out_json.read_text())
        if cached.get("source_fingerprint") == fp:
            return cached

    from faster_whisper import WhisperModel  # heavy import, loaded on demand

    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    with tempfile.TemporaryDirectory() as td:
        wav = Path(td) / "audio.wav"
        extract_audio(video, wav)
        words, info = _run(model, wav, **TRANSCRIBE_OPTIONS)
        speech_s = getattr(info, "duration_after_vad", None) or info.duration
        if len(words) < MIN_WORDS_PER_SPEECH_S * speech_s:
            plain = {k: v for k, v in TRANSCRIBE_OPTIONS.items() if k != "initial_prompt"}
            retry, _ = _run(model, wav, **plain)
            if len(retry) > len(words):
                words = retry
    data = words_to_scribe(words)
    data["source"] = str(video)
    data["source_fingerprint"] = fp
    data["model"] = model_name
    data["duration_s"] = round(info.duration, 3)
    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(json.dumps(data, indent=1))
    return data
