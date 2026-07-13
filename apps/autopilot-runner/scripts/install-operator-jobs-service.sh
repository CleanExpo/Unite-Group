#!/bin/bash
# Permanent tombstone for the superseded operator_jobs LaunchAgent installer.
# Exit before building, writing a plist, reading credentials, or calling launchd.

printf '%s\n' 'operator_jobs service installation is permanently retired; CRM OWNEST is authoritative.' >&2
exit 78
