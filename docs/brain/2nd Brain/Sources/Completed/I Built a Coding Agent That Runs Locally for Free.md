---
title: "I Built a Coding Agent That Runs Locally for Free"
source: "https://www.youtube.com/watch?v=L_AMm7fD7tQ"
author:
  - "[[Leon van Zyl]]"
channel: "Leon van Zyl"
published: 2026-05-06
created: 2026-05-08
description: "🚀 Ready to level up? Get full access to my Agentic Coding Masterclass, weekly lab challenges, live Q&As, and a community of builders: https://www.skool.com/agentic-labsBuild apps on autopilot with"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=L_AMm7fD7tQ)

🚀 Ready to level up? Get full access to my Agentic Coding Masterclass, weekly lab challenges, live Q&As, and a community of builders: https://www.skool.com/agentic-labs  
  
Build apps on autopilot with LocalForge, a free open-source coding agent that runs entirely on local AI models through Ollama or LM Studio. In this tutorial, I’ll show you how to set it up, connect local models, plan features, run agents in parallel, and build real apps without paying for Claude Code, Codex, or expensive API tokens.  
  
📃 Github Repo: https://github.com/leonvanzyl/localforge  
  
⏱️ CHAPTERS:  
00:00 - Free Coding Agent Demo  
01:00 - Agent Builds Features  
02:05 - Why Local AI Matters  
03:06 - Download Local Models  
04:03 - Ollama vs LM Studio  
05:00 - Model Context Settings  
05:55 - Install LocalForge  
06:55 - Configure LocalForge  
08:02 - Create Your First Workspace  
09:03 - Run AI Coding Agents  
10:05 - Add Features Manually  
10:38 - Plan Apps With AI  
12:10 - Generate Feature Backlog  
12:39 - Local Model Limitations  
13:07 - Better Feature Planning  
14:09 - Use LocalForge Skills  
15:03 - Build With Detailed Features  
15:43 - Run Agents on Autopilot  
  
Business & sponsorship enquiries: leon.vanzyl@gmail.com  
  
#localforge #agenticcoding #vibecoding

## Transcript

### Free Coding Agent Demo

**0:00** · <b>Hey there, I just bought an autonomous</b> <b>Honeyfree models. You simply describe to</b> <b>the agent what you want to build. It then</b> <b>plans the features, adds them to a</b> <b>Can-ban board and it starts implementing</b> <b>all of these features on</b> <b>Autopilot and at the moment this is</b> <b>actually running using Alum Studio, but</b>

**0:19** · <b>it also supports Olamma as well</b> <b>And you can build whatever you want</b> <b>starting with a very simple to-do app</b> <b>like this retro to-do app</b> <b>And I really love the</b> <b>effects in this application</b> <b>Application and you might even recognize</b> <b>this Claude Code clone from the autumn</b> <b>forge video from last year</b> <b>But believe it or not, we can now build</b> <b>all of this using free</b> <b>models and yes, everything works</b> <b>Let's send a query and we can see the</b>

**0:45** · <b>result is streaming in keep in mind guys</b> <b>This is all using free models and about</b> <b>five or six months ago</b> <b>We had to use paid frontier models to</b> <b>build something like this</b> <b>and using this is just so easy</b> <b>Let's go to this retro to-do app</b> <b>So we can say add a fun tip of the day</b> <b>somewhere in the app and I'm just going</b> <b>to create this feature</b> <b>This gets added to the backlog and yes</b>

### Agent Builds Features

**1:09** · <b>There is an AI driven feature as well</b> <b>that will automatically take a complex</b> <b>task and break them up</b> <b>into individual features</b> <b>I'll show you that during this video now</b> <b>that we've added this task</b> <b>All we have to do is run the queue and</b> <b>this will add the task over to a coding</b> <b>agent and the task has moved</b> <b>To the in progress column we can see</b> <b>exactly what the agent is</b> <b>doing as well by expanding this</b> <b>And here we get the full</b> <b>output from the agent SDK</b> <b>this agent is also able</b> <b>to open up the browser and</b> <b>Visually test the application end-to-end</b>

