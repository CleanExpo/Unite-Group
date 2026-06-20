---
title: "How to Use /goal to Build a Self-Improving OS"
source: "https://www.youtube.com/watch?v=5xrjO38WUYY"
author:
  - "[[Mark Kashef]]"
published: 2026-05-18
created: 2026-05-18
description: "Master Your Agentic OS: https://www.skool.com/earlyaidopters/aboutGet the Prompts FREE: https://markkashef.gumroad.com/l/goal-cookbook-self-improving-agentic-osMeet with Me: https://calendly.com/d/c"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=5xrjO38WUYY)

Master Your Agentic OS: https://www.skool.com/earlyaidopters/about  
Get the Prompts FREE: https://markkashef.gumroad.com/l/goal-cookbook-self-improving-agentic-os  
Meet with Me: https://calendly.com/d/crfp-qz3-m4z  
  
Most people are using /goal for the wrong thing. They use it for code migrations and snake games. The real unlock is pointing /goal at your own agentic OS and letting it self-improve overnight.  
  
In this video I walk through five practical /goal use cases that take a messy ~/.claude folder, a pile of contradicting rules, and 22 half-built projects and bring order to them while you sleep. Clean, sharpen, revive, forge, and maintain. Each one is a copy-paste prompt you can run today.  
  
Plus the part nobody talks about: /goal runs a second model as the judge. Devil's advocate built in. The agent doesn't get to mark its own homework.  
  
\---  
  
Timestamps  
  
0:00 - The slash command everyone is misusing  
0:48 - The 5 demos (clean, sharpen, revive, forge, maintain)  
1:11 - How /goal works (the second model judging your agent)  
2:05 - The meta-move, give the agent a mirror  
2:19 - Demo 1 CLEAN, audit 47 skills and 7 rules in under 3 minutes  
3:26 - Demo 2 SHARPEN, rubric-driven skill iteration  
5:01 - Demo 3 REVIVE, resurrect every dormant side project  
5:53 - Demo 4 FORGE, write new skills from your own session history  
7:46 - The three ways to run Claude Code autonomously  
8:34 - Demo 5 MAINTAIN, /loop + /goal heartbeat  
10:32 - Closing thoughts  
  
  
#claudecode #goalcommand #agenticos #ai #automation #claudeai #anthropic #aiautomation #claudeskills #aitools #aiengineering #slashcommands #agenticai #aiworkflow #productivity

## Transcript

### The slash command everyone is misusing

**0:00** · So there's this newer slash command called /go which is now native to both codecs and cloud code. Most people are using it exclusively for technical tasks like migrating code bases or running batch tests. But the truth is you can use slash goal for pretty much anything including optimizing your existing agentic operating systems.

**0:17** · And whether you've been building your agentic OS for a while or you're just getting started you will hit the familiar problems over and over again. the skill folder that keeps on growing, the clawed MDs or agent MD files that keep expanding, and the rules that start contradicting each other. You mean to clean it up, but you never have the time to. So, what if you didn't have to carve out time to do all the cleanup yourself? What if you could point/al at a folder or your entire computer and give it a series of non-technical tasks that it executes to perfection?

**0:47** · And what if you could bring every dormant side project you've ever had back to life? If you know how to use slashgoal properly, these will no longer be hypotheticals. So, in this video, I'm going to quickly walk you through what slash goal is and how it works and then apply it to five real agentic scenarios.

### The 5 demos (clean, sharpen, revive, forge, maintain)

**1:03** · One to clean, one to sharpen, one to revive, one to forge, and one to maintain. Just seeing me go through all of them should spark a lot of ideas.

### How /goal works (the second model judging your agent)

**1:11** · Let's get into it. Now, just in case you don't know what /goal is or does, I'll quickly walk you through it. So, you start off by giving the AI a goal or objective function in 4,000 characters or less. Once it has this, it goes in a loop and it has a judge side by side.

**1:26** · And most people don't know that this judge actually operates out of a different language model. So, technically, you do have a devil's advocate looking at the work of the primary agent until it gets to its terminal state. So, basically, every time the agent thinks it's done, it has another agent looking over its shoulders to confirm, has the condition been met?

