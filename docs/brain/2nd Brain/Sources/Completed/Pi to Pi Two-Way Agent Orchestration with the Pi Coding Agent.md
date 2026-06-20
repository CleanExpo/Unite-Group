---
title: "Pi to Pi: Two-Way Agent Orchestration with the Pi Coding Agent"
source: "https://www.youtube.com/watch?v=PIdETjcXNIk"
author:
  - "[[IndyDevDan]]"
published: 2026-05-18
created: 2026-05-19
description: "Subagents are the LOCAL MAXIMUM of multi-agent orchestration and most engineers are still stuck there. What's better?Agents that work together. Specifically, two pi coding agents that can coordinate"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=PIdETjcXNIk)

Subagents are the LOCAL MAXIMUM of multi-agent orchestration and most engineers are still stuck there. What's better?  
  
Agents that work together. Specifically, two pi coding agents that can coordinate using any model (gpt-5.5, opus 4.7, glm 5.1, etc) at any time to operate as a TEAM.  
  
Flat teams beats hierarchy. The best ideas die in agent hierarchies the same way they die in corporate hierarchies.  
  
This is Pi to Pi: true two-way agent to agent communication on the Pi coding agent.  
  
  
✅ Get the Pi to Pi Extension  
https://github.com/disler/pi-vs-claude-code  
  
💰 VIDEO REFERENCES  
\- Pi Coding Agent: https://pi.dev/  
\- exe.dev: https://exe.dev/  
\- e2b.dev: https://e2b.dev/  
  
🔗 LEARN MORE  
\- Verifier Agent (referenced in video): https://youtu.be/EnXKysJNz\_8  
  
🚀 Master Agentic Coding  
https://agenticengineer.com/tactical-agentic-coding?y=PIdETjcXNIk  
  
In this video, IndyDevDan breaks down a brand new multi-agent orchestration pattern hiding in plain sight. Forget sub-agent delegation. Forget message queues. Forget the one-agent-to-rule-them-all orchestrator. We are going FLAT with peer to peer agents that ping each other, prompt each other, and await responses across devices over a simple Unix socket and BUN server. This is the A2A protocol you actually want.  
  
What is better than one GPT-5.5 Pi coding agent? Two. What is better than two isolated GPT-5.5 agents? Two GPT-5.5 agents that actually work together. We push this to three, four, five agents all running as equals, all coworkers, all ping-able. Real multi-agent systems. Real agent to agent communication. Zero hierarchy.  
  
We run two live demos that prove the pattern. First, a Prod and Dev multi-agent orchestration scenario where a production Pi coding agent on a Mac Mini coordinates with a dev agent on an M5 MacBook Pro to reproduce a Pro Tier user lockout bug, all while keeping PII safe. Real engineering work, not vibe coding. Then we spin up an E2B agent and an exe.dev agent and have them communicate to build a brand new agent sandbox skill with full feature parity. This is harness engineering, context engineering, and prompt engineering coming together in one workflow.  
  
KEY IDEAS  
\- Pi coding agent: The agent harness that lets you actually own the experience. The real claude code alternative.  
\- Agent to agent communication: Bidirectional flows of information beat top-down delegation every time.  
\- Peer to peer agents: Flat hierarchies. No orchestrator. No worker. Just equals on the network.  
\- Multi-agent orchestration: Cross device coordination using a lightweight Unix socket and BUN server.  
\- A2A protocol: Four simple tools. List agents, send command, send prompt, await response.  
\- Context engineering: A focused agent is a performant agent. Split your context window across specialized agents.  
\- Harness engineering: The tool you use limits what you believe is possible. Own your agent harness.  
\- Pi extension: Two extensions shipping in the pi-vs-claude-code repo, comms and comms net.  
  
The state space of agentic engineering is vast. Only one percent of what is possible has been discovered. If you are stuck using Claude Code, Codex, Gemini CLI, or OpenCode as your only agent, you are getting one percent of the value. The Pi coding agent unlocks the other 99.  
  
This is week after week of the same mission on the channel. Increase trust. Increase scale. Build agentic systems that do serious engineering work on your behalf. Not vibe coding. Real agentic engineering.  
  
Drop a like if you want the agent sandbox exe.dev skill and the E2B skill added to the repo. Comment below.  
  
Stay focused and keep building.  
\- IndyDevDan  
  
