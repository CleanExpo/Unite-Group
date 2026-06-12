---
title: "7 Claude Code skills I use every single day (Advanced Tutorial)"
source: "https://www.youtube.com/watch?v=UpgjdQJShWg"
author:
  - "[[Jay E | RoboNuggets]]"
channel: "Jay E | RoboNuggets"
published: 2026-05-12
created: 2026-05-13
description: "Get all my Skills, our AI Command Centre, and the Agentic AI Masterclass 🚀 https://www.skool.com/robonuggets/about?ref=c1365a0fede2445292bc2bbd2b9e9359Get RUBRIC - The Command Centre for AI Agents:"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=UpgjdQJShWg)

Get all my Skills, our AI Command Centre, and the Agentic AI Masterclass 🚀 https://www.skool.com/robonuggets/about?ref=c1365a0fede2445292bc2bbd2b9e9359  
  
Get RUBRIC - The Command Centre for AI Agents: https://www.getrubric.app/  
  
\*\*\*  
  
  
Our AI Partner Tools (affiliate revenue go to community perks):  
🥚 Free trial of Blotato: https://blotato.com/?ref=robonuggets  
🥚 Free trial of n8n: https://n8n.partnerlinks.io/o3jqtj032c02  
🥚 Free trial of Make https://www.make.com/en/register?pc=robonuggets  
🥚 Free trial of ElevenLabs: https://try.elevenlabs.io/m5mn2jkv5rzk  
🥚 Free credits at Apify: https://www.apify.com?fpr=sffv1  
  
\---  
About Me 👋🏻  
  
Hey thanks for watching! I'm Jay - spent my career in data and brand building, founded the ROBO Group to help forward-looking businesses grow with AI, and now teaching what I know through this channel and the RoboNuggets community.  
  
If you learned something new and want to see more, support the channel by subscribing: https://www.youtube.com/@RoboNuggets  
  
Follow on other platforms 🔻  
➗ Instagram: https://www.instagram.com/robonuggets  
➖ Tiktok: https://www.tiktok.com/@robonuggets  
✖️ Twitter/X: https://www.twitter.com/robonuggets  
➕ LinkedIn: https://www.linkedin.com/in/j-enri/  
  
For business, reach out at https://robolabs.so  
  
Leave me a comment if you have a specific request! Thanks.  
— J  
  
\---  
  
Timestamps  
00:00 Intro  
00:31 Skill 1  
03:21 Skill 2  
07:03 Skill 3  
08:48 Skill 4  
10:43 Skill 5  
12:07 Skill 6  
14:21 Skill 7  
  
  
#AIAgents #AgenticAI #AIAutomation #OpenClaw #ClaudeCode #Antigravity #MCPProtocol #Anthropic #AIAgency #AgentBuilding #AITools #AIWorkflow #AutonomousAgents #MultiAgent #VibeCoding

## Transcript

### Intro

**0:00** · Skills and skill chaining have become the bedrock of agentic work. Personally, I've spent a serious amount of time working with these AI agents, and through it, I've landed on seven skills that completely changed how I work. I run an AI education and consulting business almost entirely on Claude Code now as the operating system, and I get to teach thousands of people daily on AI, all running on these skills that I'm about to show you. Point being, I use these every single day, and I reckon some of them would be useful to you, too.

**0:26** · So, if you want to learn a skill that makes your agents smarter the more you work with them, a way to effectively orchestrate multiple Claude Code sessions working on the same project, and a skill to get great results from your agent every time, then this video is for you.

### Skill 1

**0:39** · \[music\] The first skill that I definitely use everyday and in every session, actually, is called calibrate. And this is important because when you're working with agents, what you always need to be thinking about is how you can calibrate or improve your agents over time so that it better suits your needs. And so, the way that I designed the skill is quite simple. Basically, at the end of every session, if I want to have that agent self-improve itself, I just type in /calibrate, and what it will do is it will scan the current conversation or the session that we have so far.

**1:08** · It will detect the corrections that I made to it, some preferences and repeated patterns that I expressed during that whole session, and then it will suggest some concrete updates to skills, and not just skills, but also settings as well as its memory. Now, let's say for this example, which is the session that I used to automate those bureau animations that you saw earlier, which are basically these videos that were animated via Kling. And at the end of that session, when I invoked the skill called calibrate, what it basically did is to scan our conversation thus far and suggest some specific things to calibrate.