**1:39** · <b>if we open up this card</b> <b>We can see exactly what</b> <b>happened during this implementation</b> <b>So we can see all of the agents output</b> <b>over a year and we even get the</b> <b>screenshot that the</b> <b>agent took while testing this</b> <b>And also just above the logs</b> <b>We also get all of the attached</b> <b>screenshots and here in the screenshot</b> <b>We can indeed see the tip of</b> <b>the day as it was being tested</b> <b>Now the first thing I want to mention is</b> <b>that this is completely open source.

### Why Local AI Matters

**2:05** · You</b> <b>don't have to pay the users at all</b> <b>I'll show you how to download it</b> <b>If you want feel free to fork it do</b> <b>whatever you want with this project</b> <b>This is really something that I want to</b> <b>encourage people to try and</b> <b>the reason for this is simple</b> <b>Frontier models are</b> <b>getting really expensive</b> <b>Even if you're on a cloud code</b> <b>subscription you have noticed that you</b> <b>actually eat your u6</b> <b>limits really quickly these days</b> <b>even if you look at models from open AI</b> <b>GPD 5.5 is double the cost of the</b> <b>previous models.

**2:37** · These frontier models</b> <b>are getting insanely expensive</b> <b>Yet on the open source side of things</b> <b>We're seeing all of these tiny models</b> <b>come out that can run on</b> <b>consumer grade hardware</b> <b>And they're really good at calling tools</b> <b>and writing code. These</b> <b>are also multi model models</b> <b>Which means they do</b> <b>have vision capabilities</b> <b>That's how the models able to open up the</b> <b>browser and view the actual results</b> <b>In fact while we're on a llama, let's</b> <b>actually download a model that</b> <b>we can run on our own machine</b> <b>So I recommend either queen 3.6 or jml4</b>

### Download Local Models

**3:11** · <b>But I do want to be very clear on this if</b> <b>you are planning to use jml4</b> <b>You do need to use the</b> <b>31 billion parameter model</b> <b>Unfortunately, the 26 billion parameter</b> <b>model and the ones below it are simply</b> <b>not good enough at doing tool calling</b> <b>I've also tested this model on an RTX</b> <b>4070 GPU and it works</b> <b>Personally, I really</b> <b>like the queen 3.6 model</b> <b>So I'll download the queen 3.6</b> <b>35 billion parameter model and I will</b> <b>show you how to download this using a</b> <b>llama and lm studio for a llama</b> <b>It's really simple.

**3:44** · If you do</b> <b>want to run this using a llama</b> <b>Simply go to a llama.com and install a</b> <b>llama using this command</b> <b>Then in order to download the model</b> <b>simply click on this copy</b> <b>button next to the model name</b> <b>Adding command prompt or terminal run the</b> <b>command a llama pool</b> <b>Followed by the model name. Now. I do</b> <b>want to mention that I'm not personally</b> <b>going to use a llama</b> <b>I find it a llama seems to try to run</b> <b>these models on the</b> <b>CPU instead of your GPU</b> <b>Which is a bit of a bug at the moment.

### Ollama vs LM Studio

**4:14** · I</b> <b>assume so I've had way</b> <b>better results using lm studio</b> <b>Of course, you could try both if you find</b> <b>it a llama is way too</b> <b>slow. Try using alum studio</b> <b>Go to alum studio.ai and simply download</b> <b>and install alum studio after opening</b> <b>alum studio simply click on this</b> <b>Model search button and then search for</b> <b>whatever model you</b> <b>want to use like Qween 3.6</b>

**4:40** · <b>Or of course if you wanted to you could</b> <b>definitely use JMR 4 as well</b> <b>My personal recommendation is Qween 3.6</b> <b>the 35 billion parameter model</b> <b>But I believe you should also have really</b> <b>good results with a 27</b> <b>billion parameter model as well</b> <b>Simply click on the</b> <b>model and click on download</b> <b>Once the model has been downloaded, you</b> <b>should see it in this list over a year</b> <b>What I do recommend is that next to the</b> <b>model like Qween 3.6</b> <b>search for the actions</b> <b>Settings then go to load and you'll see</b>

### Model Context Settings

