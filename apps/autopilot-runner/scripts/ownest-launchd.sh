#!/bin/bash
# Security tombstone for the former user-level OWNEST LaunchAgent wrapper.
#
# A same-UID Hermes child can recover repository, SSH, browser, and profile
# credentials regardless of environment scrubbing. Keep this entrypoint inert
# until a dedicated UID, sealed filesystem, pinned executable, brokered CRM
# credential, independent completion verifier, and enforceable egress/tool
# policy are installed.

set -euo pipefail

printf '%s\n' 'OWNEST service start is unavailable: dedicated-UID isolation and independent verification are not installed.' >&2
exit 78
