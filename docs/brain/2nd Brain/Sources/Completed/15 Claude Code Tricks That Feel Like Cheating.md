---
title: "15 Claude Code Tricks That Feel Like Cheating"
source: "https://www.youtube.com/watch?v=qGAuqbbj1Ls&t=667s"
author:
  - "[[Sean Kochel]]"
channel: "Sean Kochel"
published: 2026-04-30
created: 2026-05-08
description: "🔥Join my FREE community with full guides & tons of prompts from past videos: https://www.skool.com/tech-snack⚡Build an app, ship it, & get your first customer with hands-on help:https://www.skool."
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=qGAuqbbj1Ls)

🔥Join my FREE community with full guides & tons of prompts from past videos: https://www.skool.com/tech-snack  
  
⚡Build an app, ship it, & get your first customer with hands-on help:  
https://www.skool.com/tech-snack-pro  
  
In this video I break down 15 of the top tips for Claude Code, directly from it's creator!  
  
⌚Timestamps:  
00:00 Intro  
00:37 - Chrome Verification  
2:18 - Forking  
03:57 - Remote Control & Teleport  
06:06 - Worktrees  
07:05 - Opus  
09:12 - PR Loops  
10:33 - Slash Commands  
11:52 - Verification  
13:25 - /batch  
15:04 - Planning Energy  
16:00 - Using Claude.md  
16:59 - /grill-me  
18:27 - Data analytics  
21:02 - Learning  
  
🗄️ Resources:  
https://www.skool.com/tech-snack/classroom/0ca89703?md=2e2711f2a7234cbe93f09c5680705cad  
  
💪 Who Am I?  
  
My name is Sean... I went from tech bootcamp grad to startup Sales Engineer, scaled a marketing agency to 8-figure ARR, and exited a small CRM along the way (sustained $250K ARR).  
  
This channel is for fusing tech skills with business building experiences and sharing what I learn along the way.  
  
👇 My Other social accounts  
  
📸 Instagram: https://www.instagram.com/seankochel/  
🐦 X/Twitter: https://x.com/IAmSeanKochel  
👨‍💻 Linkedin: https://www.linkedin.com/in/sean-kochel/

## Transcript

### Intro

**0:00** · Over the last 4 months or so, Claude Code's creator has shared probably dozens of different rules that he follows in his own workflows to build Claude Code itself. So, not what Anthropic wants you to do or what people on Twitter think you should do, but what he actually does himself. So, I picked out 15 of them that I think are the best bang for your buck, particularly if you're a vibe coder or vibe engineer or you use Claude Code in like day-to-day type of work.

**0:27** · So, we're going to go through each one, talk about why he uses it specifically, and then I will show you how to actually implement it for yourself. Starting with using Chrome as a verification step for all front-end work. So, this was actually listed as one of his highest impact things that you can do to actually improve the performance of Claude Code. And so, the rationale behind this is that if you had to go actually ask a human to build a website, but told them that they couldn't actually use the browser, how good would the actual result look in the end? Probably not good.

### Chrome Verification

**0:58** · And it works the same way. So, if we give our coding model access to the browser, it can write the code and then iterate until the thing actually looks good. And so, the way that you do this is actually pretty simple. All you need to do when you kick off Claude is type in {dash} {dash} Chrome, and that's going to open up Claude Code with access to Chrome.

**1:20** · So, let's say we're inside of an app and I really don't like how when I click on the user's profile down here, it pops up in this modal and I would rather have this be like a traditional preferences and setting page. So, we can come through and we can tell it to use the Chrome extension to iterate and verify until the work is complete and then explain what it is that we want to do.

**1:39** · In this case, extract that modal into its own individual page so that we can start adding in more like complexity into what users can actually manage in their settings. And so, now we can see Claude has actually spun up a Chrome browser and has taken over and is testing their changes. So, we can see now it's not a modal, it is a actual settings page where we can go in and now we can have these tabs at the top for preferences and profiles and all of those types of things. So, sometimes simple verification loops are the best thing you can do.

