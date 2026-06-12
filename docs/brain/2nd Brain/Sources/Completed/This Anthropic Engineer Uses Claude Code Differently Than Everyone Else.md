---
title: "This Anthropic Engineer Uses Claude Code Differently Than Everyone Else"
source: "https://www.youtube.com/watch?v=nhE-hj7tZSE"
author:
  - "[[Ionuț Dogariu]]"
published: 2026-05-01
created: 2026-05-08
description: "Cal Rueb is one of the engineers actually building Claude Code at Anthropic. Most people are just poking at the CLI and hitting permission walls because they haven't touched the config. This is 25 min"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=nhE-hj7tZSE)

Cal Rueb is one of the engineers actually building Claude Code at Anthropic. Most people are just poking at the CLI and hitting permission walls because they haven't touched the config. This is 25 minutes of Cal explaining the internal logic of how they set up permissions and environment gates to actually ship code, not just demos.  
  
If you’re still using the default setup, you’re essentially fighting the agent. He covers the stuff that’s buried in the docs or just not there yet.  
  
Timestamps:  
0:00 — Why your default config is broken  
4:12 — Permission hierarchy (The "safe" way to give access)  
9:45 — Hidden settings in the CLI  
15:30 — Agentic loops vs. Manual prompting  
22:10 — The "Internal" Anthropic workflow  
  
  
Links:  
Claude Code: https://docs.anthropic.com  
Original presentation by Anthropic.  
  
#claudecode #anthropic #coding #ai #softwareengineering #ai #anthropic #artificialintelligence #claude #coding #developer #machinelearning #promptengineering #aitools #aiworkflow

## Transcript

### Why your default config is broken

**0:00** · Let's get started. Welcome everyone to Claude Code best practices. In this talk, I'm going to talk about kind of what Claude Code is at a high level.

**0:11** · Then we'll peer under the hood a little bit to kind of understand how Claude Code works. And then knowing that, because it's useful to kind of know how your tools work, we're going to talk about good use cases for Claude Code and also best practices we've figured out both internally and from our users for getting the most out of this tool.

**0:32** · Uh but before I get started, I'd like to introduce myself real quick and talk about how I ended up on the stage. So, my name's Cal.

**0:39** · And I joined Anthropic about a year and a half ago uh to help start up a team we call Applied AI.

**0:45** · And it's the Applied AI's kind of mission, our team's mission is to help our customers and partners build great products and features on top of Claude.

**0:54** · So, what that really means is I spend a lot of my day prompting Claude to get the absolute best outputs out of these models.

**1:02** · That said, I also love to code and I'm definitely one of those coders that like starts a lot of projects, has some crazy idea, and then just never finishes them.

**1:11** · So, I have this graveyard of just like code that I started, never really finished, um but I'm always spinning new things up. And late last year, I was in Slack and I was hearing about this new tool that a few people are using. They were saying it was really cool.

**1:24** · And so, on a Friday night, I downloaded the tool that would become Claude Code.

**1:28** · And I threw it at this kind of new note-taking app that I wanted to build.

**1:32** · And like that whole weekend just kind of totally changed the way that I code and think about software engineering. I was carrying around my laptop with me all weekend. I was super addicted to just watching Claude Code work. And I would press enter and I'd switch over to my browser and refresh and I'd watch this huge, powerful application come together in front of my eyes. And I got way farther into this thing than I ever would have on my own. And it just blew my mind.

**1:58** · And while I was doing this, I was really worried. I was like, you know, I you know, I kind of know how these things work. So, I'm like, man, I'm using a lot of tokens. I hope I don't get in trouble or anyone like notices I'm not really contributing to Anthropic code. Um but what I didn't know is that the Claude Code team had built this internal like leaderboard tracking how much all the Anthropic employees were using this. And over the weekend, I had shot to the top.

**2:22** · And so, through that, I got to meet Boris and Cat and some of the early Claude Code team. And I was able to start talking to them and say, "Hey, I love this tool. I also know a lot about prompting. Can I help you all out?"

