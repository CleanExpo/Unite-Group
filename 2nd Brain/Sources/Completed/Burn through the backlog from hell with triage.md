---
title: "Burn through the backlog from hell with /triage"
source: "https://www.youtube.com/watch?v=MzWIIlx0Gpc"
author:
  - "[[Matt Pocock]]"
channel: "Matt Pocock"
published: 2026-05-08
created: 2026-05-08
description: "Learn how to use the Triage skill to manage GitHub issues and backlogs at scale. Discover how to turn messy human ideas into actionable tasks for AI agents using state machines and labels.Learn more"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=MzWIIlx0Gpc)

Learn how to use the Triage skill to manage GitHub issues and backlogs at scale. Discover how to turn messy human ideas into actionable tasks for AI agents using state machines and labels.  
  
Learn more about the skills:  
  
https://aihero.dev/s/HXYfHS  
  
Follow Matt on Twitter  
  
https://twitter.com/mattpocockuk  
  
Join the Discord:  
  
https://aihero.dev/s/gJlyzT

## Transcript

**0:00** · The problem with most skill-based setups is that they are great for solo developers, but they're not so great when you get into teams. With teams, or when you're working on other people's stuff or building ideas for other people, you will often need to triage other people's ideas to figure out if they're good or not, to even figure out if they're worth building, to figure out if it's a bug report, to see if you need to reproduce it, all that stuff. And this is very familiar to anyone who's been building anything of reasonable size for a while. And so I have built a skill for that.

**0:31** · This skill is called triage. And I run triage on every single open- source repo that I run. It's great for working through GitHub issues. You can plug it into Jira. You can plug it into any backlog to essentially flesh out that backlog and turn it into actionable tasks that can be picked up by an agent or to reject it or to do all sorts of various things with it. The thing that drives this is that it has a essentially a state machine encoded into labels. So you have two category roles currently. This may change in future.

**1:02** · We have a bug ro and an enhancement role which is very you know that's well known to anyone who's done any work with triage. And then you have five state roles and these are kind of up for grabs as well. Like this is um something that I probably will expand on in the future but for now this is working for me. Each of these five state roles corresponds to a state that the ticket can be in. So the ticket might be needs triage. In other words, it needs a maintainer to look at it. You know, it's a paused until the maintainer has actually done their work.

**1:32** · It might be that it needs info, waiting on the reporter for more information. It might be ready for an agent to pick up. In other words, it's fully specified, ready for an AFK agent to go and slam through the task. or it might need a human to look at it now and to actually implement it or we do a won't fix where it just will not be actioned. This is a state machine because every single triage issue should carry exactly one category role and one state role. In other words, you can't have it be ready for human and needs triage at the same time.

**2:02** · This is a good old state machine and that's familiar to anyone who's followed my career. You'll know I will love state machines. So, the way you use triage is you can use it in a bunch of different ways. You can either use it to triage a specific issue. You can triage the entire backlog and say, "Show me anything that needs my attention now." You can say, "Okay, let's move this one to ready for agent."

**2:23** · And by the way, ready for agent is a nice one because in order to move something to ready for agent, you need to write a brief for the agent that's going to pick it up. And we have inside here a agent brief template which allows you to kind of write this ticket really nicely. So, you're probably thinking, "Okay, I get the basics of this. Show me this in action. Turns out we have a bunch of issues that need triage in Sank Castle. So that's what I'm going to do.

**2:48** · I'm going to show you how to use this skill by triaging my own repo. You can see there's a bunch of stuff that's already in here. Some of the stuff that's ready for agent that's been put into a PR already. Some that kind of needs triage that I need to look at again. Some that's totally unlabeled.

**3:02** · Some marked as won't fix. So I'm going to open up a new uh Claude session inside my repo. And I'm going to say triage. And then I'll say just give me all of the open issues or rather just the ones that I haven't triaged yet. So let's ping this off and see what happens. It should go and explore the repo. It should pick up that I'm using GitHub issues and yep, look at it go.

**3:23** · Okay, it can see there are nine untriaged open issues. I would like it to Could you just walk through each of these and add the basic labels to them?

**3:32** · Just doing initial triage for me so that I don't need to make that many decisions. One thing you're probably thinking is how does the agent know what can be actioned and what's even like uh a good candidate to be actioned. Well, inside the repo I have a dot out of scope directory right at the top here which is a few things that I've already triaged with the skill that marks it basically anything that I say okay we're not going to do this it basically says okay you're uh going to mark this feature as out of scope for the future.

**4:03** · So for instance, San Castle does not provide an abstraction layer for composing Docker files or managing base images programmatically. This is essentially like an architectural decision record but specifically for features that we're not going to implement. So this means that the agent when it's looking at issues, especially enhancement issues, is essentially looking at the ADRs that I've created at these out of scope references and going, "Okay, I can just close this straight away because this is an enhancement that we're not going to commit to." Okay, it's gone ahead now and it's labeled a bunch of these.

