---
title: "Master Hermes Agent in 41 mins"
source: "https://www.youtube.com/watch?v=EmF06O4vOWI&t=1491s"
author:
  - "[[Keith AI]]"
published: 2026-04-23
created: 2026-05-21
description: "Most Hermes videos show you how to install it.That is not the hard part.The hard part is turning Hermes into something actually useful.In this video, I show you how I use Hermes as the center of"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=EmF06O4vOWI)

Most Hermes videos show you how to install it.  
  
That is not the hard part.  
  
The hard part is turning Hermes into something actually useful.  
  
In this video, I show you how I use Hermes as the center of my personal AI system by connecting it to Telegram, Gmail, Google Calendar, Apple Health data, social media workflows, and even OpenClaw to build a personal AI wiki that improves over time.  
  
I cover:  
  
\* how to install Hermes locally  
\* how to run Hermes with Ollama and local models  
\* how to deploy Hermes on a VPS that runs 24/7 using OpenRouter Spawn  
\* how to connect Hermes to Telegram  
\* how to use the Hermes dashboard, cron jobs, and skills  
\* how to reduce token costs with OpenRouter and provider routing  
\* how I connect Hermes to Gmail, Calendar, and health data  
\* how I use Hermes and OpenClaw together instead of choosing one  
\* how I build a shared Obsidian-style markdown knowledge base for my life and business  
  
I also share where Hermes is better than OpenClaw, where OpenClaw is still stronger, and why I think the best setup is using both together.  
  
If you want to stop using AI like a chatbot and start building an AI system that actually works for you, this video is for you.  
  
00:00 Why Herms Matters  
02:05 Building your personal LLM Wiki  
02:55 Install and Import Setup  
03:35 Pick Your LLM  
04:51 Fixing Setup Errors  
06:11 Token Costs and Savings  
07:48 Telegram Bot Connection  
09:55 Telegram Groups and Topics  
10:27 Dashboard and Cron Jobs  
12:29 Skills and Workflows  
15:42 Local LLM Install with Ollama  
18:23 VPS Deploy with Spawn  
20:07 Spawn VPS Setup  
21:36 Verify Droplet and Model  
22:13 Provider Routing Tricks  
24:51 Hermes terminal  
25:55 Customize Souls and Agents  
28:42 Heartbeat Cron Jobs  
29:55 Health Data Skill  
31:52 Threads Analytics Skill  
34:49 Connect Gmail Calendar  
36:46 Hermes and OpenClaw Combo  
38:50 Obsidian Shared Wiki  
41:14 Final Thougths  
  
Resources & Links  
AI Community (Substack): https://substack.com/@rumjahn  
Health Data App: https://applehealthdata.com/  
Threads Growth Skill: https://github.com/krumjahn/threads-growth-skill  
Typeless: https://www.typeless.com?via=keith-rumjahn  
Digital ocean: https://m.do.co/c/87248276a506  
Warp dev: https://app.warp.dev/referral/539GR4  
Promot for routing: https://www.notion.so/rumjahn/Prompt-for-Hermes-routing-35c36cfa3d5980d38c26f2a371698d5d?source=copy\_link  
  
Subscribe for more practical AI systems, local AI, agents, and real solopreneur workflows.  
  
#Hermes #AIAgent #OpenClaw #Ollama #OpenRouter #AIWorkflow #LocalAI #AIAutomation

## Transcript

### Why Herms Matters

**0:00** · Most Hermes videos show you how to install it. That's not the hard part.

**0:03** · The hard part is turning into something actually useful. In this video, I'll show you how I connect my Hermes to my Telegram, my Apple Health data, my calendar, my Gmail, help me launch social media posts, and even Open Claw to build a personal AI wiki system that actually improves over time. And I'll also show you where Hermes is better and Open Claw and where it isn't and how I actually use both together. In this video, I'm going to cover everything you need to know to master Hermes.

**0:31** · Number one, how to install on your local machine, and then I'll show you the quickest way to do it using Ollama. And then, if you want to install it on a VPS that runs 24/7, I've tried a million different ways and I'm going to teach you the quickest way to do it using Open Router Spawn, so you can run it on Google Cloud, AWS, Digital Ocean without the hassle of debugging and setting it up.

**0:57** · Once you've got it up and running, I'm going to teach you how to use the command line interface, the terminal, connect it to Telegram to control it, and I'll also teach you a secret hack to organize it into different topics, and I'll show you how the dashboard works with Hermes. After you've got it installed, I'm going to show you how to connect to your LLMs, so you can actually have the AI to power it. I'm going to show you how to run a local AI model, how to use Open Router and the auto routing. Then, I'm going to show you some real use cases in basically building an AI wiki system that helps you do everything.

