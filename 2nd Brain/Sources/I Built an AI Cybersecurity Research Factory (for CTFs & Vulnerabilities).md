---
title: "I Built an AI Cybersecurity Research Factory (for CTFs & Vulnerabilities)"
source: "https://www.youtube.com/watch?v=j7GpjcyJYtU"
author:
  - "[[John Hammond]]"
published: 2026-05-18
created: 2026-05-19
description: "https://jh.live/wiz-secures-ai || Secure every layer of AI applications, and move at the speed of AI with Wiz! https://jh.live/wiz-secures-aiLearn Cybersecurity and more with Just Hacking Training:"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=j7GpjcyJYtU)

https://jh.live/wiz-secures-ai || Secure every layer of AI applications, and move at the speed of AI with Wiz! https://jh.live/wiz-secures-ai  
  
Learn Cybersecurity and more with Just Hacking Training: https://jh.live/training  
See what else I'm up to with: https://jh.live/newsletter  
  
ℹ️ Resources:  
See what cybersecurity events are happening: https://jh.live/infosecmap  
Learn how to code with CodeCrafters: https://jh.live/codecrafters  
Host your own VPN with OpenVPN: https://jh.live/openvpn  
Get Blue Team Training and SOC Analyst Certifications with CyberDefenders: https://jh.live/cyberdefense

## Transcript

**0:00** · I want to show you how I personally have been using AI lately just in case there are any tips or ideas or things that inspire you and a couple projects that I've been working on like having AI autonomously solve some cyber security war games and capture the flag challenges. But we'll get there. You know my style. I want to show you the whole thing. And there are two key words here because I say I'm using this personally. So this is just local in my own home lab playground sandbox. And I say how I'm using it lately. So, not everything is done. Not everything is finished.

**0:30** · Not everything is perfect, but I thought it would still be cool to show you. So, first things first, let's talk about the hardware. I don't want to be using AI on my main computer, like my desktop, because if you run AI in YOLO mode or like dangerously skip permissions, full access to do whatever it wants, which is where you get the awesome AI superpowers, well, then it's a little bit risky that I don't want on my main PC. So, you think, okay, we'll put it inside of a virtual machine. And I've done that for a little bit of time, but it became kind of tedious.

**0:59** · Like you spin up a VM, you get access into your environment, you're back in your workspace, then you can get to work. But I don't want or need a Mac Mini or whatever is kind of all the rave recently. It just needed to be some compute. So I've literally been using this little device here, this tiny like handheld laptop. This is the GPD Pocket 2 and it's running Linux Mint just so I have Linux on the host because that seems to work really well for bash commands that your AI agent might want to run. And that's it. It's just this.

**1:31** · And honestly, that's all it really needs to be because that box is just making API calls or like HTTP requests to OpenAI or anthropic servers. And with that, let me talk about the model. These days, I am just using GPT 5.5. And I've told the story before. I've gone through the saga like I think a lot of us have way back when kind of just first copied and pasting in and out of chat GPT on the website. Then I played with cursor when that was out and about and awesome.

**1:58** · And then Claude Code that was super incredible, exciting. Open code. I played with Opus 4.5 hit the streets and that was phenomenal. But I think a lot of the changes between what Claude has been up to in 4.6 and 4.7 just weren't quite there. So I have hopped over to GPT 5.5 and that has been awesome. I like to frequently use plan mode. I like to set it on low reasoning because honestly that model can just spin and go off to where it doesn't always need to.

**2:23** · Sometimes I've seen folks even recommend using no reasoning. And when you use fast mode, it's like lightning. So since I am currently on the open AAI train using GPT 5.5, it's natural. Look, I want to use this thing in codecs. For one thing, that lets me use my subscription and I'm not paying as I go like paying per token with API usage.

**2:43** · It's just all bundled into the subscription. I got to be honest, I don't know like my token count or the usage because I just oh go up to the limits and those are really generous using the monthly subscription with GPT 5.5 low reasoning and occasionally fast mode when I'm impatient. I don't think I've ever actually hit the limits other than one time when I set like the autonomous CTF war game solver just let it run forever and it worked until like 5% remaining on the weekly limits and then I just stopped it and waited a day because it was just about that timing.

**3:13** · It lined up. So, the next part to talk about is the harness. And you know that GPD pocket device, that little laptop that I was holding, that just sits in the closet, and I'm not going to interact with that literally on the keyboard. I want to remote into it. So, I could use SSH and then maybe some T-Mox little decorations if I were using the codec. But I got to be honest, I don't like using the CLI. I don't want to use the command line because I do want a little bit more access.

**3:37** · I like having the graphical user interface so I can split screen or pull up my browser or use things that just have visuals to them like oh having images rendered in chat like the AI can present them to me and I can easily provide images to it.

**3:51** · So, the first thought is to use the Codeex app, like the guey, the graphical user interface, and that is pretty good now. Like, they added the browser, they add a little bit of files. You can see the diff and everything. It's cool, but it does not run well at all on Windows, which is the operating system that I just tend to use naturally for getting work done and being at my desktop.

**4:10** · Opening the settings page makes it crash for me. I can't multitask all that well cuz I have to click and move in between each thread or chat. and it doesn't even have the remote support to like SSH connect over to that GPD pocket that I have in the other room. So, Codeex Guey is for the moment out the window and I had been using cursor for quite some time, but cursor got a little annoying, but just how frequently it would just sort of die or break or have some connection issues in the middle of the conversations. It was also super slow.

