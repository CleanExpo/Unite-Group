---
title: "Skills at Scale — Nick Nisi and Zack Proser, WorkOS"
source: "https://www.youtube.com/watch?v=pFsfax19yOM"
author:
  - "[[AI Engineer]]"
channel: "AI Engineer"
published: 2026-05-07
created: 2026-05-08
description: "Chat interfaces are no longer limited to walls of text. In this talk, Liad Yosef and Ido Salomon explain how MCP Apps turn tools into interactive UI inside hosts like ChatGPT, Claude, VS Code, Cursor,"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=pFsfax19yOM)

Chat interfaces are no longer limited to walls of text. In this talk, Liad Yosef and Ido Salomon explain how MCP Apps turn tools into interactive UI inside hosts like ChatGPT, Claude, VS Code, Cursor, and Copilot, letting companies send branded, functional app experiences instead of plain text responses.  
  
The session covers the core architecture behind MCP Apps, how UI is passed over MCP, how interactions stay in context through the host, and why this changes how applications get distributed in an agent-first world. If you're building on MCP, this is a practical look at the emerging standard for UI inside chat.  
  
Speaker info:  
\- Nick Nisi | https://nicknisi.com/about/  
\- Zach Proser | https://zackproser.com/

## Transcript

**0:14** · This workshop is going to be skills at scale. We're super excited to be here with you today. There's going to be an interactive component and we also want you to feel free to interrupt us and ask questions as we go.

**0:23** · Yep.

**0:23** · We'll show that slide again with the with the um uh QR code and the the instructions to clone the repo. That repo has the skills uh the skills that we're working on plus uh the slides that we're presenting. So you'll have all of that as reference material. Um I am Nick Nissi. I am a developer experience engineer at work OS.

**0:42** · I'm Zach Proer. I'm also a developer experience engineer at work OS and we're on the applied AI team.

**0:47** · And this is like working with agents.

**0:50** · That's just like what we do now. Uh, Zach, when is the last time you wrote a line of code by yourself?

**0:54** · Uh, I think I did a CD uh in a directory recently. Otherwise, it's been like probably six or eight months now.

**1:02** · Yeah, maybe longer. Yeah, same. Same. We've been early on from the the Opus 35 days from copying and pasting back and forth through GUI to now.

**1:11** · Yeah.

**1:11** · Uh, it's gotten a lot better and I don't know, there's a a mythos out there that it's going to get even better. Uh we are at work OS and uh if you are uh interested in like securing MCP for example or just setting up off uh for this new agentic startup that you're you're working on uh reach out to us. There's a number of us here with these shirts on and uh we'd be happy to talk.

**1:34** · We're also hiring. So thanks to the AI installer that Nick built as well. You no longer even have to configure install kit yourself. It can just do it for you. So pretty easy to get started for sure.

**1:45** · All right. So, as you know, when you're working with these uh with these systems, every single conversation that you have starts completely from zero. Uh you're always just like passing in new information to it. You've got to reiterate how you do things. Uh and Claude never Claude, for example, never remembers that it ever talked to you. It just continues on a conversation. And so, we have to provide that information fresh each time.

**2:11** · Yep.

**2:11** · Um, so for example, let's say you have a skill or let's say that you're talking to uh just in disperate terminal tabs. You're looking at different code bases over the course of a week. Every single time you start talking to it, you need to reload all of that context first and say, "This is what I care about. This is how we do things here. This is what we're particularly concerned with."

**2:30** · Right. And it ends up eating a ton of time and slowing you down.

**2:32** · Yep.

**2:32** · And of course there's things like agents.mmd or cloud.mmd uh that you can put in information about the repo or about how you like to work like in a a global directory uh so that it can remember that and understand it each time you're giving that instruction each time kind of like appending it uh so that it will remember oh in this project we actually use vest and we use pnpm so you should use those each time uh so it can that that's like the way to give it some memory for it to understand how to go but it can still get it it can still

**3:03** · uh decide not to follow things that you have. I've definitely had cases where I'm like, "Do this, this, and then this, and it skip the step in the middle, and I say, why'd you skip that?" And it's like, "Oh, yeah, you told me to do it. I I didn't feel like it." And uh that's that's how you know it's a real engineer.

**3:19** · Uh yeah. So, one of the nice things about skills is that you can think of it as like a discrete unit of work where you can encode everything that's super important to you, everything you don't want it to miss, everything you don't want to repeat yourself. It's almost like carrying, if you will, the dry pattern into the agentic era in a way.

**3:33** · Um, and not repeating yourself. So, and as we'll see, that becomes incredibly powerful regardless of if you're a solo developer working on your own startup with 12 agents or if you're on a traditional dev team with 12 team members.

**3:45** · Yeah, it doesn't know what you know. So, you have to be very specific and be thorough with what you want it to know because it's not always going to figure it out. Sometimes it feels like magic because it just does, but a lot of times you have to put in the work to do that.

**3:57** · And that's what what like those memory files are like claw.md uh and other memory files. It even has like claw for example has its own built-in memory where it kind of keeps track of things that it thinks are pertinent to the the way you work or the project that you're working on and it will save that off.

**4:12** · Yep.

**4:12** · And you know, of course, this works too in just a single project context with some of those files that Nick mentioned. But then again, the problem is that you're still tied to that repo.

**4:20** · Uh you need your team members to remember to pull updates to that specific project skill if if they want the context. um there's no necessarily built-in script execution. So, how do you get how do you interle a deterministic result when you're having a non-deterministic conversation with an LLM? And eventually that starts to get pretty gross.

**4:38** · So, and the there's downsides to this uh specifically these memory files where if they're tied to the repos that you're working on or you have to put them globally so it affects everything uh and you can't do things like uh give it like more smarts like execute this script.

**4:53** · you can, but it's kind of not built in, so to say. Um, but that's kind of like where the things that you put in there are not always like transferable or portable to other projects that you might be working on. Uh, and so we need a better way to do that. And skills are that next step.

**5:11** · Yeah, indeed.

**5:13** · Uh, it's a way to make things more portable. Uh, and you can use scripts to inject real data. Uh, and you can make them composable. uh so that they can be very small and very focused on exactly what you want them to do. Uh and that way they're they're very small like a very small footprint in your your context window, but also uh you can build them in such a way that they are only going to be applicable when you actually want to do whatever that skill is set up to do. So you're not just bloating the context with everything from the start every time like you are with a claw.md.

**5:42** · Yep.

**5:43** · And so if you haven't seen or heard of a skill before, just to level set really quick, it could be as simple as a a single static markdown file uh without any scripts at all. Um but let's look at the difference at what might happen.

**5:54** · Let's imagine that we're roasting a repo. We're onboarding a new team member. We want to make sure that you know they're kind of up to snuff on how things work here. Without a skill, if you're just talking to any generic agent with no specific context injected, you're going to get, okay, looks pretty good. It's going to be generic advice.

**6:07** · It might find some lowhanging fruit. If you say instead as little as 30 lines of markdown specific to your use case and your conventions, your constraints, uh you can start to get back very very like hyperspecific feedback about this is how we handle you know uh routing in this project. These are um you know we we follow semantic commits or whatever and we've got readme drift here and that's unacceptable, right? So it it can take as little as 30 lines of markdown or less.

**6:33** · And so that's the one of the first things that makes skills incredibly powerful is that it's a very minimal investment on your part and it could be as simple as a small markdown file and it becomes a composable unit of work that you can share across codebases and your team.

**6:48** · Yep.

**6:48** · And you're you're codifying exactly what you want it to do and you have freedom to express yourself in the exact way that you want it to do that. And there's a number of different ways and techniques that we'll talk about throughout this workshop. Uh, but it's much better having those skills and knowing that they exist and and knowing not just like that you can use them, but also setting them up in a way that the LLM can decide to use them when it makes sense. Uh, and it's going to give you a single repeatable way of doing that thing in the way that you expect it.

**7:15** · If I just tell it some generic thing like look at this and tell me how how good of a repo it is, depending on the re the model that you're running, uh maybe the the amount of thinking that you have turned on, uh, etc., It might give you more or less information, but it's never going to be the same thing each time. If you want it in a very specific format, you want this report in this exact way.

**7:36** · That's what a skill is. You're teaching the the LLM how to do something in the way that you expect it to be done and then it will follow that much more closely.

**7:46** · All right, let's take a look at uh how a typical skill might break down. So again, it could be skill.md. So as simple as a markdown file. At the top, you'll notice a front matter. So, think about um anywhere else that you've used like a YAML based system almost like headers, right? In in other languages or formats, but you've got a name, a description, and this description is is incredibly powerful and loaded. This is what the LLM is going to use at runtime to essentially do routing and determine if this skill is relevant to the task that you've assigned it.

**8:13** · Um, so that's kind of how the AI finds and routes to your skill. And then additionally you can provide uh additional context and and then even scripts so that again think of it as your option or your on-ramp for interle determinism with the nondeterministic LLM conversation.

**8:32** · Yep.

**8:32** · Uh so the the most important things here are exactly what Zach said, the the name and the description. Uh it's a misnomer that skills are only a single markdown file. They of course can be, but they're more like a folder with a skill.mmd file in them. And then they can have anything else in there as well.

