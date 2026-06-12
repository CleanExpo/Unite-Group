---
title: "Anthropic's Boris Cherny: Why Coding Is Solved, and What Comes Next"
source: "https://www.youtube.com/watch?v=SlGRN8jh2RI"
author:
  - "[[Sequoia Capital]]"
channel: "Sequoia Capital"
published: 2026-05-05
created: 2026-05-08
description: "Boris Cherny, creator of Claude Code at Anthropic, joins Sequoia partner Lauren Reeder at AI Ascent 2026 to talk about where coding goes from here. He explains why he hasn't written a line of code in"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=SlGRN8jh2RI)

Boris Cherny, creator of Claude Code at Anthropic, joins Sequoia partner Lauren Reeder at AI Ascent 2026 to talk about where coding goes from here. He explains why he hasn't written a line of code in 2026, why he now ships dozens of PRs a day from his phone, and why he believes coding is effectively solved — at least for the code he writes. Also: why loops are the future, why he thinks Claude Code itself may be 100 lines of code a year from now, and why the invention of the printing press is the right analogy for what's about to happen to software.  
  
00:00 Introduction  
00:55 Claude Code Crowd Check  
02:39 Origin Story of Claude Code  
03:35 From Typeahead to Agents  
05:07 Is Coding Solved  
06:50 Boris Personal Workflow  
08:51 Future Teams and Generalists  
10:26 SaaS Apocalypse Predictions  
12:57 Audience Q&A Deep Dive  
23:35 Closing and Whats Next

## Transcript

### Introduction

**0:02** · Okay, I'm excited to introduce our next speaker. Show of hands, who here uses Claude code?

**0:07** · Okay, show of hands, who here has Claude code psychosis?

**0:11** · Come on guys, \[clears throat\] it's okay.

**0:12** · It's okay. Um my my my team lovingly says I have Claude code psychosis, which may or may not be true. Um we are delighted to have Boris Cherny with us today. Uh Boris is the creator, the father of Claude code. Um and uh in the process of doing that has just had a front row seat to to reinventing uh the modern way of of software development.

**0:32** · Um and we're we're really grateful to you, Boris, for taking the time to speak with us today. We know that um the entirety of software development kind of rests on your shoulders. So, thank you for taking it out of your time to be with us today. And interviewing Boris is Lauren Reader from our team.

**0:45** · Thank you.

**0:48** · \[applause\] Giving our chairs.

### Claude Code Crowd Check

**0:55** · Um you took my you took my opening line, Asia. We asked who here uses Claude code. There's a lot of hands. That's awesome.

**1:01** · Thank you for joining us, Boris. It's very special to have you here. Um as a roomful of builders, I think you are changing building entirely. And so, I'm very curious to explore how you think about the future of software, coding, and what we should spend all of our free time on. Um but I'll give you a me a tiny bit more background on you so that everyone has a little bit more context. So, beyond creating Claude code, Boris is very much an engineer's engineer. You were writing a lot of code through your whole career, writing textbooks about code, including programming in TypeScript.

**1:33** · Um and I think last time we chatted you hadn't written a single line of code in the last year, or at least so far in 2026, which is quite the change. Um There's also a a little known thing back in middle school, I wrote a guide about uh writing BASIC for TI-83 Plus calculators.

**1:52** · And I I just I I searched for it, it's actually still on the internet. It's extremely embarrassing, so please don't search it. But it \[laughter\] exists. We will definitely be finding that. Um so, we're going to do I'm going to start with a few questions here. Maybe we'll start with a little bit of the history of Claude code, how you started it, and then we're going to have a lot of audience Q&amp;A for this one. And so, start thinking about your questions in the back of your head, uh and would love to turn it over to you all soon.

**2:15** · Yeah. Um and also real quick, so for people that use Claude code, do people use the CLI mostly? Like okay, majority CLI?

**2:23** · Okay. That's a lot. Majority desktop?

**2:26** · Okay. Majority VS code or JetBrains IDE?

**2:30** · Okay. That's actually not a lot. Okay.

**2:32** · Other?

**2:34** · I'm like iOS mostly these days. Yeah.

**2:37** · \[laughter\] Okay. Cool.

### Origin Story of Claude Code