**2:34** · And so, through that, I got involved and now I'm one of the core contributors on the team. And I do a lot of I work a lot on the prompting, the system prompts, how the tools work, the tool descriptions, and tool results. As well as I work on how we evaluate this tool.

**2:49** · So, when we think about changing the prompts, how do we make how do we know we made things better or the same and we didn't totally ruin Claude Code.

**2:57** · So, with that said, let's kind of dive in.

**3:00** · So, here's my current mental model of Claude Code and how I describe it to people when people ask me.

**3:07** · Claude Code is like that coworker that does everything on the terminal. So, it's the sort of person that just never touches the GUI. They're a whiz. I think of when I was a junior engineer, I had this mentor and I would walk over his desk and I would say, "Hey Tony, can you help me with this bug?" And he would whip it up his his terminal and he'd be like doing all these crazy bash commands and changing things around in Vim. And I'd always walk away thinking, "Wow, that was crazy. I should learn how to do that." Um I never did, but having Claude Code on your computer is kind of like having Tony next to you all the time.

**3:44** · So, how does Claude Code kind of work under the hood?

**3:49** · At Anthropic, we try to always do what we call the simple thing that works. And what that means for Claude Code is it's what we would consider a very pure agent. And Anthropic, when we talk about agents, what we really mean is some instructions, some powerful tools, and you let the model just run in a loop until it decides it's done.

### Permission hierarchy (The "safe" way to give access)

**4:12** · And that's really what Claude Code is.

**4:15** · So, it's \[snorts\] tools, powerful tools, and the tools that, you know, someone that was really good at a terminal would be able to use. Tools to create and edit files, to use the terminal, and then you can also do things like pull in other things with MCP.

**4:29** · Now, on top of that, there's how Claude understands the codebase. And if you're going to build a coding agent or a coding tool a year ago, you'd probably have ideas like, well, okay, I'm going to get this user message about something about this codebase and I'll need to figure out which files are relevant. So, maybe I'll like index the whole codebase and embed it and do this fancy like kind of rag retrieval thing.

**4:55** · That is not how Claude Code works. We don't do any sort of indexing. Instead, Claude kind of explores and understands the codebase how you, if you were new to a team and new to a codebase, would explore a codebase. And that is through agentic search. It's the same sort of search tools you or I would use, things like glob and grep and find. And it can work its way through a codebase and understand what's going on.

**5:17** · And when we talk about agentic search, that really means the model can go, do some searches, and then it can look at the results and it say, "Hmm, maybe I need to figure out a few more things. I'm going to go do some more searching and then come back."

**5:32** · And then on top of these primitives, on top of this agent, we have a few things.

**5:36** · We have a very nice, light UI layer where you get to watch Claude Code work.

**5:41** · You see all the text fly by. And we have this nice permission system that allows the agent to work and allows and kind of forces the human to butt in when the agent is doing something dangerous.

**5:52** · And then on top of that, we also care a lot about security in this tool. And so, because Claude Code is just such a lightweight kind of layer on top of the model and the fact that our model is available not just behind Anthropic APIs, but also with our cloud providers, AWS and GCP, it's very easy and native to point Claude Code at one of these other services if you feel more comfortable consuming Claude that way.

**6:20** · Now, a lot of people ask me, "Hey Cal, what can I use Claude Code for? Like, what is it good at? Where is it interesting?"

**6:27** · And the reality is it's kind of great at everything.

**6:32** · So, let's start with discovery.

**6:35** · Often times in your career, you will be dropped into a new codebase, whether that means you're switching teams, you're switching companies, I don't know, you're starting to work on some sort of open source project. And probably when you're first getting started getting familiar, not very productive cuz you're just trying to figure out where things are in the codebase, what patterns kind of the team is using, things like that. And Claude Code can kind of help supercharge that onboarding process. You can ask Claude, "Hey, where is this feature implemented?"