**1:40** · So, it suggested here changes to my skill, which basically for these Kling videos, it seems like it detected that Key AI is probably down, that's why it's recommending to default the wave speed. It has recommendations on specific files because it probably encountered an error just because of the naming convention here and spent a few tokens just to look for the right one.

**1:58** · It also gave updates to memory and also these projects that I will talk more about when we get to the coordinate skill. And from here, the reason why I designed the skill to give me numbered recommendations is just so that I can say apply all of them. Let's say accept two, which is I think the one that is just for the file.

**2:14** · And then I'll fire that off and it will apply all of those fixes to all of those MD markdown files and the next time that we work together on this same workflow, those changes and those improvements, especially those that frustrated you during your conversation with Cloud Code, will now be captured and you will sort of just polish more and more your interaction with these agents until you get to a point that they exactly know your preferences and your style.

**2:39** · Now in practice, what I actually also did is to create a light sort of version or mode for this skill where earlier by default, you saw that it looked at the whole session in order to give us concrete suggestions, but this light mode basically just does a quick sweep. And that is just meant, let's say if you're running out of tokens already, then that is a mode that I would probably use for that particular session. Now the other reason why I have a light mode is because in practice, I usually concurrently run multiple sessions at a time here in my IDE.

**3:08** · And so having a light option just gives me that optionality, especially for those sessions where I know I didn't really do much work. In practice also, what I find myself doing is just accept all of these edits instead of having to pour over each one of these just because the next time you work with your agent anyway, you can just continuously use calibrate in order to improve it more and more.

### Skill 2

**3:30** · Now for you to get the most out of your agents and Cloud Code, you need to learn how to work with multiple sessions at once. Because the way these agents work, you may have noticed that they do sometimes take a long time, like sometimes a few minutes at a time, in order to complete the task that you gave it. And so obviously, while that particular session is running, then the natural inclination is for you to open up a session, start a new one here, and then just assign a new task. But, what if you're working on the same project and you just want this other session to do another task in parallel that is related to that project?

**3:59** · Do you now need to re-describe the whole project context in order to get this session up to speed with what you're building? Probably not, right? And that is why for me personally, I made this skill called coordinate that basically lets different sessions coordinate on one project. And by the way, if you're interested in going from just using AI to getting paid for it, then check out the Robonagus community in the description. We've got founders in there who landed their first client in weeks, live build sessions where we create this stuff together, and the actual templates behind what I just showed in this video.

**4:28** · The community is also the reason these lessons get made, so see that below if that's for you. And the way that works is quite simple.

**4:35** · Basically, whenever I invoke it, it will create this folder in my shared projects workspace, and the two fixed files that it will create is this context.md, basically giving context to whichever agent is working on this project on what the project is even about, and also the session log. So, that let's say this project is happening over multiple days, then the next day that you open up a new session, if you need to, they can just read this session log and be up to speed about what was the latest that happened for this project. And then obviously, you can just create different files depending on that particular work that you are doing.

**5:07** · To give you an idea of how I use this, let's say I want to start a project for a particular client.

**5:12** · So, you can see here that I just gave this blur via voice dictation earlier, and I just asked it to create a project for this automation for this business that we are working with. So, I just invoke {slash} coordinate in there, and what it basically did for us, if I zoom that out, is create this folder under {slash} projects that includes the context of this piece that we said. And then, as you provide more documentation to it or ask it to research best practices for this particular work, then it will put all of those contexts and those details in this folder.

**5:40** · And later, I'll show you how to onboard several other Cloud Code sessions in this one project folder so that they are working on the same thing if you want to work concurrently with your agents. But you can see just from this, it allows you to basically store that context from just a subsection of your operating system, right? And if you see here under share projects, I already have like several projects in here. Some of them like these projects index or prefixed with CR content. So that's the ones that I publish as lessons. But you can see here I also have projects for even non-work stuff.

**6:11** · Like the other day I was researching for a proper microwave because ours broke the other day. And so I just asked cloud code to research that for me. It included context of that blurb that I gave it over at Telegram. And because I added research some options for me, it also logged that context in here. And for this session log, obviously this one is quite small.

