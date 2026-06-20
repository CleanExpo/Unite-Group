---
title: "Build Agents That Run for Hours (Without Losing the Plot) — Ash Prabaker & Andrew Wilson, Anthropic"
source: "https://www.youtube.com/watch?v=mR-WAvEPRwE"
author:
  - "[[AI Engineer]]"
published: 2026-05-18
created: 2026-05-19
description: "Why self-evaluation is a trap and adversarial evaluator agents work better; why context compaction doesn't cure coherence drift but structured handoffs do; how to decompose work into testable sprint c"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=mR-WAvEPRwE)

Why self-evaluation is a trap and adversarial evaluator agents work better; why context compaction doesn't cure coherence drift but structured handoffs do; how to decompose work into testable sprint contracts; how to grade subjective output with rubrics an LLM can actually apply; and how to read traces as your primary debugging loop. Plus the question nobody asks: which parts of your harness should you delete when the next model drops?  
  
Speaker info:  
\- Ash Prabaker | https://www.linkedin.com/in/ash-prabaker/  
\- Andrew Wilson | https://www.linkedin.com/in/anddwilson/  
  
Timestamps:  
0:00 Introduction and speakers  
1:21 Overview of long-running agents  
2:29 Challenges: Context, Planning, and Judgment  
4:14 Two approaches: Model updates vs. Harness evolution  
5:58 Prehistory: Sonnet 3.5, Computer Use, and MCP  
6:34 The evolution of Claude Code  
7:55 The Ralph loop technique  
9:49 Sonnet 4.5, Agent SDK, and checkpoints  
10:49 Opus 4.5 and the role of sub-agents  
12:05 First long-running agent patterns  
14:20 Opus 4.6, Agent Teams, and server-side compaction  
17:28 State-of-the-art harness patterns  
21:30 Evaluating subjective output with rubrics  
23:44 Introducing the 'Planner' role  
25:04 The generator-evaluator contract  
31:28 Specificity in contracts and debugging traces  
34:14 Adjusting harnesses as models evolve  
37:56 How to build your own agent harness  
39:01 Key takeaways for long-running agents  
40:05 Q&A session

## Transcript

### Introduction and speakers

**0:14** · Nice meeting you guys. Um I'm Ash. Uh this is Andrew. We both work in uh as engineers in our applied AI uh team here at Anthropic. Um and the kind of topic for this session was uh inspired by a blog post we put out uh just a couple weeks ago actually about how to think about building uh agents that can actually run for really long extended periods of time.

**0:38** · You know, we're talking 5 6 hour plus kind of runs.

**0:42** · Uh I think we've all seen these kind of demos, you know, of like companies being like, "Hey, we've like one-shotted a browser." For example, but not necessarily sharing like some of the details into what goes into the harness and that's what we kind of want to talk about today. So, the first off um my amazing quick Andrew will talk about a little bit about basically how we've got here, some of the primitives that we've shipped in code code um and, you know, where we are today.

**1:07** · Um and then I'll hop back on stage to talk a little bit about some of the more experimental stuff that we're playing with with harnesses um as well as, you know, a few examples of of what we've seen. But, over to you.

### Overview of long-running agents

**1:21** · Sounds good. Thank you, Ash. And yeah, thanks everyone for joining uh first session of the AI Engineer conference.

**1:27** · So, glad you're spending it with us. Uh my name's Andrew. I'm on the applied AI team based out of London working as a solution architect with a lot of our digital native and industries customers.

**1:37** · So, um yeah, I'm going to give a little bit of a history tour uh trip down memory lane, but really with the focus on all the things that we've shipped that lead to agents being able to run uh for multiple hours or even days at a time. Um and then I'll hand over to Ash to do more of the the state of the art.

**1:54** · Right. Okay, so um little quote from or on Twitter from Boris, the creator of Cloud Code. This was on the one-year anniversary of Cloud Code. Uh, basically saying a year ago, Cloud was struggling just to write bash commands and escaping strings. Um, and it could run for, you know, maybe 20 minutes at a time. And then, we're now at the point where almost all of Cloud Code is being written by Cloud Code, and it can run effectively for days at a time.

**2:19** · Uh, so sort of a a big big swing over just the course of a year, and I'll walk through that history uh, a little bit now. But, just to Let me uh, zoom in here. Um, just to sort of frame the problem. I'll play why why is it that it's really difficult for these agents to run for extended periods of time? Um, I think broadly there's three big buckets. Uh, some are more intuitive than others. So, firstly, context. I think we all understand context windows very much finite. So, you start a new session, there's like amnesia.

### Challenges: Context, Planning, and Judgment

**2:48** · The agent has to start from scratch, so you need some sort of memory components. Um, also as you're working through a context window, there's this notion of context rot. So, uh, there's less coherence as you're you're getting deeper into that session. Uh, also, you might get to the point where uh, the model actually exhibits what's called context sense anxiety. So, it gets kind of nervous as it reaches the end of its context window, and it just quickly hurries up to finish what it's doing. Um, this kind of leads into planning.

**3:16** · So, uh, in general, models are not that great at planning just out of the box. Uh, they might try and do everything in just one shot. Or, for example, they might build half a feature and then stop, or they might just run out of context altogether and sort of leave a half-finished app built. Um, but then maybe less intuitively, um, models are really bad at judging their own output. So, I know we all know that models can be sycophantic and sort of tell you what you want to hear, but this applies as well to to coding tasks.

**3:45** · So, it might look at a feature and see that it's sort of half half-baked or a little bit implemented and say, "Yeah, okay, uh, that looks done." and then it'll move on to the next thing. Or it might build a feature like a button, but actually the back end, you know, it doesn't exist for it. There's sort of no nothing behind that, but it looks like the feature is done. So, um I know Ash will talk quite extensively of so some of the new techniques we have to to help with this um specifically so models can become better at judging their own output.

### Two approaches: Model updates vs. Harness evolution

**4:14** · So, there's there's two ways really we can we can fix these things. Uh the first one is obviously the model. So, um baking it all into the model weights themselves. And I'm sure you've all seen this this meter chart. It's basically how long can an agent run for with a minimal scaffold uh where it's completing 50% of the tasks. And you'll see from Opus 3.7, it's around 1 hour and up to Opus 4.6, 1 year later, it's at 12 hours. So, an entire day. Um and we've of course, you know, managed to get that running much longer.

**4:45** · Other people have as well, but this is just a sort of a very minimal scaffold.

**4:51** · The second thing that you can do is, of course, make changes to the harness itself. So, this is the scaffolding um around the model. And we have the agent SDK which ships with all of the primitives that we've been building over time. So, there's the core agent loop itself where you have Claude model that's determining what to do, what tools to run, uh maybe it's pulling in some tools from MCP servers. Uh it might delegate some tasks to a sub agent. It's bringing in all the context from things like claude.md or the skills that are loaded or slash commands.

**5:21** · And there's a whole permission system. And the this this will change over time as well as the models get better and improve. But these are sort of the the core primitives that we're working with. And then of course, you use this framework to to build your own harness for whatever it is you're trying to do such as some of the things that Ash will show uh later on when we're getting to more long-running agents.

**5:43** · Uh I think what's also interesting is just looking back at the last year of releases is that when we've released a model we've always also released a lot of harness changes alongside the models.

**5:54** · So really these things are like co-evolving together. So we'll just look back um suppose firstly just prehistory um beyond you know one year ago. I think we all remember that that period where Claude had the artifact section of Claude.ai and and uh Sonnet 3.5 was the first model that really showed promise when it came to coding. And it could now verify that it could look at what it had built and sort of iterate from there. That was quite an aha moment sort of pre-Claude code.

### Prehistory: Sonnet 3.5, Computer Use, and MCP