**8:49** · And we'll kind of talk about that, but they can have references to other other uh things that that they might want to know. They can have scripts that it should run uh and they can have images.

**8:58** · They can have all sorts of different things uh and then use that in different ways. But the most important piece of it uh from the start is the description which we'll talk about. Let's also just uh talking about constraints. One of the things that's kind of um not intuitive is that it can be more powerful just to to provide a few constraints as opposed to overly uh being overly prescriptive in exactly how you want the task done.

**9:22** · So if you pro provide just three constraints and say never be vague or um when you site code it always has to have a specific line and a git commit reference with it. Um then you'll get better performance than if you end up you know bloiating in the middle of a markdown file. So it's like a novel. Um, this is actually common failure mode when designing skills.

**9:39** · Yeah.

**9:40** · Yeah.

**9:42** · So, today we're going to uh put all of this together into a skill that we're going to build here in the the workshop and it's just called repo roast. We tried to think of like a a fun generic skill that would be applicable to anyone who is working in, you know, JavaScript or uh different languages. Uh but also is like like if you if you're not really like if you have an idea of what a git repo is, this is applicable to you. So it's kind of transcends all of that uh and is gener generally uh something that's useful for for everyone, but also kind of fun.

**10:14** · We can kind of be more or less serious with it uh as we're we're putting that in. So it's going to allow for a lot of creativity as we go. And feel free to also uh kind of use this as a as a place to inject the actual constraints or the requirements that you have at work that you're kind of uh struggling with or testing. Um so we'll kind of get the baseline together and then you can start customizing from there and we'll have some time to share and discuss them later too.

**10:36** · Yep.

**10:36** · So uh this is that slide from the beginning. Uh if you haven't yet uh please download this uh clone this repo uh and work in there. We've got kind of the basics of the skill. Um and what we're going to do is just kind of get it set up and you can make it your own.

**10:50** · We've got some general guidelines and some tips to do. Uh but the fun is going to be that we have a room full of people and we can have a room full of different ways of uh analyzing this. And we'll also share that uh in that repo. There is a share.sh uh that you can run and it will just ask you for your name and then it will uh put that into a KV store and then I can pull it down uh quickly on my machine and then run it against some repos like on the screen so we can share these uh at the end of the day. Yeah, it would be kind of a fun way to experiment with different uh approaches to the same skill.

**11:20** · Yeah.

**11:24** · So, speaking of loading skills, we should talk about how skills load. Um, we we are generally kind of talking like you'll hear Zach and I kind of always just like when we're talking, we're saying Claude because we tend to use Claude. How many here use Claude as kind of their daily daily driver? Whoa. Okay.

**11:38** · That's a pretty much it's like 91% uh market and then everyone else like there's cursor and I have been dabbling with pi. Pi is amazing. Uh but also Anthropic won't let me use my I it's unclear. Can I use my subscription with it? I don't know. Uh maybe I'll find out today or this week.

**11:56** · You can pay more for it. You can Yeah.

**11:58** · pay more in credits for it. That's fine.

**11:59** · For sure.

**12:00** · Um but when you're using these, so like the the main thing and the reason that we're so excited about skills too is that they're generally applicable to all of the major models. So codec supports them, cloud supports them, cursor supports them, uh the uh desktop apps like like cloud desktop supports it. So even like if you're non-technical, you can be working on skills and sharing skills and and using skills.

**12:22** · What was the skill that you did last week with the recruiting team in desktop?

**12:26** · Yeah.

**12:26** · Uh I was working with our recruiting team kind of uh they're at an on-site and I was zoomed in with them helping them build a skill that could like take like candidate information and format it in specific ways and understand um you know what they're looking for in different things and kind of build reports automatically. Uh so it's things that they could do pretty simply but they um because of like the the beauty of cloud desktop and all of

**12:49** · the connectors that it has like it could just reach into Slack and pull in information from there. could reach into notion and grab that information and then mix that in with like the recruiting software that they use and put it all together into a single report that then they can share to build from there. So it wasn't like this is the final report that we use for everything.

**13:07** · This is a building block that then they can use to do different things in different places.

**13:11** · And so it was really powerful for that.

**13:13** · And as soon as you gave them that skill then everyone on the team is running it in a uniform way. Yes. The power of it too.

**13:18** · For sure. And so where do those skills go? Uh well the the most basic place is if you have a repo there's you can just put a claude directory and then uh have a skills directory and then a folder which is the skill name and then a skill.md all caps uh in there just like this and that will be a skill that lives with that repo and so anyone who is using that repo it'll just automatically load that and understand how to use it.

**13:42** · You can also have that same.claude directory in your home directory and put those skills there. And then they're generally applicable to everywhere uh that you would be using claude. Same thing uh there there's kind of more standardization for everyone else on agents. I wish uh there was like agents.mmd and instead of cloud.mmd and uh aagents instead of quad uh but maybe we'll get there one day. So, uh, you can put them in there and, uh, if you've ever used like the MPX skills, uh, tool from Verscell, that is just kind of sim linking them all into all of these different directories.

**14:12** · And so, the skills are generally applicable everywhere. That's just a an easy way to load and install them, which is why it's so popular.

**14:20** · Yep.

**14:22** · But the the main dev loop with it is like you edit the skill, save it, invoke it, see what output it is, and then do that process all over again. Uh, and test it. If you're using Claude as well, Claude ships with a fantastic uh skill builder skill or skill creator skill.

**14:38** · And uh that is really good for critiquing your skill, setting it up in a way that Claude would expect it to be uh and even evaluating it, which we'll talk about.

**14:45** · Yep.

**14:46** · All right. So, we're going to start by uh letting you go ahead and work and build the foundation. So, you should have that repo and uh we just want to get started with it. So um the main things that you want to do is you want to set up uh a proper description for it. Now remember this description is not for humans. The description is really more for the LLM so that it knows when it should use the skill automatically.

**15:10** · And so you want to set that up in in some way uh we recommend in in some way where like it it describes like oh we're going to roast this repo in like like the the user wants to roast this repo and get an analysis a fun analysis of it. uh or or something. Be creative and fun with it. But then you should just be able to like open up cloud and say roast this repo. Roast my repo and it goes and does it.

**15:31** · Yep.

**15:31** · And then remember that in general it's recommended that instead of being overly prescriptive in how to do something, provide your constraints instead. So say we're using this format in this repo or we follow these coding conventions or we never do X or Y and then allow the LLM to make the right determination at runtime.

**15:48** · Yep.

**15:48** · Yeah, definitely like closing it off like that. Don't uh prescribe what it should do. kind of give it advice on what it shouldn't do and let it be more creative on things. But you can also like change that as well and be more assertive on things that you know you want in a specific way.

**16:04** · So let's work on that. Um a couple of things that uh like tips that we want to talk about in this first section is uh and this I think might be pretty applicable only applicable to Claude right now. I did ask Pi if it could do it and Pi just like made an extension that made it work. So uh that's that's awesome. Uh but if you use the bang and then back tick uh back ticks for like a script call uh Claude will do like an interpolation of that just like how JavaScript has like the dollar sign open curly brace and close curly brace.

**16:31** · It'll just like instead of having whatever was in there uh like this um where it's saying stale to-dos and then it gives you a command to run, it will just replace this with a list of the stale to-dos because it will actually execute this GP command uh and then do all of these pipes to all sorts of different things that's totally not slurping up keys or anything.

**16:50** · Yeah.

**16:50** · Um, you can imagine how this is really powerful if you're like say you're doing your morning report, your your kind of like your get status report, any of the pieces that you want to be output in a deterministic way. That's an ideal u use case for this kind of script interpolation.

**17:05** · Yeah, this is really great because you're not you're not saying go grab the latest commits or the latest 10 commits and give me some information on it. You're saying here are the latest 10 commits in the exact format that I expect you to understand them in. Go and do something with that information. So it's not guessing. It's not going to be non-deterministic each time. It's going to start from this deterministic base and then go from there.

**17:26** · It's also very token saving. If you've ever said go and figure out the 10 commits and you've run that more than once or on three different terminal tabs, you know, the first two might get it perfectly right and the third is like spinning and reading git docs and you know before it finally gets there. So this is a way to say once you've formalized a piece of your workflow, you can just codify it and say run this exact script.

**17:46** · Yeah.

**17:49** · Yeah. Like we said, without scripts, the AI is just speculating on what you mean when you say go get the latest commits.

**17:55** · Um, yeah, and just remember that descriptions are routing rules, right?

**17:57** · They're they're less for us and they're more for the AI to determine when to use it. So, a good example is you might have a couple different image generation skills and they're all kind of littered in the projects and maybe in your global skills. Maybe one is more applicable to your personal blog and you say, "On my personal blog, I always ship pixel art."

**18:12** · So, if we're writing on this domain, this is the skill to use. Right? If we're going to work, it has to be formalized and we use a completely separate image generation system or we only fetch images from S3. That's where you can kind of codify that in your description.

