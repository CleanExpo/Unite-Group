---
title: "OpenCode Tutorial for Beginners: Setup, Agents, Skills & MCP"
source: "https://www.youtube.com/watch?v=uZGDO0L-Dr4"
author:
  - "[[Leon van Zyl]]"
channel: "Leon van Zyl"
published: 2026-05-05
created: 2026-05-08
description: "Visit sintra.ai/leonvanzyl or use my promo code leonvanzyl at checkout to receive limited time offer of 72% off on all plansOpenCode is the open source coding agent that is quickly becoming a seriou"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=uZGDO0L-Dr4)

Visit sintra.ai/leonvanzyl or use my promo code leonvanzyl at checkout to receive limited time offer of 72% off on all plans  
  
OpenCode is the open source coding agent that is quickly becoming a serious alternative to Claude Code. In this opencode tutorial, you will learn how to install OpenCode, connect free AI models through OpenCode Zen or premium providers like OpenAI, and master advanced features including agent skills, sub agents, MCP servers, and background agents.  
  
🚀 Ready to level up? Get full access to my Agentic Coding Masterclass, weekly lab challenges, live Q&As, and a community of builders: https://www.skool.com/agentic-labs  
  
📁 GitHub Repo: https://github.com/leonvanzyl/opencode-masterclass  
  
⏱️ CHAPTERS:  
00:00 - OpenCode intro and overview  
00:39 - Installing OpenCode in seconds  
01:25 - Connecting providers and OpenCode Zen  
02:20 - Free AI coding models walkthrough  
03:46 - Scaffolding a Next js project  
04:55 - Subscriptions vs API keys  
06:00 - Connecting OpenAI and GPT 5  
07:30 - Installing agent skills from skills sh  
10:30 - AGENTS md memory file setup  
13:00 - Sub agents and context window protection  
15:30 - Design system for consistent UI  
15:50 - Sponsor message  
18:00 - Building the AI Project Planner app  
22:30 - Saving plans for future sessions  
24:30 - Creating custom sub agents  
28:30 - Playwright MCP server setup  
30:30 - Auto testing the app with browser MCP  
  
Business & sponsorship enquiries: leon.vanzyl@gmail.com  
  
#opencode #agenticcoding

## Transcript

### OpenCode intro and overview

**0:00** · <b>Cloud Code has been getting a lot of</b> <b>attention lately, but it's not the only</b> <b>AI coding tool worth using.</b> <b>Open Code is growing in popularity and</b> <b>for good reason. It's 100% open source,</b> <b>it supports multiple</b> <b>providers and models, including free</b> <b>models, and it gives you</b> <b>an incredibly powerful,</b> <b>agenda-coding workflow right in the</b> <b>terminal.

**0:19** · In this video, I'm going to</b> <b>show you everything you</b> <b>need to know to get started with Open</b> <b>Code, from the initial setup</b> <b>to learning advanced features</b> <b>like agent skills, NCP servers,</b> <b>subagents, background</b> <b>agents, and real project workflows.</b> <b>By the end of this video, you'll know how</b> <b>to use Open Code as a</b> <b>serious alternative to Cloud Code.</b> <b>Let's jump in. The first thing we need to</b> <b>do is to install Open</b> <b>Code. So you can just go to</b> <b>opencode.ai and from this page simply go</b> <b>to the installation</b> <b>instructions and they've kept the</b> <b>setup process extremely simple.

### Installing OpenCode in seconds

**0:49** · You can</b> <b>simply copy this curl</b> <b>command over here, then you can</b> <b>simply open up your command prompt or</b> <b>terminal, paste in that</b> <b>command, and press enter. And it</b> <b>will only take a few seconds to install</b> <b>Open Code. Beautiful. Now that we've got</b> <b>Open Code installed,</b> <b>in order to start Open Code, we can</b> <b>simply enter the command Open Code and</b> <b>press enter. And that's</b> <b>it. Now we've got access to Open Code.</b> <b>Now when using Open Code, I</b> <b>do recommend opening it up in</b> <b>a project folder.

**1:18** · So you can just open up</b> <b>your terminal window,</b> <b>first navigate to that folder,</b> <b>and then start up Open Code. Or something</b> <b>I like to do as well is to</b> <b>start Open Code from a code</b> <b>editor like VS Code or Cursor. This is</b> <b>definitely optional, but the</b> <b>benefit of doing it this way</b> <b>is I can easily see any files that are</b> <b>being created by the</b> <b>agent. But if you just want to</b> <b>use the terminal window, that's perfectly</b> <b>fine as well. So within our</b> <b>project folder, let's start</b> <b>up Open Code.

### Connecting providers and OpenCode Zen

**1:47** · So the first thing we need</b> <b>to do is to connect Open</b> <b>Code to any provider that we're</b> <b>planning to use. So what we can do is</b> <b>enter front slash, enter</b> <b>connect, which will run this</b> <b>connect command. Then from this list of</b> <b>providers, we can search for</b> <b>a provider, or go through the</b> <b>massive list of providers that they do</b> <b>support out of the box. Now</b> <b>this might be enabled by default,</b> <b>but I do recommend connecting to Open</b> <b>Code Zen. This is basically</b> <b>their own gateway for calling</b> <b>models.

