# BEWG image prompts — for Phill's ChatGPT Pro account

Images for this site are made in ChatGPT Pro (founder instruction, 09/11/2026), not other generators.
Ivi's own job photos stay first choice. Use these prompts only for the slots below.

**How to use**
1. Paste one prompt into ChatGPT (image mode). Ask for **landscape 3:2, photorealistic**.
2. Download the image and save it as `<slot id>.webp` (convert PNG to WebP, aim for under 450 KB).
3. Put it in `sites/bewg/media-cache/` and commit. The next build uses it automatically and the
   real-photo fallback stops showing.
4. Add a line for it to `media.manifest.json` with `"source": "generated"`.

**House style for every prompt** (already included below): photorealistic, natural daylight, Australian
suburban homes (brick veneer, weatherboard, Queenslander or modern townhouse), muted greens and warm
neutrals, no text, no logos, no brand names, no faces looking at camera, technician in plain charcoal
work polo and nitrile gloves.

| Slot id | Used on | Prompt |
|---|---|---|
| `hero-home` | Home page hero (wide, text sits over the lower left) | Photorealistic wide shot inside a Melbourne brick-veneer home: a building investigator in a plain charcoal work polo and nitrile gloves holds a thermal imaging camera up to a ceiling corner with a faint brown water stain. Soft natural window light, calm mood, muted green and warm neutral palette, shallow depth of field, lots of quiet space on the left for headline text. No text, no logos, face turned away from camera. 3:2 landscape. |
| `subfloor` | Services → Subfloor | Photorealistic view under a raised Australian timber house: an investigator kneels on dry soil with a torch and moisture meter, checking a timber bearer near a subfloor vent. Dappled daylight through the vent, cobweb-free, realistic dust and soil texture, muted earthy palette. No text or logos. 3:2 landscape. |
| `concrete` | Services → Timber floor and concrete moisture | Photorealistic close-up of gloved hands inserting a relative humidity probe into a drilled hole in a bare grey concrete slab in a stripped-back Australian living room, timber flooring stacked in the background. Even natural light, clean and technical. No text or logos. 3:2 landscape. |
| `monitoring` | Services → Continuous monitoring | Photorealistic small white environmental data logger mounted on a skirting board in a quiet Australian bedroom, a faint damp patch on the wall above it, morning light through sheer curtains. Calm, clinical, muted palette. No screens showing readable numbers, no text or logos. 3:2 landscape. |

Optional later (no slot yet): a mould air-sampling pump on a tripod in a living room; a vane hood on a
bathroom exhaust; a timber floor with cupped boards in afternoon light.
