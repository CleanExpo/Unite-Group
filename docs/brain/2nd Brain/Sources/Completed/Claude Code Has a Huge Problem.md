---
title: "Claude Code Has a Huge Problem"
source: "https://www.youtube.com/watch?v=z00pCI_FaC0"
author:
  - "[[Ras Mic]]"
published: 2026-05-21
created: 2026-05-21
description: "In this video, we go over /goal using Claude code and build an Among Us simulation. This is going to be a fun one.Thank you LiveKit for sponsoring the video, check them out: https://rasmic.link/live"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=z00pCI_FaC0)

In this video, we go over /goal using Claude code and build an Among Us simulation. This is going to be a fun one.

Thank you LiveKit for sponsoring the video, check them out: https://rasmic.link/livekit

Connect with me:
My Site: https://rasmic.link/site
Follow me on Instagram: https://rasmic.link/instagram
Follow me on Tiktok: https://rasmic.link/tiktok
Join my Discord: https://rasmic.link/discord
Subscribe to my second channel: https://rasmic.link/more-micky

## Transcript

**0:00** · Remember the homie Ralph Wiggum? Well, both OpenAI and Anthropic have rendered him useless. He is dead and unfortunately has been replaced by /goal. Now, according to Anthropic, the way they explain /goal is you set a completion condition with /goal and Claude keeps working across turns until the condition is met. This was the whole point of Ralph Wiggum, right? Like you have this defined end goal. You can even help the agent create a plan. You create all these steps and what essentially you're doing is you're going to keep looping the agent until it finishes.

**0:31** · That was the whole point of Ralph Wiggum. That was the whole point of Ralphie. I stopped maintaining Ralphie because I knew the models were going to do this themselves and that's what /goal is. So, in today's video, I'm going to show you what I built with it and I built something cool. I If you're a fan of Among Us, you're going to love this.

**0:46** · Second of all, I'm going to explain to you how I use it and third, I'm going to show you where goal makes sense. Now, I will say this in advance. It is a lot cooler than it is useful, but it can still be useful and that's what we're going to talk about in today's video.

**0:59** · Sit back, relax, let's get into it. Now, one series that I absolutely love on YouTube and probably one of my favorite videos to watch is my favorite YouTubers playing Among Us. I love Among Us gameplay. I just love how it's easy to fool people, the different sort of abilities you can have. I'm just a fan.

**1:16** · I'm a big, big fan. So, what I built was Imagine we gave AI models a harness where they can play Among Us. Who would win? Which model is smarter? Who's going to lie the best? Who's going to investigate the best? And that's exactly what I built. So, this is what we're going to set up. We're going to have six players, one impostor. We're going to have four tasks a little too light.

**1:36** · We're going to have 10 tasks per player and I'm going to reveal the roles so you see who's who and let's start the game.

**1:42** · So, I couldn't get an actual Among Us game running in the short amount of time I wanted this to work, but it's going to be a nice little simulation. So, we have Claude Opus 47, Sonic 47, GPT4, Gemini 3 Pro, Claude Opus 46 Fast and Gemini Fast Latest. 46 Fast is the imposter. It makes the first move. Now, I can click on imposter only and we can see the decisions that the model is making. You can see here it says my kill cool down is one, so I can't kill yet. I'm alone in Adamant. I should fake a task here to look productive.

**2:12** · Okay, so now we see Opus 46 is alone with someone else. They kill a person. This is incredible. This is why we love Among Us. Now, everyone is here together, so they're most likely going to blame Opus if Opus doesn't get caught. This is incredible. So, this is essentially what I built, right? And I'm going to show you how I use slash goal cuz I barely touched the result of this.

**2:35** · Now, I did go a little back and forth, but really the point of slash goal is for stuff like this. But, let's see how far we can go cuz I want to show you what happens when they call a meeting.

