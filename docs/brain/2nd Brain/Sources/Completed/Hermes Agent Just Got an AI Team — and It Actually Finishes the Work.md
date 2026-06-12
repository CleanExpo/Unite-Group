---
title: "Hermes Agent Just Got an AI Team — and It Actually Finishes the Work"
source: "https://www.youtube.com/watch?v=qL0tsjgoJgQ"
author:
  - "[[Panda Making Money]]"
channel: "Panda Making Money"
published: 2026-05-08
created: 2026-05-08
description: "Hermes Agent v0.13 just dropped — and the multi-agent Kanban system changes what open-source agents can actually do.This is a full breakdown of the Tenacity Release: what shipped, why it matters, an"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=qL0tsjgoJgQ)

Hermes Agent v0.13 just dropped — and the multi-agent Kanban system changes what open-source agents can actually do.  
  
This is a full breakdown of the Tenacity Release: what shipped, why it matters, and what it signals about where Hermes Agent is heading. The release covers five major areas — the new multi-agent Kanban coordination system that lets multiple Hermes worker instances share a durable task board, the slash goal command that keeps a single agent locked onto an objective across an entire session, a complete rewrite of the checkpointing and session persistence layer with auto-resume after restarts, a wave of eight critical security fixes including a CVSS 8.1 Discord privilege escalation, and a broad ecosystem expansion covering new platforms, providers, models, skills, and tooling.  
If you are running AI agent workflows and you care about reliability, coordination, and infrastructure that actually holds up under real conditions, v0.13 is the most significant Hermes release to date. 864 commits, 588 merged pull requests, 295 community contributors, and a clear design philosophy running through all of it. This video breaks down everything that shipped and what it means for the open-source agent space in 2026.  
  
👉 Don't forget to like, subscribe, and hit the notification bell to stay updated with our latest videos!  
\=====================================================  
  
🖥️ Host your Hermes Agent setup on Hostinger VPS → https://www.hostg.xyz/SHJEf  
  
🔗 Hermes Agent v0.13 Release - https://github.com/NousResearch/hermes-agent/releases/tag/v2026.5.7  
  
\----------------------------------------------------------------------------------------------------------  
Timestamps:  
00:00 - Introduction: The Problem with AI Agents  
01:32 - Version 0.13: The Tenacity Release Stats  
02:37 - Pillar 1: Multi-Agent Kanban System  
05:09 - Reliability Primitives & Hallucination Gates  
06:38 - Orchestrator vs. Worker Roles  
08:30 - Pillar 2: The /goal Command & Fighting Drift  
11:00 - Pillar 3: Session Durability & Checkpoints V2  
12:35 - Auto-Resume Behavior for Restarts  
13:30 - Pillar 4: Security Wave & Critical Fixes  
14:23 - Discord & WhatsApp Vulnerability Patches  
15:28 - TTOU & Cron Prompt Injection Fixes  
17:30 - Pillar 5: Ecosystem Expansion & Google Chat Support  
18:14 - New Inference Providers & Model Support  
18:54 - MCP Integration Upgrades  
19:24 - New Core Tools: Video Analysis & XAI Voices  
19:48 - Automatic Syntax Checking for Code Files  
20:20 - Cron "No Agent" Mode  
20:43 - New Optional Skills & Integrations  
21:30 - Dashboard & CLI Improvements  
22:30 - Internationalization & New Locales  
22:52 - Conclusion: The Future of Hermes Agent  
26:15 - Server Recommendations & Final Thoughts  
\----------------------------------------------------------------------------------------------------------  
  
🛠️ USEFUL TOOLS & SERVICES:  
  
📌 FREE 50 Pinterest Canva Templates - https://pandamakingmoney.systeme.io/freepinteresttemplates  
  
✅ PromoPDF AI - https://promopdfai.online/  
✅ Systeme.io - https://cutt.ly/fwC8IHCp  
✅ Shopify - https://shopify.pxf.io/DKgAgb  
\----------------------------------------------------------------------------------------------------------  
  
🎯 Follow us:  
Youtube - https://www.youtube.com/@PandaMakingMoney  
Pinterest - https://pinterest.com/lomashkumar111/  
Buy me a Coffee - https://www.buymeacoffee.com/PandaMakingMoney  
\=====================================================  
#hermesagent #aiagents #ai  
\=====================================================  
  
