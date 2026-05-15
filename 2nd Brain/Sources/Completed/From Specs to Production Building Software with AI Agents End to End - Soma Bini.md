---
title: "From Specs to Production: Building Software with AI Agents End to End - Soma Bini"
source: "https://www.youtube.com/watch?v=BqzODQ0Qajo"
author:
  - "[[AI Agents Montreal]]"
channel: "AI Agents Montreal"
published: 2026-05-11
created: 2026-05-11
description: "For this online event, we will have the opportunity to receive Soma Bini as a speaker.After a brief introduction of our community, Soma will deep dive on Building Software with AI Agents End to End"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=BqzODQ0Qajo)

For this online event, we will have the opportunity to receive Soma Bini as a speaker.  
  
After a brief introduction of our community, Soma will deep dive on Building Software with AI Agents End to End (From Specs to Production).  
  
Abstract:  
In this talk, Soma will demonstrate how to build a production ready application from scratch using a spec driven approach powered by AI agents. Instead of manually coding every piece, we’ll orchestrate a team of agents that handle design, architecture, implementation, testing, and deployment. Soma will walk through the tools and workflows he uses daily to go from an idea to a fully deployed system with CI CD and cloud infrastructure. The goal is to show how engineers and even non engineers can leverage AI to dramatically increase velocity while maintaining production grade quality.  
  
About Soma:  
Soma is a Technical Leader and Solutions Architect with 10 plus years of experience building scalable systems and startups. He specializes in Golang, cloud architecture, and DevOps, and He focus on taking products from 0 to production with strong engineering standards and automation. ￼

## Transcript

**0:02** · So welcome to the AI morale meetup. Uh today we have you have the amazing opportunity to have S with us uh for his talk um from spec to production building software with AI agent end to end just for the organization. The talk is recorded and uh I will share it on our YouTube channel. Uh feel free to see it again after if you want.

**0:22** · Um if you have some question don't hesitate to ask a question in the chat and we'll try to answer it at the end or along the presentation depend on you some uh sure I mean you can do it along the presentation as well it's okay it's fine don't worry because we have a lot of attendees uh I cut all mic but you I check the the chat and if you have a question I will ask to to someone uh Okay.

**0:54** · So that's it. Uh thanks to be with us again and uh the place is yours.

**1:00** · Sure.

**1:00** · Thank you very much. So uh first of all, hi everyone. Thank you for welcoming me today. Um so my name is S.

**1:08** · Uh I'm a fractional CTO and a software engineer uh based in Dubai. Um I've been working in tech for over um 10 years now. uh most mostly with early stage uh startups and uh helping uh uh small teams uh build and scale uh and scale products. So basically when I when I work with u these type of companies is uh most likely like we will take a product from from zero to one. So we we do everything everything from scratch.

**1:42** · So there are like a a lot of a lot of works to be to be done before the the product uh goes to uh production. So um before um the agentic era um coding used to be a nightmare. I don't I don't know for you guys uh but for me even though I I like to code a lot I I like to code.

**2:06** · I'm a very passionated guy. Passionated guy. Sorry. U but it used to be it used to be a nightmare. So it used to take a lot of time and uh and um a lot of time in progress um and sometimes um we will often hit roadblocks you know and it was also hard to finish a side project or even um working on a on on a startup idea was really complicated. Okay.

**2:31** · Since time to market matters a lot, uh we also had to make tough choices because um when even though you build a you're building a side project, uh you still need to go to go fast because you know that that time to market matters matters a lot.

**2:52** · So most people ended up uh launching something lightweight and and and buggy and um we often had to sacrifice uh code quality. uh at first just to build something that that worked and uh uh we used to uh we used to call

**3:12** · it uh the the first uh the first version the the MVP call it whatever you want but the truth is from engineers to engineers uh is uh the truth is is that it's a version that we just only wants to um to work for for a customer. So

**3:31** · now thanks to the the the new the new era that we we just uh jumped in uh we we now have uh multiple u I mean different ways of um different ways of of building that we uh we all have heard of these two uh most people start with uh vibe coding.

**3:53** · So you just for example open cursor or another uh vibe vibe coding tool like rep or something else and you just uh type in I don't know build me build build me x y z whatever and then you react to whatever comes out and um I mean it's fast for prototypes

**4:17** · um but it it is terrible for anything that you have to maintain because you know like Six weeks later, nobody knows why anything works um the way it does. And this is when spec driven development um flips the script, you know, because now you are in control. So you define the what uh before you let the AI teaches the how. um the spec is the source of truth and the the AI the LM

**4:50** · implements to the spec and not around it you know so decisions are traceable um quality is structural not uh aspirational you know um the the line I keep coming back to is um vibe coding is like improvisation you know and spec driven development is like jazz with a with a with a chart and then you you you you know what you're actually uh actually doing and you still have freedom but everyone knows the key what needs to be um what needs to be done.

**5:24** · Okay.

**5:26** · In addition, I'm totally agree with you.

**5:29** · VIP coding is increased drastically the prototype uh steps but uh for specd driven uh just a little disclaimer uh maybe you you will confirm it's not about waterfall because maybe the spec road is ambiguous but spec driven uh we have a feedback loop also in this kind of of way and it's it's different than waterfall who who you define all spec at the beginning and you you have a tunel effect after six months for example.

**6:02** · Yeah.

**6:03** · No yeah yeah true true. Now I will say that I will add that um spec driven development is most likely um whatever you want to build at that I mean it doesn't remove your your flexibility right it just means that whatever you want to build at that time at a given time you will first write the spec just like um you know when you work with a product owner and he he just assigned you a a Jira ticket if he's a very wellkilled product owner he will uh give

**6:35** · you the definition of done the context the user stories and everything. So this is what I will call spec. Uh and then from from from from there you can then also define the the technical spec before you start working on it. And so that when implementing the spec you do not think on the the biggest task but you just like you can just refine what's needed to be refined. So like small refinement and stuff but not the bigger picture.