**6:19** · Uh but then also we shipped computer use so it could start clicking around taking screenshots um testing its own code as well as MCP spec uh which enabled it to sort of use tools.

### The evolution of Claude Code

**6:34** · So then getting into Claude code uh this is February 2025. So this is about just over a year ago. Um Sonnet 3.7 was released and this was sort of state of the art on Swebench. And Claude code was released in research preview. And I think an an interesting quote that I pulled from this release actually is that the goal of Claude code was to better understand how developers use Claude for coding to inform future model improvements.

**6:58** · So essentially when we released Claude code the whole idea was for it to be somewhat experimental to inform how we actually improve the base model itself. And you'll see this trend that over time the models become better.

**7:10** · Uh the harness certain aspects of it might become less necessary or it will evolve.

**7:16** · Um just just in terms of uh these slides as well in the bottom left corner these are some of the things that are are sort of the focus of these releases whether it's uh context or planning uh or verification and then some some stats but I'm not going to sort of read everything. Um so yeah next this was around May time of last year Opus 4 and Sonnet 4 4 were released. And just in general um these tools got much better at sort of managing their own contacts and getting to task completion uh without reward hacking or anything like that.

**7:45** · And then Claude Code became GA as well and we released the Claude Code SDK. So sort of the the harness powering Claude Code.

### The Ralph loop technique

**7:55** · Um little interlude here from the timeline. I think everybody now knows about this Ralph Wiggum technique. Uh you might not know that it was actually last July that this was that this came out uh when when Jeffrey Huntley initially released the paper because it really sort of gained a lot of traction around say December or so of last year uh when for example people started playing around with it themselves.

**8:17** · Claude also released our own uh Ralph Loop within the the Claude Code uh harness itself. But essentially it's it's quite sort of a simple technique that you're just taking a prompt and you're feeding it into Claude Code CLI for example and then you're just running that on a loop until uh all the tasks are complete. It's a little bit deeper than that. I I think people tend to simplify it.

**8:39** · There's actually a few phases where at first you know would have some kind of planning where it breaks down that prompt into a few different features and then it would pick sort of one task from that and start a new session and then work with a fresh context window. So a lot of those concepts were were applied in the Ralph Loop but I think um why it caught so much attention is because it sort of seems really simplistic and he put it uh deterministically bad in an undeterministic world. So the idea being that it's better to fail predictably than it is to succeed unpredictably.

**9:08** · Um when we actually created our own plugin for this in Claude Code you'll see well I don't know if people can recognize what what the major difference is. There's some people say you know that's not a real Ralph Loop.

**9:23** · Um the idea is that this is just running within a single Claude Code session. So it's not creating a fresh context window. It's just relying on compaction to happen over time. So you know maybe it's not considered sort of a real Ralph Loop but you'd set the max iterations.

**9:36** · You'd set a safe word, and then essentially a stop hook would intercept when Claude would typically stop, and if it's not finished, it would just sort of continue until it hits one of those exit criteria.

### Sonnet 4.5, Agent SDK, and checkpoints

**9:49** · Okay, so on to Sonnet 4.5. This was when the model just generally started getting better again at handling its own context. So, this is when it became more context aware, tracking how many tokens had been consumed. So, as it got towards the end of the context window, it sort of understand that, and it could manage its own context. Um Claude Code 2.0 also shipped. This is where we introduced checkpoints. So, actually keeping track of of the code over time, being able to rewind to previous parts of the session.

**10:20** · And then we released We just sort of renamed the Claude Code SDK to the Agent SDK. And that's because we realized it's much more general purpose than actually just for coding. So, you'll see we're talking about coding a lot right now, but I think what's very interesting is applying these long-running harnesses to other domains as well.

**10:40** · Uh at this point, we could run for about 30 hours or so uh with Claude Sonnet 4.5. But then completing the family with Haiku 4.5 and Opus 4.5, this is where it got really interesting because all of a sudden running many sub-agents became really economical. And Opus 4.5 became really good at planning. So, we could start doing things like using Opus 4.5 for planning, and then using Sonnet 4.5 as the workhorse for really executing all of that code.

### Opus 4.5 and the role of sub-agents

**11:11** · Um and then there's this big couple months as well because this is when we released skills, which again very good at making use effective use of the context with this notion of progressive disclosure. So, just the front matter of the skill is loaded in instead of sort of all of your tool descriptions, you know, which can consume quite a lot of the context window up front.

**11:32** · Um, and then sort of the entire rest of the body of the skill is loaded in if it's instantiated followed by say some references to even even code that could run more deterministically. And then more context improvements, things like programmatic tool calling. So instead of running a bunch of tools, pulling all of that into to context and then trying to process it, actually just writing code on the fly and being able to sort of run a series of tool calls and then just get the final result back. And again, this is all just to improve the the usage of of the context window.

### First long-running agent patterns

**12:05** · Okay, so a lot going on in this slide, but at this point, um, this is around November time. We released our first blog post on long-running agents and and how you go about building these. So a lot of the concepts I've already described um, should make this fairly easy to understand actually. Where say a human would write something like, you know, write me a browser or create a Slack clone or a Salesforce clone, just something like really, really vague.

**12:29** · And uh, the first thing that would happen, um, in this harness that we built is there's an initializer agent that would take that simple prompt and it would break it down into a series of of persistent artifacts. The first being a feature list of say X number of features.

**12:48** · Featurelist.json because we actually found the models might overwrite markdown files, whereas they're they're less likely to just overwrite JSON files, which is kind of interesting. Um, it would also write a progress file, um, of course, sort of start the Git repo, uh, build an init script, and then just have a flag for, you know, whether the features are complete or not, if they would pass all the tests. Um, from there it would go into this harness loop where uh, there's multiple different steps here.

**13:16** · So the first one is, you know, again, in fresh context window, just getting the bearings, what's the present working directory, um, what's the the progress file say, okay. And then um, doing a smoke test or running the init script, so it didn't have to figure out how to do that every time, get the server up and running, etc.

**13:34** · And then picking one feature, only one feature that that hasn't passed all of the tests, implementing that feature, doing some actual tests, much so verification loop, much like a human would do using Puppeteer in this case.

**13:48** · And then if if everything passes, actually writing the Git commit and changing the the state of of this particular feature to passes. And then if there are any features that are unfinished, just continuing that loop in a fresh context window. So, we're starting to layer in a lot of these concepts here, fresh context windows, these sort of persistent artifacts, verification loops, really good planning up front. You'll see like this this is sort of the first iteration of of these long-running harnesses here.

### Opus 4.6, Agent Teams, and server-side compaction

**14:20** · Okay, so continuing with the history tour, so then Opus 4.6, Sonnet 4.6.

**14:26** · These models are really great because Sonnet 4.6 was basically offering that Opus level intelligence more at the the Sonnet price, and it became again like very much a workhorse for a lot of Claude code.

**14:37** · And Opus 4.6 just became really good at planning. We called it very much an agentic model. So, Opus 4.6 was great at at deciding like which tools to use and just being able to run for much longer. If you recall that meter chart, you'll see that this was a jump from about 4 hours up to 12 hours with sort of that very simple harness.

**14:58** · So, this model is like very very agentic. And then along with that with some of the research we'd done, we released agent teams, which the idea being in Claude code is sort of more general-purpose way for you to say scaffold out your own set set of of custom agents. And the innovation with agent teams is that instead of everything reporting back into the main agent, Um, the actual sub-agents could could communicate with each other, so they sort of had their own way to coordinate and then report back to the main agent only when it was required.

**15:30** · Um, we also introduced server-side compaction, which basically meaning that these models can now just run indefinitely and compaction could just sort of, you know, happen on the server side.

**15:40** · And then um, this 1 million context GA.

**15:42** · So now we have like one big context window. You see like the models are getting better. Maybe you can just run a lot, you know, within a single context window even instead of necessarily needing new sessions all the time. You see how things start shifting over time.

