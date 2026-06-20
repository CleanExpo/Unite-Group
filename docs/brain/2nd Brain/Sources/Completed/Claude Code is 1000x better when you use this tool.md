---
title: "Claude Code is 1000x better when you use this tool"
source: "https://www.youtube.com/watch?v=VQPWyS2KGt0"
author:
  - "[[Alex Finn]]"
published: 2026-05-18
created: 2026-05-19
description: "Here is the one tool you need to make Claude Code so much more powerful. You are going to love this workflow2nd Youtube Channel:  https://youtube.com/@AlexFinnLabsOfficialFULL Claude Code bootcamp"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=VQPWyS2KGt0)

Here is the one tool you need to make Claude Code so much more powerful. You are going to love this workflow  
  
2nd Youtube Channel: https://youtube.com/@AlexFinnLabsOfficial  
FULL Claude Code bootcamp in the Vibe Coding Academy coming up: https://www.skool.com/vibe-coding-academy  
Sign up for my free newsletter: https://www.alexfinn.ai/subscribe  
Follow my X: https://x.com/AlexFinn  
Henry Intelligent Machines (my new startup): https://meethenry.ai  
My $300k/yr AI app: https://www.creatorbuddy.io/  
  
Prompt: I want to build out a prompt library app. this should be a nextJS app that allows us to save prompts into a library and access them again whenever we want. we should be able to save them into folders and catagorize them and optimize them. please before we begin build out all of the issues into Linear so we can stay organized as well as the projects inside the creator buddy team  
  
Agent instructions: https://docs.google.com/document/d/17SFgrJ-\_n1D8khybHTpuTeyBtS71Zq4ezatsABVOn-U/edit?usp=sharing  
  
Timestamps:  
0:00 Intro  
0:35 The tools  
3:26 Setting up the plugin  
5:36 The prompt  
10:26 Building the app  
13:58 Testing the app  
16:19 Advanced workflow

## Transcript

### Intro

**0:00** · I found a free tool that will increase your Claude code velocity by 100x. The tool I'm about to show you basically acts as a second brain for Claude code and code x, allowing you to vibe code so much faster, stay organized with everything you're building, and even work easily across all your devices, mobile, iPad, computer, whatever. If you stick with me until the end of the video, I promise you'll learn a new workflow that will make you a way better vibe coder, be a master of Claude code, and even build your own awesome app.

**0:33** · Now, let's lock in and get into it. So, what I'm going to show you in this video is a really amazing workflow with Claude code. You can also use code x for I mean, you basically can use any vibe coding tool, cursor, Claude code, code x, whatever you want, and linear. Now, this is not a sponsored video from linear. I have just been using linear a ton with Claude code and code x lately, and it is seriously like blown my mind what I've been doing with these tools.

### The tools

**1:00** · If you're anything like me, you have a laptop, a desktop, your mobile phone, maybe an iPad, and it's been very hard to kind of build across all of them.

**1:09** · What linear has done in the workflow I'm about to show you with it, which by the way, completely free tool up until like a really high usage ceiling, has allowed me to like not only work across all those devices, but work so much faster, too. Basically, the way this works, for those not familiar, linear is a project management tool. What makes it really, really good is it's fully integrated with Claude code and code x. It picks up what you're working on, it integrates with your GitHub, so it knows what code you're shipping. What it does is it allows you to use this like a second brain.

**1:40** · So, as you're building your apps, it will take every task you're doing, which in linear it's called issues, and organize it very nicely for you. What linear does is take everything you're working on inside Claude code or code x, organizes it into these issues and tasks and makes sure that Claude Code knows everything you need to build, all the next steps, the details of each, and just keep everything organized. It's all based in the cloud, too.

**2:07** · So, if you're using Claude Code on a different device, it can immediately look at your Linear, know what to work on next, and pick up from there. Trust me, everything I'm about to show you will make your vibe coding experience so much nicer and so much faster. So, do me a favor, download Linear now if you haven't yet. It's completely free. You don't even need to put in your credit card. Get that going, and then open up whatever your preferred vibe coding tool is. If it's Claude Code, CodeX, it's going to work the same with both. I actually use both at the same time now, CodeX and Claude Code.

