---
title: "Claude Code /goal Just Dropped and it Can Build Literally Anything"
source: "https://www.youtube.com/watch?v=0lw8KTx8KS8"
author:
  - "[[Build Great Products]]"
published: 2026-05-14
created: 2026-05-14
description: "🚀 Join my community to build and launch real apps with AI @ https://www.skool.com/aiapps/about🛠️ Work with me to make $5-50k+ with your app @ https://calendly.com/chris-ashby/appstudio💡 Get 250+"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=0lw8KTx8KS8)

🚀 Join my community to build and launch real apps with AI @ https://www.skool.com/aiapps/about  
🛠️ Work with me to make $5-50k+ with your app @ https://calendly.com/chris-ashby/appstudio  
💡 Get 250+ validated app ideas and the prompts to build FREE @ https://readytobuild.app/  
  
Anthropic just released the /goal feature for Claude Code, and it's directly stolen from OpenAI's Codex CLI.  
  
The /goal is incredible in both Codex and Claude Code, and really this is the beginning of being able to work with AI coding agents in a completely different way - for longer running and more complex tasks, with less human oversight.  
  
In this video I break down how to use /goal, how to structure your goals before running them, and how to build a full application from one /goal just using a prd and product-roadmap markdown file.  
  
Build with PLAID @ https://www.plaid.build/  
Read the full Codex /goal guide @ https://www.buildgreatproducts.com/guides/codex-cli-goal  
Use the Karpathy CLAUDE.md @ https://github.com/multica-ai/andrej-karpathy-skills  
  
Chapters:  
  
00:00 Introduction to the new for/goal feature in Claude Code and Codex.  
02:35 Explaining how the for/goal feature works with documentation references.  
07:37 Setting up the project and initiating the full app build using the for/goal command.  
12:21 Reviewing the completed goal and the summary of the app builds.  
13:59 Comparing the final applications built by Codex and Claude Code  
22:15 A detailed walkthrough of the app built by the Claude Code agent.  
25:34 Final summary and best practices for using the for/goal feature effectively.  
  
Follow on social:  
https://www.linkedin.com/in/ashbychris/  
https://x.com/chris\_bgp

## Transcript

### Introduction to the new for/goal feature in Claude Code and Codex.

**0:00** · Claude Co just released a feature that is going to change the way that everyone builds with AI. But the thing is they stole it directly from codecs. And the feature I'm talking about is for/goal.

**0:10** · And what for/goal allows you to do is to build very complex, very large tasks using longunning agents and literally allows Claude code and codec to work for hours and sometimes even days at a time until it completes the task. And in this video, I want to show you not only how to use forward/goal, but also build a full application using it in both codeex and claude code.

**0:33** · So in this video, we're going to break down what for/goal actually is, how to use for/goal to build with these AI coding agents, and how to build a full application using this for/goal feature. If you don't know me, my name is Chris and for the last 15 years, I've been designing apps and advising startups on product and design.

**0:51** · and I've taught hundreds of people how to build applications with AI inside of my community. Now, if you want to find out more about that, you can click the link in the description. Otherwise, let's jump straight into Claude Code and Codeex and help you understand exactly how you can use this for/Gole feature.

**1:05** · So, I've got my terminal open here. I've got Claude Code and I've got Codeex running inside of different folders here. And what I'm going to show you is how to use for/Gole, some of the best practices that you can do when you're using this for/Gole feature and how it works. And then we're going to actually build a full application using claude code and codeex to see how each one performs, what kind of application it builds, how long it runs for, and what kind of results we're going to get out of it. And in order to do that, I've already set up a PD and a product road map for us to follow.

**1:34** · And this is going to give Claude Code and Codeex the context and the structure that it needs in this for/goal feature in order to be able to complete its work successfully.

**1:43** · Basically the road map that I've got set up is a set of tasks broken down that it needs to work through in order to complete the PRD. And so Claude code and codeex using the for/goal feature we are to work through this road map, complete each task, check it off and then it has a verifiable way of knowing that it's completed all of those tasks in that feature so that it can say okay I'm done. That's it. My goal is complete.

**2:07** · I've built the full app. I've built the PRD. And that's the key way here really to use this forward/goal feature. Now, if you want to read more about forward/goal, I have created a guide over on my website buildgreateproducts.com. And that is specifically for the codeex CLI/goal feature where you can read more about all of the subcomands to do with goal, how to use it in the best possible way.

