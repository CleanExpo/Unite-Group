#!/bin/bash
# Security tombstone for the former service-role presence heartbeat.

set -euo pipefail

printf '%s\n' 'Hermes presence heartbeat is retired: a same-UID long-lived process is not a credential boundary.' >&2
printf '%s\n' 'Required replacement: a brokered, least-privilege heartbeat endpoint with no CRM service-role credential in the agent process.' >&2
exit 78