📖 Chapters  
00:00 Pi to Pi Agent Communication  
01:18 Prod and Dev Multi-Agent Orchestration  
04:56 Why Agent to Agent Communication Matters  
12:33 e2b vs exe.dev Skills  
21:39 Pi to Pi Tools and Codebase Breakdown  
27:42 Pros and Cons of Pi to Pi Agent Communication  
  
#agenticcoding #picodingagent #agenticengineering

## Transcript

### Pi to Pi Agent Communication

**0:00** · What's up engineers? Indydev Dan here. I have a simple question for you. What's better than one GPT 5.5 PI coding agent?

**0:10** · You guessed it, two GPT 5.5 PI coding agents. Let's push it further. What's better than two isolated sidebyside GPT 5.5 agents? Sure, you could add another agent. Sure, you could change the model, but we can do much better than this.

**0:25** · What about two GPT 5.5 agents that actually work together? What about three agents that work together with unique models? What about four models? So, here we have four PI coding agents and none of them is the orchestrator. Instead, they're equals. They're co-workers. Ping every agent. In this video, we'll understand what type of agentic engineering we can achieve if we gave our agents a true two-way communication channel.

**0:57** · By the end of this video, you'll have a simple yet powerful way to coordinate your multi- aent systems.

**1:05** · This gives us a powerful flat agent hierarchy where the best information wins, where the best ideas win, and where your agents can truly coordinate together to outperform each other alone.

**1:17** · Let's talk about pietoie, two-way agent communication.

### Prod and Dev Multi-Agent Orchestration

**1:27** · So, let's go ahead and reset here. Let's dehype this a little bit. Let's close our agents. As you can see, one by one as we close them, they leave the chat room. They leave the communication pool.

**1:38** · We've got a production database on my Mac Mini. And this production database has an issue. Some Protier users are getting locked out of Pro features. So, in order to fix this issue, I need to reproduce it on my local developer environment. This is a common engineering workflow. You don't fix things in production. You fix things on your developer environment and then you deploy through staging and then eventually it hits production. The trick here is there is sensitive information on my Mac Mini production environment here and I can't leak any PII while I'm fixing this issue.

**2:10** · We're not vibe coding here. We're doing real engineering work in production systems. Our PITPI agentto agent communication system is perfect for this. So I'll boot up two agents here. One on my Mac Mini, the production server, and one on my M5 MacBook Pro, my dev machine. We'll do JCOMs 2. And we'll give this a name. This is going to be production. Jcoms one name dev. We'll run some basic pings to make sure both agents are up and online. And then we're going to paste in a production prompt here. This is a prod gatekeeper agent.

**2:40** · It has a production database that's working with that's been seated. We're not going to recreate it or anything.

**2:45** · And you have a teammate. And then key piece here, we have PII inside of this production codebase that we're not going to break. This is personal identifiable information. So a production agent understands the system. It understands what's available and it knows that it's not going to expose any information to any other agent on the network. Okay.

**3:06** · And now our developer agent is going to get to work. We need to reproduce this issue locally. Here's our developer prompt. The key here is this. Bring the affected slice from production over with PII stripped into your local Dev DB so an engineer can reproduce the issue locally. First, in order to reproduce a production database issue, you need the production data. Here's where the magic happens. Our agent sees the pier on the network, right? It knows that it has connection to a prod agent. And now it's going to start working through things.

**3:36** · So, it's going to send a message. It's going to send a prompt. And it's going to get returned an ID, a message ID. Our agent can now await this message. And our production agent, as you can see here, is getting to work on the production side, but it's getting to work with all redactions applied, right?

**3:52** · It's not going to expose any personal identifiable information. Our agents are going to work back and forth here, not as individual agents, not as a sub agent, not as workers, right? They're going to work together as a team. It's a simple, beautiful pattern and it really reflects how great work is done. And so our agent is learning about the local DB. It's making sure that it's clean and is starting to sync things while keeping everything PII safe. Right?

**4:18** · So this is yet another place where if you engineer things properly, if you prompt things properly, you can do extraordinary things in your agentic systems. There are endless use cases for agents that actually communicate and work together.

**4:35** · You can see there we got another message back and this process is going to continue. So we're going to let our agents cook here. I want to take the time to like highlight why agentto agent communication is so important and highlight of course once again why the pie coding agent is really the only way that you get this level of control out of your agents here

### Why Agent to Agent Communication Matters