**2:17** · And this does give you access to</b> <b>free models, by the way,</b> <b>that's why it's definitely</b> <b>worth it. So I just look for Open Code</b> <b>Zen. Then this is not</b> <b>going to cost you anything,</b> <b>we just have to hook up an API key. So</b> <b>I'm just going to open up this URL. Then</b> <b>from this dashboard,</b> <b>we can actually view our usage, we can</b> <b>set up any billing details.</b> <b>And just to prove to you that</b> <b>these models are free, my balance is</b> <b>actually zero dollars at the minute.

### Free AI coding models walkthrough

**2:42** · So</b> <b>let's go to API keys,</b> <b>then let's actually create a new key,</b> <b>I'll just call this one Open Code</b> <b>Masterclass, let's create</b> <b>it, then let's copy this key, and let's</b> <b>pass it to Open Code and</b> <b>press enter. I am going to delete</b> <b>that key, so please use your own. After</b> <b>we sign into a provider, we</b> <b>can select from the available</b> <b>models for that provider.

**3:05** · Now as you can</b> <b>see, there are actually</b> <b>free models in this list,</b> <b>like BigPikko, HY3, Minimax, 2.5, and</b> <b>NemoTron3Super from Nvidia.</b> <b>Now I do want to mention that</b> <b>with free models, there's always a chance</b> <b>that they might be using</b> <b>their problems to train these</b> <b>models. So if you just want to try this</b> <b>out for free or follow a</b> <b>tutorial, you can definitely use</b> <b>the free models. And I will show you how</b> <b>to hook this up to an</b> <b>actual paid service as well.

**3:33** · For</b> <b>now I'll select BigPikko, and now we're</b> <b>back to this chat interface.</b> <b>Let's just say hey, and we did</b> <b>get a response back and it didn't cost us</b> <b>a thing. So at the moment our</b> <b>project is very empty. Let's</b> <b>ask our agent to scaffold the new Next.js</b> <b>project. Please can you</b> <b>set up a new Next.js project,</b> <b>use the npx command, and I'm actually</b> <b>just going to add to this as</b> <b>well. In the current working</b> <b>directory, there's always a chance that</b> <b>the agent might actually</b> <b>install Next.js into some kind of</b> <b>subfolder.

### Scaffolding a Next js project

**4:04** · Right, that's good enough.</b> <b>Let's send this. And as you</b> <b>can see, it's running the npx</b> <b>command to install Next.js. And if we</b> <b>have a look at our file system, we do</b> <b>indeed see our Next.js</b> <b>project. Let's see if OpenCode can also</b> <b>run commands. Please start</b> <b>the dev server. And indeed</b> <b>it's actually starting the dev server on</b> <b>port 3000. And cool, our</b> <b>Next.js project is running.</b> <b>Right, so we can actually interrupt the</b> <b>agent by pressing Escape.</b> <b>If we press Escape again,</b> <b>we've just interrupted this agent.

**4:34** · So</b> <b>what I also want to do is</b> <b>actually clear the conversation</b> <b>by entering front slash new. And now</b> <b>we've got a fresh session with a fresh</b> <b>context. If you ever</b> <b>want to resume a previous session, you</b> <b>can simply type the sessions</b> <b>command. And we can see that</b> <b>earlier today we started this</b> <b>conversation. And now if we wanted to, we</b> <b>can simply continue with</b> <b>this chat. But I do want to start with a</b> <b>new conversation. And</b> <b>for the rest of this video,</b> <b>I'm actually not going to use a free</b> <b>model.

### Subscriptions vs API keys

**5:03** · Instead, let's</b> <b>connect OpenCode to a different</b> <b>provider. So I'll run the connect command</b> <b>again. Now in order to</b> <b>connect OpenCode to a more</b> <b>intelligent model, you can select a</b> <b>provider like OpenAI or Anthropic or</b> <b>Gemini, whatever you want.</b> <b>Now here is something you need to be</b> <b>careful about. You do have</b> <b>two different ways to pay</b> <b>for inference. You could pay for APIs, or</b> <b>you could use your</b> <b>existing subscriptions with one</b> <b>of these providers.

**5:30** · As an example, if you</b> <b>want to use something</b> <b>like Anthropic or OpenRouter,</b> <b>you could provide your API key, and you</b> <b>will be built based on your</b> <b>token usage. So it's kind of</b> <b>a pay as you go option. But honestly, I</b> <b>think that's the most</b> <b>expensive option out there.</b> <b>I would not recommend using API keys,</b> <b>especially for coding tasks.</b> <b>Instead, use your subscriptions.</b> <b>Now, unfortunately, Anthropic is not</b> <b>supported yet.