**2:37** · They both work off Linear. So, it actually like ties the two tools together. What we're going to do is we're going to build an app out together. I'm going to show you this workflow by building an app from scratch with you, how everything ties together and works together. So, what you want to do is once you have Linear downloaded, just create a new team. Teams are like the high-level app you're building. As you can see, you can see my two SaaS's here, Creator Buddy and Him. I'm going to use my Creator Buddy team for this, but you can name it whatever you want.

**3:04** · We're going to be building a prompt library app together. So, if you want to call your team prompt library, you do that, you'll be good to go. If you just want to watch along, you can do that, too. I think great experience is building alongside of me. But, if you just want to watch, learn it, and then afterwards do it, you can do that as well. Once you have that downloaded and set up, very easy, we're going to go back into Claude Code. Then, we're going to use the Linear plugin. So, if you go to customize, and then you go connect your apps, you can search for Linear, and boom, there it is. You click that, you log in, you're good to go, it's connected.

### Setting up the plugin

**3:36** · Your Claude Code or your CodeX knows exactly how to communicate with Linear now. It works the same way in CodeX. If you're doing this with CodeX with me, there's like a plugins in the top left. Literally the same exact process. So, what we're going to build now is a prompt library app. I love this idea because you can take your prompts you use regularly and save them to this library so you can reuse them whenever you want. So, the the prompts that work best for you you can save this library, you reuse them. The best apps to build are the ones you'll use over and over and over again. I think this is a really good one.

**4:06** · We're going to build it together. So, we're going to start up in a new folder here called prompt library.

**4:11** · First thing we're going to do is make sure that Claude coder Codex can see our linear setup, see the new project we just made. So, I'm going to say, "Do you see the creator buddy team inside Linear?" We're just going to confirm it can see everything. We're going to trust this workspace. And what we're going to do once this is detected is we're going to discuss the app we're going to build, plan it out, and what it's going to do is create a whole bunch of tasks and issues on our Kanban board here.

**4:40** · So, it's going to spec out our entire app, build out each task, put in all the details, so whatever coding agent you use knows how to build these out, and we're going to start building these out one by one. One other thing I'm going to show you is I'm going to give you a Claude.md file or an agent.md file if you're using Codex that will make this so much easier for your coding agent to do. It'll basically give it rules that say, "Here's how you use Linear. Here's what you do." And it'll keep it consistent across all your sessions.

**5:10** · So, that's coming up in a second as well, those rules files I'll give you. Okay, it can see it perfect. So, what we're going to do now is basically set up this project. Right, we're going to go with Claude code, have it plan out this prompt library we're going to build, and it's actually going to set up in Linear automatically all the tasks, issues, details, all of that. It's basically going to set up our second brain. So, let's do this. So, here's the prompt.

### The prompt

**5:38** · I'll put this down below. Feel free to pause, copy, and paste it if you're working alongside me here. I want to build out a prompt library app. This It be a Next.js app that allows us to save prompts into a library and access them again when we want. We should be able to save them into folders and categorize them and optimize them. Please, before we begin, build out all of the issues, again, issues are tasks in Linear, into Linear so we can stay organized as well as the projects inside the Creator Buddy team.

**6:05** · So, projects are a higher-level grouping of issues so we can stay organized. I'm going to hit enter on this. It is now going to, through our integration, and you'll be able to watch this live, actually build out all of those issues inside of this team. So, we'll be able to see it make all the issues. And what this is going to do is basically organize our thoughts. Before we start building, build out all the tasks so that as we build this out with Claude Code, it knows exactly what to build out next and the details of each.

**6:38** · And the advantages here are a few things. Keeps it organized so you don't get drift. Claude Code Codex won't drift and start working on things you don't need. It allows you stay organized to know what's going to be built out next if you start automating this and allowing your Claude Code to go off and build things. It allows you to work between different devices since Linear is on the cloud. If you open this up on a laptop, you open this up on your iPhone, it'll all feed from the same task list so they're all working together, all your agents across different devices.

