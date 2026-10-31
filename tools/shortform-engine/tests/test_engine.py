"""Unit tests for the short-form engine (stdlib unittest, no network)."""

from __future__ import annotations

import json
import shutil
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

from engine import audio, review_state, style
from engine.captions import CaptionStyle, apply_corrections, build_ass, chunk_words, reading_hold
from engine.cutplan import CutSettings, find_failed_takes, output_time, plan_cuts, words_from_transcript


def transcript(words: list[tuple[str, float, float]]) -> dict:
    out = []
    for i, (t, s, e) in enumerate(words):
        if i:
            out.append({"type": "spacing", "text": " ", "start": words[i - 1][2], "end": s})
        out.append({"type": "word", "text": t, "start": s, "end": e})
    return {"words": out}


SPEECH = transcript([
    ("Most", 0.50, 0.70), ("cards", 0.72, 1.00), ("get", 1.02, 1.20), ("binned.", 1.22, 1.60),
    ("Um,", 1.70, 1.90),
    ("Yours", 3.10, 3.40), ("doesn't", 3.42, 3.70), ("have", 3.72, 3.85), ("to.", 3.87, 4.10),
])


class CutPlanTests(unittest.TestCase):
    def test_filler_and_long_pause_removed(self):
        r = plan_cuts(SPEECH, "c")
        self.assertEqual(len(r), 2)
        self.assertNotIn("Um", " ".join(x["quote"] for x in r))
        self.assertLess(r[0]["end"], 1.70)  # stops before the filler starts
        self.assertGreater(r[1]["start"], 1.90)

    def test_edges_never_cut_inside_a_word(self):
        words = words_from_transcript(SPEECH)
        for r in plan_cuts(SPEECH, "c"):
            for w in words:
                inside_start = w.start < r["start"] < w.end
                inside_end = w.start < r["end"] < w.end
                self.assertFalse(inside_start or inside_end, f"cut inside {w.text}: {r}")

    def test_pads_inside_working_window(self):
        r = plan_cuts(SPEECH, "c", CutSettings(pad_in=0.05, pad_out=0.08))
        self.assertAlmostEqual(r[0]["start"], 0.45, places=3)
        self.assertAlmostEqual(r[0]["end"], 1.68, places=3)

    def test_restart_keeps_later_take(self):
        t = transcript([
            ("Your", 0.0, 0.2), ("card", 0.2, 0.5), ("should", 0.5, 0.8), ("uh", 0.9, 1.1),
            ("Your", 2.0, 2.2), ("card", 2.2, 2.5), ("should", 2.5, 2.8), ("work.", 2.8, 3.2),
        ])
        drop = find_failed_takes(words_from_transcript(t), CutSettings())
        self.assertEqual(drop, {0, 1, 2, 3})  # the abandoned take, its filler included
        r = plan_cuts(t, "c")
        self.assertEqual(r[0]["quote"], "Your card should work.")

    def test_restart_marker(self):
        t = transcript([("This", 0.0, 0.2), ("is", 0.2, 0.3), ("wrong", 0.3, 0.6),
                        ("let", 0.8, 0.9), ("me", 0.9, 1.0), ("start", 1.0, 1.2), ("again", 1.2, 1.5),
                        ("Cards", 2.0, 2.3), ("matter.", 2.3, 2.8)])
        self.assertEqual(" ".join(x["quote"] for x in plan_cuts(t, "c")), "Cards matter.")

    def test_output_time_maps_through_cuts(self):
        r = plan_cuts(SPEECH, "c")
        self.assertAlmostEqual(output_time(r[1]["start"], r, "c"), r[0]["end"] - r[0]["start"], places=3)
        self.assertIsNone(output_time(2.5, r, "c"))