**4:37** · It would get sluggish when I'd start to do more work. I did use Theo's T3 code and even T1 code for a little bit. Shout out Maria. But that didn't quite have the ask user question tool for like plan mode and it wouldn't be able to render images in chat. And I wanted something to be able to like dynamically create threads in like a programmatic way so that I could just let it surface up new work or new activities as the AI is doing what it would do. I hacked around with it for a little bit cuz it is open source and that's the fun, but it just seemed like I'm tripping over myself when I just didn't have what I wanted in the first place. So I experimented with zed.

**5:07** · That also seemed a little too clunky for me. And now I'm just sort of resorting to VS Code. With all that talk out of the way, we can finally jump over to the computer screen and I can show you some of this stuff. But while we're chatting about how AI is really changing a whole lot of cyber security work, let me tell you about some other really cool innovation thanks to the sponsor of today's video, Whiz. Cyber security has accelerated, especially in the AI era.

**5:32** · Threats move faster than ever and defenders have to move at machine speed to keep pace with today's attackers. But to maintain precision, you need context of everything that's part of your security stack. So you can protect your organization with agentpowered security solutions. Whiz has introduced three new AI agents to tackle our industry's toughest problems. Continuous testing and evaluation with a red agent to find and uncover real complex vulnerabilities and risk within your environment.

**6:01** · And a blue agent to triage, investigate, and analyze threats and bubble up what actually matters. And a green agent to resolve and remediate everything that truly needs action. Visibility with whiz is still agentless while defense is agentpowered. These three agents combine their efforts to proactively defend your entire security posture.

**6:24** · And you can trigger them with your own controls in automations and workflows that you define, even with help from their AI assistant, Mika. So you stay in the driver's seat, but the Agentic engine sets your security posture on cruise control. Then as you build your own AI agents, the Whiz AI application protection platform seamlessly helps secure your AI footprint wherever you build.

**6:50** · You get the visibility and trust that the Agentic systems you set in motion are safe, secure, and streamlining your security operations.

**7:00** · See how Wiz secures every layer of AI applications and enables you and your team to move at the speed of AI. You can see it all in action with a personalized demo of Whiz with my link below in the video description. jh.livewiz.

**7:16** · Huge thanks to Whiz for sponsoring this video.

**7:21** · All right, so VS Code is the surface that I've been using lately to interact with AI and AI agents. I believe they now have this like agent mode editor that I haven't really played with, truth be told. Uh, I think it kind of gets me stuck into like their chat with like GitHub copilot and things that I'm not all that interested. So, so far I've just been sticking in the editor mode, but I've been using these extensions to be able to actually have remote SSH.

**7:46** · Here you can see what's installed. I do use remote so that that way I'm able to actually access and connect to the GPD pocket, the dedicated device I have set up in the other room. Sorry, I can make that a little bit bigger for you to be able to see things. This is handy and convenient because it's functionality that cursor gives me. But I think for the moment, at least at the time recording, the codeex app in guey on its own doesn't quite give me. So that's installed locally on my host, my desktop, my Windows machine.

**8:12** · And then on the GPD pocket 2 itself, I have the markdown preview enhanced added in so that I would be able to actually view markdown in a little bit more of a beautiful way. And of course, codecs.

**8:24** · Claude is down here too, but I am in less of that these days. With these extensions installed, since I have such a super simple interface and can easily make a whole lot of changes, I can just open up the sidebar to use codecs here.

**8:37** · But that's not really the best UI for me cuz it's stuck on one side or edge and I have to click into or navigate in between all of the other threads. And moving in and out of those with the mouse getting in the way is just another little nuisance. So, I actually haven't been using the sidebar that comes with the codeex extension. I kind of leave that closed and then just open up a new codeex agent here inside of the editor.

**9:02** · So, that it's essentially just a pain and a tab in the editor. This is just the usual chat interface to send any prompt or start any turn. I have this set to full access. As I told you, low reasoning for GPT 5.5 or we could adjust the speed if we wanted to. But the benefit here is I can more easily multitask because I could just open up another pane or another editor and then drag in a new codeex window just to be put right there. That split screen process isn't as seamless as I would like.

**9:30** · Like I use the hotkey controll and control O to open up a new agent and window here. And then if I ever wanted to, right, we could open up another split sidebar, or we could drag it to any part or piece in, any top or bottom or corner, or even move it into any other piece that we would like. That just kind of lets me multitask and have multiple agents up and running, which can be nice and convenient, but your mileage may vary.

**9:54** · That's just kind of what I like to do to simulate oh a split screen T-Mox terminal and still have access to a ton of stuff if I'm just hardcore vibing getting that out across many different threads without needing to switch back and forth between them.

**10:08** · It's been funny. I think I've found my own like cognitive limit. Like me as a human being the bottleneck to rapid robot machine speed. I could really only babysit maybe three or four of these when I'm multitasking. That's probably the limit. Otherwise, I'm just kind of all over the place and too scatterbrain to do a good job. And this isn't perfect by any means. It's still a little bit clunky, but then I can adjust the color theme or do anything that I might like to make it pretty.

**10:31** · Um, but then I can easily take a look at my files, explore any of them to look at the real code itself, or even open up a web browser so that I could interact with anything that it's working with here and I could pop that out into its own window or again have that split screen essentially giving me even more flexibility than what I would have otherwise had within the codeex app itself.

**10:51** · That is extremely convenient because while I have codecs building things again remotely now on that GPD laptop that I could just let run and go as I move or leave or go out and about in the world on mobile, if I ever wanted to, I could forward a port and then have access to anything that it wants to serve or still make visible to me. This GPD Pocket 2 along with the other devices are interconnected with Tailscale in my own home network.