**4:32** · So, it's labeled all of these as bugs and all of these as enhancement and mark them all as needs triage. Let's just work down from the bugs first since those are going to be I think a little easier to gro. Could you start with 477 for me? Let's fire this off and see what happens. All right, so it's come back with saying okay recommendation. It is a bug and it's recommending that I move it to ready for agent. already had substantial triage nodes pinpointing the exact root cause reproduced with a stack trace etc etc.

**5:04** · However, I think I want it to actually reproduce itself. It's being a little bit too credulous about the um you know about the stuff that it's received from the person who's tried this. So, I would like it to use another skill of mine to say diagnose this yourself. This is going to make it walk through essentially um reproducing the bug and trying to fix the bug. So, we're actually going to do this from within this same session. Now, of course, whenever I'm doing anything anything with the LLM, I'm thinking about my context usage, which is in the bottom left here.

**5:35** · I've sort of have a budget of 100K for this session. We're at 46.5K.

**5:40** · That seems fine to me. We've certainly got enough context to diagnose this and fix this. I have a feeling this error is just a small error. So, that's what's at the back of my mind all the time. What's nice about the triage too is that, you know, we've already marked everything uh as it needs to essentially. So, it's already labeled correctly. In a future triage session, I would just go back to the issues and I would just say, "Okay, let's do this issue." Now, it's funny how much of AI and how much of managing AFK agents is essentially Q management.

**6:08** · This is what we're doing here. We're just sort of pruning a Q and acting as a translation layer between the humans creating these tickets and the AI that's going to implement them. The way that my plan prompt works for Sand Castle, which is my AFK agent uh kind of software factory thing, is it looks for the label ready for agent, and it only touches ones that have been explicitly marked ready for agent. Okay, it looks like it has found the issue. So, diagnosis confirmed.

**6:33** · So, the issue is is that a couple of variables contain a literal task ID and this particular syntax here, if it's not passed in by the user, actually results in an error. So what it's saying is we need to replace these task ids with an ID. So this kind of pattern here and that non kind of double curly brace placeholder will actually not cause an error. So that'll be fine.

**6:57** · We can see it's also added an idea of a feedback loop here. So a unit test scaffolding simple loop and asserting that the resulting prop.d uh contains no unresolved task ID. That looks great and it seems to be just busting on with it without asking which is is fine. In this case, we can see that uh the diagnose skill actually uses a similar setup to my TDD skill where it gets it to create the regression test first, create the feedback loop first, and then fix it within that feedback loop. So, it's looking good. It's created the full suite and the type check, and it looks like it's just ready to go.

**7:28** · So, this is another nice feature of triage, which is once you've pulled in the issue and understand it and diagnosed it, you can just fix it there and then if you want to. One thing I often like to do is when I'm doing these is actually have a two sessions running at once is have one session over here where I'm fixing uh or triaging one issue and then one session over on the left here where I might actually be using main to fix the issue.

**7:51** · Okay, it's giving me some kind of command request here. I'm just going to say yes and I'm going to bump it into auto mode. All right, so looking pretty good. It's added a change set. It's added a uh fix here. I'm going to get it to push this to main and close the original issue. One thing I could do is I could get it to create a PR and then the PR would reference the issue originally so that when I close or um when I merge the PR it would close the issue. That's how I usually like to work. But let's just push this domain. I actually kind of did a bit of vetting on this beforehand.

**8:21** · I actually know what the fix is and this is the fix. So a bit of movie magic for you. So that is the triage skill. It's essentially a way of you and the AI working together to turn messy human ideas into actual um real tasks that the agent can pick up and work on. And this is specifically designed for AFK agents. So you in order to get your agent working properly, you need a backlog of tasks that it can pick up over time.

**8:48** · And having specific labels for each of those means that the agent is not going to stumble around on crap tasks that aren't uh ready for it yet.

**8:56** · And the ready for agent uh kind of signal is a really cool one because you just get to see your backlog fill up with these little marks that you know will be implemented. Very cool. This also matches well with my existing skills. For instance, we can create PRDs here. For instance, this is one about work tree locking to prevent concurrent agent access. This is a PRD and I've marked it as ready for agent. So the agent will see this will pick it up. You can also do this for tickets as well. So tickets based on PRDs. This has the parent of the PRD that we just saw, and it's also ready for agent.

**9:26** · So, that's going to be seen by the AI picking this up. If you dig this, then you should check out the skills um page on AI hero below here. I'm adding all of the change logs onto this page, which are video change logs and article change logs, so you can keep up to date with what's happening, and you can sign up to this newsletter so you get all my latest and greatest skill updates, as well as tips on getting the most out of agents. You may have also noticed that this video is in a slightly different style from my usual videos. It's a little less cuty.

**9:55** · I'm experimenting with like a different silence detection algorithm and I'm interested to know what you think. I hope these sort of slightly longer takes have a slightly more relaxed feel, a little bit less relentless and you get a sense for my kind of natural speaking cadence sort of separate from YouTube.

**10:12** · So, if you dig this, let me know.

**10:13** · Anyway, thanks for watching and I'll see you very