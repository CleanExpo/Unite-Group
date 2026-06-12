---
title: "Master 97% of Codex in 1 Hour (full course)"
source: "https://www.youtube.com/watch?v=3TdD8Qv5Tk8"
author:
  - "[[Nate Herk | AI Automation]]"
channel: "Nate Herk | AI Automation"
published: 2026-05-06
created: 2026-05-13
description: "Full courses + unlimited support: https://www.skool.com/ai-automation-society-plus/about?el=codex-97-percentAll my FREE resources: https://www.skool.com/ai-automation-society/about?el=codex-97-percen"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=3TdD8Qv5Tk8)

Full courses + unlimited support: https://www.skool.com/ai-automation-society-plus/about?el=codex-97-percent  
All my FREE resources: https://www.skool.com/ai-automation-society/about?el=codex-97-percent  
Apply for my YT podcast: https://podcast.nateherk.com/apply  
Work with me: https://uppitai.com/  
  
My Tools💻  
FREE MONTH voice to text: https://get.glaido.com/nate  
Code NATEHERK for 10% off VPS (annual plan): https://www.hostinger.com/vps/claude-code-hosting  
  
Codex is an absolute beast for getting real work done, but most people barely scratch the surface of what it can actually do.  
  
In this video I take you from zero to a fully working YouTube comment intelligence system, complete with skills, automations, a deployed dashboard, and browser use QA. By the end you'll know exactly how to set up Codex, build reusable workflows, and ship real projects without babysitting every step.  
  
Sponsorship Inquiries:  
📧 nate@smoothmedia.co  
  
Connect with me:  
https://www.linkedin.com/in/nateherkelman/  
https://x.com/nateherk  
https://www.instagram.com/nateherk/  
  
TIMESTAMPS  
0:00 What is Codex  
4:02 What We're Building  
7:34 Grab My FREE Resources  
8:04 Connecting to YouTube  
12:36 Plan Mode & API Setup  
21:40 Comment Insights Excel  
26:44 Building Reusable Skills  
32:46 Designing the Dashboard  
38:50 Deploying with GitHub & Vercel  
44:23 Weekly Automations  
48:25 Browser Use & QA  
57:59 Final Thoughts

## Transcript

### What is Codex

**0:00** · So, Codeex is an absolutely incredible super app. I've been using it a lot more lately and I'm not saying that I'm ditching Cloud Code. I still use them both regularly because they're both good at different things. So, today's video I'm going to break down every single important thing that you need to know about Codeex to be able to, you know, open up the app for the first time and then actually have finished automations and websites and whatever you want to do in Codeex done by the end of this video.

**0:21** · So, whether you've never opened up a tool like this before or if you're already kind of used to using Cloud Code, I'm going to break down everything as simple as I can. So, first of all, if you fit in this bucket of someone that uses ChatGBT just on the web or uses Claude, you are going to get this really quick because what we're looking at right here is Chat GBT. We have the ability to make new chats. We can search through chats. We can have different projects. We can have all of our different chats over here. And then we talk to chat right here. And if I open up the codeex app, which is what we're going to be using today for the entire video, it looks pretty much the exact same.

**0:49** · We have projects on the left, we have chats on the left, and then we can talk to chatbt right here. We use this toggle to change the model whether we want to use GBT 5.5, 5.4 or other models. We can change the speed and then we can also change the intelligence. So low, medium, high or extra high. And I'll get into this stuff a little bit later in more depth. And this is also very similar to the Claude code desktop app where we have the ability to chat with Claude right here. And then on the lefth hand side, we can see our chats and our projects. So that is the interface. Don't get overwhelmed.

**1:16** · So I'm going to get you guys all familiar with the interface and go over all the settings that you need to know. And then I'm going to show you a full project from beginning to end. Building skills, connecting to things, building automations, and then deploying on some sort of website. So, buckle up. All right. So, what actually is Codex?

**1:32** · Codeex is basically a massive super app.

**1:35** · We can use chatbt, same way you talk to it on the web, but now we work in projects. And Codex can create Excel sheets, read Excel sheets, look through all your local files. It can do basically anything on your computer, including using the mouse and keyboard and clicking around and automating a browser. It also lets us build these reusable skills. We can build websites.

**1:53** · We can build apps. We can build video games. And then we can automate and push all that stuff so that it actually runs while we're sleeping every night. So the main difference here between web chat is that you're basically just talking. And you have these connectors in chatbt now.

**2:04** · So you can get a little bit more functionality. You can give that AI brain a bit more of like hands. But in CEX, it can do everything. It's one of those things where Codex can do everything that chat can do, but chat cannot do nearly as much as what Codex can do. So you might as well just switch over to something like codeex. And if you are curious about the cloud code versus codeex difference, they're different harnesses, right? So they fundamentally work a little bit different but very similarly. They also use different models. So cloud code natively under the hood uses opus and sonnet and haiku and codex under the hood uses the different chatbt models.

**2:37** · Now I did do a full breakdown where I actually tested Opus 4.7 against GBT 5.5 and I got some really interesting results. So if you guys want to check out this video next, I'll tag that right up here. I definitely think it's worth just at least skimming through because ultimately these models have very different strengths is what I've noticed after playing with them non-stop. I really like Claude for being sort of like exploratory and brainstorming and helping me get creative and think through things and plan, but then I really like codeex for being pragmatic and it feels like it does better at following my plan if the plan grows longer longer.

**3:06** · And it's really good at executing and it's really good at finding issues and troubleshooting things that sometimes Claude for some reason can't handle. So, I'm not in here saying that I love Codeex more than Claude Code. I'm saying that I'm using them both and I'm learning more about both every day. And one other thing I really like about Codeex is you can see my little pet down here, which I'll tell you guys how you get this later. But this pet while you're working, it stays in the bottom of your screen and it tells you what it's working on. So, it's really nice to be able to multitask and see what's happening inside of Codeex.

**3:34** · And the pet's kind of funny. And it's more than just having chats. It's the ability to have everything organized on your workspace. So, if you guys watch my recent video about Claude Code operating system or you've seen my executive assistant video, this is my Herk 2 project, which is basically where I live inside of Claude Code. And all of this is is a bunch of folders and files. I've got a bunch of files here. I've got a bunch of different folders. I've got settings. I've got skills. I've got agents. I've got projects. I've got all these things that I'm working on.

**3:58** · And all this is is a bunch of local files, which means I can have codecs work inside of this directory and do everything as well. All that we're doing when we're using these different models is we're organizing things into a structure. A structure that different agent harnesses can understand. And whether you want to use codeex or cloud code or cursor or, you know, openclaw, whatever it is, they can all work out of that directory as long as you have some sort of instructions and guidelines over what actually lives where. Okay. So, basically what I'm going to be building with you guys today is a bit of a YouTube comment intelligence system.

### What We're Building

**4:28** · So, we want to be able to pull in YouTube comments from my channel. We want to be able to have those be analyzed. We want a workbook in Excel. We want like some data visualization. And we want a dashboard that lives somewhere on the web so I could go check it on my phone if I'm out on a walk. And I'm going to show you how we ship and deploy all of that. So basically from zero to a working project is what I'm going to show you guys today. So let me go ahead and open up the Codeex app and show you guys how this works. Now real quick, what you have to do is have some sort of chatbt plan. The good news is if you're on free, you can still try out Codeex.

**5:00** · You have limited Codeex access, but I would recommend just hopping on the $20 a month plan to get started. And if you're running into your limits pretty quickly, then maybe you want to upgrade to Pro. Now, what else is really nice about ChatBT subscription is you can plug it into OpenClaw or Hermes agent, which is really, really nice because obviously it's so much more expensive to pay per token rather than just being on some sort of subscription. And then you're just going to go ahead and go to Codeex and then just download the app for your operating system. That's the way that we're going to be using it today.

