"""Render a job: plan.json -> edl.json -> review.mp4 (720p) or final.mp4 (1080p).

Reuses video-use's helpers for the parts it already does correctly (per-
segment extract with 30 ms fades, lossless concat, two-pass loudnorm) and adds
the short-form layer on top: B-roll and full-screen type inserts, captions
off during inserts, stacked type, music bed under the voice, sound effects.

Order of the final pass (video-use Hard Rule 1): inserts first, ASS LAST.
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import time
from dataclasses import fields
from pathlib import Path

from . import animate, audio
from .captions import CaptionStyle, build_ass
from .cutplan import CutSettings, output_time, plan_cuts, total_duration
from .transcribe_local import transcribe

VIDEO_USE = Path(os.environ.get("VIDEO_USE_DIR", Path.home() / ".claude/skills/video-use"))


def _video_use_render():
    helpers = str(VIDEO_USE / "helpers")
    if helpers not in sys.path:
        sys.path.insert(0, helpers)
    import render as vu_render  # video-use helpers/render.py
    return vu_render


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for block in iter(lambda: fh.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def probe_duration(path: Path) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", str(path)], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def subtract(ranges: list[dict], removes: list[dict]) -> list[dict]:
    """Cut manual remove windows (from review notes) out of the keep-ranges."""
    out = []
    for r in ranges:
        pieces = [dict(r)]
        for rm in removes:
            if rm["source"] != r["source"]:
                continue
            nxt = []
            for p in pieces:
                if rm["end"] <= p["start"] or rm["start"] >= p["end"]:
                    nxt.append(p)
                    continue
                if rm["start"] - p["start"] > 0.2:
                    nxt.append({**p, "end": rm["start"]})
                if p["end"] - rm["end"] > 0.2:
                    nxt.append({**p, "start": rm["end"]})
            pieces = nxt
        out.extend(pieces)
    return out


def intersect(ranges: list[dict], keep_only: list[dict]) -> list[dict]:
    """Clip-from-long-video: keep only the chosen source windows."""
    out = []
    for r in ranges:
        for k in keep_only:
            if k["source"] != r["source"]:
                continue
            s, e = max(r["start"], k["start"]), min(r["end"], k["end"])
            if e - s > 0.2:
                out.append({**r, "start": round(s, 3), "end": round(e, 3)})
    return out


def build_ranges(plan: dict, transcripts: dict[str, dict],
                 house_cut: dict | None = None) -> list[dict]:
    merged = {**(house_cut or {}), **(plan.get("cut") or {})}
    settings = CutSettings(**{k: v for k, v in merged.items()
                              if k in {f.name for f in fields(CutSettings)}})
    ranges: list[dict] = []
    for name in plan["order"]:
        ranges.extend(plan_cuts(transcripts[name], name, settings))
    if plan.get("keep_only"):
        ranges = intersect(ranges, plan["keep_only"])
    return subtract(ranges, plan.get("remove") or [])


def anchor_time(anchor: dict, ranges: list[dict]) -> float:
    t = output_time(float(anchor["t"]), ranges, anchor["src"])
    if t is None:  # anchor fell in a removed gap: use the next kept moment
        later = [output_time(r["start"], ranges, r["source"]) for r in ranges
                 if r["source"] == anchor["src"] and r["start"] >= float(anchor["t"])]
        t = later[0] if later else 0.0
    return t


def prepare_inserts(plan: dict, ranges: list[dict], edit: Path, job: Path) -> list[dict]:
    out = []
    ins_dir = edit / "inserts"
    ins_dir.mkdir(exist_ok=True)
    for i, ins in enumerate(plan.get("inserts") or []):
        start = anchor_time(ins["anchor"], ranges)
        dur = float(ins["duration"])
        path = ins_dir / f"ins_{i:02d}.{'mov' if ins['type'] == 'type' else 'mp4'}"
        if ins["type"] == "type":
            item_times = None
            if ins.get("item_anchors"):
                item_times = [anchor_time(a, ranges) - start for a in ins["item_anchors"]]
            frames = animate.list_reveal_frames(ins["title"], ins["items"], dur,
                                                accent=plan.get("accent", "#2BB0A6"),
                                                item_times=item_times)
            animate.render_overlay(frames, path)
        elif ins["type"] == "broll":
            src = (job / ins["file"]).resolve() if not Path(ins["file"]).is_absolute() else Path(ins["file"])
            if ins.get("still"):
                # slow push-in on a still, cropped to 9:16 (one input frame -> n frames)
                n = int(dur * 24)
                vf = (f"scale=-2:2400,crop=1350:2400,zoompan=z='1+0.06*on/{n}':"
                      f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={1080}x{1920}:fps=24,"
                      "eq=contrast=1.04:saturation=0.95,setsar=1")
                cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(src),
                       "-vf", vf, "-t", f"{dur:.3f}", "-an", "-c:v", "libx264",
                       "-crf", "18", "-pix_fmt", "yuv420p", str(path)]
            else:
                ss = float(ins.get("from", 0))
                box = "1080:960" if ins.get("layout") == "split" else "1080:1920"
                cmd = ["ffmpeg", "-y", "-v", "error", "-ss", f"{ss:.3f}", "-i", str(src),
                       "-t", f"{dur:.3f}", "-vf",
                       f"scale={box}:force_original_aspect_ratio=increase,crop={box},setsar=1,fps=24",
                       "-an", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", str(path)]
            if ins.get("still") and ins.get("layout") == "split":
                raise ValueError("split layout takes a video insert, not a still")
            subprocess.run(cmd, check=True)
        else:
            raise ValueError(f"unknown insert type {ins['type']}")
        out.append({"index": i, "type": ins["type"], "layout": ins.get("layout", "full"),
                    "file": path, "start": round(start, 3),
                    "duration": dur, "end": round(start + dur, 3), "label": ins.get("label", "")})
    return out


# House rules: soft crossfades on every insert, never a hard cut (video boards,
# ops/video-boards/README.md), and -16 LUFS integrated on the master.
CROSSFADE_S = 0.4
HOUSE_LUFS = -16.0


def _alpha_fade(s: float, e: float) -> str:
    d = min(CROSSFADE_S, (e - s) / 3)
    return (f"format=yuva420p,fade=t=in:st={s:.3f}:d={d:.3f}:alpha=1,"
            f"fade=t=out:st={e - d:.3f}:d={d:.3f}:alpha=1")


def overlay_chain(inserts: list[dict]) -> tuple[list[str], str]:
    """Filter-graph steps that lay each insert over the base video ([0:v]).

    Every layer that appears for an insert window fades in and out on its
    alpha, so the switch to and from B-roll or type is a crossfade.
    """
    vf: list[str] = []
    cur = "[0:v]"
    for k, x in enumerate(inserts, start=1):
        s, e = x["start"], x["end"]
        en = f"enable='between(t,{s:.3f},{e:.3f})'"
        fade = _alpha_fade(s, e)
        if x["type"] == "type":
            # blur and darken the speaker's footage for the window, type on top
            vf.append(f"{cur}split[c{k}a][c{k}b]")
            vf.append(f"[c{k}b]boxblur=22:2,eq=brightness=-0.32:saturation=0.7,{fade}[c{k}bl]")
            vf.append(f"[c{k}a][c{k}bl]overlay={en}[c{k}m]")
            cur = f"[c{k}m]"
        y = 0
        if x["layout"] == "split":
            # speaker's face band moves to the bottom half, B-roll takes the top
            vf.append(f"{cur}split[c{k}a][c{k}b]")
            vf.append(f"[c{k}b]crop=1080:960:0:180,{fade}[c{k}face]")
            vf.append(f"[c{k}a][c{k}face]overlay=0:960:{en}[c{k}m]")
            cur = f"[c{k}m]"
        vf.append(f"[{k}:v]setpts=PTS-STARTPTS+{s:.3f}/TB,{fade}[o{k}]")
        vf.append(f"{cur}[o{k}]overlay=0:{y}:{en}:eof_action=pass[v{k}]")
        cur = f"[v{k}]"
    return vf, cur


def apply_house_loudness(vu, src: Path, dst: Path) -> None:
    """video-use's two-pass loudnorm, aimed at the house level, not its -14."""
    vu.LOUDNORM_I = HOUSE_LUFS
    vu.apply_loudnorm_two_pass(src, dst, preview=False)


