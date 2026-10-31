# Short-form house style

The editing agent reads this before every plan and every fix. Rules carry a
source: `doctrine` (Phill's standing rules) or `note <id>` (learned from a
review note he marked "Always do this", or a fix Claude judged lasting).
Backticked `group.key=value` settings are applied to every render
automatically; later rules win. Never delete a rule to get a cleaner render:
supersede it with a new one and say why.

## Seeded from doctrine

- **R1** Hook lands inside the first 2 seconds: open on the strongest line, never a greeting or a name card. (source: doctrine, nexus-viral, 31/10/2026)
- **R2** Footage first. Type lives over the speaker's own footage; no flat full-frame card longer than 1 second. (source: doctrine 3.12, 31/10/2026)
- **R3** One-line captions sit just under the chin and never cover the face; no captions over B-roll or type moments. (source: doctrine, brief 31/10/2026)
- **R4** Stacked type holds long enough to read at 1x on a phone: at least 1.6 seconds, plus about a third of a second per word. (source: doctrine, brief 31/10/2026)
- **R5** Music sits about 25 dB under the voice, measured as integrated loudness, never by ear alone. (source: doctrine, brief 31/10/2026)
- **R6** No model-generated text or logos. Logos are the approved files composited in post (NRPG "The Reveal", Trade Hall "The Floor", the clean Synthex tile); retired logos never appear. (source: doctrine 3.14, 31/10/2026)
- **R7** Australian English on screen, no emoji, no banned phrases ("leverage", "unleash", "transformative", "journey", "not just X but Y"). Every on-screen word goes through nexus-copywriter. (source: doctrine 4, 31/10/2026)
- **R8** CARSI on-screen copy follows CARSI's IICRC CEC wording rules: no medical or disinfection claims, no implied accreditation the course does not hold. (source: doctrine, brief 31/10/2026)
- **R9** A sample business (for example Harbourside Carpet Care) is always labelled as a sample on screen. (source: card-films README, 26/10/2026)
- **R10** Fix misheard words before captions go on screen; the transcript is not the script. (source: doctrine, job-001 pre-scan, 31/10/2026)

## Learned rules
- **R11** Captions are 80 px and hang just under the chin at 47% of frame height, clear of anything on the shirt; this assumes the recording brief's framing (eyes on the upper third). `caption_style.size=80` `caption_style.chin_line=0.47` (source: note n735db0, job-001, 31/10/2026)
- **R12** When stacked type is on screen, the caption line is hidden; the stack carries the words. `caption_style.hide_under_stack=true` (source: note n87f438, job-001, 31/10/2026)
