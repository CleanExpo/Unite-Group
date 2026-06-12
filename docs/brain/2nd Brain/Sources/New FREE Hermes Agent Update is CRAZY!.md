---
title: "New FREE Hermes Agent Update is CRAZY!"
source: "https://www.youtube.com/watch?v=GUTCVUm02Oo"
author:
  - "[[Julian Goldie SEO]]"
published: 2026-05-19
created: 2026-05-19
description: "Get the Hermes Agent OS: https://www.skool.com/ai-profit-lab-7462/aboutWant to make money and save time with AI? Join here: https://www.skool.com/ai-profit-lab-7462/aboutVideo notes + links to the"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=GUTCVUm02Oo)

Get the Hermes Agent OS: https://www.skool.com/ai-profit-lab-7462/about  
Want to make money and save time with AI? Join here: https://www.skool.com/ai-profit-lab-7462/about  
  
Video notes + links to the tools 👉 https://www.skool.com/ai-profit-lab-7462/about  
  
Get a FREE AI Course + Community + 1,000 AI Agents 👉 https://www.skool.com/ai-seo-with-julian-goldie-1553/about  
  
Get a FREE AI SEO Strategy Session → https://go.juliangoldie.com/strategy-session?utm=julian  
  
Get 200+ Free AI SEO Prompts → https://go.juliangoldie.com/chat-gpt-prompts  
  
Hermes Agent v0.14 just dropped — a free, open-source AI agent that installs in one command, runs 180x faster on web automation, and now works natively on Windows + Microsoft Teams. Here's everything that changed and how to set it up in minutes.  
  
00:00 Intro – Why this free AI agent update changes everything  
00:36 What Is Hermes Agent – Autonomous AI across 22+ apps you already use  
01:33 v0.14 Foundation Release – The numbers behind the biggest update yet  
01:49 One-Command Install – pip install hermes-agent + native Windows support  
02:24 Speed Boosts – 19s faster cold start, 10x faster tools, 180x faster browser  
03:07 Local OpenAI Proxy – Use Claude Pro, ChatGPT Pro & Grok via one endpoint  
03:40 New Platforms – Line, Simplex & full Microsoft Teams integration  
04:04 Session Handoff – Swap models mid-conversation without losing context  
04:23 Smarter Coding – Auto LSP diagnostics catch errors before they ship  
04:53 Vision Upgrade – Direct image reasoning, no more text fallback  
05:44 Install Walkthrough – Setup, provider connect & Telegram bot in minutes  
06:47 Pro Tips – Skills, prompt caching & handoff for faster workflows  
07:44 Recap – Every major v0.14 feature in 30 seconds

## Transcript

### Intro – Why this free AI agent update changes everything

**0:00** · New free Hermes agent update is crazy.

**0:02** · What if you could run a fully autonomous AI agent for free that works across every app you already use, gets smarter the longer it runs, and just got a massive update that makes it faster, easier to install, and more powerful than ever? Why is almost nobody talking about this? Is this the AI agent setup that actually replaces the expensive paid tools? And what if you could set it up in one single command? Hey, I'm the digital avatar of Julian Goldie. I help people like you actually learn and use AI tools in their real work, not just talk about them. Today, we're going deep on Hermes agent version 0.1.4.

**0:33** · What it is, what just changed, how to install it, and how you can start using it right now. So, first, what even is Hermes agent? Hermes agent is a free, open-source autonomous AI agent built by Neus Research. It's not a chatbot wrapper. It's not a coding copilot locked inside your IDE. It's an agent that lives on your own server, remembers what it learns across every conversation, builds its own skills over time, and reaches you wherever you already are.

### What Is Hermes Agent – Autonomous AI across 22+ apps you already use

**1:00** · Telegram, Discord, Slack, WhatsApp, Signal, email, the command line, and now even Microsoft Teams and Line. Hermes grows the longer it runs.

**1:09** · It has persistent memory, auto-generates skills based on your projects, and can run scheduled automations in the background. It can also spin up multiple sub-agents to work in parallel, giving you real multitask capability without any extra setup. And it's fully open-source under the MIT license. You can run it yourself on your own machine or server with your own API keys, no platform lock-in. Version 0.1.4.0 dropped on May 16th, 2026.

**1:32** · They're calling it the foundation release. 800 make commits, 633 merge pull requests, 1293 files changed, and 545 issues closed. Let's break down exactly what matters. The biggest change in this release is that Hermes now installs and runs anywhere. Before this update, getting Hermes running could involve cloning a GitHub repo, running shell scripts, and dealing with dependency issues. Now, one command. You type pip install Hermes agent and you're done.

### v0.14 Foundation Release – The numbers behind the biggest update yet

### One-Command Install – pip install hermes-agent + native Windows support

**2:02** · It's a real PyPI package. The wheel includes the full TUI interface and the shell launcher. No git, no cloning required. Native Windows support just landed in early beta. Hermes now runs natively on cmd.exe and PowerShell. No WSL required. And they've done a full lazy install overhaul, so heavy back-end packages only install on first use, making the initial setup dramatically lighter. Now, let's talk speed because this update is noticeably faster in ways you'll feel immediately.

### Speed Boosts – 19s faster cold start, 10x faster tools, 180x faster browser

**2:31** · They shaved about 19 seconds off the cold start time. Skills are now cached. There's no unnecessary network call at startup, and imports are deferred until you actually need them. The Hermes tools command used to take 14 seconds on all platforms. It now runs in under 1.5 seconds. That's nearly a 10x improvement just from smarter loading. Browser console evaluations, the calls Hermes makes when it's automating a webpage, are now 180 times faster.

