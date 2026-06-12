---
title: "Anthropic's NEW Claude Architect Guide In 39 Minutes"
source: "https://www.youtube.com/watch?v=vizgFWixquE"
author:
  - "[[Mark Kashef]]"
channel: "Mark Kashef"
published: 2026-03-23
created: 2026-05-08
description: "Master Claude Code: https://www.skool.com/earlyaidopters/aboutClaude Architect Study Guide: https://markkashef.gumroad.com/l/claude-architect-study-guide---Anthropic just released an official cer"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=vizgFWixquE)

Master Claude Code: https://www.skool.com/earlyaidopters/about  
Claude Architect Study Guide: https://markkashef.gumroad.com/l/claude-architect-study-guide  
  
\---  
  
Anthropic just released an official certification program -- the Claude Certified Architect. It's a real exam, pass or fail, built around 5 core domains. I read all 40 pages of the official exam guide so you don't have to. In this video I break down every concept across all 5 domains with diagrams, live demos, and plain English explanations -- whether you're going for the cert or just want to master Claude Code.  
  
\---  
  
Timestamps  
  
00:00 - Anthropic just dropped a real certification  
01:39 - The 5 domains explained  
02:03 - Domain 1: Agentic Architecture (27%)  
03:25 - The Agentic Loop  
04:07 - Anti-patterns to avoid  
05:18 - Hub-and-Spoke: coordinator + subagents  
06:38 - The narrow decomposition mistake  
07:34 - Live demo: spawning 3 subagents in parallel  
08:49 - Prompts vs Hooks (most important concept)  
10:00 - When to use hooks over prompts  
10:55 - Live demo: /hooks in Claude Code  
11:42 - Domain 2: Tool Design & MCP (18%)  
12:07 - Why tool descriptions matter most  
13:10 - The tool overload problem  
13:54 - MCP server scoping: project vs user level  
15:48 - tool\_choice: auto, any, forced  
16:57 - Domain 3: Claude Code Configuration (20%)  
18:51 - The 3-layer CLAUDE.md hierarchy  
20:04 - Path-specific rules (.claude/rules/)  
21:06 - Commands vs skills vs plan mode  
22:25 - Claude Code in CI/CD pipelines  
23:40 - The -p flag and --output-format json  
24:31 - Why you need a separate review session  
25:45 - Domain 4: Prompt Engineering (20%)  
26:26 - Few-shot examples vs instructions  
27:15 - Guaranteed JSON with tool\_use  
28:06 - The validation loop  
29:23 - Domain 5: Context Management (15%)  
29:45 - The lost in the middle effect  
30:37 - 3 ways to fix context bloat  
31:46 - /memory in Claude Code  
32:24 - When to escalate to a human  
33:41 - Error propagation done right  
35:00 - The 5 rules that apply across every domain  
37:12 - Interactive study prompts (X post resource)  
38:47 - Free study guide + where to go next  
  
\---  
  
Book a Consultation: https://calendly.com/d/crfp-qz3-m4z  
  
#ClaudeCode #ClaudeCertifiedArchitect #Anthropic #AIAgents #ClaudeCodeTutorial #AIAutomation #MCPServers #PromptEngineering #AgenticAI #ClaudeArchitect

## Transcript

### Anthropic just dropped a real certification

**0:00** · Antropic just released something huge which is a brand new certification program called the Claude Certified Architect. It's a real exam pass or fail and one of the most important things is that it's based on five core domains.

**0:12** · Now whether you're trying to get certified or you just want to get better at using cloud code and becoming a master of it then this entire syllabus that they've put together will act as the best resource for you to learn exactly how to go from zero to hero. So here's the deal. I went through the entire exam guide myself, not through an LLM. I read through every single page.

**0:32** · So, I'm going to synthesize this entire exam guide into this video and break down each and every concept for you. And as a bonus, I'll share some resources that should supercharge your learning journey. So, this is the very guide that I was discussing before. It is 40 pages and it walks through everything from the target candidate description of what it's like to be a master of cloud code in anthropics. Each and every paradigm you should master and be prepared for.

**0:57** · There are some exam content response types. There's some preamble around what the exam entails, what the format is and this is the most important part which is the content outline and this is where it breaks down the distribution of each and every part. And beyond that, in each area, it walks through a series of scenarios. And you'll see that it's very specific. It's not just about knowing MCP tools. It's about understanding exactly how to conceptualize each and every part of said tool.

**1:22** · If you scan through all of this, you'll see exactly how detailed it is, and it can be overwhelming to many, which is why I want to break down each and every concept and go through every domain with a fine tooth comb. So like I said, there are five different domains that Anthropic thinks that you need to know before you can call yourself a Claude code master. So the biggest one which is 27% of the exam is agent architecture.