**6:29** · But I just list down the sessions that I had with it. So this is the context for session one, and then this one is the context for session two. And so because I use it now even for those minute projects, I actually made a light version of this as well. So to give one practical example, let's say you want to research for Father's Day gift ideas.

**6:46** · And I gave it some initial thoughts in here. And I just said coordinate light.

**6:49** · And basically that gave cloud code the instructions to create this shared project so that the next time that I remember to pick up this project, then I can just continue my research here in cloud code. Or more likely, since I have cloud code connected to Telegram, I'll probably pick this up on my mobile at some point when I have downtime. But that begs the question, right? Because this session on Telegram or even a new session here in the IDE, how do you actually onboard this new session to that project? Well, that is the third skill that I use every day.

### Skill 3

**7:15** · And this one is very simple because all it does is give context to that particular session for whatever project it is that you are working with. And how it works is simple. So when I invoke that skill and give an idea of the project that I want it to be onboarded on, what it basically does is looks for that project under our shared projects folder. And it basically just reads the context and the session logs for that project so that this session is up to speed with the latest on what this project is about and what are the updates related to it.

**7:43** · Now, a bit of an advanced tip, if in case you are starting to get to the point where you are working with multiple sessions, let's say you onboarded this Cloud Code session into this project, Locksbugs AU.

**7:55** · What you can actually do in order to save some tokens, at least here on the IDE, so either Anti-Gravity or VS Code, is you can click on this button at the top right and just click fork conversation from here. And what that will do is spawn that same session with the project already onboarded. And you can actually do this for whichever session if in case you just want to fork that conversation, meaning whatever was the context for this particular session, you just want to port it and take it to another direction or to another task, for example.

**8:23** · And you can see here what that basically did is to copy all of this session chat logs up until this point where I sent this prompt. And you can see that prompt is now loaded into our text box. And from here, you can give it another task, like for example, check their competitors and what they're doing, for example. And then once you get more comfortable with it, you can just continuously do that so that you can fork that conversation and have multiple sessions running at the same time. And the good news about all of those is that they are onboarded to this project so that they are working on just this one folder.

### Skill 4

**8:52** · Now, I'll take you through some of the skills that I use in order to work better with the agents within that session. And the first one that is really important is called align. And it's very simple. When you invoke this skill, it will just force the agent to ask you clarifying questions so that your intention is aligned. And just to show how that looks like in this same project that we started earlier, the same session. So, you can see I just invoked align five.

**9:17** · And what that will basically do is ask me five numbered questions around this project. So, you can see here it's asking me around the scope of this engagement. It gives me a question around who owns the airtable. And I also designed it so that not only does it ask me numbered questions, but it also gives me lettered options for each one. So that, let's say if I want to type this out easily, I can just type in the question number and then my answer to that question, go to the next query and type in my answer to that, or even add other notes in here.

**9:43** · Usually though, I just use my voice dictation app, which is Aqua is what I'm using, and that just allows me to insert text and thoughts to answer those questions in turn. And with that, that's just a nice and easy way for you to align with your agent.

**9:58** · Because remember, when you are working with these AI agents, what you're basically doing is steering them towards the output that you want. To illustrate that quickly, let's say this is your agent and this is the output that you want. When you send a prompt, what you're basically doing is steering them or guiding them in order to search or find this output or target that you want by the end of that session. And usually, when you provide a generic prompt or a misguided direction, what commonly happens is that you send in multiple prompts, you use up multiple tokens up until you get to that X.

**10:29** · But if you use a skill like align, what that will essentially do is align your agent towards what it is that you want. And so, the scope of the possible outcomes that it provides to you is now much narrower because it now has a clearer idea of what it is that you want by the end of that session. What would now happen is that you now have an agent that is more directed and properly steered towards that output, which brings us to a slightly related skill called devil. That stands for devil's advocate.

### Skill 5

**10:59** · And again, this one is just a simple skill, but I'm finding that a lot of these skills that are actually useful are quite simple in their nature. And this type of skill is important because if you've worked with any LLMs or any AI models before, you might have noticed that they have a tendency to be a bit more sycophantic, which means that they are yes people. They sort of adhere to whatever it is that you say is correct.