Affiliate Disclosure:  
  
Please note that some of the links in this video description may be affiliate links. This means that if you click on one of these links and make a purchase, we may earn a commission at no additional cost to you.  
  
We only recommend products and services that we have personally used and believe will add value to our audience. Your support through these affiliate links helps us continue to provide valuable content on affiliate marketing and making money online.  
  
Thank you for your support! If you have any questions or concerns, feel free to reach out to us.

## Transcript

### Introduction: The Problem with AI Agents

**0:00** · You give an AI agent a complex task, you walk away, you come back an hour later, it stopped halfway through, or it finished the wrong thing, or it just quietly gave up and never told you. If you have been using AI agents for anything more serious than a quick question, you already know this feeling.

**0:15** · The promise is always enormous. The follow-rough is usually where things fall apart. That is the problem Hermes Agent version 0.13 was built to solve.

**0:24** · Not just one part of it, all of it. The news research team named this release the Tenacity release, and that name \[music\] is not a marketing angle. It is a design brief. Every major feature in this update is about one thing, making sure the agent finishes what you started. In this video, we're going to break down everything that shipped in version 0.13. We will cover the multi- aent conbon system, which turns Hermes into a coordination layer for an entire team of AI workers. We will get into the new/goal command which keeps a single agent locked onto a target across an entire conversation.

**0:55** · We will look at what changed under the hood with session durability and checkpoints. We will walk through the security wave that closed eight critical vulnerabilities \[music\] and we will cover the broader ecosystem expansion because this release shipped a lot more than the headline features. If you find this kind of breakdown useful, go ahead and hit the like button right now. It genuinely helps this channel reach other people who are serious about the AI agent space and it only takes a second. If you're new here, this channel covers open-source AI tools, agent infrastructure, and everything in the ecosystem around it.

**1:26** · So, subscribe and turn on notifications so you do not miss what comes next. Now, let's get into it.

### Version 0.13: The Tenacity Release Stats

**1:32** · Before we get into the individual features, it is worth taking a moment to understand the sheer size of what just dropped because version 0.13 is not a typical point release. Since version 0.12, the Hermes agent repository saw 864 commits, 588 merged pull requests, 829 files changed, and over 128,000 lines of new code. They closed 282 issues in a single cycle, including 13 at the highest severity level. And all of that happened with 295 community contributors involved in one way or \[music\] another.

**2:03** · That is not a small team shipping a quarterly update. That is a coordinated effort at a scale. Most open-source projects never reach. What makes that number meaningful is not just the volume, it is the direction. When you look across everything that shipped, there's a clear through line. This release is not a collection of independent features that happen to land at the same time. It is a focused push toward one outcome, turning Hermes Agent from a powerful personal assistant into something that behaves like actual infrastructure, something you can deploy, walk away from, and trust to keep running.

**2:35** · The release is built around five pillars and we are going to spend real time on each one. The first is multi-agent combon which is the headline feature and the most architecturally significant thing in this drop. The second is the /goal command which solves a much simpler problem but one that affects every single user every single day. The third is session durability which covers the checkpoints v2 rewrite and the new autores behavior. The fourth is the security wave where eight critical vulnerabilities were closed in one cycle.

### Pillar 1: Multi-Agent Kanban System

**3:05** · And the fifth is the broader ecosystem expansion which includes new platforms, new providers, new tools, and a lot of things that would have been headline features in a smaller release.

**3:15** · By the time we get through all five, the theme of this release will be impossible to miss. Tenacity is not \[music\] just a name is the entire design philosophy of version 0.13. To understand why this feature matters, you have to start with the problem it is solving. Hermes agent has always been capable of handling complex multi-step work. But there's a ceiling to what a single agent instance can do reliably when the task is genuinely large. You run into context limits. You run into drift.

**3:42** · You run into situations where the work is simply too broad to hand to one agent and expect a clean result on the other side. People have been working around this for a while using separate profiles, manual handoffs, and a lot of patience. The workarounds work, but they are fragile.