def caption_style(plan: dict, style_rules: dict) -> CaptionStyle:
    merged = {**style_rules, **(plan.get("caption_style") or {})}
    names = {f.name for f in fields(CaptionStyle)}
    return CaptionStyle(**{k: v for k, v in merged.items() if k in names})


def render(job: Path, mode: str, house: dict | None = None) -> dict:
    """mode: 'review' (720x1280) or 'final' (1080x1920).

    `house` is the learned style (style.load_settings()); the job's own
    plan.json overrides it where both set the same key.
    """
    assert mode in ("review", "final")
    house = house or {}
    t0 = time.time()
    timings: dict[str, float] = {}
    edit = job / "edit"
    plan = json.loads((edit / "plan.json").read_text())
    vu = _video_use_render()

    # 1. transcripts (cached per source)
    transcripts = {}
    for name in plan["order"]:
        src = (job / plan["sources"][name]).resolve()
        transcripts[name] = transcribe(src, edit / "transcripts" / f"{name}.json")
    timings["transcribe_s"] = round(time.time() - t0, 2)

    # 2. cuts -> EDL in video-use format
    ranges = build_ranges(plan, transcripts, house.get("cut"))
    edl = {
        "version": 1,
        "sources": {n: str((job / plan["sources"][n]).resolve()) for n in plan["order"]},
        "ranges": ranges,
        "grade": plan.get("video_filter", ""),
        "total_duration_s": total_duration(ranges),
    }
    (edit / "edl.json").write_text(json.dumps(edl, indent=1))

    # 3. segments + lossless concat (video-use)
    t = time.time()
    segs = vu.extract_all_segments(edl, edit, preview=(mode == "review"))
    base = edit / f"base_{mode}.mp4"
    vu.concat_segments(segs, base, edit)
    timings["cut_and_concat_s"] = round(time.time() - t, 2)
    duration = probe_duration(base)

    # 4. inserts, captions, stacks
    t = time.time()
    inserts = prepare_inserts(plan, ranges, edit, job)
    style = caption_style(plan, house.get("caption_style") or {})
    stacks = [{**s, "at": anchor_time(s["anchor"], ranges)} for s in plan.get("stacks") or []]
    ass_text = build_ass(transcripts, ranges, style, stacks,
                         no_caption_windows=[(x["start"], x["end"]) for x in inserts],
                         corrections=plan.get("corrections") or [])
    ass_path = edit / "captions.ass"
    ass_path.write_text(ass_text)
    timings["graphics_s"] = round(time.time() - t, 2)

    # 5. audio: music bed under the voice, sfx on every insert and stack
    t = time.time()
    music_cfg = plan.get("music") or {}
    if music_cfg.get("file"):
        music = (job / music_cfg["file"]).resolve()
        music_rights = music_cfg.get("rights", "UNVERIFIED")
    else:
        music = audio.synth_music_bed(edit / "music_bed.wav", duration)
        music_rights = "in-house ffmpeg synthesis, no third-party audio"
    voice_lufs = audio.measure_lufs(base)
    music_lufs = audio.measure_lufs(music)
    under = float(music_cfg.get("under_db", 25))
    gain = audio.music_gain_db(voice_lufs, music_lufs, under)
    whoosh = audio.synth_whoosh(edit / "sfx_whoosh.wav")
    pop = audio.synth_pop(edit / "sfx_pop.wav")
    sfx_events = ([{"at": max(0.0, x["start"] - 0.18), "input": 0} for x in inserts]
                  + [{"at": s["at"], "input": 1, "gain_db": -16} for s in stacks])
    timings["audio_prep_s"] = round(time.time() - t, 2)

    # 6. one composite pass: overlays, then ASS LAST, with the audio mix
    t = time.time()
    inputs = ["-i", str(base)]
    for x in inserts:
        inputs += ["-i", str(x["file"])]
    m_idx = 1 + len(inserts)
    inputs += ["-stream_loop", "-1", "-i", str(music), "-i", str(whoosh), "-i", str(pop)]
    vf, cur = overlay_chain(inserts)
    ass_abs = str(ass_path.resolve()).replace(":", r"\:").replace("'", r"\'")
    vf.append(f"{cur}ass='{ass_abs}'[vout]")
    af = audio.mix_filter(m_idx, m_idx + 1, gain, duration, sfx_events)
    graph = ";".join(vf) + ";" + af
    prenorm = edit / f"{mode}.prenorm.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", graph,
                    "-map", "[vout]", "-map", "[aout]", "-t", f"{duration:.3f}",
                    "-c:v", "libx264", "-preset", "medium" if mode == "review" else "slow",
                    "-crf", "18", "-pix_fmt", "yuv420p", "-r", "24",
                    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", str(prenorm)], check=True)
    normed = edit / f"{mode}.normed.mp4"
    apply_house_loudness(vu, prenorm, normed)
    prenorm.unlink(missing_ok=True)
    timings["composite_s"] = round(time.time() - t, 2)

    out = edit / f"{mode}.mp4"
    if mode == "review":
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(normed), "-vf",
                        "scale=720:1280:flags=lanczos", "-c:v", "libx264", "-crf", "22",
                        "-preset", "medium", "-c:a", "copy", "-movflags", "+faststart",
                        str(out)], check=True)
        normed.unlink(missing_ok=True)
    else:
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(normed), "-c", "copy",
                        "-movflags", "+faststart", str(out)], check=True)
        normed.unlink(missing_ok=True)

    timings["total_s"] = round(time.time() - t0, 2)
    log = {
        "mode": mode, "output": str(out), "sha256": sha256(out),
        "duration_s": round(probe_duration(out), 3),
        "raw_duration_s": round(sum(probe_duration((job / plan["sources"][n]).resolve())
                                    for n in plan["order"]), 3),
        "ranges": len(ranges), "inserts": [{k: (str(v) if k == "file" else v) for k, v in x.items()} for x in inserts],
        "stacks": stacks,
        "audio": {"voice_lufs": voice_lufs, "music_lufs": music_lufs, "music_gain_db": gain,
                  "music_under_voice_db": under, "music_rights": music_rights},
        "timings": timings,
        "rendered_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    }
    logs = edit / "render_log.jsonl"
    with logs.open("a") as fh:
        fh.write(json.dumps(log) + "\n")
    return log