**7:07** · Yeah. Exactly. It's just an opportunity to discuss and uh have a feedback on on the feature. Right.

**7:13** · Exactly.

**7:13** · So, um today I I was thinking a lot about how will I demonstrate this and everything because the the headlines is really catchy, you know. So I was I was thinking okay so what other best example can I give than something that I've really um really built and uh and ship into a production.

**7:37** · Uh so I before before that I I will give you guys a couple of uh I mean a little bit of of context. Um I was you know I see like a lot of people saying that agentic coding is only good for uh vibe coded projects

**7:58** · and uh that you can't ship a production grade product with it you know and um back in the day I worked for uh a company that uh handled a lot of uh data processing and relied heavily on eventdriven architecture and it has to to send a lot of notifications based on based on those um on those events and we kept running into the same issue related to what we call inverted index queries

**8:29** · um and that's why I decided to to build streamflow and I will explain to you what is um sorry what is um what is streamflow and uh when when building streamflow I gave myself one rule and it's simple I wasn't allowed to write a single line of code and I love challenges.

**8:56** · So that was my my only rule any type of code or any type of refinement or anything else. Okay. So I will give you uh more uh more details in the next uh uh in next slide. Oops. Sorry.

**9:17** · Yes. So, um what is what is streamflow?

**9:23** · I'll give you a concrete example. Um imagine that you have a marketplace.

**9:29** · Here in Dubai, we have a what we call the dubis and uh I think in France they have lubon. I don't know what you what you have in Canada. Maybe Craigslist or something like this now, isn't it?

**9:42** · I know we have an equivalent of Lubuan, but I don't remember the name. you have something similar, right?

**9:47** · Yeah.

**9:48** · But yes, let's let let's say we we have a marketplace, okay? And in in that marketplace, we have a millions of uh of users in that in that marketplace and um let's say that someone um says all right whenever there is a Mercedes uh under 50K in Moral uh I would like to be notified.

**10:14** · So here here we have uh something really interesting because it might look simple like like if when I'm saying when I'm saying it like this but it's more complex than you might think. The first thing that we see here is that we have filters. I give you two filters. I said Mercedes uh three filters sorry Mercedes under 50K and located in Moral.

**10:41** · So, it's simple if your platform only has, I don't know, 10 users or even hundreds of users. But when when you have a full marketplace with millions of users, the chances that people have the same the exact same um uh filters or partial filters increases uh increases a lot. So, which means that the the filters that I have, I might not be the only one.

**11:12** · We might have 10,000 other users with the same filters or partial filters. So, now here come the the real questions. And it's kind of like it could be a uh an interview uh a technical interview type questions and I will ask you okay how would you deliver a notification when as an admin I add this car uh that matches all these users. How will you um send the notification to all these users?

**11:46** · So how will you do the the the fun out and the my main problems comes from there. So hold on we will uh maybe we will go to this to this slide that will explain it better.

**12:02** · So to solve this issue currently and I know a lot of my friends, colleagues and and and other people on on LinkedIn um many developers rely on the wrong approach such as using loops in in their code you know like um they will for example make a huge queries uh to the database and try to pageionate it and uh you know and try to do some you know complex things overengineering things and and not even reliable.

**12:34** · Um because for example if you have a loops in your in your code um what will you do if the server restarts midprocess or what will happen if an error occurs mid-process and let's say you had you had to notify 10,000 users and then you have a problems at the at half the process at 5,000 users.

**12:54** · So you you you will need a way a mechanism um to make sure that you you are able to come back to where you left off and and so on and so on and so it's a tolerance pattern for example kind of you know so but you know most people they will use you you I mean you need a real infrastructure to solve this like um a caching strategy like radius a Q you can also use radius as a as a popsup queue as well but main thing is you need

**13:27** · a real infrastructure which is not what indie hacker developers that used to build side projects and everything's um have you know uh in in their hands at the uh at the beginning um so I decided to build this project with with code and another tool uh which

**13:48** · is um spec kit and people the first question people asked me was But Claude already has a plan mode when I was speaking with my um my uh previous uh CTO before. So I I used to work with him uh for yeah all my you know my early early years. So we worked together for at le I think three or five years and when I jumped into this this agentic coding stuff and I I I spoke to him about um uh um spec kit he was like but Claude already has a plan mode.

**14:21** · So I I uh I don't I don't need this uh you know it was like cursor has it you know so why why do I need anything more because plan mode is great for single session single task work um like refac refactor this function at this end point uh you know and everything but it has fundamental limits um when you're building a real product you know it doesn't has it doesn't have no persistence.

**14:53** · If you open a new chat tomorrow, um the the plan is gone. Uh it doesn't have um a constitutional grounding. You know, the AI doesn't know uh what are your your project principle, you need to rem remind him and so on, you know, no separation of concerns. It's so therefore it can mixes the the what the how and the and the and the do it now, you know. So that's the thing.

**15:20** · So this is why today I wanted to uh introduce specit which is a tool the exact tool in my opinion that um agents uh needed you know um for for for for many reasons.

**15:39** · Um, SpecKit is an open-source um toolkit from Microsoft, okay, that gives you structured repeatable workflow for um building uh AI agents and the world philosophy is you know that AI is great. Remember AI is great at um how but bad at what. So the thing with with specit is to make uh the what explicit and um durable.

**16:06** · So spec kit forces a fivestep um pipeline you know so you have the constitution the spec the plan the task and then at the end of course the the um the implementation. So we will deep dive in uh in every uh in every step of the uh of the pipeline but basically to give you a a a rough idea is that constitution is your project um non-negotiate non-negotiable principles.

**16:42** · Uh spec is what you're building you know from the the user perspective. Plan is how you will build it. Uh so basically it's your uh technical stack. uh task is the work uh broken down and ordered and implement is uh the actual uh coding you know uh so it will be one task at a time against the plan.

**17:04** · So each step will um uh each step is very important because it's it's what we would build a document sorry that we will use at the end with um the sorry the the AI agent