**2:08** · I've actually extracted this type of workflow into a basic {slash} command that I can run to go verify any front-end changes that get made. But, the next thing up I'm a little bit ashamed to admit I didn't know until very recently that it existed. One of the things that I always found to be a pain in the ass with using tools like Claude Code or even using like Claude or any tool in the desktop is that it was really difficult to like fork a conversation.

### Forking

**2:34** · So, sometimes you've built up all of this context and you want to see what would happen if you took it in a few different directions.

**2:42** · Now, the problem is if you were to do that inside of one conversation thread, then you're going to muddy the context of that thing that you had that you wanted to iterate from. So, I should have read the manual sooner because you can actually do that now. So, if you were to come down into your terminal and you typed in the {slash} command branch, this now basically creates a fork in the road where you can continue down a different path in the conversation and if you ever needed to, you could get back to the original conversation.

**3:07** · So, let's say we came down and wanted to ask something basic like, based on the context of our app, what other information would make sense to have in our preferences? All right, so now this thing is going to go off and it's going to pull in a bunch of extra context, it's going to consume tokens, it's going to create things that we might not actually want or we might only want to take a piece of that and take it into our other conversation.

**3:34** · So, all we need to do to get back to where we were is to type in resume and then give that ID it gave us and it's going to take us back to exactly where we were before we created that branch. So, of all the things on this list, this is probably one of the biggest workflow improvements for me. But, what's a fork session if we can't control it from our phones and be constantly locked into working? So, the next one up is a little bit of a two-for-one, remote control and teleport. So, 99% of the time I run Claude Code on my desktop.

### Remote Control & Teleport

**4:05** · But, the only downside is that if I leave the house for whatever reason, I'm at my parents' house or I'm out at a store and I have an epiphany. One of the things that I was working on now becomes very clear, but I have no way of working on it or like stashing that detail in that moment. And so, these two features resolve that same problem in two slightly different ways. So, the first one up is remote control. So, if I was to come in and type in remote control, this session is now going to be accessible on my Claude mobile app.

**4:32** · So, now we can see here we are on my phone and this exact session we can see is loaded up and if I click in here, I now have this entire session where I can pick up exactly where we were. So, another thing that I have never really historically done that much is use Claude Code in the web browser and there's definitely situations where having something like this would be helpful. Maybe you don't have access to like your primary local machine, you have your laptop, you're out somewhere and you want to be able to continue work that you were doing either on your phone or you were doing on your desktop.

**5:04** · And so, let's say we've kicked off a new session which is based on that epiphany that we had and we want to add into this MVP architecture a discovery feed in that app that we were looking at. And so, now let's say that we have some plan or something that we would want to take forward on our machine and now we're back home on our computer. We can just pop down into Claude Code, run the teleport command, select either the session from our phone or in this case from the Claude Code web browser and now that entire session that we had just worked on it's on our computer and we can continue moving forward from there.

**5:38** · And so, this workflow creates this kind of like triangle where we can do certain work up here like inside of our, you know, daily driver like our actual desktop computer, we can pop it into our mobile phone as needed and then we can get access to all of these things inside of the web browser and constantly pop between all of those depending on what our workflows look like and what we need to do. So, pretty cool, but there's actually one more feature that makes that whole process a lot smoother. And that tip is using Git worktrees extensively.

### Worktrees

**6:08** · So, let's say for example that there were three things that you wanted to do at the same time. You wanted to make sure you had better test coverage across everything in your app, you wanted to make some performance improvements to your back-end and you wanted to also like build out some new feature that you already had specked out. Well, if you were to manage this with just using Git branches, that is going to become very messy for you very quickly. Now, the reason for that, if you're doing a lot of work in parallel, is that you're typically working out of one directory, right? It's your main app directory.

**6:37** · And so, that becomes a problem when you're trying to do things in parallel because for every single change that you would make, you would have to commit that specific change, swap over to the next branch, and if you have these things again running in parallel, they're all going to overwrite each other's work and it's going to be a real real cause for a headache. But, if you're using Git worktrees, you spin up multiple directories and then you can work inside of each of those things at the same time in parallel with different Claude Code instances.