**1:29** · So, connect to your Google calendar, your Gmail, looks at your health data, and then also create some business tasks like create social media posts. And the final thing I'm going to show you is you don't have to delete your Open Claw just yet. You can actually use them both at the same time, and how I use Hermes as my orchestrator linked to my Open Claw using a NAS to store everything and creating a wiki for my life that has all my information.

**1:53** · So, all my emails, my calendar, all my posts, all my data from all my businesses all into one single vault that improves over time. Andrej Karpathy came up with this article that's very popular right now called an LLM wiki.

### Building your personal LLM Wiki

**2:10** · Basically, you have an AI agent that incrementally builds and maintains a persistent wiki that gets better over time. And this pretty much sums up what I'm ultimately looking for in my Hermes and my Open Claw after using it for hundreds of hours. I want something that improves over time and knows everything about me. And in order to do that, I basically had to give it a lot of context. And not only that, based on the context, it should continuously improve over time. So, more data and continuous improvement is actually the most important thing for my AI agents.

**2:41** · And right now, I think Hermes is the best AI agent out there doing this, and I prefer it over Open Claw because it has better memory and its ability to improve is much better. And we're going to try to replicate that today. First thing you want to do is come to the Hermes Agents website, and then it says here just to copy this command, and let's just do that. I'm going to open my terminal, and then I'm going to paste in that command.

### Install and Import Setup

**3:09** · Okay, and it's finished the installation, and the smart thing is it's detected I've got Open Claw installation, and it asks if I want to see what's I can import. So, I'm going to go yes, and it's found a bunch of stuff from my souls, my user profile, my skills, and all I need to do is to go Y, and it will actually copy over a lot of things. Next thing is quick setup or full setup.

**3:34** · Let's do quick, and the first thing I need to do is connect to my AI LLM model that powers up the whole thing. Open Router is the best because Hermes allows you to pick different LLMs based on different tasks. So, if you want fast task, it can choose an LLM model that's fast. If you want to save money, you can do something that's cost less. Or if you have a high-intensive one that requires a more expensive model, it can all route that through Open Router, and it's smart enough to discern which one to use.

### Pick Your LLM

**4:02** · Right now, I'm just going to use Open AI Codex because I have a subscription to it, and I want to use my subscription plan, and it's the only one where it doesn't get banned cuz if I use Anthropic or Gemini, it'll probably get banned because they don't allow third-party access.

**4:18** · So, Open AI Codex, which I'm going to go 5.4.

**4:22** · I can set up messaging, so I can connect to my Discord or my Telegram, Discord, Slack, Signal, email, WhatsApp. And I'm going to pick Telegram because I think of all the ones here, Telegram is the easiest to set up.

**4:36** · So, let's launch the Hermes chat agent.

**4:39** · Okay, so even though I selected Telegram, it's telling me I need to come back later and run this command Hermes setup gateway. And so, let's leave that for now, and let's launch the Hermes chat. Ooh, now I have an error. Let's try one more time. Okay, I realized what the issue was because I'm importing from Open Claw, it got some of the previous configurations, so I needed to remove the Open AI Codex authentication and run it again. How do I do this?

### Fixing Setup Errors

**5:05** · I'm going to use another AI agent that I have called warp.dev, and I'm just going to run that command Hermes auth remove. The AI agent will help me remove this by giving suggestions. So, I'm going to do that, and basically it's smart enough to remove all of them for me. Okay, my warp.dev seems to have fixed the issue, so let's go to Open AI Codex.

**5:30** · 5.4.

**5:31** · Okay, and I got it working. I typed in Hermes, and it opened the terminal user interface. I typed in hi, and it replied. And I'm using my ChatGPT 3.5 Codex. What I was surprised by is that when I logged into Open Claw, I need to open a URL, authenticate, and then come back, and Hermes didn't need to do that, and I realized how it does that. Because I'm using Codex on my computer, and I'm already logged in, Hermes is smart enough to actually copy that over without me re-authenticating again. So, that's pretty impressive.

**6:03** · Now that it works, the next important thing, of course, is to connect it to different messaging tools. And so, let's get into Telegram. Before I go into Telegram, I want to explain why I'm using Open AI Codex as my AI model. It's because running Hermes is really expensive.

### Token Costs and Savings

**6:19** · Here, I was using Claude API, and I cost me $64 in about a week. And so, optimizing your tokens and saving money is really important. Anthropic, Gemini, and Open AI, their cheapest plan is their monthly plan where they essentially subsidize you for using their plan. However, Claude, Gemini, and now Kimi, which used to be the cheapest option, doesn't really allow you to connect to Hermes agent anymore without risking being banned.

**6:47** · And Open AI Codex is the only one that works reliably with Hermes without getting banned. So, that's a top choice for your money-saving option. If you don't want to use that, the second best option is to use Open Router because it has auto routing. So, depending on your task, it can route your cheap tasks to a free model and your more complex tasks to a more powerful model. And recently, they just launched a free model in Elephant, which is a completely free model that you can also use.