**17:22** · I have a little question but maybe we'll try answer later but uh the previous meetup was about be made and a little part of open spec and spec kit and the the we are I have a question about the overlap when we we have two specification and the the second overlap the the first uh do you have an order in order to apply the the the specification Maybe you have the answer about that.

**17:54** · Um when talking about specification like are you talking about a specific user stories?

**18:01** · Yeah.

**18:01** · For example, if you have a one user story and the second overlap or uh is dependent on the the order of the the stories. I need to to see this issue if you have the answer. I um I mean the thing is with spec kit um every time you define a spec it will create a new branch for you which means you will be in a specific branch uh I will try to share uh my my my code base and and the branch that you will uh you will see it.

**18:32** · Oh hold on maybe uh okay sure so so you have one branch per per exactly uh hold on I will try to bring my screen up there. So he he will try to resolve the conflict during the match.

**18:48** · Okay.

**18:49** · It's not it's not really I mean you you cannot really have uh have conflict uh because hold on you should see it here.

**19:00** · Uh we have some question in the chat. Uh do you want to answer now?

**19:07** · Sure.

**19:08** · Okay. Uh one question from Jerome. Can you restate what the task step is?

**19:15** · Yeah, the task the task steps is uh the work being uh broken down in small a single small task for for agent and I will I will share it with you just right now so that you will uh you will understand directly. Can you are you able to see my uh my screen?

**19:32** · Yes.

**19:32** · So what I was saying is that you know when you have a spec uh you know you will have it will spec kit will generate this folder because this will this will contain your spec and in one spec you have so many things.

**19:49** · So um you have the requirements uh the d the data model um the research because AI is making research for you uh you have all the agents working for you you know trying to solve uh u to solve the problems that you you have mentioned in your spec and uh it's also I don't know if you can see when I click on here I think you cannot see but basically um every spec is in uh one one branch You see that's why uh I have um uh sorry I

**20:24** · will have one one branch per perpet so it will be like this. This is why I I um this why Nicholas I don't know if it's answered your your your question because I think that if two spec overlaps then you will have it you will have it there but then what you can do to um to fix it is to use um either a technical project manager AI agent or uh a tech lead uh AI agent to solve it but I will speak about it in the in in the next slide.

**20:59** · Uh hold on. I will come back to this.

**21:08** · There you go. Uh can you see my screen?

**21:12** · Yeah.

**21:13** · Okay.

**21:13** · So, one question that you you you you might ask yourself is uh how the the pipeline actually uh actually flows. Um the flow is not strictly uh linear you know um the main thing is that you

**21:32** · iterate at each stage but every downstream you know artifact regenerates from the upstream one and that was all the the markdown files that I just showed you previously uh when I was sharing my sorry my um my my IDE you know so when you change the spec it means the plan with updates. You change the plan, the task regenerate.

**21:55** · Um this is actually this is what gives you trustability that you know what you're what you're doing you know and most important thing is every line of code um traces back to a task you know and every task to a section of the plan every section of the plan to a requirement in the spec.

**22:16** · So every requirement to a principle in the in the constitution and we will speak about the constitution because it's one of the most important uh documents that you you you must use with your your AI coding agent and uh

**22:32** · that's what I was saying that that that tracibility is exactly what's missing in vibe coding because in v coding you don't trace things you just you just speak and then you you go with the flow okay and uh and that's and it's the thing that lets you maintain this kind of system over the time you know and without uh bottlenecks.

**22:55** · So ju just for the spec steps maybe you build your product in solo but do you have some uh uh meeting with the business in order to co-build this this uh step or not?

**23:11** · Um since I'm a you know I'm a solo yeah dev engineer you know um you know people use uh many words for that I'll say that when I was when I used spake kit when I was working with there was like this other fintech startup that needed to build a an API they it was a bit more

**23:34** · complex because they already uh had their Jira tickets you know so It was I had to tweak it a little bit because you know in spec kit you have two you have you have two way of of doing it. It's either you start from scratch which is more easier because you can uh you know configure everything from scratch or you start from a document an audio uh something external from you know from you and that what that what happened with me.

**24:02** · So what I did is that I grabbed the Jira tickets and I used it as a uh as a spec and I I I did the the the wall flow but for that specific Jira ticket because remember one spec is just one user story.

**24:24** · Yeah.

**24:24** · But maybe you can uh enrich the the the J ticket or the task with example mapping uh in order to have some data or example in your specification app, right?

**24:38** · Yes, of course. If you if you I mean you said if the for example the product team just enrich the the Jira ticket and then you need to update your spec you can you can still redo it with u with spec kit because it has many um predefined commands that comes into your into for example code cloud CLI and you will be able to refine your own spec and it then it will regenerate the the the the spec the task and everything but not the constitution.

**25:07** · This is this Yeah, because the constitution, you know, um as I I mean I was about to explain you the the constitution, but as you can see here, we'll we'll talk about the spec right after it. I promise.

**25:21** · Yeah.

**25:23** · Just um little preision maybe you you told us uh nonexplicitly, but uh spec kit is for Greenfield and Brunfield project, right?

**25:36** · What do you mean by Greenfield?

**25:37** · Brunfield is existing project. Maybe you start from a legacy and Greenfield it's from scratch. Yeah.

**25:43** · Yeah. Yeah.

**25:45** · For both. And and I just saw a question popped up in the bottom of my of my screen. Someone was asking about the the tokens.

**25:55** · Yeah.

**25:55** · Uh yeah. So of course every everything's comes with a pros and cons. And I will not I'm not going to lie on this one.

**26:05** · This one is like it use it uses a lot of tokens to be to to be honest. But um for me I used I used both when I was working on it. I use codeex to try with it because Pekkit is compatible with almost every uh coding agent out there. It's compatible with Quen um Codeex code and everything.

**26:26** · Uh, for me, I was I was using uh I was using Clo and I was on the uh the $200 um subscription and I barely hit the the limits even though I was using all my agents, you know, when I was doing this, I really wanted the the the best quality.