**5:58** · And if you</b> <b>are in the know, you know that</b> <b>Anthropic is banning pretty much anyone</b> <b>who's using their service</b> <b>and their subscriptions.</b> <b>And it's not limited to OpenCode only.</b> <b>They're banning all sorts of</b> <b>tools like OpenClaw as well.</b> <b>So to be on the safe side, I would</b> <b>recommend just hooking it up with OpenAI,</b> <b>or maybe even something like Kimi. But</b> <b>personally, I'll be</b> <b>using OpenAI. From here,</b> <b>we can select our auth option, like</b> <b>chatgpt pro or plus.

### Connecting OpenAI and GPT 5

**6:23** · This is</b> <b>referring to our subscription.</b> <b>So if you do have a pro or plus</b> <b>subscription, choose that</b> <b>option. The third option was to</b> <b>provide your API key, which I just would</b> <b>not recommend. Then we</b> <b>can open up this URL in the</b> <b>browser. Let's find in with our account.</b> <b>Let's continue. And done.</b> <b>Now we can select a model</b> <b>that we would like to use. Let's go with</b> <b>GPT 5.5. And by the way, if you ever</b> <b>wanted to change your</b> <b>model, simply enter the command front</b> <b>slash models. So let's click on that.

**6:52** · And</b> <b>now we can select from</b> <b>any of the available models. We can also</b> <b>search for models. So we</b> <b>could just search for GPT 5.5.</b> <b>So I'll select the one from OpenAI. And</b> <b>that's it. Now at the</b> <b>moment, we are using GPT 5.5,</b> <b>but with medium reasoning effort. If we</b> <b>ever wanted to change</b> <b>the reasoning effort,</b> <b>all we have to do is run the command</b> <b>front slash variants, which</b> <b>gives us reasoning efforts</b> <b>specific to this provider for GPT 5.5.</b> <b>I'll go with high reasoning.

**7:25** · Now before</b> <b>we build our project,</b> <b>I do want to assign certain agent skills</b> <b>to this agent that will help to produce</b> <b>even better results.</b> <b>Now if you're new to skills, skills are</b> <b>just a really cool way</b> <b>that we can add additional</b> <b>capabilities to our agent. Skills are</b> <b>nothing more than very detailed</b> <b>instructions that the</b> <b>agent can follow to get very specific</b> <b>results. There are</b> <b>basically two skills that I would</b> <b>recommend installing into a project like</b> <b>this. Since we're building a web</b> <b>application, we want</b> <b>to give this agent the front end design</b> <b>skill.

### Installing agent skills from skills sh

**7:55** · Now the easiest way</b> <b>that I found to explore and</b> <b>install skills is with this website,</b> <b>skills.sh. This is a</b> <b>repository of nearly 100,000 skills.</b> <b>So you can simply search for skills, but</b> <b>you can already see</b> <b>from the all-time favorites</b> <b>that the front end design skill is at the</b> <b>top of this list. So let's</b> <b>actually copy this command,</b> <b>then back in our project, I'm just going</b> <b>to open up a new terminal</b> <b>window and let's install that</b> <b>skill.

**8:22** · Open code is not in this list, but</b> <b>that's not a problem at all</b> <b>because it uses the standard</b> <b>dot agents folder for retrieving skills</b> <b>and anything that we</b> <b>want to attach to it.</b> <b>So I'm actually not going to select</b> <b>anything in this list.</b> <b>Let's simply press enter. We'll</b> <b>install this at project level and let's</b> <b>proceed with the</b> <b>installation. And just to show you what</b> <b>this did, it created this dot agents</b> <b>folder, which is a standard</b> <b>convention for the majority of</b> <b>coding agents out there.

**8:52** · And within the</b> <b>agents folder, we've got</b> <b>this skills subfolder along</b> <b>with our front end design skill. This</b> <b>contains a name for the skill, a</b> <b>description on when to use</b> <b>the skill, and just a very detailed</b> <b>prompt on building beautiful user</b> <b>interfaces. Since we are</b> <b>using Next.js, I do want to install one</b> <b>more skill and that's the</b> <b>Next.js skill from Vercel labs.</b> <b>Let's copy this command and I'll just run</b> <b>that in the terminal as well,</b> <b>just like how we did it with</b> <b>the front end design skill.

**9:21** · We don't have</b> <b>to select any of these tools or install</b> <b>at the project level</b> <b>and that's it. So now in the skills</b> <b>folder, we've got our front end design</b> <b>skill and the Next.js skill</b> <b>that actually contains a lot of reference</b> <b>documentation for</b> <b>using Next.js. Now our app</b> <b>will have AI functionality baked into it,</b> <b>so I'm actually going to be</b> <b>proactive and install the AI</b> <b>SDK from Vercel.

**9:46** · So again, just search</b> <b>for AI SDK, copy this command and let's</b> <b>install this skill as</b> <b>well. So we can just verify that the</b> <b>agent has access to all of</b> <b>those skills by running the</b> <b>skills command. And here we can see our</b> <b>front end design skill, the</b> <b>AI SDK, Next best practices and</b> <b>Next.js. So some of these skills might</b> <b>actually be stored in my user</b> <b>folder, but for you, you should</b> <b>definitely have those three skills</b> <b>available.