**15:56** · So, that's sort of the uh, the whole overview. You can see all of the different uh, releases that I shared here on this table and you can see how it's changed from, say, Sonic 3.7 at 1 hour uh, to 12 hours with Opus 4.6. And then we have our own anecdotes as well, um, where tasks would take, say, you know, like 20 minutes when it was Opus 3.5 and now we're building, say, fully fledged apps that you don't have to run for, you know, 30 hours. They can run typically we're seeing like, say, 3 to 5 hours.

**16:28** · You can build like a really, really fully featured application that that runs out of the box.

**16:35** · So, what's really interesting is is the harness doesn't just disappear as the models get better. It's really evolving as the models change over time and it's really fascinating to sort of find the the gaps in the model and then fill that in with the harness and then you train the model on um, the using that aspect of the harness and maybe at some point you actually remove that entirely and sort of this iterative uh, loop just keeps happening over time with with more and more of these sort of co-releases that we have.

**17:04** · So, um, yeah, hopefully that was an interesting little trip uh, back through the Claude evolution uh, and how it applies to the long-running agents. And so I'll I'll hand over to to Ash to continue with where we are today uh in terms of the state of the art.

### State-of-the-art harness patterns

**17:28** · Uh all right.

**17:30** · Um Quick question. Any of you guys have any agents running at the moment in the background doing work while you have?

**17:38** · Just one, two, three. Okay.

**17:41** · Probably should be more of you. Um uh hopefully by the end of this you'll have some ideas to like take away and actually like put into practice.

**17:48** · Um So, yeah, that's that's a history. Um and I quite like that quote that uh Andrei talked about where the frontier doesn't really shrink, it just uh moves. And so, what I wanted to talk about a little bit is some very simple uh kind of a harness patterns that we've been playing around with internally that we use to to build these like very fancy one-shot demo apps. Um but also, you know, we're experimenting with this stuff in post-training um in in RL.

**18:17** · How do we make our models and and just their general behaviors more adapt at autonomous work?

**18:27** · So, if you've ever tried to get um an agent to try and review its own PR, um you'll kind of understand uh where this is going.

**18:40** · So, this general uh idea is shamelessly kind of stolen from from GANs uh generative kind of adversarial networks.

**18:51** · So, you have this uh generator kind of model, and then you have some sort of discriminator, um and uh you have some sort of adversarial pressure between them.

**19:01** · You know, the generator builds, the evaluator grades, um and the whole idea here is we're splitting up, you know, the context windows, uh uh, system prompts, uh uh the jobs entirely, right? The evaluator here isn't just reading diffs, but it's actually using playwright, um, to open live pages, click around, try things out, um, and then it eventually hands back whatever critique it's decided back to the actual generator, and you, you know, you kind of continue that loop.

**19:29** · Contrast that with what most people today are doing, which is kind of using one cool code session, telling it to check its own work, um, and kind of loop that way. So, the obvious question for me at least is, you know, if the evaluator is also just an LLM, um, why doesn't it just rubber stamp it, too?

**19:50** · And so, the key idea that we're kind of exploiting here is, um, yes, the evaluator is still, uh, a large language model, and yes, it's still going to be biased towards, uh, liking large language model style outputs, um, but tuning a standalone critic, um, to be harsh is actually very tractable, but tuning a builder to be somewhat self-critical, um, is is not.

**20:16** · I think a really good analogy for this, right, is the same as humans. Um, it's very easy for, uh, me to, you know, critique, uh, a lovely piece of artwork or, you know, a fine meal, um, much harder for me to actually go ahead and like, you know, paint that, uh, or or cook that meal myself. So, what we're doing here is exploiting the gap between the ability of an LLM to be kind of a critic, uh, versus a a generator.

**20:42** · So, the next thing I kind of want to talk about is like, how do you actually think about designing, uh, these critics? It's very similar to the process of creating good evals, but in the context of full stack apps, there are a lot of fuzzy kind of areas which go into what makes something good. It's not just does it work, but does it look good? Does it feel good?

**21:03** · Um, is there an element of taste, um, uh these kind of products as well.

**21:08** · So, this is where we've been doing a lot of experimental work um especially when trying to, you know, imbue Claude with design taste and post-training, um but also, um you know, create these kind of front-end design skills that we kind of put out there and just generally improve the the front-end design uh ability of of our models.

**21:27** · So, the way we think about this is most people say you can't grade taste, but, you know, we think you can if you have a a strong enough opinion on it and you just kind of write it down. And so, the way we do this at least is with kind of creating a rubric with four criteria, uh design, originality, craft, and functionality.

### Evaluating subjective output with rubrics

**21:48** · Um we actually weight this towards uh design and originality.

**21:54** · Um we've kind of shifted the weightings between these four things uh depending on which model's in play, but at the moment, you know, Opus 4 6 is pretty good at at at functionality already, so the problem that we're trying to overcome is how do we prevent things like, you know, purple gradients, general kind of AI slop type aesthetics in general.

**22:14** · And we kind of just go ahead and calibrate this with a few-shot examples um on reference sites, so the evaluator's kind of taste converges on our own.

**22:23** · Um and let me show you an example, I guess, of what this actually looks like uh kind of in in practice. So, this is just an example um of a model uh going through this similar kind of loop, generator, uh evaluator launches Playwright, navigates screenshots, scores on those kind of four criteria, writes critique, and then hands back to generator. So, all of these examples are just HTML and CSS only um that I've gone through here for maybe 4 hours, 5 to 15 rounds.

**22:55** · Um I think the interesting thing here, um which is quite unique and something which you wouldn't necessarily get um if you're just using a single kind of agent loop is that the thing pivots, right? So, imagine the generator gets stuck on one of the four criteria. Let's say it's like really struggling and constantly scoring low on originality. Um, you know, uh this kind of GAN style harness which we're using will just throw the whole thing out and try again from scratch.

**23:24** · Um, whereas uh in a single pass generation or a RALF loop, um it gets it keeps trying to patch the same thing. Uh and this kind of ability to kind of course correct over very long kind of time horizons is something which is quite unique uh to kind of breaking down uh different roles uh that go into to building something.

### Introducing the 'Planner' role

**23:45** · So, that was just an insight into, I guess, how we think about the front-end component. Um but how to go from kind of like just nice pages to fully working apps, we added uh one more role.

**23:57** · Um, a planner. And so, again, sounds very simple. Um, it's ultimately just taking kind of a one-line prompt uh and then breaking it down into uh a very deliberately high-level uh kind of spec.

**24:12** · So, what it does is actually just spec the granular um uh sorry, it kind of specs uh the general workflow into a series of sprints. Um, what it doesn't do and and what most harnesses do today is necessarily try and plan the granular technical details of of the product. The reason being is, you know, one, it's very likely to still make an error, but when it does make an error, it's going to cascade um through every single one of these sprints uh and kind of magnify errors over a multi- multi-hour time horizon.

**24:46** · If you kind of squint uh at this, um this is kind of just, you know, a very simple kind of like PM, uh IC, and and QA kind of org structure, right? Like we didn't invent this.

**24:58** · We just kind of gave each role its own kind of context window.

**25:02** · Um and the bit which is kind of interesting, I think to talk about, is the glue between the generator and the evaluator in this kind of setup.

### The generator-evaluator contract

**25:12** · So, before the generator actually goes ahead and writes a single line, we have the two agents basically negotiate what done actually means. And so, let's say the generator proposes, "I'm going to build X feature, and you should verify it by testing Y."

**25:33** · The evaluator might push back and be like, "Actually, the scope is too big and those tests that you propose are a bit too weak, and you've missed XYZ edge case." And you basically have this back and forth via files on disk. One writes the markdown, the other reads it, and you iterate until both agree. And then once you kind of reach that kind of condition, um then you actually start building.