**7:02** · Or since it's great at the terminal, you can say, "Hey, look at this file and look at the Git history and just kind of tell me a story about how this code has changed over the past couple weeks."

**7:14** · One thing you can use Claude Code for, and I think this is underrated, is instead of just diving in and starting to work, you can use Claude Code as a thought partner. So, often times when I'm working with Claude and I want to implement a feature or we're going to change something up, I'll open up Claude and I'll say, "Hey Claude, you know, I'm thinking about implementing this feature. Can you just kind of like search around and kind of figure out how we would do it and maybe report back with like two or three different options.

**7:40** · Don't start working. Don't start writing any files writing any files yet." And Claude will go off and use those agentic search capabilities and come back with a few ideas. And then I can work with Claude to kind of validate things and then we can jump into the project.

**7:55** · Of course, Claude Code is great at building and writing code. And I would say this in on two different fronts.

**8:01** · One, it can do the zero-to-one sort of stuff. You drop it in an empty directory and you say, "Hey, build me an app.

**8:06** · Build me a game." That demos very well.

**8:09** · It's very fun to do. It's very gratifying. Of course, in reality, what really matters is is Claude Code good working in existing codebases? And this is primarily what we focus on.

**8:20** · Um it And the Claude Code team, we have in our codebase abnormally high, I would say, unit test coverage. And that's because Claude Code makes it so easy and just straightforward to add unit tests.

**8:36** · So, we have great code coverage. And then the other thing we have in Claude Code in our own codebase is we have great commits and PR messages. Because when we finish working, we'll just say, "Hey Claude, write the commit for me.

**8:45** · Write the PR message for me."

**8:47** · \[snorts\] We also see great opportunities to use Claude Code in kind of the deployment like deployments and in other parts of the life cycle. And this is a few other people have talked about this, but this is using the Claude Code SDK. So, using it headlessly, using it programmatically, being able to sprinkle in a coding agent agent anywhere. And so, that's things like sprinkling it into CI/CD to use it in GitHub, for instance, to help people um programmatically.

**9:19** · And \[snorts\] then finally, it's great kind of with support and scale. It can help you debug errors faster. One thing that we saw when we started giving Claude Code to customers and talking them about it, we didn't totally predict this. Was a lot of customers or potential customers said, "Hey, we've been we've been kind of putting off this like large codebase migration." People that are on old versions of Java trying to get it to a new one. Or a team that's on PHP and they're trying to get to React or Angular. We've talked to multiple teams like this.

### Hidden settings in the CLI

**9:46** · And having a tool like Claude Code makes projects like that a little more digestible when you go to your team and you say, "Hey, we're going to spend a month, you know, refactoring or rewriting large parts of the code base.

**10:01** · And then on top of that, and this kind of matters across all these, is once again, remember Claude is great at the terminal. And that means it's going to be great at all those different CLI tools, things like Git, Docker, BigQuery, things like that. I never have to worry about, oh, I'm going to get myself, how do I get myself out of this sticky rebase? I'll just fire up Claude Code and tell it the situation and be like, hey, can you fix this for me? It's incredible.

**10:27** · \[snorts\] Now, let's talk about best practices.

**10:31** · And the first one is not going to be a surprise, but the first one is use claude.md files.

**10:38** · So, remember that Claude Code, like I said, is an agent and it has some tools, has some lightweight instructions in the prompt, but it doesn't really have memory. And so, the main way we share state across kind of sessions or across our team when we fire up Claude Code in the same code base over and over again, is this claude.md file.

**10:57** · So, when we start Claude, what happens is if there's this claude.md file in the working directory, it's just plopped into context, it's plopped into the prompt, and basically what it says is, hey Claude, by the way, these are important instructions the developer left for you. Be sure to pay close attention to this.