### Opus

**7:06** · And so, all of that work is being done simultaneously, you don't have to stash changes and you're not constantly switching between context. So, if you're someone that's not used to doing this, the Opus Superpower skill plugin has an entire skill specifically for using Git worktrees that just takes you through like a really solid process.

**7:25** · So, it'll create the worktrees for you, it will run all of your tests to make sure that you're starting this from like a clean baseline and you didn't just take issues from somewhere else that are now going to convolute this worktree, and it has a bunch of red flags in place to make sure you don't go off the rails and do it the wrong way. So, having a bunch of worktrees is pretty cool, but like how do you actually develop properly inside of them? Surprisingly, he says to use Opus for everything.

**7:50** · Now, this is one that departs a bit from the norm of what you see in a lot of other libraries or what other people claim to do where they'll use Opus just for the planning process and then they'll use Sonnet to actually implement things. So, the general thought here is that while it may be bigger and it might be slower, so it might be more expensive to use, if you arrive at a correct solution faster, then it is often both faster and cheaper in the long run.

**8:19** · So, something that you can experiment with this is using the effort parameter inside of Claude Code to drive this thing where you really want it to go. So, what I have found with Opus 4.7 specifically is that anything outside of extra high tends to make a lot of mistakes and just kind of act dumb. And so, I'm curious to see how he's going to update this guidance once there's a little bit more time under tension with Opus 4.7 specifically. So, in a bit we're going to talk about the planning process in more detail and what he does.

**8:50** · But first, what are some non-negotiable quality of life rules that he lives by? So, naturally when you're developing stuff and you push to your develop branch on a place like GitHub, you run your tests and some sort of errors pop out the other side. So, wouldn't it be nice if we could use Claude Code to automatically fix these issues on a loop until the work is actually done and verified? Well, this is where his recommendation for loops comes into play and specifically PR loops.

### PR Loops

**9:21** · So, for example, let's say you've just committed a change. Well, he has a process that will look every 5 minutes at the pull request and automatically address any sort of like code review issues that came out of that PR. And so, I created my own version of this called ship and watch, which I'll make available in the description below. And so, basically when we call this command, it's going to go out, it's going to make sure that we have committed all of our changes, it's going to create a pull request and then it's going to automatically trigger a loop that will check the status of the pull request every 5 minutes.

**9:53** · And the cool part is that it's going to fix any of the changes that it saw and then once it's all done, we can go check the pull request, make sure it's good, and merge it. So, now that we've pushed this up, we can see that we have a linting error, which is causing this pull request to fail. And what's going to happen is that Claude code is going to come in and it's going to see this error and it's going to fix it itself until the PR actually resolves successfully. And so, we can see now it's found that the lint failed and it's going to fetch the logs, diagnose the problem, and fix it.

**10:23** · So, automating meaningful work like this is always like a killer thing to do. But, something that I think got slightly lost once skills rolled out is the power of slash commands. So, if you're like me, you most likely chain different skills together from different plugins. For example, I love Obra's red-green refactor test-driven development skill.

### Slash Commands

**10:47** · But, I think libraries like Compound Engineering are really great in how they ideate through kind of vague features.

**10:54** · And so, I use slash commands to chain these skills together. And so, this command that we actually just ran for like watching our PR is a really good example of how you can chain these commands together. So, the skill that we actually invoked in this case was called ship and watch. And what this skill does is it actually makes the commit, it pushes it, it creates the pull request, and then what it does is it initializes the loop. Now, this loop is a different slash command that we created. And what this one is doing is it's telling it how to actually do the looping.

**11:22** · So, it keeps track of its current state, it checks against certain guardrails that we put in place, it polls for the actual PR's status, it diagnoses the failure, and then it fixes the failure. And again, you can do this with your own commands.