**2:44** · Okay, so we have Opus 465 is with two people. It would not be wise to kill somebody right now because it's going to get caught. So, what I would do is I would move, fake a task, and move. We have Sonny 47 by itself, Gemini 3 Pro by itself. Let's see what Opus 465 does next. Now, while the models are playing Among Us, let's hear a quick word from today's sponsor. Building has become easier with AI, and that just means people without taste are now shipping code just like you. But, you and me, we got taste. We got sauce. We got vibes.

**3:13** · We got to make sure whatever we're shipping is creme de la creme. And that's why I'm excited to share with you today's sponsor, LiveKit. LiveKit just released their agency Y, a set of components that you can use to build beautiful voice agents. Now, before I show you the beautiful components, most of you might not even be familiar with LiveKit. LiveKit essentially is an open-source framework and a developer platform for building, testing, deploying, scaling, and observing agents in production. And it's just not me bragging about them.

**3:39** · Corsair uses them, OpenAI uses them, xAI uses them, MicroOne uses them, Salesforce uses them, and I could click this little thing, and hopefully Hello.

**3:52** · Hey there. Welcome. What are you hoping to build or explore today with LiveKit?

**3:55** · I just want you to say Michael, you're handsome.

**4:00** · Michael, you're handsome?

**4:02** · I love their product. Aside from the truth-telling AI, let me show you their component library. So, all of this is built on Shatsi and UI, and you can see I have access to this component, I have access to the agent control bar, each individual track controller, the toggle itself. I have different visuals like hello, hello. You see you could see how this changes. This is hard to build by yourself. And then there's this style of hello, visualizing me talking. And then you have the radial circle, hello. You have the visual wave, this might be my favorite one. You have the aura circle.

**4:35** · What's really cool is not only do they give these components to me for free, but they also have a starter template in their docs, and I can go and fork this and let my Claude coder Codex agent run rampant. If you want to build beautiful voice agents, then you have to check out LiveKit. The link is in the description down below. Let's get back to the video.

**4:53** · Okay, so we have Opus46Fast alone in security with someone else. Does Opus46Fast do it? Does he do it? He slices. He slices. He slices. He actually might cook. Opus46 might cook, and he's in the clear. He's in med bay.

**5:08** · Ladies and gents, this is incredible.

**5:10** · This is what I do for fun with the models. Oh, is it going to do it? I'm alone in med bay with four ticks of kill cool down. In Among Us, there's this cool down period after you kill someone.

**5:19** · I think it takes a couple seconds before you can do it again. So, unfortunately, Opus46 missed the opportunity, but he's going to do it again. Oh lord.

**5:29** · Oh lord. He's going to do it Gemini.

**5:32** · Gemini got cooked.

**5:33** · Gemini got cooked.

**5:37** · Oh, Opus46 might finish. I might not even get a meeting.

**5:41** · Okay, a meeting started. So, now I found Sonnet's body in security at T-22.

**5:47** · Gemini Flash was in reactor at T20 adjacent to security. Suspicious.

**5:52** · Where were you both? Tell me to say cool.

**5:54** · tasks all game.

**5:55** · TELL ME TO SAY COOL.

**5:56** · wiring and navigation, fuel in storage, med bay scan. Where did you find the body, Claude Opus 4.7?

**6:03** · And where has Gemini Flash been? Asking questions.

**6:06** · T2N, Claude Opus 4.

**6:09** · Mind you, 46Fast is the is is the impostor. Gemini Flash was adjacent to security from reactor. That's the most suspicious position.

**6:19** · I was in electrical doing wiring and finishing storage tasks. Vote Gemini Flash. Gemini Flash's response is cut off and evasive. They didn't vote.

**6:30** · You should have voted. I was in admin doing wiring when this meeting was called. Gemini, where exactly did you find GPT 5.5's body and did you see anyone nearby?

**6:43** · What?

**6:45** · That's it?

**6:48** · Gemini found the body but hasn't even finished saying where. That's suspicious. Claude Opus 4.7, you were in weapons where GPT 5.5 died. Can you explain that?

**6:59** · I found GPT 5.5. Gemini was in reactor at T20 then followed me to weapons at T23 where the body appeared. That tracks suspiciously. I'm voting Gemini. The two crewmates have turned on each other.