**4:59** · I think the most important thing to start with here is understanding the current problem right agents can't talk to each other we know that there is sub aent delegation and sub aent prompting right and this is a great pattern it's a great start like if you agree with this statement we are just scratching the surface of what the true developer experience looks like for a gentic engineering right we don't really even know what that form factor is I think very clearly internal agents is going to

**5:28** · be the kind of focal point the center point but everything around that from the agent harness to how we manage contacts models agent scale tools this is all a work in progress so if we're not exploring the state space of what's possible with our agent communication and other agentic workflows and patterns. Uh we're going to be stuck in the normal distribution the very beginning of what's possible. So sub agents very important very cool but this is just the beginning right when you push further you can find a message queue and this is what the cloud code agent teams uses.

**5:58** · So you have one agent that kind of sets up all the message queue and then it serves as a message broker between agents. Another great powerful pattern, you then have things like agent chains where you have a deterministic setup workflow that have individual nodes of agents. When you combine this with code, you get powerful AI developer workflows or blueprints or representations of agents plus code.

**6:21** · This is a very very powerful framework because it adds determinism into the process. Right? At any one of these steps, you can insert code and it'll enhance what your agents can do. So very powerful stuff here, right? But um there's a problem with this. As you can see in every one of these workflows, it is traveling information in basically one direction and it's always a top- down way. Even if the information comes back, it's a one-way stream, right? It's never birectional. So, what's the solution? It's quite simple. Let your agents talk to each other, right? Prompt response and then prompt response. Okay?

**6:55** · Peer-to-peer, not orchestrator to worker, changes things here. Agents are equals. They're not parent and child.

**7:03** · And this unlocks, of course, birectional flows of information, okay? Just two agents communicating to each other. As you can see here, our agents are still working together to figure out these issues to really work through how to perfectly reproduce the production slice. But you can push this across devices and across multiple agents, right? And this looks like exactly what you would imagine. Right? Now we have three agents in the network. You might have a researcher, coder, planner. These can be anything under the sun.

**7:30** · In our case, we have a prod agent and we have a developer agent talking to each other across the network. Okay? But you can just keep scaling this up, right? And at some point, it's going to be uh harmful, right? Like there is a limit to how useful this is. Um I'm not just trying to sell you the upside here. There's downsides to every approach. Great engineering is all about managing trade-offs. At some level, you're not going to want to use this pattern anymore. And at some level, adding agents doesn't help anything.

**7:57** · But there is certainly a useful level to this where you want that bidirectional agent-to- a communication where it's very very useful to have every agent have access to every other agent. Okay?

**8:11** · And so why is this useful, right? Let's let's really hit on this. Like I think at the core of this, it comes down to information hierarchies. If you have a traditional software engineering job, you work at a company that has a hierarchy, right? For one reason or another, there is someone at the top.

**8:27** · Okay? And information usually travels downstream, commands travel downstream, objectives travel downstream, and then it hits the person, usually the engineers who are actually building the thing, right? And often times the best information, the best decisions, the best awareness about the system is all the way down here, right? It's on the worker level, right? It's it's you and I, the engineers with their boots on the ground every single day putting in the work to understand the system, understand the objectives, and then actually building it, right?

**8:53** · The best information is often times down here when you have these hierarchical information systems. And I'm speaking in a generic way. It doesn't just need to be about the job. It doesn't just need to be in a career setting, but just information structures like this. Oftent times the best ideas are down here. They get stuck down here because they don't have the right title. They don't have the right authority. They don't have the right say. Right? And you've, you know, you've probably heard this, right?

**9:18** · The best companies, the best structures are flat, where there's communication happening on every single level where everyone can just talk to the other to get the job done, right? Nvidia is really famous for this very flat reporting structures. Of course, Jensen at the top commanding that insane company, but then he has very few direct reports and then it spans from there, right? But startups are famous for this, right? You have very very flat structures. All the best information systems are flat. Why is that?

**9:46** · It's because you get valuable information wins always over titles and politics.

**9:54** · Okay? Ideas die in hierarchies. So that's why this is so important. And and you know maybe you think I'm anthropomorphizing this too much. Maybe you think I am trying to apply something where it doesn't belong. I completely disagree. I think when you really boil things down everything is a system. And a key part about every system is that there is flows of information inside of systems and how things flow. How the structures, the nodes, and the actors in the system communicate information matters, right?

