---
title: "OpenAI Codex Masterclass  — Vaibhav Srivastav & Katia Gil Guzman"
source: "https://www.youtube.com/watch?v=MhHEGMFCEB0"
author:
  - "[[AI Engineer]]"
channel: "AI Engineer"
published: 2026-04-30
created: 2026-05-13
description: "Codex is no longer just a coding assistant in a terminal. In this workshop, Vaibhav and Katia show how it becomes a full software engineering system, combining frontier models, the Codex app and CLI,"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=MhHEGMFCEB0)

Codex is no longer just a coding assistant in a terminal. In this workshop, Vaibhav and Katia show how it becomes a full software engineering system, combining frontier models, the Codex app and CLI, plugins, automations, and subagents that can explore, review, and execute work in parallel. The session also dives into custom subagents: showing how specialized agents with different models, permissions, and tools can speed up code review, research, debugging, and long-running tasks while keeping control and safety in place.  
  
Speaker info:  
\- Vaibhav Srivastav | https://x.com/reach\_vb  
\- Katia Gil Guzman | https://www.linkedin.com/in/katiagilguzman/  
  
Timestamps  
(0:14) Introduction to the workshop and speakers  
(1:48) What is Codex? (Overview of software engineering agent capabilities)  
(2:18) Foundation models (GPT-5.3, Spark, GPT-5.4)  
(4:11) The evolution of models and performance improvements (Websockets, Fast Mode)  
(7:04) Codex app features, projects, and work trees  
(8:37) Automations overview  
(12:28) Plugins: Skills, apps, and MCP servers  
(15:13) Game and Web development plugins (Playwright and Image Gen)  
(16:26) Demo: Game studio plugin and generating assets  
(17:23) Demo: Google Drive plugin for codebase data  
(18:52) Demo: Setting up automations for Slack and Gmail  
(27:14) Code Review features and integration with GitHub  
(32:39) Subagents: Parallelizing tasks and custom personas  
(36:18) Demo: Using subagents to review persona files  
(44:52) Creating custom subagents  
(49:29) Bleeding edge features: Guardian approvals, hooks, and personality settings  
(56:11) Codex security and Cloud Code plugin  
(57:10) Q&A session

## Transcript

### Introduction to the workshop and speakers

**0:14** · Hi everyone. Thank you for being here.

**0:18** · So today we're going to talk about codeex. My name is Katya Katya Gilusman and I'm with VB. Uh we are both uh working in the developer experience team at OpenAI based in London. And so our role is really to help developers build and get the most out of our products uh including Codeex. And so today we're going to start with a quick CEX overview. Uh just so we know how many of you here are using Codex. Can you raise your hands?

**0:51** · Yay.

**0:51** · Okay, cool. So, we we're not gonna stay too long on that overview part. Uh, and then we're gonna we're gonna do some demos. So, we're going to show you plugins and automations. Uh, VB is going to talk about sub agents and then about the bleeding edge. So, hopefully for those who already know Codeex and use it, uh, you'll learn something that, uh, you didn't know about. And then we'll have some time at the end for Q&amp;A. So, um, feel free to ask anything. Also, this is a a workshop format.

**1:22** · So, you know, if you have like a a pressing question, um, feel free to ask. And I see you all have your laptop. So, also feel free to kind of follow along with us. We're going to show you how to do some things and you can like try it at the same time. And during the Q&amp;A, uh, that's also like the perfect time as well to try things on on your site. Okay.

**1:44** · So um to start just for those who don't know Codex or even if you know it maybe you don't know it that well uh Codex is our open eyes is open software engineering agent. So it's not just a coding agent. It's not just a you know uh an agent that writes code. It can do much more than that. It can run commands. It can run tests. It can explore code bases. It can really do everything that a software engineer would do.

### What is Codex? (Overview of software engineering agent capabilities)

**2:15** · And so it's based on our models as a foundation. So for example, GPT 5.3 Codex was uh our previous ones. We also have the Spark version which is like the super fast uh model that that we have. The the state-of-the-art model right now is GPD 5.4. And we also have a mini version that uh came out last week.

### Foundation models (GPT-5.3, Spark, GPT-5.4)

**2:36** · And you know, every time we make improvements, every time we have better models, Codeex benefits from it. But it's not just the models. On top of that foundation, we have what we call a unified agent harness that will manage uh evaluates the agents behavior and that is a wrapper for tool execution for environment setup for everything that uh can let the agent uh do its work and run smoothly. There's also safety uh the safety embedded in that harness.

**3:09** · So all of that is Codex and then you can interact with it through different surfaces. So you have the Codex app that we're going to talk about in a in a few minutes. Uh you can also interact with it through your idees with the extension. You can interact with it through the CLI and also through other services like Slack for example at OpenAI we all the time just like ping codeex in Slack and ask it to fix things or in GitHub as well.

**3:36** · Uh and on top of all of that, you can also integrate it with your preferred tools so that it can really uh work with everything that you're already using. So, you know, you can integrated with Figma, with linear, with notion, all of that combined uh can let you really like do every can let codeex do everything that a software engineer colleague would do. And so, as I mentioned, this is based on uh our models.

**4:07** · And so I'm going to let VB tell you a little bit more about that.

### The evolution of models and performance improvements (Websockets, Fast Mode)

**4:11** · All right. Um good morning everyone. Uh so um as we've been talking about um the Codex app, the IDE um extension, the CLI and so on and so forth, all of these like harnesses as well as all of these services would not be nearly as good uh without the models sparring them, right?