### The 5 domains explained

**1:47** · So this is basically how Claude thinks step by step how it coordinates with other agents and most importantly how you enforce rules that just telling Claude in a prompt can't guarantee. If you only study one domain, this is the one. Now tool and MCP integration is at 18%. So this is how Claude connects to the outside world, your databases, your APIs, your file systems. And the number one reason why agents call the wrong tool is actually embarrassingly simple.

### Domain 1: Agentic Architecture (27%)

**2:14** · And we'll get to that shortly. So cloud code configuration sits at 20%. This is your CloudMD files, your skills, your commands, and things like plan mode. And most people dump everything into one giant file. But the exam guide teaches you how to split that into three layers.

**2:31** · So Claude isn't loading irrelevant tools every single time you ask us something.

**2:36** · Ultimately, we have the prompt engineering section. And this isn't just about writing better prompts. The certification is actually very specific here. If you want Claude to give you consistent output, show it two or three real examples of exactly what you want.

**2:51** · That works better than writing a whole paragraph of detailed instructions every single time. And last but not least is context management and reliability. So here's the thing. Claude reads the beginning and the end of what you give it really well. But the stuff in the middle sometimes can get fuzzy and that's called lost in the middle logic.

**3:10** · So now that we've set the tone for what's important, let's go through every single one and we'll naturally start with the largest and most important which is the agentic architecture and orchestration. Let's start with the very engine that powers each and every cloud agent which is the agentic loop. So whether you're using cloud code, the anthropic SDK or any agentic framework that is built on top of claude, this is what's happening each and every single time you run an agentic workflow. So your code first sends a request to Claude and then Claude naturally responds.

### The Agentic Loop

**3:41** · The most important thing to keep aware of is this stop reason right here. You want to check this all the time. If it says tool use, that means Claude wants to go use a tool like reading a file or running a command. you can execute said tool, feeds the result back, and then it goes again into this endless loop. But in this case, it's not actually endless. It goes up until a very certain point. If it says something like end turn, then that's essentially Claude saying that I'm done. And that's pretty much the entire engine over and over again.

### Anti-patterns to avoid

**4:10** · Now, the exam guide points three different areas where people make mistakes in understanding the agentic loop. And these are basically the anti patterns. So, first reading clawed text looking for phrases like I'm done or task complete. That's unreliable and it breaks all the time. Second, you don't want to set limits like stopped after 10 loops. You don't know the level of depth that Claude code needs to do yet to accomplish a specific task. So, you might be cutting off work that genuinely needs 11 steps.

**4:38** · And third, you don't want to look at what Claude said to figure out if it's finished. There's a very specific field like I said stop\_reason that exists for exactly this purpose.

**4:51** · It's the only thing that you should be checking. Now if you're using cloud code in a terminal then sometimes you won't see this stop\_reason. Every time cloud code reads a file, executes a tool, runs a command or spins a sub agent. This is exactly the process and the patterns that drive that forward. Understanding this will really help conceptualize everything else we're about to cover. So when Claude needs to do complex like research a topic from multiple angles or process a really large project, you don't need to send one agent to do everything.

### Hub-and-Spoke: coordinator + subagents

**5:21** · You basically have one agent that sits in the center and this is the main agent. It breaks the task down, hands off pieces to specialized agents and then combines the result at the very end. So these would be examples of the other sub aents. So one synthesis agent that uses tools to verify and write another search agent that uses tools like search and fetch URL. Then you have the analysis agent that uses tools like read do and extraction. Now the exam guide mentions this specific concept.

**5:47** · So each one of these agents has its own separate window, its own separate set of tasks and technically its own world. So there's no communication in between different sub aents. That's actually what the newer agent teams feature was designed to do, which is enable that communication through providing the equivalent of an email inbox to each agent. So they can email each other, see who's blocking who, and execute the task in unison. So it's important to understand that sub agents don't maintain track of memories of other sub aents at the same time.

**6:19** · So sub aent A will have no idea what sub aent B did.

**6:24** · it will all kind of come together at the very end once the main agent takes the TLDDR of each's outputs and or findings and then disseminates that back to you.

**6:34** · Now, there's one major mistake that many people make when it comes to understanding sub agents and it's the following. So, let's zoom in here. Even though you have a main agent, it's completely possible that the coordinator could break down tasks too narrowly. And this is something you have to look out for. So, in practice, it could look like this. You say research AI in creative industries and the coordinator only creates subtasks about visual arts. So digital art, graphic design or photography, but it completely misses music, writing, film and game design.

