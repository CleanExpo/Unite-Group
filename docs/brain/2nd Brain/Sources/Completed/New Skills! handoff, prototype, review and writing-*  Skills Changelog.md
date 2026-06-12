---
title: "New Skills! /handoff, /prototype, /review and /writing-* | Skills Changelog"
source: "https://www.youtube.com/watch?v=DNqsMXH6Eog"
author:
  - "[[Matt Pocock]]"
channel: "Matt Pocock"
published: 2026-05-12
created: 2026-05-13
description: "I've added two brand new skills to my arsenal: /handoff and /prototype. Both are awesome for working with AI agents during planning and prototyping phases.0:00 Intro0:12 /handoff3:49 /prototype6:"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=DNqsMXH6Eog)

I've added two brand new skills to my arsenal: /handoff and /prototype. Both are awesome for working with AI agents during planning and prototyping phases.  
  
0:00 Intro  
0:12 /handoff  
3:49 /prototype  
6:39 Bug fixes and prompt improvements  
9:04 Writing skills in progress  
11:03 /review  
  
Keep up to date with my skills:  
  
https://aihero.dev/s/iDTI1S  
  
Learn more about the skills:  
  
https://aihero.dev/s/DVMypo  
  
Follow Matt on Twitter  
  
https://twitter.com/mattpocockuk  
  
Join the Discord:  
  
https://aihero.dev/s/FUCbUs

## Transcript

### Intro

**0:00** · The skills repo continues to go absolutely freaking nuts, cresting 70k stars just the last couple of days. And of course, I have continued working on it, so there is plenty more to look at in this week's change log. The big news is that I have added two brand new skills. The first one being this handoff skill, which I showed on Twitter and people went absolutely nuts for. Let's just read the skill because actually reading the skill really explains the skill this time. The description is we're going to compact the current conversation into a handoff document for another agent to pick up.

### handoff

**0:29** · Write a handoff document summarizing the current conversation so a fresh agent can continue the work. Save it to a path produced by make temp t handoff blah blah blah and read the file before you write to it. So what's going on here is we're going to end up with a temporary file inside our temporary directory of this name here. So the idea of this skill is it's creating some document which is not designed to be kept around.

**0:53** · It's just a handoff document between two agents. And the reason we have read file before you write to it is because in claude code it will error if it hasn't read the file before it attempts to write to it. So it's just an awkward little bit of uh claude code handholding there. And then it says suggest the skills to be used if any by the next session. That's an important part of what the handoff document needs to do.

**1:16** · It needs to not only hand off the content of the um context window, it also needs to hand off the vibe of the context window and the intent of the context window. So this means that if you're doing a grilling session and you hand off to another agent, then it will suggest that it continues doing the grilling session. Another crucial thing here is do not duplicate content already captured in other artifacts. Reference them by path or URL instead. And then if the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly. Now why did I create this?

**1:48** · Well, what I found I was basically doing this manually. So I was saying, okay, we're inside a grilling session, let's say, and we want to answer a question that can only be answered really by working with code. Now, we could just inside the grilling session just, you know, do some prototyping or something, but I always felt that was pretty awkward because it meant that the grilling session, let's say we're on 60k tokens or something, then I would only have another 40k tokens to prototype and give feedback and iterate before I started getting worried about the context window.

**2:18** · What I really wanted to do is just open up another context window with all of the context from the grilling session and just focus on that prototype. And that's where handoff really comes into its own. The way you use this is you just say okay claw code just hand me off to another agent and it will produce the document and then you take the path of that document and you just pass it into the new agent. You open up a new terminal and you've got it working in there.

**2:44** · So that means then that you can do your work inside there and you can even hand back to the previous document just by saying here's what we learned from prototyping. Now go back to grilling. There are two main patterns here. There's fire and forget where you basically just go, "Okay, I need to work on something in the middle of another grilling session or you notice a bug during implementation.

**3:04** · Okay, you just get it to hand off and this new agent will go and fix the bug."