**4:28** · And just to sort of like uh take a step back uh back when I join joined OpenAI which is not really as far uh back along was in December um our leading model at that time was GPD 5.2 and um and from there we went on to release GPD 5.2 CEX which was a specialized um you know um codex variant of GPD 5.2 you um wherein we we sort of pushed how far you can you can take the model and um you know run it on longunning tasks, how far you can let it just continue chugg along.

**5:00** · Um and then shortly after we followed up with GPD 5.3 CEX um shortly after that in partnership with Cerebras we followed up with uh GPD 5.3 CEX Spark um and and most recently we had uh we released GPD 5.4 for and um you can already see how

**5:21** · we're sort of you know pushing this whole sort of model and harness flywheel as fast as possible trying to bring the next for u next frontier as um as fast as possible to you all right um something to note is uh and and and something that's not on the screen is uh at the same time we also whilst we were pushing for larger models which are um really good for um longrunning tasks as well as really complex tasks and so on and so forth.

**5:47** · Um, we also released uh GPD54 mini uh and GPD54 Nano which you can use for um short running tasks and sub agents um which we'll talk about in a bit. Um and um and something that we haven't really um emphasized on this uh over here is um is two things. one that as we as we sort of pushed on making these models better, we also worked quite a bit on making sure that these models um can be served to you as fast as possible.

**6:18** · What that means in principle is um we um we introduced something called websockets which allow us to um sort of create a connection between your um your device as well as where the where the API resides to be able to uh give you roughly about 1.75x uh faster tokens without um without really like paying the cost over to you.

**6:40** · Uh at the same time we also released um a fast mode which allows you to on top of the 1.75x get 2x more faster tokens and um and this is something which the team is continuously sort of hammering on. Um there's there's lots more speed improvements coming um over there.

**7:00** · And so um to bring this all together um at the start of this year we we brought together u the Codex app. How many of you have used the Codex app? All right.

### Codex app features, projects, and work trees

**7:11** · That's a that's a fair good chunk of uh people. Um to be honest, back in December um and and and even before I was a hardcore CLI user and um at some point um during the app launch while sub was beta testing it, doc fooding it, I um you know the Codex app became really like a really important part of my workflow.

**7:33** · And the reason for that is uh it it brings together a really nice way to work across projects. number one and number two within within a same project work on multiple features at at the same time. The way you can do that is um you can have indiv individual projects like you can see on the on the left side you can have the codeex project chat GPD sora and so on and so forth but also within those you can you can use um work

**8:00** · trees to work on individual sort of feature requests or you know bug fixes or just that Q&amp;A uh all at the same time uh without really interfering with individual tasks. This is something which um we're quite proud of. Um and you know providing a native work tree support helps you um do the same task and do multiple tasks at the same time without really having to context switch as much. Um at the same time um through the through the launch we've been trying to sort of increase um the net benefit you can get out of the Codex app.

**8:33** · Um and some of these features have been um like you know having a better automation support. Uh automations is is also something we're going to talk about just in a bit. Um but the short summary of automations is that you can essentially have a um have a rough process that you want Codeex to run let's say every day at 9:00 a.m. or let's say every evening or let's say you want Codex to look through your calendar uh and and and create like a briefing for you.

### Automations overview

**9:02** · And that all is possible all within like the native uh codex app setup with um with automations. Um and then of course with the with the work trees and like more native git support um you you can sort of work across projects and um uh and just be able to you know push changes as you want with whatever git persona you want to uh do it with. Um last but not the least based on which surface you use uh you use the Codex app on.

**9:33** · Um at the start of the year we released it just on Mac OS but now we have uh native Windows support which comes along with native Windows sandbox. Is there anyone here who's using Windows today?

**9:47** · I'm cheering for you man. And um so uh for the for the for the one gentleman over there uh we have native sandbox support uh in Windows. We're the first of kind. Um there is no other um you know competing harness which supports like a native sandbox for uh Windows.

**10:07** · Cool.

**10:09** · And so I've been talking on and on about like the Codeex app. Uh been talking about you know all the models that we've been shipping but what's what's new in terms of all the features um that we've shipped. Um this is in I think if I'm not wrong in the in the sort of descending order. So most recently we launched plugins.

**10:28** · Um plugins is um is a way that you can bring together skills uh MCPS as well as prompts and you know any other thing really uh together in one bundle and allow the model to do more nuanced uh matching whilst it's building.

**10:45** · Um we also released recently mini models um which tie in quite well with sub aents which allow you to parallelize uh a particular feature or bug request or Q&amp;A whatever it may be um at um at a faster rate all whilst making sure that you don't pay as much cost for your uh for your particular models. Um and then we have like bunch of other stuff which we which we're going to talk about as we go through.

**11:13** · Uh some of this is you know how you can uh how Codex is so good at like code review, how Codex is really good at security um and so on. Um all of this um whilst we talk about all of this um I want to sort of emphasize on this fact that um we're at OpenAI quite lucky uh that the community has really embraced Codex. Um in fact just um just last night we crossed the milestone of uh of crossing 3 million weekly active users.

**11:40** · Uh and this is a pretty big deal. um uh for us and we we want to continue sort of supporting the developer community the the you know enterprises startups building on codec. So um throughout the session if you have any questions please feel free to throw it at both Katya and myself um or even afterwards or just you know ping us um with this I'll pass it over to Katya.