**26:46** · So to be honest uh back in the day I was like okay all my agent will use um code opus uh 4.5 because I started with 4.5 then when they upgraded to 4.6 I changed all my agents that said okay everybody will use 4 4.6 six. It's okay. I have the $200 subscription, so I will be good. And honestly, I didn't hit the limit. I hit the limit only what one one time.

**27:17** · Yeah.

**27:17** · So, but it uses a lot of tokens. So, if you do it if you do it with a $100 subscription, if your question is I mean, if your question is about this topic, yes, with a $100 subscription, it might be a problem if you do it with code, not with Codex. With Codex, you can use, you know, $100 subscription and then you still be able to to to code um all along the way without hitting the limit. Um yeah. So, regarding the the the constitution, what is the constitution?

**27:48** · This is the most important document for your agent. Okay. The the constitution is a short, durable document that captures the principle. Um, every agent must respect. You know, sometimes you you speak with uh with the agent, you speak with Clo or Codex and sometimes he he just decide to bypass your uh uh your requirement with with spec kit. It will reduce this behavior.

**28:19** · Uh at least it will try to reduce the this this behavior. So um it's not really a a style guide but it's the rules that don't change between features. Okay. So for example in your constitution you will say that okay all endpoints must be authenticated by default. Um database uh database rights sorry should go through the a repository layer.

**28:45** · Um for example you can decide that you will you you want 80 80% uh test coverage at the minimum and everything like this you know so all these uh all these rules uh must not be uh violated uh by by the uh otherwise um the of the code. Okay.

**29:17** · And after that if we have time I'll show you a sample of my constitution document uh that contains a lot of things about uh solid principle about uh hexagonal architecture, clean architecture, all those type of stuff that the AI agents must respect. So here is the spec uh the one I think uh Nicholas that you were the most interested into. Yeah.

**29:42** · Um and then I I'll I'll explain um what is it concretely. So as I said the spec um answers the what right what we are doing never the how not how we will do it but just what we are doing. Okay. So it's written from the the users uh perspective. Okay. And every spec has a user story acceptance uh criteria concrete.

**30:12** · It must be concrete and testable uh should be explicit, you know, like uh and even I mean when you when you're reading a spec, you should be aware of what we know and what we don't know. Which means that everything that is out out of scope should be explicitly um uh listed and there you know like a list of items that we know that we will not u answer in this spec

**30:38** · um to not overlap on the other spec you know so normally if it's done the right way we should be able to um uh avoid that. Okay. Um and and uh the specs need to be agnostic to technology, right?

**30:56** · Yeah. Agnostic.

**30:58** · Yeah. You only use a business perspective. Yeah.

**31:02** · Only business uh business perspective user stories only. We do not talk about the technical stack in here. At this stage we we do not tell the uh the AI okay I want to use MongoDB or posgress or I want to use we we do not talk about technology here is only let's say this is the part for the product team itself okay um and now here is where we will

**31:32** · define um the the technical the technical stack because the plan is actually um the how it answers the how we will we will do it. So basically it's the this is the text tag. So this is where you know uh as a software uh uh

**31:51** · for example as a software architect um this is where you will decide okay we will use uh MongoDB and uh and not posgress and maybe for the the backend programming language we will use Golang and not NodeJS. Okay. Um you in here you will also decide the data models um the API contracts the the um the tradeoff.

**32:17** · Now all everything that that uh is about the technical stack will be um defined in this uh section and in this step of uh of spec kit. Okay.

**32:31** · Do do you come with decisions or you can iterate and uh uh maybe if you don't know the advantage of posgress you can iterate with cloud for example or you come with decision and you tell uh use MongoDB you know cloud will ask you question along the way when you when you start typing backslash because you when installing spec kit you it will it comes out with predefined uh CLI commands uh along the way.

**33:03** · So and with included in these commands you have the back slash plan and then when you do back slash plan and then you start typing your plan. Actually I don't type my plan I generate I generate a plan uh in a markdown file format with clothes pre uh previously you know so that my plan is as light and clean as possible.

**33:28** · So normally in my plan there is no uh let's say uh there is there is no inter interrogations after reading my uh reading my plan but sometimes you can code might ask you okay you want to do this but do you want to do it with option A or do you want to do it with option B and even though you still don't uh don't have the answer right now you can come back later on it and hit the backslash clarify and it

**33:57** · will tell you everything that you need to clarify and that wasn't clear enough for him which is great because it will say okay user said we should use this tool but he didn't he didn't mention how we should uh use it and so that you can go into a refinement session with code and uh and fixes it before before diving into the four steps which is crucial and uh and I will uh show it to you because it's the it's the plan step because in in In the plan step we will have um like

**34:32** · all the task uh uh generated oops sorry in the task step sorry we will have all the uh all the task generated based on the plan. So in here what people doesn't know because it's not uh it's not something that spec kit mentioned in their in their readme but but once you have the list of of task you can use an AI agent um to reorder the task uh based

**35:02** · on priority um you can you can use another um agent to make sure that nothing is missing.

**35:09** · Usually I love to do I love to do it with codex because um open AI models are very great at reasoning. So this is why I love to do this part with an open AI models. Um it depends on which tool you you're using. For example, I used to work with code but I tried Druid. I don't know if you if some of you guys are are familiar with it, but with Druid, you can change the models, you know, at any at at any time.

**35:38** · So, for this specific task of re reordering task, making sure that nothing is missing and everything, I mostly use uh OpenAI uh models. And then uh another

**35:55** · important step that is not mentioned in inspect kit and that's why uh it's great that uh that that you guys are are here in this uh in this meet up because this is some some trick and tips that I I've learned along the way is that every task that will be generated you will you you should assign a dedicated sub agent to it.

**36:18** · Okay.

**36:18** · For example, if uh I don't know task one uh is about the the database, you should assign it to the to the database engineer and I will and I will explain I will explain this uh after in the in the sorry in the in two in two slides and I will explain to you uh the fact that we will do a recruitment process before starting to implement uh the code because physically we are one