**11:17** · Then even on the go, if I'm just on my phone, I could still connect into or look at some of the apps that it's serving or try to connect and maybe work with codecs. I don't get VS Code on the phone. I guess I could resort to codeci from there using Termox or Termius or whatever. But for real work, I do like being at the desktop and being able to multitask kind of like this. For actual prompting, I have been using Whisper Flow. Maybe I'm a boomer, but I'm digging the whole like speechtoext dictation thing. You'll be able to see it at the very bottom of the screen.

**11:47** · just the indicator while I've triggered transcription. So, as I'm speaking, it will be able to record and get the words. And I've actually set that as like a hotkey, not just on my keyboard, but as an extra mouse button that'll automatically press enter and send once I'm done transcribing and sending the words that I'm speaking. That is super convenient because I'm really cognizant.

**12:06** · Look, I think and I speak faster than I type. And while I am trying to articulate an idea for this robot LLM AI to try to read my mind like understand what I'm thinking to be able to then create it in its own canvas. Well, I like to just dump and talk and give it as much information to really try to get across my idea. Hey CEX, say hi to YouTube super quick. Hi YouTube. Thanks so much. Next, let's talk about the workspace like the open directory, the folder or the project that you're operating in with AI.

**12:36** · And I have a lot to talk about in this one and I'm really genuinely curious of your opinion, your input, and how you tend to do this and how you work with AI, like your own scaffolding infrastructure and personal AI ecosystem. Now, I know I think I might trigger a few folks with this, but here is the folder that I'm in. You'll notice there are a lot of other folders and inside of them even more files that are in like a human readable title case and including spaces for words. Now, that's not normally what someone would opt for, right?

**13:06** · And I know, hey, the programming purists, originally I was thinking, oh, let's do this all lowercase. Let's do kebab style with dashes or hyphens or minus symbols in between each one or underscores, right?

**13:16** · And I was there for a little bit, but I got to thinking, look, I kind of want this to double as both a human operator surface as well as AI. So if it's doing natural English like large language model stuff, I don't really see an issue with it kind of doubling as okay now a presentable layer for me to be able to have like human logic to look into and explore whatever I'd like. And I have this folder set up as both an Obsidian vault so that it has Obsidian sync and that way it can kind of update across all of my other devices if they have Obsidian installed.

**13:47** · And we've got pure easy natural markdown capability all in there and a GitHub repository. So I have a little bit of a backup like I can push pull and have a sort of like cloud equivalent of saving my progress. And I'll be honest, I use this folder every single time. I always open exactly this static directory. I always want to be like anchored in my Obsidian vault because I treat that as literally the second brain not just for myself but so the AI and robot has that whole surface.

**14:17** · And that is very intentionally like designed and structured so that this could double as both a GitHub repository and an Obsidian vault and human presentable so that if I were to ever like replicate this with like an HTTP or HTML like web browser front end, I can kind of easily see what's happening where and when and how in all of these different places. In this folder is where I dump everything where I let AI dump everything. It doesn't have to throw code in here for projects or software.

**14:46** · It could use something external that's still on the file system cuz the GPD pocket that device is all on its own that it would like. And I know maybe there's going to be an argument or at least a thought that like, hey, John, you're killing, you're burning, you're ruining specific context in the context window. But I tend to think, hey, context windows are going to skyrocket, right? That's just going to get bigger and bigger and the models are going to improve. Uh, I figure look, I just want this to kind of be home base HQ. And this is the anchor that just about everything at least uh focuses in on.

**15:18** · And then I have like controls over the runtime or the kind of uh structure of everything that I like to have happen here with a little bit of at least scaffolding of skills and markdown and then some sort of front end if I ever wanted to view this entire AI ecosystem or like personal AI infrastructure that I might refer to it as. Uh, and being able to see and browse to it all. And I don't know if some folks are wondering, okay, how does this compare to like OpenClaw or Hermes agent or whatever other like always on AI agent?

**15:42** · And obviously like this, right, Obsidian Vault, uh, GitHub directory opening within VS Code and still running codeex is not and air quotes always on AI agent, but I don't always see OpenClaw or Hermes agent or others that in the same way. And that sure at least there is some like background Damon running and waiting to receive your prompts and inputs and that way you could have it do things in the future like scheduling but you could do the very same just without that. So I haven't really been using Open Claw or Hermes Age or any of the new fangled Big Bang buzzwords.

**16:13** · But to give it some more of that power I did end up stitching this together so that this folder Obsidian Vault and GitHub repo also sits on top of a self-hosted N8N installation. So that that way I could still coordinate workflows or draft them and design them again with just natural language speaking it into the robot here. And that's been a really interesting thing because I could then have all the same connectors like Slack, like Gmail, like notion, like ClickUp, like whatever, whatever, whatever. All those integrations that like a Zapur and 8N might provide.

**16:44** · And I can architect them an AI and robot can architect them entirely in simple JSON. That even includes some semblance of a credential manager for at least like passwords or secrets or how you connect to those apps. And it gives me the power to still schedule things to happen, scheduled workflows, any orchestrations, anything that I might want to create, whether it's enabled or disabled, like all of these things that we might want to have with specific timers.

**17:08** · Again, just a folder representation, and then the N8 workflow as to how it's all built out and information that's kind of appropriate for each one of them. and the N8N workflow itself. Having N8N embedded as like a self-hosted solution is actually really cool because it does help me find the balance between what I

**17:26** · would have considered like okay the balancing act really of non-deterministic wibbly wobbly AI timy wimy wibbly stuff of like okay how it could accomplish something in just pure reasoning and inference versus deterministic code like hard procedural line by line chronological operations of syntax. I know that I got myself stuck in repeatedly trying to recreate or rebuild things that would allow me to connect to different tools because I wanted my own.

