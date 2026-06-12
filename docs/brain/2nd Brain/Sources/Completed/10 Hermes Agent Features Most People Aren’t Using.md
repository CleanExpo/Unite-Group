---
title: "10 Hermes Agent Features Most People Aren’t Using"
source: "https://www.youtube.com/watch?v=fLmlXXz5MO4"
author:
  - "[[Sharbel A.]]"
channel: "Sharbel A."
published: 2026-05-08
created: 2026-05-08
description: "Most people install Hermes and use it like a smarter ChatGPT. They connect Telegram, ask a few questions, get answers back, and stop there.But Hermes is much more interesting when you treat it like"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=fLmlXXz5MO4)

Most people install Hermes and use it like a smarter ChatGPT. They connect Telegram, ask a few questions, get answers back, and stop there.  
  
But Hermes is much more interesting when you treat it like agent infrastructure.  
  
In this video, I walk through 10 Hermes Agent features most people are not using, all from inside Telegram. No terminal demo, no fake workflow, just Hermes showing what Hermes can actually do.  
  
What’s covered:  
\- soul.md and persistent personality  
\- session search for recovering old decisions  
\- skills as reusable workflows  
\- Telegram as a real control surface  
\- cron jobs for recurring agent work  
\- subagents for parallel research and execution  
\- profiles for separate agent workspaces  
\- model and provider switching  
\- /btw for side questions  
\- hooks, boot.md, and event automation  
  
The point is simple: Hermes is not just another chatbot. It is an operating layer for agents, memory, workflows, scheduled jobs, messaging, and tools.  
  
If you want the next video, I’ll show the full operator setup: Telegram topics, soul.md, skills, cron jobs, profiles, and how I would structure Hermes from zero today.  
  
Subscribe if you want more practical AI agent workflows, OpenClaw setups, Hermes tutorials, and operator-first automation systems.  
  
Timestamps  
  
0:00 Most people use Hermes wrong  
0:59 Hermes vs Claude Code and normal AI assistants  
1:56 Feature 1: soul.md and personality  
3:22 Feature 2: session search  
5:13 Feature 3: skills as workflows  
7:11 Feature 4: Telegram gateway as a control surface  
9:23 Feature 5: cron jobs  
10:53 Feature 6: subagents  
12:36 Feature 7: profiles  
14:34 Feature 8: model and provider switching  
16:23 Feature 9: /btw side question mode  
18:07 Feature 10: hooks, boot.md, and event automation  
20:33 Why Hermes is agent infrastructure  
21:47 Next video: full operator setup

## Transcript

### Most people use Hermes wrong

**0:00** · Most people install Hermes and use it like a smarter chat GPT. They wire up Telegram, point it at a model, type a request, get a response back, and then close the window. And if that's how you're using it, you're missing most of what Hermes actually can do. So, in this video, I'm going to show you 10 Hermes agent features most people are not using. But I'm setting one rule. I'm not going to open a terminal window and run a bunch of commands.

**0:31** · I'm going to use Hermes from inside Telegram and I'm going to ask Hermes to show me what Hermes can do because that's the actual point. Hermes is not just a terminal chatbot. It's an agent layer that can remember your operating context, search old sessions, load workflows, schedule tasks, run across different platforms, and behave more like infrastructure than a normal chat app. Here's the mistake most people make.

### Hermes vs Claude Code and normal AI assistants

**1:00** · They compare Hermes to Clot Code or Cursor or a normal AI coding assistant. And if that is the comparison, you miss the interesting part. Clot code is great at coding.

**1:15** · Hermes is interesting because it is built around the rest of the operating system for agents. It has memory, skills, sessions, scheduling, messaging platforms, sub aents, profiles, tools.

**1:30** · It's not just a ask model, get answer.

**1:33** · It's more like what if my AI assistant had a persistent workspace, remembered how I work, could run jobs while I sleep, could find old contacts, and could be reached out to through Telegram. That is the version of Hermes most people never get to. So, let's go through the 10 features I think actually matter. Feature one is soul.md and personality. Her mess can have a persistent operating style, not just a one-off system prompt.

### Feature 1: soul.md and personality

**2:04** · So, for this one, I asked it, explain soul.md and/personality in her mess. And here's what it told me.

**2:14** · Most people don't actually want a chatbot. They want their assistant with a stable operating system. If you keep retyping the same prompt over and over, one forgotten instruction and the model drifts back into default chatbot mode.

**2:29** · Soul and personality are Hermes her mess's answer to a very real problem.