**10:22** · This matters because often times the best ideas are down here. They're at the bottom level. And so this means that as much as you can, you want to have flat hierarchy structures. Okay. But on a functional level, we can see that this is uh useful for other reasons as well. We have crossdevice agent to agent communication, right? We have a production service. Say this is in the EU, right? where everything has to be redacted. Everything has to be perfect and nothing can escape the device, but you still need to fix things, right? We still need to do real engineering work.

**10:55** · So, this is a great system. We have redacted information properly, transferred it to our developer machine, and as you can see here, the repro is ready. The bug has been imported. Okay, PII is clean. Okay, so legitimate engineering work happening here.

**11:09** · Obviously, this is not a real production server. I'm using this as an example.

**11:13** · And now I can go ahead debug, look at my code, look at this slice of the production database that has been reproduced from production. And now we can actually resolve the bug. And our agents are really great at communicating information like this. And that's exactly what they've done. Okay. So we have very simple two-way birectional agent agent communication. If I needed to, I could come in here and validate that everything looks good on the production agent side. Right? Do one final check with the dev agent.

**11:39** · PII safe. the issue has been reprodu and they can then communicate together to get the job done. So I hope you can see the value proposition of this. I hope you can see why age communication is useful even if you don't think that the flat information hierarchies are more performant for making sure that the best ideas are the ones that always win.

**12:02** · This is great because now we have simple uh multi- aent communication on different devices. Okay. And whenever we need to, you know, let be super clear about this, whenever we need to, I can add an agent to the pool. So if I type Jcoms, let's use four. I think that's the GLM agent. You can see GLM added here and now it is part of the pool, right? So fantastic. How else can we use this age to agent communication? This seems very powerful. We're not just delegating work, which is in its own right a very powerful communication pattern, right? This isn't a replacement. This is another option for your agentic engineering. We can solve other problems with it. Right?

### e2b vs exe.dev Skills

**12:33** · Let's walk through another example.

**12:41** · So let's fire up a E2B agent. And in fact, let's open up a new project here.

**12:48** · Sandbox. Same deal. Jcoms 2 and name exe dev agent project sandbox. So we're just getting our agents off this network.

**12:57** · This is a different pool to communicate in. Right? So we still still have our previous set there. And you can actually see that this work here was done. PII is safe. All the findings are there. So, we verified by having our production agent prompt our developer agent. Fantastic.

**13:10** · We got the pass. Everything looks great.

**13:12** · Both context windows are sharp and focused. There's no spillover between issues. This system has completed successfully. So, I've been using the E2B agent sandbox tool for quite some time now. It's been a great tool. It's also expensive and it has some downsides like there's a limit to the total duration that you can have your agents up in a sandbox. You have to pause them to manage that. So, I've been looking at uh exe.dev. dev is a new agent sandbox tool to uh replace or use additionally right next to E2B. And so this is just another agent sandbox tool.

**13:43** · It's got a couple different benefits. I'll link both of these in the description for you. But the idea here is I already have my E2B agent in this sandbox skill.

**13:53** · Right? So I have agent sandboxes and this is my E2B skill where I can just quickly spin up an agent sandbox that my agent can fully own and operate on my behalf. We've talked about agent sandboxes on the channel in the past.

**14:04** · I'll link those in the description for you as well. But what I want to do here is spin up a brand new skill for exe.dev that mirrors and matches and has feature parody to my E2B agent skill. And anything that doesn't match, I want to know about it, right? I want to understand the feature differences, but I want my agent to fail forward. I want the skill to be built so that I can prototype and experiment with it right away. Okay? So, I don't just want a simple research comparison. I want a new skill I can use that has feature parody with my existing skill.

**14:34** · That's exactly what I'm going to prompt here in my E2B agent. I'm going to fire this off.

**14:38** · You're the E2B agent. Your teammate is exe.dev. They will be building this skill against exe.dev's persistent VM platform. Your job is to answer their questions. Okay. So, we have a teammate set up specifically to understand this feature set. It's booting up a sandbox.

**14:55** · It's reminding itself of all the features. And when this completes, I'm going to kick off the exe.dev agent to communicate, work with, and sync up a brand new skill. You know, a lot of the agent agent communication and multi-agent orchestration comes down to expanding your context window in a useful way such that your agents can specialize what they're focused on.

**15:16** · Okay. A lot of engineers do think that you just throw everything at one agent, wait for the models to get better, wait for that 5 million context window, and then all your problems will be solved. I don't agree with this approach at all. I think you should lean on the models. You should expect them to get better. You should plan for that in your products and services. But at the same time, you should be learning how to focus your agents on one problem so that the chance that they cause an issue so that the chance something goes wrong drops down to near zero. And how can you do that?