**17:54** · I didn't want to trust some other weird MCP that's out on the internet. And I still wanted my own capabilities and wrapping around it the way that I could harness it however I want. N8N helps solve for that both on the apps and integrations and secrets and credentials. Though I've played with having like a local command line pass or password manager, password storage and that way I can connect it into any sort of deterministic workflow that I want while still stitching it and tying it together with the non-deterministic AI capability. And the coolest thing is that I could make some sort of like NADN to codeex host control bridge.

**18:25** · So whenever it wants or needs any step that should require AI for reasoning and inference and deductive thinking, right?

**18:35** · I don't use their static flat AI reasoning block or that node. I actually pivot it back to my own to say look, hey, call my codeex, call my current vault and interface and environment here. So that that way again you're using my subscription. You have access in all of the files and folders and knowledge and skills that are present here. And I could trigger that at any moment, at any point with any workflow, with any schedule, with any operations.

**19:02** · So with that, I can tie together really well things like Slack or pushover to have mobile notifications in a smart, strong, and sturdy way. Whenever anything might present itself to me to a certain like human in the loop degree, I tend to call that a handoff surface because it's presenting me something to hand off to me. And then I'll just kind of bundle those up and pile them in there for both the knowledge and the place for if you want to chip away at code. this is how you can route or guide yourself to go find them in that AI way.

**19:30** · That has been one of my biggest lessons learned actually because I think I'm like a little stuck in my ways of oh wanting to think of the traditional programming development like oh define and create some beautiful architected system or application and software to solve all the problems that I want to have fine-tuned and tested and all the conveniences of libraries dependencies blah blah blah beautiful elegant systems and proper production code when I really don't need that or want that and I get wrapped around the axle and stuck with it when I just want, hey AI, can we move quick on this?

**20:02** · Can I get the outcome in the job accomplished? I felt that I really needed to lean into skills and non-determinism work. So, we actually genuinely like told it as part of, okay, this AI ecosystem, make a boatload of skills and tie those together as to how we should actually consider each of these and what they do. That's all mixed together here in the vault. So it could still track down at least sort of its own map and orientation and let the model and AI guide itself to find what it might need at any point.

**20:30** · AI ecosystem is for the concept and idea of this home base. Archive history is just where hey some stuff isn't as important but maybe we just want to keep track of it. I clear that out with some other scheduled workflow. Control planes are things that I want to be able to actually interact with. Those are things that I have in my mind even like conceptually a pillar or pedestal of functionality or what I've proven now AI can do and I've captured that capability and I want to be able to still keep working with it.

**20:57** · We'll talk about the codec goals super duper soon, but there's some other things in here, right? Of course, NAN to Codex as I was alluding to, Nadin workflows and some other things, even like having a brokerage to use different web browsers because things like browser use or computer use. Well, I'm not really wanting that to happen again on my own real computer, but I want to be able to have the GPD Pocket 2 and AI just run and do whatever I kind of ask, still sometimes needing the web browser.

**21:25** · Things like the knowledge reference or how we store durable learnings. Local projects or things I'm just chipping away at. My devices is some little bit of like device fabric. So, it's cognizant aware of the other laptops or computers or servers or things that are just kind of in my own home, right? My personal lab and homegrown environment and all connected via tail scale so that it could work or use any other resources as needed. Now, finally, after all that talk, I'm sorry. Let's get into the more interesting stuff like security research here. And a couple of these are like unorganized random assortment of files here.

**21:56** · But the war games and labs is really what I wanted to focus in on because that was kind of a neat and cool proof of concept here. A lot of people have been starting to use AI to find vulnerabilities or do cyber security research. Maybe it's operating as a sock analyst like security operations center to do triage to do investigations or

**22:16** · maybe just legitimately looking for bugs doing bug hunting for bug bounty finding zero days maybe kernel driver stuff cyber deception maybe honeypotss maybe just cast an infrastructure out of the internet and seeing what happens there's so much that you could do with it but I didn't want to boil the ocean to start cuz I think it's one thing to just say hey Claude find me a vulnerability and then that's it like okay a single turn prompt but I feel like you really need some sort of scaffolding. Not to use the AI word, but it needs a system. It needs an engine. There needs to be a sort of framework. I want it to be able to work autonomously.

**22:49** · I want it to be able to record itself like see and capture so we have historical artifacts, literal all the breadcrumbs and puzzle pieces to replicate what work was done and then have proven human observable proof that something was accomplished. Even on top of those, another problem to solve is having the LLM and AI just keep working over and over and over again until the job is done, until it has a finding.

**23:16** · Because it's one thing for the AI to chip away at it. But then if it just at any point throws its hands in the air, says, "Okay, I'm done working. This is what we could do next, what we would do next, or I give up. I didn't find anything." Well, then you need to like shepherd it along and babysit it, which is annoying and impossible if you wanted this to run at all times, even while you're asleep. I wanted this to happen autonomously. I want the AI to keep working forever. Like, don't stop. Don't end a turn. Just keep turning after you finish a turn. Use all the tokens. I don't care. We're on the subscription.

**23:48** · So, there was a thought to put this thing in a loop. And that's what a lot of people called a Ralph loop, right?

**23:53** · Where you just even just slam the same prompt over and over and over again until it's trying to move closer and closer to accomplishing some objective.

**24:00** · But that wasn't super smart. So now OpenAI and Codex has put together a goal. You might have seen that SLG goal feature. Right now at the time of recording that goal feature to have your AI LLM GPT 5.5 spin and keep working infinitely until it accomplishes a goal is an experimental feature in the codec.