**36:51** · but I will say digitally we are a full team of of engineer communicating between between each others um so yeah so and fire you can fire yeah you can fire people fire I remember sometimes uh when my coding agent like my backend engineer was going Um I had to be very rude with him to make sure that he will not do the repeat the same mistake.

**37:23** · So uh I remember that I use um Chad GPT to write a prompt to make sure that my cloud code agent will not repeat the same uh um the same mistake. And I was really surprised because in his prompt Chad GPT wrote code like your life depends on it and someone knows where you live. And I was and I was really in shock because I found it really violent and it was from Chad deputity actually. It wasn't it wasn't from me. Uh but the truth is it worked perfectly you know.

**37:55** · So you know I don't know why. Um but yeah the the last step is the implementation. And when you reach this step, you can say, "Okay, I I' I've made it because this is a great progress."

**38:14** · Now that you reach this step, you can almost, and I said almost, not you can almost leave your project in autopilot because from now on, you will just um you will just hit the backslash um implement and the number of the of the task.

**38:33** · For example, back slashimplement task 001. you will press enter and then from that um spec kit will use its framework to inject into the the AI superen context um the spec of the uh of this task the constitution remember the constitution so what it should do and what it should it shouldn't do and everything and every remember every task is broken into a single uh small small task because agents are great are at doing one thing.

**39:08** · So when they start doing two things or three things, you know, they can decide to to do what whatever um what whatever they uh whatever they want. Okay. And one thing that is really important here but we will come back to it later is when a task is marked as uh as done by uh by the agent.

**39:27** · What I do in my project is that I have enforced a critical chain review and then in that critical chain review I have mentioned that whatever task you have done today before you mark it as done you need it need to you need to give this task to be reviewed by any I mean all the relevant sub aents.

**39:48** · So for example, if it was a task about data uh the database, then the database engineer uh should review it, then the software architect should review it, the the the security uh reviewer should review it to make sure that the task has been done correctly and then we have a three-stage is either it pass, it's rejected or it's pending approval because something is missing and and must be corrected.

**40:18** · Okay.

**40:18** · Do you have some harness? Because when you delegate a task to a sub agent, you need to have all right, you know, because you you don't want to validate everything. So, uh I think when you delegate to a sub aent in this way, uh it's not like a baby step, you know, it's like you you delegate the world the world task. Yeah. With the full right.

**40:46** · Yeah.

**40:46** · Yeah.

**40:47** · The Yeah. the the wall task. He he's responsible for the entire task.

**40:52** · Yeah. Okay.

**40:54** · Um and yes, so here it is. So um I remember there was there was one podcast I was talking about having 20 agents working uh for me in uh in my MacBook. And uh those are the the the agents I was uh uh talking about.

**41:14** · Um and there is a reason why we want to create an an an agent team you know uh because you know a single generalist AI uh assistant you know has fundamental limitation it tries to do everything you know for example if you decide to to work with spec kit without having a sub agent it's fine but you know you will have one single generalist AI assistant you know and at the end of the day it ends doing nothing um exception exceptionally well.

**41:47** · So um the key to to this is to hire a real engineering team like you will do in a real life. Um so this is why for some of my production grade projects I run up to

**42:08** · 10 specialist uh agents you know and each of them they have a focused system prompt a specific tool set clear responsibilities um clear review duties and this is what makes it possible without this I'm not sure that I will achieve give the same um code quality. Okay.

**42:31** · Um so here is the the full team. So in in in my team I have a tech lead uh and we will we will come back to their role right after it.

**42:50** · So we have a tech lead, um a software architect, an API designer, database engineer, backend engineer, a QA engineer, a code uh code quality guardian, a code security re reviewer, a project manager, and my favorite one is the the DevOps because the the I have like the DevOps uh AI agent that I have built.

**43:15** · I'm using it for all my project and he is actually the one managing my Kubernetes cluster or CD instance, GitLab instance and everything. This is just crazy and and and amazing. Um, so yeah, so this is my this is my team. So whenever I speak with a client, he speak with one people, you know, one person physically, but at the end of the day, we are 10 people behind uh doing doing the the work.

**43:44** · And what's funny is that sometimes these AI agents they decide to speak to each other by themsel. So, so for example, if the the backend engineer is doing something and then he he just want to mark the task as done then the

**44:04** · API designer will review his uh his task and then we'll say hey uh something is wrong you know and if they disagree with for example they disagree on the task they might call the tech lead and say hey we have two approach to this so back engineer want to do this API designer want to do this what is the best what is the best thing to do and then the tech lead is the the shot caller.

**44:28** · So this is uh this is really funny and the first time it happened to me uh my wife called me crazy because I was going crazy behind my laptop I was like no this not this must not be real. And I think we have a relevant question about that. It's how often and when you are involved in the reviewing process when task are in progress.

**44:57** · How say that again? Sorry.

**44:59** · How how often and when are you involved in the reviewing process when task are in progress?

**45:07** · Me or the AI agents?

**45:09** · Uh you I think yeah me. So when they when they mark uh a task as done um they usually write into a backlogs and I will I will show it to you after um but in in all my project I have a backlog folder when uh AI agent hold on I'll show it to you right now. So where AI agents uh write what they did. So it's timestamped.

**45:43** · So for example, let's Yeah. So let's take this one uh like this and you know in this one when they mark a task as done they will explain everything they they they they have done and everything happened everything that happened uh and also the the agent reviews. So they said for example for this task okay you see the tech lead he approved option A as I as I said earlier you know.

**46:08** · So the tech lead said okay you should go with option A and the technical project manager approved it then every uh agent approved it and then when they they finish a task I know exactly what they have done and how they did it because they will explain they will explain it here in the backlog. So the backlog is like uh where I know what was done uh for each day and at what time so that I can review their work.

**46:39** · Yeah, it's it's always associated to a commit uh with the works done or it's a separate commit for the backlog. If you look at the your history for example for this one uh you want to you will see this backlog and the entire file change in one commit right some I think we have some lag Okay.

**47:14** · Uhoh.