**2:39** · Um yeah, so I started Claude code kind of accidentally in a in a lot of ways. Um I joined this team back in late 2024. It was a sort of this incubator within Anthropic called Anthropic Labs. And uh the team kind of served its purpose. Um we created Claude code, uh MCP, and the desktop app. It was a team it was just a few of us. So, very much like innovation team.

**3:01** · We built the thing that we wanted to build, we disbanded the team. Uh now the team's actually back together for round two. Mike Krieger, who's the you know, like the chief product officer at at Anthropic and used to be one of the founders at Instagram, so he's leading that right now.

**3:14** · Um so the kind of the the the the reason that I started to work on coding is we felt like there was this product overhang. And I I'm guessing people here use that word a lot. Uh but we definitely use this word a lot in kind of within the lab.

**3:30** · Uh there's this idea that the model can do all the stuff that no product has yet captured. And in late 2024, when we were looking at coding, the way that we did coding, the state of the art at the time was type ahead. It was you open your IDE and you press tab and you can like complete like one line at a time. And that was the thing that Sonnet 3.5 enabled for the first time. But the feeling was we could actually go a lot further than that. And the model was almost ready for the next big step. So, we don't have to do type ahead anymore, we can just have the agent write all of the code.

### From Typeahead to Agents

**4:00** · And so, I built it, and it just really didn't work for the first 6 months. It was like not very good. It was barely usable. I wrote it from I used it for maybe 10% of my code or something like that. And even after we released Claude code initially, it was not a hit. There's a lot of people that used it, but it did not have this exponential growth that it has today.

**4:21** · Um that started with Opus 4 in May. And I I remember that very clearly. That's like when the exponential growth started, and then it kind of inflected with every model release. Uh like it started with Opus 4, then 4.5, then 4.6, now 4.7. It just kind of keeps inflecting.

**4:36** · But essentially, we were trying to build this thing that was like pre-PMF, and we knew that it wouldn't have PMF for 6 months because we were building for the next model. And that was the idea the pretty much the whole time. And you know, for Anthropic in general, we've always just been very focused.

**4:50** · We've always cared about business and enterprise and safety and coding. That's just always been kind of the way that we wanted to build. And so, at some point we kind of knew that we wanted to build a product. We didn't know exactly what we wanted. So, this kind of ended up being the the product bet. It's an incredible story, especially that it was an accident.

### Is Coding Solved

**5:07** · Um so, you've said on the record that you think coding is solved. Uh if this is one of the three best from Anthropic, can you tell us more about what you mean by that, and what might still not be solved, or what second-order problems might come? All right. I can ask another question for the room. Who writes 100% of their code by hand?

**5:27** · Who writes 100% of their code using a agent like Claude code?

**5:32** · Okay. Who's like somewhere in between?

**5:35** · Okay. So, like 50% solved.

**5:38** · \[laughter\] I mean, for me it's for me it's like for me it's 100%. Like the the Claude code code base, um you know, it leaked, so you know, people know. Uh it's pretty simple. It's just like TypeScript and it's React. Like there's no big secret.

**5:51** · There's there's nothing really complicated. The the reason we picked TypeScript and React is it's very on distribution for the model. So, when we started, you know, building the code base, the model was not as intelligent as it is today, so the language and the framework mattered a lot. Nowadays, you know, it can write whatever, and it can pick up new languages, new frameworks it hasn't seen. But back then, you wanted to use something pretty on distribution.

**6:12** · Because of that, I think fairly early we got to the point where the model just wrote 100% of the code. And for us, this happened sometime in October, November last year. And so, for me today, you know, like the model writes 100% of my code. I write somewhere, you know, usually a few dozen PRs every day.

**6:28** · Uh there was a day last week I did like 150 PRs in a day. That was like that was a record. I was just trying to kind of push to see how far I can get it.

**6:35** · Um but yeah, it's like for me for me it's just solved. Um but this is not the case everywhere. There's very big complicated code bases. There's kind of weird languages the model's not good at yet. Um and you know, as everyone here knows, it's it's getting there. Usually the answer is just wait for the next model. Can you actually tell us about your personal setup? You walked us through it the other day. It is pretty wild.

### Boris Personal Workflow