**11:19** · Now, this devil's advocate skill just reverses that so that it forces the model to have a more contrarian view to whatever it is that you're doing so that you can understand what other approaches or angles may be viable that you haven't really considered before. To give one simple example, using the project that we were working on earlier in the session, you can see we search for ways to connect to Airtable. And then let's say we chose this option two, and we want to verify and have Cloud Code play devil's advocate if this is a good option for us or not.

**11:47** · And so what I would do in this case is to invoke that devil skill, give it a number, which is basically the number of bullet points or feedback points that I would want, and obviously I can increase that depending on how important this task is. And I just gave it some guidance to play devil's advocate for that option two that we were saying earlier. And you can see here it is giving me some really valid feedback points. So it's saying here that it's a one-person GitHub repo with almost no stars, so probably not a good idea there. And it gives me a bit more detail around why I might need to reconsider this option.

### Skill 6

**12:15** · And speaking of options, this next skill is called burst. And again, it's a simple skill, and what it basically does is to force your agent to generate n variations and to do it smartly depending on the context of your conversation. And similar to the align and devil skills, I usually invoke it with a number at the end of it like this one. And what that will force the agent to do is to give me three options for that particular question. And you can use this type of skill for anything really.

**12:42** · If you're writing an article or you're generating images, this is a skill that I often use. But to give an example, what I did here is to have three iterations of an HTML slide, let's say, showing how Airtable works just so that I can have a quick explainer visual of how this software is working under the hood. And you can see it gave me three options in here. So you have one that is a bit more technical, one that includes some emoji icons, and this third one that explains some of the terms within this tool. And let's say we like this illustration.

**13:12** · What you can now do is to continue this from option B, and you can see here I'm invoking the burst skill again for three different design styles. And from that it gave us these three different styles.

**13:22** · We can probably guide it better so that we have the designs that we want. But you can see here it gave me option one, which is a bit of a parchment paper style. This one is quite closer to the original, although I guess it made the decision to make this a bit more 3D, so we probably won't pick that one. But, this third one is actually quite good.

**13:39** · So, you can see here, it has a nice flow of the steps for that Airtable pipeline that we have. So, if this is the style of your brand or your agency, for example, then you can work with this.

**13:49** · But, you can see how useful that is, right? So, you can apply this burst scale to pretty much any work that you do. If you want to force the agent to give you multiple options at a time. And again, this act of forcing the agent to give you numerous options every time is actually quite important, because if you go back to our example earlier, where you have this as your agent, and then this is your desired output.

**14:08** · If you force the agent to give you multiple options at a time, then what you're essentially doing there is view these multiple options simultaneously and figure out which one is closer to your desired goal. So, let's say this third one is closer to that output, then you can just continue your conversation from here, select that, and get to that goal much faster. And last but not least is a skill called tweak, which is specifically useful when it comes to design.

### Skill 7

**14:37** · And the way tweak works is that when you invoke it, it will insert this HTML slider that will let you tweak the page, the design of the page, depending on some specific parameters that Claude Code will decide for you. For obviously, you can also ask it for some specific sliders or attributes in there, if you want. So, going back to our Airtable example earlier, you can see here that I asked it to tweak this B-tree option, which is this one. And what it basically did is to insert this card, where I can just pull on these sliders to increase the title size. Let's say I want the body size to have a bigger font, the density between the elements.

**15:09** · And there's a couple of sliders in here like this subtle accent glow at the back, letter spacing, the saturation of the overall card. And it's very much the same as what Claude Design actually introduced, but here you are doing it from within CloudCode, which in my view is just a much better experience. Now, let's say you are satisfied with this particular style and the tweaks that you have made, you can just click on bake, and then if you copy this patch, send it back to your agent, what that will now do is to bake those changes in so that

**15:40** · whatever changes that you selected or tweaked, it will now flow back to this final visual. And there you go, that is now all the top skills that I use daily. It will probably be different depending on the type of work that you do, of course, but I hope you learned something from how I do it in our own workspace.

**15:55** · And the best way to use what you learn in this video is to try and create and custom fit those types of skills for your own setup, whatever that may be. But if you're part of the community, remember that you can get those personal skills of mine just in our classroom.

**16:07** · And by the way, if you want to learn how I create slides like this, I actually made a separate lesson on it, which I will link somewhere in this video. I'll see you guys next time. Thank you.

**16:15** · \[music\]