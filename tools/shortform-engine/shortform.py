#!/usr/bin/env python3
"""Short-form engine CLI.

    shortform.py ingest [--inbox DIR] [--jobs DIR] [--template NAME] [--together]
    shortform.py new <job_dir> <clip>... [--template NAME]
    shortform.py transcribe <job_dir>
    shortform.py render <job_dir> (--review | --final)
    shortform.py serve <job_dir> [--port 4817]
    shortform.py resolve <job_dir> <note_id> (--applied TEXT | --declined TEXT)
                         [--rule TEXT] [--set group.key=value ...]
    shortform.py batch <job_dir>... [--workers 3]
    shortform.py status <job_dir>

Job layout: <job>/raw/ holds the untouched clips; everything the engine
writes goes to <job>/edit/ (video-use Hard Rule 12).
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from engine import compose, review_state, style  # noqa: E402
from engine.transcribe_local import transcribe  # noqa: E402

TEMPLATES = HERE / "skill" / "templates.json"
DEFAULT_INBOX = Path.home() / "Movies" / "Shortform Inbox"
DEFAULT_JOBS = Path.home() / "session-handoffs" / "shortform-engine" / "jobs"
VIDEO_EXT = {".mov", ".mp4", ".m4v"}


def load_template(name: str) -> dict:
    templates = json.loads(TEMPLATES.read_text())
    if name not in templates:
        sys.exit(f"unknown template {name}; have: {', '.join(templates)}")
    return json.loads(json.dumps(templates[name]))


def new_job(job: Path, clips: list[Path], template: str) -> Path:
    raw = job / "raw"
    (job / "edit" / "transcripts").mkdir(parents=True, exist_ok=True)
    raw.mkdir(parents=True, exist_ok=True)
    plan = load_template(template)
    plan["template"] = template
    plan["sources"], plan["order"] = {}, []
    for i, clip in enumerate(clips, start=1):
        name = f"clip{i:02d}"
        dest = raw / f"{name}{clip.suffix.lower()}"
        shutil.copy2(clip, dest)
        plan["sources"][name] = f"raw/{dest.name}"
        plan["order"].append(name)
    plan_path = job / "edit" / "plan.json"
    if not plan_path.exists():
        plan_path.write_text(json.dumps(plan, indent=1))
    return job


def cmd_ingest(a) -> None:
    inbox = Path(a.inbox).expanduser()
    clips = sorted(p for p in inbox.iterdir() if p.suffix.lower() in VIDEO_EXT)
    if not clips:
        print(f"inbox empty: {inbox}")
        return
    stamp = time.strftime("%Y%m%d-%H%M")
    groups = [clips] if a.together else [[c] for c in clips]
    done = inbox / "ingested"
    done.mkdir(exist_ok=True)
    for i, group in enumerate(groups, start=1):
        job = Path(a.jobs).expanduser() / f"{stamp}-{i:02d}"
        new_job(job, group, a.template)
        for c in group:
            shutil.move(str(c), done / c.name)
        print(job)


def cmd_transcribe(a) -> None:
    job = Path(a.job).resolve()
    plan = json.loads((job / "edit" / "plan.json").read_text())
    for name in plan["order"]:
        transcribe((job / plan["sources"][name]).resolve(),
                   job / "edit" / "transcripts" / f"{name}.json")
    subprocess.run([sys.executable, str(compose.VIDEO_USE / "helpers" / "pack_transcripts.py"),
                    "--edit-dir", str(job / "edit")], check=True)
    print((job / "edit" / "takes_packed.md").read_text())


def cmd_render(a) -> None:
    job = Path(a.job).resolve()
    mode = "final" if a.final else "review"
    if mode == "final":
        s = review_state.load(job)
        if s["status"] != "approved":
            sys.exit("final render needs an approved review (press Approve on the review page)")
    log = compose.render(job, mode, style.load_settings())
    if mode == "review":
        review_state.new_review(job, log["sha256"], log["duration_s"])
    print(json.dumps(log))


def cmd_serve(a) -> None:
    subprocess.run([sys.executable, str(HERE / "review" / "server.py"), str(Path(a.job).resolve()),
                    "--port", str(a.port)], check=True)


def parse_sets(sets: list[str]) -> dict:
    out: dict[str, dict] = {}
    for item in sets or []:
        key, _, val = item.partition("=")
        group, _, field = key.partition(".")
        if not field or not val:
            sys.exit(f"--set needs group.key=value, got {item}")
        out.setdefault(group, {})[field] = style.parse_value(val)
    return out


def cmd_resolve(a) -> None:
    job = Path(a.job).resolve()
    status, text = ("applied", a.applied) if a.applied else ("declined", a.declined)
    note = review_state.resolve_note(job, a.note, status, text)
    if a.rule:
        line = style.add_rule(a.rule, a.note, job.name, parse_sets(a.set))
        print(line or "rule already learned; nothing added")
    print(json.dumps(note))


def _render_one(job: str) -> dict:
    p = Path(job).resolve()
    log = compose.render(p, "review", style.load_settings())
    review_state.new_review(p, log["sha256"], log["duration_s"])
    return log


def cmd_batch(a) -> None:
    with ProcessPoolExecutor(max_workers=a.workers) as pool:
        futs = {pool.submit(_render_one, j): j for j in a.jobs}
        for f in as_completed(futs):
            try:
                log = f.result()
                print(f"OK   {futs[f]}  {log['duration_s']}s  {log['timings']['total_s']}s to render")
            except Exception as e:  # report every job, never hide one failure
                print(f"FAIL {futs[f]}  {e}")


def cmd_status(a) -> None:
    print(json.dumps(review_state.load(Path(a.job).resolve()), indent=1))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("ingest")
    p.add_argument("--inbox", default=str(DEFAULT_INBOX))
    p.add_argument("--jobs", default=str(DEFAULT_JOBS))
    p.add_argument("--template", default="business-reel")
    p.add_argument("--together", action="store_true", help="all inbox clips form one video")
    p.set_defaults(fn=cmd_ingest)
    p = sub.add_parser("new")
    p.add_argument("job")
    p.add_argument("clips", nargs="+")
    p.add_argument("--template", default="business-reel")
    p.set_defaults(fn=lambda a: print(new_job(Path(a.job).resolve(), [Path(c) for c in a.clips], a.template)))
    p = sub.add_parser("transcribe")
    p.add_argument("job")
    p.set_defaults(fn=cmd_transcribe)
    p = sub.add_parser("render")
    p.add_argument("job")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--review", action="store_true")
    g.add_argument("--final", action="store_true")
    p.set_defaults(fn=cmd_render)
    p = sub.add_parser("serve")
    p.add_argument("job")
    p.add_argument("--port", type=int, default=4817)
    p.set_defaults(fn=cmd_serve)
    p = sub.add_parser("resolve")
    p.add_argument("job")
    p.add_argument("note")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--applied")
    g.add_argument("--declined")
    p.add_argument("--rule")
    p.add_argument("--set", action="append")
    p.set_defaults(fn=cmd_resolve)
    p = sub.add_parser("batch")
    p.add_argument("jobs", nargs="+")
    p.add_argument("--workers", type=int, default=3)
    p.set_defaults(fn=cmd_batch)
    p = sub.add_parser("status")
    p.add_argument("job")
    p.set_defaults(fn=cmd_status)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
