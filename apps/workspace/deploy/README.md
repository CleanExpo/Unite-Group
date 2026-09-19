# Durability — LaunchAgents

Copies of the launchd agents that keep the Nexus Agentic OS running across reboot
(RunAtLoad + KeepAlive). Install per-user:

    # The plists are TEMPLATES. launchd does not expand ~ or $HOME, so the
    # __HOME__ and __REPO_ROOT__ placeholders are substituted at install time.
    # Run from this directory (apps/workspace/deploy) inside your checkout:
    REPO_ROOT="$(cd ../../.. && pwd)"
    # Escape \ & # for sed's replacement text: a bare & re-inserts the placeholder.
    sed_esc() { printf '%s' "$1" | sed -e 's/[\\&#]/\\&/g'; }
    for f in ai.hermes.workspace.plist ai.hermes.dashboard.plist; do
      sed -e "s#__REPO_ROOT__#$(sed_esc "$REPO_ROOT")#g" -e "s#__HOME__#$(sed_esc "$HOME")#g" "$f" \
        > ~/Library/LaunchAgents/"$f"
    done
    # Load only if no placeholder is left and both files are valid plists
    # (plutil also rejects a raw & in a path, which is invalid XML):
    LA=~/Library/LaunchAgents
    if grep -l '__HOME__\|__REPO_ROOT__' "$LA"/ai.hermes.workspace.plist "$LA"/ai.hermes.dashboard.plist \
       || ! plutil -lint "$LA"/ai.hermes.workspace.plist "$LA"/ai.hermes.dashboard.plist; then
      echo "Not loading the agents: fix the files named above first."
    else
      launchctl bootstrap gui/$(id -u) "$LA"/ai.hermes.workspace.plist
      launchctl bootstrap gui/$(id -u) "$LA"/ai.hermes.dashboard.plist
    fi

Companion to the existing ai.hermes.gateway agent (:8642). Workspace serves :3000,
dashboard :9119. Launcher: apps/workspace/start-operator.sh.
