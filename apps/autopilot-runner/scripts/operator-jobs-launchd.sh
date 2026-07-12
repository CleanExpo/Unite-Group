#!/bin/bash
# Permanent tombstone for the superseded operator_jobs queue worker.
# Exit before loading configuration, credentials, files, Node, or network.

printf '%s\n' 'operator_jobs worker is permanently retired; CRM OWNEST is authoritative.' >&2
exit 78