**15:44** · You can do that by having focused context windows. Okay? And by effectively specializing your agent to focus on one problem and one problem only. spinning up and comparing two different tools with likely very similar APIs is going to get the context window pretty big. You can see here this agent is loading uh refreshing itself on all of the E2B agent skill functionality, right? You can see sandbox remove download dur so on and so forth. We're almost at 10% context already. That's 100K tokens. Okay, if you're using agents on a daily basis, you understand this fact, right?

**16:16** · A focus agent is a performant agent. And the more you add to that context window, the higher the chance something goes wrong is.

**16:25** · Specifically, when you start muddying unrelated context together. Okay, this is the art of context engineering. It's not just getting all the right things.

**16:33** · It's getting just the right things. This agent's booting up. It should be complete pretty soon here. And then we can prompt our exe.dev to create this new skill so that we can boot up brand new sandboxes for exe.dev. and we can really see what this is all about moving forward. It's not just about these two sandbox tools, right? It's about every sandbox tool moving forward and our ability to deploy agents to understand the tools, to understand the technology and then deploy them into valuable use cases on our behalf. So, we can use this system over and over and over.

**17:04** · We can compare the features between every specialized agent. I hope you get the point, right? If that's all making sense, you know, make sure you drop a like. This is like really our bread and butter on the channel. We're scaling our compute to scale our impact. It's all about scaling up what our agents can do and focusing our agents to solve real business problems on our behalf via agentic engineering, not vibe coding.

**17:28** · We're not shooting prompts and not looking. We know what our agents are doing. Okay? And this just stacks up on previous videos we've had on the channel where we're making our agents secure.

**17:38** · We're not letting them crush production assets when they should not be able to.

**17:42** · We're adding security to our batch tool when they need it. Just like in last week's video, we're preventing catastrophic commands from running. And then, you know, we're letting our agents rip on all the tools, all the skills, all the commands that we actually want our agents to execute. Right? As you can see here, a lot of that sandbox tool running. Our agent is understanding what it can do here. And soon it's going to write this uh presentation file for us.

**18:06** · And this is one of the great things and one of the annoying things about GPD 5.5. model really chews up tokens and it just goes and goes and goes to really get you the most comprehensive result possible. Whereas I found that Opus 4.7 will do that as well, but it also will really just focus on the goal, right? I think Opus is more goal oriented and really focuses on accomplishing the goal. If you prompt it wide enough to capture more of that state, more of that scope, it'll certainly capture that as well. Okay, but here we go. We're getting that inventory file that really compresses all the observations.

**18:36** · Now we should be able to kick off our exe.dev agent pretty soon here. There you go.

**18:43** · Nice write up. Look at that detailed write up of all the features, inputs and outputs, the commands, E2B quirks, right? This is great. And this was part of the prompt, right? We wanted at the end a feature inventory. And this is going to allow our exe.dev agent to really map everything out one to one.

**18:59** · And again, like focus context is so important here, right? In tactical agent coding, it's so important. This is an entire tactic. We talk about this for an entire lesson. A focused agent is a performant agent. We have 20% context of the 1 million context window GPT 5.5 focused on just understanding this tool and understanding the skill and this whole sandbox system. Okay, so there we go. Validating its work, making sure that that file exists. And now we're going to boot up our exe.dev agent.

**19:27** · There we go. Perfect. So it's all primed. It's all good to go. Now we're going to fire off this prompt inside of our exe.dev agent. And I actually haven't run this before. So I'm really curious to see how how this executes and how well this mirrors. So you're the exe.dev agent. There is no agent sandbox exe dev skill yet. Your job is to build one. Okay. So there's the purpose and then your reference target is this existing skill here which your teammate understands and is already standing by to answer questions about. You're the driver of this collaboration. E2 will not initiate. You reach out.

**19:55** · So I'm setting this up so that in this specific scenario I want my exe dev agent to be the one driving this. I'm giving it a couple skills, firecrawl, meta skill to really build on this. And then we have our clear deliverable. So I want that new skill, right? And I'm making it super clear here. A new working skill that mirrors the / agent sandboxes against exe.dev primitives. And I also want a feature parody document just like the E2B agent has as well for us. Okay.