**25:59** · And then the evaluator kind of grades against the contract that those two agents have decided between themselves, not the original spec which the planner has kind of one-shotted at the beginning.

**26:10** · And why this matters, as it kind of bridges this kind of idea of kind of user stories, i.e. the spec, and kind of converts it into slightly more tangible, testable kind of assertions, some sort of contract, without the planner having to over-specify kind of up front.

**26:29** · And I think this is kind of the key innovation that the Ralph loop never really had. It had a kind of fixed plan.md style kind of thing, but nobody on the other side is necessarily arguing with kind of the main loop.

**26:46** · And again, it comes back to like having these separate context windows and adversarial pressure.

**26:50** · So, let me show you an example of a very simple prompt that we had in a solo kind of loop versus the harness that we just discussed. So, the prompt was basically build a retro game maker and and that was it.

**27:10** · And I'm not, you know, going to going to try and convince you that this is like necessarily the most cost-effective or most efficient way to try and build an app. Um as you can see, one, it takes at the moment an extremely long amount of time. Um two, it's very expensive.

**27:27** · But also, as we'll see in a second, a lot of the stuff actually starts working only with this harness when it didn't in a kind of a solo loop. So, this is what it kind of looked like the opening screen at least when we didn't have the harness.

**27:43** · Um pretty simplistic, a little bit boring, but it still looks nice, right? If this was the whole app, uh you'd ship it, but it's kind of the bait, I guess, if you will.

**27:54** · Um this was kind of the sprite editor, if you will. Again, it still looks fine.

**28:01** · The canvas is there, the palette, the frame timeline, live preview. Maybe it's a little bit cramped.

**28:07** · Um uh and the color picker is just black swatches, but it it kind of works.

**28:11** · Clearly, the agent like actually did understand what it was trying to do.

**28:15** · Um and then the one thing that you have actually has to do, which is play mode.

**28:22** · Entities rendered, score, health, all the other things which go into an actual game. Pressing the arrow key does nothing. Pressing a space key did nothing.

**28:32** · Um the agent really didn't have any idea um how to test itself, what it actually meant to play a game and actually succeed. Um and yeah, this is kind of the same prompt, same model, and this is kind of the the breaking point. It kind of looks done on the surface, but when you try and actually push it to its limits, it just it just kind of failed. And then, if we ran the same prompt with the same model, this is kind of what it looked like when we ran the harness.

**29:02** · So, this was about, yeah, 200 bucks, 6 hours.

**29:06** · Um, first up, it decided to name itself Retro Forge. Um, it decided to like create a a new project dialogue, um, have a very nice canvas.

**29:17** · Um, none of that was in our prompt. So, this is all the planner um, deciding like, okay, uh, here's what the product decisions should look like. And then, you know, the two other agents deciding, right, how am I going to test this?

**29:30** · Um, if we look at the sprite editor, um, we have kind of a full 54-color palette, um, the kind of eight-bit preset from the project dialogue flowing through.

**29:41** · Um, you see the sprite at actual game scale.

**29:44** · Um, it's a lot more complete, uh, as a product in general.

**29:50** · Um, we had a whole new kind of AI-level assistant. This is where it's kind of started to get recursive.

**29:58** · The planner had decided like, right, we should have some AI features, um, uh, which is just a very vague line in the spec.

**30:05** · And the harness turned that into a full AI-level assistant inside the app that it it was building. So, you know, someone could come in and say, "Hey, create a castle uh, with sprites guide guarding it, let's say." Um, this is something which a solo run would never even attempted to look at. Um, without a planner, that phrase just becomes never even comes becomes like a work item to look at.

**30:29** · Then, finally, I guess, um, uh, the actual results kind of applied.

**30:35** · So, play mode, um, you know, you have this whole debug HUD in the top left, um, which you can clearly tell is to make life easier for the for the for the evaluator, for example. Those numbers are live. The physics loop is actually running. Um arrow keys work, the player moves, um collides with castle walls, um because the evaluator actually launched the game, tried to play it, knew necessarily like what what features need to be tested to make this game kind of real and successful.

**31:08** · Um and the difference between this output and you know, the previous output is entirely just scaffolding. It's a very simple loop ultimately, but the results are quite startlingly different at least.

**31:19** · And so, in case you're curious, the kind of things which the evaluator did catch, um are pretty basic kind of stuff. It's things like um you know, fast API route ordering, um passes every unit test but might actually break in prod, the evaluator, um catching things like the delete key, um having some kind of Boolean logic bug. Um Again, these are things which were only caught because the evaluator's actually using the app.

### Specificity in contracts and debugging traces

**31:48** · Um it's things which might get through CI in a rough loop, um um but this isn't, you know, that level of specificity isn't something which happened by accident.

**32:01** · And so, this is the kind of level of detail which these models are kind of going to at this point in time. So, we talked about the kind of contracts that the generator and the evaluator would write between themselves. For this app, um it was decided that there were 27 contract criteria. That's the level of granularity which we found, you know, that you really need to make findings kind of actionable.

**32:24** · If you have vague criteria, you have vague critiques, the generator just kind of shrugs and does things, whereas if you have granular criteria, um the agent knows, okay, I need to fix this exact line.

**32:40** · What's kind of interesting I thought, you know, uh and I want to be honest about this part, is that out the box, Claude is a really, really bad just general QA agent. Um Andrew talked about this uh a little bit uh in his bit, right? But the same kind of six-fency and generosity bias that everyone hits with uh general elements of judge systems also applies here.

**33:01** · Um Most of the time in early runs, it would, you know, the QA agent would kind of find a bug uh and be like, uh fix it later, might take 2 weeks. Um uh and then just kind of like be done with it. Um So, we actually have to spend an exorbitant amount of time like going through um trying to tune, you know, small layout bugs, edge cases, and and kind of feeding that into the prompts.

**33:26** · I wish there was some kind of secret to to actually doing this, but realistically, the whole uh kind of art to building this system and making it good uh was kind of reading the traces. Um The primary debugging loop was this, and not necessarily running more experiments. It was reading what the agent actually did, um finding where its judgment diverged from um ours as humans, and then tuning the prompt for that.

**33:51** · It was the same kind of muscle as reading kind of a stack trace. Um Um One kind of tooling tip that we had was kind of piping agent transcripts uh into files, uh kind of grapping them uh with another agent, or having another agent kind of play through them, um and then kind of update the prompts itself. So, you have some sort of like closing the loop even on just like building uh this harness out.

### Adjusting harnesses as models evolve

**34:14** · So, the last thing I kind of want to talk about was um how to think about adjusting your harness as these models kind of get better in time. I think there's a lot of like discussion around whether harness design is kind of dead or null, especially where, you know, models that I mean, when I wrote this, it was just Opus 4.6, but even like Mythos, you know, level level models.

**34:36** · And I think the key thing that we note noted is it's really important to get a feel for what the kind of spiky behaviors of any individual model are, and then try to adapt your harness to kind of fill fill the gaps. So, um Andrew talked about this a bit, but you know, context resetting between sessions. We kind of dropped that entirely. Opus 4.5 he started really bad kind of context anxiety. Um whereas Opus 4.6 just, you know, doesn't. Um uh as part of the part of post training that.

**35:08** · And so, one continuous session and compaction was was more than more than enough to handle very long sessions.

**35:15** · Sprint decomposition. Um we don't have a very strong opinion on this, but it was something which was really really critical to getting Opus 4.5 to work. Um but uh Opus 4.6 was able to kind of hold a a 2-hour continuous build coherently uh in a way without Nassy having to be force-fed one feature at a time. Um the cadence at which the evaluator should run. Previously, we were running at every single sprint per se, whereas now we were just running at at the end of a one-shot generation from the model and then passing back.