**11:39** · You can create commands that bridge the gap between two different skill libraries that you really like. There's a ton that you can do with this type of convention. But, the next one up on the list is about what you do after you've actually built something. So, one of the big things that he does and what a lot of these other plugins do, too, is they make use of sub-agents specifically for verification work. And so, he has two specifically that he uses. Number one is code simplification and number two is app verification.

### Verification

**12:07** · So, code simplification is exactly what it sounds like. It will look at your session and find opportunities for making it more maintainable and simpler. And app verification is all about using tools like the Chrome extension that we looked at and other methods to make sure that the app is actually working as intended.

**12:28** · Now, there's a lot of libraries that do this type of verification and review process, as well. One that I really like is Compound Engineering's code review.

**12:37** · And so, they have 18 different reviewing personas that get called based on what it is exactly that you are doing. So, they have six of these that will always get called, looking at things like the maintainability of your code, whether or not it's actually following the standards you have in your Claude markdown or agent file, and a bunch of other stuff. And then the other \[snorts\] agents get called conditionally based on what you're doing. So, if you touch an authentication endpoint, for example, it's going to call the security reviewer.

**13:04** · But, whether you build this yourself or you're using a plugin's version of this code review process, having sub-agents go through what you just did and verify it are one of the easiest things that you can do to actually improve the performance of Claude code in general. So, I talked a lot about slash commands, but there's actually one specific type that I did not know existed. So, this one is called batch. And the way it works is it's basically like the Git work tree stuff we were talking about earlier on steroids.

### batch

**13:32** · So, let's say for example, I just took my app and I'm working on dialing in the actual UX and there's a lot of changes that I want to make across both web and mobile. Now, this is something that would obviously benefit from having a lot of different work trees and a lot of different parallel work happening at the same time. There might be slight modifications that we need to make to our data models, to our API endpoints, to the front end, to the design systems, a lot of different things that need to be worked on all at once.

**14:01** · So, I could come through here and I could copy the command to get access to these designs inside of Claude code.

**14:08** · So, I could come through here and run the batch command and say, "Hey, we need to migrate our current app to this new design system and the component system.

**14:15** · So, I need you to fetch the design file, read its read me, and implement the relevant aspects of the design." Then we link to it and we say, "Go." And so, now after a few minutes, this thing has gone through and planned exactly what it is that it is going to do. It's got 13 different units that are going to get spun up and executed in parallel. Now, one of the things that Boris mentions that he does with this as someone that probably has infinite Claude tokens is that you can literally spin up hundreds of different Git work trees to do things at the same time.

**14:46** · Now, for everyday humans, that's probably not practical, but there is a lot that you can do with this type of batch command. So, you got to be careful with your tokens, but there's a time and a place for everything. But, like I said earlier, we would make our way back to planning. So, the rule here is that you pour your energy into plans and have different sub-agent personas review them. So, something that anyone that's successful with using AI will tell you is that the plan is everything. If you have a plan, you will 100% get outputs.

### Planning Energy

**15:19** · And it's no different here, which is why he says that you should pour your energy into the plan itself. And so, this is something you see in every good like kind of spec-driven or like agent orchestration library, where they're almost always now spawning up these like adversarial agents that are really going to challenge you on the plan to make sure that it makes sense, it's specific, that you're not doing something super counterintuitive, and that it's going to actually solve the goal of what you're trying to do.

**15:48** · And so, even if you're a I never look at the code vibe coder, you 100% then need to be looking at the plan. So, there's actually one more thing that he says you should put your heart and soul into, and that is your Claude markdown file. And so, this one is kind of like the slash commands from earlier. With so much going on all the time in like the AI vibe coding space, you can often forget some of the fundamentals that are really important and can really move the needle. So, there's a few ways that I found are really helpful to do this.

### Using Claude.md

**16:18** · Number one, don't be afraid to nuke the file if it's going sideways and is no longer working for you. Number two, make sure to keep it concise. You don't need to document everything about your project in the Claude markdown file. And number three, you should be checking in every week, if not every day, on that file to see if there are things that you need to change or tweak based on what you've done recently inside of your project.