### The narrow decomposition mistake

**7:05** · So the sub aents did their job perfectly, but the coordinator just scoped it wrong. It's basically like having a bad manager for a great team. So the fix is to give broad goals, not narrow checklists to this main coordinator agent. You want to let the sub aents figure out how to break down all the subtasks based on their narrow goals that are defined by this broader goal.

**7:30** · So instead of me just breaking this down conceptually, let's go down into the terminal and see an example of this. So if we go into warp here, I'm going to copy paste this prompt and we'll send it over. And while we send it over, I'll read it through. So it says, I want you to research the impact of AI on content creation by spawning three sub aents in parallel. The first sub aent is to research how AI is changing video content creation. The second one is to research how AI is changing written content creation. And the last one is how it's changing audio.

### Live demo: spawning 3 subagents in parallel

**8:00** · And then we say each sub aent should search the web and return a three bullet summary. So it's very broad in terms of what they're looking for. We're not micromanaging exactly how they're going to do said thing, but we're giving them the overall assignment. So, you've taken the equivalent of an employee, you've onboarded them, and then after onboarding them, you trust them enough to give them a very well situated task and allow them to execute independently.

**8:25** · And after completes, you can see right here, all three agents are finished.

**8:29** · Each one used its own set of tools, its own set of tokens. Then we have the results from each one. And then we have the overall synthesis. So this is the main agent compiling all the results of the sub aents. And this is how this coordinator sub aent pattern works. So this might be the most important part of the entire exam guide where they differentiate between prompts and hooks and when and where to use each. So prompts are what I call best effort. You can tell claude something like always verify customer before processing a refund. And most of the time it works, but sometimes it doesn't.

### Prompts vs Hooks (most important concept)

**9:01** · If we even hop into their exact scenario, they have this question where they say production data shows that in 12% of use cases, your agent skips this invocation of a function get customer entirely and just goes straight to look up an order based off of the stated name occasionally leading to misidentified accounts. So from a business perspective, this is not okay. 12% of accidentally provided refunds to the wrong person or to people trying to take advantage of this becomes a big issue. Now, hooks are completely different.

**9:33** · A hook is basically a small script that runs automatically before or after Claude tries to do something. And it can literally block Claude from taking an action unless a specific condition has been met. So, it's not 99%, it's not 99.9%, it has to be 100%.

**9:50** · And the action physically can't happen if the hook says no. So, you can think of prompts as suggestions and hooks as laws. So, the exam guide draws a very clear line on when and where to use prompts versus hooks. And when it comes to what it's good for, it's primarily around style, tone, and formatting.

### When to use hooks over prompts

**10:09** · These are things that you can execute well 90% of the time, and it won't land you necessarily in an area of harm or a land of hurt. Hooks are optimized for compliance, financial stuff, and security. So, anywhere where one single point of failure can cause some real issues. And this overall concept is where a lot of people go wrong because they just think that if something failed 90% of the time, they can just tweak the prompt to perfection.

**10:32** · And as running a company called prompt advisors, where initially all I would do for companies is help them prompt engineer every system prompt in a system in a production use case for content creation. There is a level where a prompt is just not good enough over a thousand iterations or 5,000 iterations.

**10:51** · If you're not as familiar with hooks and you want a little bit of a debrief, then you have two options. If you pop into a terminal, you could always do slash hooks and then this will show you each and every way that you can invoke a different tool. And this list goes on and on and on. And if you click on one and you click enter, it will show you exactly what it would do. And option two is, I showed this in a prior video, you can use my favorite function in Claude Code, one of the most underrated, which is the Claude Code guide agent.

### Live demo: /hooks in Claude Code

**11:17** · And then you can ask it what are the best hooks for X use case and then it will go through with full knowledge of what hooks it has at its capacity and which one is optimized for your use case and whether or not you should be using a hook or a prompt to begin with.

**11:34** · So whereas the last concept the enforcement piece is probably the most important this is the highest leverage which is getting tool descriptions correctly which is basically giving claude code which you provide it with whatever tools you want at its arsenal as well as its native tools the right tool at the right time with the right description for the right use case. So tools are basically how claude decides which tool to use when it has multiple options.

### Domain 2: Tool Design & MCP (18%)

**11:59** · And that's typically not a small feat because you can have two tools that have vague overlapping descriptions, like one that retrieves customer information and another that retrieves exactly what the order entails. So that could lead to some form of communication issues. So Claude has to essentially guess. And the exam guide covers this very clearly.

### Why tool descriptions matter most

