---
title: "Agentic AI Systems, Clearly Explained"
source: "https://www.youtube.com/watch?v=kwRTUw8pb2c&t=1s"
author:
  - "[[Simon Scrapes]]"
channel: "Simon Scrapes"
published: 2026-05-10
created: 2026-05-11
description: "🚀 Build agentic systems that run your business: https://skool.com/scrapesDon't miss the next build - https://www.youtube.com/@simonscrapes?sub_confirmation=1Agentic AI systems, skills, harnesses,"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=kwRTUw8pb2c)

🚀 Build agentic systems that run your business: https://skool.com/scrapes  
Don't miss the next build - https://www.youtube.com/@simonscrapes?sub\_confirmation=1  
  
Agentic AI systems, skills, harnesses, context engineering... what does it all mean? If you're a non-developer who uses tools like ChatGPT or Claude, this video is for you. We'll demystify all the buzzwords by walking through the four levels of AI automation - from simple chatbots to full agentic systems - so you can finally understand how it all fits together, no code required.  
  
#claudecode #agentic #agenticsystems

## Transcript

**0:00** · I can't hear another word about agents.

**0:02** · This is the next big step forward, a full coding agent. Every single software company in the world needs an agentic system. I mean, agents is it's almost sort of a buzzword, right? Like everybody you talk to now is building agents.

**0:14** · Agentic coding experience can do a complicated coding agentic thing. Codex is another sort of agent app.

**0:19** · What is an agent?

**0:20** · Agentic harness. All right. Most explanations of agentic AI systems are either too technical or too basic. So, this one's meant for people like me. You're not a developer, you use ChatGPT or Claude every single day. You probably opened Claude code or co-work once or twice and weren't quite sure what to do with it. And you want to actually understand how this all fits together without reading a single line of code.

**0:41** · Now, we're going to walk through four levels: chatbots, AI workflows, agentic workflows, and agentic AI systems. So, each one gives the AI more autonomy, more capability, and at each one, the wrapper around the AI gets more sophisticated, too. And all of those intimidating terms you see everywhere, harnessing engineering skills, memory systems, MCPs, they are a lot simpler than you think. And we'll knock them down to plain English as we go along.

**1:07** · So, I'm going to use one example across all four levels so you can feel the difference at each level in the work that you need to do. And that's going to be content repurposing. So, we're going to take a YouTube video and turn it into social posts, newsletters, short-form clips, the whole lot. So, let's see how that looks at each level and where you can get more time back. So, level one is all about chatbots, ChatGPT, Claude, Gemini. This is the one you're probably familiar with, but there's a few things that you need to understand that are key to the higher levels. So, here's what content repurposing looks like at level one. I finish a recording of a YouTube video like this one.

**1:39** · I'll find a transcript. I'm going to open Claude on the web and I say, "Write me a LinkedIn post about this." And Claude's going to come back, it's going to write something. It's fine, it reads like a LinkedIn post with a ton of emojis, but it doesn't sound like me, it doesn't know my audience, it doesn't know that last month my carousels outperformed my text posts, and it definitely doesn't know what I posted last week. So, it might repeat the same angle that I already used. Now, if I wanted it to do better, I'd have to paste in my voice guidelines, my audience notes, my recent post history, and I could do that all manually. But, obviously I'm simplifying a bit.

**2:11** · Claude and GPT have projects, Gemini has gems, and you can actually store static context there. But, ultimately that's what it is. It's static context. So, there's two things you need to remember about chatbots. One, they don't know your business, none of your brand, your audience, the content history of your last few posts.

**2:28** · And two, they're passive. They wait for you to prompt them. They don't go and do anything on their own. So, at level one, the chatbot is there giving you advice, but it's not executing. So, keep that in mind. Now, level two was all the rave in 2025, AI workflows. So, think N8N, Zapier, and make.com. Everyone was talking about this, including me, in 2025. And here's what content repurposing looks like at level two. So, I build out an N8N workflow, and every time I publish a new YouTube video, the workflow is going to fire automatically.

**2:57** · So, step one is going to pull the transcript, step two is going to send that to Claude through the AI node with my voice guidelines hardcoded into the prompt. Step three, Claude is going to come back with a draft LinkedIn post, and step four, the workflow is going to drop it into my scheduling tool, so I can just review the draft. And for somebody that's come from just working with ChatGPT or Claude, this is going to feel like magic. So, you can get it to work on repeat using the same steps every single time. So, I've gone from manually pasting my transcript into a chat window to having a draft appear in my scheduler without lifting a finger.