**24:21** · You might have seen it. If you turn that on in your like config.toml, you can use a slash command for goal to just do something adnauseium until some criteria is met. This would be incredibly cool for security research, finding a bug, finding a vulnerability, or with me just trying to put this in kind of a small poor man's brain for the moment. Uh, how about just solving some CTF challenges to get a proof of concept?

**24:46** · Now, I can't use goal within VS Code, but because we can orchestrate so much here, why not just have it use codec goals via orchestrating them to call and keep working from the codec. I could have a goal work and run and then bubble up its own artifacts and like its own report to surface that to me or I could orchestrate them so that I could run multiple goals even at the same time or like in serial in sequence. Once one is done, start another.

**25:14** · After I got that sort of goal orchestration concept and put together with some code to be able to manage that, I created what I kind of just call conceptually infinite workers where it'll keep working through goals however many I want and it can just keep doing them to infinity because there is no real goal criteria. I literally want to set this in motion and just have it do everything with an unbound completion state.

**25:40** · Like if I were to say solve all tryh hackme war games or complete everything in the CTF, it could just keep going on its own knowing how to move on and I don't need to say or know how many try hackme rooms there are or cyber security CTFs are in this event.

**25:58** · It just goes. Hey Codex, can you tell me and explain to me what our codeex goals are and how we've harnessed them well inside of our AI ecosystem? Here we have the codeex relay and we have the codeex orchestrations and we have infinite workers. Could you give me like a brief description of what all those are and how they work? This has been just one of the coolest things to have on top of Obsidian Vault, GitHub repo, N8N workflows, deterministic and non-deterministic skills and everything scheduled capabilities.

**26:26** · And I haven't even told you about the sweetest thing quite yet. Yes, briefly our codeex goals are the way to do it. All right, sweet.

**26:35** · giving you a little quick crash course probably better than I did here.

**26:39** · Yeah. So, this is the uh sweet synopsis about how we break it down or how I've conceptually and again I keep saying and I've tried to even codified that idea in the language that I use to speak to robot and codeex here is like I want a captured capability once I've proven something and codified it as a skill.

**26:58** · Now that AI can prove reliably perform a task, we build them into all of our power and our ecosystem here. So let me tell you about that other aspect though and you might have seen it, right?

**27:09** · Ludus. This is the part that has been super duper important for what I want to have turned into real genuine security research. Like solving a couple CTFs or playing some online war games is a little bit cutesy, but cool. Hey, it spins up maybe uh Linux. It's already running Linux, but wouldn't it be great if it could actually have more computers or virtual machines at its disposal?

**27:29** · So, I have on another server, not the GPD Pocket cuz that's just a tiny trinket toy laptop, but a beefy server machine with huge amount of RAM, big hard drive, blah blah blah, all the resources to be able to have a whole cyber range and control what's Proxmox under the hood, but then just simple AI native. I'm only speaking English natural language.

**27:53** · It can build and create an entire network and create any virtual machine running Windows, running Linux, using FlairVM to do analysis, maybe using Kali Linux to solve a couple war games, doing anything that I might like that AI can drive.

**28:10** · Kind of cool. Having that local playground and sandbox for a whole Lutus VM range allows me to spin up what I would consider like an operator enclave for like okay anything that you build or use for try hackme or hack the box or over the wire again these small little primitive ideas so that once we do real security research it could have everything in its own little uh environment and it's tied together with the web browser lease so it can use that it can take screenshots it can record what it's doing with the transcript in the terminal like the script command simply or with ASKI cinema.

**28:41** · And so when I point it at any security research and again I'm just using the war games as an example here. Say we ran through over the wire and all of those different war games it has been able to make the files and folders for each individual one that it has worked through and completed. And we tell it don't look at public writeups. Do this thing yourself using the goal to work and solve that challenge. And then an infinite goal to move on to the next one. Move on to the next one. Keep solving these.

**29:08** · Say you put that pipeline and engine into like, okay, now go find me real vulnerabilities. I think it's going to be cool. I've started to build out the corpus for that, but it's not quite there yet. But at the very least, I think this concept is neat. And let me show you some of the stuff that it's cranked out.

**29:25** · Hey Codex, we have previously uh done some work in security research where we've just been working through different war games, things like Over the Wire and things like try hackme and you put together honestly what looked like sort of a blog site where you had a control surface for me to be able to see and watch your current active tasks and the goals that you were working on and I would be able to actually look through and see the reports for everything that you previously already solved.

**29:48** · Could you bring that back up, get it kind of top of mind and open and start that service and tell me what port that it's running on so I can go review and see everything that you've built from that control plane. Let's see what it brings back up to the surface here. Good. Good. You found it. Security research war games and the control plane site for us to be able to explore it. While Codex tracks it down, uh, I want to show you some of the Codeex goal relay notifications that I would just get in Slack. Hey, uh, sorry for the edit jump cut. different shirt, different time.

**30:18** · My original recording process, like initial recording session got interrupted. So, returning, resuming, starting recording again just a few days later. So, I have some updates to share with you, but this is my Slack notification sort of handoff surface, the codeex goal relay. And this is where I need to add some of those disclaimers and that look, this isn't going to look all that good. This is going to be a little bit ugly. This is not perfect. You'll see some duplicate messages. You'll see some testing, experimentation, and the very very start of this is kind of where it kicks off.

**30:48** · Me figuring out how I'd like to have these notifications and awareness. Uh, originally experimenting with just different reports kind of present in the message itself. Um, and a lot of these are pretty ugly, pretty tough to read, pretty tough to look at, and not extremely valuable. So, this is me still just kind of figuring it out, letting it do some testing, some smoke tests, responding in threads, having a little bit of uh display. Remember, at this early point, this is me experimenting, trying to figure out, hey, how do I want this to be represented to me?