**47:30** · Sorry. I think some have some lag.

**47:45** · to reboot.

**47:46** · Agents took over his computer.

**47:51** · The agents say he's talking and they were like, "It's time for you to reboot."

**47:57** · I'm kidding.

**47:58** · But for our attendees uh in to to wait I think it's a a different approach from uh AI assisted development uh in this way it's agentic coding and you delegate everything to an sub aent and it's a completely different way of working um I will try to reach I think yes. Hold this on a second. Okay, let's try to reconnect.

**48:37** · connect uh some like since the beginning but sorry for for the waiting uh yes summer are you yeah sorry I think the connection Yeah.

**49:08** · Is it on my side or I think it's it's on your side. Uh because since the beginning we have little lag but may maybe when you you try to share your screen you have big lag.

**49:20** · Uhhuh. Okay.

**49:21** · Now it's okay. Uh maybe you can remove your camera uh in order to say save some uh I I had a VPN activated so that's why.

**49:31** · Okay. So, uh, normally the connection should be way more better right now. Yes, here it is.

**49:39** · We we joke about the technical agent disconnect you from the meeting.

**49:46** · He said, "Hold on, hold on. You're saying too much.

**49:49** · You can't share this."

**49:50** · But yeah, to but to answer your question, basically, you see this task here. So the T 334 um this task when this task is done then um it will basically the agent will write in the in the backlog. So it's not associated with a commit but it's associated with a with a task. So when a task is done, boom, he will then write in the backlog. He will say, "All right, this is what you see.

**50:21** · I've done task 204 to task 209." And then this is what I've done blah blah blah blah blah blah blah blah blah. Here is the agent reviews blah blah blah blah blah blah blah and everything. And what is great with the backlog as well is that it also uh tell tells you what went wrong when these agents were working together.

**50:46** · Well, that's that's the that's the be that's that's the this is the beauty of it. Um I will come back to it.

**50:55** · So yeah. So here we have the responsibilities and the scope of uh uh of every uh every agent. So basically the the tech lead you know owns the the technical direction conflict resolution and everything and make sure that the the the constitution is respected the software architect uh just like a just like a real team in the in the real life you know the software architect is there uh to make sure that um for example we said okay we would like to to build this

**51:28** · project following the clean architecture principle is there to make sure that uh we have no breaking pattern or something uh something like this. API designer uh is there um to uh handle and manage the API contracts and so on. Um so the code quality guardians is there to make sure that um so the naming conventions the structure of the code and everything is respected.

**51:52** · Then the security reviewer is uh one of the most important one because he's his his job is also is also there to make sure that um you don't have any security breach in in your code and then he's there to make sure that the life of hackers is uh really uh difficult. Okay.

**52:15** · And but it don't come with spec right you you build by your own or you get all sub agent on a on a website or um so that's this is a great question so actually this is the thing that used to take me the the the most uh of my uh of my time because I need when I do the the during the recruitment phase um I need to configure every single agent to make

**52:45** · sure that they will respect what I want, you know, and and another thing that you can do is also give them skills. Uh so you make sure that they will do things the way you want, you know. Um and then you have the project the the technical project manager and usually this is the one I use to reorder task. You remember earlier I was speaking about reordering task and everything.

**53:08** · And then my favorite one of course the devops that is there for uh to deploy the app at uh at the end of the day and uh as I said every uh as I said earlier so I I attribute a task uh to uh to an agent you know so before this is how is oh oops oops oops oops no come back yeah

**53:34** · okay spoil everything which is great uh So it doesn't want to okay hold on come back to it. So here um on the left when specit will generate the task it will be like this but after

**53:57** · attributing uh every task to a uh to a single agent or multiple agent if you want it will be it will be like like what you have on the what you have on the right and what is great is that using this it it allow code or or codex or any other um LLM uh architecture if they have parallelism in uh in their features it will allow you to use it for free.

**54:25** · So for example when specit give you a task if this task is uh if you can do this task in in a parallelism it will have a p between brackets so you know that all the task with a p they can be done simultaneously you don't have to do it sequentially so you you gain time you

**54:45** · know and especially with the cloud code new feature about g working tree or g work trail I don't know how they they they call It it allows it allows agent to create a work trees and then work in parallel with the other agent touching the same codebase and without conflicts.

**55:05** · And you can't have a task without attribution or of course you can you can you can but in my workflow the way I use spec kit you know specit doesn't come with everything that I've that I've showed you um today most of the things I've uh showed you today they must be done by you. So those are the tips because I've been using spec kits for nearly eight months now.

**55:30** · Uh most of these tips I've learned them along the way. People are not using spec kit the way I do. So even when I I I watch YouTube and I see famous influencers talking about specd driven development, I used to laugh a lot because they only talk about the plan mode and everything when you can do something very very very detailed with spec kit. This is the masterpiece for for AI agent to be honest.

**55:57** · Okay. Um so yeah and then I spoke earlier uh about the the backlogs which is the team's daily log book. So usually um we you know in in the real life we have um daily daily meetings right we have daily meetings and we said okay so yesterday I work on that and I've done that. I hit the roadblocks but then I I called Mark and then Mark helped me and blah blah blah. This is what the backlogs is about.

**56:22** · So I remember some someone on LinkedIn on on one of my post asked me okay what about you why don't you just uh use git history and I was like okay this is a great question but it's not enough for me because when you hit clothes in the code command in your folder it automatically scan the backlogs and he knows but it doesn't automatically uh load the the the g history and blah blah blah.

**56:51** · So this is why I use the backlog and also for me it allows me to to review how the work was done and what was done uh more easier.

**57:02** · Just you you talk about uh the branches and uh do you use a squash or you should use uh you you don't should use squash because you need to see every step done by the sub aent and if you squash uh this substep are remove you know. Yeah. Um I don't I don't squash them.

**57:26** · Yeah.

**57:27** · Yeah. So that's why in uh if if I share my my GitLab then you will see a lot of small commits sometimes, right?