**12:20** · Ambiguous descriptions cause frequent misouting. So Claude ends up calling the wrong tool way more often than you'd expect. And one really important thing to note is that when you invoke these tools, sometimes you see the final result being executed properly. But back when everyone was using no code tools like Naden, you would have the agent in that platform work and execute the workflow and you would see it fire the right result.

**12:45** · So you could get the exact result you're looking for in cloud code, but you have no idea that it actually did the wrong thing three or four times to eventually do the right thing. So it's not just about the outcome but also the efficiency in getting to that outcome because as it tries through all the ways it doesn't work it spends your tokens and you want to be as token efficient as possible.

**13:04** · So to give you something more tangible let's say this is one of your functions get customer you would basically say that you want to use this tool whenever you need customer ID and profile data and you want to use the lookup order instead when you have an order number and need a shipping status. So you essentially want to be intentional in saying do not use this tool when this happens versus just saying when it should use that tool. And this is pretty much the highest leverage tip from the entire guide, which is the description of the tool is really the interface of tooling.

### The tool overload problem

**13:35** · And fixing the descriptions to make sure it knows the optimal path, the critical path is the most critical thing that you can do in your workflow. Now, while MCP servers are increasingly falling out of favor for different use cases, there are times where they make sense. So the exam guide does cover where to use different levels of scope for your MCP servers. You have project level and you have user level.

### MCP server scoping: project vs user level

**13:58** · And I'll walk you through the difference of when and where to use both. And this essentially allows Claude to connect to external tools like GitHub, Slack, Outlook, whatever it is, it's one of the vectors that you can use. And if you've ever used Claude chat or Claude Co-work and use their connectors feature, it's essentially using an MCP under the hood.

**14:17** · So project level MCP lives in a file called theMMCP.json at the root of a project. So any passwords or API keys go in what are called environment variables where they're denoted as N for environment and they never directly end up in the core file. So for example, if you had an MCP server for GitHub, which is essentially code version history, you would have an environment variable. it would be set to the token of your GitHub and this would be written to an environment file.

**14:45** · So every single time that an agent would try to use an MCP server, it would then be authenticated through this file then go and invoke this specific service.

**14:54** · User level MCP lives in a file in your home directory. So this is basically your personal sandbox. You have experimental tools, personal API keys, things you're testing before rolling them out to the rest of the team. Now, the practical takeaway from the exam guide is that essentially you can use as many community-based MCPs. These are not necessarily open-source MCP servers, which sometimes aren't too safe, but more so the native MCP servers from the platforms themselves.

**15:20** · So, if you look at the major providers like Salesforce, GitHub, etc., everyone has some form of instruction for using MCP servers and only build custom servers when you absolutely need to. And it's important to remember that an MCP server is purely a function. So if you just need your functions executed in a slightly different way or different order, you might not need a custom MCP. Now, real quick on the terminal side of things, all you'd have to do is go into your terminal and you could do one of these two things. You could say claude MCP list.

### tool\_choice: auto, any, forced

**15:50** · This would go and invoke if you have any MCP servers whatsoever. Now, personally, I've migrated my entire ecosystem to skills, CLIs, etc. So you won't find any that are already authenticated. You'll find just the shell of the ones that I used to use. So the Gmail, Google calendar, Canva, and Zapier. All of them I used to use, but now I've migrated all of them to use the skills primarily just for token efficiency, security, etc. But if you wanted to see which ones you had out of the box, that's the way you'd do it.

**16:19** · Now, if you're using MCP servers at the project level, then you could just paste a command just like this where you could say, "Show me the MCP.json JSON file in this project and explain the MCP server configuration and then you get this response where in this case I don't have in this particular project an MCP.json file and it walks through what needs authentication like we saw before how to configure it and there's that command that I showed you before claude MCP list. It basically invoked that.

**16:44** · So whether you're asking for it through natural language or going straight to the source with this command then you can have full visibility on what's happening with your MCP servers. The next principle in the exam guide is the tool overload problem. And this is essentially making better decisions by having less options. So you can think of it like this. Giving an agent 18 tools is like hiring a brand new employee and giving them access to every single system from day one. They're going to use things that they shouldn't call tools outside their lane.

### Domain 3: Claude Code Configuration (20%)

**17:13** · You want to keep each agent down to a maximum of four to five tools that are directly relevant to what they're doing. That constraint is really what makes them precise. And if you need a reminder earlier I showed you an example of spinning up three sub aents and you'll notice that all of them used four or five tools at max. So this is really a paradigm that's built into cloud code and that allows it to have a process create SOPs. So this one would be search, fetch, extract and save. So the goal is being precise, reliable and always on task.

