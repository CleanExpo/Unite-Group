---
title: "Vercel Just Fixed Vibe Coding's Biggest Problem"
source: "https://www.youtube.com/watch?v=hTpHmLFXBrc"
author:
  - "[[Sean Kochel]]"
published: 2026-05-13
created: 2026-05-14
description: "🔥Join my FREE community with full guides & tons of prompts from past videos: https://www.skool.com/tech-snack⚡Build an app, ship it, & get your first customer with hands-on helphttps://www.skool.c"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=hTpHmLFXBrc)

🔥Join my FREE community with full guides & tons of prompts from past videos: https://www.skool.com/tech-snack  
  
⚡Build an app, ship it, & get your first customer with hands-on help  
https://www.skool.com/tech-snack-pro  
  
In this video I cover Vercel's new Deepsec for security scanning your AI-coded projects.  
  
⌚Timestamps:  
00:00 Intro  
00:16 Security Overview  
02:07 Deepsec Overview  
02:22 Step 1 - Install & setup  
04:05 Step 2 - Run Scan  
06:04 Step 3 - Address Changes  
08:48 Step 4 - Re-validate  
  
🗄️ Resources:  
https://github.com/vercel-labs/deepsec/  
Another video I did on security tools: https://www.youtube.com/watch?v=VFYrBEkEVsw  
  
💪 Who Am I?  
  
My name is Sean... I went from tech bootcamp grad to startup Sales Engineer, scaled a marketing agency to 8-figure ARR, and exited a small CRM along the way (sustained $250K ARR).  
  
This channel is for fusing tech skills with business building experiences and sharing what I learn along the way.  
  
👇 My Other social accounts  
  
📸 Instagram: https://www.instagram.com/seankochel/  
🐦 X/Twitter: https://x.com/IAmSeanKochel  
👨‍💻 Linkedin: https://www.linkedin.com/in/sean-kochel/

## Transcript

### Intro

**0:00** · If you're live coding apps and want to ship them, there's a 90% chance that you have a security hole that you don't even know about. And Vercel just built an open-source tool that helps us find them. So, we're going to check it out and I'll show you the exact system I use to not only find them, but also fix them. So, to start off, it's really important to know that app security goes far beyond just the sign-up and sign-in flow. And so, there's something called the OWASP Top 10 Web App Security Risks list, and every few years they release a new version with what the current top security risks are.

### Security Overview

**0:31** · So, before we get in and look at the plugin that fixes some of these things, let's quickly talk about what those top 10 are. Number one is going to be broken access control, so people able to access things inside of your app that they're not supposed to be able to access. Number two is going to be security misconfiguration. So, for example, using default credentials, not locking down like admin panels, things like that. Number three, software supply chain failures, which we've seen a lot of lately, where a package that a lot of people use gets compromised and now that's inside of your project.

**1:03** · Number four, cryptographic failures like storing a user's password in plain text in your database. Number five, injection, so allowing people to insert things into your project that shouldn't be there. Number six, insecure design, so having flaws in like the logic of your application that again allows people to do things they shouldn't be able to do. Number seven, authentication failure, so for example, not rate limiting your login page, allowing people to try to brute force access to it. Number eight, data integrity failures.

**1:34** · Number nine, logging and alerting failures, so something bad is happening and you don't actually know about it. And number 10, mishandling of exceptions. So, for example, if something fails, does it fail open and allow people access, or does it fail closed and shut down access? Or even if something fails, are you accidentally logging secrets into the console logs?

**1:57** · Now, there are other skills and plugins that specifically look at all of these OWASP top 10 and audit those things. And I've done other videos on those and I'll link to some of them below. So, that being said, let's check out the Deep Sec library. So, it's billed as an agent-powered vulnerability scanner that you can run in your own infrastructure, optimized for performance on-demand review of all code in existing large-scale repos. So, here's how we can get this thing started. First, we want to copy this command npx deepsec init.

### Deepsec Overview

### Step 1 - Install & setup

**2:27** · And we can come down into a project and run it. And so, the first thing that you want to do is copy this command right here, because this teaches the coding agent what it needs to do in order to use this skill effectively. So, now after we've done that, we need to navigate into the deepsec directory, and we need to install the dependencies.

**2:45** · Now, one thing I'll say, if you've used codex in the past and now you use Claude code, it can error out and have a few kind of funny things that happen. And so, you should come through and define the agent that you want to use, if you want to use Claude code or codex specifically. Now, you can also run this with a Vercel API key, and it will run on their infrastructure. But since I have a Claude Max plan, I am going to use that. So, now what we're going to do is we're going to open up our coding agent, and we are going to paste in that command that it gave us.

**3:13** · And again, what this is doing is it is going through and it's teaching it how to do the setup that it needs in order to run. So, after this is done, we're going to run through and we're going to actually run the first scan. And so, after we've pasted that command into Claude code or codex or whatever, we get this info.markdown file. So, if we hop into the project and look at it, it's basically explaining how this project works, what the code base does, and it kind of documents like the overall threat model, what are the highest impact concerns based on your project that could be an issue.

**3:45** · Now, in this case, this is a project for me. I'm not intending to publish this in a place where I would need authentication or authorization. And so the threat model is going to assume here that it's a single user on a local machine. That being said, there are still other things that would be important to consider. So that's what it's going to scan for. So now we can come back into this Deep Sec folder and we can run the command scan and then we pass in the project ID that it gave us.