**5:27** · Ultimately, you will be getting more full functionality if you're using codecs in VS Code extension or in the terminal, but for the sake of the video, using the app is going to get you super far either way. There's just a few little things that you want to keep in mind, which is why I'm making this YouTube video. All right, so let's go ahead and get started. So, on the lefth hand side, you can see I've got one project open and this project is actually how I built the slide deck that you were looking at earlier. So, this slide deck I built right here in this project. And you can see because I'm in the app, Codex lets us basically navigate this right here in this little local host browser.

**5:58** · And this is also where if I said, "Hey, can you use browser use and test out this slide deck to make sure everything looks good and make sure it functionally like clicks and moves," then it would bring up a mouse over here and we would see it move around and we would see it click, which I'll show you guys later in the video.

**6:14** · But anyways, what we're going to do is we're going to start a new project because over here you can see we have a bunch of random chats which can still do things like building games and building automations and simulators. But what we want to do is we want to work inside of an actual project. Because these chats, any deliverable that we create doesn't really have a home, you know, just lives somewhere random in our documents. But when we're working in a certain project, I can actually grab the local working directory. So I copy that. And if I go into my file explorer and paste that in, now I'm inside of the actual project that we're working on in codec.

**6:42** · So now I can see different assets that live in this project. All these images. I can see different guides and I can have a little bit more organization to this ongoing project in my business. All right. So we're going to start a new project. I'm going to click on new chat in the top. And then right here you can see I'm inside of the codeex 95% project, but we're going to go ahead and add a new project. So that's going to open up a little um file explorer over here. And then you choose where you want this to live. So for this example, I'm going to go to my desktop. I'm going to go into a folder called Codeex YouTube.

**7:14** · And I'm going to create a new folder inside of this folder just called um YouTube Analytics Demo. And we're going to go ahead and open up this folder and select that. And now you can see it's a new project over here on this lefth hand side that we're going to be working in.

**7:27** · Now right here you can see I have something called full access. By default you won't see this. It'll just be on default permissions. So, I'm going to kick off some sort of chat here and then I'll show you how we actually get that set up. Real quick, guys, I know we're going over a ton of information in this video. So, what I did is I threw all of this into a complete PDF resource guide that you can use and reference later.

### Grab My FREE Resources

**7:45** · All you have to do to get that is join my free school community. The link for that is down in the description. And once you get in here, go to the classroom and click on all YouTube resources and you'll be able to find all of my repos, all of my skills, resource guides. Everything that I've ever dropped inside of here is completely free and anything I've shown on YouTube is usually dropped in here. So join the community link in the description and let's get back to the video. Thanks guys. All right, so the first thing that I want to do in this project is I want it to be able to just kind of familiarize itself with my workspace and with who I am. And the way that I'm going to do that is I have a project locally.

### Connecting to YouTube

**8:15** · If I go to my um if I go to my desktop and I go into a project here called YouTube OS, I have like all of my transcripts right here from some YouTube videos. So what I'm going to do is I'm not going to give it that file path. I'm just going to say, "Hey, in my desktop, look inside my YouTube OS folder and just pull in 10 of my raw transcripts and analyze them." This is just to show you guys how good it's going to be at finding different files locally and being able to organize them, move them, delete them, whatever you want. In this case, I'm just telling it to read them.

**8:45** · All right, so I want you to go onto my desktop and I want you to look at a folder called YouTube OS and I just want you to familiarize yourself with me. I make YouTube videos on AI automation and inside of this folder I have a bunch of my raw transcripts. So I just want you to read through like five to 10 of those just to familiarize yourself with the type of content that I make. You shouldn't do any organization. I just want you to read those for context. Now what's cool about this is codeex once again is an agent that lives locally.

**9:11** · So, just because it's working inside of one project, which is our, you know, um, YouTube sort of demo folder, that doesn't mean that it can't navigate anywhere else inside of your local files. And because we're telling it to do so, it's going to search. Right here, you can see it's searching inside of my desktop, and then it's going to find the YouTube OS, and it's going to drill down into that folder, and it's going to keep searching until it finds what it wants.

**9:33** · Now, a quick warning, this is not the most effective use of codecs or of your tokens. The more effective use would be to say, "Hey, this is the folder right here with all my raw transcripts. I'm going to copy this path, and I'm now just going to give Codex this exact path so it can just look in there instead of having to search for it on its own." But I just wanted to show you how it's able to do this because you can see right here inside of my transcripts folder, I have one called RAW, and that's the one that I wanted it to look at. And right here, it says there are two files, raw and then processed. So, it doesn't know which one to look through.

**10:03** · So anyways, the more specific you can be with your prompting and with your pointing, the better. Now, let's also, while this is running, talk about the model stuff over here. So, right now, you've noticed that we're on extra high. And I would say that extra high is probably overkill for that sort of job. For the most part, I'm using medium to do all of my planning and my brainstorming. And then every once in a while, if I'm doing a huge build or some massive skill, I'll switch to high. I'm honestly hardly using extra high unless I'm hitting some sort of bug or issue that it's not able to solve.

**10:33** · Anyways, it has read nine transcripts, so it has a little bit better of an idea now about who we are. But just to show you guys, this is still the folder that we're working in, the YouTube Analytics demo. And there's nothing that exists here. So even though it knows this, this knowledge only really lives in our overall chat GBT memory and in this specific chat window. If I opened up a new chat, it probably wouldn't still have the knowledge about this. So what I'd probably want to do is say, "What I want you to do is set up an agents.mmd file. This should have context about me and about what the goal of this project is.

**11:03** · Ultimately, what we're going to do here is we're going to build a dashboard that's going to be pushed to Verscell and it's going to have information about my channel and some analytics around the comments and stuff like that. So, that's the end goal. We're going to have to connect to YouTube. We're going to have to pull in data. We're going to set up some skills and some automations, but I just want you to get us started here with a quick agents.mmd file. And now I'm going to go ahead and shoot that off. Now, why do we need to create an agents.md file? Well, if you're coming over from claw code, you know that we always want to start a project with a claw.md file. And this is just agents.mmd.

**11:35** · It's the same thing, but codeex expects a different terminology.

**11:40** · And what this agents file does is it's basically like its onboarding doc. Every time you open up a new chat, it's first of all going to read the agents.mmd file and it's going to get organized with what is my goal, what is this user doing, and how do I help them as effectively as possible. So this document has been created. If I click on open, we're going to be able to read it right here. And it's just a very simple markdown file. This is the project right here. This is about Nate. Nate Herk does this. This is the project goal. This is the product direction. So, we're just giving it really important information that it needs to know about our project.

**12:11** · And you can see now if I pull the file explorer over, it has created this agents markdown folder, which is exactly what we wanted. Sorry, not folder, file.

**12:19** · Okay. So, now that that's out of the way, I'm going to go ahead and close back out of that and we're going to get started. So, what I'm going to do is I'm going to click on this button and I'm going to turn on plan mode. Plan mode is what I like to start with when I am creating some sort of plan. That basically means that Codeex won't actually execute anything. It's just going to brainstorm and help you guys get clear on what you want to build before you actually build it. So, I always start with plan mode. Now, I'm just going to start yapping. And by the way, if you guys are curious about the tool I use for voice to text, check it out in the description. It's called Glido. I'm now an official member of the Glido team, which is super exciting.

### Plan Mode & API Setup

**12:47** · I fully switched over from Whisper to Glido because it's faster, it's more private, and it is a way more agentic tool, and we've got a really cool vision. So check it out in the description. Okay. So now that you understand that context, the first hurdle for us to overcome is how do you actually connect to my YouTube in order to be able to pull in my data? I want you to be able to specifically at this point be able to pull in a bunch of comments so that you can analyze them.