**35:46** · So, the harness is still the same, we're just kind of simplifying the specific uh kind of loops um and the kind of recipe that kind of goes into it. The lesson isn't necessarily our harness was wrong, but rather it was right for 4.5, the frontier moved, um and we ran a simplified version uh to see how it worked.

**36:08** · So, this is kind of what the final kind of setup kind of looks like today. Um Having that planner generator evaluator loop is still the kind of core of our system, but you can see we kind of ditched a bunch of the other kind of um kind of components uh that made this slightly more complicate complicated than it had to be.

**36:28** · Um we also, as kind of mentioned, big fan of just using a file system for shared state um instead of kind of leaning on context windows for very long-running agents in general.

**36:39** · And this is an example of the simplified harness running with one of our latest models. Um again, very very expensive, but you can see it's actually roughly like half the cost of the previous runs. Um just because we're kind of doing things in a slightly more simplified manner, but it's still running over a very extended period of time.

**37:04** · And so, this is an example of a DAW, which is basically just like a a music creating app, if you will. Um the agent sets the tempo, a key, it lays down the melody, it builds the drum tracks. This is the evaluator um actually going and testing the app itself. Um we did actually listen to like the music in this.

**37:30** · Um obviously, Claude can't hear at the moment, and so the music was pretty trash, but the app was really good in general and pretty pretty fleshed out, which, you know, a model ago, this is something which would never have worked. Um but this is something which is possible with just a couple rounds. Um and this is kind of that that meter curve which Andrew was talking about kind of really in in action.

**37:55** · And so, I kind of wanted to close just by saying you don't actually need, you know, our internal harness to to go away and start thinking about this. We are constantly trying to ship bits of, you know, these primitives into Claude code directly, but also there's nothing stopping you from just going ahead and building something similar to this kind of on your own. So, we just shipped, you know, auto mode is probably my favorite thing for slightly more, you know, safe safe yellow, if you will, instead running dangerously escape permissions all the time.

### How to build your own agent harness

**38:24** · Um, we already have custom sub-agents as a primitive, right? Your evaluator, your QA role, um, give it a harsh system prompt and a very detailed re-break. Um, Playwright MTP or Claude for Chrome MTP, already extremely extremely good, uh, at um, web app stuff or just use computer use if you're building kind of native apps. Um, and skills, again, a very nice way to package your kind of grading rubrics into your kind of general development flow. Um, so, yeah.

**38:54** · Five things, if you're kind of taking a photo, this is the the slide I would say to to to kind of remember. Um, self-evaluation, very much a trap.

### Key takeaways for long-running agents

**39:03** · Just use an adversarial evaluator. Um, compaction doesn't necessarily, uh, does not equal kind of coherence, right?

**39:11** · Lossy summaries really drift. Um, structured hand-offs, uh, and clean contexts, uh, are very good patterns that I've seen. Um, don't think that's a subjective quality isn't gradable. If you have a strong view on what something should look like, um, then kind of force yourself to write it down.

**39:28** · Um, we found this made kind of a really massive difference, uh, to the quality of kind of apps, um, that a model was able to generate. And then kind of finally was really just, you know, sit with the model, read the traces, um, uh, only then can you kind of really know what bits, uh, of a scaffold to delete, um, what bits to keep, especially as the kind of frontier, uh, moves. But, yeah, that's it from me.

**39:53** · Um, thank you very much for listening. Um, and yeah, check out our blog post. Um, but, want to just open up for Q&amp;A in general, cuz we've been yapping for like, you know, close to an hour now. So, um, if you have any questions for me and Andrew, just fire away. We'll do our best to to try and answer them.

### Q&A session

**40:15** · Yeah.

**40:18** · Thank you. Uh Joan from Paul side.

**40:21** · Uh one question for you, when you uh improve the evaluator by like reading the logs and improving it, is that uh sort of like on a per project basis or more of a secret sauce that you you reuse across project? The goal the goal is very much trying to do this in a way which was reusable, right? Like I think anyone can tune this in a way that's that's creating, you know, a very specific type of app, that's fine. At that point it's not that different from, you know, going ahead and just prompting tool code yourself and and doing it, right?

**40:49** · I think there were just the the key was like what are the common patterns uh that you can kind of draw across the model weak points, right? So, talking to that kind of front-end design piece, we knew like what we thought good design would be, right? You could give examples like this is what, you know, um uh a read before prompt looks like. This is what AI slop looks like, right? Um and that generalizes quite well, so yeah. This was all around web apps, but it could quite easily apply to to other kind of things as well.

**41:24** · Thanks for Oh. Test. Oh, yeah. Uh Thank you for presentation, very interesting. Uh I was just wondering what is your view on um uh concept of dump zone and smart zone of a model. So, I understand like before it was around 40% and now with 1 million context it's about 100K is what I understand and the way how I understood Ralph loop Ralph loop was designed is to kind of negotiate this problem.

**41:54** · So, basically we keeping the model always in a smart zone, so basically trying to slice the task below 100, so it execute the task within the 100 context zone. And what I understand from your presentation, you can like advocating not to use it anymore so because we can now rely on a compaction and so on and so on. Is it like something you use suggesting to do or we still with like a Ralph loop model still has its own place given the smart and dumb zone concept.

**42:27** · Yeah.

**42:29** · Yeah, well, I suppose from Ashish's presentation and mine, you see that the 1 million contacts window is now GA, and so you have sort of a bigger context to use. The models are more agentic, so they can sort of maintain coherence for a longer period of time within that context window. And then actually, with the release of 4.6, we decided to move from new context windows to just a single long-running continuous session with compaction.

**42:55** · So, I think I mean, the whether or not you use multiple fresh sessions or just one long-running one is probably still up to your use case and your evals, depending on what you're seeing as working best. But at least for sort of this general generator-evaluator pattern with Opus 4.6, we saw that it was possible to use a single session. I don't know if you want to add to that. I think I think it's also just like a temporary problem, right?

**43:19** · Like context rot is you know, a failing of like today's models to some extent, and much less so than, you know, even just one model generation ago. So, is there a place for for you know, the type of thing which you're discussing? I think yes, depending on your use case, but you know, it's not like a it's one of those pieces which I'd look at as like, okay, as soon, you know, I'd be I'd be kind of hunting for the model release right and kind of strip it out, let's put it that way.

**43:53** · I always have a lot of FOMO around Playwright. I mean, you said Playwright MCP, is Playwright skills. Do you Can you speak to how to improve the Playwright Cuz like, I imagine I would like to like have my browser open and then I can see the model working through and then maybe I could steer it, you know, a few tabs open.

**44:15** · But like, yeah, what is there some innovation that I'm missing out on or is is Playwright MCP really what you recommend people use?

**44:24** · Playwright MCP or just use the code for Chrome MCP, which is like a a slightly more robust thing, I guess, around browser control.

**44:33** · I mean, I don't know why you want to watch it do things. I mean, you can, but I think that's like a a trust gap, right, today?

**44:39** · Like, you know, the whole point of what we try to get to do here is is like you set something off, uh you trust it to do it do the work and test it and you have the confidence that it's doing it correctly and you come back to it. Um and that's where, you know, yes, there's going to be some iteration at the beginning where you're like watching, reading the traces until you get to a point you can trust it. But um at least internally, right?

**44:57** · Like, when I'm when I'm doing full stack out there, um I have got to a point now where I'm like, "Okay, with Opus 4.x, I can like reliably trust the model to go ahead, read um network errors, um

**45:14** · uh uh console errors, actually navigate an app, zoom in where it needs to, um the vision is now good enough on these models that it can like identify overlapping text on elements and things like that, whereas that just wasn't the case uh uh until realistically the last, you know, generation of models.

**45:31** · So, yeah, I would I would recommend um I'm curious, like, with the generator evaluator pattern, what happens?