**2:35** · That is the file that defines who the agent is, how it should behave, what tone it should use, and what rules it should follow. And Hermes also has personality controls. So you can switch or shape the assistant's behavior depending on the session. The reason this matters is very simple. A serious assistant should not need the same role primer every single time. If you know you want the agent to think, speak, refuse, prioritize, and help, write it once.

**3:06** · Then stop wasting your first prompt on the identity setup of a prompt. This is the difference between a generic model and an assistant that actually has an operating style. Feature two is session search. Hermes can search past conversations when you say, "We talked about this before." Here's what I told it. Search our past sessions for the Hermes agent features article or Vid IQ research. Summarize what we learned, what performed well, and how it should shape this YouTube video.

### Feature 2: session search

**3:38** · And just like that, here's our past session. Here's what they say and how I'd use it for this Hermes agent video. and it went ahead and summarized it with key point one, two, three, the list goes on and on and on and then he goes into his analysis and his suggestions. This is the feature that saves you from repeating yourself. Every serious operator has this problem. You discussed something last week. You made a decision. You found the right workflow.

**4:11** · Then a week later, you need it again, but now it's buried in some random chat thread. Hermes has session search. It can search previous sessions, summarize what happened, and bring the relevant context back into the current conversation.

**4:27** · That is exactly what happened for this video. I posted an article yesterday called 15 Hermes agent features. you've never touched. It did well on X. So instead of me manually explaining that to Hermes again, I can ask it to search the prior context and use that to shape our script. This is where Hermes starts feeling less like a chatbot and more like an employee, a collaborator because it can recover the actual trail of decisions that we make together.

**4:57** · This does not mean Hermes magically knows every detail from every old conversation. \[snorts\] It means it can search stored sessions and summarize the relevant parts. That distinction matters. We move on to feature three, skills as workflows. Hermes can load reusable workflows as skills instead of making you rewrite complex prompts every single time. So for this, I told it, show me the skills you have available.

### Feature 3: skills as workflows

**5:28** · And here they all are the main categories and some of the skills that it pulled up. Things like Nova YouTube agent, which is my YouTube agent, the one I've covered in a previous video of mine. Sage X, my ex agent. I've also covered this. And by the way, both of these are open sourced. I've open sourced them. You can find them on my previous videos if those are things you're interested in. Skills are probably the biggest unlock in Hermes.

**5:56** · Uh skill is basically a reusable playbook. Instead of telling your agent the same process every single time, you turn that process into a skill. For example, I have skills for YouTube research, x trend scouting, poly market workflows, code review, debugging, GitHub, and a lot more.

**6:15** · So instead of saying please act like a YouTube strategist, check my channel context, use Vid IQ, avoid rejected ideas, yada yada yada, I can just load the Nova YouTube skill. That skill already knows the workflow. That is how you turn Hermes from a general assistant into your actual operating system. Most people use prompts. Serious users build skills. And the important part is not just that Hermes ships with skills.

**6:46** · The important part is that it literally helps you create its own skills. If you do something more than twice, it will most likely generate a skill for you itself. This is how a Hermes agent gets better at its actual work, not just generally better at just answering questions. And feature number four, Telegram gateway as a control surface.

### Feature 4: Telegram gateway as a control surface

**7:14** · Hermes can run from Telegram with access to real tools, not just a chatbot. I asked it, explain what makes Hermes and Telegram different from a normal Telegram chatbot. Focus on tools, memory, files, scheduled jobs, and workflows. And here's what it says.

**7:32** · Number one, tools, not just replies.

**7:34** · Two, it has persistent memory. Three, it has a file system access. Four, it can schedule jobs from Telegram. Five, workflows and skills. Six, cross session continuity. It just went on and on and on. And seven, Telegram is only one gateway where you can run every single thing on it, but you can also run it across different uh platforms if you wish for some reason, which I wouldn't really recommend. But this is the one most people misunderstand.

**8:04** · The important part is not that Hermes can reply in Telegram. Any chatbot can reply in Telegram. The important part is that the Telegram version of Hermes still has the agent behind it. It can use tools. It can access memory. Can search sessions.

**8:24** · It can read files. I mean, it can manage scheduled jobs, load up skills, help build me a script, check local context, and summarize some of the prior decisions without me leaving that Telegram chat. That makes Telegram a control surface, not just a chat app.

**8:42** · For me, this matters because I do not always want to sit at a computer to operate an agent. Sometimes I'm outside on a walk. Sometimes I'm in the gym. I want to send a voice note. Sometimes I want to drop a thought on a topic.

**8:57** · Sometimes I want an agent to send me opportunities while I'm outside of my house. Hermes, living in Telegram makes that possible. Something I really like about Telegram is also your ability to generate topics, to create Telegram topics, which I've also covered if you're interested in that video.