**13:11** · So help me figure out how we do that and then explain it to me step by step. And that's really the mindset shift with tools like Codeex or Claude Code is if you don't know if something's possible, instead of defaulting to, oh, I need to go to YouTube or oh, I want to book in a consulting call with an expert, just ask Codeex or Claude Code. ask it to do research and explain things to you. And that's basically how I learned everything that I know. So, while this is running, I wanted to explain something real quick, which is called plugins. Plugins, MCP servers, skills, connectors, whatever you want to call them. We kind of have this interface inside of codeex to do stuff like this.

**13:43** · And what you'll notice is there's a bunch of different plugins here. We've got hugging face, we've got Versell, we've got GitHub, we've got game studio, we've got a bunch down here for design, reotion, Figma, hyperframes, Canva.

**13:54** · We've got stuff for lifestyle, productivity, and this lets us basically connect to a lot of the tools that we already know and love. Google Drive, Slack, SharePoint, Teams, whatever you may need. A lot of that stuff is available here. And if you can't find it, you can go ahead and search. So like Slack, we have it right there. But look, if I search YouTube, there is no default plugin right here. And that's why I had to ask Codeex, okay, so there's no plugin. How do I actually access YouTube data? And so it comes back here and it asks us some questions. It says for the first comment analysis milestone, which connection path should we plan around?

**14:25** · API key, OOTH, or both. Um, I'm just going to go with its recommendation because let's say I don't know what I need to do. And I'm going to click on API key. What should the first comment poll focus on? I'm just going to say recent videos. And now, if it has any other questions, it'll go ahead and ask us those first. Now, one thing you'll notice is because it already was searching through my other folders and projects, it did find an API key in a different project. But I'm still going to show you guys how you would get this set up because it comes back here with a plan which we can go ahead and read. So what it wants to use is it it found an API key. So not full OOTH and then it needs to actually convert everything.

**14:57** · So what I'm just going to say is instead of implementing I'm going to say I'm glad that you found that API key. But let's set up a fresh one because in my Google Cloud I want to have a separate API key for codeex and a separate one for cloud code. So let's just go ahead and assume that we're going to create a complete new one from scratch. And now I'm able to shoot off those changes. Codeex is going to review the plan and then edit it. And then once we're aligned on the plan, we'll go ahead and start executing. So now it's come back and it has Okay, we're going to do a brand new Google Cloud API key. If you wanted to read through all of this step by step, you could.

**15:27** · But I'm just going to go ahead and say submit implement the plan.

**15:32** · So there's some stuff that we're going to have to do here. We're going to have to go into Google Cloud Console and we're going to have to create this new project. Um, enable this API and then grab the API key and then get it configured inside of Codeex. So, if this part of the tutorial isn't very interesting to you, you don't want to watch me get it set up, maybe you want to do some stuff first with the native plugins, which is much easier.

**15:50** · Typically, these plugins, you just basically sign in the same way where you would open up Slack and sign in, or the same way you would open up Gmail and sign in. And that's a lot lot easier.

**15:58** · Okay, so I have to go to Google Cloud and get everything set up in a project.

**16:02** · If I didn't know exactly how to do this, it would tell me step by step as you guys saw in the plan. But what it's going to do is it created another file for us. So, it created this one called env.local. So, what I'm going to do is head over to my Google Cloud Console.

**16:14** · I'm signed in with my YouTube account and I'm going to go ahead and create a new project. So, I'm going to call this one um codeex demo. I'm just going to go ahead and create this project. And once that's spun up, it's pretty simple. We just have to create a connection to YouTube data API. And then we're going to create an API key. So, I'm going to select this project. The first thing I'm going to do is search up here at the top for YouTube data. And we're going to grab the YouTube data API v3. And then I'm going to go ahead and click enable.

**16:43** · And once that has been enabled, it should pull up a new screen that looks like this. And then I'm going to go down here to credentials and I'm going to just create a new API key. So create API key. This is just going to be called codeex YouTube demo. And then right here for the restrictions, I'm just going to once again type in YouTube. We're going to check YouTube data API v3. And then we're going to go ahead and create that API key. And it gives me this value that I'm going to go ahead and copy. So I'm going to copy that. And then I'm going to pull in that file that it created, the env.local. And I'm just going to open this file real quick with um my notepad.

**17:14** · And here is where I'm going to put my YouTube API key. I'm just going to paste that in right there. Hit save.

**17:20** · And then I can close out of that because what we need to get next is we need to get our YouTube channel ID. I'm not actually going to do the uploads playlist. I don't think it needs that.

**17:28** · But I am going to go find the YouTube channel ID. Oh, but this is actually cool. My YouTube channel ID is already in there. and the playlist ID is already in there because it was able to just pull it from a different project. So obviously if you didn't have that already set up, it wouldn't do that, but it would explain to you exactly how to do that if you needed to. So now that we have that API key put in, let's just see if it works. Okay, so I've given you the API key in that localenv, can you go ahead and test it to see if that connection works? And if not, then we'll have to make some changes.

**17:56** · Okay, now while this is running, what you guys might notice when you hop into Codeex is that it might pause a lot to actually ask you questions and like approve things. And that's what happens when you're on default permissions. So, if you want to be able to change that, you're going to go up here to your settings and then in general, you can see right here auto review or full access. And this by default will be turned off. So, if I turn this on, then when we're back in our chat, we now have the ability, see right here, this exact example, allow network access. And I want to say, yeah, allow it.

**18:24** · Or if I switch this to full access now, it's just going to do everything without asking for permission. So obviously it comes up as orange here because there's sometimes where you might not want full autonomous access. And I think it's best practice when you're first getting started and you're first building some automations to maybe just leave it on default. But once you start getting a hang of your skills and you start getting a hang of the flow, then moving to full access is going to save you a lot of time so that you can actually not have to babysit it.

**18:50** · But I had to call that out because, you know, we've seen horror stories of agents deleting databases or sending out mass emails and stuff like that. So, you just want to be safe with it. I personally have never had any sort of problem like that. That usually comes from context rot or very vague instructions or or just not being super smart with your planning. So, you can see what's happening here is it's trying it out, right? And it's running into some issues. But what's great about this agentic loop is that it's going to keep trying things until it actually goes through. There we go. You can see nice the key works for channel data.

**19:18** · And I'm going to do one more test to make sure that I can pull comments from recent videos. So, a big mindset shift when you're using any of these tools is to just let it run, let it try things, help steer it in the right direction, ask questions, be curious, and just take a look at what it's doing because it tells you every single thing that it's trying. But now we can see I've tested the key. I can get comments from your recent videos and it's completely working as expected. However, PowerShell's built-in web request had a local TLS issue, but Node and Python both connected cleanly. For the project, that's fine.

**19:50** · We'll use Node and server side code for the dashboard anyway. Now, here's something to think about. I don't really know what that means, but what I want to make sure is that that doesn't happen again or I want to make sure that this project doesn't lose this knowledge because it it it ran into a failure. And whenever you run into a failure, you want to treat that as golden knowledge because it means you have more data to make sure that it doesn't do it again.

**20:14** · So all I'm going to say is, okay, thanks for testing that. I want to make sure that you don't ever run into that issue again, and I want to make sure that that knowledge is saved in this project. So can you just throw together a quick file somewhere in your memory, somewhere in this project to make sure that you already know that so that next time it doesn't happen again. And doing stuff like this, having this sort of habit is how you actually make these systems get smarter over time rather than just feeling like you're always repeating yourself or that you're always running into the same issues. Another mindset shift for you right there. So here it decided to add this into the agents.mmd.

**20:46** · Right now I have no objections to that, but as your projects grow, you don't want to put everything in the agents.mmd because if that agents MD file gets really huge, it's going to use more of your tokens. Okay, so before we keep going, I did want to point out one other thing down here, which is this little bar. This shows you how much of your context window is currently filled up.