**17:44** · Now there's also a setting called tool choice that controls how Claude picks its tools. There are three main modes. One of them is auto where basically Claude decides on its own whether to use a tool or not. And then you have another one called any and this is essentially forcing Claude to use a tool but it has to pick which one.

**18:05** · And finally we have forced meaning we are making it use this tool and there are no options. It's not just independence it is forced dependence on a particular outcome. So the guide alludes to the fact that you can force a tool call to make sure that step one is always consistent and predictable and then you can loosen that proverbial leash of cloud code to run freely and make more autonomous decisions as long as you know you've steered it in the right direction.

**18:31** · So you're essentially putting guard rails on its first move or couple moves and then allowing it to run freely and really tap into that power of the agentic harness. Now, next up is one of the most contentious topics in cloud code, which are claude MDs, which are the heart and soul of your operating system. Your air traffic control of your repo or project if you will. And pretty much it covers all the different layers, three different layers, the user level, the project level, and the path specific rules.

### The 3-layer CLAUDE.md hierarchy

**18:57** · Now, most people dump everything they know into CloudMD and they think that it's a proxy for a knowledge base or rag. But essentially, it's not.

**19:06** · People dump their preferences, their rules, their style, their tone all in one place and then complain why there's so many tokens being wasted all the time. The big issue is that every single time you open a brand new session, Claude auto injects that straight into memory. So you're wasting time and you're wasting tokens. So the guide splits it into three different layers.

**19:26** · One is the user level, the next is the project level, and the last one are path specific rules. So you can treat your top layer as your personal preferences file. This lives in your core home directory. So you have your editor settings, how you like your explanations formatted. So this one's just for you and not meant to be shared with anyone or through something like GitHub. So the middle layer is a project level CloudMD and this is where you have things like team rules, coding conventions, architecture decisions and this essentially allows you to share it with your team assuming you have one so that everyone's on the exact same page.

**19:58** · So this is where having some version control makes a lot of sense. And finally, we have the bottom layer here.

### Path-specific rules (.claude/rules/)

**20:04** · And this is really the golden nugget of the three levels. These are path specific rules. So you create a small rule file that lives in the do.claude rules folder. And at the top of each file, you put a pattern that says when to load it. So when something like only load this when I'm editing files is a very good example. So your testing rules only show up when you're writing tests and your API rules only show up when you're in the API folder. And lastly, if you have something like React components, if you're a developer, then you know what that is. If not, then don't worry about it.

**20:35** · The TLDDR is this is huge because cloud code can get focused. So you can have a lean and mean CloudMD and rely on rules to carry the path forward for any nuances that need to be taken account for a specific use case. So I know I'm throwing a lot at you right now, but the next section tries to bring everything together into cohesion. So, it's really about when to use what because we haven't even started speaking about things like skills, like commands, plan mode versus direct execution, when to use each. So, commands are basically reusable prompts.

### Commands vs skills vs plan mode

**21:08** · You save them once and then you can trigger them with a slash command. So, you can have slashre PR slashgenerate tests slashming if you want to execute a walkthrough of what your day looks like based on your calendar, your Gmail, anything you've hooked up maybe using the Google CLI. But one thing to note is that teamwide commands go in a commands folder in your project so everyone can use them via something like git whereas personal ones will end in your root folder and these are your personal slash commands. So these are specific to you and tailored to exactly what you want to do day-to-day.

**21:38** · Now we've gone through skills at length in this channel but just in case you and I are meeting each other for the first time we'll go through that as well. So skill is a step above a command. A skill has its own file that defines what it can do, what tools it's allowed to use, and it runs in its own separate context. So, you can think of it like this. A skill can do messy exploratory work like research files, do pretty much anything you want, and none of that clutter ends up in your main conversation. It's like sending someone to go do research in another room, and you're just bringing the summary back to the main conversation.

**22:11** · Now moving on to another existential question that many people ask and the guide goes through. To use or not to use plan mode. So if the task touches multiple files, it's ambiguous or it could go in a few different directions, then using plan mode is the way to go.

### Claude Code in CI/CD pipelines

**22:26** · Claude explores, reads, and proposes changes without actually modifying anything. Just review it, approve it, or tell it to go in a different direction.

**22:35** · But if it's a very obvious and straightforward single file fix, then you can just let Claude execute it directly. So you don't have to over plan in this case the same way many people will overengineer things. Now this next part is fairly advanced. So if you're non-technical, this part might leave you squinting a little bit, but I'll try to explain it as best I can. So this is about using clawed code in what's called a CI/CD pipeline. What this stands for is continuous integration and continuous development.