**3:09** · Then another se another version of this is kind of what I call DIY sub agent, which is kind of what I've just described where you're inside a grilling session or a planning session. you realize you need to alter some code, you go off to another agent's context window, and then you hand off back to the original. So, it's kind of like you've got a sub aent, but you are in control of the sub agent, and the sub agent is not hampered in the same way that sub aents are. It's got all of its own context window. It can spawn sub agents itself. You get the idea. And of course, then it can hand off to uh other agents if you need to.

**3:40** · So, handoff, an incredibly cool skill, really useful obviously in engineering, but also useful outside of engineering, to be honest. That's why it's in the productivity section up here. The next one that I'm really excited by is in the engineering section and it is a prototype skill. Prototyping is really critical in uh especially AI engineering because you essentially need to use prototypes as research as spikes as a way to essentially flush out design decisions before committing to them. So these are throwaway prototypes. That's the theory.

### prototype

**4:10** · And what this is really cool because you think prototype and you immediately think UI, right? And obviously this is really really good for UI. But UI prototypes are really good for deciding what should this look like or what should this feel like? How should it behave on the page? But there's many other situations where prototyping can be really beneficial.

**4:33** · For instance, in business logic when you have any kind of stateful logic that changes over time. for instance, an entity in a database that needs to change based on user actions. You can answer that with a logic prototype. And the theory here is that you can build a tiny interactive terminal app that pushes the state machine through cases that are harder to reason about on paper. This has been really really cool because it just allows you you can basically say, okay, I've got a vague concept of how this should work. Um, build me a prototype here. And then it will build the prototype.

**5:04** · You can give feedback on the prototype. it will update the prototype and then you can hand off back to another agent that will uh actually build the thing based on your prototype. So you should use this when you have some unknown unknowns that you can really only figure out by looking at code. If you have let's say a question that you kind of know the answer to but maybe you don't then you can just go okay let's just prototype this. The UI one is really cool because it generates several radically different UI variations.

**5:33** · And it also does it actually in the route where you want it to be. And what you'll get is a kind of floating button at the bottom of the page where you can click left and right and choose and toggle between the variations. You can then pick a variation and walk down the design tree and go, "Okay, I like this about this variation. Maybe this from that variation. uh let's take a bit of A and B and combine it into a new one and discard the others.

**5:58** · So this is really really good for just figuring out what a UI should look like before your AFK agent maybe powered by S castle goes and implements it. People often ask me like what's the best way to um make AFK agents really good at front end and the answer is prototyping. You really do need a human to sit in the loop with the agent to give it feedback on what looks good because UI is so dependent on taste, so dependent on um style in the application and often the AI just simply can't see what it's building.

**6:31** · So you need a human there to really uh apply their taste to it. So that is prototype and it is real real good and I hope you enjoy it. Let's quickly talk about a couple of bug fixes that came up during this as well. One of which is really interesting. I took the uh very uh wellused skill uh grill with docs and I wrapped it in a couple of XML tags. We can see this in the raw here.

### Bug fixes and prompt improvements

**6:52** · So in the raw um basically the issue I was finding is that grill with docs was a little bit too eager to implement sometimes and I think what was happening was that this supporting information here um basically these XML tags didn't exist. these XML tags are the new thing. And what it was doing is that all of this uh text down here was kind of um being treated by the LLM as more important than the actual text up here.

**7:23** · So I think of this as kind of like loudness in your prompts where you have some prompts or some parts of prompts, they can often be like competing with each other in terms of the volume and the amount of impact that they have on the final output. And so what I did was I wrapped these in XML tags. I said, "Okay, this bit up here is the what you're actually doing in this skill and the bit down here is then supporting info." So this shows the LLM that, you know, this isn't like an official thing. This tends to work pretty well with anthropic models.