**18:28** · And if you're not sure, by the way, you can always ask cloud. That's the other like kind of secret hack of this era that everyone forgets is that a lot of times the models are capable enough that you can ask them, have I done this right or when would this apply? Uh so you can say as a test run, when would you load this currently? If I only want it to run in these conditions, is this the best description for me or not?

**18:47** · Yep.

**18:47** · And a great example of this is when we were building this, I asked Claude, I was like, "Hey, I know I can do this, but do you actually support like skills calling skills?" And it was like, "Oh, let me go check." And it loaded like a claude code analyzer skill to get that information and then do that research and come back and say maybe.

**19:04** · Yeah.

**19:04** · It was like kind of, but you probably don't want to do that. So, uh, so your turn. We we're gonna take some time to go do that. Uh to to let you go do that. Um and when we do these breaks, too, this is a great time if you have any questions uh or have uh discussion topics that you'd like us to talk about, uh we can do that. We're trying to like fill the dead air of like you working on these with um general topics. So if there's something that you want us to say that part out loud.

**19:29** · Oh, that's okay. Uh if if there's something that you want us to talk about, uh we can definitely do that. Otherwise, uh we've got some discussion topics that we thought we could talk about. Uh but if you also if you have any questions or um any of that we can definitely I'll run over to the bring you the mic and feel free to shout out any questions.

**19:47** · Um but yeah if otherwise then feel free to uh just start on this and if there's any questions let us know.

**20:01** · Yeah question. You want to run them?

**20:03** · Sorry. Where's the question?

**20:09** · There you go. Um, you talked a bit about this in the beginning. Um, but I always wonder where to draw the line between um, encoding instructions um, in like rules, cloud.mdg and so on and creating a skill for something. Um, so I'm curious if you have like h what's your mental model to making that decision?

**20:28** · Like have you landed anywhere? Like do you always start with the rule and then you make a skill if you can make it specific enough or do you always start with a skill like how do you go about it?

**20:37** · Yeah, great question.

**20:38** · Great question.

**20:38** · Uh I usually like like the the one the number one rule that you have to remember is that the skills sorry the claw.mmd or the agents.mmd that is going to be loaded every time when you kick off claude that's going to fill your context window. And if it's filling it with a bunch of nonsense that isn't actually applicable to what you're specifically doing then you probably don't want it in there. Um, I can show an example of like my uh what is it?claude.

**21:07** · Uh, and then I think cloud.md if I can spell. This is my cla.md. It's extremely small. Uh, it just tells it that I want things to be a little bit more tur. Don't bloate. I just want to know exactly what you're saying. Uh, be extremely concise. And then I also like I have this plugin that I'm working on. It's a a skill actually called ideation. And I in here I put like some configuration for that.

**21:33** · So that all of the projects I I basically want them all to put like the ideation, the artifacts that it's generating into uh my Obsidian vault. So it puts it all in there so I can more easily like find the connections between things. Um but otherwise it's like extremely tiny. And so that that's one thing that goes into it. if it's only relevant to the repo, like like specifically, you know, I'm tired of it using npm when I wanted to use PNPM, for example, I'll put that in there, like a single line that just says we use PNPM here.

**22:01** · Um, and then anything else like if it's, you know, more specific about testing or anything like that, I kind of leave that to skills so that it's only going to be loaded when I'm actually like writing tests. to to the second part of your question as well. The and we'll talk about this a little bit later, but the other thing that's really fun to do is basically wait a week while working on it and then go back and ask Claude analyze my week's worth of work and then what are the skills I should split out of that based on this.

**22:29** · Yeah.

**22:29** · Um so again, ask the system to kind of help you do that. Another question back here. Yes, sir.

**22:34** · Okay, you can hear me right? Yeah.

**22:35** · Y um so stop me if you're going to talk if you're planning to talking about this later. I was wondering about uh global skills uh which we will share amongst colleagues. So we're all at the moment with we've got I think 60 engineers. People are writing their own skills.

**22:52** · We're chatting on Slack. Oh, I've got this great skill. It's really good. So then obviously uh engineering managers are like well we should be sharing these. Where is where do we keep these?

**22:59** · Where do we keep them in a repo? Um what's our artifacts library? And then others have said, "No, we don't want that because if I put my skill up and then someone's like, "Oh, I'm gonna change that." Then we're gonna have MR requests and then we're gonna have to review changes to skills.

**23:13** · So then we'll get someone else saying, "Well, I kind of like a skill, but I'm now going to push my version of that skill with a very similar description to the shared repo, which everyone's going to get." And then suddenly we've got 10 front end skills.

**23:26** · Yeah.

**23:27** · And they're all the agents then, which of these do I actually use? Yeah. Yeah.

**23:30** · And we're wondering if you guys have got to that stage of how to maintain and then the next one is 3 months later a new model comes out and these skills are actually a little bit too verbose.

**23:41** · So who's evaluating the skills and checking them and saying okay let's cut these from the global because now you get what I'm saying this is where we're at with y how and so a lot of engineers are just like no no no skills everyone does it on their own we are not sharing anything. So, sorry that was a bit of a rant. You get where I'm coming from.

**24:02** · Yeah.

**24:02** · Fantastic question. I'll take the first stab. Interested to hear what Nick says.

**24:06** · We have um published uh maybe you want to pull it up like GitHub work OS skills. That was one of the first places that we started publishing generic skills and that's been incredibly useful because for example I was building generic rag pipelines and then we found that aentic tool calling is higher performance. So I can sideloadad those skills that Nick put in there that are specific to certain documents to the problem of individual engineers like saying I want a slightly modified version of this. I I I would almost say like in that case cool you've got a forked skill you keep locally.

**24:35** · Um and then to your question about you know evaluating the skill I think asking claude like with your current model look at the skill using the skill builder is it right for truncation or is there like you know additional extensions that we need now? Um, but I'll also share that we are feeling that same pain as I'm sure everyone else is. And I think the management layer is just shifting to that kind of but even if you ask sorry no you're good.

**25:00** · Even if you then ask cloth let's say a week later a month later hey review our skills there's 30 skills to review and it comes up with lots of suggestions.

**25:07** · You then got to open a merge request for possibly one human or two humans or maybe you we can automatically say that the person who wrote this skill originally has to be one of the reviewers. they have. Have you got down to that yet where we we I don't think we've gotten to that level with ours because ours started kind of formalizing documentation into buckets that were then easily sideloadadable in different systems. Um that does sound painful. I'm curious to think what what do you think about that?

**25:34** · We haven't even got there. We're just people have just like foreseen that this is going to happen. So they're actually blocking us using shared skills at work, right?

**25:42** · Because they think this is going to be the problem. So like literally we're overthinking it massively. We should just do it and try.

**25:49** · But still interested to hear what you guys Definitely. And I I also think it's going to evolve rapidly too, right? As we're seeing like there's still we haven't quite hit the LLM training wall, right? So there's going to be kind of additional capabilities coming online and and yeah, what does it look like in six months? Could we pair the skills down even further and get the same or better performance?

**26:07** · Right.

**26:07** · But yeah, I'll say that that's um yeah, that sounds like a typical human problem of uh my skill, your skill, right? Yep, we have a number of like to to build on that. Uh we have a number of ways that we solve that. Like Zach said, this um the skills repo, this is like our public skills uh that you can just install with like npx uh skills ad uh and and those are all available. But then we also have uh some like internal skills that are more uh generally applicable to like engineers at work OS.

**26:36** · And so it's like there's an O specialist, there's a DX specialist, there's a ghostriter, different ones like that. Um, and then I have my own plug-in marketplace as well where I put a number of skills that are applicable to me. Uh, and so I just load from all of these uh in different ways. We also have like a big monor repo that like most of the engineers work in. And you can a lot of skills just end up in there if they're monor repo specific.

**27:00** · Uh, that's a much easier place. But yeah, it's the same problem like you got to get a review on it or it's got to be it feels kind of dirty because you're just like appending that to the work that you're also doing. So, it's like an an add-on, which doesn't feel super great on the PR.

**27:12** · If I reverse engineer to some degree the plug-in system, I think that's what they're trying to address kind of because you can also install like a version of a plugin the same way you can an npm package, right? So, maybe that's kind of like the interface on top of the repo. And then the tooling that I'm seeing everyone keep building repeatedly is like the tool that reads from a repo and installs skills into various places like 2 and stuff that make that kind of like nicer. But that might be a solution to some degree where it's like cool, there is this m, you know, master skill of this, but I'm running this version because I need this fork.

**27:42** · Um, and then but it's not as gross as it sounds because there's an actual standardized API with the plug-in interface, right?

**27:50** · And it's all versioned.

**27:51** · Yeah.

**27:51** · When you guys No, no, that's these are great. When you do you then have flags if you were to go into the public or your internal work I don't want skills even if the agent knows you then flag like I'm MPX public flag

**28:12** · just front end or just UX or just product this just come to my mind I've never thought have you done it is it is it I haven't no um I haven't used NX for that I just used like the like I said we're mostly Claude I I use the the Claude marketplace like the SLP plug-in marketplace ad and as long as your Claude instance can uh access like an internal git repo, it can just pull from there. Uh and so that's what it does.