**2:58** · They rerouted those calls through a persistent connection instead of spinning up a new session every single time. If you're using Hermes for web automation, this alone makes it feel like a completely different tool. Hermes now has a local OpenAI compatible proxy.

### Local OpenAI Proxy – Use Claude Pro, ChatGPT Pro & Grok via one endpoint

**3:14** · You run Hermes proxy and it exposes any OAuth authenticated provider, Claude Pro, ChatGPT Pro, or SuperGrok via XAI as a local end point compatible with CodeX, Ada, Klein, and VS Code Continue.

**3:29** · XAI Grok also landed as a new OAuth provider in this release. You sign in with your XAI account and use Grok models directly from Hermes without a separate API key setup. The messaging platform situation just got a lot more interesting. This release adds Line and SimpleX chat, bringing the total to 22 supported platforms. But bigger than the new platforms is the full Microsoft Teams integration.

### New Platforms – Line, Simplex & full Microsoft Teams integration

**3:53** · They built out the entire Microsoft graph stack, authentication, web hook listener, pipeline runtime, and outbound message delivery. So, Hermes can now read and post to Teams channels. The handoff command is now working properly. It transfers an active session to a different model mid-conversation, carrying over your message history, tool history, and full context. Discord now backfills recent channel history when Hermes joins a thread. And on both Telegram and Discord, clarify prompts now render as native buttons instead of asking you to type a response.

### Session Handoff – Swap models mid-conversation without losing context

### Smarter Coding – Auto LSP diagnostics catch errors before they ship

**4:26** · Every time Hermes writes or patches a file, it now runs real language server diagnostics automatically, catching actual syntax errors and semantic problems before they reach your code base. This is a big deal for anyone using Hermes to help write or maintain code. There's also a new per-turn verifier that runs after any turn where Hermes modifies files, giving you a clear summary of exactly what changed on disk and catching silent overwrites, those situations where the model says it wrote something, but it didn't actually land. The vision tool got smarter, too.

### Vision Upgrade – Direct image reasoning, no more text fallback

**4:59** · When you're using a model that can see images, vision analyze now passes the image directly to the model instead of falling back to a text description. You get the full visual reasoning capability of your model, not a workaround. Before I get into installation, I want to tell you about what we're doing inside the AI Profit Boardroom that's directly relevant to everything I just covered.

**5:21** · Members inside the Boardroom are already building automated research and outreach workflows with Hermes agent. We've got walkthroughs covering how to set up Hermes with your own provider keys, how to connect it to Telegram, and how to use the scheduling features to run automations in the background. There are coaching calls where members show their actual setups and ask questions live. If you want to go from watching this video to actually having a working Hermes setup, the Boardroom is where you do that. Link is in the description. All right, let's walk through how to install Hermes Agent right now. Open your terminal and run pip install Hermes Agent. Once it's done, run Hermes setup.

### Install Walkthrough – Setup, provider connect & Telegram bot in minutes

**5:56** · This walks you through connecting your provider, Claude, ChatGPT, Grok, or an open-source model through Ollama or OpenRouter. You pick the model, authenticate it, and Hermes is ready to go. The whole setup takes a few minutes.

**6:09** · To connect Telegram, you'll need a bot token from BotFather. Search for BotFather on Telegram, type /newbot, follow the prompts, get your token, and paste it inside Hermes setup. It handles the connection automatically from there.

**6:21** · Within a few minutes, you'll be able to message your agent directly from your phone. On Windows, open PowerShell as administrator and run the same pip install Hermes Agent command. For Docker, the image now auto-bootstraps your auth configuration from environment variables on first boot. Then, run Hermes tools to see everything available. And with the speed improvements in this release, that command loads in under 1.5 seconds. A few pro tips for beginners. Start with one platform before adding more. If you use Telegram, connect that first.

### Pro Tips – Skills, prompt caching & handoff for faster workflows

**6:49** · Once you're messaging your agent and it's responding correctly, then expand to Discord or Slack. Use the skill system.

**6:57** · This release added Hugging Face skills as a trusted default tab, giving you a community library to pull from. There are nine new skills in this release alone, including OSINT investigation, API testing, and a Notion integration overhaul. Take advantage of prompt caching. Hermes now shares a 1-hour prefix cash across sessions for Claude models on Anthropic, OpenRouter, and NewsPortal.

**7:20** · That means if you're doing repetitive research or automation workflows, your subsequent runs are noticeably faster because the model doesn't have to reprocess the same context from scratch every time. Use handoff if you're switching between different kinds of tasks mid-session.

**7:35** · And for anyone writing code with Hermes, the LSP diagnostics are now running automatically on every file write.

**7:42** · Errors get caught before they ever ship.

### Recap – Every major v0.14 feature in 30 seconds

**7:44** · Hermes Agent via palm 4.0 is a huge release. Native Windows Pi Pi install, 180x faster browser calls, 19 seconds off cold start, full teams integration, local open AI compatible proxy, live session handoff, real language server diagnostics, 22 messaging platforms, and nine new optional skills. All free, all open source.

**8:07** · If you want to go deeper on all of this, the step-by-step Hermes walkthroughs, the automation templates, the provider setup guides, and live coaching calls where you can get your specific questions answered, that's exactly what the AI Profit Boardroom is built for. Every workflow and tutorial from this video is waiting for you inside. Link is in the description. Come join us. And if you want the full process SOPs and over 100 AI use cases like this one, join the AI Success Lab.

**8:35** · Links are in the comments and description. You'll get all the video notes from there. Plus access to our community of 58,000 members who are crushing it with AI.