**10:13** · Just a side note, if you don't</b> <b>see any skills, what you</b> <b>need to do is simply exit out of open</b> <b>code by running slash exit,</b> <b>then just reopen, open code,</b> <b>and now you should see all of those</b> <b>skills. So I'll just switch</b> <b>my model back to GPT 5.5 high</b> <b>and what I'm also going to do is just go</b> <b>to source control and</b> <b>create a commit, add it, skills.</b> <b>Nice. And by the way, if you click on</b> <b>this open code logo,</b> <b>you get this effect.

### AGENTS md memory file setup

**10:44** · Another important</b> <b>component to understand is</b> <b>memory files. So in the root of</b> <b>our project, what we can do is create a</b> <b>new file called agents.md.</b> <b>Now I already have that file</b> <b>available, but if you don't have it, you</b> <b>can create it yourself. And that file</b> <b>looks something like</b> <b>this. I'm actually going to delete</b> <b>everything that's in that file at the</b> <b>moment. And this is where we</b> <b>can tell our agent all about our project</b> <b>and provide very strict</b> <b>instructions.

**11:13** · This actually</b> <b>forms part of the system prompt for this</b> <b>coding agent. So if there</b> <b>are any specific rules that</b> <b>you want the agent to follow, this is</b> <b>where you need to add those.</b> <b>If you want open code to set</b> <b>up that file itself, what you can do is</b> <b>run the command front slash</b> <b>init. And what open code will</b> <b>do is scan your code base and</b> <b>automatically create and set up this</b> <b>agents.md file. And once this is</b> <b>done, we now have our agents.md file with</b> <b>some instructions just</b> <b>kind of detailing the layout</b> <b>and tic stack in this project.

**11:43** · Now what I</b> <b>actually recommend you do</b> <b>is just clear out this file</b> <b>and add as little information as</b> <b>possible. Only provide any strict</b> <b>instructions that the agent</b> <b>needs to follow. And let me show you how</b> <b>powerful this really is. Let's do</b> <b>something very simple,</b> <b>like respond with emojis only. That's it.</b> <b>And now if I send the</b> <b>message like, Hey, how are you?</b> <b>The agent responds with emojis only. So</b> <b>this really is a critical</b> <b>fall.

**12:14** · If the agent is doing</b> <b>anything you don't like, just add a rule</b> <b>to that agents.md file.</b> <b>You'll thank me for it. What we</b> <b>are going to do is change this agents.md</b> <b>file drastically. What I'm</b> <b>going to do instead is add</b> <b>all of these rules to the agent.md file.</b> <b>I do want to mention you can</b> <b>access all of this for free.</b> <b>I'll link to the GitHub repository in the</b> <b>description of this</b> <b>video. So if you want,</b> <b>you can simply copy my agents.md file and</b> <b>follow along.

**12:40** · So what I</b> <b>like to do is to add this rule,</b> <b>keep your responses concise and to the</b> <b>point. Sometimes these</b> <b>agents are way too chatty and</b> <b>we are paying for the tokens. So I prefer</b> <b>short and concise</b> <b>answers unless I ask otherwise.</b> <b>Then when the agent is in plan mode, it</b> <b>must ask clarifying</b> <b>questions. It should never assume</b> <b>design, take stack or features. And if</b> <b>available, it must use</b> <b>sub-agents or background agents</b> <b>to assist with things like research.

### Sub agents and context window protection

**13:10** · And</b> <b>it should also use</b> <b>background agents to review the</b> <b>different aspects of the plan before</b> <b>presenting it to the user.</b> <b>When the agent doesn't change or</b> <b>edit mode, it should never implement</b> <b>features itself. It should</b> <b>always use sub-agents. Now,</b> <b>there's a really big reason for that. We</b> <b>want to protect the main</b> <b>agents context window as much as</b> <b>possible. You will notice that even</b> <b>though this conversation is really short,</b> <b>we're already taking</b> <b>up like 10,000 tokens or 3% of the</b> <b>context window.

**13:40** · And at some</b> <b>point, and usually pass like</b> <b>the 50% mark, we start reaching the dumb</b> <b>zone of these agents where</b> <b>the quality just worsens very</b> <b>quickly. So by using sub-agents, we're</b> <b>telling this main agent to</b> <b>delegate working tasks to</b> <b>sub-agents and those sub-agents will only</b> <b>give back the final summary</b> <b>of what they did. That way,</b> <b>we're keeping this main agents context</b> <b>window as clean as possible. Also,</b> <b>identify any changes from</b> <b>the plan that can be implemented in</b> <b>parallel.

**14:09** · When using sub-agents to</b> <b>implement these features,</b> <b>act as a coordinator only. Use the best</b> <b>model for the task. Use</b> <b>premium models for complex tasks.</b> <b>Admit your models for simpler tasks like</b> <b>documentation. After completing features,</b> <b>always run commands like length, type</b> <b>check and next build to</b> <b>check code quality. Now,</b> <b>this might not be relevant to our</b> <b>application necessarily, but</b> <b>if we had a database, we could</b> <b>enforce some database rules as well.