**3:58** · One dropped thread and the whole workflow falls apart. Multi-agent conbon is the answer to that ceiling. And the way to understand it is to start with what a conbon board actually is. A conbon board is a task queue organized into columns. Tasks move from one column to the next as they get picked up, worked on, and completed. In traditional software teams, humans are the ones moving those cards. In Hermes version 0.13, the workers are AI agent instances. You drop tasks onto the board and separate Hermes workers pull from the queue, execute their assigned work, and move the card forward.

**4:29** · The board itself is durable, meaning it lives on disk, survives restarts, and does not depend on any single worker staying alive to keep the system running. One installation of Hermes can now run multiple boards simultaneously. Each board can have its own workspace, its own set of workers, and its own task pool. Workspaces, logs, and board state are all shared across profiles. So, the orchestrator profile always has full visibility into what every worker is doing.

**4:55** · The dashboard received a dedicated conbon interface with inline task creation for platform home channel notification toggles and tenant filtering so you can manage multiple boards without losing track of which tasks belong to which project. The word that defines this entire system is durable and it is worth spending time on what that actually means in practice.

### Reliability Primitives & Hallucination Gates

**5:14** · The combat implementation in version 0.13 ships with a set of reliability primitives that are not common in multi-agent frameworks. Workers send continuous heartbeat signals to prove they are alive and actively \[music\] running. If a worker goes silent, the reclaim system kicks in and reassigns its task to another available worker automatically. Zombie detection handles the edge case where a process appears to be running but is not actually doing anything which is a real problem on Mac OS where processes can linger in a broken state. Each task can have its own retry budget through the max retries configuration.

**5:46** · So high priority work gets more attempts before the system marks it as failed. And if a worker crashes or exits without completing its task, it gets automatically blocked from picking up new work until the issue is resolved. The most interesting reliability primitive in this list is the hallucination gate. This one deserves a specific call out because it addresses a failure mode that is unique to AI systems. When a worker completes a step and reports back to the board, there's a possibility that it claims to have done something it did not actually do.

**6:14** · A worker might report that it created a task card, handed off a result, or moved a piece of work forward when in reality, it just generated text that described those actions without executing them. The hallucination gate catches those false claims and triggers a recovery flow. That kind of selfcorrection at the infrastructure level is not something you see in most multi- aent frameworks and it matters a lot when you're running workflows that depend on accurate state. The mental model for running a conbon setup in Hermes involves two distinct roles. The orchestrator is the profile that manages the board.

### Orchestrator vs. Worker Roles

**6:45** · It creates tasks, monitors worker status, handles notifications, and \[music\] coordinates the overall flow of work. The workers are separate Hermes instances that pull tasks from the queue and execute them. The orchestrator does not do the work itself. It manages the agents that do. This separation is what makes the system scalable. You can add more workers without changing how the board operates. And you can swap out individual workers without disrupting the tasks they have not yet picked up.

**7:11** · What this unlocks in practice is a significant expansion of what you can realistically hands. Research tasks that would previously require a single agent to work through dozens of sources sequentially can now be split across multiple workers running in parallel. A codebase analysis that would take one agent hours to complete can be divided by module and run simultaneously.

**7:32** · Writing workflows can have one worker drafting while another is editing a previous section. And for anyone building on top of Hermes, there is a new optional skill called conbon video orchestrator that news research shipped alongside this feature which is essentially a demonstration of using the conbon system to coordinate a multi-step video production pipeline. That skill alone gives you a concrete template for what a realworld multi-agent workflow looks like inside this system. The conbon system in version 0.13 is not a finished product. It is a foundation.

**8:01** · The primitives are solid. The reliability story is credible and the tooling is genuinely usable. But building workflows on top of it still requires real setup discipline, careful orchestrator configuration, and an understanding of how tasks should be structured to hand off cleanly between workers. That is not a criticism. Every meaningful piece of infrastructure has a learning curve. The point is that the floor is now high enough that serious workflows are possible and that is a meaningful shift from where Hermes was 6 months ago.

**8:28** · Multi-agent combon gets the headlines, but the /go command might be the feature that changes how you use Hermes every single day. It solves a problem that every person who has run a long agent session has experienced and it solves it in the simplest possible way. Here is what drift looks like in practice. You open a session and ask Hermes to ref factor a module across a large codebase. It starts well. A few tool calls in. It is reading files, making changes, doing exactly what you asked. Then something shifts. It starts summarizing files instead of editing them. You correct it.