**6:55** · Yeah. Um so, I shared my personal setup like 6 months ago or something on on Twitter. And it it's funny, I actually I shared it I didn't realize that it would be surprising for anyone. That was just like the way that I coded.

**7:07** · \[laughter\] And it's changed since then. It's changed. Um and so, now actually most of my work I do from my phone. Um and so, I don't know if like you guys won't be able to see this, but I have um so, I have like the Claude app, and if you open the Claude app, on the left-hand side, there's this little code tab, and I just have a bunch of sessions going.

**7:31** · Um you you probably can't see it.

**7:33** · How many sessions?

**7:34** · Uh usually have like maybe like five to 10 sessions. Uh and then the sessions usually have a bunch of agents, so I think currently probably like a few hundred agents going. Um usually every night I have like a few thousand that are doing kind of deeper work. There's a few ways to manage it. One is that you ask Claude to use a bunch of sub-agents to do work.

**7:52** · Actually, the the thing that I've been finding myself using more and more is the loop. So, this is {slash} loop, and it's just like the coolest thing. It's like the simplest thing that works. All it is is you have Claude use cron to schedule a job for some point in the future, and it's a repeat job. And it can run every every minute, every 5 minutes, every day, kind of however often you want to schedule it.

**8:15** · And at \[snorts\] this point, I have like dozens of loops that are running for stuff. So, I have one that's babysitting my PRs, like fixing CI, auto-rebasing. I have another one that keeps CI healthy.

**8:24** · So, like if there's like a flaky test or whatever, it'll it'll go and fix it. Um I have another one that grabs uh feedback from Twitter and kind of clusters it for me every 30 minutes. So, I just have a bunch of these loops running at any time. I sort of feel like loops are the future at this point. If you haven't experimented with it, highly highly recommend it. And we also just launched routines, which is the same thing but kind of on the server. So, even if you close your laptop, it it keeps going.

**8:50** · So, that's your personal setup. Tell us about what you think teams will look like in the future. How do you extrapolate from all the work you're doing to keep everyone on the team moving forward, understanding the context, or do you think we need to let go of a lot more to agents to make it work?

### Future Teams and Generalists

**9:04** · Um I think so I you know, it's like it's so hard to make predictions, but um I'm here to make predictions, so I'll try to make some. I I I feel like the way that things are going is generally there's going to be a lot more generalists than there are today.

**9:19** · And today when we talk about generalists, I think largely we're talking about people that are still engineers. So, they're still writing code, but maybe they're kind of product engineers. So, maybe when we say generalist, it's like a you know, they do iOS and web and server, for example. That's like a generalist in engineering. But I think the thing that we're going to start to see a lot more of is generalists that are cross-disciplinary.

**9:40** · So, this is engineers that are really good at product engineering, but also really great at design. Or really great at product and data science and engineering. Um I don't know. It's it's something that we're starting to see on our team. So, actually like a lot of people on the Claude code team are generalists across disciplines.

**9:58** · Everyone on our team codes. So, like our engineering manager, our product manager, our designers, our data scientist, our finance guy, our user researcher, every single person on our team writes code. And so, you know, like they're specialist in something, but now also everyone's just coding. And you know, I'm seeing some nods, but I bet also it's actually not that surprising to people in this room cuz I bet you're seeing the same things.

**10:23** · Um \[clears throat\] I'll have one more favorite questions then we'll open up to the audience. So, we talked a bit about what's changing with coding. I'm curious about what you see changing in the world of software or software products.

### SaaS Apocalypse Predictions

**10:34** · Um I think as we see AI making writing code 10 or 100x cheaper, what happens to the value of the products that are produced with software? Do we have a SAS apocalypse on our hands? How do you think this plays out? And again, you're going to have to make another prediction. The SAS apocalypse question is my favorite question then.

**10:51** · Um I think there's two things that are going to happen and I I don't think either of them is the thing that people have been talking about.

**11:01** · I think one is Is anyone here an acquired listener? Like the acquired podcast?

**11:08** · Yeah, it's like the best podcast. Uh I actually I I got to do a unplugged with them the other week and I I just I I felt like I got to like meet my heroes cuz they're they're just like the hosts are the best.

