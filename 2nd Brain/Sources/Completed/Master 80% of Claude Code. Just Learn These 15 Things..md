---
title: "Master 80% of Claude Code. Just Learn These 15 Things."
source: "https://www.youtube.com/watch?v=0qqV4yv-Hss"
author:
  - "[[Simon Scrapes]]"
channel: "Simon Scrapes"
published: 2026-04-29
created: 2026-05-08
description: "🚀 Build agentic systems that run your business: https://skool.com/scrapes Don't miss the next build - https://www.youtube.com/@simonscrapes?sub_confirmation=1Ready to master Claude Code? This vide"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=0qqV4yv-Hss)

🚀 Build agentic systems that run your business: https://skool.com/scrapes  
Don't miss the next build - https://www.youtube.com/@simonscrapes?sub\_confirmation=1  
  
Ready to master Claude Code? This video is your fast track to becoming a power user, covering the 15 concepts that make up 80% of real-world use cases. We'll explore the core foundations, master context management, and dive into personalizing your setup with skills and hooks. Finally, we'll level up by looking at how to build a true Agentic Operating System for your business.  
  
00:27 - Claude Code Foundations  
03:55 - Mastering Context Management  
07:11 - CLAUDE.md Done Well  
08:03 - Personalizing Your Setup (Skills, Hooks & More)  
14:04 - The Agentic OS Layer  
  
#claudecode #claudecodetutorial #claudeskills

## Transcript

**0:00** · If you're using claw code at any level, then this video is for you because in the next 20 minutes, I'm going to teach you the 15 things that cover about 80% of how claw code is actually used. So, this is all based on what I see across thousands of real users inside my Aentic Academy doing day-to-day. So, master these and you'll be better than most people at Claw Code. You can think of these as short, focused examples that show you what's possible and point you toward where to go deeper next. So let's jump into it with what claude code actually is.

### Claude Code Foundations

**0:30** · So using chatbt is like asking for advice but claude code on the other hand is not a chatbot in the terminal because it can not only read your files, it can actually write to them too and run commands on your machine. So give it a brief with the right context. You let it work and then you review what it's done. So think about website building, content creation, file sorting, researching, pretty much anything is possible inside code. It takes the actions not only gives you advice.

**0:58** · Now because anything is possible it means claw code is powerful out the box but you need the right framework still on how to use it to get the most out of it. So plan mode is genuinely one of the most underused features in claw code and it comes straight from Boris Churnney's own workflow. So Boris Churnney is the guy who actually built out claw code. So he knows a little bit about claw code it's safe to say. So hit shift tab twice on your keyboard and Claude will flip into plan mode.

**1:24** · And I know we just said we wanted Claude to build stuff for us and plan mode is actually going to do the opposite for us. It's going to switch it into a readonly mode, but what it's actually doing in the background is creating a refined set of specific contexts so that we can actually improve our outputs later on. So when we get it to plan, it's going to actually go through and ask us a bunch of different questions and create as it sounds a plan that we can approve or actually make changes to.

**1:51** · And the reason this matters so much is that it forces Claude to break the work down before you touch a single file or before it touches a single file. So it's all about context.

**2:01** · And you'll hear me say that again and again in this video. So a clean plan written to a file lets Claw Code just load that relevant chunk of the context and the information instead of trying to get Cloud Code just hold everything in its knowledge base in its head at once.

**2:18** · The same way in which we as humans actually plan out tasks, we obviously break them down into subsets of context so that we can then go back to that, revisit it, and build out from that plan. So, the order of working should be always plan first and then execute the build second. And I'd literally always do this if it's more than just a simple 10-minute task. So then when you actually do get to the building stage, a lot of people just tell you to start on the dangerously skip permissions flag, which is just going to go through and auto approve everything. Even as it sounds, file deletion is auto approved.

**2:51** · So when you start with claw code, I would advise you to start more cautiously. Try to understand what it's asking for approval for as you go through and then you can start setting up your own permissions file later on in the settings.json file. But here's the real timesaver. install a notification extension like CC- notify and it's going to ping you the second Claude needs approval or finishes a task that honestly that one's going to speed up your workflow massively. So it means you can literally set a task off, go away from the terminal, do other stuff and come back only when Claude actually needs your inputs.

**3:22** · It even works if you're running five or so tasks at once.