**14:36** · And</b> <b>if we do have some testing</b> <b>framework or tools, we can have</b> <b>some section enforcing testing as well.</b> <b>Now for the UI design, you must always</b> <b>follow the UI design</b> <b>system when creating or reviewing</b> <b>components or pages. If you've ever had</b> <b>that issue with agents</b> <b>where the UI is not consistent across the</b> <b>app, you can simply use</b> <b>this approach to force it to</b> <b>use a very specific design system. So it</b> <b>is linking to this design.md</b> <b>file.

**15:06** · So I am going to create</b> <b>that file in this folder called design.md</b> <b>and I'm actually going to</b> <b>paste in this design system.</b> <b>And this just gives a lot of details on</b> <b>the colors, like the primary colors and</b> <b>borders and spacing,</b> <b>stuff like that. Again, you can download</b> <b>all of this from the</b> <b>description as well. And I actually</b> <b>have a lot of videos on building design</b> <b>systems that agents can</b> <b>use. Excellent.

### Design system for consistent UI

**15:32** · So just to make</b> <b>sure that everything does take effect,</b> <b>I'm actually going to create a new</b> <b>session and that should pull</b> <b>in our new agent.md file with all of</b> <b>these new rules and</b> <b>conditions. I'm also going to create a</b> <b>commit called memory files and design</b> <b>system. Right now that</b> <b>everything is set up, let's start</b> <b>building our actual application. So this</b> <b>is going to be a fun one. But first, a</b> <b>quick word from today's sponsor,</b> <b>Cintra AI.

### Sponsor message

**15:59** · And I think you're actually</b> <b>going to care about this one</b> <b>because they solve a problem</b> <b>a lot of us have. Let's be honest. If</b> <b>you've been following the GenteCoding</b> <b>world, United's shipping</b> <b>software is faster than it's ever been.</b> <b>You can go from idea to</b> <b>working product in a weekend with</b> <b>cloud code or cursor. The building part</b> <b>is basically solved. But</b> <b>then the product just sits there</b> <b>because the hard part isn't building</b> <b>anymore. It's everything</b> <b>else.

**16:25** · The social posts, the launch</b> <b>emails, the newsletters, the product</b> <b>update announcements,</b> <b>stuff most of us didn't sign up</b> <b>to do. That's where Cintra comes in.</b> <b>Think of it as the other half of your</b> <b>business. It's a team of</b> <b>AI employees. Each one trained as a</b> <b>specialist for the non-coding parts of</b> <b>running a product or</b> <b>business. I've been using two in</b> <b>particular. First is Soshi, the social</b> <b>media manager.

**16:51** · I can tell</b> <b>Soshi about a new feature I just shipped</b> <b>and she'll generate a week of posts</b> <b>across platforms in my</b> <b>voice with my positioning. I review, edit</b> <b>what doesn't feel right</b> <b>and approve what does. The</b> <b>second is Emi, the email marketer. I ask</b> <b>her to draft a product</b> <b>update email. She pulls context</b> <b>about my product from the Brain AI</b> <b>profile and writes the first</b> <b>draft. I saw it, it's not magic,</b> <b>but it still beats staring at a blank</b> <b>email.

**17:21** · There are 10 other helpers</b> <b>covering SEO, customer</b> <b>support, copywriting, data analysis and</b> <b>more. And there's a 14-day money back</b> <b>guarantee so you can</b> <b>try the full team risk-free. Head over to</b> <b>cintra.ai slash lyonfonsale,</b> <b>link in the description, or use</b> <b>code lyonfonsale at checkout. You'll get</b> <b>an exclusive limited</b> <b>time 72% off on all plans.</b> <b>That's cintra.ai slash lyonfonsale.

**17:49** · Code</b> <b>lyonfonsale for 72% off.</b> <b>Thanks to Cintra for sponsoring this</b> <b>video. This app will allow the user to</b> <b>pass a rough idea of what</b> <b>they're trying to build. And our</b> <b>app will then suggest a tech stack and</b> <b>certain aspects about the</b> <b>application. And at that point</b> <b>we can kind of fine-tune them using the</b> <b>UI itself. By the end of it</b> <b>we'll have a prompt that we can</b> <b>copy and pause to our coding agent.

### Building the AI Project Planner app

**18:14** · It's</b> <b>kind of a design tool or a spec tool</b> <b>where we can plan the</b> <b>project before handing it over to our</b> <b>agents. We can switch modes by holding</b> <b>shift and by pressing</b> <b>tab. This will switch us between bold</b> <b>mode and plan mode. You'll also notice</b> <b>that there are different</b> <b>models for plan mode and bold mode</b> <b>because sometimes you might</b> <b>prefer one model to do the</b> <b>planning and another model to do the</b> <b>actual implementation. So</b> <b>in planning mode I'm actually</b> <b>going to pass this prompt.