**20:22** · And so it's starting to get to work here. Grabbing all the docs. It's going to start building the skill. And this is the Opus 4.7 running in the PI Asian harness. This is going to be some pretty uh fantastic results as this gets to work here. So, right now it's gobbling up all the documentation starting to stack up that proper context. And at some point here, it's going to begin its communicating with our exe dev agent here. So, there it is. We have live access confirmed. SSH exe.dev.

**20:45** · It's now checking out all my VMs. no current VMs set up yet, but my agent is going to go through this process, figure everything out, and it has all the documentation, and it has the feature parity it's trying to get equal to. Okay, so this is a really great way to in general, you know, it doesn't really matter what agent to agent communication system you're using. This is a great way to mirror systems together, right? In the age of agents, we're going to have a 100 different services available to us for agent sandboxing and frankly, you know, for agent harnessing, cloud databases, terso, things like neonb.

**21:16** · And a lot of them are going to be swappable, right?

**21:20** · Composable. And so this is a great pattern. Once you have one skill against one specific service, you can quickly create a feature parody document and then build directly against another service. Agent agent communication is a great way to do that because you get that focus agent context window and then your agent can just quickly communicate when they need to. But let's go ahead and dig a little bit deeper into this system, right? Like how does this system really work? There's four tools here.

### Pi to Pi Tools and Codebase Breakdown

**21:43** · There's basically no magic. It's really simple.

**21:51** · You list all the agents on the network send command where you send the prompt and then optionally you can await a response. Right? Sometimes you send off a Slack message and you're just sending useful information to someone or a confirmation or something and that's it.

**22:06** · But if you need to, you can await the response. You can check in on the message. You can do a block wait or you can do a non-blocking pull. I have two versions of this that's going to be available to you. You can see our agents are starting to uh chat together here.

**22:18** · I'll have two versions of this available to you. Both are going to be available in the Pi versus Cloud Code codebase.

**22:25** · This is a codebase that uh has been live for quite some time and it's where I posted and shared a lot of extensions from simple to complex across multiple different agent harness use cases for the PI agent harness. All right. And so the whole idea here is just to hedge against cloud code, the agentic coding market leader and get control of the agent harness. This codebase builds on that very idea. And I'm going to add these two extensions for you into this codebase. And so you know what are these two extensions? We can just go ahead and crack these open here. Comms version. So this is the non-network version.

**22:57** · This operates on a single device. But then we have a comm's net where we basically boot up a simple simple simple lightweight bun server here that accepts requests over the network and you can imagine we have a simple set that uh let the agent connect get messages list

**23:15** · agents process events so on and so forth here right this is a very simple implementation uh secure it make it more legitimate for your specific use case every piece of code you see now I really think it's really about read and adapt right throw your agents at it and have them transform it for your specific use case and always understand the code. 25% here on our E2B agent. See, it just responded directly here. Okay, looks good. Browser. Okay, spx tool. Nice. So, it looks like exe.dev agent was asking about the browser tool. All three questions cleanly answered. Quick recap.

**23:49** · Templates versus images. Okay, so confirm partial support. Let's see.

**23:54** · Captured artifacts, arbitrary container images. Okay, browser two primary files.

**23:59** · zero E2B import fix drop in portability.

**24:02** · Great snapshot. No E2B equivalent. CP is unique to exec.dev. Okay, so there we go. Here it's writing that feature parody doc. This is looking great. Yeah, nice. Looks like we had a couple chats here to showcase everything. Sent this to EDB. Why now? The parody has their claims is to flag as many E2B claim that's wrong before I bake them into the new skill. Very cool. Okay. Very nice.

**24:24** · So, our agents here are doing the work that I would do myself, which is validate the claims. Right? This is something we talked about in the verifier agent video we did a couple weeks ago where you have an agent basically double-checking all the claims and all the statements that the primary agent is making to make sure that they're right. This is a really powerful pattern. I like to run my PI agents, my primary PI agent with a validator on top of it, which basically, you know, increases the tokens used, but in exchange, it saves me time because the validator is validating everything my agent just said, right?

**24:55** · It makes sure that everything it said is actually true. And then it also makes sure that the work it said it did is exactly what was done. I'll link that in the description as well. There we go.

**25:05** · There's a nice write back to our exe.dev agent. Look like it's asking for a recursive flag there, too. Wow, so much detail here. Like an aside here, this is a great way to just watch these models work together, right? GBT 5.5, Claude 4.7 gave them a decent sized prompt, maybe 80 lines each and a skill, and now they're just like hashing it out, recreating this new skill. And this is again just one of millions and millions of different ways to coordinate agents to work toward a goal, to work toward something, right?