### Pillar 2: The /goal Command & Fighting Drift

**8:59** · It gets back on track. Three turns later is explaining what it is about to do instead of doing it. You correct it again. By the end of a session, you have spent as much energy keeping the agent pointed in the right direction as you would have spent doing parts of the work yourself. This is not a bug in the traditional sense. It is a structural limitation of how LLM based agents maintain context across multiple turns.

**9:22** · The further you get from the original instruction, the more the agent relies on recent context, and recent context does not always carry the original intent cleanly. /goal changes that dynamic entirely. You set a goal at the start of a session and the agent locks on to it as a persistent reference point for the entire conversation. Every turn before the agent responds, it reorients itself toward the stated goal.

**9:45** · The intention you set at the beginning does not fade into the context window as the conversation grows. It stays at the front of the agents attention regardless of how many turns have passed or how complex the conversation has become.

**9:58** · News research refers to this internally as the Ralph loop, which is now a first class primitive in the Hermes architecture rather than something you approximate through careful prompting.

**10:07** · The term budget adds another dimension to this. When you set a goal, the agent is aware of how many turns it has available to accomplish it. This creates a natural pacing behavior. The agent does not burn turns on tangents or verbose explanations when it knows the budget is limited. It stays actionoriented, which is exactly the behavior you want from an agent running an extended task unattended. The reason SLG goal is easy to underestimate is that it does not look dramatic. There is no new dashboard, no multi-profile configuration, no complex setup.

**10:35** · It is a single command that changes how the agent behaves internally. But for anyone using Hermes for anything longer than a quick exchange, whether that is a research session of a writing project, a debugging run, or a code review, the difference in output quality and reliability over a long session is substantial. You set the goal once and you stop managing the agents attention.

**10:57** · That is a bigger shift than it sounds.

### Pillar 3: Session Durability & Checkpoints V2

**11:00** · There's a category of infrastructure problems that nobody talks about until they get burned by them. State persistence is one of those \[music\] problems. It is not exciting to discuss.

**11:08** · It does not make for a compelling feature announcement and it is completely invisible when it works correctly. But when it breaks, it breaks at the worst possible moment. You're midsession on something that matters.

**11:18** · The gateway restarts for an update or a config change and everything you're working on is gone. The conversation thread, the context, the tool state, all of it evaporates. You start over. That was the reality with Hermes checkpointing before version 0.13. The system worked, but it had real structural problems. Checkpoints accumulated over time without genuine pruning, which meant disc usage would balloon on longunning installations.

**11:43** · Orphan shadow repositories would appear after certain restart sequences and corrupt state in ways that were difficult to diagnose. And if the gateway restarted midsession for any reason, there was no guarantee that the conversation would survive intact. For a personal assistant you check in with a few times a day, that is tolerable. For infrastructure you are running unattended workflows on, it is a serious problem. Checkpoints v2 is a complete rewrite of the persistence layer. The new implementation uses a single store architecture which makes the state model dramatically easier to reason about.

**12:14** · Real pruning means old checkpoints are actually deleted instead of accumulating indefinitely. This guardrails cap how much storage the checkpoint system can consume. So longunning installations do not quietly eat through available space.

**12:27** · An orphan repository problem is resolved at the architectural level rather than patch \[music\] around. Auto resume is the feature built on top of that rewritten foundation and it is the part that changes the day-to-day experience most visibly. If the gateway restarts for any reason, whether that is a /update command, a source file reload, a configuration change, or an unexpected crash, active conversations automatically resume when the gateway comes back online. The user does not see a dropped session. Pending prompts are preserved. Home channel thread targets are preserved.

### Auto-Resume Behavior for Restarts

**12:58** · Thread routing from cache live session sources is \[music\] preserved. The agent picks up from where it left off as if the restart never happened. The way to think about this is in terms of the expectation gap between Hermes and the other infrastructure you rely on. You do not restart a database and lose your queries. You do not restart a message queue and lose the messages in flight. Production systems are designed to survive their own restarts. With checkpoints v2 and autores, Hermes is moving toward that same expectation. That is not a small thing. It is a signal about the kind of software this project is becoming.