**12:02** · Thank you. And yeah, the the three million weekly active users thing is really it's really cool to see and it's crazy to think that it's also more than tripled since January. So just in a few months we've seen like huge adoption and uh yeah and it's it's uh it's really really cool to see. Um okay, so plugins um plugins I don't know if you've heard about it. It's it's quite new on Codeex.

### Plugins: Skills, apps, and MCP servers

**12:33** · Uh the the native support for plugins. Uh the idea of plugins, I'm going to show you what it looks like in practice and how you can use them is that they bundle a bunch of things together. So like skills, apps, integrations, uh MCP servers, and they they bundle that into reusable workflows. And so what uh skills apps and MCP servers are again I'm going to show you but just to introduce that a little bit. So skills are essentially um reusable instructions packaged for specific processes.

**13:07** · So if you have something that you're doing quite a bit uh you can actually create a skill for it so that codeex knows about it. You can give it instructions, you can give it scripts as well, resources and all of that. uh will save you from just repeating yourself over and over.

**13:27** · So every time you have like a sort of neat workflow that is always the same, you can package that into a skill, you can actually ask codeex to create the skill for you as well. And then apps are connections to other services. So uh you know again uh we we'll see a quick demo but the the tools that you use every day like notion linear all of that uh you

**13:50** · can let codeex connect to it and MCP servers uh you might be familiar with this already but um they basically expose tools for codeex uh to just extend its capabilities further and it's tools from external systems and so all of these three things are already very useful on their own. And what plugins do is that they bundle that so that you don't have to, you know, set up everything manually. You don't have to install multiple skills. You don't have to connect multiple apps.

**14:21** · You don't have to connect multiple MCP servers. You can just add a plug-in.

**14:27** · And uh another thing I wanted to talk about in the Codex app and that we'll we'll show a quick demo for um is automations. Personally, this is like one of my favorite things to do with Codex. Uh because you can set up automations that run in the background, so like a chron job and you can connect apps, you know, you can use uh plugins there too and just set it to run on a scheduled uh time.

**14:55** · So for example, you know, you can set an automation for to run every day at a certain time and uh it's just an instruction that Codex will run in the background.

**15:08** · And the last thing I wanted to show you with the demo right after is uh specific skills for web app and game development because we've uh you know we've heard a lot about developers who want to to use codeex to build these things to build apps to build games and every time you know they kind of repeat themselves every time they kind of use the the same skills. So, we actually packaged that into specific plugins.

### Game and Web development plugins (Playwright and Image Gen)

**15:33** · And uh there's two skills that I want to highlight uh that are super useful and honestly that are a game changer when you're developing something visual. It's um playright interactive. And so for those who don't know, playright is essentially like a a a headless browser like a um you know a sandbox browser uh that you can that Codex can just run and use that to see what it's doing.

**16:01** · So you can open your app in a browser and with the interactive version you can actually click things and uh you know just navigate your app um and and take screenshots and see the and analyze as those screenshots. And then image genen uh is a great way to just generate visual assets for your apps and games. So enough talking. I'll show you a demo.

### Demo: Game studio plugin and generating assets

**16:26** · Um I'm going to start by actually running this uh this one because this one is pretty long. Uh when I ran it yesterday, it took like an hour to build. So I also have like the final version, but I wanted to show you like this this prompt how Codeex is going through it. And so what I'm doing here is I'm using uh the game studio plugin which is again a bundle of a bunch of skills that are helpful for uh game development.

**17:00** · And I'm asking it to use imagen to create visual assets, so sprites for the games and using uh playright interactive to also debug the game and make sure that it works well. So we're going to let that run and uh then we're going to talk about plugins for a little bit. So let me switch to another project here.

**17:22** · Uh so this developers website one. Okay. So this one is uh the repo for our developers website which is here. Sorry, I'm going to put that in full screen. Um and so on our developers website, we have this page with all of the codeex meetups we have. So you know there's a lot and all of that is actually in our repo like in our codebase in YAML files.

### Demo: Google Drive plugin for codebase data

**17:54** · And so I'm what I'm going to do is I actually added this Google Drive plugin here. Uh you know we have a lot of featured plugin uh built by us that you can choose from. You can also of course add your own plugins. But I connected this Google Drive plugin that lets Codeex access my Google Drive.

**18:16** · And so what I did is that I prepared this uh this spreadsheet called Codex events with the event name, date, and city. And I'm gonna ask uh codeex to just update this sheet with the current codeex meetups uh listed in the codebase. So I'm going to start this again. It's going to take a little while. Uh and so let's check in on okay for the the game task is still running.

**18:46** · I'm going to show you when it's doing a little bit uh uh some more interesting things. Uh but the last thing that I mentioned is automations. And so automations is again something that you can just set up using apps. Do you can just ask Codex anything but instead of it being interactive like you're actually using the Codex app, you can set it up to run in the background.

### Demo: Setting up automations for Slack and Gmail

**19:09** · So for example, some ofations that I set up um that are honestly helping me a ton in my day-to-day lives um is one for Slack messages. So, I connected Codex to Slack and I'm asking, "Hey, Codex, can you check uh every day at 9:00 a.m. the messages that I should reply to and flag if it's time sensitive or waiting for an urgent response? Can you also do a summary of all the things uh that have happened since yesterday on Slack?

**19:38** · Uh, and I'm asking that to bucket it to bucket uh per topic." And then uh important information to be aware of. So we have like important channels where company information uh generally the the things that you can uh that that that leaks in like one day but uh gen so uh important company information is in there and so I just want to make sure that I don't uh miss anything here. So that's the kind of stuff that I asked Codex to just summarize for me.