**5:13** · <b>that this context</b> <b>length is a very small number</b> <b>It might be something like 4,000 tokens,</b> <b>which is just not enough</b> <b>for running coding models</b> <b>Coding models tend to load in a lot of</b> <b>context up front like a system prompt and</b> <b>the definition of all the tools</b> <b>So you definitely need to increase this</b> <b>context window length</b> <b>I recommend setting it</b> <b>to an absolute minimum of</b> <b>64,000 tokens or if you can set it to</b>

**5:42** · <b>128,000 tokens cool then click on this</b> <b>sort of terminal developer window</b> <b>Click on load model and then load in the</b> <b>model that you just downloaded right now</b> <b>that we've got models</b> <b>running on our own machine</b> <b>We can finally install local Forge again.</b>

### Install LocalForge

**5:58** · <b>This is completely free</b> <b>So all you have to do is go to this URL</b> <b>which I'll link to in the description</b> <b>And while you're here if you do find this</b> <b>project interesting and you want to</b> <b>support it simply hit the star button</b> <b>Then all we have to do is go to code if</b> <b>you have git set up on your machine</b> <b>You can simply copy this command or</b> <b>simply download the zip file</b> <b>Then there's only one other dependency</b> <b>that you have to</b> <b>install and that is node.js</b> <b>So simply go to node.js.org and then</b>

**6:28** · <b>download and install</b> <b>node.js for your operating system</b> <b>Right then simply extract the contents of</b> <b>that zip file anywhere on your machine</b> <b>and within that folder</b> <b>You'll see either a start at bat file or</b> <b>started SH for Linux or</b> <b>Mac. So I'm using Windows</b> <b>I will run start dot bat the first time</b> <b>you run this it will take a bit of time</b> <b>because it needs to first</b> <b>Install all of these dependencies and</b>

**6:52** · <b>after it will give you this URL</b> <b>Which you can open in your browser and</b> <b>now we're running local Forge</b> <b>The first thing I like</b> <b>to do is to go to settings</b> <b>So let's click on the settings cog and</b> <b>now you have to set your provider</b> <b>I will be using alum studio, but of</b>

### Configure LocalForge

**7:08** · <b>course, we also support a llama</b> <b>Changing your provider will</b> <b>also change this studio URL</b> <b>So if you are writing these tools on</b> <b>different ports, you can</b> <b>simply edit those over a year</b> <b>Then local Forge will also automatically</b> <b>show any of the models that you've</b> <b>downloaded previously</b> <b>So I'll select Queen 3.6 as the default</b> <b>model.

**7:27** · I'll to be honest, this is going</b> <b>to be extremely hard to very intensive</b> <b>So I just recommend</b> <b>running one agent at a time</b> <b>But if you've got a hardware to do so you</b> <b>can definitely bump it up to three coding</b> <b>agents running at the same time</b> <b>Then for playwright verification, you can</b> <b>enable or disable this</b> <b>This will simply use the playwright CLI</b>

**7:49** · <b>to allow the agent to open the browser</b> <b>and test your application</b> <b>If you are running playwright testing,</b> <b>I'm actually going to enable this then</b> <b>you can decide whether</b> <b>this execution should be</b> <b>Headless or headed. Headed means that the</b> <b>agent will actually</b> <b>open in the browser window</b> <b>Hey, this means it will run the browser</b> <b>behind the scenes. I'll just go with</b> <b>headed.

### Create Your First Workspace

**8:09** · It's safety settings</b> <b>And now we're ready to</b> <b>create our first project</b> <b>We can actually run multiple</b> <b>workspaces at the same time</b> <b>So you can easily kick off different</b> <b>agents running on</b> <b>different workspaces in parallel</b> <b>But first this create our first workspace</b> <b>Let's give it a name like I'll just go</b> <b>with retro to do and from here</b> <b>You can decide on whether you want to</b> <b>create a blank project or</b> <b>describe the project using AI</b> <b>We can also load in an example project</b>

**8:39** · <b>Let's actually do the example first and</b> <b>then I'll show you these other features</b> <b>so when we load the example, it's going</b> <b>to create this project for us and</b> <b>Automatically pull in 19 features into</b> <b>the backlog when we</b> <b>open any of these features</b> <b>You can see the title you can see a very</b> <b>detailed description on what this feature</b> <b>needs to do as well as any acceptance</b> <b>Criteria for each feature we can also set</b> <b>the priority and we can also select any</b>