**7:16** · So, what Open Router does is that it allows you to connect to all the different models out there. And most importantly, you can come to bring your own keys and connect your Open Router and bring your own API keys, and so you can call different models using Open Router with one single key. So, picking the right model is important if you don't want to be spending a fortune, and later I'm going to also teach you some tricks how to optimize your token spending with Open Router auto routing, and also Hermes has has its own auto routing capabilities as well.

**7:47** · Now, I'm going to set up my Telegram to connect with my Hermes. And the command to do that is this, Hermes gateway setup. And then here, I can choose Telegram. And what I need to do is open my Bot Father, the new bot, and follow the prompts create your bot. So, I'm going to go to Bot Father. I'm going to type in new bot, and then I'm going to say I'm going to give it a name called Raptor's Hermes Bot. Okay, then I'll reveal token, and then let's go back.

### Telegram Bot Connection

**8:15** · And it says bot token, I'm going to copy and paste that into here, and then I need to paste my ID from step four. So, how do I find my ID? You need to find a bot called @userinfobot.

**8:28** · So, search for a user info bot. Make sure it's exactly the same. There's a lot of scam bots out there. And once you go in, it should look like this. Press start, and it will give you an ID. So, copy that ID, paste it in, and then you can set your home channel. So, what a home channel is is if your Hermes is running cron jobs or jobs are doing on a routine and it will want to update you, do you want to send that to you directly through a direct message, or do you want to send it to a group? So, I'm going to try to create a group. So, I found my Raptor's Hermes Bot, and I'm going to create a group.

**9:01** · And here, you're going to see that I have in my browser a sequence of numbers. So, there's a negative something number. I'm going to copy that, and then I'm going to paste it in, and it's done.

**9:13** · So, install the gateway as a launch service. Start the service now? Yes.

**9:17** · Okay, so now let's test it out. So, let's go to Telegram.

**9:22** · Now I say hi, and there it is, it's replying to me.

**9:25** · Let's try another one. Let's go into my group. Okay, as you can see inside my group, my bot is not responding to me, and that's normal. So, let's fix that.

**9:35** · So, I need to go to Bot Father, go to my bots. I'm going to select Raptor's Hermes Bot bot settings, group privacy, turn off. Okay, and then I need to remove from the group, and then add him back.

**9:48** · I'm back.

**9:50** · Let's see how it works. Boom.

**9:52** · It's now responding to me.

### Telegram Groups and Topics

**9:55** · So, now I can have a group, and with groups I can do a lot of cool things. I can enable topics. Well, let's say I open a new topic also for media.

**10:04** · Okay, so I create a new social media group, and here I've got general, and now I can create multiple groups. So, I can have topic for social media, a topic for developing my apps, a topic for analytics. So, I can separate them into different conversations, and it makes my life a lot easier. And that's how you manage your Hermes bot and use topics and group chats to manage that. Okay, now that we have Hermes set up with Telegram and it's working, I want to bring out the next thing, which is the Hermes dash.

### Dashboard and Cron Jobs

**10:32** · So, open up your terminal and type in Hermes dashboard, and it's going to take a couple seconds and it's going to build a web UI. And you got to open up your browser 127.0.0.1:9119, and you're going to see this interface.

**10:49** · Now, this is a new feature, which is really useful because you can see all your recent sessions. You can see your connected platforms. You can see all your sessions and check your history.

**10:59** · You can see your analytics. So, it's connected to Codex, how many sessions, my token usage, my API calls. You can see all the problems, the log of all your errors. You can also see all your cron jobs. So, cron jobs are things that you want to run periodically. And you can create this here using the web dashboard, or you can create it just chatting with your Hermes agent. So, let's do a quick cron job here.

**11:26** · So, I'm going to give it a name, my weekly app sales report, and I'm going to say, "Grab my App Store sales data on a weekly basis, and then send me a sales report." And then I need to put in a cron schedule. So, what a cron schedule is that there's it's a combination of numbers. You have the minutes, the day of month, the month, and the day of the week. So, if I put in 38 star one, it means that 8:30 a.m.

**11:59** · on a Monday of every week, it will run this. Or you can set it as maybe two and star, and it will run on the second of every month. And then finally, you can come to deliver to you can have delivered to your local machine, or I can choose Telegram, Discord, Slack, email. I want to deliver it to Telegram.

**12:19** · I'm going to click create, and boom, I have a scheduled job here. So, if you have any reports that you run weekly, or is there any if there's anything you want to run while you're sleeping, this is a nice way to set it up. Then you have skills. So, you have all these really cool skills you can just click a button to activate. So, it can connect to Apple notes. So, we can do that.

### Skills and Workflows

**12:40** · I can connect to delegate to Claude code, and that's useful. There's a bunch of skills here you can use that you can just one click and enable. So, I've just enabled a bunch. Obsidian is a good one.