**28:35** · It will pull all the skills even the ones that you don't need because you're a front end. You don't want the backend skills.

**28:41** · Oh yeah.

**28:42** · Yeah.

**28:42** · Then that that almost sounds like a packaging thing to me. But I I I think that you're kind of like in good company in a sense that it seems like, you know, we're kind of got three marketplaces that are super relevant separate from or in addition to the project specific like skills, right? And then it just kind of becomes a matter of taste of each individual engineer saying like, "Oh, I'm going to run this version of that skill."

**29:01** · But then something like the plug-in like interface is the way that you have a uniform way to approach it which you could actually write docs against for onboarding and say plugin add these three marketplaces when you come on board and then if you're on a front-end team like plugin install from the front end marketplace or whatever the case may be but that's like still at the end of the day on the back end that's like repo management and it's right it's similar to how it works with code.

**29:26** · Yeah.

**29:27** · Yeah. Great questions. Um yes sir.

**29:31** · I was gonna ask.

**29:32** · Yeah.

**29:32** · Uh so actually two questions. The first one is do you do any like formal skill evaluations like a skilled benchmark so that as new model drops which skills are relevant?

**29:41** · Yes.

**29:41** · Um in the the public skills specifically on the the ones that I use internally I am a little less formal about it. Uh but the ones that we actually ship uh we do ship uh in the where is it? We have like a whole eval

**29:58** · framework uh that we wrote to make sure that it it lives up to the standards that we have and we're gonna we're going to talk about this a little bit but like it's mostly uh like doing several runs where it will load claude without the skill and ask it to do a task and then load it with a skill and then it kind of has like a rubric on confidence or or like a grade that it gives it and it's it it'll fail if that grade is less with

**30:23** · the skill than it was without. uh it'll also fail like it you know it it tries to be I think 80% above or higher so like 80% of the time uh or maybe it's 90% uh it's going to get this right with the skill and sometimes it gets it right without the skill so the skill is maybe only adding one or two% to it but that's something that we track and keep on top of as new models drop.

**30:43** · Yeah.

**30:43** · Okay. Yeah.

**30:43** · It's it's sort of fuzzy math but it's almost like by having this this established baseline you can at least test that way.

**30:49** · Yeah, it makes sense. And then the second question was u about um sorry one second right u skill pickup uh so if you get lots of skills the models might ignore a skill or decide I don't need a skill I'll just I'll just do it what's your kind of experience with this to a like test it find it and then maybe improve it yeah um great question we that that is a

**31:18** · problem and the more skills that you get like you can have conflicting skills Uh, and so like which one is it going to pick? Um, the solution to that like like for the work OS one specifically like we try and keep it like for these public ones we try and keep it like very generic like mention all of the you know the the acronyms and things that we would want we would expect to cover uh from that. So that'll trigger it to load uh and it usually does a pretty good job.

**31:40** · You can also like if you're in a skill uh or sorry in claude uh you can just do like work OS for example like the slash command uh if you know that you want to do it and so like a lot of times we'll just like suggest you know if if that's what you want I'll say like just run slots and it'll it'll load it.

**31:58** · I I'll call a skill by name if I want a specific like image gen or something I'll say or I'll say like use the superpowers brainstorm skill in order to determine a better plan.

**32:06** · Yeah.

**32:07** · Yeah.

**32:08** · Yep. But also if you got if it really wasn't behaving that's why you use the bang and then put a command.

**32:14** · Right.

**32:15** · Yeah.

**32:18** · Um I had a question on um how do you decide when to create a sub agent versus a scale? And can you reuse a scale into a sub aent? And there's just sometimes that um I'm going to create a skill and then I'm going to like uh maybe I should have written um a CLI cuz uh why did I even made a skill in the first place and I I struggled between these three things?

**32:47** · That's a great question. Uh on the can skills can sub agents use skills? I actually I'm like blanking on that. So I'm asking Claude uh and you can see that it loaded the claude code guide pl skill to go check that. Uh so this is a great example of doing that and we'll get the answer here in a moment. Uh but that's a great question. Uh sub agents is something that we don't cover a ton in this workshop. Uh, but it is something that's super valuable.

**33:10** · And the the number one thing that I think is uh think of like when I think of when to run a sub agent versus a skill is do I want it to have its own standalone context? Uh so that it can go do like a bunch of work on on something and then that's not eating the context window of like the main task job that that we're doing. Uh and then that way it can just like do a check-in on that. And so um for example I have this ideation plugin.

**33:37** · It's kind of like a a planner or a uh a superpowers uh type thing that I like doing. And as part of that, like I'm really like focused in on feedback loops to itself so that it doesn't have to bother me all the time about, hey, does you know, does this look correct? Or like tell me, oh, it's done and it's totally not done. Like I want it to prove to me without me having to go look at the code that it's it did the work that I expected it to do. And oftentimes that's feeding the information that I would look for back into it and making it just go in a loop over and over.

**34:05** · I hear there's a a Ralph Loop's uh workshop after this, so you should check that out. Um, but it uh like in that case like when it's doing those reviews, those can like muddy it up and so like I kick off a sub agent to go do those reviews and then it just reports back like ah there I found these problems and then it just has a list of those problems and then it can feed back to itself to do it again. So I'm not eating that full context window every time.

**34:31** · Yeah. Now also further confused by agent teams which are different than some agents too, right?

**34:37** · Yeah, another question. Thank you.

**34:40** · And another one another question here.

**34:44** · Yes.

**34:44** · Um, I have a question about the the overrides in a skill. So, for instance, you you put a default and you say or whatever the user decides, but I find it's very random or at least I cannot really reproduce that and sometimes the overrides doesn't work.

**34:59** · Yes.

**35:00** · Do you have any idea or like I I just want to find out what's going on?

**35:06** · Uh my my best suggestion for that is just ask Claude like why did you pick that over the other thing? Uh and how can I improve that in some other way?

**35:15** · Like like you consistently or like you consistently enough pick the wrong choice or you don't respect my override?

**35:22** · Why is that? What can I do to improve it? Um I wish I had a a more clever answer, but usually it's just like I ask the machine.

**35:30** · Just just ask Lord. It's good enough.

**35:32** · Thank you.

**35:34** · Great question.

**35:42** · question.

**35:42** · You called out superpowers was a skills library that you referred to. Is there other uh skills libraries beyond you guys that you commonly use?

**35:54** · Yes.

**35:54** · Uh definitely. So superpowers is one that I actually didn't use until yesterday when Zach showed me it. Uh and I I installed it. It has a number of different skills in it that are are pretty helpful. Um, these slides are actually written in slide dev. Uh, and you might notice well you won't uh I don't know if I committed it. Um, let me go to the full repo here, but in here there's an agents directory and a skills and a slide dev skill. And Claude might have had a hand in writing these slides.

**36:24** · Uh, which is really cool. We'll kind of talk about that. But like some of the real superpowers I think are like when you assign it to do non-coding things uh because you really feel this magic. Uh and we'll we'll kind of show a demo of the reotion skill. That one blew my mind. Uh it's it created a video based off of a prompt and I I now use that as my so every Friday when we have the all hands and it's like what quick demo of what you got done this week, right?

**36:48** · It just reads my git history for the week and then builds a movie about it. which everyone is was tired of on week three and they're not going to they're not going to stop. They're just going to get more like I'm going to introduce characters and it's going to get awful. But uh yeah, the Remotion is incredible. It'll even pop up a like Chromebased web editor where you can go and be like h trim and cut and like let me add some fades, right? Um so that's insane.

**37:15** · And then my favorite one that I probably got the most leverage of uh since installing it was just a I I built it with Claude just a simple Python wrapper around Nano Banana. um the image gen model from Google which continues to improve. So I just say hey now it's on v3 go update it and we'll show a little something later but um essentially with that so most images now I generate with that it takes like sub seven seconds in a single prompt but using that same model is able to say uh take a single

**37:43** · string from the user that's a prompt say like a child running through a field first it makes that image then it uses their video API vo hands that static image to it and says animate this static image in the most obvious way possible.

**37:56** · So, one user prompt of child running through field, nothing exists, and then 30 seconds later, you have a video of it running through. And I was able to use that same method to do all of the interstitial scenes that I needed in a 32-minute film. And I am not a video person. Like, I mean, I like using like Da Vinci Resolve and editing stuff, but I'm not an animator. And I was able to get all of that done in like maybe an hour. Um, so those are those are pretty trippy, too. um you want to get really really down there.

**38:24** · Like I've got I have like Claude reading my biometrics and stuff and like pushing back on me and telling me to like take it easy this afternoon because he didn't get any sleep. So um but there's there's not like necessarily skill for that yet. I I think the the ones that are really powerful are when Claude uh the other day blew my mind by saying it was also in superpowers. This is easier for me to show you the variants if I just mock them up in a web browser. Would you prefer that? And I said yes please. And then it showed me all those and I was like a go. And then we just built from there like saving countless tokens on just text iteration.