**9:15** · Telegram is not the magic part. Hermes is the magic part. Telegram is just the interface. We move on to feature five, cron jobs. Hermes can do recurring work without you manually prompting it. So, I asked it, "Show me my active scheduled jobs." And here you go.

### Feature 5: cron jobs

**9:31** · It listed both of my currently active crons which are number one my daily AI brief and number two my Sage X daily opportunity ping where it runs Sage X to scout fresh X reaction opportunities for me using the Sage X skill that we've built together.

**9:53** · This is where Hermes stops being reactive. A normal chatbot waits for you to ask a question. Hermes can run scheduled jobs every morning, every hour, every Friday, whatever you want and the output can go back to Telegram or another delivery surface.

**10:10** · This is how you build the actual automation, not just write me a summary, more like every morning check the top AI news, find the ones relevant to my content strategy, and send me the best opportunities. or every day scan for reaction opportunities and send them to a specific Telegram topic. That is a completely different category of agent.

**10:37** · It does not wait for you to remember. It runs the workflow. If you're an operator, cron jobs are where Hermes starts making money or saving time while you're not watching. And now on to feature number six, sub agents. One of my favorite. Hermes can delegate work to isolated agents and only bring back the final summary. I ask that you use sub agent to help with this very video that we're filming.

### Feature 6: subagents

**11:05** · One sub agent should verify Hermes feature accuracy from local docs. One should inspect Nova's memory and voice examples. And one should summarize the X article angle.

**11:17** · Return only the final combined summary.

**11:20** · and it literally delegated tasks and it gave me everything when it was done. A little too much information for my liking. Sub agents are how Hermes avoids turning one conversation into a giant pile of context. Instead of one agent doing everything sequentially, having to wait for itself to finish a job and then doing another one and another one and another one. If it can perform all those different tasks simultaneously, it will spawn focused sub agents.

**11:52** · Each sub aent gets its own context and tool access.

**11:58** · One can research docs for example. One can inspect local memory. Then only the final summary comes back. This matters because real work is rarely one clean task. The key is that sub agents don't automatically know everything in the parent conversation. You have to pass them the context they need. Or rather, Hermes has to pass them the context they need. That is why this prompt is specific. I'm telling Hermes exactly what to give each uh sub agent.

**12:29** · Most people think the agent has to do everything in one thread. It doesn't.

### Feature 7: profiles

**12:36** · That's the whole point. Feature number seven, profiles. Hermes can run multiple isolated agent identities with separate configurations, memories, sessions, skills, and entire different cron jobs as well. Here I asked it explain Hermes profiles for an operator running multiple agents. And it said Hermes profiles are basically separate workspaces for separate agents.

**13:03** · Think for example, you have multiple consistent agents. Each one of them can have a separate profile, a separate identity, memories, context, cron jobs that they have scheduled for each and every single one. So I could end up talking to my main Hermes agent which is called Hermy and he can sound completely different because he has a different identity from someone like my YouTube agent for example.

**13:31** · So you can end up having essentially one agent for personal work, one for coding, one for research, one for content, one for operations, which happens to be my setup. That is useful because not every agent should know the same exact things.

**13:49** · Your coding agent doesn't need to know your content calendar. Your content agent doesn't need to know your production credentials. That's probably a good idea so that you know he doesn't end up tweeting them. Your research agent doesn't need your family's context and your lifelong childhood story. Ask me how I know that profiles separate Hermes state. They are not a file safe security sandbox.

**14:15** · So don't confuse separate profiles with this agent is technically blocked from seeing everything. But as an operating model, profiles are huge. This is how you go from one messy assistant to an actual team of agents. Let's move on to feature number eight, model and provider switching. Hermes is provider agnostic.

### Feature 8: model and provider switching

**14:40** · So the agent is not locked to one single model provider. Here it said Hermes separates two things that most AI apps bundle together. It separates the agent system from the model/provider used to think. In plain English, ChachiPT uses OpenAI. Claude uses Anthropic. Hermes is different. Hermes can talk to many providers at once. By the way, you could have open router, Anthropic, Open AI, new Google Gemini.

**15:12** · You can have all different model providers, AI models incorporated inside one Hermes agent. This is one of the reasons I think Hermes is strategically interesting. It's not just built around one model. You can use any uh model. You can use local models or other providers depending on your setup. That means the agent layer and the model layer are completely separate.