**7:09** · And it'll allow you to have to think a lot less. So, instead of having to think of every task you want to work on next, you can just say, "Hey, Claude Code, work on the next task." And it just goes and does it, saving you tons of time.

**7:21** · So, as you can see, I just went to projects. You can see it's building out all the projects. So, the foundation and setup, made it high urgency. Prompt management, made it high urgency.

**7:31** · Organization, prompt optimization. It added all these projects in. If we click in, you can see here, and this is what makes this integration with Claude Code so good in the Linear. Before, when you did project management in Linear without AI, you would have to set this all up yourself. The goals, the scope, the out of scope, the prioritization, the status. That was all manual. Now, this is all automatic. This is basically just the brain of your AI. You don't need to manually change here anything yourself.

**7:59** · Now, if I go into issues, let's see if it's built out any issues yet. Yep, I go to all issues and boom, you can see all these issues being made in real time and being put inside of the different projects that are inside your prompt library app here in Linear. This is also really good if you're vibe coding with other people. So, if you have a team, I'm going to give you kind of a bonus section at the end here that shows some really cool things you can do if you integrate this with Slack as well. If you have team members, that's going to be amazing, so stick around for that, too.

**8:29** · But, this is just going to set up kind of all the wiring and tasks and everything we need uh to get worked on here. As you can see, boom, all these new hires and see tasks are coming in.

**8:39** · Literally as I speak, you can see them filing in. I don't need to manage all myself. View our software developer for this would literally be hours of work filling this out. Now, Claude Code built in Linear makes this all really easy use. Again, this is not sponsored. I just really love this workflow and think it's super, super impactful. Again, if you stick with me to the end here, your entire vibe coding workflow is going to change, I promise you. All right, looks like it's all complete. Let's check out the issues it built, the projects it built. Look at all this organization. It made 90 different tasks for it to do. It categorized it. It gave it priority.

**9:13** · It gave it dates. It gave it details. It told it gave it exact acceptance criteria so no one knows what to build.

**9:22** · This is not only going to keep us organized, but this is also going to give us significantly better results.

**9:28** · This basically forces the AI to think to itself, "Okay, what do I need to build, in what order, and what is the acceptance criteria so we know this works well." When you just say, "Hey Claude Code, build me this or Codex build me that," it just goes it can drift. It doesn't know when the real end is. That's how you get a whole bunch of slop. This is how you stay organized and make sure you get really good results.

**9:50** · And if you have the bonus of working with a friend or a partner, you can have it assign tasks to people and just keep things moving. Okay, so now that we have all these tasks, we have all these projects, what do we do here? Now, we can put this even in a board view. We can see everything here. How do we get started? Well, now let's start working with Claude Code and have it start building. It's going to work off this task board and get our app built. I don't care if you're a beginner or advanced user of Claude Code, I think you need to be putting this into your workflow. I'm going to be deadly honest.

**10:21** · The results I've been getting have been so much better since doing this. All right, now we got all the issues set up.

### Building the app

**10:28** · Let's do this. It's time to start building our app. But how do you build with this second brain? What's the difference in your workflow? Well, we're going to lean a lot more on our organization. We're going to lean a lot more on Linear. What do you mean by that? Well, look at this. I want to start building. What should our first few issues be? I'm going to hit enter and then again, issues being the tasks inside Linear. It's going to go. It's going to look at our Linear board. It's going to see what should be the first few tasks we should tackle.

**10:55** · It's probably going to be scaffolding the app, setting up Next.js, things like that. And now it's going to tell us, "Build in this order. Scaffold Next.js, Genius, install Tailwind, provisioning all that." This is great, right? Now it's super organized. It's going to stay on task. It's not going to drift and set other things up, and we're going to start building. For the sake of this video, I'm going to have it skip doing off and skip the database so we can keep this quick, but we're going to start and we're going to give it permission to start building this app.