**3:28** · Here is the limitation, though. The workflow can't think. If my best performing posts this month have been carousels and not text posts, the workflow doesn't know that. It's got my static prompt templates that I put in there three or four months ago. I can, of course, go and update that manually, but it's not automatically adapting. How about if the video topic doesn't even suit LinkedIn at all, and would be better as a Twitter thread? The workflow can't make that judgment call because it's just running through the same steps in the same order regardless. It's not like having an employee who can do the thinking.

**3:58** · And ultimately, if the output's not good enough, I'm going to go back in and rewrite the prompt myself. So, at level two, the AI is doing some of the work, but it's not making decisions. It's just following our exact step-by-step guide. And those are the steps that you've defined for it. Now, the next part is the most important concept in this entire video.

**4:14** · The difference between an AI workflow and an agentic workflow at level three is who decides the execution path. So, at level two, you've defined the steps. At level three, the model does, and you're free to do some of the task while it's actually making those decisions.

**4:29** · But before we move on to that, YouTube tells me that 97% of you watching this video right now haven't subscribed to the channel. So, do me a quick favor and hit the subscribe button below if you've made it this far. So, level three then is agentic workflows. And here's what content repurposing looks like at level three. I open Claude code and say turn this week's video into content for LinkedIn, Twitter, and my newsletter.

**4:52** · And Claude code is going to actually just go and figure it all out. So, it pulls the transcript. It reads my brand voice file. It's going to look at the video topic and decide which moments in that transcript of the video work best for each platform based on different viral trend indicators. It's going to draft a LinkedIn carousel because the topic suits visual storytelling. It might write an X thread because there's a strong contrarian angle and X loves contrarian. It's then going to run all of those through my style guide, through my brand voice, and rewrite ones that don't pass the criteria. Everything is then saved for me to review.

**5:22** · So, I didn't write those steps. The model decided them based on the goal that I gave it. And quite frankly, this is what it would look like if we did this kind of workflow inside NAN. It would have that infinite loop logic, and it would be a mess to maintain. Trust me, I'm talking from experience in building these. And the technical name for this agent loop is actually react.

**5:44** · So, it's reason and act. The model reasons about what to do, acts on it, observes the result, and iterates until it's done. So, finally, we can start getting our time back because the model's not only doing the work, it's also now doing the thinking. Now, the tools at this level are things like Claude Code, OpenAI's Codex, and Cursor.

**6:03** · And what they all have in common is they're what's called a harness. So, a harness is the infrastructure that surrounds the model to make it more reliable, controllable, and deployable for actual business use cases. So, it's what turns thinking into doing. So, without a harness, you've got a chatbot in a browser tab. With a harness, the model can read your files, run commands, call other tools, and check its own work. There are lots of other things that you can add onto a harness, but you can't add them onto a chatbot, and we'll come back to that later. So, Claude Code is actually just a harness. Codex is a harness. Cursor is a harness.

**6:35** · It's different products, but the exact same idea. They wrap around the model and give it the ability to act on your computer, with your files, using your tools. So, at level three, you've got a single agent running in a harness, working toward one goal, and it's powerful. And this is good enough for most people, but it does top out one agent with one goal in one terminal session. It doesn't remember what it learned last week. It doesn't know which of my posts are performing best at the moment.

**7:01** · And if I want it to also extract video clips, build carousels, generate some ad copy maybe, and schedule everything, I'd have to run each task separately and re-explain some of the context every time. So, if level three is one agent on one task, then level four is a coordinated team running your operations. So, this is all about agentic AI systems. And here is what content repurposing looks like at level four. So, I trigger one command by just describing what I want, and the full content engine runs from one YouTube video.

**7:30** · So, there's going to be a skill in the background that extracts the best clips from the video for short-form content and ranks them on different criteria. There's going to be another one that builds platform-specific carousels with the right dimensions, the visual aesthetics that are going to match my brand, and copy for each different platform. Another instance is going to draft the weekly newsletter from key takeaways. Another is going to generate ad copy from the angles that have performed best in the past. And finally, everything's going to come together and be queued into my scheduling tool. So, each skill on its own has its own instructions, its own quality bar, its own output format.