**21:04** · Now, if you're using cloud code and you're using Opus, you have a million.

**21:08** · So, it's, you know, about four times as much as this in uh Codeex. However, Codeex automatically compacts just like Opus does and just like Cloud Code does.

**21:16** · So, it's really nice. You don't have to worry about it too much, but you still want to be thinking about some general context management tips. I've got some videos on my channel about that that are agnostic to whatever tool you want to use. I'm not going to dive super deep into context window management in this video, but just wanted to point that out as well. Okay, so what's next? What I want to do is I want to show you guys that it's able to pull comments and that we're able to create an actual deliverable from it. So, let me just once again go back to plan mode. All right, so what I want you to do is pull in, you know, about 100 or 200 of my most recent comments and I want you to analyze them.

### Comment Insights Excel

**21:48** · I want you to find patterns and I want you to display all of this in a um Excel sheet and I want it to be a visual representation of this data that has interesting insights for me as a content creator so that I can keep making content that people want and I can keep answering questions that are coming up frequently. So go ahead and do a plan for this and structure what the Excel sheet deliverable will look like.

**22:10** · So I shot that off. I'm going to let you guys know when we have a plan or if it asks me any questions. A couple questions here to make sure that it understands what we want. It's asking about the recent comments. I'm just going to say across recent videos, how many should we pull? Let's say 200. How should we classify and summarize the comments? I'm just going with all of its recommendations. Those were pretty good.

**22:27** · And so, if I switch over to a different tab, let's say we're back on our slides.

**22:30** · You can see my pet down here has a little one next to it. Well, the one's gone because I switched back into Codeex, but that little one, if I would have hovered over it, it would show me what it's working on. So, now I can keep tabs on my workflow while I'm doing other things. And Codeex makes multitasking really easy because of the fact that I could open up a new chat in this project and work on something else.

**22:49** · Then I could open up a new chat in this project and work on something else. And it will color code and give you like a little blue dot or yellow dot on the side here if one of these sessions needs attention. So anyways, here is the plan.

**22:59** · What I would recommend is at this point you read through it. You make any changes to specific sections if you want, but for the sake of the video, I'm just going to go ahead and submit that plan. But while this is running real quick, I wanted to show you a few other things that we can look at. So if you do slash inside of this chat, there's things that you can actually look at. So we've got autoreview, code review, feedback, MCP, memories, model, personality, pet, plan mode, reasoning.

**23:22** · There's all of these different skills that we can use like browser use, GitHub, Higsfield, PDF, skill creator.

**23:29** · The slash is going to open up a lot of different things for you. And of course, what you can do is you can also tag things. So, if I do an at, this is going to let us tag either specific plugins or specific files that live somewhere in this project. So, if you're ever trying to reference a specific plugin or something specific, then it's probably best to try using the slash or using the at to actually tag that in your chat.

**23:50** · Now, the reason I wanted to bring up the slash is because you'll see one right here called slash personality, which if I shot that off, it would actually let it, you know, do something. So, what I can show you is I don't want to interrupt this main session. I could come up here and I could click on open side chat and that opens up a different little conversation here that still lives in this chat, still lives in this project. So if you're coming over from cloud code, this is pretty similar to slash by the way. So what I can do over here is I can do slpersonality. And now I can set if I want the personality to be friendly or pragmatic.

**24:18** · And I guess I didn't actually need to switch over here because it just opens like this. But right now we're on friendly. I'm actually going to switch this to pragmatic. You can see this says concise, task focused, and direct. And honestly, most of the time I'd probably prefer pragmatic. So, I'm usually working on pragmatic by default. But now that we've opened the side chat, let me just show you guys something else. Um, give me a quick update about my YouTube channel and, you know, the type of videos I've been making recently.

**24:45** · Just to show you guys that, okay, if you have your agent working right here on something and you don't want to interrupt it, but you have some sort of side question that is relevant to this project or maybe relevant to something that you guys were working on earlier, you can ask over here because right here you can see it has the context of what we talked about already. And I could go back and forth a little bit and then I could just close out of this side chat whenever I'm done. Okay, so that has been created. did. It pulled in 200 recent comments across three recent videos. And I could open it up right here in this dashboard sort of view right in Codeex, which is awesome.

**25:14** · And I could actually make some follow-ups and chat with it right here. But it's a little bit finicky, to be honest. So, what I'm going to do is close out of that. And I'm just going to open up our folder again, which was right here. And you can see there's a lot more that lives in here now. Not only do we have our agents and ourv, but we have scripts and we have outputs and we have different nodes and modules, which has a lot of stuff. So if at any point this starts to feel a little bit unorganized and you don't understand the structure, all you have to do is come into Codex and say, "Hey, help me like reorganize this or maybe give me a document that helps me navigate it a little bit better."

**25:45** · Because of course this lives in a local directory and Codex can touch it, read it, organize it, edit it. So if I go to outputs and I go to the YouTube comment insights, we see all of this different stuff that it did. So it took some screenshots as you can see, but then it also created the actual Excel sheet. So I'll open this up right here and we can take a look. All right. So, we have YouTube comment insights 200 newest public comments across recent Nate Herk videos generated May 5th, 11:00 a.m. So, we can see the question rate, the content requested rate, top mentioned tools, claude code. Uh-oh.

**26:18** · We've got high priority stuff, top pattern, skip videos, stuff like that.

**26:22** · It even started to create some visuals here, which is awesome. So, this is content category mix over here. It shows the mix between general feedback or questions with um actual values. So 55 were general feedback, 53 were questions. Some of these were access, positive feedback, tool comparison, pricing stuff. Over here we have different tools. So cloud code, Higsfield, Codeex, API, and then over here we have some other stats as you can see. Now we have a bunch of different tabs as well. So we have creator insights. So ranked comment patterns and recommended creator actions.

### Building Reusable Skills

**26:50** · So I'm able to see the percentage breakdown of different types of comments. And it also gives me recommended actions with priority scores. So that's pretty cool.

**27:00** · I also can see frequent questions, so things that are coming up as patterns.

**27:04** · It's giving me content ideas now as well because it's analyzing those comments.

**27:08** · It's giving me nice reply opportunities.

**27:10** · And then it's giving me just the raw comments. So this should be 200 rows of our actual comments that it would pulled. 204 as you can see because the first three or four were just nonsense.

**27:21** · So that is awesome. And what you guys might be thinking is, okay, is this actually useful? Maybe not because we just said, "Hey, give me analytics."

**27:30** · Right? If you guys remember my actual prompt, it was very very vague. So if we would have spent more time in the planning phase or if we had certain analytics that we're tracking very heavy or certain comments that we're really looking out for, we would give that to Codeex as knowledge and it would make this actual um you know insights. It would make it much more customized and tailored. So now let's talk about how do we turn this into a skill? So first of all, what is a skill? Well, a skill is basically a repeatable recipe. So, if I come back in here and I click on plugins, we saw all these plugins, right?

**27:58** · These are actual like connections and potentially MCP servers and kind of like some other, you know, it's a package that people are able to install and use, but skills are more of just like instructions. So there's an image genen skill, there is a open doc skill, there's a GitHub review follow-up skill, a document skill, and these are all basically just markdown file instructions that tell Codeex how to do something better. So how to design a website better or how to, you know, give you a morning brief.

**28:26** · And so what we want to do is we want to turn this exactly what we just did into a skill so that anytime I say, "Hey, go give me more YouTube insights." It knows what endpoints to hit. It knows how to pull them in. It knows how to make the Excel sheet. It knows how to do all this. And the best way that I like to make skills is I just basically brainstorm with with codeex to do something. And then after I get an output I like, I say, "Okay, turn that into a skill." So this was the ultimate deliverable, right?

