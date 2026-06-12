---
title: "CloakBrowser made Claude agents undetectable (15k stars on GitHub)"
source: "https://www.youtube.com/watch?v=kVcOA5txllM"
author:
  - "[[Bitwise AI]]"
published: 2026-05-19
created: 2026-05-19
description: "Claude computer-use, OpenAI Operator, browser-use, Skyvern — every AI agent stack dies the second it hits Cloudflare, DataDome or Turnstile. Because the browser underneath (Chromium + Playwright) was"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=kVcOA5txllM)

Claude computer-use, OpenAI Operator, browser-use, Skyvern — every AI agent stack dies the second it hits Cloudflare, DataDome or Turnstile. Because the browser underneath (Chromium + Playwright) was built for QA testing, not autonomous agents. Then a 15k-star GitHub repo called CloakBrowser shipped 57 C++ patches that fix it at the source.  
  
This video audits CloakBrowser (github.com/CloakHQ/CloakBrowser, MIT-licensed, maintained by CloakHQ): a drop-in Playwright replacement that bakes the patches directly into the Chromium 146 binary, so Claude / Operator / browser-use stop registering as bots. We walk the three patches that matter — the \`navigator.webdriver\` getter, the CDP \`Runtime.Enable\` side-channel, and the \`--enable-automation\` compile-time defaults — then look at the 40GB / 10–20 hour Chromium build cost that makes the monthly release cadence the actual product. Closing with when to reach for source-patched Chromium vs. when JS stealth (playwright-stealth, patchright, rebrowser-patches) is enough, and the post-\`hiQ v. LinkedIn\` legal caveat.  
  
TIMESTAMPS  
0:00 - Intro  
0:21 - Enter CloakBrowser  
0:48 - Chromium leaks every agent  
1:16 - Patch #1: the webdriver tell  
1:41 - Patch #2: the boss leak  
2:15 - Patch #3: automation flag deleted  
2:36 - What the wall sees  
3:02 - Not a stealth plugin  
3:19 - The build-cost reality  
3:41 - When to actually use it  
4:15 - Outro  
  
LINKS & RESOURCES  
\- CloakBrowser: https://github.com/CloakHQ/CloakBrowser  
\- CloakBrowser changelog: https://github.com/CloakHQ/CloakBrowser/blob/main/CHANGELOG.md  
\- TechTimes profile on CloakHQ: https://www.techtimes.com/articles/316664/20260515/cloakhqs-open-source-chromium-fork-defeats-cloudflare-datadome-perimeterx-without-configuration.htm  
\- patchright (client-side analogue): https://github.com/Kaliiiiiiiiii-Vinyzu/patchright  
\- rebrowser-patches (JS-side): https://github.com/rebrowser/rebrowser-patches  
\- Rebrowser docs on patches: https://rebrowser.net/docs/patches-for-puppeteer-and-playwright  
\- CreepJS (detector): https://github.com/abrahamjuliot/creepjs  
\- Chromium Blink navigator source: https://chromium.googlesource.com/chromium/src/+/HEAD/third\_party/blink/renderer/core/frame/  
\- Chromium command-line switches: https://peter.sh/experiments/chromium-command-line-switches/  
\- Cloudflare bot detection engines: https://developers.cloudflare.com/bots/concepts/bot-detection-engines/  
\- Browser fingerprinting / CreepJS deep-dive: https://scrapfly.io/blog/posts/browser-fingerprinting-with-creepjs  
\- Chromium build (40GB / 10–20hr): https://blog.j2i.net/2025/12/23/building-chromium-v8-with-visual-studio-2026-december-2025/  
\- Bruce Dawson on Chromium build times: https://randomascii.wordpress.com/2020/03/30/big-project-build-times-chromium/  
\- Playwright stealth 2026 patch landscape: https://dev.to/vhub\_systems\_ed5641f65d59/playwright-stealth-mode-in-2026-the-7-patches-that-actually-matter-46bp  
\- Playwright bot detection in 2026 (AlterLab): https://alterlab.io/blog/playwright-bot-detection-what-actually-works-in-2026  
\- When JS stealth is enough (Scrapewise): https://scrapewise.ai/blogs/playwright-stealth-2026  
\- hiQ v. LinkedIn (Ninth Circuit, on remand): https://newmedialaw.proskauer.com/2022/04/21/taking-cue-from-the-supreme-courts-van-buren-decision-ninth-circuit-releases-new-opinion-holding-scraping-of-publicly-available-website-data-falls-outside-of-cfaa/  
\- hiQ v. LinkedIn (Jenner client alert): https://www.jenner.com/en/news-insights/publications/client-alert-data-scraping-in-hiq-v-linkedin-the-ninth-circuit-reaffirms-narrow-interpretation-of-cfaa  
\- hiQ v. LinkedIn (Wikipedia): https://en.wikipedia.org/wiki/HiQ\_Labs\_v.\_LinkedIn  
  
TAGS  
#Claude #AIAgents #GitHub #Cloudflare #CloakBrowser

## Transcript

### Intro

**0:00** · Your AI agent can click buttons, book flights, fill forms, until it hits the bot wall.

**0:06** · Cloudflare, Turnstile, DataDome, it dies.

**0:11** · Because Chromium was built for QA testing, not for agents. So, someone fixed it at the source. The first browser built for AI agents. It's called Cloak Browser. 14,000 stars on GitHub, MIT licensed, maintained by Cloak HQ.

### Enter CloakBrowser

**0:27** · And the part that feels illegal, you don't change your code. One pip install, swap one import, same Playwright API your agent already uses, but the binary underneath isn't Chrome. It's Chromium 146 with 57 C++ patches compiled into the source. Not injected by JavaScript, not patched at launch. Baked. Here's the problem.

### Chromium leaks every agent

**0:48** · Every agent framework, browser use, Skyvern, LangChain, even Claude's computer use, is just a wrapper around Playwright, which means they all carry the same fingerprint. The browser quietly tells the website, "I'm being automated." in dozens of ways. Your $200 a month frontier model is driving a browser that snitches on it in the first 10 milliseconds. And JavaScript stealth tricks? Detection scripts see right through them. Patch number one.

### Patch #1: the webdriver tell

**1:16** · Vanilla Chromium has a property called navigator.webdriver.

**1:23** · Under any automation tool, it returns true. Instant tell.

**1:27** · Cloak browser changes that one line to return false deep in the C++ source.

**1:33** · Now, when detection scripts inspect the browser, they see a real unmodified property. 27 tells drop to zero. Patch number two. The big one. Every Playwright session sends a command called runtime enable to start the browser. Chromium answers by streaming back the internal IDs of every execution context, including the hidden world Playwright runs from.

### Patch #2: the boss leak

**1:58** · Cloudflare grabs that ID from a deliberate error trace and your agent is outed. Other stealth tools dodge the command.

**2:06** · Cloak browser fixes the leak deeper in the engine, so it never happens at all.

**2:11** · The hidden world still works. Detectors just can't see it. Patch number three, Chromium ships with a switch called enable automation. One flag lights up four tails, the yellow controlled by automation bar, the webdriver property, killed password prompt, a tagged extension. Stealth libraries hide the flag at launch. Cloak browser just removes the defaults from the binary.

### Patch #3: automation flag deleted

### What the wall sees

**2:36** · So, what does a real website actually see?

**2:39** · Vanilla Playwright? Automation flag true, Selenium globals leaked, GPU driver says Swift shader, network fingerprint screams headless.

**2:50** · Cloudflare gives it a trust score of zero.

**2:53** · The agent never reads the page. Cloak browser through the same wall?

**2:57** · 30 out of 30 on every public detection test. The agent just clicks the button.

### Not a stealth plugin

**3:02** · This isn't a stealth plugin. It's not a disguise. Playwright stealth changes JavaScript after the page loads.

**3:09** · Rebrowser and Patch write patch the client. Cloak browser recompiles the browser itself.

**3:15** · Fingerprints aren't patched at runtime.

**3:18** · They're born different. Cool, I'll just patch Chromium myself. Sure. A Chromium checkout is 40 GB.

### The build-cost reality

**3:26** · A clean release build 10 to 20 hours on a normal laptop.

**3:30** · Even Google's perf engineers log six on tuned hardware.

**3:35** · Cloak browser does the build, tracks upstream, and ships a fresh binary every month. That cadence is the product. Real talk. If your agent only hits low-tier websites, a stealth plugin plus a residential proxy still works.

### When to actually use it

**3:49** · Don't pull a recompiled browser for that. Reach for source level patches when your agent has to hit Cloudflare Enterprise, Data Dome, PerimeterX, the walls real customers sit behind.

**4:01** · One caveat, it's a precompiled binary, so you can't audit 57 patches without doing the build yourself.

**4:09** · And if your agent acts on a logged in account, the terms of service breach is on you, not the browser. The agent stack just got a real browser. Next question.

### Outro

**4:19** · Can it survive behavioral detection?

**4:22** · Subscribe, we're testing that next.