**11:20** · So, they have this idea of uh seven powers and and this is a this is like Hamilton. He kind of wrote he wrote a book about this and this is kind of the seven modes in business. And I think what's going to happen is because of AI, some of these modes are going to get more important and some are going to get less important. And so, like for example, one that gets less important is uh switching costs because you can just use the model and you can kind of port from one thing to a different thing.

**11:41** · Another one that gets less important is process power because for companies whose mode is like workflows and process and things like this, Claude is getting really good at figuring out process. And especially with 4.7, it can just hill climb anything. So, if you give it a target and you tell it to iterate until it's done, it will just do it. I think this is the first model like that.

**12:02** · So, I think these are going to get less important, but I think the previous modes actually still matter. So, this is like network effects, uh scale economies, cornered resources, things like that. These are not really changing with AI.

**12:13** · I think the second thing is if you look at the number of startups today or like maybe in the next you know, the past 10 years, I think the number of startups in the next 10 years that are just going to like disrupt everything is going to increase like 10x.

**12:24** · Because right now you can be a tiny startup, you could build a thing that's as valuable as a large company and you can actually compete head-to-head because the large company has to evolve their business process, they have to evolve the way they work, they have to retrain everyone to use technology, they're going to face a lot of internal resistance to that. But you know, no one here has that problem.

**12:44** · If you're starting fresh, then you can kind of build with AI natively from the ground up. So, I don't know. I I think it's the best time to build. It's the best time to be a startup. It's there's so much disruption coming. So, there is hope for us after all.

**12:56** · Thank you, Boris.

### Audience Q&A Deep Dive

**12:58** · Um I would love to open up to audience questions if anyone has anything they would like to ask.

**13:03** · Dan?

**13:08** · I Yeah, I'm curious.

**13:09** · Um you said that you built uh 6 months before there was product market fit, but now given that the models are good enough, how much do you attribute the success of Claude code to the model versus like product decisions in the the like field of product?

**13:25** · Uh I think it's probably a mix. Yeah, I think it's a mix. I think I think if you asked me maybe a year ago, the ratio was maybe something like 50/50. Um maybe I don't know. If you asked me 6 months ago, the mix would be 50/50.

**13:35** · What about in 2 years?

**13:37** · Oh, 2 year I don't know, dude. We plan in like we plan in 1 week out.

**13:40** · months. Sometime in the future.

**13:41** · \[laughter\] And by the way, I think the reason it was 50/50 is um you know, I I I like I I did YC back in the day. I was like the first hire at a YC company and like I did a bunch of startups. And in startups like the thing that they drill into you and then especially in YC over and over is build something people love.

**13:59** · And so, it it doesn't matter what the product is, it doesn't matter like the model and all this stuff. You still in the end have to build a thing that people love. And I think that's that's why the product matters is we we pay so much attention to the little details so that as you use it all day, it's a really great experience. I think as the model's gotten better, the harness kind of gets less important.

**14:18** · And I I think like I think that we're thinking about right now is like how do we evolve the harness? So, like how do we make loops more of a first class thing? How do we make it easier to run a lot of agents? Uh you know, beside you know, like sub agents is one idea. There's a bunch more stuff that we're cooking.

**14:32** · But I think in a year, the model will be much better aligned. And so, all the safety mechanisms that we have today around uh prompt injection and kind of static verification of commands and uh permission modes, human in the loop, all this kind of stuff is just going to be less important cuz the model will just do the right thing. Um So, yeah, that's that's my prediction.

**14:52** · Thank you.

**14:55** · You want to toss the box, Dan?

**14:57** · \[snorts\] Great.

**15:01** · Um To zoom to zoom out a little bit from software, I think Claude code did a cultural change a few months ago where it democratized like building software. You can see uh shop owners building their own um software for themselves or even uh programming microcontrollers to control the light when someone opens the door.

**15:19** · Um do you see in the future um building software becoming a skill like uh I know uh Microsoft Office? Um so, it's a thing that ev- everybody can do, not just people in the tech industry? Oh my god, yes. Yes. Yes. I I I think it's going to be even more than that. I think it's going to be I don't know. It's going to be a skill like yeah, like I know how to send a text message.

**15:40** · I I I think um you know, like I I read a my my two genres are essentially sci-fi and tech history. This is what I read a lot of. I I think in tech history, there's one thing which I think to me is the clearest parallel for what's happening right now. And this is in the 1400s, the printing press in Europe.