### Step 2 - Run Scan

**4:11** · Now this stage runs very fast because what this is doing is it's identifying the tech used in your project and then it has these different regex matchers. So for example, insecure cryptography, SQL injection, cross-site scripting risks, missing off. So it's going through and it's using these regex matchers to basically find you files that are worth a deeper look.

**4:34** · So in this case, after the scan completes, again in less than 1 second, there are 118 different files that it wants to look at when it moves through and processes this. Now a lot of these are going to match to those OWASP things that we looked at earlier. So from here, now that we have these candidate files, how do we go a level deeper and find out what if anything is actually wrong? So the next command up is called process and it's the one that's going to actually use your language model to go through and try to understand what issues need to be addressed.

**5:04** · And so in this case, they've grouped things together into 29 different batches that it is going to move through one by one and report back all the findings. And so that is what we can see here, all of the different tool calls, it's reading the files. And then in a few minutes, it's going to report back its findings. So now that this run is complete, we can see that it technically ran for 50 minutes worth of processing time, but a lot of these jobs are running at the same time. So it didn't actually take that long, it took more like 5 or 6 minutes. And the total cost, cuz a lot of you guys ask for this stuff in US dollars for those tokens, was $19.

**5:35** · Now I'm on a Claude Max plan and this was using Opus 4.7, but if you want to know what the cost of this thing is with just the API itself, it would have been roughly $19.50 to run this. So So, now that this thing is complete, the next command that you can run is a report command. And so, what that's going to do is it's going to loop through all of its different findings, and then it categorizes them into critical, high, medium, high bug, and bug.

**6:01** · So, inside of this project, now we have this reports directory filled out with a report markdown and a report JSON file. And so, we can go through and read what it found. So, the first bug that it found in this case is that if there's an abnormal termination of the server, the database that we have set up basically gets silently wiped. And this is actually a bug that has been driving me a little bit nuts, and so I'm glad that this went through and found it. Now, if this were a production app, that would obviously be like a huge issue for a lot of different reasons.

### Step 3 - Address Changes

**6:32** · So, it's going to give a lot of details about what exactly it found and its recommendation for a fix. And then it found another bug, which similarly creates data loss inside of our app, which again is a security concern. Now, just for context, here's what this type of finding looks like in another project that does have authentication and authorization in place. Because this repo is really built at being able to find smaller things that would kind of fly under the surface and be hard to spot.

**6:59** · And so, in that project, we have 1 2 3 4 5 6 medium priority security issues that should be addressed. So, as an example, I have this app that's in an alpha and only my family members use it. And so, the way that I locked that down was by putting a family sign-up key in place, so that if someone made their way there, they wouldn't be able to, you know, use this app. You can only sign up if you have this extra key. But, the issue is that I didn't put any rate limiting or IP throttling in place.

**7:27** · So, what that means is somebody could come through and try to brute force the family sign-up key.

**7:35** · Now, obviously, this is kind of like an edge case, and I haven't pushed this thing public, but someone could find it and try try brute force their way in.

**7:41** · So, it's going to document that finding and then it's going to give a concrete recommendation on how to fix it. So, now that we have this potentially giant list of mistakes that we need to fix, what is the best way to actually do that so that you know it's done well and that everything is in fact fixed. So, my new daily driver for work like this that I want to make sure I track really closely is Open Spec. So, we're going to use it to make these changes. And the way that I'm going to do that is I'm going to kick off the Open Spec fast forward command and I'm going to tell it that it needs to address the security issues found in this report.

**8:11** · So, now Open Spec is going through, it's creating all of the artifacts that it needs to do this.

**8:18** · It's creating the proposal, it's creating the actual spec, the design, generating a task list for us, and then we can just kick it off with this OPSX apply command. And so, now it's moving through and it's actually applying all of these changes. So, all of this is in the process of getting patched and then we're going to come to a very important place where we need to then verify with Deep Sec that what we did actually fixed those changes and that the same problem isn't still sitting there. And they have a pretty cool way that they do that.

**8:46** · So, now that these fixes have been made, the only thing that's left over is to manually test this. So, what I'm going to do is we're going to come through and we're going to run the last command here, which is PNPM Deep Sec revalidate.

### Step 4 - Re-validate

**8:59** · And so, what this is going to do is it's going to look at our Git history, it's going to look at the findings that it had, and it's going to check to see if those issues have been resolved or not.

**9:09** · So, after about 2 and 1/2 minutes, we can see it went through all of our changes, cost about $1.12, and it is now marking both of those issues as fixed.

**9:18** · And so, this entire process where you scan, process, build the report, make the changes, and then revalidate those changes is a process that I would recommend running at least on a weekly basis to make sure that new things you're developing aren't slipping through the cracks. Now, it's definitely worth pointing out that of all of these things that we looked at from that OWASP top 10 list, it can definitely find a lot of these things, but it will not find all of them.

**9:44** · It's a static code analysis tool, so it's looking at the patterns in what you have built, and it's generating its recommendations based purely on the code that's there.

**9:55** · But a lot of security issues tend to come down to actual human interactions with things. But that being said, it's still incredibly valuable in helping you find issues that you should fix. So if you want more actionable stuff like this, make sure to subscribe, but that is it for this video. I will see you in the next one.