**11:16** · And there's various places you can put the claude.md file, you can put it in a project and check it in, so all your teammates share it. You could put one in your home directory if there's things you just want Claude to always know about, regardless of what you're working on. And the things you put in here are things like, hey, by the way, maybe this is how you run the unit tests. Or just so you know, to make kind of your searching and life easier, here's like just like an overview of kind of how this project is laid out, where the tests live, what different modules are, things like that.

**11:44** · Or here's our style guide, all sorts of things like that to just make Claude's life a bit easier. And you can build these things up over time. The other thing you can do, which is important, is permission management.

**11:59** · When you're running Claude Code, there's all sorts of different kind of permission things flying by. Kind of out of the box, what happens when you start our tool is for read actions, if Claude is searching or reading, we just let it go. But once it starts writing or running bash commands or doing things that could change change stuff on your machine potentially, that's when we kick in this UI and it says something like, yes, yes, always allow this or no, um, I want to do something else.

**12:30** · And using that permission management and being smart about it can help you work faster. So, there's something called auto-accept mode, where if you're working with Claude Code and you press shift tab, Claude will just start working. There's things you can do, like you can configure Claude in the settings where specific commands, like on bash, like if you just are like tired of saying, yes, run npm run test, you can just always approve that. So, fiddling with your permission management is a great way to kind of speed up your workflow.

**13:00** · Integration setup. So, one thing that is going to help you get the most out of Claude Code is remember that it's great at the terminal. And if there's applications that you use, which have kind of a way to access them through CLI, and GitHub is a great example of that, they have a powerful tool called GH, you can basically give more work to Claude Code. And you can do that either by just installing more CLI tools, or you can attach more MCP servers.

**13:28** · Um, I would say, just through experience, that if you're using something like, um, a CLI tool that's well-known and well-documented, and you're trying to choose between the CLI tool and just installing it on your machine and grabbing an MCP server, I would recommend using the CLI tool.

**13:46** · Um, and then also, if you internally have your own tools, at Anthropic we have something called Coo that does a whole bunch of stuff for us, you can also tell Claude about that, and you probably that's the sort of thing you'd put in claude.md.

**14:00** · And then context management. So, remember that Claude is an agent, and when it's an What What it does, it calls these tools, and the context builds up and up over time. And at least for Anthropic, our models have a context window of 200,000 tokens, and you can max this thing out. So, you kind of have two options when you're in a long session with Claude and you're working and you're going back and forth. You'll see in the bottom right, you'll start to get this little warning that'll say, hey, you're starting to fill up the context window. And kind of depending on what's going on, you have two options.

**14:32** · You can run {slash} clear and just start over, and that clears everything out, except for, for instance, claude.md, or you can run {slash} compact, and what'll happen is basically it's like a user message message is inserted, and it just says something like, hey, I need to go, summarize everything we've been up to.

**14:50** · I'm going to give this to another developer and they're going to pick up where I left off. And then that summary is what kind of seeds the next session, and you can go from there. We spend a lot of time tuning this kind of compact functionality, so that as you max out the context window and then run compact, you can start back over and keep going.

**15:09** · Efficient workflows. What can you do with Claude Code? And how do you get the most out of it? So, using planning and to-do's, I talked a little bit about this before, but one of the best things you can do is when you open up Claude Code instead of saying, hey, I need you to fix this bug, you can say, hey, I have this bug, can you search around, figure out what's causing it, and just like tell me a plan how we're going to fix it. And this can save you a lot of time because you can verify, you can read Claude's plan, and you can verify what it's going to do.

### Agentic loops vs. Manual prompting

**15:37** · And then the other thing that we have is we have this to-do list feature. So, often when Claude's working on a big task, it'll create a to-do list. And if you're kind of paying attention, you can kind of watch this to-do list, and if you see anything kind of weird or in there or something that doesn't make sense, that's when you can press escape and say, hey Claude, let's change the to-do list, I think you're on the wrong path.