**3:27** · You will get the notifications from each session window. So you're basically letting Claude run for longer stretches without stopping for every little thing.

**3:34** · And by the time you're watching this video, there might even be more autonomous modes available inside claw code surrounding permissions because anthropic keeps on shipping more and more updates in this space. So now you've got the foundations. This next section is all about achieving the highest quality output which can't be done without understanding and managing your context effectively. So the context window is just the amount of text that Claude can hold in its head at once per LLM model.

### Mastering Context Management

**4:01** · So Opus 4.6 Six has a different context window to Sonnet, for example. And the context window generally are actually getting bigger and bigger. They've become huge.

**4:11** · Hundreds of thousands of tokens, even in some cases 1 million tokens inside the context, which sounds like loads, right?

**4:18** · But compare it to what you're actually typing. So, if you're just asking a back and forth question, it might be about a paragraph, and then you go back and forth a few more times, and you start adding to the context. So, suddenly your context window is growing. And now you think about loading in code, files, documents, transcripts from videos, brand guides, client briefs. Suddenly you start piling in thousands of lines really, really quickly. And the window then is going to start to fill up much quicker than you think. And each line then is costing us in our usage limits and the effectiveness of how Claude responds. And that's context rot.

**4:49** · So context rot is a real problem. The more tokens that you're going to load into Claude or any LLM, the more forgetful it gets. So even though the models do keep getting better, this rule still holds.

**5:02** · So this is a graph of the different models with the number of tokens loaded in. You can see as the number of tokens increases, the rate of recall drops significantly to the point where most models when you're loading in 7,500 words or roughly equivalent to 10,000 tokens, you've lost 50% of the context.

**5:22** · So what can you actually do about this?

**5:23** · Well, there's kind of three things at first, all built into cloud code. First, you can use plan mode. So, we've spoken about this already. It basically is going to keep the important context for your plan safe so that we can recall it at the right time. Next, you can use the /clear command between unrelated tasks in the same conversation window. So, every single time you start a new conversation, you want fresh context, fresh output, just run that /cle command.

**5:48** · And if you want to just consolidate the information after a long conversation, a long session, and you've not switched conversation topics, then you can use the inbuilt slashcompact, and it's basically going to summarize everything so far. So, Claude keeps the important stuff, and it's going to get rid of all the noise in that conversation. And you can even tell it which specific context to keep. Now, those three aren't perfect. You still have some of the same issues, but you can get much better context management through external memory systems, which is something we'll cover later.

**6:16** · But it's also important to know as the next concept that Claude also saves the context from the session. So every conversation you have is being stored in the memory of Claude sessions. And the resume flag is all about restoring context. So you can run claude resume, pick the conversation you were literally on yesterday, and then you're right back in that conversation. Claude's going to remember exactly what you were building, what you told it, and also what activities are still left, especially if you have a plan that coincides with that. And this is all about speeding up your workflow, right? You don't need to reexplain again and again everything.

**6:48** · And the reason I'm including this is because context management is the single most important thing in claw code. You will see this online. Look at any YouTube video about claw code. We're always talking about context management and how to manage that in various different ways. And resume is how you're going to protect your context across multiple sessions. So now you're probably starting to see a little bit of a pattern. Everything in claw code comes back to context. So claude.md or the main file that's often referenced is loaded at the start of every session as part of claude code system prompt.

### CLAUDE.md Done Well

**7:18** · So whatever you put in the claude.md file, it's always going to be read, which means it has to be concise to not bloat your context. So your claude.md should not be a 20,000line bible of everything you've ever thought about this specific project. It should actually be more like a table of contents that points to other files. So you're going to put in there specific rules and then when you've got additional context or additional information, you can just point to a reference file elsewhere that Claude can load in and unload importantly whenever it actually needs them.

**7:48** · It will effectively load in less than 200 lines and then be able to load additional context exactly when it needs it based on your question. So that's foundations and context sorted. Now let's talk about the four ways you can actually personalize claw code to how you work.

### Personalizing Your Setup (Skills, Hooks & More)

**8:03** · So let's start up with slash commands.

**8:05** · And slash commands are for things that you do again and again and want to manually invoke. So, as they sound, they're kept in a commands folder and invoked using a slash with the shortcuts that you can see down here. So, for extracting YouTube transcripts from content, for example, I've got a /tool-youtube.