**1:45** · If it clears, the goal is done and is set to be accomplished. And these can take anywhere between a few minutes all the way up to an hour to complete, depending on the complexity. Now, most demos of this slash goal use it on something very formulaic, something like go and build me a snake game while I sleep or go and scrape all of these websites until you have a perfect CSV.

### The meta-move, give the agent a mirror

**2:05** · In our case, we're giving the agent a mirror. We're telling it to go through all of the assets, the markdown files, the rules, the agent MDs to see how it could best optimize itself. So, the target of the goal is optimizing the very system trying to achieve the goal.

### Demo 1 CLEAN, audit 47 skills and 7 rules in under 3 minutes

**2:19** · The overarching goal of the demos I'm about to walk through are taking a messy workspace and bringing order to it. So, if we pop into a terminal here, you'll see that we have a hypothetical folder with 47 skills as well as seven different rule files. If we scroll down, you'll see that the goal is set here. If it wasn't set, it would tell you that you're over the character limit. And I think due to the specificity of our prompt, it actually completed this in under three minutes. So, it took 2 minutes and 50 seconds.

**2:43** · And the result is it took 47 skills and made them into 17. 30 were archived, which is good because we wanted to store anything it removed just in case we disagreed with it. Then it took seven rules and made it into four. It found three rule contradictions. And then it said whatever it removed from the cloudmd.

**3:03** · And by the way, if it's your goal to go infinitely deeper on things like cloud code, Aentic systems, and Agentic OS systems for your business, then you want to make sure you check out the first link down below for my early AI adopters community. My primary focus in there, just like on YouTube, is giving you all the magic without the hype. Maybe I'll see you inside and let's get back to the video. So, we covered the clean use case, but what about sharpening? Let's say we have a series of files, one of which is the rubric.mmd file where you create evaluation criteria ahead of time before you even run / goal.

### Demo 2 SHARPEN, rubric-driven skill iteration

**3:33** · So let's say that this is all the criteria that I use, which is actually pretty similar to creating thumbnails, especially the little clawed mascot themed thumbnails.

**3:44** · I can paste a goal like this. So I will paste this in and then it reads the following. Go through this skill.md file for each input. Go through our test inputs. So we can basically give it simulation criteria or we can ask it to create its own simulation criteria and then simulate the skills output then score it against the rubric and then you can go even deeper here.

**4:05** · You could say go and use a series of sub aents to go simulate and run the skill go through the outputs and come back to me and tell me how well it does based on this criteria. But the one thing you accomplish by creating the rubric yourself is you can guarantee that the goal will be accomplished against your specific criteria, not some easy madeup one by the AI itself. Because if you've tested using AI before, usually it will go easier on itself to try to increase the chances that it accomplishes the goal.

**4:35** · And you'll see it started an iteration log. So we can take a look at all of the chain of thought and the rationale that it's using. And then it's rewriting the skill MD to enforce all of the five rubric criteria. So let's say you work in a specific domain where all of your skills should always have some form of standard or specific set of outputs. You can make sure that all of the skills in your arsenal always abide by that by constantly optimizing them.

### Demo 3 REVIVE, resurrect every dormant side project

**5:01** · Couple minutes we have the fix and the optimized version of the skill ready to go. Let's say you're one of the many users in the world that have a series of projects, a plethora of half-built bridges. You start a project, you work it to 60 70%, but you've never taken it all the way or at least not to a point where it's production ready. Our goal here is to try to revive as many of our existing 22 projects. So you can then send this prompt. We could do goal and then send this over. So the prompt reads as follows.

**5:30** · You're essentially asking cloud code to go through every project and every subfolder to use, test, and see what existing git commits, tests, python functions exist to see how it could revive or resurrect any of these projects and if they deserve to be resurrected to begin with. Now, in my case, I purposely created a series of useless projects so it could catch them as dormant hello world projects. And what it does is remove them and keeps the ones that are actually useful. Now we move from reviving to forging.

### Demo 4 FORGE, write new skills from your own session history

**5:59** · And one interesting use case you can use /goal for is going through all the transcripts between you and cloud code in every single session and having it pull out which prompting patterns deserve to be something like a skill.

