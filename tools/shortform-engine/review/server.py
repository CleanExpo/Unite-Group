"""Local review server for one job (frame.io-style player + notes).

Binds to 127.0.0.1 only. Serves a fixed set of files (no path parameters),
so nothing outside the job's edit folder can be read through it.

    python3 review/server.py <job_dir> [--port 4817]
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent))

from engine import review_state  # noqa: E402

STATIC = {"/": ("index.html", "text/html; charset=utf-8"),
          "/review.css": ("review.css", "text/css; charset=utf-8"),
          "/review.js": ("review.js", "text/javascript; charset=utf-8")}
RANGE_RE = re.compile(r"bytes=(\d*)-(\d*)")
MAX_BODY = 16 * 1024


def run_final(job: Path) -> None:
    cli = ROOT.parent / "shortform.py"
    proc = subprocess.run([sys.executable, str(cli), "render", str(job), "--final"],
                          capture_output=True, text=True)
    if proc.returncode == 0:
        log = json.loads(proc.stdout.strip().splitlines()[-1])
        review_state.final_done(job, log["sha256"])
    else:
        review_state.final_done(job, None, proc.stderr)


def make_handler(job: Path):
    edit = job / "edit"

    class Handler(BaseHTTPRequestHandler):
        server_version = "ShortformReview/1"

        def log_message(self, fmt, *args):  # quiet, but keep errors
            if args and str(args[1]).startswith(("4", "5")):
                super().log_message(fmt, *args)

        def _json(self, code: int, payload) -> None:
            body = json.dumps(payload).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _video(self, path: Path) -> None:
            if not path.exists():
                return self._json(404, {"error": "not rendered yet"})
            size = path.stat().st_size
            start, end = 0, size - 1
            m = RANGE_RE.match(self.headers.get("Range", ""))
            if m and (m.group(1) or m.group(2)):
                if m.group(1):
                    start = int(m.group(1))
                    end = int(m.group(2)) if m.group(2) else end
                else:
                    start = max(0, size - int(m.group(2)))
                end = min(end, size - 1)
                if start > end:
                    self.send_response(416)
                    self.send_header("Content-Range", f"bytes */{size}")
                    self.end_headers()
                    return
                self.send_response(206)
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            else:
                self.send_response(200)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(end - start + 1))
            self.end_headers()
            with open(path, "rb") as fh:
                fh.seek(start)
                remaining = end - start + 1
                while remaining > 0:
                    chunk = fh.read(min(1 << 16, remaining))
                    if not chunk:
                        break
                    try:
                        self.wfile.write(chunk)
                    except (BrokenPipeError, ConnectionResetError):
                        return
                    remaining -= len(chunk)

        def do_GET(self):
            route = self.path.split("?", 1)[0]
            if route in STATIC:
                name, ctype = STATIC[route]
                body = (ROOT / name).read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            elif route == "/review.mp4":
                self._video(edit / "review.mp4")
            elif route == "/final.mp4":
                self._video(edit / "final.mp4")
            elif route == "/api/state":
                self._json(200, review_state.load(job))
            else:
                self._json(404, {"error": "not found"})

        def do_POST(self):
            route = self.path.split("?", 1)[0]
            length = int(self.headers.get("Content-Length") or 0)
            if length > MAX_BODY:
                return self._json(413, {"error": "too large"})
            try:
                body = json.loads(self.rfile.read(length) or b"{}")
            except ValueError:
                return self._json(400, {"error": "bad json"})
            try:
                if route == "/api/notes":
                    return self._json(200, review_state.add_note(
                        job, float(body["t"]), str(body["text"]), bool(body.get("lasting"))))
                if route == "/api/notes/delete":
                    review_state.delete_note(job, str(body["id"]))
                    return self._json(200, {"ok": True})
                if route == "/api/send":
                    return self._json(200, {"sent": review_state.send_notes(job)})
                if route == "/api/approve":
                    s = review_state.approve(job, str(body.get("sha256", "")))
                    threading.Thread(target=run_final, args=(job,), daemon=True).start()
                    return self._json(200, s)
            except (ValueError, KeyError) as e:
                return self._json(409, {"error": str(e)})
            self._json(404, {"error": "not found"})

    return Handler


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("job", type=Path)
    ap.add_argument("--port", type=int, default=4817)
    args = ap.parse_args()
    job = args.job.resolve()
    srv = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(job))
    print(f"review: http://127.0.0.1:{args.port}/  job={job.name}", flush=True)
    srv.serve_forever()


if __name__ == "__main__":
    main()