**8:02** · And the system as it goes through is going to load my brand context in at the right time, and only the sections or context references that are actually needed at that point. It's then able to actually go and check its own work, flag anything that needs me, and handle the rest autonomously by itself. So, you can think of this instead of one agent doing one job, you've got a system running entire content operation on your behalf.

**8:24** · So, the jump then from level three to level four is what people are actually calling harness engineering. And the building blocks are simpler than they sound. So, you've got skills, which are just folders of instructions for specific tasks, like how to write a LinkedIn carousel, how to extract short-form clips from a long-form transcript, how to draft a newsletter in my voice. And the agent is going to load the right skill only when it needs it, and the right reference examples only when it needs it, too. So, it's not going to bloat your context or cost you a bunch of tokens. Then we connect up to our tools with MCPs or model context protocol.

**8:56** · So, the scheduling platform, the analytics dashboard, maybe your CRM. MCP is just a standard for plugging things in to our Claude code harness.

**9:05** · We've got one of the most important concepts, memory. So, the system carries context between sessions. So, it knows which post performed best last month. It remembers which newsletter subject lines got the highest open rates. It builds on what it's learned instead of starting from zero every time. And memory can literally be as simple as a markdown file that the system is going to read and update. Or, you can go more complex with a sophisticated database that connects across all your different LLMs and tools. So, almost sounds too good to be true, and you're probably thinking, "So, this thing is just going to run on its own and do all my work. I'm going to need no employees.

**9:35** · Well, no, not exactly. By design, we've got human in the loop. So, set it and forget it is not a design principle that we've got here. The systems that actually work, and I've seen work in the real world, have a human review built in at the right places. So, when you're designing these systems, you have to be deliberate about where you sit in the loop, or where somebody who's engaging with the system is going to get feedback or give feedback in the loop. And usually, that's in either the input stage or the output stage, where we're doing a quality review so that we can make sure it's good before it goes live.

**10:04** · So, in my content system, for example, the AI does all the heavy lifting. It's going to draft, check, and format as per my rules, but nothing's going to get published without me seeing it first. I want to make sure that it meets my human criteria before publishing. I've not yet come across a system that's powerful enough and knows me well enough to get past this human in the loop stage. We can get 95% of the way there with this agentic AI system. So, the tools at this level are not things like code code out of the box anymore.

**10:33** · They're things like the agentic operating system, which is what I'm building inside my own community, and open claw or Hermes. So, it's the open source personal agent that has absolutely skyrocketed this year. Both are taking the exact same approach.

**10:47** · Build a richer system of files on top of the base agent so it can handle actual real complexity and feeding context at the right time with a human in the seat with a bit of control, too. And here's the bit that nobody actually mentions, the bit where you can probably at this point breathe a sigh of relief. It's not as complicated as it sounds. Because underneath all this, it's just files in folders. So, the fancy terminology is pretty much just a front, and what's really happening is we're giving the model access to the right file in the right folder at the right time. That is simply it.

**11:19** · So, skill, for example, is just a markdown file. The brand voice, the quality rules, the memory, all readable and editable directly in your files. So, organizing something like this is actually closer to building a notion workspace out than it is to writing code, which means that this isn't just for developers. And the audience for agentic AI systems is actually business owners, knowledge workers, people who want their operation to actually run on AI without learning to code. So, to wrap up, we've got four levels. Level one is chatbots.

**11:47** · You're going to paste something in, get text back, but it's all advice and no action.

**11:53** · Then we hit AI workflow. So, you're building out a pipeline in an automation tool, and the AI is going to fill in some of the gaps, but it's going to follow the same steps in the same order every time. We want it to be a little bit more autonomous in level three, where we hand it off to an agentic workflow. So, you're basically giving it a goal, and the agent is going to determine the steps with your context.

**12:11** · And that's when we wrap it in a harness, like low-code. But if you really want to achieve production-grade results, things that are going to run 95% without you, then you need to develop agentic AI systems, where you've got multiple skills, a shared memory, coordinated by the system with you in the loop, exactly where it counts. And we've distilled this to just folders and files on top of something like low-code and Code X. So, if you found this helpful, you might want to learn how to build your own level four agentic AI system. So, we'll show you how we made ours in the next video.