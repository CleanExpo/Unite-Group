#!/bin/bash
# Security tombstone for the former in-place profile sanitizer.
#
# Copying removed credentials into same-UID backup files did not create an
# isolation boundary. This script intentionally reads no profile or secret.

set -euo pipefail

printf '%s\n' 'OWNEST profile sanitizer is retired: it cannot safely relocate credentials within the same UID.' >&2
printf '%s\n' 'Use a separately authorised credential migration into a brokered secret plane; do not create plaintext rollback copies.' >&2
exit 78