**18:42** · Again you can</b> <b>just get this from the repo</b> <b>itself. But just to go over it</b> <b>we're building a lightweight AI project</b> <b>planner app for this</b> <b>tutorial. The app should let a user</b> <b>enter a rough app idea then generate an</b> <b>editable project brief with</b> <b>the app summary, the target</b> <b>users, core features, a recommended tech</b> <b>stack, the pages and</b> <b>routes, a possible data model,</b> <b>the bold phases, risk and edge cases, and</b> <b>a final copyable starter</b> <b>prompt for a coding agent.

**19:12** · And</b> <b>then we'll keep the scope small so no</b> <b>user authentication, no</b> <b>database, no payments.</b> <b>It's just a simple Next.js application.</b> <b>I'm actually just going to</b> <b>switch out one thing here</b> <b>to say that we will be using the AI SDK</b> <b>with open router for</b> <b>inference. And then there's one more</b> <b>thing I would like to add. For the data</b> <b>model it would be cool if you could</b> <b>visualize the relationship</b> <b>between the different entities as well</b> <b>perhaps using react flow or</b> <b>something.

**19:43** · All right I'm just</b> <b>going to copy this prompt back in open</b> <b>code. Let's paste in all of that. In fact</b> <b>we do have to change</b> <b>the model. I definitely don't want to be</b> <b>using Olamo for this. I do</b> <b>recommend for planning that</b> <b>you actually go with the most intelligent</b> <b>model that you have access</b> <b>to. If the plan is detailed</b> <b>enough you can actually use a less</b> <b>intelligent coding model. So</b> <b>for this let's just paste in</b> <b>that prompt again and let's send this.</b> <b>All right this is a</b> <b>promising start.

**20:11** · We can see that the</b> <b>agent pulled in the AI SDK skill, Next.js</b> <b>and the front-end design</b> <b>skill. And you know what since we</b> <b>are using shad cn what we can also do is</b> <b>install the shad cn skill</b> <b>as well. And that's kind of</b> <b>normal for my process. As I'm adding new</b> <b>frameworks and capabilities I</b> <b>do like to look up an official</b> <b>skill for that framework or tool and</b> <b>install it into the project. Another</b> <b>agent is asking us a few</b> <b>clarifying questions.

**20:39** · For the first</b> <b>implementation should the AI response be</b> <b>generated all at once</b> <b>or be streamed section by section? I</b> <b>think all at once. Should</b> <b>drafts persist only during the</b> <b>current back session or restore after</b> <b>refresh using local storage?</b> <b>Let's go with local storage.</b> <b>How interactive should the data model</b> <b>visualization be initially? It's a</b> <b>read-only graph. I think it</b> <b>should just be read-only. And let's</b> <b>confirm these. Right we've got our</b> <b>implementation plan. No faults</b> <b>were changed.

**21:10** · All right that's cool.</b> <b>Confirm choices. Here we've got our</b> <b>architecture. We have to add a</b> <b>few dependencies which is 100% correct.</b> <b>We have to install the AI</b> <b>SDK as well as the open router</b> <b>provider for the AI SDK. We'll install</b> <b>Zod for schema validation and for</b> <b>visualizing the data</b> <b>model we will install Reactflow using</b> <b>this package. And this seems</b> <b>very cool. We do have an open</b> <b>question though. Which open router model</b> <b>should be used as the</b> <b>default?

**21:40** · If you don't care I'll use</b> <b>an environment variable like open router</b> <b>model with a reasonable default</b> <b>documented in .env.example.</b> <b>Well actually what we'll do is let's find</b> <b>a model that we can use.</b> <b>I'm thinking that I'm simply</b> <b>going to use sonnet 4.6. So let's copy</b> <b>this model name. For the model use</b> <b>anthropic\_glaudsonnet 4.6.</b> <b>And let's end this.

**22:07** · Right we've got this</b> <b>plan but this is actually</b> <b>just stored in the session at the</b> <b>moment. What I like to do is to persist</b> <b>this plan. So in this .agents folder I'm</b> <b>going to create a new</b> <b>subfolder called plans. Then what we can</b> <b>do is switch over to bold</b> <b>mode and I'm going to pull</b> <b>in the location to this plan folder.</b> <b>Please don't make any code changes yet.</b> <b>Please store this plan</b> <b>in the plans folder. And done. So in the</b> <b>plans folder we now have our</b> <b>implementation plan over</b> <b>here.

### Saving plans for future sessions

**22:38** · Which means we can now refer back</b> <b>to that plan in the future.</b> <b>It also means we can now clear</b> <b>this context by creating a new session.</b> <b>Let's pull in this plan and</b> <b>then while we're in bold mode</b> <b>let's say please go ahead and implement</b> <b>this plan. That should actually be</b> <b>enough.

**22:57** · Let's send this.</b> <b>And if it follows our agents.in\_default</b> <b>instructions it should</b> <b>now split the plan up into</b> <b>tasks that can be executed in parallel</b> <b>and then run background agents to</b> <b>implement this plan.</b> <b>Let's see. I'll read the implementation</b> <b>plan and project structure first. Then</b> <b>split any independent</b> <b>work across subagents where it makes</b> <b>sense. Perfect. This is</b> <b>such a cool workflow. Nice. So</b> <b>it's created this to-do list so we can</b> <b>see exactly what the agent is planning to</b> <b>do.