**6:14** · Because all these transcripts are stored in what are called JSON L files which are basically fancy JSON files. And I personally even have a skill that's called slashconvo review where I ask questions to go through all the conversations through all the folders.

**6:29** · If I can't remember which folder I worked on on a specific project. But if you want to find the nuggets that deserve to be skills, then you can write something like this where we'll do / goal and we'll paste this specific command. And this is basically asking it to go through all the transcripts in your folder. In your case, you'll want it to go through the tilda, the little squiggly line, claude code folder because it will go through all the session transcripts globally. And then it will go through back and forth to look between user and assistant.

**6:58** · Assistant is cloud code, user is you, and it will try to find and extract three recurring prompts that deserve to be a skill. And then naturally, we're going to ask it to create said skills.

**7:10** · And you'll see in our hypothetical world, it found three recurring patterns that don't seem to have skills that should. One of them is the excellraw doodle canvases. Those are the images that you see on those canvases I show you in most videos. Now, I actually do have a skill that I'm hiding from this folder, but for all intents and purposes, it can't see it on purpose.

**7:30** · Number two is auditing content for patterns, obviously, my YouTube content.

**7:34** · And number three, it doesn't see my LinkedIn skill that I have in a completely separate folder. So, it's seeing a series of transcripts about LinkedIn posts generated from my transcripts with no associated skill.

### The three ways to run Claude Code autonomously

**7:46** · Within a few minutes, we have all three skills ready to go, and you can start testing them and seeing if it hits the mark. Now, for this last use case, I'm going to throw you a curveball. Because when you use cloud code, there are three main ways that you can have it run autonomously without you being at your computer. Them is to use / loop, which will execute some task every x amount of time. It could be every 5 minutes, every 30 minutes, every hour. The next one is the one we've spent this entire video on, which is /goal. And the very last one is the triedand-true hooks, where you can make it run on a specific event or at the very end of a session.

**8:17** · So hypothetically, instead of creating something new or leaning things down right now, what if we wanted a regular maintenance of our infrastructure? You could theoretically go through the remaining skills we have where we went from 40 to 17 and we want this cleanup done on a regular basis. So we could write a compound prompt like this where we do slash loop and in this case we put the time interval every 30 minutes. This could be every hour, every 90 minutes.

### Demo 5 MAINTAIN, /loop + /goal heartbeat

**8:46** · It might be overkill but it's more so to show you can combine them together. And then you can do slash goal. Then after that we paste the rest of the prompt. So you could tell it to archive any skill that hasn't been used in the last 30 days and constantly check for different criteria. You can make this whatever you want, but the core idea is this sets it up to run in the background so long as your session is open and it can keep refreshing things, keep checking, are your rules relevant given all the work that you've done. Is your cloudmd as optimized as it can be?

**9:17** · And then we ask it to maintain all of the changes or all of the proposed changes in a maintenance log file. So it creates the cron job to run on your computer and it has the scheduled goal to run every 30 minutes.

**9:31** · And naturally you can use /goal and sloop for whatever you want. But when it comes to your agentic OS using it as a way to maintain your infrastructure or at least constantly auditing if your skills claude MDs and any associated agentic OS assets are optimized is way easier than having to remind yourself to do it every day. And here's an example of a hypothetical finding where it found one stale skill called drifted skill which I actually don't know about last used March 31st which is 45 days old and one contradiction.

**10:01** · So imagine you have this system running and it keeps looping. It keeps writing this maintenance log and then you can start analyzing your maintenance log to see how well is it maintaining my infrastructure and then it goes through and you can see it's looping here. It will keep running in this terminal but you get the idea. So hopefully this gives you a good glimpse into how powerful SLG goal can be not just to all of these other tasks like build me a million-dollar startup, don't make mistakes, but to actual practical use cases for your Aentic OS systems.

**10:29** · If you wanted access to the prompts that I showed you so you could use them or take derivatives of them for your own use case, I'll make them available to you in the second link in description below.

### Closing thoughts

**10:40** · And last but not least, if you want to go infinitely deeper on things like claw code, agentic OS systems, and looking at all the plumbing that needs to happen to run it perfectly, then you want to check out the first link and maybe I'll see you in my early A adopters It.