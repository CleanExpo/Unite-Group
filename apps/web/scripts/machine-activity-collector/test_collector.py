import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("collector.py")
SPEC = importlib.util.spec_from_file_location("machine_activity_collector", MODULE_PATH)
assert SPEC is not None
collector = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(collector)


class MachineActivityCollectorTests(unittest.TestCase):
    def test_snapshot_contains_only_bounded_safe_fields(self):
        entries = [
            {
                "lease_id": "private-lease",
                "session_id": "private-session-title",
                "surface": "tui",
                "pid": 123,
                "started_at": 10,
                "metadata": {
                    "prompt": "private prompt",
                    "cwd": "/Users/phill/private-client",
                    "windowTitle": "Banking",
                },
            },
            {
                "lease_id": "other-private-lease",
                "session_id": "other-private-session",
                "surface": "gateway:telegram",
                "pid": 456,
                "started_at": 20,
            },
        ]

        snapshot = collector.build_snapshot(
            entries,
            boot_id="11111111-1111-4111-8111-111111111111",
            sequence=9,
            observed_at="2026-07-18T10:00:00.000Z",
            pid_alive=lambda _pid: True,
        )

        self.assertEqual(snapshot["schemaVersion"], 1)
        self.assertEqual(len(snapshot["screens"]), 2)
        self.assertEqual(snapshot["screens"][0]["screenId"], "primary")
        self.assertEqual(snapshot["screens"][1]["screenId"], "secondary")
        self.assertEqual(snapshot["screens"][0]["state"], "active")
        self.assertEqual(snapshot["screens"][1]["state"], "active")
        serialised = json.dumps(snapshot)
        for forbidden in (
            "private-lease",
            "private-session",
            "private prompt",
            "/Users/phill",
            "Banking",
            "pid",
            "metadata",
            "surface",
        ):
            self.assertNotIn(forbidden, serialised)

    def test_dead_or_excess_leases_do_not_escape_as_activity(self):
        entries = [
            {"surface": "cli", "pid": 1, "started_at": 30},
            {"surface": "tui", "pid": 2, "started_at": 20},
            {"surface": "gateway:telegram", "pid": 3, "started_at": 10},
        ]

        snapshot = collector.build_snapshot(
            entries,
            boot_id="11111111-1111-4111-8111-111111111111",
            sequence=1,
            observed_at="2026-07-18T10:00:00.000Z",
            pid_alive=lambda pid: pid != 1,
        )

        self.assertEqual([screen["state"] for screen in snapshot["screens"]], ["active", "active"])
        self.assertTrue(all(screen["tool"] == "hermes" for screen in snapshot["screens"]))

    def test_empty_registry_reports_two_idle_screens(self):
        snapshot = collector.build_snapshot(
            [],
            boot_id="11111111-1111-4111-8111-111111111111",
            sequence=1,
            observed_at="2026-07-18T10:00:00.000Z",
            pid_alive=lambda _pid: False,
        )

        self.assertEqual(
            snapshot["screens"],
            [
                {
                    "screenId": "primary",
                    "state": "idle",
                    "activity": "idle",
                    "tool": None,
                    "agent": "default",
                    "projectKey": "unassigned",
                },
                {
                    "screenId": "secondary",
                    "state": "idle",
                    "activity": "idle",
                    "tool": None,
                    "agent": "default",
                    "projectKey": "unassigned",
                },
            ],
        )

    def test_state_file_advances_sequence_and_preserves_boot_id(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "collector-state.json"
            first = collector.next_state(path)
            second = collector.next_state(path)

        self.assertEqual(first["sequence"], 1)
        self.assertEqual(second["sequence"], 2)
        self.assertEqual(first["bootId"], second["bootId"])

    def test_configuration_requires_https_and_a_long_token(self):
        with self.assertRaises(ValueError):
            collector.validate_config("http://example.com/api/agents/machine-activity", "a" * 48)
        with self.assertRaises(ValueError):
            collector.validate_config("https://example.com/api/agents/machine-activity", "short")
        collector.validate_config("https://example.com/api/agents/machine-activity", "a" * 48)


if __name__ == "__main__":
    unittest.main()