**12:52** · So, what are skills? Let's say I want to create a social media post, have it come back with a refined draft. And then after the draft is done, so what are skills? Let's say I want to create a social media post, and it has three or four steps. The first steps is that I want to give it an idea, and then it will draft a better version for it that is more viral. Once I approve it, then it will schedule it and post it to my Threads and Facebook account using an API.

**13:22** · And sure, I can do that every time with Hermes and just chat with it, but I have to wait for a response, give it a new prompt, wait for it to come back, and then prompt it a couple more times before I can do that. Instead of doing that every single time, and there could be mistakes, once I do it once, I can tell it to save it as a skill, and it will remember the process, the workflow that I just created.

**13:43** · And then next time I use it, I can just say, "Hey, use this workflow," and it will remember how to make the draft, it will remember my tone, it will remember how to connect to my social media API and auto post it, all combined into one skill. So, it's basically turning any existing workflow with multiple steps, storing it, and so the next time I can just call it and run it in one step. And most importantly, your skill can keep improving over time.

**14:09** · So, there's lots of good skills here, especially if you're in software development, you can turn on these skills.

**14:15** · I think all of them are really good, planning, requesting code reviews, sub-agent driven. So, these are really good skills, and you should take some time and look into what skills are useful to you, and they will save you tokens and also make your life a lot better. Then you have the config file.

**14:30** · So, you can change your model, your context length, your folder, all these settings you can change if you go to the config file inside Hermes. You can open it, open the file and just edit it, or you can use this dashboard to edit it. And there's a lot of power in adding that. So, let's say you want to use that topic, you can throw in that topic model, and then boom, you've changed your model. So, a lot of cool settings in here.

**14:55** · And then finally, you can also connect to your other OAUTH providers like Anthropic, Cohere, and all your other LLM providers by inputting your API key here. And you can do that through the keys, and also you can connect to you can change your Telegram token. So, a lot of cool things you can do in this dashboard, which is really useful.

**15:20** · Now, there's one thing I wish it had is that I wish it was similar to Open Claw in the sense that I can message it, that I can also talk to my Hermes through a web UI instead of just a terminal, but it's a nice to have, and I usually just talk to it through the terminal and Telegram anyway, but that's something you have to be aware of that is lacking.

**15:41** · So, I've just shown you how to install Hermes using the CLI, using the command, and you've connected it to Open Router or Open AI, and you're using an API for the AI calls. Now, there's two more options.

### Local LLM Install with Ollama

**15:55** · If you want to save money and use a local AI model, I'm going to show you how to use Ollama, and actually Ollama makes it really easy to install and also integrate with your local AI. So, I'm going to show you that. But the downside is, depending on how fast your machine is, you can't run models that are as powerful, but you save a lot of money.

**16:13** · And then there's a third option. If you want your Hermes to run 24/7, you might turn off your machine and it won't work, or your local server is not running 24/7, then you can consider having a VPS, which is running on a cloud server 24/7, but it will cost money. And that one is actually really hard because you have to learn SSH, you have to learn a lot of different tools, and I found the easiest way to do it using Open Router Spawn. So, I'll show you how to do that.

**16:40** · Here's another way to install Hermes, and this is especially good if you want to run a local model. That means you don't want to pay for an AI LLM, and you want to run the model locally on your machine free of charge. What you can do is you can download Ollama, go to ollama.com, run this command in your terminal, and then you should be getting something like this.

**17:02** · Open the app, and you need download a model. I have another video on how to choose a model using LM Studio, so check that out. And once you've downloaded the model, it's really simple. You can come here to the docs and copy this command. Ollama launch Hermes. And not only does it make the installation really easy, but out of the box, you can choose your local model, so you don't have to pay for anything and have it running immediately. So, I'm going to do that. Open my terminal, Ollama launch Hermes.

**17:30** · Okay, and it's installed, and the biggest difference here is that instead of connecting to a paid service like a Claude Open AI, you can choose your local model, which is running on my MacBook right now. I can choose Gemma 3B. I can connect to my messaging app, but I'll do that later. And then it's going to bring me into Hermes. Okay, I have Hermes running. I said hi, and it says, "Hi there, I'm Hermes, your CLI AI assistant."

**17:58** · Little mistake I made was that I shouldn't have used Gemma 3B because it doesn't support tool calling, and so I have to switch to Cohere 3.5 9B, and it's working on my computer. I'll do a separate video on hosting local AI with your Hermes agent because there's a lot of factors involved to run it properly, depending on how powerful your machine is, but that's how you install local AI using Ollama. If you want your Hermes to run 24/7, then installing it on your own computer might not work because sometimes it switches off.

### VPS Deploy with Spawn

**18:29** · You need a VPS, a virtual private server that runs 24/7. And I think I just found the easiest way to do it and with the most flexibility. First of all, I would recommend using Open Router because it allows you to connect to multiple models.