class CaptionTests(unittest.TestCase):
    def test_chunks_respect_budget(self):
        words = [(w, i * 0.3, i * 0.3 + 0.25) for i, w in enumerate(
            "one two three four five six seven eight nine ten".split())]
        for text, _, _ in chunk_words(words, 26, 5):
            self.assertLessEqual(len(text), 26)
            self.assertLessEqual(len(text.split()), 5)

    def test_no_captions_inside_insert_window(self):
        r = plan_cuts(SPEECH, "c")
        # first line plays 0.05-1.15 s on the output timeline, second from 1.28 s
        ass = build_ass({"c": SPEECH}, r, CaptionStyle(), no_caption_windows=[(0.0, 1.0)])
        caption_lines = [x for x in ass.splitlines() if ",Caption," in x]
        self.assertEqual(len(caption_lines), 1)
        self.assertIn("Yours", caption_lines[0])
        self.assertNotIn("Most", "\n".join(caption_lines))

    def test_caption_hangs_from_chin_line(self):
        ass = build_ass({"c": SPEECH}, plan_cuts(SPEECH, "c"), CaptionStyle(chin_line=0.6))
        self.assertIn("\\pos(540,1152)", ass)

    def test_corrections_fix_misheard_words(self):
        tl = [("ceiling", 1.0, 1.4), ("and", 1.4, 1.6), ("coating,", 1.6, 2.0)]
        out = apply_corrections(tl, [{"from": "ceiling", "to": "sealing"}])
        self.assertEqual([w[0] for w in out], ["sealing", "and", "coating,"])
        out = apply_corrections([("safety", 0, 1), ("hygiene", 1, 2), ("presentation.", 2, 3)],
                                [{"from": "hygiene presentation", "to": "hygiene, preservation"}])
        self.assertEqual(out[-1][0], "preservation.")

    def test_stack_holds_long_enough_to_read(self):
        r = plan_cuts(SPEECH, "c")
        ass = build_ass({"c": SPEECH}, r, CaptionStyle(),
                        stacks=[{"at": 0.2, "lines": ["Most cards", "get binned"]}])
        line = next(x for x in ass.splitlines() if ",Stack," in x)
        start, end = line.split(",")[1:3]
        to_s = lambda s: int(s[0]) * 3600 + int(s[2:4]) * 60 + float(s[5:])
        self.assertGreaterEqual(to_s(end) - to_s(start), reading_hold("MOST CARDS GET BINNED") - 0.01)


    def test_hide_under_stack_drops_duplicate_caption(self):
        r = plan_cuts(SPEECH, "c")
        stacks = [{"at": 0.0, "lines": ["Most cards", "get binned"]}]
        shown = build_ass({"c": SPEECH}, r, CaptionStyle(), stacks=stacks)
        hidden = build_ass({"c": SPEECH}, r, CaptionStyle(hide_under_stack=True), stacks=stacks)
        self.assertIn("Most cards get", "\n".join(x for x in shown.splitlines() if ",Caption," in x))
        self.assertNotIn("Most cards get", "\n".join(x for x in hidden.splitlines() if ",Caption," in x))

    def test_type_faces_are_named_upright_faces(self):
        # bare "Avenir Next" with Bold=1 renders Bold Italic through libass/CoreText
        ass = build_ass({"c": SPEECH}, plan_cuts(SPEECH, "c"), CaptionStyle())
        styles = [x for x in ass.splitlines() if x.startswith("Style:")]
        for s in styles:
            parts = s.split(",")
            self.assertNotEqual(parts[1], "Avenir Next")
            self.assertEqual(parts[7], "0")  # Bold flag off; weight comes from the face name

    def test_long_stack_line_is_scaled_to_fit(self):
        from engine.captions import fit_stack_size
        self.assertEqual(fit_stack_size(["MORE THAN"], 118), 118)
        self.assertLess(fit_stack_size(["NO DISINFECTION CLAIMS AT ALL"], 118), 118)


class AnimateTests(unittest.TestCase):
    def test_title_fits_frame(self):
        from engine import animate
        f = animate.fit_font("A VERY LONG TITLE THAT WOULD RUN OFF", 92, animate.HEAVY, 900)
        self.assertLessEqual(f.getbbox("A VERY LONG TITLE THAT WOULD RUN OFF")[2], 900)


class StyleTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.path = self.tmp / "STYLE.md"
        self.path.write_text("# s\n\n- **R1** Seed rule. (source: doctrine)\n\n## Learned rules\n")

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def test_learned_rule_is_applied_and_numbered(self):
        line = style.add_rule("Captions sit lower", "n1", "job-x",
                              {"caption_style": {"chin_line": 0.62}}, self.path, "31/10/2026")
        self.assertTrue(line.startswith("- **R2** Captions sit lower."))
        self.assertRegex(line, r"^- \*\*R[0-9]+\*\*.*source: note")
        self.assertEqual(style.load_settings(self.path)["caption_style"], {"chin_line": 0.62})

    def test_later_rule_wins_and_duplicate_refused(self):
        style.add_rule("a", "n1", "j", {"cut": {"max_pause": 0.3}}, self.path)
        style.add_rule("b", "n2", "j", {"cut": {"max_pause": 0.25}}, self.path)
        self.assertEqual(style.load_settings(self.path)["cut"]["max_pause"], 0.25)
        self.assertEqual(style.add_rule("b again", "n3", "j", {"cut": {"max_pause": 0.25}}, self.path), "")

    def test_unknown_group_rejected(self):
        with self.assertRaises(ValueError):
            style.add_rule("x", "n1", "j", {"secrets": {"k": 1}}, self.path)


class AudioTests(unittest.TestCase):
    def test_music_gain_lands_under_voice(self):
        self.assertEqual(audio.music_gain_db(-16.0, -20.0, 25), -21.0)

    def test_mix_filter_uses_real_input_indices(self):
        f = audio.mix_filter(4, 5, -21.0, 30.0, [{"at": 1.0, "input": 0}, {"at": 2.0, "input": 1}])
        self.assertIn("[4:a]atrim", f)
        self.assertIn("[5:a]adelay=1000|1000", f)
        self.assertIn("[6:a]adelay=2000|2000", f)
        self.assertIn("amix=inputs=4", f)


class ReviewFlowTests(unittest.TestCase):
    def setUp(self):
        self.job = Path(tempfile.mkdtemp()) / "job-t"
        (self.job / "edit").mkdir(parents=True)
        (self.job / "edit" / "review.mp4").write_bytes(bytes(range(256)) * 40)

    def tearDown(self):
        shutil.rmtree(self.job.parent)

    def test_notes_must_be_cleared_before_approval(self):
        review_state.new_review(self.job, "sha1", 30.0)
        n = review_state.add_note(self.job, 12.3, "Captions too high", lasting=True)
        with self.assertRaises(ValueError):
            review_state.approve(self.job, "sha1")
        review_state.send_notes(self.job)
        inbox = (self.job / "edit" / "NOTES_FOR_CLAUDE.md").read_text()
        self.assertIn(n["id"], inbox)
        self.assertIn("ALWAYS", inbox)
        review_state.resolve_note(self.job, n["id"], "applied", "moved down")
        review_state.new_review(self.job, "sha2", 29.0)
        with self.assertRaises(ValueError):
            review_state.approve(self.job, "sha1")  # stale version on screen
        s = review_state.approve(self.job, "sha2")
        self.assertEqual(s["approved_version"], 2)
        self.assertEqual(s["approved_review_sha256"], "sha2")

    def test_server_api_and_byte_ranges(self):
        import review.server as server
        review_state.new_review(self.job, "sha1", 30.0)
        srv = ThreadingHTTPServer(("127.0.0.1", 0), server.make_handler(self.job))
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        base = f"http://127.0.0.1:{srv.server_address[1]}"
        try:
            req = urllib.request.Request(base + "/api/notes", data=json.dumps(
                {"t": 4.2, "text": "cut the breath"}).encode(), headers={"Content-Type": "application/json"})
            note = json.loads(urllib.request.urlopen(req).read())
            self.assertEqual(note["t"], 4.2)
            req = urllib.request.Request(base + "/api/approve", data=b'{"sha256":"sha1"}')
            with self.assertRaises(urllib.error.HTTPError) as cm:
                urllib.request.urlopen(req)
            self.assertEqual(cm.exception.code, 409)
            req = urllib.request.Request(base + "/review.mp4", headers={"Range": "bytes=10-19"})
            resp = urllib.request.urlopen(req)
            self.assertEqual(resp.status, 206)
            self.assertEqual(resp.read(), bytes(range(10, 20)))
            with self.assertRaises(urllib.error.HTTPError) as cm:
                urllib.request.urlopen(base + "/../edit/review_state.json")
            self.assertEqual(cm.exception.code, 404)
            self.assertEqual(srv.server_address[0], "127.0.0.1")
        finally:
            srv.shutdown()


if __name__ == "__main__":
    unittest.main()