**7:56** · That's certainly it's certainly in their documentation. And so it means that the stuff inside supporting info is just slightly less prioritized. And that's important. And that's had a really good effect actually at least, you know, in terms of vibes. I'm not doing evals here. Maybe I should be doing evals on this particular case. But what I'm seeing is that people aren't reporting this anymore since I added these XML tags. One other bug fix that I added is that inside to PRD and to issues, I've added uh this instruction to apply the ready for agent triage label. No need for additional triage.

**8:25** · Previously, uh it was saying, "Okay, um add the needs triage label, which just didn't make sense to me because once you've created these issues with to PRD and two issues, uh if we look at the two issues one, then these are ready for agents. That's the intent of them.

**8:42** · Um some people have come back and said uh should we make the to PRD skill like should we mark that as ready for agent because the agent might implement it on its own and for that you really need to just tell your agent no don't implement PRDs only implement actual issues. So that's sort of something on the PRD side anyway so that's a bug fix that's gone in on this version. Now finally I just wanted to show you something I'm working on when it comes to some in progress stuff. So there are a few yeah basically two sets of skills here that are in progress.

### Writing skills in progress

**9:12** · The first one is a tripart skill here which is me trying to break down what good writing looks like with AI and trying to make that into a repeatable skill. I was just using this this morning and I'm kind of fiddling with it. I'm playing with it and I'm enjoying it. The theory here is that you start by writing fragments. These fragments are pieces of text that you kind of might want to structure into a final piece.

**9:36** · The theory here is that authors, they will often keep these long, long journals over many, many years, noticing different things, um, thinking about their personal life, thinking about their outside life, thinking about their friends, all this stuff. And these fragments end up working their way into stories almost verbatim. And the theory here is that you can use AI for this because AI can prompt you to come up with better fragments. So I tend to just dictate ideas into this and it comes up with this little document of fragments.

**10:10** · From there you can take those fragments and find your way through a potential arc by writing beats. Now these beats are essentially just beats through a potential story. You know, if you imagine a uh a story or an article or a newsletter in my case where you might want to like, okay, you need to find some path through the many many possible paths, then writing beats allows you to do that because it basically just gives you three options for where you want to go next and then write those beats based on the fragments.

**10:37** · And then finally there's this sort of writing shape here which is a kind of review process where you go back through make sure it doesn't sound too AI make sure it's structured in the right way and you do a kind of final pass over it. So that is the theory and I'm really interested to see how that shapes up. I don't think they're going to be ready anytime soon.

**10:58** · I really really need to put some work into developing those skills but you're free to try them if you like. Then we have one which I think a lot of people have anticipated for a while which is this review skill which is a code review skill and I've really been wanting to I've been dragging my heels on this because writing a generic code review skill is really hard but the theory is that I've come up with two possible strands to make it work. These two strands are essentially comparing it along two axes.

### review

**11:25** · So either the standards set in the codebase, so does the diff follow the repo's coding standards and spec. Does the diff actually faithfully implement the original issue or PRD? I found that if you only focus on standards, then you're going to miss spec stuff. And if you only focus on the spec, then you're going to miss standards stuff. So the theory is that the review skill will kick off two parallel sub aents which check it along that. Now, standards is the trickier one because everyone's coding standards are different and people will need different things.

**11:55** · So, I've I think I'm going to need to make a skill that tries to extract out coding standards from your repo in order to give you a fighting chance of kind of making it the best it can possibly be and I think that will be a different skill itself. So, lots of work happening in this area. Hope it's exciting. Finally, we are working on a doc site here which is going to have videos of each individual skill and it also has a newsletter here. This is going to my main newsletter and you can always opt out of the skill stuff.

**12:24** · But if you really enjoy these skill updates, if you want to follow everything that I'm doing, then this is the place.

**12:31** · Thanks so much for following along.

**12:32** · Thank you so much for giving me such good feedback about these skills. It motivates me to keep working on them and I really love just seeing people crack AI finally with these skills and also modifying them for their own uses. So, thanks for watching and I'll see you in the next