**25:36** · So, okay, so we got 10 corrections from that exchange, right?

**25:40** · This is a valuable exchange of information. 10 corrections. There's a couple comments on my videos recently, especially when I talk about multi-agent orchestration. Some engineers, probably a decent amount of vibe coders as well, asking why can't you just do all this in one agent? Uh, you certainly can. You certainly can, but you have to remember that a couple things. There is a limit to the context window. The more problems, the more different problems, APIs, systems you put into that context window, your error rate will go up.

**26:05** · Okay? This is just a fact. If you don't believe that, you don't understand that, do more research on the context window.

**26:10** · Okay? And then second, with every unique model that you add to your system, right, I'm running Claude right next to GPD 5.5. These models are trained in a completely different way. They have different RL loops running on top of them. Putting these agents together creates something greater. It creates a system that outperforms either of them alone. Just like code plus agent beats either alone, unique agent one plus unique agent two, communicating beats either alone, right?

**26:36** · And and that's like really the gift and really the value proposition of multi-agent orchestration. It's not just the 10 parallel agents you boot up to like write all those files or generate all those images at the same time. It's doing serious engineering work where your agents are checking in on each other, double-checking the work, coordinating on a solution, so on and so forth. Okay, so that's the idea. And so we got one more message coming back here. Hopefully this wraps it up. And yeah, look at this. Like Opus is just being really really great here with the verification.

**27:05** · So please reread the doc and either send review complete or flag remaining issues right so this is just like you know it's team work right this is teamwork okay sign off one non-blocking knit okay and then after this we can proceed with scaffolding so there we go so yeah it's loading that meta skill this is my skill that helps me create skills I'm going to let this cook comment down below if you're interested in my agent sandbox skills the ETB skill or this new exev skill and I'll add to this codebase.

**27:35** · But that's the idea, right? It's it's it's simple yet it's very very important. Okay. Now, you know, quickly just talking about pros and cons of this system. Every system has pros and cons. If you don't address them, you'll be exposed to them.

### Pros and Cons of Pi to Pi Agent Communication

**27:55** · What are the pros here? It's just an agent, right? I just can at any time now boot up two agents, three agents, five agents on my device, my Mac Mini, my M4, right? My cloud VMs, all my services, all my servers. I can just boot up an agent now with the extension, have them connect, have them talk to each other.

**28:13** · It's just an agent. It's that simple. I should say it's just an agent and extension. It's permanent. Okay, there's no, you know, no sub aent delegation, no spin up or spin down, no resume. Claude has this resume flag where you can reboot the agent. These are just agents in the terminal. That's it, right? Uh customizable, right? End to end.

**28:32** · Obviously, this is like a key value prop of why I keep talking about the piecing agent and why I keep bringing it up. The the state space of agentic engineering is unknown. You know, the way I see this is only 1% of it has been discovered and understood and deployed into production.

**28:48** · Right? I I'm talking like really really low numbers here. Customization and extensibility is core to the future of Agentic Engineers. And so this tool becomes more and more important to me every single day. The tool you use limits what you believe is possible. And with the PI agent harness, I see no limits. You know, the the all the limitations of of how things work, they're just falling away. I don't see the same workflows. I don't see the same implementations anymore.

**29:14** · And I think if you're stuck using one agent coding tool, especially one that tells you how to do everything, hint hint cla code, hint hint codeex, hint hint, you know, Gemini CLI if anyone's using that open code, like whatever it is, right? You are not getting, you know, you're not pushing into that 99% the rest of the value that we can unlock with agents with the right agentic technology. Okay, so um that's a big one obviously, right?

**29:37** · Birectional comms are flat. No hierarchy, right? No information loss, no one agent to rule them all, which is a con in another way. Right, we've talked about the one agent to rule them all, the orchestrator. Let's be super clear about this. This is the orchestrator. Um, and this is like the current wave of multi-agent orchestration. This is super powerful.

**29:58** · It's a great pattern. I'm going to continue to use it. But, um, birectional is great cuz it's flat. It's two-way. No information gets lost, right? Um, another great part about this is that, uh, this is a primitive over composition approach, right? Once again, this kind of ties back into that first idea. This is just an agent. It's just a PI coding agent, right? Or just simplify it, right? Let's not hyperfixate on PI, right? This is just an agent. I just open up an agent and then I can compose as many agents as I want to. Okay? So, once again, we're engineering.