**23:01** · So if I were to break down this concept into one sentence to make it as accessible as possible to everybody, it would be the CI/CD pipeline is an automated conveyor belt where a developer will push code, that code will be reviewed, and then it will be shipped and pushed to the end user.

**23:18** · All without any form of buttons being pressed along the way. So the guide really focuses on this step three right here, but we'll get to that in a second.

**23:26** · Step one is like I said you have a developer that pushes some code. Then this triggers the CI the continuous integration pipeline to go and check it.

**23:35** · Step three is where the magic happens and this is what's called claude-p is not a very straightforward concept.

### The -p flag and --output-format json

**23:43** · So again I'll try to break it down. The -p essentially allows claud code to run without asking you for anything. So no prompts, no confirmation. It's essentially bypassed permissions mode in a way and it just runs the task you give and it gives you the result back and then you have a flag that gives you a clean structured output that other tools can read. It's actually called the dash- output format JSON flag.

**24:05** · When you put these together, these two flags turn cloud code from something you can chat with solely into something that you can use to automate different parts of your process. So the main learning here is that you can trigger this from any CI/CD pipeline, any system that essentially tests and deploys your code. Now it's hard to make that part less gibberish, but this part will be the main takeaway from that section.

**24:29** · And this is their important note on using separate cloud code sessions for reviewing code versus writing code because there is some level of pollution. When you write code, you essentially are biasing the language model to say, "Yeah, yeah, I wrote amazing code." Because why would the language model write poor code on purpose? So you need a stateless session to go and review any form of code, anything that was produced in session one, assuming you're doing something more on the technical end of things. So if you need a little anchor to remember, then you can remember that fresh eyes, even AI eyes can catch more.

### Why you need a separate review session

**25:00** · Two heads are better than one. In Claude Code's case, 5 10 15 heads sometimes are better than one at reviewing code as long as it's in a separate session. So for example, if I said claw-p list all python files in this project and summarize what each one does output this format, then you will see it goes through every single python function in my folder which I won't get into in depth and then it comes back with the full key patterns here. All scripts use Gemini 3 pro preview for images.

**25:30** · This is my thumbnails generation folder and dated output folders, report lab for PDFs and one script per video topic design. So, when it comes to making outputs reliable, this is a whole portion of the guide that's dedicated to dealing with inconsistency in Claude's responses. So, your instinct when Claude gives you inconsistent outputs is to write more instructions. So, for whatever reason, your instructions involve number crunching, something like handling different currencies, different decimal places. You try to shove all of that in there.

### Domain 4: Prompt Engineering (20%)

**26:01** · But Claude interprets it differently each time. One response can give you one number versus another depending on the day, the model you choose, etc. So you can have the same set of instructions but three different results because people keep forgetting that this isn't magic. These are language models. Now to fix this, Anthropic recommends going to fshot examples. If you're not familiar with what fot are, these are from the beginning of prompt engineering time one of the best ways to get consistent outputs. So you give an example.

### Few-shot examples vs instructions

**26:31** · In this case, the input could be Acme Corp reported 4.2 million in revenue for 2024. And this is the output you want exactly. So you give it exactly the parameters. In this case, we're putting it in JSON. This could be in whatever format you want. And same thing for example two. So multishot gives it enough of a hint to generalize and better understand which direction you're going for. And the interesting thing here is that claw doesn't just copy paste your examples. It learns the underlying patterns behind them.

**26:59** · That's why two to three examples will beat a full page of instructions each and every single time. Now, in the same vein of consistent and reliable outputs, this also generalizes to JSON, which stands for JavaScript object notation. Very common when you're dealing with agents with toolings and tool calls. So, this is also more of an intermediate to advanced use case, but it's important to know because it's covered in the guide.

### Guaranteed JSON with tool\_use

**27:23** · So, I'll move from left to right and again try to make this as accessible as possible. So step one is you define a tool which basically acts as your template providing the exact structure you need. So every field, every data type and whether or not it's required.

**27:38** · Leaving something as optional is beneficial for Claude because otherwise if you don't tell that it's optional, then Claude will make it up. So making it optional allows Claude to say I don't know in a very legal way. So your legalized way of allowing it to say I don't have this. I don't know what to do with this. In step two, building on what we referred to before, you can force Claude to use a specific tool. So there's no option to respond with plain text, no option to use a different tool.