**16:43** · But, we all know that even with a bulletproof Claude markdown file, the models will sometimes go off and decide to do random that you didn't want it to do. And the next rule actually helps avoid that. So, Boris recommends challenging Claude regularly with a grill me style command. Now, there are a lot of versions of how you can do something like this. Matt Pocock's version of this is pretty popular, and so it's worth checking out if you're interested in having this type of command.

### grill-me

**17:11** · But, what this will do is interview you relentlessly about every aspect of your plan until you reach a shared understanding. So, it's going to walk down every conceivable branch of like the system design of what you're trying to do, and it's going to look at the dependencies between all of those decisions, and of course recommend you answers along the way.

**17:32** · So, I've seen cases with people using this skill where it will go on and ask sometimes dozens of questions about your plan to make sure that there are no ambiguities and that you and the model are exactly on the same page with what you're about to do. And so, the reason this type of skill is really valuable is that any ambiguity you have in your plan at the time that you go to start building will be decided upon at game time by the language model.

**18:00** · And it doesn't always do the thing that you would expect it to do. So, especially if you're a vibe coder, and by that I just mean you don't have an engineering background, but you still use these tools to build something, having this type of grill me process is probably one of the most valuable things you could possibly do.

**18:18** · Because again, time spent in the planning process saves you a ton of time and tokens in the long run. And talking about token savings, the next thing up is another killer rule to live by. So, I've started regularly using Claude code for analytics type work. And specifically what I've been doing is using Claude code to analyze my token consumption and understand where things might be going off the rails.

### Data analytics

**18:42** · So, if you're somebody, for example, that has multiple different like skills installed globally, those things will get loaded into your context every time you spin up a new session. So, like in this example, since I've been testing out a lot of different tools lately, I've got like about 30 to 40,000 tokens that get loaded into a session before I've even asked the first question, and that is crazy.

**19:08** · So, my recommendation on this specifically, if this is something that you deal with, is to install these types of libraries not in the global catalog, but in specific projects where you want to use them. So, I actually made a post about this inside of the free group, and if we look at some of these people's cost savings, you're sometimes talking about hundreds of millions of tokens that you would save each month if you're someone that uses these tools daily.

**19:32** · And so, a quick little story about this, this type of like data analytics exercise is how I realized that Opus 4.7, when using Obra superpowers, was ignoring the slash command for sub-agent driven execution and was doing everything in the main thread and shot my token usage through the roof.

**19:52** · Now, those two examples are use cases that pretty much anybody can do with a basic prompt, but Bora is actually uses this to connect to external data sources and actually generate insights from like business data, which is something that you could do if you wanted to. But, there's one really clear way to see how things are going that again you might not be aware of.

**20:13** · So, if you come down into your Claude code and type in {slash} status line, this is going to create you a really handy snapshot of how you are using your tokens over different time periods. So, we can see what is the percentage of our current context window being used, how close are we to our 5-hour limit on our context window usage, and then how close are we to our 7-day limit on usage. So, there's a ton of utility in this thing.

**20:38** · For example, anytime I get even like remotely close with the 1 million context window model to like 15-20%, I will \[snorts\] save where I'm at and clear the context window and start fresh. So, a really simple command, but it helps you keep a pulse of what exactly is going on. So, the last one to round out the list is probably the most valuable of all, and that is learning with Claude.

### Learning

**21:03** · So, one of the things that you can actually do is put, for example, in your Claude markdown file an instruction that when it builds something new, it needs to actually explain or teach you the principles behind the decisions that it made and how those things connect to the rest of your system. Because one of the big side effects of vibe coding is that you tend to not actually look at the code that's being generated, but if something breaks, you need to have some sort of understanding about where that break is likely happening.

**21:32** · And so, learning as you build in chunks is a really valuable skill that you should be doing again if you are a person that vibe codes and is not a trained software engineer. So, if you want help putting any of this into practice, check out the free group in the description below. We've got about 20,000 people in there that are doing exactly this type of stuff and are having fun. But, that is it for this video. I will see you in the next one.