**11:24** · And what you're going to see here is as it works, you will see the tasks right there go from backlog to in progress to complete. And now it's just going to kind of in automated way take tasks, work on them, and go. So, one thing you'll be able to do now that you weren't able to do before is just say, "Hey, Claude Code, go and just start tackling tasks. Take issues from backlog, work on them, and complete them." That's not something you could really do before.

**11:50** · Now, if you work very carefully with your Claude Code and make sure all your issues and tasks are up to date inside a linear, which is really easy to do as I showed you, you can just say, "Hey, have at it, go to work." You can go by the pool, sip on a pina colada, and your Claude Code is just going. This second brain adds so much efficiency and speed to your workflow. Okay, and as you see here, it's moved the scaffolding to done. We now are installing Tailwind and Shadcn, so a lot of the visual stuff.

**12:18** · And you see, everything is perfectly organized, put in the right project, right urgency, all that. So, this is just managed by the app. If you were doing this without linear before, you'd have to be doing this one by one, think of every step to do. Now, it's organizing and managing itself, which is amazing. And you can see as you go along here, it's saying, "Okay, I'm updating this task. I'm updating this." It really It's really really nice the way it works. And look at this, this is amazing. It's testing itself now in Claude Code. A really cool feature in Claude Code.

**12:45** · It built the app, it's testing itself, it's building its own prompt and clicking on things and going through the workflow. It's amazing. It's basically autonomous at this point. Linear basically put a brain into Claude Code, made it autonomous, and now it's able to go through. You're watching live each one of the issues, build them out, test it itself, mark it as complete, make sure it hits the acceptance criteria we just saw in the issue, and then move on to the next one.

**13:13** · This is turning Claude Code from a basic vibe coding tool to its own AI agent software engineer employee. Okay, and boom, looks like it's all done. So, it did 17 different tasks in one go. 17. I promise you we were not using linear as a second brain here. It would not do 17 tasks. It probably complete the first one and say, "Hey, what do you want to do next?" And let's just take a quick look at our board. Done. Actually, there's 18 tasks in done. All these were done.

**13:40** · Toast notification system, delete prompts, favorite star prompts, copy prompts to board, sidebar folder tree, tag input, filter library by folder. All of these were done completely autonomously.

**13:55** · Basically, a third of all the work we need to do. And let's just test it out ourselves here. If we close this, you can see here in the sidebar the tags, the actual prompt itself. Let's put in a new prompt. Build our app. Build a second brain app. Let's save the prompt.

### Testing the app

**14:12** · It works. Boom. It goes in there. It actually kind of looks like linear, doesn't it? Kind of a little bit. This is how you have an autonomous employee working for you. If you weren't If you weren't using linear, the next step here would be, "Okay, now we need to build this." Right? And you're constantly thinking of what you need to do next.

**14:28** · Maybe you forget what you had to build before. But now you're organized, right?

**14:31** · Now, again, we can say, "Okay, move on to the next task." And it will do it. No more thinking. You're basically turning into what I believe the future of AI and Vibe coding is, which is basically you have a stamp and you go, "Approve.

**14:45** · Approve. Approve. Approve. Approve.

**14:47** · Approve." That's all you're doing. This is basically what linear turns the experience into. And now, let's take this workflow up to a second level. I can pull open Codex here. Now I have Codex on the right. I can open up the same project in Codex, say, "Hey, check out our linear board." And say, "Move on to the next task here." And now we have two agents independently working on our project for us. We don't need to get Codex up to date with what Claude code's doing or vice versa.

**15:16** · They're both just looking at our linear board, figuring out what's the next task they can move over to in progress and doing it. This is how you take knowledge and move it across AI agents, move it across devices if you want to, but how would you take this to next level?

**15:31** · Here's a little bonus workflow for you.

**15:33** · Now, there's more things to do here.

**15:35** · There's more advanced parts of this workflow. One thing I'd highly recommend doing is having it so that every single one of the issues, this is kind of next level stuff, is going to be a GitHub branch. What this does it makes it so every single one of the tasks is in its own branch, so that you can make a pull request for it and review it yourself.

**15:57** · This keeps all of the code separate and organized so that it doesn't really step on each other's toes. This is very important if you're going to use multiple agents to do things here so they don't overwrite each other's code.

