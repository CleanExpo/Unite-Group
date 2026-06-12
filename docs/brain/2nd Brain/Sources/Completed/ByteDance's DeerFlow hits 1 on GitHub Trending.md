---
title: "ByteDance's DeerFlow hits #1 on GitHub Trending"
source: "https://www.youtube.com/watch?v=l__5ssiHl4E"
author:
  - "[[Indie Hacker News]]"
channel: "Indie Hacker News"
published: 2026-05-08
created: 2026-05-08
description: "ByteDance, the TikTok parent company, just shipped a fully open-source super agent harness with 65,500 stars and a ground-up 2.0 rewrite. It's called DeerFlow.DeerFlow is the assembled product, not"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=l__5ssiHl4E)

ByteDance, the TikTok parent company, just shipped a fully open-source super agent harness with 65,500 stars and a ground-up 2.0 rewrite. It's called DeerFlow.  
  
DeerFlow is the assembled product, not a kit. It ships sub-agents that fan out in parallel, a real sandbox the agent can actually edit files in, persistent long-term memory across sessions, an Anthropic-compatible Markdown skills system, six IM channels (Telegram, Slack, Feishu, WeChat, WeCom, DingTalk), and a LangGraph-compatible HTTP gateway. Built on LangGraph and LangChain, MIT licensed, hit #1 on GitHub Trending the day v2 launched. Here's what's actually in it, how it differs from the LangChain pile, and who should be paying attention.  
  
🔗 Repo: https://github.com/bytedance/deer-flow  
🌐 Site: https://deerflow.tech  
  
CHAPTERS  
00:00 Intro  
01:10 The README  
02:34 Why it matters  
03:10 The spec sheet  
03:23 How it works  
05:18 Under the hood  
06:17 Installation  
06:36 Latest releases  
07:24 Who it's for  
08:02 Verdict  
  
Daily indie hacker news, AI deep dives, and builder stories: https://indiehacker.news  
  
#DeerFlow #ByteDance #AIAgents #LangGraph #OpenSource #LLM #IndieHacker #Agent

## Transcript

### Intro

**0:00** · ByteDance, the TikTok company, quietly dropped a 65,000 star agent harness on GitHub.

**0:07** · Okay, so here is the project I actually want to talk about today because the framing is weirder than the project. The TikTok parent company built an open-source super agent harness, slapped an MIT license on it, and just shipped a complete 2.0 rewrite. It is called Deep Flow.

**0:24** · It is a runtime that orchestrates sub agents, manages a sandbox, runs a real file system that agent can actually edit, ships long-term memory across sessions, and talks to Telegram, Slack, Face Shu, and WeChat out of the box. It is not a LangChain demo.

**0:40** · It is the thing you would build if you were tired of gluing together LangChain demos.

**0:45** · 65,500 stars, 8,600 forks, MIT licensed, and it hit number one on GitHub trending the day version two shipped.

**0:56** · It launched as a deep research framework one year ago today. The community pushed it way past research, so the team tore it down to the studs and rebuilt it as a harness. 2.0 shares zero code with 1.0.

**1:07** · Let me show you what is actually in it.

### The README

**1:11** · The readme opens with the renaming Deep Exploration and Efficient Research Flow.

**1:15** · Super agent harness orchestrates sub agents, memory, and sandboxes. The version two call out is right under the title.

**1:23** · The repo shares no code with version one. The original deep research framework lives on the legacy branch.

**1:30** · ByteDance recommends three Chinese open-weight models to drive it. Doubao Seed 2.0 code, which is ByteDance's own model, DeepSeek V3.2, and Kimi 2.5 from Moonshot.

**1:42** · The one-line agent setup is the part Cloud Code users will recognize.

**1:46** · You hand any coding agent the install.md URL, and it bootstraps Deep Flow on your machine. Below that, the recommended sizing table.

**1:56** · 8V CPU and 16 gigs of RAM for a long-running server. The configuration block accepts GPT 5 through the responses API, Claude Sonnet 4.6 through the code OAuth flow, code X CLI, open router VLLM with QN, anything that speaks the OpenAI API.

**2:16** · And way down the page, the IM channels table. Telegram, Slack, Feishu, WeChat, WeCom, DingTalk, all long poll or web socket. No public IP needed. You install one bot, point it at a running Dear Flow, and now anyone in your team chat can spin up a sub agent task.

### Why it matters

**2:35** · Okay, so why does this matter when LangChain and AutoGen and Crew AI exist and everyone has shipped an agent framework already?

**2:43** · The pitch Dear Flow makes is simple.

**2:45** · Most agent frameworks give you part.

**2:47** · You wire up the model, you wire up the tools, you write the prompt loop, you debug the context window when it explodes. Dear Flow gives you the assembled product, file system, memory skills, sub agent sandbox, gateway, all working together, batteries included.

**3:02** · You either run it as is or you tear it apart and replace the pieces you do not like, but you do not start from a blank ref file.

### The spec sheet

**3:11** · 2,050 commits in the repo, 448 open issues, most of them feature requests, not bugs. Built on LangGraph. 44 megabytes of source code, which is large for an agent harness.

### How it works