**57:36** · I I do not I do not squash them. Maybe we we could I mean this is something that uh we could improve. Uh I don't know how um spec kit wants to to to handle this. Um, but yes, this is a this is a great question. Uh, hold on. Because Okay. Yes. No, do not spoil. Why? Why? Why? I don't know why my presentation is is acting crazy right now. Hold on.

**58:06** · You you can continue uh uh 30 minutes. Uh but maybe some attendees need to leave. But uh I'm okay to continue.

**58:15** · Right.

**58:16** · Sure.

**58:16** · Sure. Sure. Um most of the most of the things has been uh has been said. Um I think that uh I think hold on let me check something just to see if okay uh let me check if I didn't forget about anything.

**58:36** · So yes, no and this yes the the the most important thing is um the results uh which is the metrics from from from this journey the main metrics uh uh I have to to to tell people about is my time saved. So using agentic coding helped me save 90 92% of my time which is absolutely crazy.

**59:02** · That means that what I used to do in one month, I was doing it in two days or even one day or half a day. Um, that's the the most important metrics and then yes, I'm uh I'm done and I'm listening to to questions if there are some.

**59:21** · I have several question just about the cost. Uh do you have because I know that GitHub copiot uh yesterday changed your models to subscription to API usage and for for your your project you have only uh monthly subscription right the for

**59:41** · example or um for cloud yeah you only have uh I mean for cloud you you can use you can use both you can you can use a subscription based or you can you can it can be also API based But with Droid I mean and on cloud also you can you can use your extra usage but on Droid on using Droid what what is uh interesting is that you do not have weekly uh session limit you know.

**1:00:10** · Yeah you can just use it as as much as you want until you have used your wall credits.

**1:00:17** · I I I ate weekly.

**1:00:21** · Yeah.

**1:00:21** · So this is this is this is why uh we have a question from Leila. So there is no human in the loop to appro commit in this approach. How do you manage when the agent makes a mistake?

**1:00:36** · Oh sorry okay I I for I forgot something. Sorry and now it comes to my mind. I forgot the uh the test the the the test and guard rails uh section. I'm really sorry because since you said some people needs to to leave then it just popped out of my of my mind because I wanted I was trying to end it up uh end this quickly. So yes there is a human in the loop.

**1:01:02** · Actually there is even more than that because for for every single features you will have unit test integration test end to end uh end to end test code coverage to make sure that everything is uh is tested and during the end the end to end test is my ultimate word rails.

**1:01:23** · Why? because in the end to end test phase uh I do not allow uh mock uh except for third party services like stripe or something like this. So actually uh there is uh uh the human in the loop uh uh step because I will tell the AI to generate a postman collection and then with the postman collection I will then tell him to use newman. I don't know if you heard of it newman.

**1:01:51** · So yeah, so to use new man and make sure that everything passes and sometimes um I have to check it myself using using Postman to make sure that um this API calls really works but with these two uh with Postman and Newman you're already able to catch almost 80 to 90% of the bugs. It's the ultimate guard rails and actually on GitLab this is the job that that take the the most time on my pipeline.

**1:02:23** · Yeah, but but you need the data. I use new man just for for attendees. Postman is just to to try your API and you need to have some data sets and you can add some expected result and the new man it just a tool to execute it take two arguments the collection and an environment files because you need to replace some environment variables and it's a a way to test your API and make non aggression test at the end to end pace.

**1:02:54** · Yeah, exactly. Uh just I have a question about uh I I like the difference between AI assisted coding and agent coding. uh your presentation it's more about agent coding because you delegate uh the entire task to a sub agent but how uh how you deal uh with pull request uh to

**1:03:17** · to not be be overwhelmed by big batches of something like that because in AI acidic coding uh you you navigate in a baby step and a little pure uh but we in your way of working I think sometimes you can have a big batches and uh true.

**1:03:36** · Yeah.

**1:03:37** · True. especially and this is what I think that spec kit could do better because when you define a spec like the initial the initial spec when you start specit from scratch the initial spec has a lot of a lot of task and uh and and and contain a lot of a lot of specs you know which is which which gives you a huge first merge request or of or pull request depending on the platform where where where you're at.

**1:04:04** · Um so usually for this I use codeex uh openai uh openai models to review uh this uh this uh pull request u because it allows me to scan everything and make sure that everything um is in order and is all right and along with the the end to end test because in in the pipeline um if hold on so but you a technical background, right?

**1:04:37** · Because you have a technical background. Yeah, of course. Of course, of course. Uh everything I said is not is not possible without uh a technical background. Uh to be honest, uh what it's like a nontechnical user cannot build it the way uh I have done it, you know.

**1:04:54** · Yeah.

**1:04:54** · But it's just to highlight for attendees that it's the main difference between vibe coding who non techchnical user can provide uh generate some prototype quickly and this way of working uh when you deal uh with all subentations at the end you need to review the pull request and you need to understand what the agent uh uh is doing. Yeah.

**1:05:20** · Right.

**1:05:20** · Yeah.

**1:05:20** · So this is why um this is why in here whenever we have a code changes I have a very strong pipeline especially for the main branch. Uh in here you see you have uh a release uh release like you have many multiple release jobs that make sure that nothing is uh is broken and that pipeline the the entire pipeline that you see here is maintained by my DevOps agents from end to end.

**1:05:50** · So I review the code with uh with OpenAI and Codex and then I also use this pipeline to make sure that I have no regression here. You see just just for the new man uh do you use for external API sandbox or do you have some mock you know no for for third party services just like I said stripe I use mock you know.

**1:06:13** · Okay, but it's the only things that that is allowed to be to to be mocked. Otherwise, I use a test test database and I also make sure that when I write to the database, I need to check that the data exist in the database as well.

**1:06:31** · Okay.

**1:06:31** · Uh we have some question in the chat, but just one uh more on me. uh during the implementation phase, do you use a a better uh model for the implementation or just the normal uh way of working? Uh the the default model for example.