**8:22** · I paste in a YouTube URL and it's going to spit out the transcript without me having to write again and again what I'm actually looking for. So, if you find yourself giving the same context regularly, that's a sign to convert that into a slash command. And you can think of the slash command as just a set of prompt information where you can put in dynamic arguments like a YouTube URL for example. So skills are effectively slash commands that you can invoke but with more you can probably guess context. The big difference is they let you load in more context as long as it's separated properly into reference files.

**8:51** · So skills get loaded into context using a progressive disclosure system. So the name and description are always loaded in first and Claude is going to use that to pick the skill out when it thinks that skill is relevant. And the other thing here compared to slash commands is that we don't need to use the slash, but we actually can still invoke it with the slash if we want to. So in this case, I just paste in a YouTube video URL and say transcript and it would know to use the tool-you skill automatically based on the description of the skill.

**9:19** · So once it knows it wants to actually use the scaler, it's going to load in the full skill.md file which should be kept again less than 200 lines to preserve your context window. And you can think of the skill.md as effectively a set of process steps. Step one, step two, step three.

**9:37** · Think of it as an instruction booklet on how to follow that specific task. Now 200 lines sounds quite small, right? But you can again point to additional reference files with additional examples, additional context in a references folder that's kept separately. So for example, for our YouTube skill, it might have step one, retrieve the YouTube video, step two, send it to a transcription tool, step three, write the transcript. And in the write the transcript step, we might have a specific way in which we like writing transcripts, which we could offload to a reference file.

**10:08** · So when you package this all up, what does this actually equate to? Well, you've got a short skill.md file that gives Claude the overview of the process with deeper reference files that are loaded into context and offloaded only at that specific step in the process. You get all of the depth of the context without bloating the context window with all the information at once.

**10:28** · So, that's what makes skills so powerful. And by the way, don't write skills from scratch. Use anthropics skill creator skill because it generates them properly the first time. You still have to give it a bit of guidance about keeping it less than 200 lines and offloading references, but it's effectively going to help you build that with references and examples baked into your skill there. And all you need to do is describe the skill you want to do and it builds out the whole thing for you.

**10:51** · Just make sure you understand what process document you actually want, the inputs, the outputs, etc. Now, compared to skills and slash commands, hooks are non AI deterministic token-free actions importantly that happen on a specific event every single time. So there's no randomness. There's no guessing whether the LLM is actually going to call it.

**11:09** · Hooks happen every time. And Claw Code has some built-in hooks like session start. And this is where it gets really useful for memory frameworks which we'll come to later. So session start means that you can force a specific file to load in every time a session starts.

**11:24** · Rather than relying on the Claude DMD where Claude is deciding using its judgment whether to read that reference file or not, you just guarantee it loads by using a hook instead. And by the way, if you've been getting value so far from this video, make sure to go down below, hit the subscribe button, and comment below the video. You'll be doing me a huge favor and I greatly appreciate it.

**11:42** · So, it brings us next to concept 11, MCPs. So, all of the concepts so far are completely useless without being able to actually connect to the apps that you use day-to-day. And that's where MCPs or model context protocol actually come in.

**11:57** · So, MCPs are basically a standardized way to connect to your tools and apps.

**12:01** · That is it. So they mean you can work inside the apps you actually use every day instead of being stuck in this terminal window. So in a previous video I showed Claude reading data from notion and writing data back. So that's an MCP in the background just doing the connection work and making sure it does it in a standardized way. So same goes for connecting to Slack, Google Drive, HubSpot or another CRM, your database, whatever. They're all connected by MCPS or can be. So everything we've seen so far has been inside a terminal. But does this mean you need to be technical to run claw code?

**12:33** · Well, not really because there's actually a ton of options. So, you can run claude code in the terminal or inside VS Code. It just takes a little bit of learning. You can use claw desktop or other UI layers to sit on top of it. Or anthropic even brought out claude codework, which is effectively just another UI layer on top of claw code with a bit less functionality but access to your local files. And none of these, by the way, is the one best solution. But I highly recommend starting inside something like VS Code or the terminal because once you understand the foundations there, everything else becomes easier.

**13:05** · Everything else is a layer on top. So inside the terminal, you see your files, you see Claude's edits, you see exactly what's happening underneath the hood.