**15:57** · And what what happened was before the printing press, essentially 10% of the European population was literate. They knew how to read and write. They were often employed by like kings and lords that were not literate. And their job was to you know, their their job was to read and write and this is not something that everyone knew how to do.

**16:14** · \[snorts\] The printing press was invented, then there were two more presses and in the 50 years after the first printing press, there was more literature published in Europe than in the thousand years before.

**16:25** · And over the same period, the cost of literature, the cost of a book went down like a 100x. And then, you know, it took a couple hundred years cuz you know, learning to read and write is hard. You need education systems and government and everyone can't be working on farms and so on. But over the next few hundred years, literacy globally went up to like 70%. And so, you know, now we can all read and write and you don't need a a degree in reading and writing to know how to read and write. Although still there are professional writers and that is a thing that you can do.

**16:50** · So, I I think the thing that's about to happen and it's going to be much faster than 50 years is software will be a thing that is fully democratized, that anyone can do. And you know, there's a lot of corollaries to this. So, for example, let's say you're writing accounting software.

**17:06** · The best person to write accounting software, I think maybe even today, is not an engineer, it's a really good accountant because they know the domain really well and coding is the easy part. It's knowing the domain that's the hard part. And I I think this is just obviously the the future.

**17:22** · So, uh one of the things Greg said was that you guys are living in the future a little bit cuz you get to have access to the models and the agents. Claude code was an internal tool before you released it. Um is the gap between where you guys are in engineering and the rest of the world, is that a month? Is it 3 months?

**17:38** · Is it 6 months? And is that is that gap getting bigger or smaller over time?

**17:44** · Yeah, so so internally, we use the same models everyone else does. Um for us, the dog fooding is really really important. So, we use the thing that everyone else here does. Um you know, we use like a little bit of mythos to try it and then we use a lot of Opus 4.7 to to dog food it and to write most of our code.

**17:59** · Um I think on the model side, there isn't really a gap. Um you know, it's like it's pretty much mythos and you know, that will become some version of some descendant of that will become available at some point to everyone.

**18:10** · I think on the product side, there's probably a far larger gap. And that's just related to us changing all of our processes. Like if you talk to people at Anthropic, we use Claude for literally everything. And our Claudes are talking all day like as as I'm coding, as my Claudes are coding in a loop, they will communicate over Slack to talk to other people's Claudes that are also running in a loop to kind of figure out unknowns.

**18:30** · We have no more manually written code anywhere at the company. All of the SQL is written by uh by models. Everything is just built by the models. So, I I I think actually the place that we're ahead is not the technology cuz the same technology available to us is available to everyone here because fundamentally, we are building a platform. And so, for us, it's really important that developers can use the same thing that we're using and that we we dog food everything that we put out there.

**18:54** · But I think there's actually a far bigger weed in kind of the organizational structure and organizational process. And this is a place where you know, hopefully we can talk about it in places like this and uh everyone can kind of learn from it and and also evolve. Yeah, and I think that's one of the advantages startups have. It's so much easier to start there.

**19:10** · Jared?

**19:12** · Yeah, um last time we talked, I think I think you'd mentioned we talked a little bit about multi-agent and it was very in code at the time at a prior Sequoia event and you mentioned that there were some things going down the pipeline and thing you're talking you're thinking about. Now obviously there's slash batch, there's slash loop, there's sub teams, there's teams. Can you speak some to either at the model level and at the harness level, how you're injecting priors in the harness level, how the objective function is changing the model level to kind of make this experience around delegating work, spinning up agents better? Cuz so much of the work is parallelizable.

**19:39** · You can do so many things so much faster and I feel like I have to overlay my own intuition for when to parallelize things rather than the model kind of understanding that you can spin up 10 sub agents for something. Yeah, I mean on on the product side, it really just comes down to prompting.

**19:53** · That's That's how it is. And so, you know, we we tweak prompts to kind of help the model do stuff in parallel more.