### Run AI Coding Agents

**9:08** · <b>dependencies that is featured depends on</b> <b>We can also set settings at project level</b> <b>So if we click on this cog we can change</b> <b>the provider and the model that we want</b> <b>to use for this project</b> <b>Specifically we can also set things like</b> <b>the dev server port that this app should</b> <b>run on by default its port</b> <b>3000 but if you already have other apps</b> <b>running on the same port simply swap it</b> <b>out over a year and the agent will know</b> <b>What port to test on and of course you</b>

**9:37** · <b>can change the testing settings and the</b> <b>amount of concurrent</b> <b>agents at this level as well</b> <b>And then really all that's</b> <b>left to do is to run the queue</b> <b>This will spin up our coding agent</b> <b>This agent will assign the</b> <b>task to this in progress column</b> <b>And if I just open up alum studio for a</b> <b>minute, we can see that the</b> <b>screen model is not cooking away</b> <b>All right, then to stop this model</b> <b>All we have to do is click on pause and</b> <b>that's done if the task was incomplete</b> <b>It will just simply be moved back to the</b> <b>backlog.

### Add Features Manually

**10:06** · Let me show you a few more ways</b> <b>to set up a new project</b> <b>Let's pick on workspace and I'll just do</b> <b>something like a Giroc clone and it</b> <b>started blank project</b> <b>When we do that, we don't have any items</b> <b>in the scan band board</b> <b>So we can simply click on add feature and</b> <b>then manually add our own features</b> <b>Now this is not really a</b> <b>fun way to build this stuff</b> <b>I do recommend using agents to plan out</b> <b>the app and simply</b> <b>create the features for you</b> <b>And this is where things get really</b> <b>interesting.

**10:37** · Let's do something like a</b> <b>Confluence clone what we could do now is</b> <b>click on describe your project to AI</b> <b>Then let's click on create and chat with</b> <b>AI and this will open up this chat window</b> <b>where we can describe our project. I</b> <b>want to build a</b> <b>Confluence</b> <b>Plane and it's saying this. All right, so</b> <b>let's do this. That's</b> <b>a great project idea</b> <b>I'll be understand your vision who will</b> <b>be the primary users.

### Plan Apps With AI

**11:05** · So</b> <b>let's actually say this</b> <b>needs to support</b> <b>multiple</b> <b>Users with auth and what should be the</b> <b>core features you</b> <b>choose the core features</b> <b>you choose</b> <b>Everything else it's in this and on the</b>

**11:25** · <b>right you can see alum</b> <b>studio is actually running got it</b> <b>I'll take the lead on the architecture</b> <b>and feature set will start with secure</b> <b>multi-user auth a rich text page editor</b> <b>But this really is your opportunity to</b> <b>kind of brainstorm the app</b> <b>with the agent and if you want</b> <b>You can even tell it what tech stack to</b> <b>use. So does this direction for right or</b> <b>would you like any</b> <b>adjustments before we lock it in?</b> <b>sounds</b> <b>Good to me greater year. We've got a</b> <b>solid foundation mat out. Whatever you're</b> <b>ready.

**11:56** · Just click on</b> <b>generate feature list</b> <b>So that's basically it we can just click</b> <b>on this button and the agent will</b> <b>automatically use all of this context</b> <b>To set up our feature list and done and</b> <b>honestly that only took a few seconds</b> <b>And if you have a look at our backlog,</b> <b>I'm just going to</b> <b>collapse the sidebar for a second</b> <b>We see this complete backlog for</b> <b>initializing the next JS</b> <b>app configuring Postgres</b> <b>Implementing clerk and whatever else</b> <b>needs to be implemented. Awesome.

### Generate Feature Backlog

**12:23** · And</b> <b>remember we can also</b> <b>manually add features ourselves</b> <b>So if you feel like the agent miss</b> <b>something simply click on add feature now</b> <b>This takes me through an important</b> <b>caveat. These free models are really</b> <b>impressive, especially</b> <b>when it comes to writing code</b> <b>But the reality is you need to manage</b> <b>your expectations as you</b> <b>can see in this feature</b> <b>It's actually really simple this very</b>