**45:51** · Do you can you throw unlimited tokens at it or will it stop because the evaluator is not good enough? Like, can you tell me more about that?

**46:01** · Sorry, do you mind clarifying? I kind of missed that part.

**46:03** · okay, let's say uh um I say, "Okay, create like a very cool game and with some features." You have the generator-evaluator pattern that um creates like the contracts, builds the apps. If I um then it will give me back something, right? Um can I restart it again and say like, "Okay, make it better. I'm not happy about it."

**46:32** · And generator-evaluator will pick the pattern will pick it up and make it better. Yeah. Or will the evaluator be not good at the one point and just say like, "This is it."

**46:44** · Um I think that's I mean, one festival like if you want to like a some some level of human loop in this process, that's that's like, you know, just implement hooks at some point in some point in this in this loop. Um I think the bit which was kind of surprising to us um uh was with this this general pattern and especially with the kind of 4.6 atom models, both Sauna and Opus, it was extremely willing to like throw away everything, you know, even if it'd done kind of 10 passes at something.

**47:14** · It was kind of very happy to just like throw it all away and start from scratch if for some reason it wasn't able to like hill climb against the rubric of the evaluator in a kind of effective way.

**47:24** · Um and so that's why kind of when we're kind of when we were playing with this kind of thing, we didn't naturally like lean towards having some kind of resume or human in the loop uh type intervention system, I guess.

**47:40** · And we didn't really observe We expected to, but we didn't really observe um that kind of behavior which you were talking about, where it kind of just like evaluator's like, "Ah, just give up. Let's just like pass it on, shall we say?" Um Yeah, it was just much more willing to like throw away everything and and restart. And that was just a behavior which we never saw when it was the generator itself or was kind of being proud of its own work and being like, "I'm not going to restart this whole thing."

**48:05** · Um so yeah, I mean there there's been example which I've seen where the evaluator is like it kind of gets fed up and is like, "Right, this approach you're taking just obviously isn't working.

**48:15** · Can you just like delete everything and restart?" Um which I don't know about you guys, but while coding regularly, I often I often do uh as a human to like, you know, just benefit from fresh context windows, not have to deal with an an already messy code base, etc. So it's quite neat seeing models now also kind of get to that point.

**48:35** · I'd also just briefly add obviously you can then open that code base in Cloud Code and continue where you left off. Um sort of goes without saying. And I think we're generally thinking about what the workflow looks like if it's sort of more back and forth um cuz there's sort of the extreme of build me a really complex gaming application that you don't know is it going to take 3 hours, is it going to take 20 hours? Um it's a bit unclear, so maybe there's sort of something in the middle that's like more of a yeah, feedback loop.

**49:06** · I um I really like the idea that you have of like you know, there's a there's a human element here where it's like, you know, PM, engineer, evaluator um PM role is a lot of the time is like scope creep and keeping the time going and stuff like that. But you're just like letting this off. You're letting engineers go play in the sandbox for ages.

**49:29** · Um is there a harness loop that needs to go back to the planner eventually? Does it need to move again? Um well maybe because we're engineers, we just decided like, "Ah, screw the PM. We'll just shove it to the side." Um yeah.

**49:44** · We actually Well, this is where the kind of like that kind of contracting piece between the the the kind of uh evaluator and the builder work quite well. For context in that, we typically like insert the main spec that was generated by like the PM per se uh into these sessions regularly. So that, you know, it's always a reference point um for like, "Okay, this is what we're still actually trying to build."

**50:09** · And the main function of them, the builder and the generator, uh sorry, the builder and the evaluator is just to like figure out the exact feature set and tests and contracts that say that actually satisfy that spec. Um but the reason we don't is because we don't want the planner to be like a core part of this loop. It should be very high level. It should Its purpose really is just kind of set out like kind of the hard outer lines of what this product could could be.

**50:41** · Uh but its job is not necessarily to come in and intervene and be like, "Actually, this is like an impossible feature. We should not do this." And and and edit itself. Um we kind of want to keep that context relationship between just uh just the builder and the generator. That being said, like this loop I've applied it in lots of different ways. It doesn't have to just be, you know, one generator and one builder, right? Like that adversarial kind of trade-off can be applied to like a workflow consisting of multiple separate agents, right? Um I don't know.

**51:12** · It could uh if you're trying to do uh I don't know, generate evals, let's say. You could use a similar harness to be like, "Hey, generate a uh it could be like planner generate a synthetic a generator for synthetic data set, right? Uh with a QA agent. Then hand off to uh like an integrator which like actually wires up something. Also has a QA agent.

**51:33** · Then has like a final kind of a You can basically add this kind of generator evaluator thing into a multi-step workflow uh where each like builder that maybe has like a slightly different function per se as part of a a longer workflow. So there are different ways in which you kind of keep things on track depending on the task and break down uh this this general pattern into slightly more specified you know, uh tasks or workflows if that makes sense.

**52:01** · Can you uh you mentioned that uh some of the later tasks could not possibly be done by an earlier model? Can you talk a little bit about your process comparing the tasks on the different models? Like do you fire off the same task on Opus 4.6, Opus 4.5, Sonnet or is this sort of artisanal uh co-evolving uh harness model uh setup uh obviating that?

**52:32** · Yeah, I mean I suppose we walk through the history a little bit. And if you look at say the first blog post on long run running agents versus the more recent one, um there are some pretty significant differences there. They are one being what we were just discussing that the initializer agent would build this super comprehensive spec of say 200 different features um and then um in then the loop would have to actually go and execute against every single one of those features, which may lead to say incorrect design decisions, but it's sort of forced into that behavior.

**53:03** · Whereas I think now you're able to have sort of a more generic creative direction set with say Opus 4.6 and then just having this this loop of the generator evaluator. But it it it does Yeah, your model selection does inform your harness design very much so.

**53:20** · Um of course, in a perfect world, you could just sort of throw everything at say Opus 4.6, but if you have cost concerns, for example, maybe you do use Opus 4.6 for planning and then Sonnet 4.6 for for the coding or the execution, that's something that we we tend to see quite frequently. Um but again, if you're building specific sub agents for each of these, you probably want to have some evaluations to be able to understand for that model and that prompt how it's performing against that task and then just optimize.

**53:52** · Do you have any advice on moving beyond sort of these one-shot applications to long-lived products where you're looking to make changes days, weeks later?

**54:01** · And what sort of artifacts you need to persist to future instances to be able to know what has come before, what can I change, what should I change? Yeah, it's something which we're working on.

**54:10** · Um like right now, like we use like similar patterns for just a bunch of random stuff internally, shall we say? And so at the moment it's like set this thing off, it's running, you know, um on a remote server somewhere. Um I'll just come back and check it like after this talk, let's say. And then I kind of iterate on it kind of manually in code directly, like polish any rough edges, that kind of thing.

**54:33** · I think in terms of the way that you're actually like setting up this harness, just having um this is why we kind of default kind of using a file system of state for this kind of loop. One, because it's just very easy for another model to come up and and grep through and and pick up what what's been going.

**54:52** · But one thing which I like to do is kind of embed a little bit of prompting throughout this kind of loop, which basically tells it to write kind of learnings and state to some kind of JSON file because the model doesn't kind of overwrite that too much. Um and so the nice thing about that is you're basically just leaving like breadcrumbs for another model to come and pick up.

**55:16** · So honestly, the the key thing for me is like how do I instruct this this harness to leave crumbs for a human to come in and then use code code on top of. So generally, it's like hey uh the shape of that file might be like uh tried this, evaluated, found this bug, uh implemented this fix, this fix worked, yes, tick. And then continue.