**38:57** · And I'm using that nano banana skill right now. But uh I just ran SL plugin and I'm looking at the marketplaces I have installed. And some of the most important ones to me I think are the the claude cload plugins official one. Uh I think that's where it has a nice um skill reviewer skill or skill creator skill. Uh which is really good. Uh Obsidian is something that I use all the time. Uh, and so having the obsidian skills and it knowing just how to use that. Uh, so it's based on what I want.

**39:23** · But then also one that, uh, is actually very good. Oh, where did it go? Plug in. Uh, is the, um, codeex skills marketplaces.

**39:36** · I don't know why it's not showing it there. The OpenAI codeex ones. Um, it's not scrolling down, but anyway, that is like uh Claude does all this work. Codex is pretty good at reviewing it. So, this is a skill from OpenAI that just like pipes that to Codex and says review this and it goes and reviews it and then delivers that back to Claude and I have cut myself out of the copy and paste game of Claude said this and Codex said that and like going back and forth in in T-Ux splits. So, I'm I'm super happy about that.

**40:07** · Yeah, I would say Verscell is pretty skills forward. They've got a bunch of CLIs and stuff that are are pretty interesting. So they and they were like kind of the first on using some of the marketplace stuff. So check out their like open source skills stuff too as well. Great question. Thank you.

**40:24** · Okay.

**40:27** · That's what Nana Banana just made.

**40:30** · Close. Close.

**40:33** · Yeah.

**40:33** · Awesome.

**40:34** · But the fun thing about that is that you can ask it for any style. So you can say like I I mostly do pixel art. Um so I'll say like you know old school pixel art and uh it's a lot of fun.

**40:43** · Yeah.

**40:43** · All right. We are at time for this uh piece of it. Did anyone uh build a um a gen a first like pass on the repo row skill that they want to share?

**40:55** · Yeah.

**40:57** · Cool.

**40:57** · Awesome. If you want to run umshare.sh Oh, cool. Sweet.

**41:04** · This guy. All right. wins the workshop.

**41:06** · All right. Uh are you Sharif?

**41:10** · You're Sharief. Okay. Are you uh Okay, I'll run uh Well, I'll just run all three of them real quick. Uh so I'll run them on the uh skill. Oh, sorry.

**41:21** · This workshop.

**41:24** · Oh, what did they do?

**41:26** · It's pretty safe. Don't you want to run it against like work OS or something or the CLI?

**41:30** · Uh yeah. I just realized that it loaded it locally into this one, not in a global way.

**41:35** · Oh, uh, I can do that.

**41:40** · Okay, sorry.

**41:46** · I'm going to give it the work OS CLI and then I'll say uh repo roast zackb on the uh CLI repo. We'll see what it does. It's a new verb for defending the herb bird.

**42:04** · Oh yeah, you can c you can uh customize those. So I a lot of my uh spinner verbs are Lord of the Rings or the office themed. Uh so you'll see like defending us and things like that. I didn't I didn't think that would work, but that's okay. It's running against this the uh workshop repo.

**42:32** · Okay.

**42:38** · So, it's running all of the commands uh that you gave. And while you're while we're doing that, I will bring that up. So this is Zach's skill. Nice good description. Analyze repository health by running git and file system scripts to find stale to-dos. Churn hotspots. Yeah, that's good. And then it tells it specifically how to find stale to-dos. Awesome. Hotspot files, largest files. Nice. Constraints.

**43:12** · Never be vague for evidence. Never present a finding without a script output or get data backing it. That's probably why it's running still. Oh, nice.

**43:22** · Um, yeah. Scope.

**43:28** · Okay, Zach B. Okay.

**43:30** · Nice.

**43:31** · Nice skill.

**43:32** · You uh didn't tell it to to just like be mean to you, so that's be super mean to Nick and Zach over on stage.

**43:39** · Awesome.

**43:42** · Hi, Amy. She's pretty mean sometimes.

**43:47** · All right. Awesome. We will we'll run more of these. We've got more uh more things to get through. Uh and we'll we'll do this again and we'll we'll test another one. Y uh so moving on to the next section. Uh we're going to make that skill smarter.

**44:02** · So the first thing uh that you can do to make your skills smart uh is by providing more information to it. But this gets into the problem of the claw.md where you can be extremely verbose in there and give it so much information about your repo and you're just bloating the context window because it doesn't really matter. Well, you can do the same thing in skills uh but you can do it in a better way. And that is specifically with progressive disclosure. And I guess you could do this in a cloud. MD as well.

**44:26** · Uh but all it is is just saying like hey if you're thinking about doing testing for excuse me for example uh load this file that I have on testing and read through it. Uh, and you just give it like a path, like a local path to testing.m MD or whatever.

**44:43** · And that way it's only going to load that if it's actually doing like a testing skill or testing task as part of the skill run. If it's not, it'll skip that. And so you can uh specifically tell it like, oh, in in this example, uh, if you're doing like a scoring, like if you're if this is a run where it's doing scoring, run the scoring uh load the scoring rubric uh, and read through that. So we explain to you how to score things properly. If we're not doing scoring, you don't have to load that and we don't have to fill up the context window with all of that bloat.

**45:13** · Yeah, this also gets back to that gentleman's question in the back too of like you can imagine this pattern really scaling out. So the way that it actually did scale out even in our public work OS skills repo you can go and check out. We have multiple migration guides that we publish for various folks. So like if you're coming from Ozero, we'll happily help you move off Ozero to get to work OS. And then there's n number of you know competitors essentially that we've got migration scripts for. And so in this case you could say here's the migration skill and the migration skill is a pointer to the specific reference.

**45:42** · So you're not bloating your context window. It's just loading the two markdown files it needs.

**45:46** · Yep.

**45:46** · And if you look at the work OS skill like it we literally call it skill router uh in there and it just has like a reference map. So if you're going to install offkit into next.js you should probably load the work offkit next.js.mmd js.mmd file uh from the references and so if you're not working with nextjs we don't want we don't want to load that and bloat that we only load it when you need it for all of those and so this file is just filled with uh routing to the actual pertinent information that you need

**46:19** · okay um another way this is again to some degree it's fuzzy math under the hood right if you really get down to like matrix multiplication but uh nevertheless Another way to boost performance here is to kind of enforce confidence scoring. And one of the reasons that Nick's uh ideation plug-in, which is open source, that you can go check out, works so well is that it has like an internal counter of confidence of how close am I to fully fleshing out all of the variables that this task requires before I can go and execute.

**46:45** · And it then forces like a iterative loop with the user of continuously asking additional questions until it gets to the point where it's like, I'm 95% or above confident. I've mapped most of this problem space in my head and now we can start work and the result as um you know as a result the the output is likely better.

**47:02** · Um and so you that same concept applies here when you're you know building skills you can you can kind of add in that that same functionality and say uh for this particular aspect of the codebase you must always find this evidence and then get to a point until you know the tests are either this level of coverage or you have this level of confidence on on A B or C. Um, and that's another way to essentially boost performance in the skills.

**47:24** · Yeah.

**47:24** · Uh, it's it's really important like like like Zach was saying, it's just like kind of pulling that number out of nowhere. If if you say, "How confident are you?" And it's like, "I'm sure confident." Uh, well, why? And as you give it like ask it to like show more of its work as to why it's confident, it might be like, "Oh, wait.

**47:42** · I'm not actually as confident as I thought." Uh, and so that's the whole thing is like trying to get it to think more. uh in the terms of of like the the ideation skill uh what it's doing is it's using that to assess that it has like a full understanding of what I'm trying to say because like I have a problem where I don't give it enough information. I have the information I know what I want. It's hard for me to express it to the the machine in a way that it expects. Uh, and so it's using that confidence score to say, "Ah, I don't have like a full rounded understanding."

**48:12** · And it loads like a whole rubric on what it means to be confident on something. Uh, but then if it's not confident, it uses uh Claude's built-in ask user question tool to ask me a number of questions to pull that information out of me rather than me being like, "Ah, you're not confident. Let me try and give you more insight."

**48:29** · It's like, "No, I'm not confident because of these things." And then here's how you can make me more confident by answering these questions.

**48:35** · And a lot of times it'll just give me multiple choice on like, you know, do you want this? Is this what you mean?

**48:40** · This is the recommended approach I would take, but if you want to go this other way, we could do it that way. Uh, and so like we have that dialogue going back and forth with it, but it's all based around how confident is it that it understands what I want and understands how to do what I want.

**48:58** · Uh, yeah. And so then this gets back to uh just kind of in practice the way this works or at least how it has for me and what we kind of recommend is you know build an initial skill. Maybe you're doing that yourself in Markdown. Maybe you're using the skill builder in Claude and saying I need a skill to do X.

**49:11** · You're doing it you're using that skill for a couple of iterations maybe a couple days maybe a week. Um you look at what it produces and then you know keep in mind that as you're having multiple conversations with say Claude over the course of a week all of those conversations are even getting saved locally to some degree in JSONL files.

**49:26** · And so you can um be honest with the evaluation phase about is this actually improving things? Is it not? Where does the skill fall short? What are the edge cases it's not currently capturing?