**28:51** · So what you just did is you helped me pull in data from my YouTube, you got comments, you ran an analysis, and you created me an awesome Excel sheet deliverable. I want you to turn that into a skill so that every time I say to grab my YouTube comments and give me some insights, you do this exact flow and that makes it more consistent. So, I'm going to shoot off that message and while it's doing that, just think about it like this.

**29:12** · If someone asked you to create or not create, if someone asked you to make them chocolate chip pancakes, you're going to open up your cookbook or pull up your phone and you're going to read a recipe and you're going to follow it to a tea. You're going to follow the measurements, the ingredients, and the temperature and the timing and whatever.

**29:28** · And the next time someone asked you to make chocolate chip cookies or pancakes, you would just use that same recipe and they'd come out pretty much the exact same way. Because if you didn't use the recipe, you would just be guessing and you'd be you'd be sort of measuring and you'd be feeling and it just wouldn't be consistent. And the cool thing is now that you have this recipe to use, every time you use the recipe, you might be able to make it better. If one time you experiment and you add some more chocolate chips, you either like that or you don't. You update the recipe. Maybe one time you realize that you're actually leaving too much raw batter inside. So what do you do?

**29:56** · You update the recipe to say, "Okay, you leave it on four minutes on each side rather than three and a half minutes on each side."

**30:02** · You're able to each time you use the recipe, have it be updated. And that is the power of building these skills. And you can see that it's able to work backwards and reverse engineer a skill from our output. And what it does is it puts them in a file called thecodex, which kind of lives globally, which means whenever you're working inside of any codeex project, you're going to be able to use that skill. And all you have to do to call it is you'll do a slash command and then you will just name the skill. So if you guys remember down here we have all these other ones.

**30:30** · I could do slash browser use slashimage genen slash PDF and that's how I could be able to call them. The other way you can call them is you can actually just have them be natural language. So just to show you guys another example if I go to my Herk 2 project and I know this is more optimized for cloud code but we have acloud folder which is local. So, if I click into here, I can see I have a folder called skills. And all of these are my different skills that currently live inside of my AIOS. So, let's say here I have a morning coffee skill. And I'm going to open this up real quick in my notepad just to show you guys. All this is is a markdown file.

**31:01** · We have the name of the skill. We have the description. So, here it says, "Use when someone asks for morning coffee to prep or plan their day." So, anytime in Cloud Code I say, "Hey, can you help me plan my day?" Claude Code will grab this morning coffee skill, read it, and then execute it. And it says, "Okay, here's the context. Here's the recurring meetings. Here is the meeting prep. Here are different reference IDs. Here's everything you need to know and the order." So, step one, step two, step three. Here's what you do whenever Nate asks for a morning coffee skill. So, that is all that is happening right here.

**31:32** · You can see it created this skill called YouTube comment insights. And it did this at the global level. What I mean by that is this lives locally in our directory that sits across any codeex project ever. So, if I open up this other project, I could use the skill or we could put it locally in our project, which would mean I could only use this skill in this specific YouTube analytics demo project. And all you have to do to change that differentiation is say, hey, instead of putting that global, put that locally in this project. Or instead of having that locally in this project, make that global.

**32:01** · So now, if I do a slash and I do YouTube comment insights, we have this right here. YouTube comment insights analyze comments into an Excel report, which is the skill that we just built together. So, that is awesome. Okay, so before we move on to the next step of this, I wanted to talk about pets real quick just because I know you guys are dying to understand how you can get this. It's really simple. You go to your settings and then you're going to go to your appearance and scroll all the way down and you can see right here we have pets and we can choose between different ones. So, right now I'm just using the codeex pet, but I could choose Dewey or CDI or bod or stacky.

**32:31** · So, I'm just going to go ahead and switch this to fireball for fun. And you can see down here it changes. And yes, it's kind of a fun little UI thing, but remember if I'm not inside of codeex and I'm in this dashboard over here, we can still see the pet and it will tell us when it's working on things and when it's done with things. So, it is a little bit practical as well. All right, so now we have a deliverable. We have an Excel sheet and we're going to use that as the backend that basically powers this next section. So, I'm going to open up a new project because we're kind of starting a new goal, a new a new deliverable.

### Designing the Dashboard

**33:01** · So, I want to open up a new chat. And this will still be able to access everything that's in this folder. So, I'm going to go ahead and switch over to plan mode here. Okay. So, here's the idea I have.

**33:13** · You have access to a file inside of this project. And what I'm going to do is actually reference the exact file. So, I'm going to look for the YouTube comment insights right here. And I'm going to tag that file.

**33:27** · So, what I want you to do is create me a dashboard. Spin this up on a local host.

**33:31** · And I want it to have really nice UI elements and you know charts and graphics and things. So visualizing my data and I want to be able to see different insights about my YouTube comments. What I want you to do here is I want you to use GBT image 2 and create some really nice concepts of how this dashboard should look and also if you want to use it for maybe like a nice logo in the top or any of the other UI elements, utilize GBD image 2 to make this thing just look really polished and really aesthetic and really fun at the same time. So, that is the idea I have.

**34:02** · I want you to help plan this out. Ask me any questions you have about this and then we'll go ahead and execute. And so, also this default switch to extra high again, I'm just going to go ahead and switch that back to medium and then shoot that off. And you can see down here the pet has started to think and it's talking a little bit. But the reason why you want to be careful about which models you're using, there's two reasons. The first one is because sometimes if you chuck extra high at a task that's really simple, it like overengineers it. And the second piece is because each of these cost you different amounts of your tokens or your session. Obviously, low cost the least and extra high costs the most.

**34:33** · If you go over here to your settings and you click on rate limits remaining, it shows you how much of your session you have left and when it expires. So every 5 hours it resets. And right now I have 97% remaining and then every week it resets and right now I have 99% remaining there. And so it's really nice to be able to keep tabs on that right here.

**34:53** · But that's why you want to be careful about you know your context window management and your planning and your prompting and your model usage down here. In general though I have seen that my session is lasting way longer in codecs than it is in cloud code. And a big part of that is because chatbt 5.5 is really really efficient with tokens with output tokens and input tokens.

**35:16** · And if you guys go watch that video that I was talking about, you will see that exact experiment and it's really interesting to understand and look at, but I've generally found that it's really efficient with tokens. Now, we have some feedback here. It says, "Which visual direction should guide the GPT image 2 concepts and the final dashboard UI creator ops, playful studio, or executive clean?" I'm just going to go with the recommendation for this first version. How should the dashboard get its YouTube comment data? I'm going to say to use the existing output, which was the um Excel file. And then what should the first screen prioritize most?

**35:49** · Reply and ideas. Analytics overview. I'm actually going to go with analytics overview for this one. And by the way, if you're in the app and you want to get rid of the pet really quick, you can just do slash pet and then that will just tuck it away. Okay, so it came up with a plan pretty quickly. You can see here that I can expand this and read about it. So we've got like a summary.

**36:07** · We've got key changes. We've got all this other stuff. And this is where we would once again iterate with codeex before we say, "Yep, go ahead and build that for me, but I'm just going to go ahead and say, "Yep, go ahead and build that for me." You can see that it's using the image generation for GPD Image 2, which is really, really solid. And here is one of the kind of versions that it came up with. And I've just found if you're using codecs to build games or websites or whatever it is, it just helps to give it the ability to test things out and generate some concepts first before it actually designs the rest of the site. You can see this is the little logo that it came up with, which is kind of cool.

**36:36** · It's got like a YouTube play button with some noise and some comments coming in. And what it's going to do is it's going to store all of these assets locally somewhere in this project so that later if we wanted to spin up different versions of the dashboard or a different landing page, it would have access to all of these assets already. And this is super cool, guys. It has like this built-in verification loop where it's going to check its work before it actually gives you an output, which is pretty cool. So, it said the automated browser verification passed. I'm now doing one visual pass to see what else there might be, what other issues.