**1:06:51** · Um since I use since I have the the $200 subscription, uh I use the the latest model, you know, I use uh for example, yeah, like Opus 4.7 um because I will not hit the limit. I don't know how people hit the limits actually to be honest. It happened to me maybe five times since in eight months.

**1:07:15** · Yeah.

**1:07:15** · And um I have another question. Uh no. Okay. Uh just we have some question.

**1:07:23** · Uh how are you interfacing with your agent? Are you only communicating with tech lead for streamflow?

**1:07:32** · It uh it depends what what I need. So uh usually I hit um the the streamflow command to implement the task and then if the task is is done then you have the automatic critical chain review that will be activated to check the to check the task.

**1:07:50** · If the task is not done correctly or we have a gap in the task or we need to reorganize task then I will either speak with the tech lead or the technical project manager or I will speak with both. I will bring both and I and I will tell them that I will tell them the problem and then I will tell them to find me the best solution that we could uh uh that we could have.

**1:08:14** · And this is also where your personal experience matters a lot because you at the end of the day you the human and you are the one who or orchestrated them you know so they will tell you something but sometimes you need to force thing and say no I said we should do it that way

**1:08:35** · and when you insist a lot they're like okay Nicholas you're right indeed we should have done this that way and this is where you still have a gap and I I I don't think that you can place people but I see AI as an assistant you know and uh I think you maybe you experiment that but we have a new mental health

**1:08:57** · this is about that it's a brain fry maybe uh in the because you need to manage a world team and maybe you have many task switching and maybe many notification and responsibility because you you have big batch of pair you need to to validate Do you have experiments on AI brain fry?

**1:09:19** · No.

**1:09:20** · Okay.

**1:09:20** · So call call me crazy but before the agentic era I was already doing this you know I was already handling you know five project at a time and I I just had longer day you know it was very difficult with my wife and kids because it was like early morning late night and

**1:09:40** · I use I'm used to context switching because uh I mostly work with startups and in startups you you you are the go-to guy so you need you need you need to have a very versatile profile you need to switch from devops to back end to front end to whatever it is and I was doing this for many many projects. So the day they released clothe code I was like hold on you must be kidding because this is exactly what I need.

**1:10:03** · So with code and other tools I just feel like a fish in the water you know like playing with things and you know yeah it just amplify your creativity right that's it I was doing this way before clothes code to be honest.

**1:10:19** · Yeah.

**1:10:19** · Okay. And uh because it's part of your personality and uh uh how do you prevent because you have work you have built an ecosystem around sub agent and agents. Do you have some gradual around vendor locking you know because at at this time some uh I talk about copilot that change the the pricing model to uh subscription to API usage. Do you have some guard rails around vanderlocking?

**1:10:50** · If you are totally dependent from clothes for example, you need to know that you're speaking to someone that hates vendor looking. So yeah, whatever I do even for uh everything I do is cloud agnostic. I don't rely on a specific cloud provider. I never use uh a solution from from a cloud provider like specifically from Google or or Microsoft or AWS.

**1:11:15** · Everything I use is from cloud marketplace. You know, I make sure that everything is cloud agnostic. So do I for the agent agentic coding uh flow. So uh spec kit is agent agnostic which means you're running out of tokens on on clothes then boom you can switch to a um to codex and then you can switch to quen you can switch to kimmy you can switch to whatever you want you know.

**1:11:41** · Okay.

**1:11:41** · Actually, I used to switch from cloud to Droid to Gemini to uh to to codeex. I have I think I have almost all CLI uh CLI agents in in my laptop and I switch between them when when I when needed to.

**1:11:57** · Yeah. It's just to for attendees to keep in mind that you you should uh be agnostic to all uh Yeah.

**1:12:04** · all platform.

**1:12:05** · Don't rely on one solution.

**1:12:07** · Yeah.

**1:12:08** · Uh don't put all eggs in the same one basket. Exactly.

**1:12:14** · Uh we have a question about uh when building agents it is necessary to learn vector databases. I don't think so.

**1:12:23** · Which one should I use and which are the most popular in the market?

**1:12:27** · Okay.

**1:12:27** · So this one is is very interesting question because it's actually a project that uh a friend of mine which is a he's a data scientist. He was working on uh he was working on a project that will allow you to plug um a graph graph database to your agent so that when he when your agent scan the codebase he can make connection uh more easier than you know using the grip command in your project all the time.

**1:12:58** · Um so this is something that you can do but this is kind of over engineered for for most of the projects. So what you can do you can use uh cloudme uh which is a a persistent storage solution that spin up um SQL light instance in your laptop and then your agent will uh directly uh uh get check into the check in the uh the the SQL light instance to remember what he was doing.

**1:13:29** · So you don't necessarily use vector database.

**1:13:34** · Okay. Right. Uh we have another question. Just to be clear, you're using Droid plus spec kit. Droid is like open claw or not?

**1:13:44** · No, no, no. Droid Droid is uh is a corporate based in uh in San Francisco and they have uh they have built this u this CLI tool that allows you to load any LLM into your uh into your CLI uh uh into your CLI environment. So you can use Gemini, you can use code, you can use GLM like Chinese AI models every you can use any type of of of model.

**1:14:10** · So it's not like a open um open CL and I'm using spec kit mostly with code and codeex both of them.

**1:14:24** · So I use clo to code and codeex to review the the the work.

**1:14:28** · Yeah.

**1:14:28** · And you can use spec kit also in a brownfield area like you said. Um just uh I think we don't have any uh new question. Uh I share the new site of aent morale. Uh just if you have some links I will add it on the comment of the YouTube video the link of Droid something like that. Don't hesitate to to send me all links and thank you so much for for this talk.

**1:15:00** · I think it's a truly interesting topic about agentic coding and the way of how we can delegate uh to a sub agent. Uh it's a different working of AI assisted coding. So thank you so much S and uh I will share the the YouTube video on our YouTube channel. So feel free to subscribe to the the AI agent morale channel. Thank you so much and yeah, see you soon at the next se.

**1:15:30** · Thank you.

**1:15:33** · Bye bye.