**49:36** · What's the annoying thing that I've now discovered that I've been running at 7 days that it's missing? And then you kind of iterate and but again you're still going faster because you come back to a state that's already working and you say these three edge cases are driving me nuts and you also need to be able to like review your own PRs in the future, right? And so then once that loop is is done, you have a skill that's significantly more powerful and then you can keep keep on running from there. But it's kind of like they're sort of evolving over time.

**50:00** · Um so they're again like I think of them as like organizational units of where to put kind of you know work intelligence and then over time if you're if you're doing it right they're getting better.

**50:12** · Yeah.

**50:12** · when when skills first came out, uh Zach and I were actually at an on-site together in San Francisco and uh like we woke up one morning and they're like us introducing skills and we're like this looks like every other markdown file that they provided. What what's the difference? And um at like later that day, we presented on on skills like I don't know four hours later. And the the one that I built to present that was a claude skill claude skill uh that would analyze the like it wouldn't analyze your skill running because nobody had skills like four hours into them existing.

**50:43** · But it would analyze, oh, you just did this task with Claude. Let's go through and pick out what could have been what what we could like encapsulate into a skill so that it can do that in an easier way. And like since then there's like meta-kills and things like that that have come out where it will analyze the performance of actually how you're using claude or how you're using the skills in cloud and then it can use that to feed back in just like Zach was saying just by looking at those JSNL files there are these logs of like the conversations that you're having with claude and uh that can inform it on how to pro improve things.

**51:14** · So, for example, like in the repo roast, uh if it's kind of being wonky about how it's pulling in get information, adding in like the the bang with uh like the specific git command that you want it to run to get log information, that's a way to improve it so that it doesn't have to iterate over that and say and you come back to it and say, "No, that's not what I wanted. I wanted it like this." like you you can be more explicit with it and that can be fleshed out by reviewing the performance that you had the first time or the first couple of times.

**51:44** · The the other intuition I'll share is that um it's kind of like in my experience recently it's the types of nagging things that I find the most cognitive like resistance to doing every week that I actually need to turn into skills. And so like a breakthrough moment for me was realizing that like context switching between Slack and focusing on code and then going and ticketing like new asks in linear was so disruptive to me that I just needed Claude to do that.

**52:07** · So now it just monitors and when someone asks me for something new in Slack, it goes and looks in my linear and then if there's not a ticket for it already, it does do dduplication, adds a new ticket and then I'm haven't left my flow, right? I'm still able to focus. And so like that's kind of the intuition I have now is that um you can sort I think it's really powerful and I think we're only at the very beginning of it like analyzing your own workflow over time feeding it more information about how you actually work and then letting LLMs you know do what they're really good at and compress down that that actual time.

**52:42** · Is there a skill out there that you recommend for that? Was there is is there a skill that you mentioned that there is skills out there that met as skills to review your kind of past conversations and propose skills or improvements? Is there one that you use or that one? There's not one for that. But um and I didn't do this myself the last time. This was like last week. But what I should have done is say, "Hey Claude, use skill builder yourself." Because Claude's got that baked in skill hyphen builder, I think it is. Use skilluer to um look back at my workflow and tell me where it's the least efficient. Right.

**53:16** · And then um that's also pulling in connectors because there's a Slack connector and there's a linear connector. So that's where like the markdown might be referencing you must always use the Slack connector to pull in this and I only care about these channels and direct mentions of my name, right? Um but yeah, I think it might even be faster in some cases to just say here's where I work. This is the tool that we use to communicate. Make me a skill that does that.

**53:40** · Which is also like kind of crazy. I think this is the one that I was thinking of uh specifically is cloud meta skill uh that helps you configure claude uh including like setting up those skills. Uh I think this is the one I've used but like Zach said I've also just asked it to review its own performance and kind of go from there.

**53:56** · Uh one really great thing is like I built this pretty cool tool and I wanted to write a blog post about it and uh it it was all built with Claude. So I was able to just go ask Claude, "Hey remember that time we did this fun thing together? Let's reminisce about and we just like talked about it and it like led to these anecdotes that I added to the blog post that I I completely forgot about but there Claude was very fond of that moment between us.

**54:19** · That's not what's happening. You don't understand that. Okay.

**54:21** · No, I don't.

**54:22** · Under the hood, that's not what's happening.

**54:23** · Don't lie to me.

**54:24** · Do you use any skills for memory for maintaining a a like memory state within Claude?

**54:30** · Great question. Uh Claude has its own memory built in. Uh and I there's that autodream thing. I don't know if that's real yet or if it's like a a thing that's coming, but it will actually like prune the memory. And so I've been like focused on building around that. Uh but I've been building it on in Pi specifically.

**54:46** · Uh and so like I built this um I I built like what it would take to be a a DX engineer at work OS as like a full agent using PI and it's called case and uh it uses memory internally like memory.mmd files and it works across all of our open source repos. Uh, so it knows like React and React router and next and tan stack start and all of those.

**55:08** · And so then it has like general memory files and then like framework specific memory files and it goes in and prunes those and updates by doing like as part of its flow doing a retrospective at the end and analyzing its own performance and then saying, "Oh, I spun I spun in a circle a bit for this. I could have like once I got to there like I can just save that to memory so I know like this is the command I run next time to get the information I need." and it just keeps track of that. I haven't built in like the full dreaming thing where it prunes that yet, but um I I'm experimenting with it.

**55:40** · Yeah.

**55:40** · And also I I want to play with the Obsidian connector more because I think that would be super powerful. I I had a habit in the past of using Obsidian and just making a daily to-do with just the date as the title. And then so I think writing to and reading from those vaults so that you could imagine saying look back over the last week, last week it's translated into what are those actual dates. It fetches those files directly, right? And then it can also write consolidated memories. It's also worthwhile playing with things like open claw which I' I've done because that memory system that it ships with was surprisingly good, better than a lot of like stock claw or openis stuff.

**56:11** · And so seeing how it does that with like daily journal MDs and then the consolidated memory which I think the dream stuff is kind of pointing towards like consolidating memory over time.

**56:23** · Yep.

**56:23** · Um, but a lot of times the crazy thing about this is like the answer is one turn request with skill builder is the fastest way pointing it to Yeah, this is a good Yeah, 100%.

**56:34** · Y um so we're going to jump into the next uh piece of of work on your side and that's adding phases uh and confidence scoring to it. So adding progressive disclosure, uh adding a confidence score, telling it like how confident are you in in this or like like uh we we've got some examples uh of that potentially like uh you know what's a good example?

**56:57** · Um how confident are you in this? You know, you've installed offkit correctly.

**57:03** · Yeah, but I mean like for repo rows.

**57:05** · Oh, for repo.

**57:06** · Uh you you know, you gave me a bad score on I don't know, git commits. Why is that? Like, okay, have it dive down deeper than just this is our pattern of how we use git commits. We always have our messages like this. We're following these conventions. So then based on that, what's your confidence that this is correct to our repo?

**57:24** · So, for example, you might use uh conventional commits at your work and if you find commits that aren't like that or you find a bunch of merge uh commits in there, for shame. Uh but yeah, like different things like like that you can you can add uh specifics to and have that as be as a u a progressively disclosed rubric that it can follow for those things.

**57:46** · A quick housekeeping thing in case uh for any reason you you're behind or feel behind, uh you can run setup.sh and then checkpoint two to get to the same spot that we're at now. Y and then yeah, any other questions feel free to shout out and I'll run you a mic. We'll spend about five minutes here uh and then we'll move into the next section just to make sure we have enough time.

**58:14** · Do you want to talk about um any of these topics? Zach, I can talk about when confidence when um yeah, confidence scoring saved us.

**58:25** · Yeah.

**58:25** · What's that? that uh was when we were working on the um when confidence scoring saved us the uh well that was kind of built into the eval uh that we wrote like claude ships with a whole eval framework now that you can use uh and it'll like spin up a guey for you like a it'll create an HTML report and you can see like before and after and all of this insight into how your uh skills are running uh and whether they're actually like improving cloud or making Claude worse at the task.

**58:56** · Um, but before that existed uh I was writing my own to do that and uh it was all based on on that. And so like let me let me bring up the um ideation skill and I'll just say let's see we'll go to the CLI

**59:16** · and I'll say so for context this is our work OS CLI that we're building in the yeah I'm on the main branch of that I use work trees for that um what's a feature that we want to add I want to add a fun slashbuddy command similar to how Claude Code shipped that for April Fool's Day.

**59:40** · I used a tool called Whisper Flow uh to go full Wall-E and not even type anymore. Uh and I just press a button. This is how I code now.

**59:50** · Um do you prepare that over the closed voice mode?

**59:54** · Uh yeah, I do. I've been on Whisper Flow for maybe a year now. And the thing I like about it is that it can uh input anywhere on on uh Mac. So, you know, if you're in uh some funky old like website in Chrome, it works there. It works in Safari, works on any app that you've got as long as you can focus a cursor there.

**1:00:11** · You can insert text there. And it's also fine-tuned towards like technical terms. So, you can say at user authentication.ts and it'll come out correctly. Um you can reference files, etc. So, it's great. I I imagine that more and more of the tools are going to get their own native voice uh over and over time that's going to become like a dominant like interface. But right now, Whisper Flow is like a pretty sweet experience. Yeah.

