"""Music bed, sound effects and loudness measurement.

The music bed sits a fixed number of dB under the voice (default 25 dB),
measured as integrated loudness (EBU R128), not guessed from a slider.
When no licensed track is supplied, an in-house bed and sound effects are
synthesised with ffmpeg so nothing third-party enters the mix.
"""

from __future__ import annotations

import re
import subprocess
from pathlib import Path

LUFS_RE = re.compile(r"I:\s+(-?[\d.]+|-inf) LUFS")


def measure_lufs(path: Path) -> float:
    """Integrated loudness of the first audio stream, in LUFS."""
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-map", "0:a:0",
         "-af", "ebur128", "-f", "null", "-"],
        capture_output=True, text=True, check=True,
    )
    found = LUFS_RE.findall(proc.stderr)
    if not found or found[-1] == "-inf":
        raise ValueError(f"no measurable audio in {path}")
    return float(found[-1])


def music_gain_db(voice_lufs: float, music_lufs: float, under_db: float = 25.0) -> float:
    """Gain to apply to the music so it lands `under_db` below the voice."""
    return round((voice_lufs - under_db) - music_lufs, 2)


def synth_music_bed(out: Path, duration: float) -> Path:
    """A warm two-chord pad with a soft pulse. Generated, not sampled."""
    d = f"{duration + 2:.2f}"
    # chords alternate every 4 s: A minor add9 -> F major 7 (pure sines, slow swell)
    expr = (
        "0.16*(sin(2*PI*220*t)+sin(2*PI*261.63*t)+sin(2*PI*329.63*t)+0.6*sin(2*PI*493.88*t))"
        "*lt(mod(t,8),4)"
        "+0.16*(sin(2*PI*174.61*t)+sin(2*PI*220*t)+sin(2*PI*261.63*t)+0.6*sin(2*PI*329.63*t))"
        "*gte(mod(t,8),4)"
    )
    pulse = "0.25*sin(2*PI*55*t)*exp(-9*mod(t,0.6))"
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error",
         "-f", "lavfi", "-i", f"aevalsrc='{expr}':s=48000:d={d}",
         "-f", "lavfi", "-i", f"aevalsrc='{pulse}':s=48000:d={d}",
         "-filter_complex",
         "[0:a]lowpass=f=1800,tremolo=f=0.25:d=0.35,aecho=0.8:0.7:120:0.25[p];"
         "[1:a]lowpass=f=160[k];[p][k]amix=inputs=2:normalize=0,"
         "afade=t=in:st=0:d=1.5,volume=0.6,aformat=channel_layouts=stereo[a]",
         "-map", "[a]", "-c:a", "pcm_s16le", str(out)],
        check=True,
    )
    return out


def synth_whoosh(out: Path) -> Path:
    """Short air whoosh for type and B-roll entrances."""
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "lavfi",
         "-i", "anoisesrc=color=pink:d=0.55:a=0.6:r=48000",
         "-af", "highpass=f=400,lowpass=f=5000,"
                "afade=t=in:st=0:d=0.22:curve=qsin,afade=t=out:st=0.25:d=0.3:curve=exp,"
                "aformat=channel_layouts=stereo",
         "-c:a", "pcm_s16le", str(out)],
        check=True,
    )
    return out


def synth_pop(out: Path) -> Path:
    """Soft tonal pop for a stacked-type landing."""
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "lavfi",
         "-i", "aevalsrc='0.5*sin(2*PI*(660+400*exp(-30*t))*t)*exp(-14*t)':s=48000:d=0.35",
         "-af", "aformat=channel_layouts=stereo", "-c:a", "pcm_s16le", str(out)],
        check=True,
    )
    return out


def mix_filter(music_idx: int, sfx_base_idx: int, music_gain: float, duration: float,
               sfx_events: list[dict]) -> str:
    """Filter graph: input 0 = programme (voice), `music_idx` = music,
    `sfx_base_idx + n` = sound-effect file n (event field `input` = n).

    Output label [aout]. Voice keeps its level; music is trimmed, faded and
    set to `music_gain` dB; each sound effect is delayed onto its cue.
    """
    fade_out = max(0.0, duration - 1.5)
    parts = [
        f"[{music_idx}:a]atrim=0:{duration:.3f},asetpts=PTS-STARTPTS,"
        f"afade=t=in:st=0:d=0.8,afade=t=out:st={fade_out:.3f}:d=1.5,"
        f"volume={music_gain}dB[mus]"
    ]
    labels = ["[0:a]", "[mus]"]
    for i, ev in enumerate(sfx_events):
        ms = int(round(float(ev["at"]) * 1000))
        gain = float(ev.get("gain_db", -14))
        parts.append(f"[{sfx_base_idx + ev['input']}:a]adelay={ms}|{ms},volume={gain}dB[s{i}]")
        labels.append(f"[s{i}]")
    parts.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0:duration=first[aout]")
    return ";".join(parts)