**13:27** · Eight critical vulnerabilities closed in a single release cycle. That number is worth sitting with for a moment because it tells you two things simultaneously.

### Pillar 4: Security Wave & Critical Fixes

**13:38** · It tells you that someone did a serious audit, which is \[music\] a good sign, and it tells you that before this release, eight critical issues were open, which is a sobering reminder of where the project was standing. The honest framing here is that both things are true, and the fact that they're all closed now matters more than the fact that they existed. But understanding what they were and how they were fixed is important if you're running Hermes with real credentials on real platforms. The most straightforward fix is redaction being turned on by default. Before version 0.13, secret redaction and logs was an opt-in feature.

**14:06** · That means anyone running Hermes with a default configuration was potentially writing API keys, tokens, and credentials into log files without realizing it. Flipping that default is the kind of change that should have happened at launch, but better late than never, \[music\] and it is now the baseline behavior for every new installation. The Discord vulnerability is the one that deserves the most attention in this list. The issue was with how Hermes evaluated the allowed roles configuration for Discord.

### Discord & WhatsApp Vulnerability Patches

**14:32** · The system was checking whether a user had a role that matched the allow list, but it was not checking which server that role came from. In practice, this meant that an attacker operating in a different Discord server with a role that happened to share the same name as a role in your allow list could send direct messages to your Hermes bot and be treated as an authorized user. That is a privilege escalation through a social platform and it carried a CVS score of 8.1 which puts it firmly in the high severity range. The fix scopes role checks to the originating guild. So a role in server it cannot satisfy and allow list to find for server B.

**15:04** · WhatsApp now rejects unknown contacts by default. Previously, Hermes would respond to any incoming WhatsApp message, regardless of whether the sender was someone the operator had any relationship with. For a personal deployment, that is a nuisance for a deployment handling sensitive workflows is a real exposure. The new default behavior requires contacts to be known before the agent will engage with them.

**15:25** · The tactive fixes across o.json and mcp oth close a class of race condition vulnerabilities that are easy to overlook but genuinely exploitable in certain deployment environments. Talk to stands for time of check to time of use and the problem occurs when a system checks the state of a resource and then acts on it with a window between those two operations where another process can modify the resource. In the context of credential files, this means a malicious or misbehaving process could swap out credential content between when Hermes reads the file and when it writes back to it.

### TTOU & Cron Prompt Injection Fixes

**15:57** · The fix uses atomic write operations that eliminate that window entirely. The cron prompt injection fix is the subtlest one in this list and arguably the most interesting from a security architecture perspective. Kron jobs and Hermes assembled their prompts by pulling together content from multiple sources, including skill files.

**16:14** · If a skill file was compromised or maliciously crafted, it could inject instructions into the assembled prompt that would then be executed by the cron agent without the operator being aware.

**16:23** · The scanner that shipped in version 0.13 checks the fully assembled prompt content including all skill contributions before handing it to the agent. That is the right level to scan at because checking only the userfacing input misses anything injected through the skill layer. The remaining fixes cover the browser enforcing a cloud metadata block in hybrid routing to prevent serverside request forgery attacks against cloud provider metadata endpoints. Debug log uploads being redacted before transmission.

**16:49** · So sharing a diagnostic file does not accidentally expose credentials and sensitive file permissions being restored to owner only read and write access for the environment file, the off file and the state database. None of those are glamorous. All of the matter. The overall picture from this security wave is that Hermes is being taken seriously as infrastructure that handles real credentials and operates in real environments with real attack services.

**17:13** · 8 P 0 closures in one cycle is a meaningful commitment and the breadth of what was addressed suggests a genuine audit rather than reactive patching.

**17:21** · That is the right direction and it makes the case for running Hermes in more sensitive context significantly stronger than it was before this release.

**17:29** · Everything covered so far represents the structural changes in version 0.13, but this release also shipped a significant volume of features that would have been a headline in a smaller update. and they deserve coverage even if the pace here moves faster than the previous sections.

### Pillar 5: Ecosystem Expansion & Google Chat Support