**37:07** · And it found three issues when it did an actual visual scan. So now it's fixing those.

**37:12** · It says, "Okay, those UI fixes are in.

**37:14** · I'm going to stop the server. I'm going to rebuild. And then I'm going to verify it one more time with screenshots." And then it comes back and says, "Okay, the second visual pass looked a lot better.

**37:22** · Here is your dashboard to actually go ahead and test out." So let's just real quick open this up right here locally in the explorer. And now we have our creator ops signal desk. So I'm going to expand this a little bit. We see the logo up here that it made. We see 83% creator replies, 78 total likes. We can switch between overview, replies, ideas, questions, and the explorer. And this is really cool. It looks like every single comment has a link. So, if I click on this, does it actually take us Okay, no, it didn't actually sync up every single comment to a link.

**37:51** · But it's cool that it showed us that because that gave us a nice idea of like, okay, cool. I do actually want a link. Now, you can actually go ahead and work that into the backend code where every single comment should be associated with a link so that I can open it up and respond to it. Or we could take it one step further and say, okay, what would it look like for me to be able to respond right in this dashboard and you actually fire off that API call to YouTube to respond on the right comment? Because that is 100% doable. You guys have seen how I've automated my comment section a little bit. Anyways, let's just take a look at the overview. We can see we have this really nice chart.

**38:22** · We have some AI insights over here where I can click on work reply Q and that goes over to the replies. I could also click on more content ideas and that takes us to the ideas. We can look at top tool mentions, reply priority, common themes. We can also see the videos that are driving comments and this would obviously grow as we pull in more and more data. So let's say at this point we like this output and we want to actually deploy this because what you'll notice is this says that it's running on a local host.

**38:47** · So, if I copy this link right here and I go to Chrome and I paste that in, it's going to pull up exactly what we saw, right? And it works and it looks fine.

### Deploying with GitHub & Vercel

**38:55** · But if I gave you this local host and you copy and pasted that into your own browser, you would get nothing because this lives locally. It's being served on a server from our codebase. So, what I'm going to show you how to do now is how do you actually get this from a local host to the web? And what we're going to do is we're going to use two tools.

**39:14** · We're going to use the first tool is called GitHub and the second tool is called Verscell. So the first thing you're going to do is you're going to type in GitHub and you're going to go over here and you're going to make a profile. It's completely free to set up, pretty much completely free to maintain.

**39:25** · Once you've created your GitHub, all you have to do is connect this to Codeex.

**39:29** · And we're going to have Codex help us set up something called a repository, which is basically just a collection of your files and folders. Remember how if we open up my file explorer and we look inside of our YouTube comment or sorry YouTube analytics demo folder, all of these files and folders are important and all we have to do is get these off of our local machine or not off they'll still live here locally but we're going to get them into some sort of repository where I can access them publicly or if you wanted to share these with other people they could access them as well.

**39:57** · So it's kind of like having a Word doc locally, but instead you're putting it on into Microsoft's cloud on one drive or something like that so that other people can use it and you could use it from a different machine. So that's the first step. So let's go back into codeex. And what do you do when you don't exactly know how something works?

**40:13** · You just ask. So this looks really good.

**40:16** · What I want to do is I want to sync this codebase for this specific dashboard to a GitHub repository. So help me get that signed up. Help me get connected here to GitHub. And then I want you to help me create that actual repo and push everything into that repo. And it even mentioned that right here. Note this folder is not currently a git repo. So there is no diff and status to summarize. So I'm going to shoot off that message. And now it's going to help us actually sync up to GitHub. Now there is a difference between Git and GitHub.

**40:44** · Really the same thing of version control and all this stuff, but Git is local and GitHub is on the cloud. And what's important here is that it says I'll avoid committing secrets, especially thev.local. And so that's why I told you to always paste your keys in that enenv, not into some random file called secrets. It has to be in thev because that dot in front of the word env basically tells codeex or cloud code or whatever you're using. It tells it to exclude this from any, you know, public commits. So at this point, I've already set up the GitHub CLI.

**41:13** · If you haven't, it will just say, hey, do you want to set this up? And you'll say yes. Very simple. And then you'll authenticate, which means it'll basically just pop up a browser tab and you'll sign in with the account you used to create GitHub.

**41:24** · And then boom, you will be connected to GitHub in Codeex. And while this is syncing up, let me show you guys the next tool we're going to use. This one is called Verscell. Now, Verscell has a pretty generous free tier. You can see I've got a few products on here. You're going to be able to get working on Versel for free just to get started. And what Verscell does is it basically takes that code. It takes, you know, this exact website, which is on the back end.

**41:47** · All this is is code. And it takes this and it serves it on a actual URL on an actual domain that anyone can access.

**41:55** · And what's really cool about this is Verscell and GitHub have a really nice partnership. They actually like talk to each other. So anytime I make a change to our GitHub repo, Verscell automatically picks that up and deploys it. So I know there's three tools here, Codeex, GitHub, and Verscell, but that doesn't mean we have to manage three places. All we have to do is manage codeex. So it said that it's created a private repo for us. If I open this up, I don't want to open this up here. And the reason why it doesn't show up here is because this is a private repo. And over here, I'm not signed into GitHub.

**42:23** · So, if I open this up in a browser where I am signed in to GitHub, we can see YouTube Analytics Demo. This is a private repo. And what's in here is all of the different folders and files that we've actually created to spin up this dashboard. And now, what's really cool is if I go into Verscell and I go ahead and click on add new project, I can connect this to GitHub. And it already is connected. So you would then just sign in and you would connect your Verscell to GitHub. And now you can import any of your repos. So right here you can see YouTube Analytics demo 1 minute ago. I'm going to click on import.

**42:54** · And that's literally that simple. I'm going to click on deploy.

**42:57** · And then in maybe 30 seconds we will have our YouTube analytics dashboard, but we'll have it up on a live URL.

**43:04** · Awesome. So it says, "Congratulations, you have deployed a new project." And I'm going to go ahead and continue to dashboard. And this gives us a YouTube-analytics-demo.app app domain. And if you wanted to switch this off to your own domain, you certainly could. You would just basically have to move the DNS records over here. But I'm going to click on this so you guys can see that this is the exact same thing we were just looking at. Our replies, our ideas, our questions, our explorer. Everything here is the same except for now I could take this URL and I could open it up on my phone or I could open it up on my laptop or you guys could open it up.

**43:33** · And like I said, what's cool about that is we basically are able to then test in codeex. We can iterate right here. We can make changes. But just because we make changes doesn't mean that it's actually going to go live. So if I said, "Hey, I want you to change the entire background instead of blue to be red."

**43:48** · And it would say, "Okay, cool. Here's the red background. Here's the local host to test it out on." And if we like it, we say, "Okay, push those changes to our repo." And then as soon as we push those changes, Versell would automatically deploy those onto the real URL. But if we said, you know what, I don't like that. Just keep it as is.

**44:04** · Then our main production site never got touched. And that's how we keep a clean separation to test and to have something in production. Okay, awesome. So, what do we have now? We have a working project and I'm opening up this folder just to show you how much we've actually done in the past, I don't know, 30 to 40 minutes together. And we've set up a bunch of different stuff. Now, what do I want to talk about next is automations.

### Weekly Automations

**44:26** · So, right over here, you can see this tab called automations. Automate work by setting up scheduled chats. You can set up things like a status report, release prep. There's a bunch of different things here that give you sort of some inspiration. But what's really cool is you can turn all of your skills or any of your repeatable workflows into an automation that Codex will run without needing your oversight. So, I'm going to open up a new chat in our YouTube analytics demo project and I'm going to go ahead and start chatting to Codex here. Okay. So, we've just done a lot of stuff together.