**2:28** · And I'll put a link to that in the description down below so that you can go through and find out more. Before we actually build anything here, let me break down how/goal actually works. So here is the official documentation for the Claude code/goal feature and the codeex/goal feature and you can access these just directly through the documentation for claude code and codeex.

### Explaining how the for/goal feature works with documentation references.

**2:47** · And I've also, as I mentioned, created a guide on for/goal, which is a little bit easier to understand here for non-technical people over at buildgreateproducts.com, which just covers off what is the codec cli, what for/goal actually does, the four subcomands, life cycle states, how to actually write a strong goal, and some of the workflow and best practices that you can use when using this feature. So, do go over there and check that out if you want to learn more.

**3:10** · And if you're nontechnical as well, the developer documentation for for/goal basically says that the for/goal command sets a completion condition and Claude keeps working with it without you prompting each step. After each turn, a small fast model checks whether the condition holds and if not, Claude starts another turn instead of returning control to you. The goal clears automatically once the condition is met.

**3:35** · So basically, every time Claude completes a part of a a step in this flow towards getting to your goal, it will check very quickly if the goal condition has been met. And if it's not been met, it will continue working until it has. And this is almost an evolution of the Ralph loop. If you are using

**3:52** · Ralph loops before, if you've heard people talking about Ralph loops where basically you loop the coding agent to complete individual tasks based on a defined set of tasks so it will work on one task, complete it and then jump to the next one automatically without you having to prompt the model individually at each step.

**4:08** · Now this is an evolution of that basically and this also works with auto mode which is a feature in claude code and codeex which basically gives more permissions to the agent in order to continue working without constantly asking you if you do want to allow this or you don't want to allow this for every single tool call that the agent is making. Now there are some guides here on how to write an effective condition for goals and good conditions for goals are going to have one measurable end state. So that's what we're doing here where we're building this full application.

**4:37** · We've got a road map with a list of tasks that need to be completed in order to satisfy the goal.

**4:43** · The measurable end state is that every single part, every single task on that road map has been ticked off and has been completed and can be verified by the agent. Generally, these road maps for a full application tend to be between 40 to 80 tasks throughout a road map. So, it's going to be a pretty long thing for it to build. But this for/goal feature really takes us from a place where you are individually prompting to build separate features one at a time, even when you're starting building your app to a place where you could legitimately build a full application in one go to a very high quality.

**5:15** · Now, it's not going to be perfect after you've just built the PD. You're going to need to do a lot of tweaking on top of that, but it gives you a great foundation to get started with. Another way of working with for/old that is super useful is to add in constraints that actually matter to this. So, anything that must not change on the way there. An example of that would be that we don't want to touch a specific type of file or a specific part of the project or the app that we're building. And it says the condition here can be up to 4,000 characters for actually finishing the goal. Now, the documentation on for/goal forcex is pretty similar here.

**5:45** · It basically outlines the same thing. How the loop actually works, how to choose the right work. So, a good goal is bigger than one prompt but smaller than an open-ended backlog. It should define what codeex should achieve, what it should change, how it should validate progress and when it should stop. And the important part is that codeex should know what done means before it starts.

**6:07** · So this means we do have to be very specific about that end condition for the goal. And the codeex documentation here actually gives a bunch of example goals are really good as well. And so you can use this to feed into how you structure your own goals and also meta prompt in order to understand what goals could you possibly achieve. So just asking the question of Claude code and CEX based on what you know about me what goals would be beneficial to me and can you help me structure a goal before I get started can be a really good way of working with this but also just taking these frameworks and using them.

**6:36** · So we're going to use something similar to this which is the prototype creation. So implement plan.md creating tests for each milestone and verifying the output with playright interactive. And so we're going to do something similar here where we say implement the product roadmap.mmd. Build each task in the task list and then verify the output before moving on to the next task. When all tasks in the product road map are complete, this is the end of your goal.

**7:00** · And so I think for/goal is a super powerful feature. And with that all said, let's jump back into claw and codeex and actually build our app from scratch using the product road map. So now we're back in the terminal. Now, one good way to use for/goal is actually to jump into plan mode first in claude code or codeex just to get claude code to create a plan to have that verifiable end condition before you actually start building your feature or the goal that you want to complete instead of just writing a goal without any context or documentation that's too open-ended.