**15:59** · Smart five coding. So, it's very tempting and it's very powerful to just let Claude work and press enter and see what happens at the end. I think there's a few things that can help make this better, and there's I think a talk later today about just this for 30 minutes, but doing things like having test-driven development, having Claude make small changes, run the tests, make sure they pass, always having Claude do things like check the TypeScript and the linting, and then commit regularly, so that if it's kind of going off the rails, you can always fall back and try again.

**16:31** · You can use screenshots to guide and debug, so Claude is built on top of our models, which are multimodal. You can always just grab a screenshot, paste it in, or if you have a file somewhere that's an image, you can just say, hey Claude, look at this mocked-up PNG, and then build the website for me, or whatever.

**16:50** · And then advanced techniques. So, as you're getting used to using Claude, what are some things you can think about, uh, to kind of push things to the next level? And one of the things we see, both internally and with customers, is when you've started to use this tool for a while, it's going to be very tempting to use multiple Claudes at once. And so, I know people at Anthropic and a few customers that run four Claudes at the same time. There's various ways to do this. You can have it in tmux or just different tabs, all sorts of crazy things.

**17:19** · So, I would challenge you to try getting multiple Claudes running at once and kind of be orchestrating all these things. It's quite fun. I can only do two, but I know people that do four.

**17:31** · Use escape. So, escape is your best friend. While Claude is working, you can kind of keep an eye on what it's up to, and you can press escape to stop it and interject and say, hey, I think you're going on the wrong path or I want you to do something else. Knowing when the right time to press escape is versus just letting Claude figure it out is key to getting the most out of the tool. And there's a hidden feature, not too many people know about it, but if you press escape twice, you can actually jump back in your conversation. You can go back and you can kind of reset.

**18:04** · Tool expansion and MCP. So, this is taking it to the next level. If you feel like with bash and with the tools that Claude has that it still can't do something, this is when you should start looking at MCP servers.

**18:17** · And then headless automation. I think this is a thing we're most excited about, but also we are still trying to wrap our heads around internally, which is, how can we use Claude programmatically? We have that in GitHub actions. We want to figure out other creative places we can start using it. I would challenge you all to do the same.

**18:38** · So, with that said, uh, I'm going to jump over to my computer because there's one other best practice, which is, it's always good to stay on top of everything that's new. So, we're shipping super fast. I'm going to throw I'm just going to go over a few things that are new as of today.

**18:55** · \[snorts\] Um, one thing is, when you're in Claude now and you fire it up, you can do {slash} model, you can see what model you're running on. I'm on default, which happens to be Sonnet. We can jump over to Opus. You can do the same thing in {slash} config, switch it here. So, that's new. Make sure you're running the model that works for you.

**19:16** · There's another thing that's new about these models, which is, you can say something like, um, can you figure out what's in this project? And for a long time for a while we've had this like think hard or extended thinking. Now, this is great, but with our past models, that we won't let our model think between tool calls, and that's probably when the thinking matters most. So, starting with Claude 4, they can now our models now think between tool calls, and we can watch this happen. So, we have Claude in this project.

**19:46** · There's a few different files in here, and I'm just going to tell it to think hard and figure out what's in this project. And \[snorts\] we can watch Claude start to work. And so, the way you know you triggered thinking is you'll see kind of this lighter gray text, and then it'll call some file, it'll call some tools, it'll read some stuff, and then we see some more thinking. And this is awesome. Um so, I encourage you when you're working on tasks and solving bugs, throw a think hard in there.

**20:14** · And then the other thing and you know what, we'll just throw it up real quick is I have this in VS Code, but of course this is in JetBrains as well, but we have these new great integrations with VS Code and and JetBrains.

**20:28** · Um we can do things like Claude's going to know what file I'm in, what file am I in?

**20:35** · \[snorts\] That is not what I meant to say, but Claude's going to figure it out. And you can do things like this.

**20:52** · So, these are the sort of things I would encourage you to stay on top of. We have a public uh kind of GitHub project called Claude Code under Anthropic. You can post issues there, but we also post our change log there. And so, I check this once a week and make sure that I'm on top of all the new stuff we're shipping because even I can't keep up with it.