### Local Model Limitations

**12:46** · <b>little context for the agent to work from</b> <b>and the more detailed these features are</b> <b>The better the output is</b> <b>going to be so as a bonus</b> <b>I added another feature that will use a</b> <b>paint model to plan out these features</b> <b>So what I actually recommend you do is</b> <b>Open this local forge project the actual</b> <b>order forge files in something like</b> <b>Claude code now again</b> <b>This is optional.

### Better Feature Planning

**13:10** · You can definitely use</b> <b>the free models to plan the features</b> <b>I know it feels like</b> <b>it defeats the purpose</b> <b>But it doesn't the bulk of the work is</b> <b>still guide you sit with the actual</b> <b>coding implementation</b> <b>We're simply using this paint model to</b> <b>plan the features in</b> <b>your coding agent of choice</b> <b>If you have a look at the skills that's</b> <b>available to the agent.

**13:29** · I've</b> <b>added this local forge skill</b> <b>So what we can do is actually simply pull</b> <b>in that local forge skill or just ask</b> <b>your agent to use the skill</b> <b>And it's a let's</b> <b>create a new project called</b> <b>Infinite draw this is an infinite canvas</b> <b>stall tool like eraser dot I oh</b> <b>But this will just be a single user and</b> <b>local type of app so you can</b> <b>use a sequel I database as well</b> <b>I don't know.

**13:59** · Let's just do something</b> <b>really simple like this</b> <b>Alright now the agent is going to ask us</b> <b>a few clarifying questions</b> <b>So it's basically mimicking the chat</b> <b>functionality in the app itself</b> <b>But this time we are using a paid and</b> <b>more intelligent model just for planning</b> <b>the implementation of the</b> <b>features will still be done</b> <b>By our free models. Alright got it. So it</b> <b>came up with this feature</b> <b>list.

### Use LocalForge Skills

**14:22** · It's about 15 features</b> <b>Let's just say go ahead</b> <b>So Claude is now going to use this local</b> <b>forge skill to create a new project for</b> <b>us and create all the features</b> <b>You can also use the same skill to add</b> <b>features to an existing project as well</b> <b>If I if I switch over to the local forge</b> <b>now, I can see this</b> <b>new infinite draw project</b> <b>This is simply expand this but we don't</b>

**14:46** · <b>have any features yet</b> <b>So let's give Claude a chance to add</b> <b>these and while we wait</b> <b>for Claude to complete</b> <b>I just released my</b> <b>agenda cutting master class</b> <b>This is where I teach you everything you</b> <b>need to know to build real world</b> <b>applications using coding agents</b> <b>We've got a vibrant</b> <b>community of over 700 builders</b> <b>So if you do get stuck</b> <b>or want to share ideas</b> <b>You've got a lot of people to lean on and</b> <b>we've got a live Q&amp;A</b> <b>sessions every Wednesday</b> <b>So you can ask me anything in those</b> <b>sessions.

### Build With Detailed Features

**15:12** · Also, it's only seven dollars</b> <b>to sign up for the first 1000 members</b> <b>I do have to see you there</b> <b>All right</b> <b>So I can see Claude already added a whole</b> <b>bunch of features and it's also wiring up</b> <b>all the dependencies</b> <b>So let's just go back to the scan band</b> <b>board. Here we can see our 15 features</b> <b>And if we open these up you will notice</b> <b>that these are way more detailed than</b> <b>what the free model could come up with</b> <b>And there's also ensure that this free</b> <b>model knows exactly how</b> <b>to implement this feature</b> <b>I'm just going to set the port like 3001</b>

### Run Agents on Autopilot

**15:44** · <b>Then we can click on</b> <b>run Q and that's it now</b> <b>You can step away and come back later</b> <b>when this app is complete</b> <b>What do you think about</b> <b>this open source models?</b> <b>Let me know down in the description if</b> <b>you've got a favorite model</b> <b>Also, if you found this video useful hit</b> <b>the like button and subscribe to my</b> <b>channel for more agenda cutting content</b> <b>We're nearly at 100,000 subscribers. So</b> <b>every subscriber counts. I'll see you in</b> <b>the next one. Bye. Bye</b>