**23:27** · And it's currently</b> <b>installing all of these dependencies.</b> <b>While the agent is busy</b> <b>figuring out this plan we do have</b> <b>to set up our open router API key. So in</b> <b>the root of the project it's</b> <b>create a new file called .env</b> <b>and what the .env file allows us to do is</b> <b>to store any sensitive</b> <b>information. So this is typically</b> <b>stuff that shouldn't be deployed to</b> <b>GitHub or you know to some repository</b> <b>where anyone can view it.</b> <b>This is perfect for storing API keys.

**23:54** · So</b> <b>what we'll do is create a</b> <b>new variable called open</b> <b>router API key. Then I'll go back to open</b> <b>router. I'll create a new</b> <b>key and let's just call this</b> <b>ai-project-planner and let's create the</b> <b>key. Let's copy this and let's paste in</b> <b>that key. That's it.</b> <b>We're done. This will allow our</b> <b>application to interact with AI models.</b> <b>And also by the way if</b> <b>you were wondering if you can create your</b> <b>very own custom subagents,</b> <b>yes you can.

**24:26** · So by default if</b> <b>we go to slash agents we have a bold</b> <b>agent and a plan agent. But</b> <b>we can add our very own custom</b> <b>agents as well. Let me just show you how.</b> <b>So I'm going to open up a</b> <b>new terminal session. Then</b> <b>let's run the command open code agent</b> <b>create. We'll just create</b> <b>this agent in this local project</b> <b>and now we can give a description of what</b> <b>this agent should be able</b> <b>to do. So I'll just say call</b> <b>it coder agent.

### Creating custom sub agents

**24:53** · I don't know just for fun</b> <b>let's pause that and this</b> <b>will generate a new agent for</b> <b>us. So if you do want to create agents</b> <b>that specialize maybe in</b> <b>any UI design or coding or</b> <b>testing or documentation writing you can</b> <b>definitely do that as well.</b> <b>And our main agent is making a</b> <b>lot of progress here. And as this tooltip</b> <b>says if we want to see</b> <b>what the subagents are up to</b> <b>we can press ctrl and x and down to view</b> <b>our subagents.

**25:22** · So currently</b> <b>we're looking at the general</b> <b>agent and if we press write we can see</b> <b>the explorer agent and if we press write</b> <b>again we can see the</b> <b>other explorer agent as well. And then we</b> <b>can simply press up to</b> <b>view our general agent. All</b> <b>right cool so the implementation is</b> <b>complete so I'm going to</b> <b>open up a new terminal window.</b> <b>And let's manually start the dev server</b> <b>by running npm run dev. And</b> <b>this is what we have. So not bad</b> <b>at all.

**25:49** · We can enter our app idea and</b> <b>hopefully on the right hand</b> <b>side we'll see the AI results</b> <b>streaming in. So we even have a few</b> <b>example prompts. Let's go</b> <b>with a meal planning app for</b> <b>busy parents that creates weekly grocery</b> <b>lists. Let's click on</b> <b>generate brief. So it is actually</b> <b>taking a very long time to get a result</b> <b>back. So it could just be</b> <b>that the model is taking a lot of</b> <b>time to generate the results but it would</b> <b>be ideal if all of these</b> <b>sections would kind of stream in</b> <b>as they become available.

**26:17** · And it took a</b> <b>minute or two but we got our</b> <b>result back. So we've got our</b> <b>brief. The app name could be weekly</b> <b>bites. And the cool thing about this is</b> <b>that we can make changes</b> <b>by the way. So if we don't like weekly</b> <b>bites we could make this I don't know</b> <b>weekly meals. We can</b> <b>edit the summary. We've got our target</b> <b>audience. Then we've got this JSON array</b> <b>of all the different</b> <b>core features. We also have this</b> <b>recommended tech stack. So this is</b> <b>recommending Next.js</b> <b>with tailwind.

**26:49** · All right that's cool.</b> <b>Pages and routes. And we've got the data</b> <b>model. So everything</b> <b>is here. But instead of showing a JSON</b> <b>array I would actually</b> <b>prefer something different. Maybe</b> <b>nice visual cards instead of an array.</b> <b>Also at the bottom we can</b> <b>see this data model graph.</b> <b>So for any of those of you are interested</b> <b>to see what the database or</b> <b>what the data models look like</b> <b>this is kind of a nice way to just kind</b> <b>of visualize those</b> <b>relationships.

**27:16** · It's taking a long</b> <b>time to see any results coming in.</b> <b>Basically you use the AISDK structured</b> <b>output streaming to stream</b> <b>in sections as they become available.</b> <b>Also I don't like that you're</b> <b>representing the data as JSON</b> <b>arrays show cards instead that translate</b> <b>to JSON behind the scenes</b> <b>that the user can easily edit</b> <b>at or remove. I think this should be good</b> <b>enough. Let's fire this off.</b> <b>All right then so let's see</b> <b>if these changes work.