**17:44** · Google chat is now the 20th messaging platform supported by Hermes. That milestone comes alongside a more important architectural change. Noose research introduced a generic platform plug-and- hook system that lets third party adapters integrate without touching the Hermes core. IRC and teams have already been migrated to this new system, which means the path for adding future platforms is cleaner and faster than it has ever been. The platform count will keep climbing, but more importantly, the community can now contribute platform adapters without waiting for core team involvement.

### New Inference Providers & Model Support

**18:14** · Inference providers received the same treatment. Providers are now a pluggable surface through the provider profile abstraction, which means you can drop in a custom provider, a private endpoint, or a self-hosted model backend without modifying the Hermes codebase. for self-hosters running local inference through Alma VLLLM or private API endpoints. This is a meaningful quality of life improvement. Alongside this, four new models were added to the supported list. Deepseek v4 prot 4.3 alpha as a free option through open router and 10-cent HY3 preview.

**18:44** · Open router also gets explicit response caching support in this release which can meaningfully reduce costs on repetitive workloads. The MCP integration received a cluster of important fixes and upgrades. SSE transport is now supported with OOTH forwarding, which opens up a wider range of remote MCP server configurations.

### MCP Integration Upgrades

**19:05** · Stale pipe connections now retry automatically instead of failing silently. Image results from MCP tool calls which were previously being dropped entirely now surface properly as media in the conversation. and long-ived MCP life cycle events get keep alive signals so connections do not time out on extended operations. Two new tools landed in the core tool system that are worth highlighting.

### New Core Tools: Video Analysis & XAI Voices

**19:26** · The video analyze tool gives Hermes native video understanding capabilities through Gemini and compatible multimodal models so you can pass a video file directly into a session and have the agent analyze its content. and XAI custom voices ships as a new TDS provider with voice cloning support which is a notable addition for anyone building voice enabled Hermes workflows. The file writing behavior got a quiet but impactful upgrade. Every time the agent writes or patches a Python, JSON, YAML or TML file, it now runs an inprocess syntax check immediately after.

### Automatic Syntax Checking for Code Files

**19:58** · If the file has a syntax error, the agent knows right away instead of discovering the problem several tool calls later when something downstream tries to import or parse the broken file. It is a small change in terms of implementation, but it meaningfully improves the reliability of any workflow that involves the agent generating or modifying code and configuration files. Cron gain a new operating mode called no agent, which lets cron job skip the language model entirely and just execute a shell script. If the script produces no output, nothing is delivered.

### Cron "No Agent" Mode

**20:28** · If it produces output, it gets sent verbatim to the configured channel. This makes Hermes a viable platform for lightweight watchdog jobs and monitoring scripts that do not need any AI reasoning, just reliable scheduled execution and delivery. Six new optional skills shipped alongside the core release.

### New Optional Skills & Integrations

**20:47** · Shopify integration covers both the admin and storefront GraphQL APIs. A personal shopping assistant skill called shop app landed alongside it. The herenow skill adds location aaware context capabilities. An anthropic financial services bundle was ported in as a set of optional finance skills.

**21:02** · The conbon video orchestrator skill which was already mentioned in the conbon section gives a concrete template for multi- aent creative pipelines and a seir xg search skill rounds out the list pairing with the new native seir xng backend that lets you use a self-hosted search instance as the web search provider for your Hermes installation.

**21:22** · Web tools now support per capability backend selection, so you can use different backends for search versus content extraction versus full browser sessions. The dashboard and CLI both received meaningful attention that does not fit neatly into any single category.

### Dashboard & CLI Improvements

**21:36** · The dashboard now has a dedicated plugins management page where you can enable, disable, and check authentication status for installed plugins. A profiles management page landed as well. Analytics tables are now sortable. A larger default theme with an 18 pixel base size was added for readability. In reverse proxy support was added through the exported prefix header, which makes it easier to run the dashboard behind a reverse proxy in a server deployment without path routing issues. The TUI received a model picker overhaul that now matches the behavior of the Hermes model command and includes inline authentication.

