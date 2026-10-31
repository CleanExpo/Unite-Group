"""Review state for one job: versions, time-stamped notes, approval.

Statuses: in_review -> changes_requested (Send notes) -> in_review (re-render)
-> approved (Approve; final render follows). Approval binds to the exact
review file hash that was on screen, so a later re-render cannot inherit it.
"""

from __future__ import annotations

import json
import threading
import time
import uuid
from pathlib import Path

LOCK = threading.Lock()


def now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S%z")


def path_for(job: Path) -> Path:
    return job / "edit" / "review_state.json"


def load(job: Path) -> dict:
    p = path_for(job)
    if p.exists():
        return json.loads(p.read_text())
    return {"job": job.name, "review_version": 0, "review_sha256": None,
            "status": "not_rendered", "notes": [], "approved_at": None,
            "approved_version": None, "approved_review_sha256": None,
            "final": {"status": "none"}}


def save(job: Path, state: dict) -> None:
    p = path_for(job)
    tmp = p.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=1))
    tmp.replace(p)


def new_review(job: Path, sha: str, duration: float) -> dict:
    with LOCK:
        s = load(job)
        s["review_version"] += 1
        s["review_sha256"] = sha
        s["review_duration_s"] = duration
        s["status"] = "in_review"
        s["approved_at"] = None
        s["approved_version"] = None
        s["approved_review_sha256"] = None
        s["final"] = {"status": "none"}
        save(job, s)
        return s


def add_note(job: Path, t: float, text: str, lasting: bool = False) -> dict:
    text = text.strip()
    if not text:
        raise ValueError("empty note")
    with LOCK:
        s = load(job)
        if s["status"] not in ("in_review", "changes_requested"):
            raise ValueError(f"cannot add notes while {s['status']}")
        note = {"id": "n" + uuid.uuid4().hex[:6], "t": round(float(t), 2), "text": text[:1000],
                "lasting": bool(lasting), "status": "draft", "version": s["review_version"],
                "created_at": now()}
        s["notes"].append(note)
        save(job, s)
        return note


def delete_note(job: Path, note_id: str) -> None:
    with LOCK:
        s = load(job)
        before = len(s["notes"])
        s["notes"] = [n for n in s["notes"] if not (n["id"] == note_id and n["status"] == "draft")]
        if len(s["notes"]) == before:
            raise ValueError("only unsent notes can be removed")
        save(job, s)


def send_notes(job: Path) -> list[dict]:
    with LOCK:
        s = load(job)
        drafts = [n for n in s["notes"] if n["status"] == "draft"]
        if not drafts:
            raise ValueError("no unsent notes")
        for n in drafts:
            n["status"] = "sent"
            n["sent_at"] = now()
        s["status"] = "changes_requested"
        save(job, s)
    write_inbox(job, s)
    return drafts


def write_inbox(job: Path, s: dict) -> None:
    """The hand-off file the editing agent reads: open notes, newest version."""
    lines = [f"# Notes for Claude: {s['job']} review v{s['review_version']}", ""]
    for n in s["notes"]:
        if n["status"] == "sent":
            mm, ss = divmod(n["t"], 60)
            tag = " [ALWAYS: make this a style rule]" if n["lasting"] else ""
            lines.append(f"- {n['id']} at {int(mm)}:{ss:05.2f}{tag}: {n['text']}")
    (job / "edit" / "NOTES_FOR_CLAUDE.md").write_text("\n".join(lines) + "\n")


def resolve_note(job: Path, note_id: str, status: str, resolution: str) -> dict:
    assert status in ("applied", "declined")
    with LOCK:
        s = load(job)
        for n in s["notes"]:
            if n["id"] == note_id:
                if n["status"] != "sent":
                    raise ValueError(f"note {note_id} is {n['status']}, not sent")
                n["status"] = status
                n["resolution"] = resolution
                n["resolved_at"] = now()
                save(job, s)
                return n
    raise KeyError(note_id)


def approve(job: Path, shown_sha: str) -> dict:
    with LOCK:
        s = load(job)
        if s["status"] != "in_review":
            raise ValueError(f"cannot approve while {s['status']}")
        if any(n["status"] in ("draft", "sent") for n in s["notes"]):
            raise ValueError("send or remove open notes first")
        if shown_sha != s["review_sha256"]:
            raise ValueError("the review on screen is not the current version; reload")
        s["status"] = "approved"
        s["approved_at"] = now()
        s["approved_version"] = s["review_version"]
        s["approved_review_sha256"] = s["review_sha256"]
        s["final"] = {"status": "rendering", "started_at": now()}
        save(job, s)
        return s


def final_done(job: Path, sha: str | None, error: str | None = None) -> None:
    with LOCK:
        s = load(job)
        s["final"] = ({"status": "ready", "sha256": sha, "finished_at": now()} if sha
                      else {"status": "failed", "error": (error or "")[-800:], "finished_at": now()})
        save(job, s)
