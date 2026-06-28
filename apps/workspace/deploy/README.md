# Durability — LaunchAgents

Copies of the launchd agents that keep the Nexus Agentic OS running across reboot
(RunAtLoad + KeepAlive). Install per-user:

    cp ai.hermes.workspace.plist ai.hermes.dashboard.plist ~/Library/LaunchAgents/
    # edit paths if $HOME differs, then:
    launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.hermes.workspace.plist
    launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.hermes.dashboard.plist

Companion to the existing ai.hermes.gateway agent (:8642). Workspace serves :3000,
dashboard :9119. Launcher: apps/workspace/start-operator.sh.