**20:10** · Another one uh that is uh pretty cool is the is connecting Gmail and same thing like I receive honestly an ungodly amount of emails per day and so I'm just asking codeex to check if there are emails that I should actually reply to and uh you to check you know if it's timesensitive or if it looks legit or not because I do get a lot of requests that's not necessarily something that I would uh that I would uh uh reply to.

**20:40** · But this is like saving me hours per per day. And so the way you can create automations is you can create it from here or you can also just you know uh say something like

**20:56** · uh hey codex can you uh create an automation that will um look at Slack and look for anything that mentions uh codeex use cases and then uh list all of the important use cases that I should um that I should uh put on our website. So, I'm gonna let Codex think about this for a second. I should have used Spark.

**21:31** · And it's going to come up with this, you know, it's going to create the automation for me basically. And I didn't specify um when I wanted to run it, but I can actually like Oh, interesting. It's doing something different because this is a live demo. So, obviously it wouldn't uh Okay, normally it will it should like do a little popup. Uh so I can just like click on the Oh, it's doing it. Perfect.

**22:00** · It was just very chatty this morning.

**22:04** · Okay.

**22:05** · Interesting.

**22:08** · Interesting. Okay. So, please create the automation. So, this it should show a little popup if everything goes well. But if not, you can still like create it manually. Uh let's just see if it is doing it.

**22:29** · Okay.

**22:30** · I don't know what's going on, but okay. Let's just do it manually. So, it will you can also create it from here. And basically all you have to do is just call the plugins you want to you want to use uh you know like use uh slack and then uh choose you know the frequency where the automation should run which project it should run in etc. Okay so let's check on our other tasks.

**23:01** · Uh this one is still running. Okay. It generated some pretty cool sprites.

**23:05** · We'll look at this after. Uh let's check on our uh task to update the spreadsheet. So here Codex took two minutes to actually analyze the codebase. It found the source for all of the Codex events where we have our YAML files and then uh it wrote the 57 event rows. So we have 57 events uh currently listed on the website and uh so let's check let's see our spreadsheet and yeah we can see that it was updated. Nice.

**23:33** · So this is something you know this is a simple example but every time you have something that's very you know uh time consuming and uh anything that has anything to do with data data review for example you can actually ask Codex to do it for you. it has access to everything uh on your codebase and you can also feed it other inputs you know like other CSV files and then you can just ask codeex to do that type of work for you

**24:04** · okay now last thing let's check on our uh game so as you can see codeex is actually using image genen to generate I'm going to uh zoom out a little bit so oh Nice. So, it's generating like all the sprites, all the game assets that I asked it to do. And this looks pretty nice. Uh, it's also so it's going to take a while.

**24:34** · Uh what I'm going to do is I'm actually going to show you um final results. But uh as you can see like codeex is just reading um sorry it's just generating all of these assets and then it's going to use the playright skill to see how that looks like in the app. So unfortunately we don't have an hour to wait for this final results. So let me just show you the one that it did yesterday. So, this is un uh untouched like I haven't touched it.

**25:04** · It's literally just CEX um who built this and all of that was like I had I gave zero input. I was just like do a platformer game with platforms made of bricks.

**25:19** · That's it. And uh yeah, it generated everything. So granted the the overall UI is not like you know I would probably iterate on that but um I think the the platformer itself is pretty cool and what is really cool here is that literally like all the sprites like here you know I'm just like moving all around and you know that that's at least like five different sprites of the little character and I didn't have to do any of that.

**25:50** · You can also, you know, do a custom game with your face as input and uh have image gen just like create a a 2D version of you. Um, so that's a way that you can like leverage the image genen skill, the playright interactive skills and that game studio uh plugin.

**26:09** · And just to show you what's inside like we have also the same thing for web apps, but it's a bundle of like all of these skills together. Um, so yeah, that's uh that's it for me. Uh, I'm gonna pass it back to VB.

**26:26** · Thank you.

**26:27** · Thank you. Got all right. Um, perfect. So just to do like a very quick uh checkpoint uh and like a recap on what we've spoken so far. So we went through like all the um all the models that power the codeex ecosystem. Then we went through all the surfaces you can consume codex from. Um and then we went through uh plugins, how to use them and what are some of the plugins that you can use.

**26:57** · You can also create your own plugins um using plug-in creator. um you and and then we went through uh to speak about uh automations um and imagin and and so on and so forth. Um now something to note is like as we as we continue sort of delegating more you know more and more work on these um agents it could be any of your favorite agents uh codeex or not.

### Code Review features and integration with GitHub

**27:23** · Um, one thing that um that you want to be sure of is whatever it is that your agent produces is of the utmost quality.

**27:34** · Which means that um as we as we start sort of working on multiple features at the same time, multiple projects at the same time, it it's going to be quite likely that it's impossible for you to uh go and look through each and every line of code. which means that at least for the first pass you want to have a way um which you can rely on um to review your code and this is where code review um sort of comes in um it's um by

**28:04** · no means um am I bragging about this but uh in my own biased way uh codeex code review is one of the best in the industry right now this is uh something which you know uh people on Twitter and LinkedIn um on our own uh sort of you know platforms Discord and so on and so forth keep raving about uh that how is codex code review so so good. Um so I wanted to spend like a quick hot minute on um on what it does.

**28:27** · So first of all um it is available on the surfaces that you work at which means number one you are able to use codeex code review on GitHub. Um so you can connect your chat GPD account with GitHub and for each and every pull request that you create um you can set it up such that codeex can automatically review each and every pull request and it would typically give you um you know some sort of a uh some sort of a you know um what's this called a