**21:12** · So, with that said, we have like 4 minutes left. I'm happy to answer questions about anything Claude Code related we have it here. I can live demo some stuff if you're interested. Um let's do a few. Let's do him first and then you.

**21:27** · Thanks real quick. This might be obvious, but multiple Claude.md files in a project, I presume that's possible and it just figures it out or no?

**21:37** · So, there's a few options. Of course, like in the same directory, you couldn't. Um but you could have one here and one in the subdirectory. And I think we changed this so that all the subdirectory ones aren't read in because like Anthropic, we have a mono repo, and people would open it up at the top and blow up their context with all the Claude MDs.

**22:00** · So, we encourage Claude when it's searching around and it discovers Claude.md files in um child directories that are relevant to be sure to read them, but by default it just reads the Claude.md file in the current working directory when you fire it up. And then also, you can set one in like your home directory. Um there are things you can do that we have this new thing like in your Claude.md, you can start referencing other files.

### The "Internal" Anthropic workflow

**22:29** · So, you could for instance um do something like this with an at sign. Um if you have other Claude.md files that you just kind of know you always want to read in um to do something like that.

**22:43** · Hi. Okay, I um have not had luck getting Claude to respect my Claude.md. Like There's one thing particular Yes. where I'll ask it to refactor something and then it will leave in-line comments explaining the what like the what of it is and it's like like something that's extremely obvious. And so, I'll tell it like go and remove any in-line comments that describe the what of what's happening and then it will remove it in the immediately do it again in like the same pass. So, do you have any strategies for dealing with that?

**23:10** · \[sighs\] So, there's kind of two things that fix that. So, that was actually kind of a model problem. There's nothing in the prompt. We have actually a lot in the prompts for 3.7 that said, "Whoa, do not leave comments." And despite that, the model just loves to leave comments. Um so, it doesn't surprise me that your Claude.md didn't help much either. We already did a lot I did a lot of work to try to tamp it down from what happens out of the box. So, we mostly fixed that in Claude 4.

**23:37** · Now, there might be some new weird behavior quirks, but the other thing we made better in Claude 4 is it's just better at following instructions. Um and we've gotten a lot of feedback from early testers that uh all of a sudden, "Whoa, my Claude.md is being followed way more closely."

**23:52** · Um and it might be a good chance to go look in your Claude.md and decide, "Do I still need this stuff? Maybe I can take some of it out. Maybe I need to add a few new things." So, moving over to the new models might be a good time to take another look at what's in there and see what you need and what maybe can go.

**24:09** · Uh for the record, I'm trying to think of something that you might not have thought of. We're doing multi-agent execution and parallelization. Can you make it to that for four agents say agents two and three use the context from agent one, maybe agent four uses the context from agent two at a certain point?

**24:26** · Yeah.

**24:26** · Um yeah, etc. That's interesting.

**24:29** · We're trying to So, like I kind of like I said at the beginning, we're trying to do the simple thing that works where there's just one agent that's great at coding and does everything. Um I think we want to figure that out.

**24:40** · Probably what's going to happen is if you wanted to do that, you would ask all your agents to probably like write to a shared markdown file or something like that so they can all kind of like check in and communicate. Um sometimes like I'll be working with Claude.md or Claude and I'll just say like, "Hey, I need you to write some stuff in like ticket.md for another developer." And then I'll fire up another Claude Code and I'll be like, "Hey, read ticket.md like another developer left this note for you. Like this is what you're going to work on."

**25:08** · So, I'd think about trying to write that state to a file and then just kind of like count on the model's ability to just like read files and make sense of them um is probably the best you can do today, and maybe we'll figure out clever ways to expose that uh in the product as something more native.

**25:27** · Cool.

**25:29** · All right.

**25:31** · And with that said, I have some rare Claude Code stickers I found in my backpack. So, come find me. I'll be hanging out over there something. Um happy to share them. Thank you.

**25:42** · \[applause\]