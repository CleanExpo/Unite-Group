# Durability — LaunchAgents

Copies of the launchd agents that keep the Nexus Agentic OS running across reboot
(RunAtLoad + KeepAlive). Install per-user:

    # The plists are TEMPLATES. launchd does not expand ~ or $HOME, so the
    # __HOME__ and __REPO_ROOT__ placeholders are substituted at install time.
    # Run from this directory (apps/workspace/deploy) inside your checkout:
    REPO_ROOT="$(cd ../../.. && pwd)"
    for f in ai.hermes.workspace.plist ai.hermes.dashboard.plist; do
      sed -e "s#__REPO_ROOT__#$REPO_ROOT#g" -e "s#__HOME__#$HOME#g" "$f" \
        > ~/Library/LaunchAgents/"$f"
    done
    # must print nothing — a leftover placeholder means the agent will not start:
    grep -l '__HOME__\|__REPO_ROOT__' ~/Library/LaunchAgents/ai.hermes.*.plist
    launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.hermes.workspace.plist
    launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.hermes.dashboard.plist

Companion to the existing ai.hermes.gateway agent (:8642). Workspace serves :3000,
dashboard :9119. Launcher: apps/workspace/start-operator.sh.