**1:00:38** · Turn on fast mode so it'll go faster. Um, yeah, it also does cool things like uh you can say like when you're dictating into Slack, uh, be more casual. When you're dictating into an email, be more formal and it will kind of it's sort of context aware in the formatting that it'll put out. like you can say it knows you're in Gmail or it knows that you're like writing code, you know, or requesting code.

**1:01:01** · So, this is an example of the ideation skill. I gave it that that simple command and now it's saying like, oh, what do you like I don't fully understand what you mean. Uh, what kind of fun are you looking for? I'll say uh a visual gag. Uh, asky art gallery. Sure. hidden Easter egg. Yeah, we'll go listed but subtle.

**1:01:29** · So, like I I gave it one sentence and it's like, well, what do you mean by that? And it's like pulling all of that out out of me.

**1:01:35** · But there's the value in thinking. It's like, you know, the same way that a good engineer in a whiteboarding session would kind of draw the same stuff out of you.

**1:01:40** · Yep.

**1:01:40** · And so, right there, it did this confidence score. It's based on the problem clarity. It has a 20. Goal definition, 18. Success criteria. It doesn't really know what I'm asking for.

**1:01:50** · So, that's the lowest one. uh scope boundaries and then consistency. So those all add up to 100 and I got a score of a 90 out of 100. So it doesn't it's not going to just be like okay I know what you want. It's going to ask me uh some more things like oh we'll do that and we'll just have minimal I'll say zero config. I just want it to go fast.

**1:02:10** · And so now I'm at 96 out of 100. So it understands what I want and now it's going to write a um a contract for me to read. I read and review the contract and then it's going to build from there these phases that I can execute or these specs that I can execute in phases uh and then go from there uh so that I can clear the context for each one and have like a fresh context going.

**1:02:33** · Yeah.

**1:02:33** · The way I would say that is like is the math airtight? No. Uh does it matter? No. Because the value is in the iterative loop of like clarifying and clarifying your own thinking by by responding.

**1:02:44** · Yeah.

**1:02:44** · Oops.

**1:02:47** · And so there's the contract that it's it's loading.

**1:02:51** · Uh and it tells like what success criteria means, scope boundaries, what's in scope, what's specifically out of scope, any future considerations, how we plan to execute it. This is an easy one, just a single phase. Uh and so it's going to just create that spec for me, which it did here. And then I could run this uh and go. And so it was all gated on that that confidence score.

**1:03:13** · Cool.

**1:03:14** · All right. Um, you want to jump into Yeah, let's do it.

**1:03:18** · All right. Uh, we'll we're going to skip ahead into um the next section and we'll have one more one more thing and we'll do some sharing uh after that one. So, kind of moving beyond the editor. We consider we we thought about this and we're like, does that title make sense?

**1:03:33** · Uh, skills beyond the editor because we're not really in an editor, but like for us, we kind of are like we don't open I don't open any of them nearly as much as I used to. Uh, so I've lost my identity a little bit, but um, yeah, these skills, they really do work in a lot of different places. Um, another thing that you can do is like you can level up your skills in a number of different ways. Uh, so like for this uh, repo roast for example, you could have like, oh, I want to know who the bus factor people are.

**1:04:01** · So use like uh, get short log to understand who's committing the most, who's committing the most in specific sections of the the codebase.

**1:04:08** · Uh, and you know, list out what the bus factor is. uh and how vulnerable we are to that. Commit crimes. Uh this would be people who just have bad commit messages. It's so easy. You just tell Claude, "Commit it and go." Uh zombie branches. You could have, you know, list out all of the branches that never went anywhere uh or that are still hanging around. Uh who is committing at 3:00 a.m.? Who's who's up the latest uh working and making us all look bad?

**1:04:34** · And then this one is definitely something that you should you should add and that's is my read me yeah is my readme real does it explain or describe real things?

**1:04:50** · Uh yeah and so again the reason that this is so powerful is that it's no longer specific to any foundational model provider right uh you can define these skills and then you can use them locally in cloud code but you can share them with your team as we talked about with you know a git based you know plug-in architecture but now you can also put them in cloud desktop and web as we talked about with the recruiting team folks that identify as completely non-technical are loading uh specific

**1:05:13** · skills and running them in their own sessions and sharing them and sharing them right and then now as we're finding like agent harnessing uh harnesses becoming more and more relevant and so things like uh pi um which is what openclaw runs under the hood uh you can load them there as well.

**1:05:28** · So it's it's the value is really in like defining the discrete work block and then figuring out exactly which tweaks make it the most effective description of getting that work done and then you know sharing it with your friends and putting it on different boxes um without having to do much more than authoring some markdown and possibly some scripts.

**1:05:47** · Yep.

**1:05:47** · and skills. If you took a skill file, like you took repo roast with that skill.mmd and any scripts or references and all that, but you took that folder repo roast and you zipped it, you'll get a dozip file back, right? Rename that from zip tosskill and now a nontechnical teammate can drag that into cloud desktop and use that skill. And that's just how they're shipped. That's a really easy way to to share them.

**1:06:11** · Not a really easy way to version them. there's still there's still pain to around like how do you handle sensitive uh you know credentials in that case like you don't do it that way please don't put it in the zip file but you know it's evolving so but you can also use those marketplaces like the cloud marketplace works in uh cloud desktop as well so that's an easy way to to share skills um if they are applicable to like non-coding workflows

**1:06:37** · for sure and uh so some of the like we've talked about this but like one of the things that I really wanted drive home is like with the work OS CLI. This is a it's like a generic CLI that you can use uh to do like work OS commands in it, but like its flagship feature is this ability to just run install.

**1:06:55** · So if you have a project that doesn't have O in it or you have uh like other off in there that's not work OS, uh you can just run work OS install in there and it's going to politely remove the other off that you might have in there uh and then add in based on what you are using. like if you're using Nex.js or Tanac start or whatever, it's going to figure that out and load that in there for you. And the CLI is using the claude agent SDK, which is like a program programmatic cloud code that you can ship that I can ship in the CLI.

**1:07:26** · Uh, and the smarts of that, all of the brains are actually skills that are in the work OS skills directory. So, it knows all about that.

**1:07:34** · And the reason we did that is so that we just had like the, you know, two birds with one stone. We have we build the skill and we make it good and then we prove that it's good by having the the CLI run it. And the beauty of the CLI is like it's an easy command. You just do npx work OS install. Uh and we're like um proxying all of the commands to Claude so that it hits our API token. Uh and and so it's an easy way to just like say here's a zero friction way to get set up with it. It'll even create like a work OS account for you and you can go back later and claim it.

**1:08:04** · So it's like 5 minutes and you're you're set up. And all of that is entirely skills driven.

**1:08:12** · Yeah.

**1:08:12** · Another place we're seeing like high leverage with this is imagine blog writing. Uh like lots of folks on the team as it's growing like want to write blog posts in a uniform way but they don't know exactly how our CMS works exactly the tone or format and like the conventions that we use. And that's the type of thing that you used to put in a notion doc and then hope that you could inject it in someone's slack and like force them to read it before they write something. it's just easier to define that as a skill so that they can interact with it and then get to 80% of that artifact without having to consult somebody else essentially.

**1:08:41** · Um code review image generation with image generation 2 you can also put additional parameters there to get like specific styles as well. um CI pipelines and as I mentioned earlier in the talk like once uh Nick had published up the you know public repo of of work OS skills uh the rag pipeline was able to just start loading them all as agentic tool calls and performance on all those queries just jumped over just you know

**1:09:05** · flatly chunking all documents and putting them in a vector database for example and you saw the giant lobster outside when you came in right like that's all can be skills based as well so it's skills are just this uniform way that transcends the the cloud mod code or the codeex uh and it's something that you can load anywhere at any technical skill level.

**1:09:24** · Y so it's really easy uh we talked about uh eval like measuring this stuff matters uh with the the skills like specifically with the next.js installer skill I actually found out through my evals that I was making things worse because I was overly prescribing what to do with Nex.js and cloud code was just inherently good at working with Nex.js JS and I was making it worse by being too dogmatic about what I wanted it to do and it led to like a 30% drop I think in like overall accuracy based on these numbers I made up.

**1:09:55** · Uh but I was able to use the that and I I kind of think of eval in a lot of ways like my Apple Watch uh it tells me like my heart rate and you know how how many calories I'm burning throughout the day. Is it accurate? No, of course not. But it gives me a general like baseline of like ah I am more active today than I was yesterday. Uh and I can kind of use that to gauge where I go forward. Is it accurate in what I like base my my life on it? No.

**1:10:20** · But it's a general like vector that I can I can look at and see whether I'm improving or uh making things worse.

**1:10:29** · Yep.

**1:10:31** · So some skills in the wild. Um Zach, you've you've made a couple of skills uh that are these are specifically like not uh code related, right? Uh but they they're pretty impressive.

**1:10:41** · Yeah.