**7:33** · That's not going to give the AI enough context to be able to work correctly.

### Setting up the project and initiating the full app build using the for/goal command.

**7:37** · So, let's start building our app using for/goal include code and codeex. But before we start, I want to show you how I've set up the folders for these projects as well. So these have basically got a claude.md or agents.md at the root. And this has got the four kind of kpathy rules for claude.md and agents.md in here.

**7:56** · This is something that I use quite frequently in projects just to reduce coding errors from coding agents and it's something that you can consider including and I'll add the link to the GitHub down below so that you can duplicate these claw.nd and agents.nd MD files to your own repositories. I've also got this docs folder which has the PRD the product road map and also a design.md that I've generated from a set of images using my own skill um which is part of plaid which is productled AI development.

**8:23** · So you can get that skill over at plaid.build and again I'll put the link down in the description down below so you can get that as well. This just gives it a direction from a design point of view. So, I've used a couple of image references, created the design direction here in this design.md format.

**8:38** · And this is following the open- source format from Google for design.md files as well. And this is the basic foundation for building my app projects with all the context that we kind of need here to actually start building this. So, what we're going to do is we're going to go back to we're going to go into clawed code here and codeex and we're going to put this goal in here.

**8:58** · I'm actually going to tweak this slightly. We would say for/goal build the complete app outlined in docs.prd following the tasks on product roadmap.mmd until all of the tasks on the program are complete and verified.

**9:09** · Uh use design for the front end design direction. This is a fresh nextjs app build. So we are going to copy this goal back over to claude code. So I'm going to do goal and then we're going to put in the goal here and then we're going to submit this goal to Claude code and to codeex. So now we've submitted it to Claude code. I'm going to submit this to codeex as well.

**9:35** · Um and now both of these models are going to work through building this app for us in their individual folders. So I've got this set to content machine codeex. This is set in content machine claude. So we're building two separate app projects. So clawed code here is the goal with knowledge. Build the full apps from the PRD following the road map using design.md for direction. Plan mode is active. Starting with phase one exploration. Let me read the docs first.

**10:01** · The road map is 62 tasks across six phases. Let me check the PD for architecture and design tokens but only the most critical sections to keep context manageable. So it's now reading those files there. Codeex has saying the workspace is essentially fresh. Only agents.md and docs are present. There is no git metadata in this directory. The design file is design. MD. So I'm reading that plus the rest of the road map PR before scaffolding the app. The road map spans all 62 tasks for the repo has not been scaffolded yet.

**10:25** · I'm going to build this as a functional MVP with convex clerk polar YouTube openai integrations and safe fallbacks then mark task complete only after each area exists and builds. So we're going to say would you like to run the following command here. Do you want to scaffold the fresh next day.js app and install its dependencies in this workspace.

**10:43** · Let's do yes and don't ask again. I'm going to go back to Claude here. says, "Your goal says to use design.MD for visual direction to resolve these towards design.md." Basically, there's a bunch of stuff I think inside the PRD that also outlines design direction. So, we're just going to go with the design.

**10:59** · MD file here. That's what it's going to be using. Um, so let's leave claud code here and codeex to work through building these apps using for/goal. See how long they run for and the quality of the apps that they actually build. It's worth knowing that there's a few environment variables that I will need to add here.

**11:18** · I also need to hook up convex. It's probably going to add in some defaults that it can just use so that we can get this up and running without adding those in. But we'll see what codeex and claude code come back with after building this app using for/goal. So claude code is actually asking us some questions here before it completes the plan to actually get working on this goal. So which external service credentials do you have available right now? So we said scaffold everything with stops and mocks in memory data for the review queue and to-do at every integration point and then we can add those later.

**11:49** · So I mean I can add the you could add these in if you have them but let's just do build offline first. Going to go next here design source. Let's do design.md wins everywhere. The scope is all 62 tasks as code. Get um in it with no remote. Let's do that. and then submit these answers to Claude Code. Codeex is just off to the races. So, Codeex is already running and now Claude Code has everything it needs. Let's just leave it running and see what it builds. So, Claude Code and Codeex have both completed their goal.

### Reviewing the completed goal and the summary of the app builds.