**55:39** · And you have kind of like a time stamped uh kind of time log, if you will, of like everything the model has tried, the fix it's made, and the final state. Um and then also uh having some sort of live updating kind of set of docs, if you will. Just very high level, here's the file structure. And then those two files, to be honest, are more than enough for Claude code and a human to come in and start iterating on the app with. But that's what we're doing at the moment.

**56:06** · Mhm.

**56:13** · Perfect.

**56:14** · Um So, it's very interesting to hear the Oh, yeah. First of all, congrats on the presentation.

**56:20** · Thank you.

**56:21** · Um and then I was wondering, there are kind of two approaches. Like, you have the agent team where multiple agents interact with each other. And then the explicit generator critic uh setup. But what are the uh because in sense, like, the agent team has the same setup where the main agent instructs someone and then can act as a critic for the sub agent.

**56:47** · But what are the current failure modes that causes us to still need the specific generator critic harness instead of just the agent uh team itself?

**56:59** · And then what's your estimate of how many model generations we would need to just completely rely on the agent team Mhm.

**57:10** · Maybe Clearly.

**57:11** · I mean, I can I can sort of address the first aspect of that. So, I mean, one of the limitation of Firstly, Claude code is is using the same harness that that is the agent SDK.

**57:21** · So, you can Technically, you should be able to build this type of pattern into Claude code. Um agent teams is a useful framework for potentially doing that because you could say have the the generator and the evaluator sort of intercommunicating or it maybe it's the generator is sort of the main agent and and the evaluator is say a member of of the agent team. Um but I think it's it's sort of evolved more so from that first blog post that I shared. I think that was like the the result of that to some extent to try and make that more generally available.

**57:53** · Um but one of the things you're limited by obviously is like cloud code would just have to run on your machine. I think with the agent SDK you can also just run it in more of a cloud environment and a sandbox environment for long periods of time and um without it it failing um or you having to run the caffeinate on your machine.

**58:14** · Um but I think yeah cloud code is a good testing ground for building out any of these types of harnesses to experiment and explore and see what works before maybe you build it into the agent SDK and then actually deploy it as its own application.

**58:28** · Um and yeah I I mean again I would just experiment see if agent teams is something that makes sense for you or if maybe just using regular sub agents or some other framing of it it works better. But yeah I think people are using agent teams like a a ton. I I don't I don't know if you Yeah well this is the thing is like I don't think we have like a super strongly opinioned viewpoint on like um what is the best at any you know set up at any given moment in time. And so Boris always like updates his tweets like this is what I'm doing now.

**58:56** · Um like agent teams is something which a bunch of people loved internally um and so we were like okay let's ship it. Let's see what people think about it in the field.

**59:08** · Um I'm not saying we will but it you know we regularly unship things as well. Um and I do see the generator evaluator kind of pattern is like a a subset of that like teams approach to thinking about sub agent design. Um not necessarily like contradictory to that per se. You know you can imagine like you know classic language teams breaks down is like, you know, front end, back end, um some sort of integrated between them like sub agents. Each of those probably deserve their own kind of critic, um a kind of agent pairing with them, for example.

**59:38** · Um so, you can kind of see how the two concepts like overlap. Um just the general idea behind this is you know, most people when they're running cloud code, at the moment, their goal isn't to like one-shot an app over like 6 hours. And so, that isn't necessarily primitive, which we like by default like ship uh there.

**59:57** · Um so, yeah.

**1:00:05** · One thing I was wondering, have you also tried like a critic that gets the context of the generator?

**1:00:12** · Then you I feel like if it has some clue about the traces of the agent or like the executor. Yeah. Is that currently the case in the the critic? Uh we do we use like a handoff pattern. I I would be very hesitant of that. We did try this, but this is the whole like muddying of of like thoughts between the two two model streams. I think it's actually much more effective to just let it judge the output. Um and just provide, instead of being like, "Hey, you made a misstep when building this by doing X, and that's what's resulted in this issue."

**1:00:45** · It's much more effective to just have the value to be like, "This is an issue." and then let the generator purely reflect on its own work and then try and figure out how to fix that issue. Um otherwise, you kind of just see we found that it's very easy for the model to like kid itself that something is working or not, and that feed into the evaluator as well.

**1:01:04** · And last note on that, I think it would then be interesting if you if for the training team, if you could train like the the generator to predict what a critic currently said. Yeah. Like do you do you have it be more honest about what it did and stuff?

**1:01:20** · Maybe we'll work on that. Um I want I wanted to ask more about traceability. Like I use um superpowers or like my own prompts to generate like multiple sub-agents to implement my let's say my software or app. But what happens is like I don't really know. I want to go back and see where it actually went wrong.

**1:01:45** · Even but then I'm not able to figure out how to find those traces. How do What do you use for traceability is my question. When you have so many like five, six agents running in background like um yeah. Um to be honest, a lot of it is just reading through traces by hand. Um we do a lot of that. I'd say Anthropic in general just like reading through traces by hand.

**1:02:08** · Um we also just like have, you know, hacked together various things where we you know, point Claude at uh a bunch of traces um uh with some custom prompts uh to try and identify like issues with the loop like this is where it veered off and whatnot.

**1:02:25** · Um we kind of use that as like a first pass I would say maybe to just kind of like see where something where where like where something might have gone wrong.

**1:02:33** · But to be honest, by far and away the the the best approach at least that we use internally is just just reading reading the traces by hand. Um only then do you kind of like truly get to kind of relate to what the model is trying to actually do.

**1:02:45** · Um yeah.

**1:02:51** · Thanks for the talk. Um I have a few questions. Uh first of all, how do you measure the quality of a Harness agent pair?

**1:03:00** · Is it It feels like a vibe check. Like it's a green field. Uh let's build an app. Mhm. Um but let's say you're you're going into a new project, maybe brown field. Um it feels like a vibe check or some kind of art. Can you make it more scientific or is that just not feasible?

**1:03:19** · I I mean the way that we thought about it at least, right? Is like we specified the rubrics in kind of extreme detail at the kind of generator and and evaluator level, right? So we talked about for example those four kind of criteria, that's very high level, the rubric which we use for like design taste, let's say.

**1:03:35** · And so we set those up for various bits of this app, right? So that can be just for the design element, maybe another piece for like how we think about um uh kind of API design, let's say, um code quality, whatever. And we kind of use those as the uh kind of various set of rubrics which we're hill climbing against, right? And then the evaluator's job is to, you know, encourage the builder to hill climb against those.

**1:04:01** · And so for any given app or output, we have like a signal of this is where the model started on those those kind of criteria and this is where we kind of ended up. Now, that's less useful for like kind of like you said, working on um kind of newer codebases, but it still applies, right? Like you could point you just have to start the loop in a different way. Um you just point the evaluator at a given codebase.

**1:04:25** · Um and be like, this is where we are now, and then uh give it the the spec of what you're trying to achieve, and then let the loop kind of iterate against those kind of criteria. So it's not like a necessarily a one set of evals at the very end, it's kind of like here are the criteria for what we think good looks like, then letting the uh evaluator and the generator come up with a set of kind of tests uh or contracts that need to satisfy, and then letting it just as the harness hill climb against those.

**1:04:52** · Um that's not super comparable across different products and runs, um but it's it's very useful for for yeah, within a product or run. Also, this um this particular pattern is it's great for greenfield, like you said, but it's quite opinionated. You know, I might be using React, like Postgres as a database, and Node on the back end, but your brownfield app might be using something totally different. Or the rubric that we've created for what we think, you know, good sort of design patterns are would might be totally different in your project.

**1:05:22** · So, I think that's why we're proposing this as more of a pattern that you would then um tailor towards, you know, your application. Thanks. Um one follow-up question.

**1:05:34** · Does it work?

**1:05:35** · Yeah. Um do you use uh do you like direct the harnesses individually and how do you cooperate as a team on that? I find it's very hard to like uh when I share my screen and I'm working conversationally, it's very hard for people to keep up. And the other way around, I find it cumbersome to dictate what to prompt.