**27:42** · I'll just select</b> <b>one of these other ideas.</b> <b>Let's click on regenerate brief.</b> <b>So this should stream back these elements</b> <b>as the model is generating</b> <b>them. So hopefully it will</b> <b>feel a little bit more performant. And</b> <b>actually it is. We can see</b> <b>all of these different elements</b> <b>like popping in one by one as the model</b> <b>is generating them. Okay</b> <b>that's cool. Again we can</b> <b>make edits to any of these fields.</b> <b>Instead of the app showing us</b> <b>JSON it is actually showing us</b> <b>different cards and what we can do is</b> <b>remove cards.

**28:13** · We can add</b> <b>additional cards if we want</b> <b>and we can edit the contents within each</b> <b>of these cards. Cool. All</b> <b>right our app seems to be making</b> <b>really good progress but we're not done</b> <b>yet. It still doesn't look</b> <b>very good so we are going to</b> <b>improve the UI. And secondly I don't want</b> <b>to keep testing the app</b> <b>until the agent is ready.</b> <b>So we'll actually get open code to</b> <b>automatically test the app for us. What</b> <b>we can do is assign an</b> <b>MCP server to this agent. That will allow</b> <b>this agent to use a</b> <b>browser to navigate the app and</b> <b>test it.

### Playwright MCP server setup

**28:44** · So I'll be using the playwright</b> <b>MCP server for this. All</b> <b>right then what we have to do is</b> <b>scroll down to the open code section.</b> <b>Then we've got this</b> <b>documentation showing how to set up</b> <b>MCP servers for open code. But what we'll</b> <b>simply do is copy this code</b> <b>every year. All right in order</b> <b>to add MCP servers to open code what you</b> <b>have to do is in the root of</b> <b>a project folder create a new</b> <b>file called open code dot JSON.

**29:10** · Then in</b> <b>this file just going to write the</b> <b>terminal. We can copy this</b> <b>configuration like this playwright MCP</b> <b>every year and paste it into this file.</b> <b>Now you can call the</b> <b>MCP whatever you want like playwright or</b> <b>I don't know playwright MCP.</b> <b>You can change that name to</b> <b>whatever you want. Now what I'm going to</b> <b>do to test this is open up a</b> <b>new terminal window. Let's run</b> <b>open code. Then let's run the command</b> <b>MCPs.

**29:41** · And here we can see</b> <b>the playwright MCP is currently</b> <b>connected. If you ever wanted to disable</b> <b>this MCP you can simply hit</b> <b>the space bar and that will</b> <b>disable playwright for the session. So</b> <b>instead what we'll do is</b> <b>go back to our main session</b> <b>where we don't have the MCP server yet.</b> <b>What we actually have to do</b> <b>is exit out of open code just</b> <b>to pull in this new configuration. Let's</b> <b>go back into open code.</b> <b>Let's go to MCPs.

**30:11** · You can see</b> <b>playwright is indeed connected. And to</b> <b>resume that previous</b> <b>session we'll just go to sessions.</b> <b>Let's choose our implementation session.</b> <b>Cool now we're back to</b> <b>where we were. So as the final</b> <b>part of this bolt let's do something</b> <b>really freaking cool.

**30:28** · The UI design</b> <b>really sucks at the moment.</b> <b>Use the frontend design skill to</b> <b>completely revamp the UI including fonts</b> <b>color styles though works.</b> <b>Then I need you to test the app and</b> <b>visually confirm that everything is</b> <b>working by using the</b> <b>playwright MCP tools. Once done also</b> <b>update the design.md file. Cool this</b> <b>should be fun.

### Auto testing the app with browser MCP

**31:00** · Let's</b> <b>run this and see what we get back. All</b> <b>right this is really cool. The</b> <b>agent made its changes and is</b> <b>now using playwright to operate the</b> <b>browser. And I'm not touching</b> <b>anything by the way. The agent</b> <b>is driving the app at the moment. It's</b> <b>populating fields, clicking</b> <b>buttons and testing our app on</b> <b>our behalf end to end. So the agent will</b> <b>just kind of do testing on</b> <b>our behalf making any fixes.</b> <b>And it's a brilliant way to kind of auto</b> <b>improve and test your app on autopilot.</b> <b>Let me know down in the comments what you</b> <b>think about open code.

**31:27** · Are</b> <b>you going to give it a shot?</b> <b>Also if this video helped you in any way</b> <b>please hit the like button</b> <b>and subscribe to my channel</b> <b>for more agentic coding tutorials. If you</b> <b>do want to take your</b> <b>agentic skills to the next level</b> <b>consider joining my community, "Agentic</b> <b>Labs". I just released</b> <b>the first few videos for my</b> <b>agentic coding masterclass where I teach</b> <b>you everything you need</b> <b>to know to build real world</b> <b>applications using AI.

**31:49** · If you ever do get</b> <b>stuck with the live Q&amp;A</b> <b>sessions every Wednesday.</b> <b>We also have a vibrant community of over</b> <b>700 AI builders so someone will</b> <b>definitely be able to</b> <b>help you. Thank you for watching. I'll</b> <b>see you in the next video. Bye bye.</b>