**12:23** · They completed it in roughly the same amount of time, which makes me think that these work in very very similar ways. It's the same basically the exact same feature across both Claude Code and Codeex here. So the summary on claude code is that it built the entire app from the PRD and the product road map in a single offline first pass. All 62 road mapap checkboxes are flipped to X and committed to a local git repo. It's done all of this stuff. We can just run mpm rundev basically and check that this works. The convex functions can't actually run until you connect convex.

**12:54** · And obviously for payments and the YouTube authentication, it's not going to run until we add those environment variables either. And that's going to be the same in the codeex version. What I want to show you is just how well this did at setting up the basic foundation of our app here or how badly it did. I don't actually know the results of this yet for codeex. It's implemented the full fresh next.js app outline and marked the road map as complete and it's done all the same stuff again as well.

**13:17** · So we can just do npm rundev. In fact, it's actually started the development server here already. So we can go to localhost 3020 and see what this looks like. Both of these claw code and codeex ran for about 32 minutes. So 30 yeah 32ish minutes across both of them to complete that goal which is quicker than I thought it was going to be. I thought it was going to take a lot longer than that but it's actually completed it very very quickly.

**13:41** · So I'm interested to see what it's actually put together here if it's any good if it works or if goal is actually better for slightly different tasks. So let's jump over to the browser and compare the two versions that Codeex and Claude Code have built here to see where the differences are and which one has done better. So here is our full application that has been built by this one is by Codeex. So we've got Codeex here basically has built this landing page here. So content engine turn every YouTube video into a week of social content. Turn every YouTube video into platform ready social in minutes.

### Comparing the final applications built by Codex and Claude Code

**14:12** · Detects new uploads, extracts the transcripts and draft posts for each platform. We can view demo workspace or get started for free. I think the demo workspace is what is set up here. so that we can get a sense of how this works as like a prototype view. Um, and then we can wire up all the environment variables after this separately if we want to continue this project. It's got like a how it works section here like connect generate review built for platform native output Twitter X LinkedIn threads Instagram platform native generation niche example library review Q. It's like pretty sparse on the information on the learning page.

**14:41** · I think Claude is generally better at writing copy, doing this like kind of conversion rate best practice stuff. Um, anything kind of like creative. Although the actual landing page here doesn't look too bad. This follows the design.

**14:56** · MD like pretty closely. I wanted to use these kind of red accents. Pretty clean design, soft shadows, these rounded cards with kind of just the red accents throughout. And I'm using Guist as the font here as well and not Inter which makes it look a little bit better. I would highly recommend just not using in for any app design that you do, any website design that you do, just because it is so AI slopreated. Now, um, we've also got this version here from Claude, which has a lot more text, but it's following the same kind of blueprint here.

**15:26** · Doesn't have an image in the top here. Codex has picked an image for us and added that to our project, which is pretty interesting. on the content machine version here with Claude. We can't. We don't have like a demo version, but we can assume we can just use the app here and see what it looks like. So, let's go through the codeex version, see how it works. If things break, things are definitely going to break here, but it's going to be a good first pass. It's going to be a good foundation that's going to give us a better result than just prompting it to create the full app without using forward/goal.

**15:55** · It has that kind of built-in looping mechanism where I can go back, verify the output, do the next task, and kind of do it that way as well. You could use for/loop with claude, but I'm trying to test forward/goal here. So, let's see the actual demo workspace that we've got here. So, I want to go back actually for a second. Let's do get started free and see what happens. So, we do get started free. It says clerk is not configured locally. Try the demo. So, it's added in some fallbacks for us here, which is quite nice. This would show like a clerk authentication screen. um if it was wired up correctly.

**16:28** · We need to set up clerk, but it's hooked it all up correctly, I assume, in the code. Um we can view the demo workspace. And this is like there's definitely some design improvements that we can do here. It's pretty like blocky in terms of all of these elements. Says your first video will be processed shortly. Add niche examples while you wait. I would want to massively improve the on like so we want to make sure that we've got a decent onboarding flow here and that we're actually kind of adding more some more information hierarchy to this.

**16:58** · We can see we've got our channel connected at the top here. Creator systems lab processing the creator dashboard. I wish I had earlier. This is like loading.