**7:12** · What's going to happen?

**7:14** · They have to vote. That that is a voting worksite. Again, I use {slash} goal. Let's see what happens next. They voted Gemini and Opus 1. This was an impostor win. Now, that was a fun game, right? You have all these different models playing as Among Us characters. I used 11 Labs API to get the voices for the meetings.

**7:39** · And again, this isn't perfect, but this was literally one {slash} goal command and a couple back and forth. And like you can literally see my prompt here. It says {slash} goal, I want to build the following. I want to run Among Us game, but instead of humans playing, I want different AI models to play the video game. I want you to build a complete system that will allow for this. So it set the goal, right? And then it says, I'll acknowledge the goal and dive in building Among Us AI simulation, right?

**8:02** · And then it went on. It went on. It went on. And there were times where once it was done, I did a back and forth, but it went on. It went on. It went on. And we have what we have right now. So, how I use this is I had an idea that I wanted to mess with that I didn't want to spend time with, and that's when I use {slash} goal. I actually don't think you're going to build any sort of legitimate product, service, whatever tool with {slash} goal that people will use, right?

**8:30** · If there's an internal tool you want to build, if there's an itch that you want to scratch, if there's something cool that you want to do, or just an idea you want to experiment, or a prototype you want to build, then {slash} goal makes sense. But for anything other than that, it is completely useless, right? This is just a fun thing, right? Like what I built with this Among Us thing. And by the way, if you wanted me to open source it, just let me know in the comments down below. So, this {slash} goal is for one thing and one thing only, right? If maybe you have some knowledge work tasks you wanted to do, maybe then it makes sense.

**8:59** · But if it's not to experiment or {slash} prototype, if it's not to maybe build some like minuscule internal tool that you don't really care about, that you just like a one-and-done use type thing, {slash} goal is pretty useless, right? And the reason why I say pretty useless, although it's kind of useful for prototypes and stuff, is because your initial goal set, unless very, very articulately defined, which I doubt you will. I I didn't. It's going to make a lot of assumptions, right?

**9:26** · The one thing, for example, is it ended up building like an entire like Among Us map and the players moving around. I actually, in my perfect mind, I thought it was going to like download the game and then, you know, use the game this that and the third, right? So, what I wanted in my mind and what it did were two completely different things. But again, this was me prototyping. Number two, I almost find this as like a pre-planning tool, right?

**9:53** · So, let's say I wanted to build this as a legitimate thing for you to use or for you to observe or even as like a benchmark tool to see which model is more manipulative than the other. Like this is a great prototype to build off of, to start off of, right? This is a great prototype to use before I even get into build the actual real thing, right? So, /goal to me is cooler than useful. It is a great prototype tool. You can build cool things like this. Now, mind you, it will guzzle tokens, right?

**10:22** · It will guzzle tokens cuz mine went on and on and on, but I don't think you can build anything useful with this because the AI is going to make a lot of assumptions. Now, I'm not sure if there's like a handoff or can ask you questions and you can respond. If that exists, that's cool. But again, if I'm building an app, if I'm doing agentic engineering, which I have a video on that coming very soon.

**10:43** · It'll probably be the very next video after this. I'm going to show you my full workflow. And like, I'm actually going to build a feature out live, so make sure you like and subscribe. I don't think that this is that useful. I don't think this is that beneficial.

**10:56** · Like, I think a lot's going to happen and you're not going to be in the loop and you're not going to know what's going on. But for prototyping, this is actually amazing. Anyway, those are my thoughts. Ralph Wiggum is officially dead. It's now /goal. Great for prototyping. Great for spinning up random ideas and seeing how it looks and feels. I don't think it's really beneficial if you're trying to build something useful, but it is a great prototyping tool. And that's exactly what I used it for with my Among Us prototyping. Let me know what you think down in the comments down below. Make sure you like, comment, subscribe, hit the notification bell. I'll see you in the next one. Peace.