**1:10:41** · So this is one I was talking about earlier just to show um what I am the most excited about is like taking what seems like an incredibly complex workflow and then just making it available as skill. So this is uh as this is an example where I have a Slack avatar that I built I had generated for me like months ago and I just handed it to this animation skill and I said animate this in the most obvious way possible. We'll see if that's actually obvious.

**1:11:07** · So, taking a giant ball of energy and grimacing at it as one does. Um, but the point is that was a single text prompt uh of like make this person look like they're in Fallout holding a ball of energy and then animating it. This one uh same exact skill. So, same Markdown file and py two Python scripts saying, you know, uh the prompt was child running through a field.

**1:11:34** · And there's also sound with this because it's um hitting the VA API. So again, the at first uh you know, Claude reads the markdown skill, says, "Okay, I understand what this is. It's a a sequence of two API calls I'm going to make." The first API call is the user's prompt to make the static image. The second API call is the output of that, the static image, and then a new prompt that I write saying animate this in the most obvious way possible, hitting VO with the VO API with that, and then getting back an animation. But, you know, again, that's like 30 30 seconds of generation time.

**1:12:04** · And so, I use this exact same workflow to to do like all of the interstitial scenes in a in a film recently. Uh, and another example, uh, I mentioned this earlier, but the remotion skill. Uh, I have I'm terrible at video editing. I don't know anything about it.

**1:12:21** · Uh, but when I was working on the work OS CLI, I thought, oh, it'd be kind of cool to make like a fun video that I could use on Twitter to like demonstrate it or or talk about it. And so, uh, somebody was mentioning Remotion and I just asked it to make this and it put it together pretty much like this. Like I asked it to use our our actual logo rather than some madeup one. Uh, but it even like understood like the output of of the CLI and put all of this together into a demoable video uh that showcases what it can do. And I didn't have to do that uh at all.

**1:12:52** · And I I looked super impressive without knowing anything about video. It also like the skill when I said do this, it loaded up a like localhost 3000 in my browser that was a full reotion video editor. And so I could see it playing on a loop in there and it was like doing things and I'm like, "Oh, you didn't use our actual logo. Go use that." And I just like told Claude to do that and it just updated like in real time. It was it was so cool.

**1:13:16** · Yeah.

**1:13:16** · So imagine like hooking this into your GitHub CI/CD flow and then at the end of a big project or every time a milestone gets merged, you auto update, you know, whatever document and then even include a demo. Um it it can start to get pretty powerful if you orchestrate skills that are well defined.

**1:13:37** · Is this the skill?

**1:13:38** · This is this is exactly how the that one works under the hood. So you can imagine like the one that I showed you that had the two YouTube videos. So if it's called animated image, the first one's going to be gen generate a minimalist static image and then um take that image and animate it via VO and you there's just two scripts. There's one to generate an image here and then there's one to generate the video. Um but the skill file itself is like 30 lines of markdown.

**1:14:00** · Yep.

**1:14:00** · And that uh that nano banana one that I ran earlier that was just like coming up with a a creative enough prompt like taking the idea that I had like flushing out the prompt and then it passed it to a TypeScript file that called the nano banana API and got the image back. So uh that skill is just basically like a a simple LLM wrapper around this uh around a TypeScript script that uses their API to to go do that.

**1:14:26** · So it's also like just broadly applicable to workflows. It's not just a dev thing, right? You can imagine if sales has a very specific way they have to reach out to people or there's always like a type of report that you're generating for customers or prospects or whatever. Um all all of this is like excellent uh for use with skills.

**1:14:41** · So did anyone uh have a um a skill a repro skill that they want to share?

**1:14:47** · Yeah.

**1:14:49** · Okay.

**1:14:52** · Yeah. The Amy and Wolf from Raven Wolf skill. Try that. You have to see the results.

**1:14:59** · Which one is it?

**1:15:00** · Number two or I uploaded another one.

**1:15:03** · Number six is a newest one. Used newest.

**1:15:06** · I'll do number six.

**1:15:17** · All right. So, while that's running Oh, no. We ran the wrong one.

**1:15:21** · There we go.

**1:15:23** · While that's running, uh, let's go look at it.

**1:15:29** · Oh, nice.

**1:15:30** · Okay.

**1:15:30** · Ruthless honesty. I love it.

**1:15:33** · Brutally honest with a heart of gold.

**1:15:39** · Awesome. I love the context. Lots of uh thick files. Very nice. Yeah. Excellent.

**1:15:44** · Constraints.

**1:15:47** · And here uh the audience detection. You told it to load audience.mmd. Here's that progressive disclosure about that. This also just helps to keep your markdown files manageable.

**1:15:59** · This is a 10 out of 10 skill.

**1:16:00** · Yeah, very nice.

**1:16:06** · This is awesome.

**1:16:08** · All right, let's see if it gave us anything.

**1:16:12** · So, it's it's grading the the workshop itself. Um, six out of 10.

**1:16:19** · Brutal.

**1:16:20** · I feel that.

**1:16:22** · I thought we had I thought we had something going, but Okay. Hopefully you give us a little bit more of a of a grade than that.

**1:16:34** · That's awesome.

**1:16:35** · Uh some critical suite isn't on fire because it doesn't exist. That's great.

**1:16:42** · 1,200 lines of monolith. Yeah. Yeah.

**1:16:46** · Get identity crisis. Zach is two people.

**1:16:48** · That's how it feels too.

**1:16:51** · Hardcoded secret. That's okay. It's not really a secret.

**1:16:55** · That's awesome.

**1:16:56** · Love it.

**1:16:58** · Super cool. All right, we got uh three minutes left. There's any questions or um anyone else want to share a skill?

**1:17:10** · So, this is a skill that you can use, but more importantly, it's techniques that you can take and use to build your skills uh and build them up in different ways. There's a lot more advanced topics that we can go to go into as well. Uh we mentioned um like sub agents for example. Sub agents is a great way to extend those skills without bloating the context and having it kind of do one-off things and then uh and then exiting.

**1:17:29** · Um and the like to take this to the next level, I really recommend like having Claude's own skill creator skill installed uh because you can just say, "Hey, I have this skill. Is it any good?" And it'll give you pointers. Or you can say, "Run some evals on it." And it'll run like a full eval test suite on it. uh and tell you, yeah, it's good or no, it's bad. Yeah. And uh and can go from there.

**1:17:55** · Uh and then like Zach was saying, like reflect on the transcripts, reflect on how you're actually using the skills, and you can use that as insight to see how to improve the skills and the execution of those skills. Uh like for example, if somebody kicks off a skill and it's always asking questions about uh you know, a specific thing, maybe that's something that you can provide ahead of time. Or if you see it like, oh, it's going and doing like 10 tool calls, maybe you could like condense it down to one or two tool calls and pre-provide that information so it doesn't have to do that each time.

**1:18:23** · Yep.

**1:18:23** · The plus one recommendation on the internal skill creator. And the other thing it kind of um suggest I mean suggests to you to do over time is to think about the way you manage your context even stuff that you used to think of as disposable, right? Mhm.

**1:18:36** · So like in the pre-LM era, we might have dev real hard at the keyboard all week as I used to do and then finally on Saturday like wipe it all away so I can get for myself. Like now all of that context is gold. Like the conversation, especially what failed, especially what didn't go well, especially what was frustrating because now all of that is very rich context for a skilled creator or refiner to mine and then build you a bespoke tool that's going to solve that problem smoothly next week.

**1:19:02** · Yeah.

**1:19:02** · So, and you can also like think of skills like you could use that progressive disclosure to like disclose things to different audiences. So, for example, you could depending on who's running the skill, you could say like um get config user email and and figure out who this the user is. Uh or you could do things like, oh, how many commits does this user have in there? They have 10,000 commits in here. Okay, we can really roast with them. But this other person who has four commits, they're probably a new hire. Maybe go a little gentler on them. Don't scare them away from this project that they just sent.

**1:19:33** · Me too.

**1:19:34** · Question. Yes.

**1:19:34** · Very quick. Zach, could you take me through again uh you saying about the context switching? You'd somehow hooked up clawed with Slack and Linear. So it sounded almost like it's constantly being able to read what Slack's doing.

**1:19:47** · Absolutely. I have it called co-work or we use cursor. So I don't know if we have the same.

**1:19:51** · Gotcha. Yeah, I'm using cloud code now.

**1:19:52** · It's possible to do it in cloud code and and cloud uh desktop but essentially I just have the connector in Slack. So I say uh I had to do GitHub or just to do OOTH with Slack and then it can read my Slack messages. You can now run the loop command at least in cloud code to have it like do that every 15 minutes if you want. And then you say in the prompt if there is not already a correlative linear ticket make a new one for me if there is one and there's additional asks on this you know request update linear and then by the way you have a second terminal tab that's looping against your linear state. Kathleen works at work.

**1:20:26** · Earm muffs, Kathleen. I'm really working really hard. Uh they have a second one that's looping and looking at your linear task and then like doing work for you essentially. But the the main point was just that um yeah, sorry time. The main point was just like automate those loops. So that's our time. Thanks so much guys. Uh thanks for being an awesome audience. Thanks for all the great questions. Really appreciate it.

**1:20:45** · Thank you.