**18:43** · And inside, I've added my Anthropic, Open AI, and Perplexity keys, so I can connect to those as well. And also interesting to note is that as of April 13th, there is a free model provided by Open Router that apparently performs very well, called Elephant. So, you can definitely use this, and if you put in $10 minimum, then you will get an additional 1,000 requests per day for your API calls. So, use Elephant, put in $10. Now, since we are using Open Router, actually Open Router released a tool called Spawn.

**19:15** · It allows you to easily deploy on a VPS. So, I can click on Hermes, and inside you can see that I can click on Digital Oceans, Bright, Hetzner, AWS, Google Cloud, Daytona, all these with one command. So, I'm going to choose Digital Ocean as my example. All I need to do is I don't even need to open Digital Ocean and run this on my machine. But before I go there, I'll show you what the process looks like if I were not to use Spawn.

**19:41** · I would have to come to Digital Ocean, I would have to choose my server, I would have to choose my operating system, and from my experience, you probably need at least two CPUs and you probably need 4 gigs of RAM as a minimum to run Hermes properly.

**20:01** · I've tried other variations. I've tried to go lower. And the load time is just like painful depending on the server.

### Spawn VPS Setup

**20:07** · And then you have to put in a whole bunch of stuff like SSH keys, choose your backup. So there's a lot of settings you have to go through. And then after you set it up, you have to learn how to SSH into the thing. So there's a little bit of setup if you're going to do it yourself, but you can totally do that. And once you have it set up, you SSH and you run commands.

**20:26** · It's not that hard. But this is simpler.

**20:28** · So the first thing I do is on my computer, not on Digital Ocean, I can install Spawn. And so I'm going to use Warp and I'm going to install Spawn on my local computer.

**20:39** · And then I can run Spawn.

**20:43** · And then I can choose Digital Ocean. And then I'm going to make it the Spawn later. Why not?

**20:51** · And then it's going to ask me to authorize Digital Ocean because I'm logged in and then okay, authorize.

**20:59** · Let's go back.

**21:02** · And it's also got a script to open up my Open Router to authorize. I'm going to do that. That's so easy. It's completed and all I need to do is to enter a passphrases.

**21:15** · And I'm in. I have a Hermes agent displayed so now I just need to SSH into the thing which it automatically does.

**21:22** · Let's choose a model. I can choose Open Router. Let's choose a free elephant.

**21:29** · And let's go hi.

**21:31** · So it's replied hi and it's working.

**21:35** · So I'm running a free model. Let's check a couple of things. On Digital Ocean, I can see I have a droplet in New York City. It's $18 a month. It's got a two CPU and two gigabyte RAM. So this droplet is created for me and it's chosen the smallest possible.

### Verify Droplet and Model

**21:52** · Great. And then let's go to my Open Router and let's see the activity. So it's just run elephants and elephant is free of charge and is responded to my hi. So there you have it. The quickest way to set up a VPS using Open Router Spawn and you can run your LLMs for free using free models on Open Router.

### Provider Routing Tricks

**22:14** · Now that you've installed Hermes using Open Router either on a VPS or on your local machine, I want to talk about little feature of Hermes which is the provider routing. And basically, if you're using Open Router as your LLM provider, you can route based on price, throughput, or latency. And what does this mean? Well, what you can do is you can choose different models to run different things. Sure, you can run the highest model for everything, but that's just going to cost a lot of money. And so the best way to do it is actually route based on different tasks.

**22:43** · So for example, when I'm using Claude for simple tasks, I'll use Sonnet which is cheaper and faster. But for more complicated tasks, I'll use the top model which is the Opus 4.7. And so based on different tasks that you do, you can ask Hermes to route to a different model to save yourself some tokens. And so cheap, I might use a cheap model. When I'm fixing like a simple UI fix, I'll use a lower cost model. But when I'm coding and I'm planning, I use a higher reasoning model.

**23:15** · And so you can set that up in Hermes to save yourself some money.

**23:19** · Now you can ask Hermes to determine it for you which will cost tokens in itself. Or all you need to do is type in mode and then choose cheap or plan or code or whatever you've set and then manually choose the model yourself as well.

**23:35** · And finally, I do have to talk about fallback providers. You do want to set this up because let's say the servers of Anthropic goes down which has happened before, you don't want to be left with nothing to use. So using Open Router, you can say the fallback would be OpenAI and another fallback would be another one. And a little cheat you can have is you can also set a route to free. So you can choose a free model and use that for certain task and when you run out of requests, switch back to a different model. So you can like maximize your free models. So how do you do that?

**24:07** · Well, you have to use a prompt. Set up Hermes for cost saving model routing.

**24:13** · Make the default model cheap, fast for normal chat, summary, small task. And I'll share this little prompt with you or you can just screen cap it. And basically, you input this into Hermes and say, "Hey, these are the different model routings I want." And then later on when you want to set it, you can just type in mode cheap and then it will it will switch to a different model.