**1:05:55** · Uh how do you cooperate as a team?

**1:05:57** · Do you have like team-owned harnesses?

**1:06:01** · Um Is it maybe a good feature for Cloud Code?

**1:06:07** · Um Yeah, maybe. Maybe I I think we we probably do have a lot to do on that, right? Like I think like um quite often what happens internally is that, you know, people come up with these ideas and then they're generally quite bottoms-up adopted by different teams and um it's then the job of the kind of original, you know, uh idea holder, should we say, which was Prithvi in this case, to kind of maintain it and make it kind of composable and generalizable for different teams, and different teams will adopt it and and you know, uh make it

**1:06:38** · useful for like their section of a code base, let's say. Um but we don't have any like good things in that sense. I think like, you know, even just observability, like some of the people talked about, right, is like a um generally speaking, a thing which is not fully solved yet for these like ultra-long-running uh agents. And yeah, interesting area of kind of greenfield software to explore.

**1:07:02** · Yeah, that is that is an interesting one, whether it should be sort of a collaborative experience in in Claude code or even Claude.ai. I think in just leveraging software engineering best practices with version control and making your commits and pull requests or if you're working on your own using something like Git work trees so that you're not overriding the the file system on multiple different features

**1:07:23** · all make sense, but yeah, I think when it comes to collaboration, maybe it's something that you know, doesn't happen quite as much because people just build these projects as Ash said from the ground up and then sort of present them to the rest of the company.

**1:07:40** · Um I Uh Jose from Mercedes-Benz research and development here. Hi, thanks for the talk. Um while looking at it, I thought, okay, it looks a lot like a scrum team, a feature team working for longer times uh on a on a product.

**1:07:56** · And I was thinking um how does human in the loop look like in that scenario? Um because you have you have this kind of sprint. Uh have you thought about a sprint review kind of moment where you where you as a human get asked, "Oh, hey, here's what we built the last 2 hours. Yeah. How's it looking like for you?"

**1:08:20** · Yeah. Should we subject our agents to saving trauma that like engineers go through of of of of scrum review?

**1:08:29** · I mean, like the whole point of this general the general idea which behind this talk and also what we're trying to do is like trying to be as like agile as possible, right?

**1:08:36** · Like how do we build harnesses where we don't need a human in the loop, right?

**1:08:40** · Like what does that look like? Are we using this today for everything?

**1:08:43** · Obviously not, right? Um uh but the goal is you know, this is this is a technique or a pattern which should extend very nicely such that you you don't have a human in the loop for most things.

**1:08:53** · If you did, right? It's like uh you know, hooks is probably the main primitive uh to just basically inject uh I some sort of specific type of stop condition that's say with an evaluator to basically like hand back to human allow some kind of develop a message input and then continue the loop would be like kind of a simple way to implement it.

**1:09:12** · But yeah, to be honest we're kind of exploring this from a what can we do fully autonomously kind of approach as opposed to thinking this as like here's gold code and and like how do we make this like you know more powerful per se. It's very much like a kind of more green field exploration of agent design.

**1:09:33** · No of course it's just like if if if I would get the chance to review it maybe a few hours in and I might be able to steer it in a way better way. Yeah. So that 8 hours later it's more like the one kind of project I would like to have. Yeah, I mean I get what you're saying. I think the question then is is like should that be like a permanent feature of the harness or is that just like a a thing which you should have like kind of basically prompted around when building the harness, right? So we would have that, right?

**1:10:03** · We would run this this this harness on loop and we would have you know we might spin up like 10 generations of different things and like three of them succeed and seven of them fail in like random ways.

**1:10:15** · And then we would just sit down with those seven, read through them, adjust the prompting of the main harness and then and then try again and then until we get to a point where we're like quite happy leaving it run leaving it to run fully autonomously. So ultimately that's still the end goal for us as opposed to being like basically giving up on the harness and being like okay we'll just insert a human here to to like cover for any kind of stability issues instead but rather embed that and bake that into the harness itself in the first place.

**1:10:46** · Have you used this to build anything like sort of like non green field or I guess like production like anything in good code itself or have you used it for actual features and and seeing it to the end?

**1:11:00** · Um I think I mean this does mostly extend to greenfield projects. I think for brownfield maybe you do need a little bit more control um as you're starting to build out your own rubrics and and patterns. Um I mean what we're seeing in brownfield is that if you look at the whole software development life life cycle it's not just the coding aspects that people are starting to use something like Cloud Code for it might be saying there's like autonomous monitoring happen happening um and then

**1:11:29** · that could feed into say generating some kind of like issue or or feature request that could then just feed into um an agent that would then go through to make the pull request and then there's sort of a pull review um already happening and then maybe you're just reviewing that before you actually merge.

**1:11:47** · So I think there there are other ways to automate the whole software development life cycle um uh in a brownfield project but I think this particular pattern maybe without a lot of testing within your project and building like customizing it for your project it's probably more suited towards brand new applications.

**1:12:06** · Have you built any greenfield apps that like I don't know like an internal tooling or anything like that that you've been using like not just a demo so like Yeah um to be frank I can't really like talk to like internal tooling too much but a good anecdote to this was um like a lot of the uh the new and fun stuff that you see in Cloud Code will will like um uh when I'm speaking to the team and working with them on on stuff use a lot of the lessons from this per se like in in like even just general

**1:12:38** · hands-on uh Cloud Code usage the way that they prompt you know the main uh model to to spin up a sub agent let's say and and and go after something or as kind of Andrew said right in kind of monitoring and bug fixing loops like, you know, when generating effects, like, should you have a separate evaluator and a generator go after the same thing? So, a lot of these principles apply. Um, is it like, you know, one for one this?

**1:13:02** · Maybe not, but it's like taking the good bits of this or whatever you think is is kind of applicable to a certain space and field and then kind of running with it in your own way.

**1:13:25** · Hi.

**1:13:26** · When you say you're needing the traces, is that literally just like the raw output or is there something more specific you've prompted it to like write this to file, these are the sorts of things I care about and I want to see? No, you got to read the whole thing. Read the whole thing. I do think it's like a a really important skill when building agents in general is to like empathize as much with the model. Um, this was like there's an interesting uh anecdote which we used when we're building, for example, the agent harness for Claude for Chrome, um, which is our kind of browser use thing.

**1:13:56** · Um, and we would run this like experiment where like imagine if, you know, you were trying to navigate a web page and click around where like, you know, you're effectively doing with your eyes closed and like every 10 seconds you just opened it to see like a static page and then close it again and then have to like do things. Um, and like really putting yourself in the shoes of the model um, is kind of like there's kind of empathetic skill set which you need to develop um, and the only way to really do that is to like spend as much time with these models, but also yeah, reading through line by line being like, oh, why did it think this? Oh, I can kind of see why it did that.

**1:14:28** · And then kind of adjusting the way you instruct it next time to to do better. Um, but that's why I think Claude for Chrome is very good was just really just like spending a lot of time as a team uh, closing our eyes and trying to navigate web pages, for example. So, um, yeah.

**1:14:44** · Mhm.

**1:14:46** · Yeah, and I think then actually taking those learnings and putting them into say your prompt templates or your Claude.ai MD or building a skill or generally understanding how to sort of avoid that type of behavior in the future. I know Claude code now has auto memory for sessions as well, so it's sort of constantly memorizing little things as it goes. Um but yeah, you can learn quite quickly from reading some traces like where things might be going wrong.

**1:15:13** · Cool.

**1:15:13** · Should we wrap up there? Um I think we have a few minutes left, but we'll be around in general in case you guys want to ask any questions or just chat. But otherwise, thanks for coming down. That's the session for today.

**1:15:24** · Thank you.