**28:58** · call out like this on the pull request itself saying that hey like this is something that is missing. Hey, maybe you know P 0 fix this, P1 fix that, P2, you know, this is something that would be a good to have and so on and so forth. Uh, at the same time, you can use slash review on the on the Codex um CLI or the Codex app and Codex will spin up, you know, large um sort of review process and so on and so forth.

**29:22** · Um and very recently last week uh with my colleague Dom we shipped um a clot code plug-in for codeex which allows you to um you know essentially invoke codeex within your clot code sessions to be able to get the same sort of state-of-the-art code review but in your plot code sessions. Um so um something to sort of see here is let's say that I am working on a project like this.

**29:51** · By the way this is my this is my actual working setup at work. Uh I this is like all which I work on. Uh I'm not like everything that you see here is like all of these threads all of these projects is something which I work on day-to-day.

**30:10** · So if you see something which you shouldn't just close your eyes. Uh and so typically what I would do is I would um I would go through you know like a like a feature request or I would go through um you know some sort of ask from from someone um and um uh let's say over here I asked the I asked Codex to do a bunch of things. So I'm just going to ask it to review its changes.

**30:31** · Um and so then you get an option to you know either choose from a base branch if you have multiple branches in in the git repo you can choose it against a feature branch against an eval branch whatever it may be and so on and so forth. Uh in this case I'm just going to ask you to review um uncommitted changes. Uh, and what it does is if you see um here, what it does is it spins off a totally new thread.

**31:03** · Um, and what that thread would do is, um, is it would essentially spin up a totally new CEX process which has uh like our own, you know, review system prompt. Um and it would continue sort of looking through not just the diff or like the list of all the changes but it would also contextualize it with everything that is there on the uh on the model repo itself right and so a lot of the times um um codeex code review

**31:31** · will like find find out changes which would have second order effects um which is not limited to just the you know diff or whatever changes you've made but also to some other like modules which you haven't even touched in the pull request itself or in the changes itself and this Um this is so effective that 100% of pull requests across all open air repos made by all employees um including Greg are are reviewed by Codex code review by default um and that's when uh you know that's the first pass that you take um

**32:04** · cool and so as you can see over here um Codex worked for a minute and it came up with these with these sort of uh you know updates like P1 you know localize whatever revenue revenue detail P2 uh translate this to this and um and so on and so forth. And what you can do like after this is like essentially ask codeex to uh either like take a pass at fixing this or like open another sort of PR on the on whichever branch you're at and then sort of go on from there.

**32:35** · Cool.

### Subagents: Parallelizing tasks and custom personas

**32:39** · Now we get to sub aents which is something which I'm personally quite excited about. So uh first and foremost what is sub aents? Sub agents is the um is is essentially the ability uh wherein you can spin off um a master task into decomposible parallel and independent

**32:56** · tasks which you can hand off to agents which can uh which can allow these agents to sort of work independently and then at the end of their run get back to you and um you know give you a response and um over here like sky is literally the limit like you can spin up as many agents as you want um of course as long as your API key or your uh you know whatever charge GBD pro plus go subscription you're on u can can can

**33:23** · take um you can do a lot of like interesting things uh with sub aents um for example what I'm doing um on the screenshot on the left is um I have a codeex agents repo which we're going to look at in a sec it's not public yet but I hope that we'll be able to make it public very soon which has a lot of personas for sub agents that you can use. So, it's kind of meta. It's it's essentially sub aent personas like doc reviewers or, you know, um test case creator or test case runner and and so on and so forth.

**33:55** · And what I um every now and then we would change the change the spec. This is from before we wanted to change the spec of how um how sub aents work. So what I wanted um it to do is to go through all of these 40 50 different sub aent personas, review them and and and make sure that they are up to spec.

**34:16** · And of course doing it without sub aents would have meant that um codeex would open each and every file and then review it and then give me a summary and continue doing it for like 50 different sub aents. In this case, um it it essentially created review slices, which means it created say, you know, these are the two uh files that um that you know uh sub agent uh poly or sub aent Plato uh should you know uh essentially review and then they would spin up a new codeex environment.

**34:47** · They would review those and then at the end CEX will collate all of these and um you know give me back a response. So let's let's give this a shot.

**35:00** · Um so the repo in question is this. Um it's um it's just a codex agents repo which has bunch of personas. Um you can see that we have um we have quite a few sort of personas over here. Um we've got like an accessibility reviewer, architect and so on and so forth.

**35:23** · And this is like actually something which you can create yourself and we're going to touch on that in just a uh in just a minute is um you can you can define your own custom sub aents right um but think of this repo as like a collection of these sub aents and um this is typically what you would have for for each and every sub aent you would have a name you would have a description you would have a different sort of like you know sandbox mode whether you want it to be write only whether you want it to be read only um you and then you would have some sort of like you know instructions um and so on.

**35:57** · And so now what I'm going to do is I'm going to ask Codeex to um I'm going to go over to my Codeex agents. Um I'm going to switch to let's do medium over here. Let's close this.

**36:16** · Can I make this full screen?

### Demo: Using subagents to review persona files

**36:21** · All right. Um so let's give it give it a task. um spin up 20 sub agents to review all the sub agents.