**13:13** · And once you've got those basics, you can start looking at external tools that focus on solving specific jobs. So for example, we've built out our own command center that's part of our Aentic Academy. It's going to take away all the technical overhead and focus you only on business goals. So basically you can stay working at a high level see all of the agents working in parallel in one place and then if you want to you can dig into individual tasks when you need to or look at vibe canban which is like

**13:38** · a canban board for your agents or paperclip which is more about setting up your agent organization with traditional business roles like CTO replaced by an agent. But the point is understand the concepts first and then work out how you extend your own capabilities with a cleaner interface on top after you've understood those foundations. So you've got the foundations, you've got clawed context lockdown, you've got claw code personalize. So now let's take it a step further. And this is where you go from using claw code to actually running your business on claw code. And it's where something like the agentic operating system comes in.

### The Agentic OS Layer

**14:10** · So the idea is dead simple. You build one shared business context folder that every skill references part of. So you've got your brand voice, your audience, your client positioning, all the client details, all stored in that business context folder.

**14:27** · So this means you only need to update it once and every skill is going to understand and get those updates. It's like setting up one source of truth for all of your data, but in this case, it's applied to the context we're loading into claw code. And everyone should set up their own version of this or grab one off the shelf. So, it's going to help you chain tasks across multiple skills and manage context in a whole new way.

**14:48** · And that's the compounding advantage you don't get from using claw code out of the box. By setting up a business operating system or a gentic operating system, every output is going to get better because every skill knows your business. And every time you interact with Claude, it's going to inject the right context at the right time. So, you can actually take some of those jobs and turn them into scheduled tasks. So this one is more of a mindset shift than an actual feature of claw code. So I want you to stop thinking about individual process documents when you're looking at creating skills.

**15:16** · Start thinking about inside your business or inside your day-to-day work. What are the jobs to be done? So for example, you might do a weekly content digest. That shouldn't just be one process skill that goes through all the steps of a weekly content digest. It should be a research skill, a copywriting skill, maybe a formatting skill, and then possibly even a skill to review. All chained together, so kept as separate skills built for modularity so that you can use them in other skill combinations, too. But all combined together with one set prompt on a schedule to achieve a job to be done.

**15:49** · And that's exactly how we build skill systems inside the AgentOs, and how I'd recommend building them for yourself, too. So, don't just go installing skills off the marketplace because you think they'll be useful. Think about how that scaler is going to actually chain with other skills and pass it the proper outputs to create workflows instead of isolated process documents as your skills. And then when it comes to actually scheduling, you can just use Claw Code's built-in scheduling features which are mostly inside the desktop app.

**16:16** · So you can run these jobs on a recurring basis. So think your weekly content digests, your Monday lead reports, your daily check-ins, whatever your business actually needs. This is all about keeping a human in the loop, chaining multiple skills together, and not running things autonomously without supervision because we're effectively trying to achieve high quality but reduce the amount of manual admin tasks that you need to do on a day-to-day.

**16:38** · Which brings us to possibly the most important concept. This last one, if you've not considered it yet, is going to totally level up your game with claw code. So, it's all about picking a memory system to make the context you load in the best it can be. So again, we've circled round full loop back to context because it is so incredibly important. And we mentioned Claude's built-in memory is absolutely fine for the basics, but if you want to start doing complex projects or anything serious, you're going to need a memory system that's better than what ships out the box.

**17:07** · So I have a complete separate video guide on this, a memory video I broke down into six levels from the basics all the way up to advanced. So here's a quick primer for that video and you can go away and watch that straight after this if you want. So level one is the static rules and brand info that should be loaded into your memory every single time, loaded into that context.

**17:27** · Level two is all about using hooks to force the context to actually load in reliably. Level three makes everything you've ever told Claude searchable so it can find the right bit of information when it needs it by meaning, not by keyword. And that there is the 80/20 for most business owners. And then you've got levels four, five, and six for specific use cases. So, it's word for word recall of past conversations, building a proper knowledge base, or sharing memory across all your different tools, chatbt, claude, and your other AI tools, too.

**17:56** · So, it's all about picking one that matches what you're trying to remember and the way you like working.

**18:00** · So, there you have it. 15 concepts, 80% of how Claude code is actually used from my experience. And if you want to learn anything more about building an Aentic operating system or getting one straight out the box with 20 plus skills, scheduled workflows like we saw today, a UI and your business context all with a oneline install, then check out the Agentic Academy link down below. See you in the next video.