**19:59** · But also, honestly, as the model gets better, it just naturally does this. And so, something like loop, I found actually 4.7, it just starts doing. Uh which is really cool. It's like it does something like uh you know, I'll I'll I'll tell it, "Go uh pull this data query." And it's like, "Hey, I noticed that the data is changing over time. I'll start a loop and I'll give you a report every 30 minutes." And I'm like, "Great. Can you send it to me over Slack?" And then it uses the Slack MCP to do that. So, so I think actually over time, it's not on users to figure out how to hold the tools better. And if that's the case, it's actually a product design problem and like I'm not doing a good job.

**20:32** · It's really on the model to do this stuff better and on us kind of prompting it so it naturally does this.

**20:41** · Um so, right now it seems like a lot of us use um like Claude or Codex or these uh tools in the cloud to do a lot of our computing. But then, there are some very vocal advocates of uh having your AI be local. And I could imagine over time as um open way models and other things catch up that this could be more of a possibility for people get really high-quality coding assistance. So, I'm curious your vision of say over the next like years or something like that.

**21:08** · Do you see the trajectory of everyone still really relying on the like cloud centralized compute or uh is there a pivot to oh, we all just have our local agents that we can rely on and they don't get throttled and other benefits?

**21:23** · Yeah, I think it um I don't know. There's maybe a few ways to answer that. I think maybe like kind of the the most fundamental way to answer that is it doesn't matter.

**21:32** · Cuz Cuz I think now we're getting to the point where the model is just able to figure it out. So, I think like by a couple years from now, the model is just going to be doing all the code. It's going to be starting the agents. It's going to be building the environments. And so, like if it decides like actually I'll use like local models to do this, then you know, that's what it'll do.

**21:46** · These I I don't think these will be decisions that we are making as engineers anymore. We have time for a couple more questions, so I can toss this out.

**21:55** · Jamie.

**21:57** · Nester. Thank you.

**21:59** · It feels like one of the great uh decisions with Claude Code was making use of the fact that a lot of developers' tools and workflows are local.

**22:07** · But um that isn't necessarily always the case for sort of general knowledge work with, you know, cloud tools. I'm curious how you're thinking about this with Co-work of how do you give Co-work enough access to the tools that we use to be powerful the same way that Claude Code is for developers?

**22:22** · Yeah, it's That's a really great question. Um I know I know when I was uh when I was at a big company, we took like 5 years moving all the environments to remote. It's just like so much work, especially at a big scale. Um but for knowledge work, largely, it's there already with like Salesforce and Docs and things like that. Um for us, it's always just the simplest answer. It's just MCP.

**22:42** · So, the same MCP connector that you have in Claude AI, you hook up like, you know, Salesforce, you hook up Google Docs, Google Calendar. Uh and then Co-work can use that. Claude CLI can use it. Claude Code everywhere can use it.

**22:55** · And for the for the systems that don't have MCPs, like do you think that's where computer use is going to be a big opportunity?

**23:02** · Yeah, I think computer use is kind of a catchall. Um so, I think currently, for as far as I know, I think Anthropic is like pretty far ahead on computers. And so, like if you use it through Co-work, it's quite good. Um so, it's able to use pretty much any piece of software that you have on your computer. It's very slow, but it does it quite well now, especially with 4.7.

**23:20** · Um Yeah, but I think I think otherwise like MCP is is kind of the answer. It's And you know, all this stuff just doesn't matter that much. It could be MCPs, APIs, just some sort of programmatic access cuz the the model doesn't care. It's to mo- To the model, it's just tokens. All right, we have time for one more question.

### Closing and Whats Next

**23:38** · Um Ryan.

**23:41** · Sean, do you want to toss the Thank you.

**23:45** · Um you've kind of alluded to this, but if like sometime ago you saw the probabil- the product overhang and thought to build a product that would then become more interesting once models got better, could you just talk even in vague terms about the shape of a product you'd build today that you think could becomes a much more interesting as models get better in 6 months to a year?

**24:03** · Yeah, Claude design I I think is a really good example. It's uh it's pretty good today. It's going to get a lot better. Um there's also a few things that we're cooking up for Claude Code uh that are going to be landing over the coming weeks. So, you'll see those. Um and then I think uh I think loop and batch and things like this around like massively parallelizing agents, that's going to get better.

**24:22** · And computer use is another good one. All right, Boris. Thank you so much for joining us. I think we'll be here for a little longer if anyone has questions.

**24:30** · \[applause\] Thanks, guys.