**31:19** · I thought, why don't we try it as like a PDF that it could render and generate out of its markdown report. Didn't really like that. Eventually, just thought, you know what? Why don't we make this some sort of button that points to like an HTTP front end or a website, like a blog site where it's able to write up everything that it's doing? And this is really cool. Once I finally got that going, I thought, you know what? Cool. Now try to solve a couple try hackme rooms just as an example. And it went through a couple of them.

**31:45** · I tried to tighten that up so that it could then figure out, oh, okay, actually, just make sure you include the name exactly what you were working on.

**31:54** · And then it seemed to move smooth enough that I could just try to put this on other war games like over the wire. And you'll see again I'm getting duplicate notifications like three different pings or two for level 5 6 7 8 9. And I'm like this is actually moving now. I've set the goal in motion that I do genuinely now have this autonomously solving some cyber security research war games. Maybe occasionally an issue that it bubbles up to me that I'm able to then go back to go see what the robot is doing.

**32:20** · But the wildest thing is that I could set this in motion now and it would just keep going. I don't know how well you can see the timestamps, but this is like throughout the day. And then once it finishes with Bandit, it says, "All right, let me go now move on to Natis.

**32:36** · Let me go try a different war game from that war game provider." And it does each and every one of these. And to the point you can see 5:00 p.m. 6 p.m. I let this thing run overnight. And that was the craziest coolest thing because I just woke up and all of over the wire has been completed. I don't need to scroll through this entire thing for you. I'll kind of put this on auto scroll. But look at how cool this is.

**32:59** · You can see Krypton. You can see Leviathan, Narnia, Behemoth doing some like low-level binary exploitation things. And it's like this is wild. It's now 3:57 a.m. I am asleep and I have set it in motion and it has just been able to go. little bit of time. 6:14 a.m. I realized, okay, it's now completed maze level 9 and that was in like what the website over the wire suggested the progression of you as a human player to go through these war games. It didn't tell you about man page, but I just set that in motion.

**33:28** · And then I'm wondering, ooh, can I have this now parallelize do other CTFs or war games or research kind of concurrently? So, I set it on pico CTF. solving a couple of these going back into man page levels for over the wire and now they're intermingled because I can now set it to go tackle multiple runs through formula 1 keeps going through pico CTF goes on to do the

**33:51** · vortex war game now getting the mobile notification that it was done and it completed its work was cool and all and I think I hope that's neat for you to see okay just the series and saga of it running through things is pretty cool but I know we're more interested in okay what is the actual writeup what did it produce What did it show me? What is in that interactive report? So, let me go ahead and forward the port that it is hosting some of those on on that control dashboard. So, now I'm easy able to access that. So, let me show you how crazy cool this thing is.

**34:19** · I have the active work and like what is running now for infinite workers or orchestrations just to be able to list them out and for me to be able to see them and then some of the other walkthroughs and writeups that it's been doing over on the side that I could explore into or any other cards to see how this has been going through things. And you can see 233 different war game levels and it solved about 102 of them for just what it's been pulling and queuing up. You can see some CTF time events that it has already tried to stage or at least register for.

**34:47** · Again, just experimenting with CTF stuff, but I'll show you that more in a moment. For now, let me see if I could actually set another one in motion here for us to see if it solves anything by the time I'm showing you all this. Hey, CEX, could you please continue working with our picof infinite worker? Set that goal in motion so that we can solve more picof challenges. choose a couple easy simple ones because I do want to be able to present this to YouTube within a matter of moments. Let me see if it can get that cooking for us. All right.

**35:13** · Yeah, he is now cruising. Okay, it actually found a previous challenge that it did want to work through a second time just to make sure it got it right within the operator Lutus VM range. And then it found a couple other challenges that it could try to work through. But it did kickstart the active worker and now it is going to keep solving picof.

**35:32** · So that is pretty cool. And while that's working on solving some challenges, let me show you all of the war games here.

**35:38** · Now, this is neat. There are a couple that it has already staged, but you can see the ones that it has started to solve and work through, like Biteman CZ 0, a couple different tryhack me rooms, and some of the man page vortex old previous levels from Bandit Over the Wire. Now, I want to show you these reports, but even then, being able to browse through this, and you can see I try to set up a lot of the filters and searches, all that functionality at the very top is very cool. Like let me go look for over the wire. A couple of these and the latter ones it wasn't able to pull an image out of but some of the other original ones. Let me expand the page view here to about 100.

**36:11** · You could see it did grab just sort of a hero image for like that write up and blog post. Not perfect because again I am just setting this on autopilot. I'm letting it do everything it needs to without me being involved whatsoever. So let me find the very original initial write up here. The first one that it tried to create. Do we have a bandit level zero for me to show you? Yeah. So, this is the very start and it's not good. Right. You can see a couple weird gross artifacts that are just kind of being left in.

**36:39** · You could see at least some of the syntax that it uses here though because it's recreating everything that it's doing from its use of the terminal. Let me jump to another one that's a little bit easier to read.

**36:51** · Level 19 here has a good uh set of screenshots that it's tried to crop through. And this is when okay now I've helped it understand this is how I like the write up and walkthrough presentation. We could see a little bit more of the communication what it's doing how it's doing all this and then of course the flag or the answer or what we actually want to see as proof that it has been solved. Let me jump back to the previous page and not the best UIUX right again codeex is the thing that generated this. So for the people screaming you know the front-end functionality is not the best. Here's like an utumno level four.