**36:37** · So this is a very simple task. All I'm asking uh codex is to do u the same task which I was showing before um wherein I wanted to review all the different sub agent personas in this repo. And you can see that um uh you know there's it it already figured out that there's like agents and skills and it's looking into it. There are 45 curated persona files and uh what what it's going to do is it's it's going to create 20 reviewers and um um it it's going to give them all of those um um toml files and then it's going to review those.

**37:10** · And you can see that um there's two things which is quite interesting over here. Number one, Codex automatically decided that this is potentially u a complex task. So it automatically kickstarted the plan mode uh which is what's active over here. So you can see that uh it um it essentially came up with five tasks u to solve this particular problem. Um you can explicitly invoke plan mode as well, but uh in this case it decided to do it on its own. Um, it's it's then partitioning all of these persona files.

**37:40** · Um, and then it's going to spawn 20 sub aents very soon. Um, I swear it's faster. Uh, but um, so now what it's doing is it's um Oh.

**38:03** · Uh so for some reason on my on my particular setup I have a cap on six like six concurrent agent threads that can be run at the same time. Um we can fix that. Um but to go back up what we can see over here is that uh it at least spin up six agents which is my limit uh for now. And I can see all of those agents um you know working over here. I can quickly see like what Jason the agent over here is doing uh or Hume and so on and so forth.

**38:35** · And you can see that uh something to note here is that the the main codex model over here, hi. The main codex model over here um essentially created a persona, right? Um and and not just that, it doubled down and it it gave the exact files that this particular sub aent should review, right? Um a and and uh additionally it

**38:59** · also gave it some some insight on um there's there's repo guidance in repo.mmd in contributing.mmd in skills and so on and so forth and um it will sort of continue going down this this route for all the different sub aents right um and what it does towards the end stage is that um it will tear down all of these sub agents when when they have gone through um when they have gone through their whole process of looking through all the TOML files and so on.

**39:29** · And if I go back to uh my main thread, um you can see that two of the agents are are still working.

**39:38** · Um but eventually like it would collate all of this feedback that it that it has gotten from um all of these individual sub aents and you know proceed. Um now you can you can think of this this is like a very simple sort of explorer use case right but you can think of this from for example a cyber security perspective wherein you have um a git commit or you have a a particular git repo and you want codeex to spin up and run multiple uh you know vulnerability

**40:11** · um sorry one sec you wanted to create multiple sort of you know vulnerability analysis from different points of views or from different hypotheses and you wanted to sort of tackle the same diff or the same GitHub repo and try and come up with like a vulnerability map, right?

**40:27** · And this is something we actually use um um quite a bit or I personally use quite a bit when I'm brainstorming a particular feature. I would just spin up multiple codec sub aents to sort of look through how I would approach a problem.

**40:42** · Right? So let's say I want to add a feature. I would ask Codex to create a plan for what are say five or six or 10 different ways that uh that a model um that a particular feature could be implemented and then I would quickly double down on could uh like and ask codeex to um then create multiple sub aents to get me some sort of understanding for um for these tasks.

**41:08** · Sorry, my watch was constantly vibrating. Um and and so that's like um that's like a quick highle overview of how sub aents work. Uh by default we ship three sub aents um three sub aents personas. Um let me quickly open. So by default we ship um three personas.

**41:40** · One is like a default general purpose fallback agent. Another is a worker which is sort of execution focused. So this is something that you would use for um you know when you want codeex to write a particular feature request uh or work on a particular feature. Then there's explorer which is the same one which we used uh before and and then for for each of these you can double down and create your own codeex um sub aent personas like we saw before and we will create one right now.

**42:11** · Um something to note is um is that these particular sub aents um they like for each of these you can define what model you want to use. You can define what reasoning effort do you want to use you can define what sandbox mode do you want to use and so on and so forth. Um the reason why this is important is for a review agent you would almost always 100% want to use the review agent in readonly mode. you would never want your review agent to execute anything, right?

**42:41** · Um for same reason for like a cyber security vulnerability u assignment, you would want your um your sub agent to always be in readon mode.

**42:51** · But for a for a um for like a docs writer or for something which like you know creates um docs for a particular feature that you've created or a bug report and so on you do want to give it write access so that it can execute stuff and also create a um create a bug report for it as well. Um something to note is that you can also double down and give these um sub agents you know more capabilities by giving them uh MCP access.

**43:21** · So you you can just give um you know let's say you can give a sub agent MCP access to Sentry so that it can look through all of your um um all of your reports over there or like one sub agent access to your linear um you know backlog so that it can um it can interact with linear it can uh read through all the um uh all the issues added to you triage them and so on and so forth. You can also give them skills.

**43:48** · Um so really you can um um if you really want to you can quite heavily customize this entire setup for your own um for your own use case. So let's open um our codeex app again.

**44:08** · You can see that it went through all of these sub aents. It created a bunch of uh other sub aents just to go through all of these and uh it came up with these findings. Um it's like based on readme based on contributing uh performance investigator um is overprivileged um P1 has a sandbox mix

**44:30** · uh sorry verifier has a sandbox mismatch same for writer and so on and so forth and so you can see this is already quite useful um and it saves you quite a bit bit of time to be able to go through all of these uh individually or sequentially and so on and so forth. Um now let's go back and see a bit more about custom sub aents.

### Creating custom subagents

**44:52** · Um so as I mentioned that we ship three um sub aent personas but at the same time you can create your own custom sub aents. In fact we do recommend creating your own sub aents or just ask your your codeex to look through your past sessions and create sub aents for you.

**45:08** · Um both of these scenarios work and um work quite well. So in in this particular case uh you can see that we have a PR explorer sub agent which um reads your um your codebase uses GPD 5.3

