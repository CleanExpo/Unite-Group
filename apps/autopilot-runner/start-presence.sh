#!/bin/bash
# Security tombstone for the former service-role presence writer.

set -euo pipefail

printf '%s\n' 'Presence writer start is unavailable: the former service-role bridge is retired.' >&2
exit 78