**28:05** · It has to fill your template as is. So just as a takeaway, this eliminates syntax error. So anything like malformed JSON, this is just broken JSON or markdown wrapping, but it does not eliminate semantic errors. So anything with a wrong value insert field. So step one is you extract the data. And assuming it's correct, then obviously this is all done. But if it's not correct, this is the part where you really need to dial in. You're not meant to just say try again. You're meant to actually send very specific feedback.

### The validation loop

**28:32** · So instead of saying retry, you would say the original document, the field extraction, and the specific error. And this is how you would frame the specific error. Revenue field says 0, but document clearly says 4.2 million. So now you're giving it multiple areas to zero in on and see what might be happening. But just like everything, there's nuance. You don't want to just keep going in this endless loop. If the answer isn't there, if the information isn't in the source document, then retrying, even with the best of instructions won't help.

**29:03** · So it's not just knowing how to validate and test, but also knowing when to stop. Now, as a segue to the next section, back when I used to drive a Honda, once in a while you'd get this notification, which politely asks you to take a break. And typically, it's because they want you to have attention to the wheel, especially for longer drives. You can take this exact same paradigm in mind for the next principle. So, instead of worrying about driving sharply, this focuses on keeping claw sharp throughout the lifetime of a context window.

### Domain 5: Context Management (15%)

**29:33** · So, when you give something to Claude Code to read, it pays really close attention at the beginning. The first 40% of context window is really well primed. You have the system prompt, you have the first messages, you have your cloud MD injected at the beginning as well and it really pays attention. And this is also true near the very end where you have recency bias towards the latest messages. But the context in the middle or the monkey in the middle starts to get a little bit fuzzy.

### The lost in the middle effect

**29:58** · So information buried in the middle starts to get compartmentalized in a way where it can't maintain that full fluency or flow of thought. Now, the problem can get worse over time because every time Claude uses a tool, the result is added to this middle section. So, a customer comes back with 40 fields when you only need five. Each one pushes the important stuff further into the fuzzy zone. So, naturally, how do we fix this? Well, Enthropic comes up with three different ways to accomplish this.

**30:26** · First, you can pull out the key facts and put them at the very top of a conversation, essentially pinning them in a place where Claude will always see them. So you can think of it as a key fact summary block. Another method you can employ is trimming verbose tool outputs.

### 3 ways to fix context bloat

**30:42** · And what the word verbose means here is you get a series of data from a tool. A lot of this data could just be pure metadata that doesn't actually move anything forward and you can get rid of it. And by trimming it progressively, you just keep the tool outputs that matter which will flood the context window less. And the third way is to delegate tasks to sub agents so they can maintain all of their messy output in their own individual context and box.

**31:06** · It's all isolated and boxed off and you just get a clean summary back. The guide actually mentions explicitly that it's infinitely better to start a brand new session with a summarized version of outputs from before versus pushing through a conversation. Even if you're at that million context window because you have all of this different set of information, tool calls, different trials, pivots in the conversation that pollute your context window. If you're ever curious at what is in your memory at a single point in time, you can always go into cloud code, do slashmemory.

**31:40** · Then in here, it will tell you that automemory is on, what your project memory looks like if you want to check in at your cloud MD, the fact that you have some certain rules here, some level of user memory, and then you can also open your automemory folder to see exactly what's in there. So you can click on enter right here. This will open it up in another window. Then you'll be able to see a series of markdown files that denote exactly what it's remembering about your current session. And to close the loop on reliable outputs, there's a section related to human in the loop, which is basically when do you escalate a particular scenario to an agent.

### memory in Claude Code

**32:12** · So if you have some form of chat agent in the wild and someone asks to speak to a human, then the goal should not be to try to fix the issue first using a language model and not to try one more thing. It should be to respect this request and execute it right away. And it's important to zero in on this because it explicitly says that this will probably trip up people because you'll try to get creative with how AI can answer something. But if someone asks for handoff, you give them handoff.

### When to escalate to a human

**32:40** · Now, in the second scenario, the rules could be unclear and the agent could be unsure about what policy applies.

**32:46** · The prescribed action here is to escalate, but escalate using what's called a full package. This full package includes what the customer information is, the ID, the root cause, what was attempted and tried and what is the recommended action. So very similar to managing an actual customer system like Zenesk or similar, you would execute this in a very similar way. So the agent would technically come to the conclusion that it can't make any meaningful progress. And this is what it could look like in terms of a final package to hand off.

**33:14** · And for the third scenario, if it's a straightforward issue, the policy is clear, which is to allow the agent to resolve it. But it comes with a big caveat. Even if it resolves it perfectly, it should still ask, "Would you prefer I transfer you to human agent?" So, you wouldn't want to give the agent itself a confidence score and escalate it when it's low. And one of the many reasons why it thinks that sentiment analysis can miss the mark is it can misread sarcasm, cultural differences, and tone. So, I actually had to double check whether or not this was legit.