**45:24** · codex spark which is our um research preview model text only um deployed on Cerebras um and is blazingly fast is quite fit for this particular use case and we set sandbox to read only so we don't want the model to sort of execute and we give it certain u you know ex in instructions.

**45:44** · So in this case we say hey stay in the exploration mode uh trace the execution path you know um don't propose any fixes and and and just like you know search through and and and figured out like what what what exactly do you want us to do? Um now let's quickly try and try and um create a sub agent. So let's say we want to do um docs researcher.

**46:16** · In this case, what I what I typically do is to just go and ask um hey Codex, can you create this sub agent um for me? Uh here's here's its persona. Um, and then let's see.

**46:41** · And so what Codex is going to do because Codex is aware about um about how it works and you know uh what it's supposed to um do and where it's supposed to place uh all of these things. Uh what it's going to do is it's going to create a TOML file for this docs reviewer.

**46:58** · And in this particular case, this is this uses the docs MCP server which we created um um from the DX theme um which packages all the API references, all the docs, all the guides, all the you know toolkits and so on and so forth and uh it will add that as an MCP server so that every time we ask it um ask it a question about hey like what's the best way to use GPD 5.4 before with websockets or what's the best way to use GPT realtime with um um with I don't

**47:32** · know pick your favorite way of using GPT real time and um and can you create a react plug-in for this and so on and so forth. Um uh it would be able to reference all of these things. So, I'm gonna let it do its thing and in the meantime, um, head back over to the slides. And so, just to go back, sorry, one second.

**48:00** · Um what you can do just to sort of invoke um you know a particular sub agent is you can say um hey can you reviewer sub agent and review each and every persona based on the developers docs. So, uh in this case you can you can essentially like use the same particular um sub agent uh leverage it again and then ask it to do the particular task that you want to do.

**48:40** · Now, what are some like interesting ways that you can use this is um imagine like you have like a long build process or you have a test process. You can have a sub agent which can run your test case locally. You can have a sub agent which can uh always make sure to um oh I'm I'm being told that I don't have as much time. Uh um you can have a sub agent which can pull the latest from uh from GitHub as soon as you do a pull. You can have a sub agent which can uh you know quickly um pull all of the context from a linear issue and so on and so forth.

**49:13** · So really like you can you can you can do this for you can leverage this for a lot of um things and the best thing that I like to do is to just ask codeex to look through my past sessions and recommend me certain automations certain sub aents and so on and so forth that I can use.

### Bleeding edge features: Guardian approvals, hooks, and personality settings

**49:29** · Cool. So now we're at the at the bleeding edge. Um this is bunch of stuff which we have shipped in the past and um we haven't really made as much of a splash about. Um so um what we're going to do is we're just going to quickly go uh around and see like what each and every one of these um uh do and and how you can leverage them. So first and foremost is guardian approvals. This is an experimental feature. You can activate it today uh by just going on /experimental.

**49:59** · Um so it would be something like um codeex hopefully it works and then you can look at um experimental and you can um in in my case I already use cardon approvals and you can activate it this way.

**50:20** · Um what card approval does is um all of us including myself at some point were um guilty of using yolo mode all the time which means that you by default give unfettered um access to your coding agent to do literally whatever the hell it wants right and this by all means and measure is not safe. Um hence we came up with something called guardian approval which for each and every time codex needs um a privilege needs to run a privileged task.

**50:51** · Let's say it is uh can I remove this particular directory? Can I run a server? Can I expose a particular file to um um to the internet. Whenever all of these things sort of pop up, what Codex will do is it will spin up a new sub agent, right? Which will based on a particular prompt try and verify whether or not this is something which needs my human interruption or not. Um and in most cases it doesn't need you know human interruption.

**51:21** · So it will just say hey go on run this particular you know privileged tool or privileged task and so on and so forth. And um this way what we what we hope to do is we hope to reduce the human fatigue uh that comes by just you know always sort of having to approve you know do this task do this run this particular bash script or run this and and so on and so forth.

**51:41** · In um in principle, how would that look is um trying to see if there was um Uh, okay. It doesn't show show it to me right now, but if I just in the interest of time, I'm going to ask uh, hey, can you run the dev server? And I'm going to instead of full access mode, uh, which for some reason again I'm not able to, uh, click on.

**52:41** · Let's let's try and see um if it if it invokes um guardian approvals.

**52:48** · Whilst this this works, I'm going to head over uh to the next step which is hooks. Hooks is also something which is experimental right now. We're we're trying 24/7 to try and make this uh a better experience. Uh currently Codex supports three hooks. One is after each tool use, one is at the start of a session and third is at the uh when you stop a session. What hooks allow you to do is it allows you to programmatically ask codeex to do a thing x uh based on a particular event.

**53:17** · So let's say that when you start your um your codec session you want codeex to pull the latest from your GitHub repo. So in that in in that particular case you would want to set up a start hook. Um if you want Codex to do something after each tool use let's say um for a lot of researchers who want to document each and every tool use they might have like a per tool use hook wherein they document what Codex has done uh per session and so on and so forth. So you can do that with that.

**53:46** · Um and um last but not the least something which I personally use is the stop hook which is when I'm running long running tasks I would um at the end of each turn uh of codeex I would ask it to keep going so that like it just continuously uh you know continuously keeps running a particular task and um in in theory how this would look like is um is Where is it?

**54:22** · Is sorry one second. Wow. I was really prepared for having more time. Um I have to say but um in theory how this would look like is um is that you have some sort of a Python script um and you have you define like a hooks.json. So in this particular case you can see over here that you have a pre-tool use um you have some sort of a