**15:38** · If one model is better for coding, you can use that, which is what I do is if another is cheaper for research and better for research, you can use that. So on and so forth. So you can choose different models for different tasks, which is what I recommend if you want to go all out and have the best output that anyone can imagine. Because in real workflows, the model is not the whole system. The model is just the brain you plug into the system.

**16:10** · Hermes is that layer around it. Obviously, this depends on what providers you actually have configured.

**16:17** · Hermes supports the routing. It doesn't magically give you every model for free.

### Feature 9: /btw side question mode

**16:23** · Moving on to feature number nine, and one of my personal favorites, slash btw.

**16:30** · Slash. By the way, Hermes has a side question mode so you can ask something without derailing the main task. And I happen to use this a lot because as you can imagine, I give it big tasks to handle and then in between I sort of want to ask it something quick without it stopping what it's doing, which is where you can use /btw command in Hermes. And there you go. It just said it. Use this command when you want to ask something adjacent without derailing the main agent run.

**17:00** · It's a short side thread for a quick question, but it does not interrupt or contaminate the main task context. And yet, I know this one is small, but it is exactly the kind of feature people miss. You're deep inside a workflow. The agent has context. Maybe it's writing a script. Maybe it's debugging something. and then you happen to have a side question. Most people do one of two bad things.

**17:26** · They either interrupt the current task or they open a brand new chat and lose all the useful context that it happens to have. The slash by the way command is designed for that little side question. Exactly. It lets you ask something without polluting or derailing the main thread. For operators, that matters because real work is messy. You're constantly thinking of side questions, but not every side question deserves to redirect the whole entire agent.

**17:56** · This is the agent equivalent of saying quick question, but don't stop what you're doing. All right. And the last feature, feature number 10, hooks, boot.md, and event automation. Hermes can run custom automations at life cycle events, including startup workflows.

### Feature 10: hooks, boot.md, and event automation

**18:20** · Let me show you what I mean because I just said a bunch of technical jargon.

**18:25** · Explain Hermes hooks and boot.md with one concrete example. Hermes hooks are exactly this. When X happens, run Y. So you can create trigger events. In plain English, they're little automation triggers around the Hermes gateway life cycle. So say for example an operator uses Hermes for telegram operations and has scheduled jobs for daily AI uh news briefs.

**18:52** · Every time the gateway restarts Hermes automatically does a health check. Did the gateway come back cleanly? Did any jobs fail overnight?

**19:02** · And you could also use hooks to trigger automations based on events. for example, um research x trending news and if you see one of those trending news happen to be something I'm interested in or you know I'm interested in then trigger this automation which is briefing me on this. I hope this makes sense. I'm starting to speak and say a lot of technical words. So do let me know if that makes sense.

**19:31** · This is the feature that makes Hermes feel less like an app and more like infrastructure because Hermes has hooks. That means custom code can run at certain life cycle points. And Hermes also has boot.md pattern. If you create a startup checklist, Hermes can run it when the gateway starts. That could be check whether cron drops failed overnight.

**19:57** · Check gateway logs for error. Summarize anything that could need my attention.

**20:02** · Otherwise, stay silent. That is a very different kind of assistant. It's not waiting for you to ask is everything okay? It can check the system when it starts and tell you if something needs attention. This is not a no code Zapier clone. Hooks are custom automations, but that's why they're powerful. You can wire Hermes into the life cycle of the agent itself. Most people think of agents as chat. Hooks are when agents start becoming infrastructure.

### Why Hermes is agent infrastructure

**20:33** · So these are the 10 features I think most people miss. Not because they're hidden, because most people never move past the first layer. They install Hermes, they connect Telegram, they ask it questions, and then they stop there.

**20:50** · But the real system is much bigger.

**20:53** · Soul.md means the agent has persistent operating style. Session search means it can recover old decisions. Skills mean your workflows become reusable. Telegram means your phone becomes the control surface. Crons mean it can work while you're gone, while you're offline. Sub aents mean it can split complicated work. Profiles mean you can run different agents for different jobs.

**21:22** · Model switching means you're not locked into one single provider. The slash by the way command means side questions do not derail the main workflow. And hooks mean Hermes can respond to life cycle events like real infrastructure. And that's the point. The tool was not underdelivering.

**21:41** · Most people just never gave it the operating system it was waiting for.

### Next video: full operator setup

**21:47** · If you want the next video, I'll do the full operator setup, not the basic installation because I already have that video up on my channel, but the actual setup, Telegram topics, soul.mnd, skills, cron jobs, profiles, and how I would structure Hermes if I was building it from zero today. And subscribe if you would like more videos like this. I have a ton more on my channel. Feel free to go check them out and I'll see you in the next