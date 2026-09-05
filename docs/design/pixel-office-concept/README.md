# Pixel Office owner-layer concept

A local, interactive design proposal for adding Unite-Group's owner workflow around the Pixel Agents office. Every person, mission, decision and repository option in the screen is explicitly sample data.

## Open the concept

Open [index.html](index.html) in a browser after checking out or downloading this directory. It is a single HTML file with original inline artwork and no installation step, external assets or dependencies. GitHub's file view displays its source.

Try selecting Margot or another character, opening a sample decision, changing the sample business/project filter, and selecting requirement presets in the brief composer. These interactions only update the current page. They do not approve, dispatch or save a real mission.

## Contents

- [Interactive concept](index.html)
- [Design rationale and visual checks](DESIGN.md)
- [Developer-documentation research and integration findings](RESEARCH.md)
- [Desktop preview](desktop.png)
- [Mobile preview](mobile.png)

## Implementation boundary

This package proposes department areas, an owner decision tray, a selected-agent inspector, a delivery-stage ribbon and visible brief requirements. It does not alter the installed extension, its settings, the canonical application routes, production configuration or agent permissions. Merging it arms nothing.

The next implementation step is to choose the canonical office renderer and connect stable mission/session identifiers to existing Mission Control records. Repository choices must come from authorised GitHub access. Real worker assignments, approvals and release status must come from their authoritative evidence; the sample scene establishes none of those connections.

The code and artwork in this prototype are original. Pixel Agents is a separate upstream project; its code and any imported third-party artwork retain their respective licences.