**54:49** · you know matcher you say like on startup or resume run this particular session dot session start py and so on uh and you can define how you want to uh in this particular case um so what I did for for example uh for the sales dashboard example that I've been showing you so far is I created a hook for stop which runs this Python script which is keep going UI um which is every time it encounters the stop um um hook, it would

**55:18** · just ask Codex um to keep going, do one more pass, run one one solid validating command, type in one more thing, and then stop and give the result. And so for really longunning tasks, you can just set it up and like ask it to continue doing its own thing. Um last but not the least um we have personality changes which means that you can go on codeex and you can ask it to um quickly look at personalization. You can set up different personalities.

**55:49** · You can set up a more uh friendly personality or a pragmatic personality based on whatever you want to do. You can also add custom instructions. So you can ask it to always site whatever it is it is doing and so on.

**56:04** · Um right and then last two things um is we released something called codec security. This is our state-of-the-art uh model which allows you to find and fix vulnerabilities in in your GitHub projects and um you know essentially what it does is it would go through commit by commit and um it would create a vulnerability patch uh and then and it would use codeex to then sort of patch the set changes as well.

### Codex security and Cloud Code plugin

**56:35** · Um lastly um as I mentioned before we released a cloud code plug-in uh which allows you to use codeex in uh in cloud code. Uh this is something which was uh surprisingly used quite a bit by the community. Um and this is something which allows you to sort of ask Codex to review whatever it is that you've done so far. Run an advers adversarial review or just like ask Codex to rescue whatever changes you've done so far as well. Um that's it. Thank you so much for for joining us and feel free to ask any questions that you might have.

### Q&A session

**57:10** · Hi.

**57:10** · So, we don't have a lot of time for Q&amp;A. Unfortunately, we should have started maybe a little bit earlier, but uh happy to take maybe a couple questions in the room and then we'll stay here anyway. So, if you have questions and you don't have anywhere to be, you can come to us.

**57:24** · Yeah.

**57:25** · Thank you so much. I have a question.

**57:26** · you said a couple of times that there's like a way to uh scan uh let's scan the past sessions and basically give your recommendations for that. How exactly do I do that like a project with like 20 threads or something like that? How you want to scan that? Yeah. So what you typically do is like all of the sessions within Codex are put in uh dot sessions within a particular within the same codex folder and CEX has the ability to just like scan through all your sessions and then you know this using the CLI but not

**57:59** · I can do this using CLI but not using the COX you can use it uh you can use Codex app, you can use Codex CLI, anything. Um, you just have to ask it to look through the sessions and yeah, do whatever you want to do.

**58:13** · Nice.

**58:14** · There's another Oh, okay. Maybe a couple more.

**58:17** · Yeah.

**58:18** · In the back here.

**58:23** · Hi.

**58:24** · Hi.

**58:25** · Is there a way to hand off a task to a cloud agent? So, let's say I'm here working on a task and I'm I have to close my laptop. So, I off to a cloud agent.

**58:35** · Yes, definitely. We didn't touch on that but actually uh you can do that from the Codex app directly like um maybe you can you can show your screen but you can either work locally and as you mentioned you can do it like we support get work trees as well uh but you can also just select cloud here and you can select the number of uh times this task should run

**58:56** · like you can parallelize we call that like best of n so you can like run it four times in the cloud and then just pick the best output uh so that's something that is like built in in the the Codex app in the ID extension and you can also like access it directly from the the web interface and there's more cool stuff coming on that very soon.

**59:16** · More what?

**59:17** · There's more cool stuff coming on that very very soon.

**59:21** · I think there was one right here. Yeah, thank you so much. Um my question was actually about the cloud UI as well because um today sub agents aren't supported if I'm not wrong and uh especially the thing that bothers me is it doesn't use the the skills that are in the repo is that coming soon or so um there's like a at the risk of uh

**59:54** · uh you know talking about the whole road map uh we we we we definitely have a lot more changes coming up on that particular front. Um I'm not sure if skills within cloud is going to be as soon as I say that it it's going to be but u it's definitely at the top of the mind and we do want to sort of add uh you know give you the ability to sort of like have your own trusted MCP servers to be able to run there or CLIs and so on.

**1:00:18** · Um and also the ability to just like have SSH agents u that you can just spawn off uh a particular task to on a VM and so on. So lots of work on that.

**1:00:30** · Like it can use skills in the repo, right?

**1:00:32** · That that is checked in. It's not on cloud tasks.

**1:00:36** · Yeah.

**1:00:37** · But like if you like it it reads instructions and stuff and you can like find it and like still see it since it's in the codebase. It's more like the the skills that you have locally that work the same. The reason why we don't allow it on on cloud is because there's no way for um the sandbox to know whether or not a skill is trusted or not, right? And so that's why we we we don't and like skill can package like a Python script or or an execution.

**1:01:04** · It won't execute things, but like if you have, you know, like things like resources, it can access it technically because it is like in the repo. It's just Yeah, it's not as good.

**1:01:14** · So I have to request it.

**1:01:17** · Yeah.

**1:01:17** · Thank you. Thank you.

**1:01:22** · Were there any other questions?

**1:01:26** · Cool. Have a great day. Enjoy the day. And uh if you have any other questions, we're going to be around um today, tomorrow, and also maybe on Friday. U feel free to reach out or just like drop a DM. And um enjoy.

**1:01:41** · Thank you.