**3:24** · Let me walk through the features that actually make Dear Flow do work, not just chat. Skills are first. A Dear Flow skill is a markdown file, same shape as an Anthropic Claude code skill. It defines a workflow, best practices, and a path to supporting resources.

**3:39** · The harness ships built-in skills for research, report generation, slide creation, web pages, image generation, and video. They load progressively.

**3:49** · The agent only pulls a skill into context when the task needs it, which means the context window stays lean.

**3:55** · Sub-agents are second.

**3:57** · The lead agent decomposes a complex task and spawns child agents on the fly.

**4:02** · Each sub-agent runs in its own isolated context. Each gets its own scope tools.

**4:07** · They can run in parallel. They report back structured results. The lead agent synthesizes everything into one coherent output.

**4:15** · That is how you keep a long task on rails without one giant context window blowing up.

**4:21** · The sandbox and the file system are the third feature, and this is where Deerflow stops being a chatbot and becomes an agent that actually does work. Each task gets its own execution environment with a real file system view. Skills, workspace, uploads, outputs. The agent reads, writes, edits files.

**4:40** · Views, images. With the AIO sandbox provider, shell execution runs inside isolated containers. The fourth one is long-term memory.

**4:50** · Most agents forget everything when a conversation ends. Deerflow keeps a persistent memory of your profile, your stack, your recurring workflows across every session.

**4:59** · The fifth one is IM channels. The thing nobody else ships. You connect Telegram or Slack or Feishu or WeChat or WeCom or DingTalk, and now your team chat is the agent interface.

**5:11** · No public IP required, no callback URL, just a long poll bot pointed at your local Deerflow.

### Under the hood

**5:19** · Under the hood, the architecture is built on LangGraph for orchestration and LangChain for the model abstractions.

**5:26** · The gateway API is the public-facing entry point.

**5:30** · It exposes a LangGraph-compatible HTTP interface, so anything that speaks the LangGraph API, including LangSmith and LangFuse, can drive Deerflow with no changes.

**5:42** · There is also an embedded Python client.

**5:45** · You import Deerflow as a library, instantiate the client, and you get the same response schemas as the HTTP gateway, but in process, no server needed. The whole thing speaks the OpenAI API as the model abstraction, which means anything from GPT-5 Pro through the Responses API to vLLM running Q&amp;A on your gaming PC. Just works under the MCP side, it supports HTTP and SSE servers with full OAuth token flows.

**6:15** · Client credentials and refresh tokens.

### Installation

**6:18** · Setup is one command if you're using a coding agent. You hand Claude, Code, or Codex, or Cursor the install instructions URL, and it bootstraps the whole thing.

**6:28** · Or you clone the repo, run make setup, the wizard walks you through model provider, web search, and sandbox preferences in about 2 minutes.

### Latest releases

**6:37** · 2.0 M1 release candidate is the live tag. The changelog tells you exactly where the team is investing time. Strict tool call recovery, which strips dangling tool call metadata when a provider interrupts the loop. So, OpenAI reasoning models stop crashing on malformed history. Memory updates that skip duplicate fact entries, so repeated preferences do not accumulate forever.

**7:00** · Gateway artifact serving that forces active web content like HTML and SVG to download as attachments, reducing the cross-site scripting risk on agent-generated artifacts.

**7:12** · And Docker sandbox mode auto detection, which now respects the config.yaml sandbox setting end-to-end. These are not flashy features. They are the kind of fixes that ship from a team that runs the harness in production.

### Who it's for

**7:25** · So, who actually benefits from running this in 2026? If you're an indie hacker who wants to ship an agent product, but does not want to spend 3 weeks on the LangGraph plumbing, Deerflow gives you the assembled harness day one. If you run a small team and you want your group chat to to the agent interface instead of yet another web app. The IM channel support is unique on this list. If you're doing serious authentic skills work and you have a cloud code skill library, those skills run on Dear Flow with zero rewrites.

**7:52** · And if you need a research or coding harness that you can fully self-host with VLLM and QN on a single GPU, this is the only batteries included option that ships today.

### Verdict

**8:03** · Okay, let's be real about the tradeoffs.

**8:05** · Dear Flow is built on LangGraph, so if you're allergic to the LangChain ecosystem, you're stuck with the LangChain ecosystem here, too. The default sandbox guidance assumes a local trusted environment and the security notice is explicit. Improper deployment introduces command execution risk, full stop. The recommended models are mostly Chinese open weights, which is fine technically, but worth knowing if your compliance team has a policy.

**8:29** · And the IM channel feature is impressive, but most of the integrations beyond Telegram and Slack are oriented toward the China market. But for everything that's wrong with it, the project is real. 65,000 stars, 8,700 forks, MIT license.

**8:45** · ByteDance pushing to the main branch yesterday.

**8:48** · A complete 2.0 rewrite that ships sub-agents, a real sandbox, persistent memory, an embedded Python client, six IM channels, an Anthropic-compatible skill system, and a LangGraph-compatible gateway, all in one repo.

**9:03** · If you're an indie builder in 2026 and you're putting together your own agent harness from parts, you're missing the wave. Repo link is in the description.

**9:11** · Thanks for watching. I'll catch you tomorrow.