**24:32** · So hopefully that helps you save on your token costs. And Hermes will be smart enough to set this up for you.

**24:40** · And what it looks like is that it'll modify the config file and set your provider for different models.

**24:46** · And it'll do that for you. And you can also tell it how to set the fallback just by chatting with Hermes. Okay, now I'm going to show you how to use the Hermes TUI, the terminal user interface.

### Hermes terminal

**24:56** · And open your terminal, type in Hermes and you should see this. Now you can use it on Telegram, Discord, a lot of things, but ultimately this is the most powerful interface because if you type the slash command, you're going to get a lot of these functions are not available in some of the other gateways that you use. Now there's a couple of simple things you can play with. So you can play with skins and you have different themes. If you're into themes, you can have Aries, Mono, Slate, Daylight. Change the theme however you like.

**25:28** · A little fun one that you can do is go to {slash} personality and there are different types of personalities you can choose. And I think the most fun one is probably pirate. So let's go pirate.

**25:40** · Actually, hype would be really funny.

**25:41** · Let's try hype. I'll go, "Hey there." So I I asked it how's it going and it's like going full hype mode. It's going crazy. I'm locked in, fully charged, ready to run through a wall for you. How about you? What are we hyping up today?

**25:53** · Lots of interesting personalities. And on that note, there are two things that makes Hermes and Open Claw agents interesting and that's to set its personality. Now you can do a quick one like this or what I usually do is I modify the souls.md and the agents.md. And basically, souls.md is a personality and agents.md is a brain. So let's look into the souls.md first. So the first thing I need to do is go to my Mac and then I come to my main directory and I go command shift period.

### Customize Souls and Agents

**26:27** · So command shift period and then you're going to see all the hidden files.

**26:34** · And then I go to Hermes and then you're going to see soul.md and I'm going to come in here and open my text editor, whatever text editor that you have. And basically in here I can put in examples of you are a warm playful assistant who uses emojis occasionally, you're a concise technical expert, no fluff, just tactics. So I can actually program my Hermes agent to have a personality. And I like this one so I'm going to use this one. I'm going to save it and then it's going to have a personality. And the way that it speaks to you could be more friendly, could be more concise.

**27:05** · The next thing is the agents.md. By default, it doesn't have one so you can go to the folder and just create a new agents.md file. This is what my one looks like. And basically, it has specific instructions on my coding style and what I prefer. And then there are specific instructions I have when I write my LinkedIn post using my skill which I'll cover later. There's a specific format that I want to follow and what to avoid.

**27:30** · So these are generic rules that will apply every time you message and you can update this and tell Hermes to update your agents.md to have rules set for you that makes sure that the output is exactly what you want and doesn't make like huge mistakes. Now that it has some rules in your agents.md and also it has a personality, I think a third thing you should look at is your user.md. So the user.md is basically a memory about you.

**27:59** · And as you can see the user prefers to configure hi persona. So it's recorded the persona in the user.md.

**28:07** · But here I can put in a lot of information about myself so it knows who I am. So my name is Key. I have a wife.

**28:14** · I can put in my address. I can put in my job. I can put in all these things.

**28:19** · And where I live. And so next time you talk to it, it'll know exactly, "Oh, you're actually from United States in Portland, Oregon." And these are the type of activities I And it'll have a context about you personally to make it a better experience for you. So you can fill that in too to make the experience more personal to you as well. Because as we all know, the more context you provide, the better the AI agent becomes.

**28:41** · Now another thing I want to show you is that in Open Claw, there's a thing called a heartbeat which basically instead of the AI agent waiting for you to prompt it, the heartbeat activates on its own and it's proactively doing stuff and checking up on you. And that's an important feature in Open Claw. And you can recreate that in Hermes. All right, so to create something like a heartbeats in Hermes, you basically need to create a cron job and you want the cron job to run on a regular schedule.

### Heartbeat Cron Jobs

**29:07** · And there's actually a TED Talk by the founder of Open Claw and he says the command he gives is basically surprise me, right? So let's do that. Go to Hermes and say, "Create a cron job that runs every hour and surprise me."

**29:24** · Surprise me is basically what he set his heartbeat to do. And it's created this little cron job that sent me weird facts, tiny poems.

**29:33** · Is that exactly what I want? No. Let's do more. I said, "Hey, check on what I'm doing or skills I have. Give me something more useful."

**29:40** · And it'll create that job for me. I can tell it to give me ways to improve my business or check on my health stats or do something interesting and then come back to me every hour or so. So, that's how you create something like a heartbeat. And I think cron jobs are the center of what Herms can do. Okay, so let's show you some actual use cases of Herms. And the first one I want to show you is I'm a big health guy and I actually created a health app called health data AI analyzer and it imports my Apple data and sets up an API.

