---
title: "Claude Cowork Deep Dive: Live Artifacts, MCP Connectors, Dispatch and Remote Control"
source: "https://www.youtube.com/watch?v=IIqiNPavq08"
author:
  - "[[Claude Community Australia]]"
published: 2026-05-14
created: 2026-05-14
description: "Dominik Fretz (Claude Ambassador AU, Harbor Edge Intelligence, https://harbouredge.ai, https://dominikfretz.com) walks through Claude Cowork from the ground up - covering the features most people miss"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=IIqiNPavq08)

Dominik Fretz (Claude Ambassador AU, Harbor Edge Intelligence, https://harbouredge.ai, https://dominikfretz.com) walks through Claude Cowork from the ground up - covering the features most people miss. This session includes a live demo of building a Python MCP server from a single prompt, connecting it to a live auto-refreshing dashboard, sending a Slack message on a schedule, and remotely controlling a home server via Dispatch. A practical guide for anyone who wants to go beyond basic Claude chat.  
  
Recorded at Claude for Everyone - Sydney, 30 April 2026.  
Organised by the Claude Community Australia - https://claudecommunity.au  
  
Timestamps:  
0:00 - Who's already using Claude Cowork? (audience poll)  
1:03 - Why try Cowork - the case for non-coders  
2:08 - New feature: Computer Use now available in the desktop app (Windows included)  
3:09 - Windows tip: avoid directory paths with spaces when using Claude Code  
4:10 - Demo: opening a project folder in Cowork  
5:21 - CLAUDE.md files: giving Claude per-folder instructions  
6:28 - Hierarchical CLAUDE.md across subfolders - company, finances, advertising  
7:28 - Live Artifacts: moving beyond static outputs  
8:31 - Demo: building a Python MCP server from a prompt  
9:31 - MCP connectors explained: Gmail, Drive, custom databases, your own app  
10:35 - Live dashboard demo: auto-refreshing synthetic ecommerce store  
11:36 - How Dom built the MCP and frontend entirely inside Cowork  
12:39 - Skills: encapsulating prompts into reusable building blocks  
13:40 - Running a Slack-connected routine from within Cowork  
14:44 - Scheduled routines: daily digests, hourly checks  
15:49 - Dispatch: send commands to your desktop computer from your phone  
16:51 - Real-world Dispatch setup - what "always on" actually means  
17:54 - Overview: plugins, skills, connectors - what Cowork can do  
18:55 - Q&A  
19:56 - Q: Where is the Dispatch message history on mobile?  
20:58 - Q: How do you hand off context from Chat to Cowork?  
21:59 - Tip: ask Claude to export a markdown context file before switching to Cowork  
23:18 - Q: What is Dom's home server setup?  
24:19 - Dom's rig: Windows WSL desktop + ZeroTier VPN + GMKTech machine  
25:21 - Remote Control (/rc) in Claude Code: sharing a running instance across devices  
26:24 - Demo: SSH into a remote Claude Code session with /rc  
27:26 - TMux for persistent Claude Code sessions that survive laptop closure  
28:40 - Q: What is the difference between Cowork and Claude Code?  
29:44 - When to use Cowork vs Claude Code: abstraction vs control  
30:49 - Q: Computer Use explained + the token cost of regenerating artifacts  
31:51 - Fix: store scripts as files, run them on demand instead of rebuilding each time

## Transcript

### Who's already using Claude Cowork? (audience poll)

**0:01** · All right. Um, next I I going to speak a little bit about Claude Coberg. Now, can I get a bit of a sentiment? Who has used Claude Coberg?

**0:14** · All right, I might be boring you.

**0:18** · All right. So, are you guys using it every day? Those that do every day. H.

**0:26** · All right. um ev every couple of days or so.

**0:31** · Okay. And just like once a week or once a month. All right.

**0:38** · But the so for those that sat in the front um you didn't see the the vote essentially but yeah clock coork is a big thing um or it's it's used a lot and I was talking to you before um in even in businesses like it it is getting used um and for those few that are not yet using it if you have a claw subscription I definitely recommend that you guys uh go and have a look at it and uh see see what is it about.

### Why try Cowork - the case for non-coders

**1:09** · Um so I'm going to probably keep this a little shorter, but you have there's a couple of new things in there that I wanted to highlight as well.

**1:26** · So if you haven't updated your cloud desktop in a while, um one thing that you might have seen the it used to be that you switch between chat, co-work, and code. um at the at the top here. Um this is now over on your right hand side. Um another thing that you might not have not uh found out yet, if you're especially if you're on Windows, um that has been released uh not too long ago.

**1:53** · Um if you go in here, go desktop app, uh you can actually now enable computer use. Um so the claude can now use your computer. So, you're not just limited to using um the web browser with a Chrome plug-in, but you can actually get it to use your computer and like go to applications that might be uh proprietary that might not work in a browser. So, you can start it right there. Or you have a particularly nasty Windows issue that you can't fix.

### New feature: Computer Use now available in the desktop app (Windows included)

**2:26** · So, hey Claude, just just go and fix this Windows issue. Go and find it. go go go through Windows. Um, obviously do this with a bit of care because it can go and to your drive and say format and then everything's gone, right?

**2:44** · So hasn't happened to me but I haven't heard anyone that that happened but like this is a this is a thing and with co-work and with things like computer use um and claw code especially if you're on Windows be a little mindful around directories with spaces and a lot of Windows directories have spaces but spaces and directories are tricky for for developers and are tricky for claw code.

### Windows tip: avoid directory paths with spaces when using Claude Code

**3:16** · Um, and there's I'm not going to bore you with the techn technicalities, but just be a bit aware. If you have a choice, choose a directory to work in that does not have spaces.

**3:29** · Make things um a bit safer. Um, cool.

**3:33** · So, if you never open co-work um this is how co-work looks. Um the one thing that a lot of people um get tripped up before when you just use chat uh you essentially just you

**3:53** · live in the chat and you want to to work on a file you just drag the file into into claw code or into claude into the chat with co-work the first thing that you do really is work um work in a project or work in a folder. So you really go in um into your drive and famous uh famous problems with demos.

### Demo: opening a project folder in Cowork

**4:19** · Um it doesn't load the drives properly, but we can go in here say co-work. So now I can say okay everything that that I'm going to be doing should be in this April 30th folder. Um and for those that uh come from a clawed code background or have used claw code um the interesting thing is that you can um create a claw.md file.

**4:51** · So a claw.md is kind of is instructions. So what is this folder or this project about? Um, now I didn't create one uh for this one, but if I go,

### CLAUDE.md files: giving Claude per-folder instructions

**5:21** · so if I go in here, um, which is the base of, uh, of this fold of this project. If I um No, if I go into into cloud MD um this is all about the cloud com

**5:46** · community and then I go into uh sorry that's where we are um context open this instructions Right. So, this is the instructions for this specific folder and Claude when I start a new chat in this project or in this folder um Claude will read this. So, if Claude does always something weird that you don't want, go into here, go into the instructions in this folder and say, "Claude, don't do this."

**6:18** · Like, do it this way. Here is is a good example. So, if you have a project that contains all your LinkedIn posts and like, hey, this is a good post and this is a bad post, don't don't put all those emojis in. I'm I'm more than 13. Like, go and put that in your cloud MD. And the important thing that is um the important thing about that is as well this is uh this is hierarchal hierarchical. So, if you have a subfolder, you can create a cloud.

### Hierarchical CLAUDE.md across subfolders - company, finances, advertising

**6:52** · them the in the subfolder. So you can have one folder um my company and then you can have with some instructions and information about your company and you can have a finances folder and then in there you have another cloth of MD that contains information about the finances um you can have advertising and then that's there there you have references to the to the um to the design language or to the to the advertising language uh that you use.

**7:23** · So really like make use of these cloud MD files in the folders that you that you build.

### Live Artifacts: moving beyond static outputs

**7:32** · Um now another thing that recently been added is life artifacts.

**7:45** · Um and this is this is the artifacts or this is the project where I built one of these artifacts. And I I can show you kind of what I built or how I built it, but I want to open it. And tada, there's an error.

**8:01** · Tool call failed.

**8:05** · How do we fix problems? We restart.

**8:11** · So, this was um meant to Nope.

**8:23** · So what what I did here was I created a connector and I created a um an MCP server essentially. I created my own connector that um is simulating a an e-commerce store uh to give you guys some demos or some ideas.

### Demo: building a Python MCP server from a prompt

**8:46** · Yeah. Okay. Doesn't work. Um so the idea about this regularly if you go into claude and um build something uh go and say hey build me build a uh a dashboard for me those dashboards are static right they don't update um unless you go and tell claude hey go and update it uh let's see here but what

**9:17** · we really want is something that goes and pulls data. So in this case, I've built I I used an MCP server or connector for those that are new to this world. A connector in claude can connect you to any to a lot of different data sources. So it can connect you to Gmail, it can connect you to Drive, it can connect you to your own database, your own application if you have one of if somebody built an MCP for you.

### MCP connectors explained: Gmail, Drive, custom databases, your own app

**9:49** · So, um I was talking to somebody from uh some uh investment company recently and they're like, "Hey, we have our own MCP servers that use our database or our we have our own um service that that provides information to Claude. This is an MCP server. And now we can integrate that into cloud desktop and into co-work to create um create things for us in here.

**10:21** · Oh, there we go.

**10:23** · With the magic of cloud. Um so a connector can be essentially do anything um that h talk to anything that has an API. Uh if you don't know what this means, come and talk to me. Um this is how we talk how IT um infrastructure talks to each other and the it's fairly easy to create an MCP for your own business. Um and what this MCP does here uh is is just a simulated e-commerce store.

### Live dashboard demo: auto-refreshing synthetic ecommerce store

**10:57** · So every 5 seconds or so there is a random article being bought or something happening in there.

**11:04** · Um, so if I go to auto refresh, uh, hopefully we see the revenue go up.

**11:12** · Um, again, this is simulated data. Maybe not so much fun, but you can see how you could use this for trading, right? We could combine that with Sheldon and have, hey, here is a ticker that of symbols that you want and we we go and uh and look at that. Um, how did I build this? I, if we scroll all the way up, um, it's like, hey, I want to create a live artifact demo.

### How Dom built the MCP and frontend entirely inside Cowork

**11:41** · Created create a Python MCP server that returns some synthetic data. Um, and then this can, for example, this can simulate an e-commerce store. It asked me some questions. It created um a bunch of files. Um I can I can go into into the folder, right? So sources, this is uh this is something else. This is the the MCP server that makes up the data. Um it it told me how to integrate that.

**12:12** · Um this is running all on my machine. I couldn't really give that to someone else, but um it that was good enough for the demo. And then I had to fight a lot with uh with Claude to get everything sorted out. But and in the end um this is where you're getting at. There we go.

**12:36** · Um so the the life artifacts really is the next level. And you can also do things like uh um you can also then take go and say hey um here is here is something that I want you to do. Um and for example I said hey go and look at that other project that we had.

### Skills: encapsulating prompts into reusable building blocks

**13:02** · Um we built this MCP and we built the friend the front end and now go and build a routine or go and build something on top of that. So in this case um give me uh give me an overview of what happened in the last 20 minutes in my online store virtual online store.

**13:20** · Um and it it can send a DM. Um I went on and said turn this into a skill. A skill is essentially an encapsulated bit of uh of prompt. So this is the prompt and the the what I wrote and we can encapsulate that and put give it back to Claude and say hey put that in your in your store of things and then it doesn't have to figure out everything every time. Um there was a little bit of a downtime at Entropic today.

### Running a Slack-connected routine from within Cowork

**13:51** · So in the end importing the skill didn't work but I can probably just say um run the pulse and So now it should uh it should go it should collect the data and then what I expect is that it is running um calling to the slack slack connector. Yes.

**14:17** · Uh, always this is always why demos with LLMs are the worst because you're just waiting there waiting waiting and have to talk about um but anyway so while this is is running so the the Slack connector is another thing I could for example go and say hey create a scheduled routine every

### Scheduled routines: daily digests, hourly checks

**14:44** · morning give me an update of what happened in the customer support channel right if you're If you're the boss, you want to know what happened, what are the important thing things that didn't that worked or didn't work. Um, so you can go and create a schedule. Um, when you go schedule name, a description, and then really the prompt. Um, it can work in one of those projects and you can say run it hourly, daily, weekdays, weekly um, and it goes back and does um, the same things again.

**15:18** · Um um another part that you might want to look into if you haven't um there is the dispatch function. Um and dispatch is if you have been working with or looking at um open claw or zero claw or how they all um are called then this is kind of the closest thing that you um that you can get.

### Dispatch: send commands to your desktop computer from your phone

**15:50** · Um this connects through the the entropic server to your phone or or rather the other way around. So the phone connects to to the dispatch. So, I have Claude um app on my phone. If I go in here, I can go to dispatch um and I don't know what the the last thing is.

**16:17** · All right.

**16:22** · Um tell us a joke.

**16:27** · Not very well. But so you see the you saw the the message come up and it's doing something. It's why did the AI go to therapy? It had too many open tabs and couldn't stop overthinking. All right. Um but um obviously that's not the main the main purpose, right?

**16:49** · But if you're out and about, you can be on your phone and you can um give your computer that's sitting on your desk a a command. it has access to whatever you have connected to it. So, Slack or uh the browser or other um other things. Um quick thing for that your computer has to be on. It has to not not go to sleep.

### Real-world Dispatch setup - what "always on" actually means

**17:15** · So, um keep keep awake and allow if you want to use it to use the browser um you can say yeah do that. Um, and so if you have a laptop, if you close it and put it in your bag, that's not going to work, right? So, this is more for people that have a desktop, one of those old things, or a Mac Mini, um, sitting on their desk, always on.

**17:42** · Um, so I I have another computer that is always on where Dispatch is usually connected to because I carry my laptop with me and it's turned off.

### Overview: plugins, skills, connectors - what Cowork can do

**17:54** · Um, cool.

**17:56** · There is loads more. There is, um, there is plugins, um, skills, uh, and connectors where you can connect your own apps. If you haven't looked at this, go and go and try it out. Connect it to something. Connect it to your Gmail and say, "Hey, give me give me a review of all of the important what you think is important um, from the last 24 hours.

**18:20** · Um you can set it up so that at 5 in the morning you create it creates a um it creates a an overview sends it via Slack um or puts it in your in your chat here in in claude and you can go and look at those things. Um this was is only scratching the surface. There's lots more that we can do with this, but um if you haven't used co-work then, uh go go go and look at that.

**18:52** · Um quick intermediate question. How are we with pizzas? They're here. All right.

### Q&A

**19:00** · So, I think I can smell them. That now that makes sense. Um all right. Do we have questions to cowork or do you just want to go for pizza?

**19:12** · All right. Let's let's let's do a couple of questions.

**19:16** · Hello.

**19:18** · Uh so where is the message chat history for co-work? Because when I go on my phone and I can't see the history that's on my computer, it's kind of disturbing. Yeah, dispatch doesn't do doesn't do history. dispatch is its specific own channel within co-work and you have access to the to the dispatch message history but it's not in a way where you can um can like go and see all the other chats.

**19:45** · Okay. And the messages don't live in the folder where I'm working in.

**19:51** · Um no as far as I know.

### Q: Where is the Dispatch message history on mobile?

**19:56** · Yeah.

**19:56** · you uh can you it's okay I can just ask yeah um yeah I I don't think it it does directly connect but you can you it can access the the computer and can access go and look at files yeah cool

**20:21** · thank you um quick question uh it's more So main one of the challenges I have is normally when I when you start with uh cloud desktop you start with the chat you may create a project you you have a chat going on you you might create some artifacts and once you're ready to hand it over to code or you know the anything to do with your local machine that's where you need to move to corework and then I always find that handoff is bit

**20:53** · buggy in the sense Like when you start cowork you don't have the full chat history for cowork to go and work something or is there a way you found that you can hand over your entire project in your chat to a cowork and go this is my the whole thing I I've been working so far go do some research or something? Um yeah, there there's not not really a handoff at the moment where you can go from chat to co-work. Um essentially what we we need to rethink the way we work a little bit.

### Q: How do you hand off context from Chat to Cowork?

**21:24** · Um if you're doing if you're doing kind of knowledge work, you're you're ideiating, um that's probably something you want to do in chat. And if you wanted to go and create documents, if you wanted to edit stuff, then that's when you want to have it moved to co-work. What what helps for me is you go into chat and say, "Hey chat, um create a markdown file with all the with all all the context, right?

### Tip: ask Claude to export a markdown context file before switching to Cowork

**22:00** · everything that we've talked about that might be important because I going to move this over to co-work and I want to transfer the context and then you look at the at the MD file look at if there's anything missing update it and then otherwise you move put that in a folder open co-work yeah okay thank you um thank you So, welcome to the German lesson.

**22:34** · Um, so I had one observation, one question. Uh, so the observation just on the dispatch thing. Um, so I've been deep in the guts with that. And just for reference, like dispatch doesn't work very well, but if you do remote from your like home server, then you can get it to and then you Yeah.

**22:51** · So you do for slash remote and then that way you can actually send commands via clawed code if you load it on the Chrome session on your mobile but like any other way with like dispatch tool it doesn't seem to be completely working out for me so far so maybe that's just an observation from my personal experience. Then second question what's in your soul.md Dominic.

**23:16** · Yeah. No I'm joking. Um what what's what's your home setup? I'm I'm genuinely curious about like uh Yeah.

### Q: What is Dom's home server setup?

**23:22** · You said you had a Mac server like running or how do you how do you communicate? What's your rig if you don't mind me asking?

**23:29** · Yeah.

**23:29** · Yeah. Um so what I I'll take that one. Um what I have at home um you can grab that. Um what I have at home is I have a desktop um which actually runs Windows with WSL Windows Subsystem for Linux. Um, that's where kind of I I do most of my work. Um, but then I also have a it's not a Mac Mini, it's a GMK tech um, whatever, lots of RAM, an an LLM capable machine.

**24:03** · It's a it's a pretty powerful machine sitting um, in my home and I'm running a a zero tier network. So, this is a kind of a VPN. Um, you might have heard of tailscale or wire guard. Same same. Um, so I'm am right now I'm connected to the to a virtual LAN and so I can actually SSH into my machine at home or into the the my powerful developer machine.

### Dom's rig: Windows WSL desktop + ZeroTier VPN + GMKTech machine

**24:27** · So if I'm opening VS Code, I'm 90% just straight going to my my server at home and all the development happens on there. So on there I'm starting claw code and then what you were I think alluding to was uh enabling the the remote control. Um if you in claw code you can go slash RC or remote control and then it's sharing this um version this instance.

**24:59** · So, usually I have a T-Max version, a T-max running with a base um CL code and then I can actually access that from anywhere else that I'm logged into my uh into my claude desktop. So, if I go over to Claude, um, yeah, they're probably currently not connected, but, um, I can I can then see them here as remote connections uh, on the on my machine. So, I can go SSH connect to host that one.

### Remote Control (/rc) in Claude Code: sharing a running instance across devices

**25:48** · again. Demo gods be with me. So go in here.

**26:18** · This is my own allias cla yolo dangerously skip permissions. And so if I now go and say RC uh cl audience, it's opening a client. Uh it opens a remote control. And for those that paid attention in the background there, there a new thing um appeared. And so now I I'm connected to here. So uh what is the DB?

### Demo: SSH into a remote Claude Code session with /rc

**26:52** · And so it you can actually see it in the remote control and it bless you. If I will close that VS code then the the SSH connection dies and everything goes goes to sleep. So that's why I use T-Max because T-Max can keep things alive. is going a bit technical, but essentially I usually have things running like this um as well at home. So I can I can access pretty much anything from my phone and this this is in the desktop app but also on the phone on the cloth app you see those same um same connections.

### TMux for persistent Claude Code sessions that survive laptop closure

**27:30** · That was very longwinded.

**27:31** · Um sorry just got a question. Uh so the co-work if I understand it it's so then you can work with Claude to co-create or co-design. Um it's not like you can use co-work and show it like Netflix and share your code with family members like it's not like that or um sorry so the if you can share what so from what you showed there codework is using your own local machine and your own local folder.

**28:01** · Yeah. U but you can't share that local folder with other people using co-work or the co-workers is actually co-work on the local machine.

**28:09** · Um yeah yes it it is on the local machine. So if you're looking at that for a team you probably want to have things connected to a network drive so that other people can access that network drive.

**28:21** · Yeah.

**28:21** · Yeah. Or like GitHub or something and they pull it from GitHub. I mean that that would be one way but if you're literally in a in a network in a company then you usually have like a file server so you you could put it things on the file server and then it would be accessible for others.

**28:38** · Gotcha. Thank you.

### Q: What is the difference between Cowork and Claude Code?

**28:41** · All right.

**28:43** · One more question over here.

**28:48** · Hi. Um what would you say is the difference between Claude co-work and Claude code? And how would you advise someone who's deciding whether to use one or the other?

**28:58** · Um, cloud codework is built on top of cloud code underneath. Um, so it has about the same capabilities, but it is abstracting a lot of that away from users. So you saw me before or you saw the chat before where it said, "Hey, um, build an MCP server in Python." Um, I never saw the code. I never looked at the code. Um, so if I I'm still I still need to know what to ask for. Um, that's still in a way a problem.

**29:26** · Um, we're not quite as far, but I don't have to look at that. It's all handled by co-work.

**29:35** · Um, and so everything essentially that cla code can do build um, co-work can also build for you. Um, when to use one or the other, it depends on on your expertise, right? If you're familiar around clo around around code around cloud code then you might as well want to use cloud code and have all the the possibilities and all the access. Um otherwise you want to you can use co-work. So co-work is more for people that are proficient around their their computer but not a coder.

### When to use Cowork vs Claude Code: abstraction vs control

**30:13** · Cool.

**30:15** · We have one over there.

**30:18** · It's coming.

**30:21** · Thank you. Um I had a couple of questions. The first one is about the computer use. I'm not too clear on exactly what are the functionality, but I'd be interested to have your view on this. And I guess the second one is around the artifacts and you just mentioned for example the MCP created in Python. So is that created on the fly or is it actually stored somewhere? And I'm saying this because with the artifact for example um it does regenerate the artifacts every time. So it uses a lot of tokens.

### Q: Computer Use explained + the token cost of regenerating artifacts

**30:51** · Um and I find also the other the other bias with this is that every time it generates the artifacts it reinterpret potentially what you're asking for. So it might be slightly different over time. So what I've been doing is building that into skills with the actual Python with actual code underlying it rather than regenerating the LLM with via ZLM the LLM if that makes sense.

**31:20** · Yeah.

**31:20** · So if you if you use cloud co-work you can tell tell it hey create a Python script or a script pro in a programming language um and then it it lives on your folder or in your folder and you can tell it hey go and execute it rather than building it every time from scratch. So it's not going to build the artifact every time again and again.

**31:39** · And especially with the the life artifacts here, that's the that's one of the points that you can actually create something that is just running um and it's not recreated the same thing um over and again. Um sorry, what was the other question?

### Fix: store scripts as files, run them on demand instead of rebuilding each time

**31:59** · The other one was about the computer usage.

**32:02** · Oh yeah. Uh computer use, to be honest, I haven't used that extensively. have been playing around with it, but essentially it allows Claude to like control your mouse and your keyboard and it it takes a screenshot, it analyzes the screenshot, it does um go and click somewhere, move the mouse over there, click somewhere.

**32:21** · Um that that uses definitely a lot of tokens because it does the image analysis because it actually can interface with the computer as a human being would would do it. Yeah.

**32:32** · Yeah. Interesting. Thank you.

**32:33** · Cool. All right. I think we're going to do um pizza before they get too cold and uh we can do some more Q&amp;A at the end if you guys have more questions. Thank you so much.