**37:22** · So this is doing a little bit more hardcore work.

**37:27** · SSH only binary exploitation level official page does not provide a hint.

**37:31** · So it's trying to make sense of things.

**37:33** · And this is kind of crazy because hey, binary exploitation level has no stack canary, no PIE and executable stack. So they go through and figure out some of the shell code that they might need.

**37:44** · They put this thing all together and then run it and then do everything and it's working. like there are a couple that are blocked or it has staged as like a candidate but for a gist it is doing uh it it it's doing the whole thing. It's working through the process here. Taking screenshots, knowing it what it needs to do on the command line, reflecting that all. Let me not search for over the wire, but let me actually just change the provider to whatever we want. And you could see kind of all the functionality that I've kind of given myself here.

**38:15** · Let me toggle this to try hackme. So, we could see a couple of these. And loi would be a good one because that is a room that I had prepared. Folks might know this was original challenge that I made for a past nomcon CTF, but you can see it's doing some local file inclusion and it's literally getting all the screenshots and everything to prove and validate, okay, that work has been completed that I just spoke into existence and it would run and do the thing even with the images and everything that we need.

**38:44** · Here's the hack to win that it's using the attack box on its own. You can see the split screen kind of open up and then how it tackles that challenge. Just small, simple stuff to just validate that it works and how it actually progressed through all of this. Some of the screenshots being duplicate. Again, not the best, not a perfect cropped here, but it's doing it.

**39:06** · I mentioned I had some updates from the past few days that transpired. So, I'll show you those. But first, I want to check in on a robot to see how he is doing with the current Pico run. I'm using speech to text with Whisper Flow again. So, you'll see that indicator at the bottom of the screen. How is our PICOTCTF infinite worker research doing?

**39:23** · Has it solved a new challenge? What's the latest? What is it working on right now? Can you give me an update? Do we need to move on to a different challenge for the sake of speed to have something to show? Cool. It's double checking right now. I'm hoping it pops up the Slack notification like while we're recording live because that'd be pretty cool. Oh, it did solve it, but it hasn't marked completed yet because it is still okay. Carving through the artifacts and cleanup. This will still pop a Slack notification for us, correct? So, we'll be able to see it. Yeah, it hasn't fired it quite yet, but I'm hoping it will soon. All right. Well, let me keep showing you cool stuff.

**39:52** · So, back on the Slack feed here, just to kind of have a quick summary of what it was doing. The other day, I did try to finally point this at real software to try to find vulnerabilities, weaknesses in genuine applications, not just funny, silly, haha, internet points, internet games.

**40:08** · And this uh I didn't get working all that well. You can see there is a significant amount of spam as it did try to keep evaluating the lab environment and not actually proceed through real genuine research and it just kept telling me, "Hey, I'm still going. I'm still doing it over and over and over again." And that's fine. That's fine. I just like mute notifications on this chat and just let it keep spinning. But while I was waiting, a little bit bored, I said, "Hey, shouldn't you have been registering and like autosolving some CTFs on CTF time?" Just cuz I wanted to see if it could. Thought that was neat.

**40:39** · So, I pointed again at TJCTF, which it didn't automatically uh register for, but now it did as an experiment because I told it, hey, we should get back up and action on that. And you can see it tried to solve and go through real genuine challenges for TJCTF that was running over this past weekend. Oh, it solved a challenge. It solved a challenge. Uh, new message down below.

**40:59** · Let me go right back to the overview page up here. Do we have one? Is there a write up yet? Where is it at? It didn't uh build out the write up for me yet. He went to go do a new challenge, but I don't see the Bitemancy1 writeup quite yet. I saw the Slack notification, but I don't see a writeup being updated and adding into the control plane dashboard.

**41:21** · Where's it at? We found the writeup itself. It was updated in the challenges folder. The gap appears to be surfacing and indexing. Yeah, can you tighten that up, please? All right, it's syncing the writeups right now. It should have done that to begin with. But this is where I'm super curious about your input, your take uh and your opinion if you're willing to help me out in the comments because I feel like well building systems like this, building this sort of engine uh does feel like there are a lot of moving parts.

**41:44** · I don't know if I'm over complicating it, overengineering it, but the benefit of me to be able to see and look through and read and watch and observe this is something that I really value. So, putting all of this capability to be able to take screenshots, record yourself, have the script transcript that you could uh recreate for the write up and the handoff surface, doing debugging, doing validation.

**42:07** · Again, I'm finding the balance between like the non-deterministic reasoning that I want the AI to be able to supervise and like add oversight to and then the deterministic, okay, present this to me in a way that I could actually see it and give yourself enough guardrails to make sure this all actually happens.

**42:23** · Okay, looks like you figured it out.

**42:26** · Status was just set to completed, but it should have been marked as solved. And now it should display it. Oh yeah, I don't even have to refresh. You're starting on old sessions and you're beginning that walkthrough write up now.

**42:37** · But what about bitemancy number one? Oh wait, he might have just updated the original writeup because that existed before and it was just doing the Lutus validation now from the range. So bad crop on that screenshot, better on the second one, but does complete the challenge. goes through the actual task and completes it. Okay, can't complain.

**42:59** · And we could see it getting started on this old sessions challenge and making further progress on that. So, fingers crossed we'll see that one complete.

**43:08** · Anyway, let me show you some of the other stuff because I was alluding to the fact that I was exploring this with uh some software. It is not working at the moment. It is not actively researching with a infinite worker right now, but I just for playground sake was experimenting. Hey, how well could you do this pulling down and installing and setting up like paper cut or crush FTP or just things that I would be curious about and this is neat. Crush FTP thinks it did find a vulnerability or at least a finding, right?