**44:53** · We built a skill that grabs YouTube comments from my YouTube and it puts them into an Excel sheet after it does some analysis and that's coming out really nice. And then we built a dashboard served on Verscell that actually displays visually all of those analytics and statistics from that Excel sheet. Now, what I want to do is I want to set up an automation that just refreshes this every week. So, let's just say every Sunday at 5:00 p.m. I want you to run the YouTube comments analytics skill.

**45:22** · And then what I want you to do with that is update that data on that Excel sheet. you know, add more rows, update the statistics, and that will automatically sync to the GitHub repo. So, after you make those changes, you'll have to also reflect those changes onto the actual codebase where the dashboard lives. And then you'll push those changes to GitHub so that they automatically get reflected in Verscell.

**45:44** · So, a lot of moving pieces here, but basically high level, you need to get more comments, redo the analysis, refresh the data into Excel, and that way I'm always getting a weekly report of what's going on with my YouTube comment replies. Okay, so honestly felt like a little bit of a messy prompt, but Codeex should be able to do a good job of asking us any questions it has and making sure that it's able to actually set up this automation for us the way we want it.

**46:09** · Now, something I want you guys to think about here is the way that I approach building AI automations and skills and stuff like this is remember when we talked about skills and I said every time you use it, it's going to get better because you can give feedback.

**46:22** · You should honestly think of these automations in a similar way. You should think about it like you're teaching a kid to ride a bike. You're not going to just chuck a kid on a bike and say, "Okay, go have fun." You're going to start off by holding the handles and walking alongside the kid and saying, "Okay, you're leaning too much to the right. you need to lean more to the left and you need to center your weight and you need to make sure you're pedaling and you need to do all this and slowly over time you'll start getting more trust. You'll take your hand off the handlebars and you'll start to walk a little bit farther behind and eventually maybe you'll take off the training wheels and stuff like that. The point I'm making here is don't expect your automations or skills to be perfect on the first shot. That's just unrealistic.

**46:54** · You should be expecting them to get better the more you use them because every time you use them, you get more data. But look how quickly it set that up. It set up a weekly automation. It'll run every Sunday at 5:00 p.m. and it will just basically run inside of this project and it will run the YouTube comment insights workflow. It will regenerate the Excel workbook. It will preserve and merge comment rows. It will refresh the workbook. It will verify the dashboard and it will commit only those changes to our repo and it will push it to the right branch so that Verscell actually deploys all of that. And what you want to do is you'd come into the automations.

**47:25** · You can see that we have this one which is Sunday at 5:00 p.m. We can click into it to see the actual prompt that it will submit to Codeex. We could add some stuff here if we wanted, but we don't want to. This will get injected into a new Codex chat inside of our project. So, just as a test, if I click on run now, you can see that this starts a new chat right here. This injected that exact prompt that we looked at with the automation, the ID, the memory, the last run, and the actual prompt. And then it starts up this little progress sheet, which is kind of like a to-do list. and it's going to go down in this order.

**47:56** · And we have the full codeex agentic loop going on here. So if you're used to cloud code, this is basically the same thing as running a local scheduled routine in cloud code or in cloud co-work. Now the one thing you're going to have to think about here is because this is kind of a local cron.

**48:11** · If you close out of the codeex app or if you turn off your PC or your laptop, this will stop running. In order for this to be truly 24/7 all the time, you would have to get this sort of codeex routine on the cloud somehow. And that's what cloud code just added with their cloud routines. Okay, so while this automation is running and you know we're going to make sure that it's working as expected and if not we'll correct it a little bit. But I realized that I wanted to show you guys a little bit more of that kind of computer use and browser use functionality. So if I go back into the actual um dashboard where it built it, which I believe was this one.

### Browser Use & QA

**48:42** · Yep, it was this one. What I'm gonna say here is before we kind of keep making changes, I want you to test the UI here. I want you to open up this um dashboard and I want you to open it up in this app so I can watch you do it. I want you to use your browser use skill and click around. I want you to click on the buttons. I want you to try to break this thing. I want you to stress test it and QA it and let me know what you find, what bugs you find, and what we might need to improve.

**49:11** · And so all I did here is I explained in natural language what I wanted and we're going to be able to see it use the right skills. So browser use is great for a lot of things. It's great for um QAing like you just saw here because it can find bugs and click around on things that typically it wouldn't be able to do. It's also really great for certain automations. So maybe you don't have an API for something and you want to be able to go in and download reports or go in and change some settings. I've done a few of those automations on my channel as well. And browser use can be really really good for that.

**49:37** · And you can even use it to just search the web because you can use browser use in a way where it has like cookies and it's able to remember your login info. So, you could log into something like school where you'd have to get past the authentication and then the browser can automate and control things. But anyways, what you see right here is the inapp browser open and this little mouse right here, which kind of looks like the Chatbt Atlas logo, is going to click around. You guys already saw it switch from overview to replies. You can see it's moving around even more now.

**50:04** · And as it's clicking these different links and moving around, it's going to start to document what might be wrong with this app. And then we can obviously say, "Okay, cool. go make all of those changes for us. Right here, it found the thing with the YouTube link. So, it said they have the correct URLs, but the inapp browser did not visibly open the new tab after clicking. So, that's one of the things that we actually did notice ourselves. Now, browser use is pretty I don't know, it can feel kind of subjective when you're looking at it.

**50:31** · I mean, this is pretty cool to watch it move live, but that also happens in cloud code when I use like the Playright CLI or something. But from my testing, Codeex browser use has been much more smooth and much more intelligent than any other sort of browser use automations that I've built or used before. So that is something that is really cool about using codecs in um this app here is that the browser use is really good. Now you could obviously use it still from a CLI or whatever, but it is pretty good. And like I said, there's just so many really cool use cases with browser automation.

**51:02** · If you want to check out a few more, even though this video was cloud code, you would set it up the exact same way in Codeex. I'll tag a video right up here. I mean, I love this. It's literally going through the filters. You guys saw it had something else up here. It's changing these checkboxes. It's changing the stuff. It did another search here. And it's really going to actually stress test this app to make sure that it didn't miss anything. And what else is really cool is you can build in this sort of QA check into skills or into the knowledge.

**51:29** · So next time when you're building another dashboard or next time you're building a game before it ever comes back to you, it already does a few passes visually and you know from like a code perspective, but you can make sure that hey, don't ever ever ever come back to me until you've stress tested with your own browser use. And that's how you can really just make this stuff smarter and smarter every day. All right, so it decided that it's done testing. Now you can see that we have a bunch of things that passed, but it found a ton of improvements. It ended up finding six things. The external links for YouTube aren't really working. The empty explorer state is too bare. Search is too literal.

**52:01** · Active tab state is mostly visual. And there's some other things that are just coming through awkward and little change that we need to make to the UI. So what's really cool now is I could say, okay, take all of these six changes and build a plan around exactly how you're going to solve those. And then once it comes back with its proper plan, we would go ahead and execute. But now that I showed you guys that, let's check back in on our actual automation that's running. You can see that it is still going through the checks. It's been about 10 minutes. So, I will just check back in with you guys once this has been fully committed and we'll see what changes we have on our actual live dashboard. Oh my goodness.

**52:31** · So, this was pushing like 20 minutes. So, I stopped it and said, "Why is it taking so long?"

**52:36** · And it's because it couldn't overwrite a file that I had open. So, don't do that.

**52:42** · But now, we're going to go ahead and just keep this going. But honestly, there is a lesson there, which is sometimes it is nice to be able to watch it, especially before, like I said, before we know that this automation is really refined because if it is going down the wrong path or it's hitting some sort of roadblock that you, the human should be able to just be able to solve in like a quick 20 seconds, then stop it and ask a question or stop it and steer it in the right way because it's going to help not only save you time, but it's also going to save you session limit.