**17:07** · It's giving me an example. So this is kind of like a prototype view of this which is it's pretty useful sometimes to build little prototypes of what you actually want to build before you build the entire product. Um, we've wired up a lot of stuff in the background here, but this is good as a prototype to look at.

**17:22** · This says there's four ready, one processed. The free trial is used, four posts to review. We can jump into reviewing them. Recent videos. You've seen what content engine can do with one video. And then we can upgrade our plan here. So, this is on like the free plan.

**17:34** · If I click choose plan here, what's it going to do? It's going to come through to a billing section where we can choose like solo or power. Let's choose power.

**17:42** · Um, and then says, so we're on the free plan. So, none of this stuff actually works. We've got to hook up Polar and a bunch of other stuff as well. Let's go back to the dashboard and see what else we've got. We can send feedback about this app. We've got the recent videos that we can click through to along with the different states for those as well.

**17:58** · Magic moment target signup connects channel and C post in 5 minutes. Now, this is something that's defined in the PRD, the outputs from my project productled AI development skill where we want to include this magic moment um as part of our application in the first 5 minutes of the user experience. And generally that happens in our onboarding. I don't know why it's added it in here. Um it's also got power workflow batch review copy and refine every post from one queue. We've got a link to community here as well. So there's a bunch of stuff that we want to change here. Let's go through the menu on the left hand side. So review Q.

**18:29** · So this is this looks pretty nice. Um click any post to edit and hit copy when it's ready to go. So it's kind of added these tool tips in here to kind of guide me through this experience. The design is also looking pretty decent as well. And and that's where you get like this kind of level up in design. It's not incredible, but it is better than the kind of basic um generic AI slop design that you get because we're using that design.md file as the reference. Now, we've got a bunch of Twitter.

**18:59** · So, we've got X posts here. Batching is not about doing more work. It's about making every useful idea travel further before you move on to the next upload. Now, one thing that we would do next here is to basically put in a YouTube URL, connect up YouTube uh oorthth, and then see if we can extract the transcript in here to actually get these posts generated.

**19:20** · We've also got our we've got buttons here for regenerate, edit, copy. So, if I click edit here, I can actually edit this post, which is great. That means it's autosaving edits as well. So, that means I can then like either copy this or I can I don't know if there's like a click. It would be great to click like schedule. I can bookmark these as well.

**19:39** · Um, save them. Uh, and I can also filter at the top here by platform. So, we've got a LinkedIn. We've got a LinkedIn version here as well. Uh, regenerate. We can regenerate this post. Add direction for the next version. Make it more contrarian. Leave with the practical checklist. This is actually pretty decent. And this modal like looks pretty good as well with the red glow under that button for the primary button. I'm actually pretty impressed like overall with the with the foundation of the design that we've got here. Especially coming from Codeex 5.5 and GBT 5.5. It feels pretty decent. Now, all of these ideas are like fairly generic.

**20:11** · Where this is going to actually work is where we feed in like the AI capabilities to this and use the example prompts that we have in this library here. So, it would be great to have an AI feature in here to actually scrape these social channels to find examples of posts that do well in our specific niche so that we can curate a library of those in order to take our YouTube transcript and then turn that into posts that we can share across social and even add in a scheduling feature. Now, I might not have known that when I first started writing the PRD.

**20:43** · And this is why I think it's actually really beneficial sometimes to just get a P down, build the application, and then you can figure out all of the different bits that you actually want when you're inside of the even the prototype version of the application that we've got here. We've got videos here as well. So these are the videos from placeholder videos from my channel. No transcript. We've got a few different like states here as well.

**21:04** · So you can see like this one is loading.

**21:06** · It says processing underway. We've got an error state here with a retry button.

**21:10** · And we've got a settings page and a billing page as well. So, we got our settings with our platforms that we've got connected and a billing page. I'm pretty impressed with this overall.

**21:20** · Like, obviously, this is not hooked up to like any data. Uh but all we have to do here if we want to do if we want to set this stuff up is to go back into the terminal to codeex and all we have to do is to ask it um now you can do like forward slash review um in codeex which is really good to review the current changes and find any issues in that code but we can also just prompt codeex to say like guide me step by step through setting up everything I need to deploy

**21:50** · this app and that's going to guide us step by step through setting up everything that we need here.