**43:38** · The approach here is having it look through with certain amount of hypotheses to explore those as like actual atomic units of work. And this is gross again that this display output is not ideal here. But a little bit of a feed to see what it's doing where and when and why and how. And then some of these hypotheses that it is exploring and what it might still be wanting to explore and track down for potential issues. Can we find rce? Can we find SSRF? Can we find arbitrary file read? arbitrary file upload blah blah blah. Kind of sweet.

**44:10** · It thinks it had a finding. So, I just want to look and see what did it actually produce here.

**44:17** · Again, not the prettiest sort of front matter, but it is thinking there are things I need to go through and do my own manual human validation of this. But again, just the concept, just the idea, setting this in motion, having it be a factory to just crap out potential bugs or research leads is wild and cool.

**44:38** · Being able to present this all to me in a way that I could just dive in and go see, oh, is this actually legitimate is something that I would never imagine. I feel like I'm at the very very start of this and maybe I'm behind. I know a ton of people are already doing this kind of themselves and maybe they've built out better systems or pipelines or engines for this thing, but I'm still experimenting and trying to figure out how do I do this myself. Let me get back to the war games because I wanted to show you TJCTF as like a real capture the flag that was live just the other day. And shout out, love you guys. I'm sorry. Hope you didn't mind.

**45:09** · But we had this now register autonomously for the CTF, sign up and play. And then it explores all the challenges. And it took a big screenshot here of literally all of the challenges. And it kind of duplicated this screenshot over and over and over again. Uh it would have really loved the crop making that a little bit easier to read. So I still need to fine-tune this. But okay, it just went for treasure hunt. And it looks like it hasn't specifically broken these out into each individual challenge for different CTF time CTFs quite yet. So I need to prove on that.

**45:39** · But it was able to solve just a simple okay exploration of web challenges. And then it tried to do some cryptography challenge. Again, giant screenshot of the interface. Let's scroll through that. But it uncovers this and finds the bit of code that it needs to unravel it and recreate it. And it solves the challenge. It's validating from its own profile page the amount of solves that it has and its current points. And then it moves on to another more graphical one, which was very cool to see.

**46:09** · Okay, it was able to now put together and like OCR to a certain extent what is in these images and that is just cool. I didn't really let the TJCTF run for too long because again I'll just kind of proof of concepts here. This is playground fun experimentation just to see if it could and very obviously it can.

**46:26** · I don't see a lot of value in using something like this to be able to genuinely play or participate in CTFs, but using this as like a stomping ground for genuine learning for it to go through any number of these old past challenges to use that as research data like a corpus of intelligence to now point it at any other amount of software to go find real vulnerabilities and to have something that it could go use to reference and guide itself through some similar scenarios.

**46:55** · It's like building up its repertoire of skills. the same way we do as people. And I've tried to tell it like give it enough guardrails to say, "Look, you're not looking for any online writeups. You're doing this yourself.

**47:06** · You're solving it personally." And we can see like their stream of thoughts, the agent transcript to like explore exactly what it's doing, when and where.

**47:13** · And this isn't all that pretty. That's kind of uh still disgusting. And I need to clean up that UIUX. But it will provide like recommendations as to like, oh, how could we make the lab even better? How could we make our process even better if it's missing some sort of tools? if it needed some other access or other capability to actually accomplish something autonomously. And fingers crossed we'll get a completion of this old sessions picof challenge. Is the picof infinite worker still working? Uh is it completing now that old sessions picof challenge?

**47:42** · The neat thing is that I can just kind of ask the AI, hey, what's it doing? Is it almost done? Can you give me kind of an ETA? I don't want to have YouTube waiting for too long.

**47:51** · It's already a long video. This is hysterical. Ah, maybe it's a worthwhile talking point. Uh, automatic compaction of the context window. Like obviously, right, I have a ton of stuff in this Obsidian vault and this folder and sometimes that could bloat up the context window, but autocompaction is good in my opinion. Really genuinely curious to see your thoughts in the comments. I hope you give me some info and insight from this video. Oh, it has the flag. Okay, cool. So, it's just finishing it up and then it'll crap out a ride up for us. So cool. I'm waiting for the flag notification.

**48:23** · Oh, it finished. It finished. It finished.

**48:29** · All right, back on the control dashboard. Look at that short web challenge about the risk of sessions that stay valid for far too long. Prompt describes a site where the user can log in once, never has to log out again.

**48:42** · There is some good screenshots of it starting up the instance, exploring it, and finding a couple sessions, and it just replays it, and that's it.

**48:52** · Okay, so obviously 5, 10, however long that took is longer than it needed to for like, okay, if we were to be going through this challenge all on our own, but setting this thing in motion, maybe to play alongside you, is still just mindblowing to me. And yes, obviously we are absolutely at the point where look, AI can do this. AI can find vulnerabilities in software. AI can work through these security research exercises, war games, CTFs. And it's not that the world is changing because of AI. Look, the world has already changed.

**49:25** · And I want to be part of the party. I want to have a seat at the table. So, I'm playing along. And I hope you are, too. And I hope maybe this video gave you some ideas, gave you some inspiration, and uh hopefully didn't leak too much of myself. Thank you so much for watching everybody. Really hope you enjoyed this video. Really hope you are still wrestling with your robots, hanging out, playing with AI. And I hope you're giving some love to all the incredible new AI innovation in the security industry. Of course, big shout out to Whiz for sponsoring this video and their incredible work. Link below in the video description to hang out with them. And please do all those YouTube algorithm things.

**49:55** · Like, comment, subscribe. I'll see you in the next video.