### Health Data Skill

**30:07** · So, here I've downloaded it and I'll include the link in the description if you want this. And so, I'll copy the API address.

**30:17** · What I've done is I've gone into Herms and I've typed in I have an API for my Apple health data.

**30:22** · Can you connect to it at this IP address? And it's worked as magic. It wrote some Python code and then it says, yes, I connected successfully.

**30:32** · It reached it and then it's what do you want to do next? And basically, I said let's pull some specific health data.

**30:38** · And I said, look at my sleep data in particular. That has written some Python code and has come back with some amazing data, which is I average about 7.59 hours.

**30:48** · I wake up at about 9:00 a.m. 9:30 a.m.

**30:51** · My highest was 9.8 hours of sleep and my lowest was 5.37 and here's my daily record 789789.

**30:59** · Had a terrible day on the 10th. Only 5.58 hours. And what I'm going to do next is actually to save on tokens and not make Herms write the code every single time.

**31:11** · I'm going to make this into a reusable script, make it a skill and run it as a cron job every morning to see how I'm doing on my sleep. And it's done. And so, it's written the script, it's turned it into a skill and now every day at 8:00 a.m. it's going to send me a message about my sleep and I can add to this. It can check my steps, my workout data and it can also cross-reference my schedule to see how it's affecting my sleep. And so, we could do a lot of powerful things.

**31:34** · And you can do that by downloading my app and you just tap a button on your iPhone and it'll sync your data and you just leave it running in the background and it'll create an API to talk to your Herms and you can do a lot of crazy things with it integrating your health data with everything else that you have.

### Threads Analytics Skill

**31:52** · The next thing I'm going to show you is how I use Herms to grow my Threads account. And if you're a solopreneur using AI to create content, this is useful for you as well. And so, the first thing I want to do is use Herms to get the analytics from my recent posts and see how it's performing. Now, the issue is that you usually need to sign up for an API to retrieve your post data and Threads is notoriously hard to get the API for.

**32:18** · And what I used to do is I needed to install a OpenClaw extension and get the extension to basically scrape my screen and that was very flaky and didn't work half the time. But what happens is that with Herms, I can easily do it. And all I needed to do is download a extension Get cookies.text and then I just export the cookie which has my login credentials and then I'll be able to get my Threads post analytics.

**32:48** · What I'm going to say is, can you get my Threads post data for the past 2 weeks? My account is Here's my account. What I'm going to do is use the Get Cookies extension, export, save it to downloads and then go to downloads for my credentials and then it's going to use that to log in and get my Threads post data.

**33:12** · What I like about Herms over OpenClaw is that it's really good at using the browser to do things and this would have been a nightmare on OpenClaw, but on Herms it's doing it really well. And it's captured all the data and found 34 posts and it's giving me my likes, my replies and then I can use this to analyze the posts and give me what performs best and why. But let's take a look at the data it's giving me as well. So, it's in downloads Threads posts. Let's take a look at that.

**33:43** · So, it's literally found all my posts and it's giving me the like count the reply, the repost. And based on this data, I can build a systematic system to improve my posts. I can see what's working and what's not working, so I don't have to guess anymore. And that way, every post I post in theory should be getting better over time. The big picture is that my top performer is how I'm using Herms agent, why it's a likely a hit. My second one is how I use my Stream Deck.

**34:14** · And so, what's in common, workflows, tools, personal tone.

**34:21** · What I tried, what happened, what I learned, what surprised me. So, I can turn this into a system where every post in theory should hit. So, if you also have a Threads account, I've turned this into a skill as an open source project and all you need to do is clone this and add this to your Herms and you can also grow your Threads account or you can tune it to grow your Twitter whatever social media that you want, but the skill is available for you to download as well.

### Connect Gmail Calendar

**34:49** · To make it a truly useful personal agent wiki LLM, I need to connect it to my Gmail and my calendar, so it knows a lot more context about what I'm doing and my schedule. And so, in order to do that, I use Google. There's a couple things I need to do. First, I need to go to console.cloud.google.com and then you need to create a project.

**35:08** · And the first thing you need to do is click on API and services and there's a whole bunch of services available. I'm going to enable APIs and let's say I want to enable calendar. I'll search for calendar and then Google Calendar API and you need to click on enable.

**35:26** · And that way it will allow Herms to connect to my Google calendar. And likewise, I can click on Gmail and I need to enable Gmail as well. And once the API is configured, I need to go to credentials and you can see I've created some for OpenClaw already, but I'll create one now. OAuth client ID.

**35:44** · Choose desktop app. I'm going to name it Herms. I'm going to download the JSON file. And then once I have it, I come back to Herms, go to my downloads drag and copy it into Herms and it will connect to my Google. Okay, present this URL for me that I need to authorize.