**30:27** · Composition is an engineering pattern.

**30:29** · We're creating slices of things we can combine to make something bigger, right?

**30:33** · Primitives into compositions. But you want the primitive first so that you can compose it. That's enough glaze. Uh let's go to cons. Uh you have to build this yourself or get it from any devdan for free. Link in the description.

**30:47** · But you know, you know what I mean, right? You have to build this. You have to vet this. You have to control the way your agents communicate. You need to prompt engineer everything. Context engineer thing everything. And you need to deal with the the cases like the edge cases is where really where great agentic engineering patterns are made and great products in general, right?

**31:04** · Another con here, loops are possible if prompts are sloppy, right? So you can you can really generate some bad loops that that are going to really chew up your token usage if your prompts are sloppy. Right? You need an end state, right? Let's see if our agents have hit their end state yet. Okay, great. So yeah, so we are approaching the end state, right? My agent is making progress. It is creating this agent sandbox exe dev skill. Okay, so that's great. So this prompt obviously was not sloppy. I don't write very a ton of sloppy props anymore, but this is a risk of this strategy, right? And then there's just like general costs, right?

**31:34** · cost scales linearly with agent count plus communication bounce. And so there are a bunch of laws around the perfect number of actors to have in a team, right, inside of your communication channel. That's kind of what this, you know, showcases, right? There's some magical number, Dumbar's number or something. I wouldn't worry about that too much. I would just worry about like what's useful. How can I deploy birectional agents, birectional peer-to-peer agents that's actually useful across devices or on the same device, right? The key here is peerto-peer and just make it as useful as possible.

**32:04** · If you find that three agents, 10 agents, whatever is too much, then just trim them. So, it's not a huge con, but it's important to uh take into account, right? And I think the last con is be careful not to just fall back into the orchestration pattern unless you need it, right? If you need orchestration pattern, just build that.

**32:21** · This is kind of nice though still cuz you can compose peer-to-peer agent communication back into a orchestration pattern. We have more of a top- down format where one agent's leading the rest. That's fine too, right? As I mentioned, you know, we're exploring the state space of what's possible. This is equally as valuable. But peer-to-peer's advantage is that it is flat and there's no hierarchy, right? That's the advantage, right? Your agents are working together. It's not a delegation stream. So, these are some of the pros and the cons of the system. I think it's important to address the upside and the downside, right?

**32:51** · Again, if you're doing engineering, you need to address both of them. So, this is yet another multi- aent orchestration system that you can use to push what you can do with your agents in the age of agents, right? And the goal is the same. We're not really changing, we're not doing anything new here on the channel. What we doing week after week is we're increasing trust and scale of our agentic systems. All right, you can see this final reviews coming in. This is coordinated agents working together, double-checking their work.

**33:17** · And you can see here our tokens are starting to stack up. We have 2 million available, but it's split in half. One is focused on exe.dev, one is focused on E2B, but our agents are still coordinating on the same information.

**33:30** · We're making sure that we're hitting feature parody. We're making sure that everything looks good. Of course, I'm going to run more tests on this and make sure that this looks good, but I can almost guarantee you this is going to work out of the box because I had two agents, two state-of-the-art agents working together to get this shipped out. Enabling specialized agents that chat together on device and across devices is a unique advantage you can add to your agent systems specifically to your agent harness. This pattern and patterns like this more and more of these patterns are going to emerge.

**33:58** · They're impossible if you're using, you know, the uh out of the box agents from Anthropic, from OpenAI, from Google.

**34:04** · It's impossible when you're renting your agent harness. Okay, to be clear, I still use Cloud Code all the time. It's a great tool. I'm going to continue to use it, but more and more I'm reaching for the PI agent harness to build the exact experience and products that I'm looking for, right? And this pattern adds to that bag of tricks that you and I can now deploy in our agent harness.

**34:24** · If you own your agent harness, I'm going to be adding these two extensions to the Pi versus Cloud Code codebase here available to you. Link in the description. I'm really excited for some of the big ideas I have to share with you here on the channel coming up. I'm waiting for that next Gemini model launch to really showcase one of these nextG patterns. So, make sure you like, make sure you subscribe, join the journey so you don't miss that. You know where to find me every single Monday.

**34:47** · Stay focused and keep building.