**53:07** · Because if it was just burning tokens, trying things when the fix was for me to just close out of the app, then you know, you'd rather have stopped that earlier before it's going down multiple wrong paths. And another thing that I just noticed, which is really important to call out here, is that when you look at the automation, this automation is set up by default to run with GPT 5.2, which obviously we don't want. So, you're going to want to make sure that your model is set up correctly, that the reasoning is set up correctly, and all of this other stuff is set up correctly, because that is also a reason why that run was probably taking so long.

**53:36** · So, I just went ahead and re-triggered a new run using GBT 5.5, and I decided to try this one out using high. Now, you also might be curious about the speed thing, the difference between standard and fast. And honestly, I never really ever touch fast. I'm never working in something that's super time-sensitive where I need to go fast because that also eats up your usage a lot quicker.

**53:57** · But this is much more like it. We can actually see it thinking and now we're going to be able to get this back much quicker. Okay, so finally that has finished up. You can see that it was able to make changes to that Excel sheet and it says that it analyzed 28 comments. Now, because we just did this, you know, earlier today, I'm curious if it actually analyzed 200 of the same or if it knew not to duplicate. And that's something that we'll want to take a look at. But let's actually head over to my GitHub real quick. This is the repo that we just set up, right? And if I go ahead and give this a refresh, we should now see that we have two commits.

**54:26** · So in the second commit, this shows we refreshed the comments. So every single time that you make a change to this repo, it'll show that here. So you can check at the version control and you can see what's going on. But what that means is because our GitHub repo here got a new commit.

**54:42** · If we go to Verscell now and we look at this actual project, if I go to deployments, we should be able to see that this just picked up a new change.

**54:50** · One minute ago, it picked up this new deployment. So now if we go to the dashboard and I give this a refresh, this has new data. So this used to say 200 videos or sorry 200 comments and now it says 28. So that is just proof that we were able to actually get some fresh insights. Now what's really nice is that it looks like it just basically added on eight new ones. It didn't like add on 200 and then 200 more and then eight more because it realized that they were duplicated.

**55:16** · And if we actually go and open up the actual source of truth, if I go into our repo, I go to outputs, I go to YouTube comment insights and I click on the Excel sheet that we accidentally had open earlier, we see that the dashboard is exactly the same except for now we've analyzed eight extra comments instead of the original 200. But I wanted to show you guys what happened inside of this run. So, as you guys know, we ran into that issue where I had the Excel sheet open, right? That was the first mistake. The second mistake was that this was running with 5.2. So, we reset the automation and now it's running with 5.5 high.

**55:46** · But then what happened is this was running for quite a while again. So, I stopped it and said, "Hey, you've been running for a long time. Why is it taking so long? This is a very simple task." So, basically, I knew that something went wrong here because when we built this dashboard from scratch, it only took about 20 minutes, but updating it took 40 minutes or probably even longer. So, I knew something was going wrong. So, I stopped it and I wanted to dig into it a little bit better and it and I was able to find out that it was stuck on some process.

**56:12** · So, I said, "What do you need from me in order to make sure that this doesn't happen again?" And that you're able to just basically actually give us this deliverable that we're looking for. And it had me make some confirmations. And then as soon as I did that, it took about 7 minutes. And then it was able to make all of those changes. So, the reason why I wanted to show you this is because once again, this stuff is not magic. You don't deploy something and you just expect it to work perfectly.

**56:32** · But what's really cool is I could say, "Awesome. So everything worked as expected on the dashboard. The analytics have been updated. Now I want you to dig into what you just did with this automation and help me understand, are there any opportunities to streamline this automation? Are there any opportunities to make this better and more robust? Do you have any recommendations here?" And I'll go ahead and fire that off and see if there's any way that we can make this automation better.

**56:55** · It's really important because there's this concept called dark code, which basically means you're writing a bunch of code when you do your vibe coding, but you don't actually know what's going on in the Python script or whatever language you're using there.

**57:07** · And not to say that you need to understand every line of your code, but you need to understand fundamentally what it's doing and why and if there are any opportunities to get rid of some code or if you have to, you know, bake in some more guardrails in a certain place or anything like that. So, it's basically looking at this to see if we can make it faster or if we can make it safer. Now, ultimately, as long as it's working, I don't really care how fast it is because if this is running once a week, I don't care if it happens at 6 p.m. or 6:30 p.m. or even 7:00 p.m. as long as it's actually working. But sometimes speed is a big deal in your automations.

**57:38** · So, it comes back and says, "Yes, this works, but it is still too agent orchestrated and too heavy for a weekly data refresh." So, we could add one repo script to basically run the builder. we could stop running the full next build for these sorts of updates.

**57:51** · And it's giving us all these different insights that we could then go ahead and push to make our automation and our system better here. So that's how you can kind of keep iterating upon it. Even if you yourself don't really know exactly how you would make this better.

### Final Thoughts

**58:04** · You can use the AI to figure out and brainstorm. Okay. So what you guys saw here is we created this project from scratch, right? It was our YouTube analytics demo. We connected to YouTube.

**58:13** · We set up a skill. We set up an automation. We set up a dashboard. we used some browser use and now we have an actual system where every week it will pull in more comments. It will update our data, our Excel sheet and then it pushes all of those changes to our actual live dashboard completely automatically. So, I hope you guys enjoyed seeing that flow from basically idea setting up a project all the way to the end. And just remember what's really important is that this entire project, everything that we just did is literally just a folder on your computer. And what that means is you can customize this folder to be used by OpenClaw or Cloud Code or whatever you want.

**58:45** · Any agent can work inside of this directory now. And if I wanted to explicitly do this inside of Codeex, well, I could go ahead and click on view. I could open up the terminal. And now, because we're in this directory, I could call on Claude. And so right here, I could be working with Claude code inside of this actual repository. So maybe right here, I'm using Claude to help brainstorm. And it creates me a brainstorming file inside of this project somewhere. And then what I could do is I could just go back up here to codeex and I could go ahead and tag that file.

**59:14** · So say, "Hey, here is a planning file, a brainstorm file that I just generated with Claude. I want you to be the one who actually takes this file and executes it for me." So you can really start to play with these together and mix and match just like I've shown you before where we would build something with Claude code and then we would actually loop in codecs to do the review on it and to find like security bugs or any just like codebased functionality bugs inside of it. So in my mind, it's always about which tool is best for this specific use case, not which tool is best. All right, so I really hope that you guys enjoyed that.

**59:47** · You should have a really good understanding of the interface of Codeex. You should have a really good understanding of how you come in here, you connect to other tools, you use plugins, you start building skills, and really the next unlock is start building more and more skills. So try to think about what are you doing on a daily basis? What are you doing on a weekly basis? And write down some of those things that are boring and repetitive and that you just wish happened when you slept. and then start to bring those into codecs and start to just brainstorm. And as you're going through this process, you're going to want to set up kind of your own AI operating system. So, I'm going to tag a video right up here that you guys should 100% go watch next.

**1:00:17** · This one was kind of based on cloud code, but remember, everything is just files and folders.

**1:00:23** · So, if you follow the steps in this video, you will be able to replicate this in codeex absolutely no problem.

**1:00:28** · And what's really cool is every project that I've moved over from cloud code to codeex, I've said, "Hey, this is something I built with cloud code. go ahead and analyze it and help me figure out what files you need to create in order to make this compatible with codec. And all it's going to do is maybe change a few names and maybe change the claw.md to the agents.mmd. And it's really, really simple. It'll take like 30 seconds and then you have your project in codeex. So anyways, I'll see you guys over there at that AI operating system video. Please give it a like if you enjoyed. It helps me out a ton. And as always, I appreciate you guys making it to the end of the