**16:10** · This is also important if you have partners working with you. Getting ready to show you some cool stuff if you have a multi-team approach here so that you don't step on each other's toes as well when it comes to code. So, this is one of the tasks I have in Henry Intelligent Machines, which I'm currently building, link for that down below if you're interested. Uh if you go down in the comments, all of these comments are automated. Claude Code's handling all this for me, but you can see it puts in the GitHub branch URL. So, everything is stored nice and organized.

### Advanced workflow

**16:36** · Every issue has the link to its GitHub branch and you can go in and create a pull request that you can review. How do you do this though? How do you set this up? Well, this next step is super important. This next step sets the rules in all of your agents so that it follows this new workflow the right way. So, you need to make sure you have an updated claude.md file if you're in Claude Code and an updated agent.md file if you're in basically any other tool.

**17:02** · So, check this out. I'm in Cursor here just so you can see the code. This is my agent.md file. This basically has the full breakdown of all the instructions of this workflow I'm showing you right now and I'll put this down below. I'm sure YouTube might complain about this, so I might put it in like a Google Doc and just link to the Google Doc in the description. But, this is the agent.md file. And what this is going to do is describe exactly what your agent should do.

**17:27** · So, before doing any code editing, read the linear issue, read the spec, make sure you update everything, make sure you go up until the acceptance criteria, don't change any unrelated files, don't refactor anything you don't need to refactor. And then it talks about how to create the pull request, right? So, the pull request being once you're done writing the code, then there's a request made that you can review. And if you hit accept, it merges the code into your main branch.

**17:54** · By the way, if this is all kind of foreign language to you with GitHub, let me know down below. I'll make like a GitHub dedicated video to exactly how it works, what all the terminology means. I'm not sure my audience what kind of level of familiarity you are, so let me know in the comments down below. But, this basically goes in and explains how to use Linear, how to create pull requests, all of that. So, everything flows nicely. I'll put this agent.md file down below as well. And you just want to paste into all your agents.mds and all your Claude.mds.

**18:24** · This will make sure your agents are up to date with how to use Linear and GitHub and everything we're doing here. Taking it even a step further though, let's say you want to take this to the next level. Let's say you have teammates and you want to make sure everyone stays up to date. This is where Slack comes in. Slack has an unbelievably great integration with Linear and Claude code and Code X as well. Many things you can do here. I have two channels, a notifications for Linear, a notifications for GitHub.

**18:52** · What this allows me to do is see anytime a Linear issue is updated. So, anytime it's changed, the status is updated, anything like that, it sends a notification to Linear notification. If any pull requests are made in GitHub, any code is merged, it sends that update to the GitHub channel. And now me and my teammates can see what we're working on, what's changing, what's been updated, and keep us all in the loop. This is how you close the loop of all your building, right?

**19:20** · Your agents are going off, they're being autonomous, they're writing code, they're updating linear, and you and your teammates are being up-to-date in this one centralized location in Slack. This Slack integration, linear integration, all of that is done right directly in Claude code. So, if you go in here and you go into customize, you can plug in Slack as well. And it all just kind of ties together and keeps everything up-to-date really, really nicely. This advanced workflow, as I built this out, I don't use any other workflow.

**19:47** · Everything's done in linear and Slack now. It it it keeps it so easy, especially as you're adding in more agents, using different devices, everything just stays synced and up-to-date, and most importantly, autonomous. So, you save tons of time.

**20:01** · If you learned anything at all, make sure to leave a like down below. Let me know in the reply section what you want to see at next. Do you want to see a Hermes use case video? Do you want to see deeper workflows into Claude code?

**20:13** · Do you want to see a video on like the new Codex mobile app? Let me know down below. I'll make a video on it. Also, doing a full boot camp next Friday on this workflow in the Vibe Coding Academy. Make sure to join that. Link for that's down below. It's the number one AI community on planet Earth. I promise it'll be the best decision you ever make in your life. Hope this was helpful. Truly grateful you'd watch these videos and learn with me. It means the absolute world. I'll see you in the next video.