**21:55** · Environment variables, deploying to Versel or wherever you want to deploy it. It's going to guide you step by step. And this kind of like creation process is getting condensed massively with these new features like forward/gold to the point where it's even viable to build a full application in just a matter of hours sometimes.

**22:14** · Let's jump over to the Claude version and see how Claude fared. Now, this is the content and the copy is better on the landing page. Here we've got a lot more detail in this stuff and it's actually got headings for each of the sections which GBD 5.5 didn't do. Um we've got like a testimonial down the bottom here which is great. Let's click get started free and go through here.

### A detailed walkthrough of the app built by the Claude Code agent.

**22:35** · This is maybe going to take us to Okay, so we're going to start with the demo channel. So this is in offline mode.

**22:40** · Real signin activates this. So we need clerk to be set up. We've got a demo version demo version here. So let's start with the demo channel here and see what it pulls back. So it's actually really really similar from a design point of view and that's because it's using that design.md as a reference point. So the design between these two you can see is very similar. And when you're using that design fornd reference you're going to get around any like specific design direction from a a given model. Basically we've got our channel that is connected here.

**23:08** · Jordan builds 10 posts ready to review now processing videos processing post generated niche examples or and we've got an upgrade on the dashboard here which I actually like better having this upgrade like directly on the dashboard at the bottom here. You could even have this more visible to be honest. We got our review queue here.

**23:28** · So, we can go into this, see all the posts across all these different channels. The tabs on the G on the codeex version are actually much nicer.

**23:35** · We've got some of the icons like pulled in here, although it hasn't found like they're looking a bit weird. We can edit these. Um, we can copy them and we can regenerate them with the instructions here as well. And this has given us the same experience because this is all defined in the product road map and the PRD. This is all coming from building the product robber and the PD.

**23:53** · And this is how you get consistent output with AI coding tools is to have those specs down beforehand and also how you get around the unique quirks of individual models by having detailed specs to kind of outline what you're building before you start building. And if you want to create those detailed spec documents, the PRD, the product robot design, you can go to plaid plid.build build and download those skills to help you go through and use the exact same process that I use when building applications.

**24:24** · The same as you've got here. We've got our example library here. So, we don't have any examples in the library. We can add examples here. Again, it would be great to have like an AI scraping um feature in this app. We've got videos.

**24:38** · So, these are the example videos are connected here. Again, I kind of like the codeex version of this better. We've got our settings with our connected channels and we've got our billing page with our upgrade method and our plan details which is perfect. We've also got links to feedback and creates a community down the bottom there. And that is our app.

**24:56** · So, I'm pretty impressed with the way that/G goal has been managed to build our entire application through 62 different tasks to set up the app in about half an hour going from that product road map and PRD document to giving us a decent

**25:13** · foundation for our application that we can then start to build on top of and just ask codeex or claude what are the steps I need to do to actually get this deployed and live and it will guide you through adding all of those things like environment variables deploying to versel setting up convex and all of that stuff. And it's going to give you the commands to do that and even run a lot of those commands for you as well. So that is how to use for/goal, what it is, what it does, how to use it correctly, how to use it with spec documents, and how to use it to build entire apps in just one go in about 30 minutes.

### Final summary and best practices for using the for/goal feature effectively.

**25:44** · So you can see the power of for/goal use include code and codec to do these complex longunning tasks with those agents in a way that is going to be really really successful and give you a great foundation if you're building your entire application that way. And the keys, as I mentioned, is to make sure you've got the right spec documents, to make sure you're giving the AI the right context, and to make sure that you've got a clear end criteria for that goal so that the AI knows exactly when it should stop working on that goal instead of just keeping on going.

**26:15** · And this is really introducing an entirely new way of building with AI agents where instead of just prompting back and forth, we're allowing the AI agent to decide what all of these different tasks are based on a longer running goal, which is a bit of a mindset shift. if you're used to prompting back and forth to build something, but it is incredibly powerful. So, if you are building with AI, I would highly recommend checking out for/Gole in Claude Code or in Codeex, try building something big or even an entire application.

**26:42** · And if you are building with AI and you want to build real applications and real software and launch them to real paying customers, then I've got a community helping people do just that over at school.com/apps.

**26:54** · You can click the link in the description down below. If you enjoyed the video, don't forget to like and subscribe. Thank you for watching and I will see you next