**36:07** · Continue. Choose the authorization level you're happy with. Okay, and then all I need to do, even though I get this error, I can just copy and paste this into Herms and it's successfully connected. So, show me what events I have this week.

**36:25** · So, it's showing me that on Wednesday I have yoga at 5:00 to 6:00 p.m. which is correct about that and is able to read my calendar. And so, I can add this to my health data skill cron job every morning tell me the events, emails that I missed, my health status and give me an update. And that's how you can build your personal wiki LLM. So, chances are if you are watching this video, you've already tried OpenClaw. And originally, I thought it's one or the other. So, if I like Herms, I got to uninstall OpenClaw. And I just needed to pick one.

### Hermes and OpenClaw Combo

**36:58** · But what I realized is you can actually use both. So, here's my personal experience. I like Herms because I think it's got a better memory, it's better at improving itself and as a solopreneur using it one task at a time, it's fine.

**37:14** · It's a better solution than OpenClaw.

**37:17** · However, I do realize that when you are trying to do multi-agent workflows, heavy research, long tasks and complex executions, OpenClaw is better. And the ideal scenario that I found is that I use Herms as my orchestrator, basically the CEO, and then have it delegate tasks to OpenClaw and have OpenClaw come back.

**37:39** · And that's the best way to use both at the same time. And the way I do this is that I install OpenClaw and Herms on the same machine, so it can access the same files. But to make it even better, I've actually stored all the MD files, all the knowledge in my UGREEN NAS. So, then what I do is I just tell OpenClaw to give me the location of all the MD files, all the knowledge base and I pass it to Herms and both of them updates those files on my NAS.

**38:05** · So, even if I have another machine or another agent, it's all stored in one central place building up to my LLM wiki. And when you install Herms, you can also import your data from OpenClaw as well. So, it's actually designed for you to work with both at the same time. And as both gets updated, I think both of them will be good at different things. And having Herms decide which task is best for which agent is actually an ideal scenario because I don't just use one LLM.

**38:33** · I use Gemini for Nano Banana image creation, I use Claude code for writing, I use OpenAI for certain coding tasks.

**38:43** · And so, I use multiple LLMs, so why wouldn't I use multiple agents? On top of that, as an LLM wiki, all the memories are MD files, so it's perfect for Obsidian. So, what is Obsidian? It's basically a tool to store all your information. It's what you call it a second brain and it's based on MD files similar to OpenClaw and Herms. And so, what I've done, I created a folder that has all my OpenClaw agents.md files, my memory, my soul and it also has my Herms agents.md files.

### Obsidian Shared Wiki

**39:15** · So, I can go in and manually change it.

**39:21** · Not only does it keep updating, I can also add additional things myself manually. When I find interesting restaurants, when I'm planning my holidays, I can put all that information into this vault and Herms and OpenClaw can see it and I can manually edit it and update it as well. And so, that's building my personal wiki LLM with all the information that I have in there.

**39:43** · And it's all stored on my NAS, so whatever computer I have, I can access it and build on top of it.

**39:49** · And you can see that it's learning my communication style to be concise. I want immediate action, so it's updating all the time. And so, it's really easy to connect them. It's only a two-step process. The first step is, when you install Herms, import all the memory.

**40:06** · But if you haven't done that, all you need to do is I have it on my network on my drive, Obsidian.

**40:13** · And I just release I have all the MD files from my Open Claw here.

**40:18** · Here.

**40:19** · You know, I'm just saying I have all my MD files from Open Claw here. Can you save all your MD files here in the same folder and share the knowledge? And then I just drop it in, and then I hit enter, and it's going to recognize the information and import it as well. The second thing is, you have to tell that Herms it can command Open Claw. And how do you do that?

**40:38** · So, I have a simple prompt here. You have access to Open Claw installed locally. Use Herms for simple reasoning quick task coordination. Use Open Claw for multi-step workflows to research long running task.

**40:50** · If the task is complete, delegate to Open Claw, wait for result, and return a clean answer. Just copy this and then paste it.

**40:56** · And so, in memory it's storing it can use Open Claw. Let's give it a test. The test is successful.

**41:03** · It's found Open Claw, ran a small test, and it delegated task to Open Claw. And so, I think that's the ultimate setup where you can use both if you have the capability to do so get the best of both worlds. So, here are my final thoughts on Herms. It's not something you just install and play with, but the center of your personal AI system. I'm connecting it to my email, my calendar, my health data, my social media accounts, my business analytics, and even Open Claw, so it can do actual useful work.

### Final Thougths

**41:31** · And when you combine it with skills, cron jobs, and a shared knowledge base like Obsidian, it starts to improve over time.

**41:40** · So, instead of using AI like a chat, you're building something that works for you. If you found this video helpful, please like and subscribe. You can also join my free AI community Substack in the description, where I keep breaking down how to build systems like this.

**41:55** · Stop using AI like chats and start building systems.