**22:07** · The startup banner sections for skills, system prompt, and MCP are now collapsible, which makes the startup experience significantly cleaner on installations with a lot of active skills. And a status bar now shows a context compression counter, so you always know how many times the session context has been compressed during a long conversation. Finally, seven internationalization local shipped in version 0.13: Chinese, Japanese, German, Spanish, French, Ukrainian, \[music\] and Turkish.

### Internationalization & New Locales

**22:35** · The static gateway and CLI messages translate across all seven and the documentation site gains a full Chinese local for a project with a genuinely global user base. This is overdue and shipping seven local in a single cycle suggests it was a coordinated push rather than incremental additions. Every major open- source project has a moment where the trajectory becomes clear. Not just where is going but what kind of thing it is becoming. For Hermes Agent version 0.13 feels like that moment.

### Conclusion: The Future of Hermes Agent

**23:02** · Not because of any single feature, but because of what the combination of features reveals about the direction of the project. The conbon system turns Hermes into a coordination layer for multiple agents working in parallel. /goal turns a single agent into something that stays purposeful across an entire session.

**23:20** · Checkpoints V2 and autores mean that restarts are no longer a threat to inrogress work. The security wave demonstrates that someone is doing real threat modeling against real attack scenarios. and the provider and platform plug-in systems mean that the community can now extend Hermes in both dimensions without waiting for core team bandwidth.

**23:39** · None of those things happen by accident.

**23:41** · That is a product strategy. The 295 community contributors in a single release cycle is the data point that puts everything else in context. Open source projects with that kind of contributor velocity do not stay niche tools. They become infrastructure. The same way certain databases, message cues, and container runtimes move from interesting projects to foundational components of how software gets built, Hermes is positioning itself as the foundational layer for how AI agent workflows get deployed and coordinated.

**24:09** · Whether it gets there depends on execution, but version 0.13 is the most credible version of that argument the project has made so far. The honest question to ask about where this goes next is around approachability. \[music\] The Conbon system is powerful, but running it well requires real setup discipline. You need to think carefully about how tasks are structured, how worker profiles are configured, how handoffs are defined, and how the orchestrator monitors the overall workflow. That is not a criticism of the implementation. It is just the reality of any coordination system with genuine flexibility.

**24:40** · The next frontier for Hermes is making that complexity accessible without flattening it. Giving users enough abstraction that they can run serious multi-agent workflows without needing to understand every primitive in the system. If version 0.13 built the engine, version 0.14 needs to build the on-ramp. What is clear right now is that the gap between Hermes agent and the commercial agent platforms is narrowing faster than most people in this space are tracking. The features shipping and open source releases like this one were exclusive to well-funded products 18 months ago.

**25:10** · That gap closing is significant not just for Hermes users, but for the entire ecosystem because it raises the floor of what self-hosted open-source agent infrastructure can credibly do. That is worth paying attention to regardless of which tools you end up running. At the start of this video, the problem was simple to state and frustrating to live with. AI agents that quit, drift, forget, and fail \[music\] silently. By now, you've seen exactly how version 0.13 addresses that problem at every layer of the stack. A coordination system that keeps a team of agents honest and on track.

**25:42** · A goal primitive that keeps a single agent focused across an entire session. A persistence layer that survives restarts without dropping your work. A security foundation you can actually trust with real credentials.

**25:55** · And an ecosystem that keeps expanding in every direction at a pace that is genuinely hard to keep up with. The name Tenacity Release is earned. If you're already running Hermes Agent update, if you've been watching from the sidelines and waiting for the project to mature into something production worthy, version 0.13 is a serious argument that the wait is over.

**26:14** · If you're planning to self-host Hermes, especially with a multi-profile combine setup where you're running an orchestrator and multiple worker agents simultaneously, you're going to want a dedicated server rather than running everything on your local machine. Hosting or VPS is what this channel recommends for that. Their KVM2 plan gives you the memory and compute headroom to run a proper multi-agent Hermes deployment without your laptop grinding to a halt. And the pricing is straightforward. The link is in the description below.

### Server Recommendations & Final Thoughts

**26:40** · If this breakdown was useful, the like button helps more people find this channel and it genuinely makes a difference for coverage like this. Subscribe if you want to be here when version 0.14 drops because based on what shipped in this cycle, the next release is going to be worth watching closely. See you in the next one.