### Error propagation done right

**33:45** · So, I noticed that this is the question in the example guide here where it says, "Your agent achieves 55% first contact resolution well below the 80% target." And you can see here it says that sentiment doesn't correlate with case complexity, which is the actual issue. All right, and we're getting near the end here. And this portion of the guide just covers error propagation. Basically, what to do when things go wrong. Now compare that to a detailed error that includes what went wrong, what was attempted, any partial results that came back, and what else could be tried.

**34:15** · So now the main agent can actually make smart decisions, meaning trying a different search, using data from a previous run, switching to a completely different source, or just basically noting that gap and moving on.

**34:28** · So the TLDDR of the TLDDR is this just breaks down how to allow your agents to fail gracefully. Meaning failing in a way where you get meaningful errors so you can get meaningful outputs and meaningful retries. And just to bring everything together cuz we've had all kinds of thoughts and examples and paradigms. What are the five rules that you can take away that will set you on the right path whether you're just learning cloud code or you're preparing to dive into the cloud code architecture exam.

**34:53** · So rule numero uno is if it has to work 100% of the time whether it's money related security legal don't rely on telling claude in a prompt use a hook that physically blocks the action. So prompts are suggestions and hooks are the laws. Rule number two is when something breaks never return a generic error. Always include what broke, what tried, what partially worked and what else could be done.

### The 5 rules that apply across every domain

**35:19** · Rule three is keep your agents focused. four to five tools max per agent and an agent with 18 tools makes infinitely worse decisions than one with five that are directly relevant. So less choice and better decisions. Number four is review your code in a separate clawed session. The one that wrote the code is naturally biased toward thinking it's correct. A fresh session with no history catches what the first one will never.

**35:47** · So, two or three real examples of what you want produce more consistent results than a full page of written instructions. Claude learns the pattern, just not the format. And the real trick here is understanding that although these are five separate rules, they're all kinds of the same concept, which is if you need to rely on building proper agentic systems in the wild, then you want to focus on the right tool that has the right level of determinism, which is its ability to execute something predictably every single time.

**36:15** · And the main thing to take away from this is that although these are five different rules, they're essentially the exact same concept just showing up in different patterns. And the TLDDR of it is to be structured, to be explicit, and to not have a whatif or a probably will work with something like a prompt when you need the firepower of something like a hook. So, if you nail understanding these core five principles, it will give you the 80 of the 8020. And more importantly, it will give you the foundation to keep adding on additive knowledge.

**36:46** · Now, you might think that I'm going to end off there. You might be even hoping for it, but I'm going to leave you with one more thing before we depart for this video. So, I found this really good guide by this user on X. I can't pronounce the username, but he came up with this article here that says,"I want to become a claude code architect." And in it, he came up with a series of prompts that break down each and every section of the official architecture guide. He's created these very bespoke prompts, I would imagine, using AI. And you can just pull this up and go into cloud code.

### Interactive study prompts (X post resource)

**37:18** · You can paste it and then it will ask you and interview you on your competence on a particular domain. So if we take this behemoth prompt for section one. This says you are an expert instructor teaching domain one architecture and orchestration of the claude certified architect certification exam. And then at the bottom it says welcome. It tells you the waiting of this particular section. And it asks you how familiar you are with the Gentic systems.

**37:45** · And if you say something like none, then it will create a custom learning path for you to start going back and forth through these concepts. So you see here it breaks down what an agentic loop is. And at the very bottom there's a concrete example, the critical field. We already alluded to this, the stop reason, the anti pattern, the correct pattern. It's going to keep going telling you which part of the guide to reference. And this is awesome.

**38:09** · So kudos to this individual. I'll leave the link for you with some other goodies that I'm about to tell you right now.

**38:14** · Now, as I recover from filming this video, I'm going to leave you with a mega guide going through everything I walked through today with the actual visuals themselves, a breakdown of the concept, hopefully in a better way than I was even able to articulate. And I'll make that available to you in the second link in the description below. And for those that want to go infinitely deeper on cloud code and be in a whole ecosystem where you have coaches, myself, a brand new upcoming course which is bound to blow your mind in terms of what you can do with cloud code, then you'll want to check out the first link in the description below and maybe join me in my early AI Doppers community.

**38:46** · And for the rest of you, if you found this to be a helpful labor of love, one thing that you could do as a thank you is just leave a like and a comment on the video. If you like my stuff and you want me to go deeper on these kind of concepts, then subscribe to the channel and let me know.