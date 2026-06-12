---
title: "I Didn't Know You Could Use Claude Code Like This"
source: "https://www.youtube.com/watch?v=KQDVDtklf34"
author:
  - "[[AI LABS]]"
channel: "AI LABS"
published: 2026-05-06
created: 2026-05-08
description: "This video was sponsored by SerpApiGet started with SerpApi using 250 free credits:  https://serpapi.com/?utm_source=youtube&utm_campaign=ailabs_may_2026Claude Code use cases go way beyond coding."
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=KQDVDtklf34)

This video was sponsored by SerpApi  
Get started with SerpApi using 250 free credits: https://serpapi.com/?utm\_source=youtube&utm\_campaign=ailabs\_may\_2026  
  
Claude Code use cases go way beyond coding. In this video we break down how to use Claude Code as a second brain, video editor, research engine, and design tool. From AI automation to claude code skills, see how anthropic claude can run your day.  
  
Community with All Resources 📦: http://ailabspro.io  
  
We're building The Roundup — a daily newsletter covering the AI stories that actually matter.  
Join now at: https://www.theroundup.so/  
  
This breakdown covers the top use cases for Claude Code that have nothing to do with shipping software. We tested each one and ended up replacing tools we used to pay for, and most of these claude code use cases run on free or open source setups.  
  
First, we walk through how to set up Claude Code as a second brain using Obsidian. The obsidian claude code combo runs on a local markdown file system, and a single claude.md drives the whole thing so you can prompt your notes instead of digging through them, and update entries through the agent as you finalize them.  
  
Then we get into remotion claude code, the same skill the marketing team at Anthropic uses for their own product demo videos. You install the Remotion skill, prompt it with the exact cuts and sequence you want, and Claude AI builds the animated product video to match what you described.  
  
Next is a research pipeline that grounds every claim in a real source so Claude stops hallucinating. Each step is its own md file with inputs, outputs, procedure, and acceptance criteria, and the final report exports to both MD and PDF with citations at the end.  
  
The Claude Video skill lets the agent actually watch videos, whether hosted or downloaded. It pulls frames, syncs them to the transcript, and gives Claude both the visuals and the audio, which is something a plain transcript dump cannot do.  
  
We also cover claude code skills use cases for design work. The Canvas Design skill from Anthropic builds a design philosophy file first, then generates the visual through a Python script, and lets you iterate on posters, social posts, and infographics the same way you would iterate on code.  
  
For content ops, we show how to consolidate Notion and NotebookLM into one system that Claude can query through MCP, plus role-based setups where Claude code acts as a finance manager, teacher, legal advisor, or data analyst depending on which folder it is pointed at. This is where ai automation actually starts paying for itself.  
  
If you are looking for the claude code best use cases beyond writing software, this is the full list we use day to day. More how to use claude code walkthroughs, ai agent setups, and our claude cowork and claude code tutorial videos are on the channel.  
  
00:00 Intro  
00:37 Second brain  
01:55 Create videos  
03:09 Multi-step research pipeline  
04:42 Sponsor  
05:34 Watch videos  
07:21 Canvas Design  
09:13 Content system  
10:18 Claude Code as multiple roles  
  
Hashtags  
#claudecode #claude #ai #claudeai #claudecowork #claudecodetutorial #aiautomation #anthropic #aiagent #claudecodeusecases

## Transcript

### Intro

**0:00** · If you are only using Claude code for coding, you are missing out on so many other things Claude can do and way better than you would have thought. The reason people have been shipping insane products with it comes down to how good its agent system and harness are. But even though that harness was designed to work with code, we started fitting it into workflows it was never meant for.

**0:18** · And it worked so well not only for us but for everyone else as well that now Claude code is being used for almost everything, whether it's code or not.

**0:26** · with the right agent skills and markdown setup. Claude code stops being just a coding tool and starts running your day-to-day. So in this video we are going through multiple unexpected ways you can use claude code that have nothing to do with coding. If you're someone who finds the idea of a second brain exhausting because you have to maintain everything in dedicated files which gets hectic, you can just use claude code for that. You can set up your second brain on Obsidian where you can track all your tasks and everything.

### Second brain

**0:52** · Obsidian works because of its markdown file-based system and lightweight nature and all the data stays organized in markdown files locally. Obsidian helps because its graph visualization shows which things depend on others which makes analyzing dependencies easier. To manage it, you can set up a claude.md file to guide Claude on how to use the setup. The claude.md is what actually drives the whole system. We previously created a video on how to set up claude.md for coding projects, but for this kind of project, there are no technical instructions. So some of the instructions may not apply but the other instructions still apply.

**1:23** · You need to start with the project description and all the rules are organized according to priority. First the hard rules which are non-negotiable then the medium priority rules and finally the low priority ones containing key references. Now with this in place instead of manually looking through files you can just prompt Claude and it will search through the second brain find the required document and answer your questions from there. You can also make edits and updates through Claude code while conversing. So anything you are unsure of goes into the second brain only after you've finalized it through discussion with claude.

**1:53** · You can also create videos in claude code using the remotion skill which renders product videos just by prompting the AI agent. For using remotion inside claude code, you just have to install it using the npx command. When you install it, you have to select which project you want to install and then install the skill as well. Once that's done, run the dev server and the initial template of the version you selected will load. This very skill is actually the one that the marketing team at Anthropic uses in their own product demo videos with immersive animations. Using it is simple.

### Create videos

**2:23** · Just open the project in Claude Code and give it a prompt describing in detail what you want to build down to the specifics of the exact cuts and how the sequence should proceed so you get the video done right. It's going to get the plan confirmed by you and once you approve the design, it will start implementing it in the video. It also takes a lot of time to create the animation. For example, a 50-second clip can take more than 20 minutes with iterations. The animation built for the product will be tailored exactly to what you described.

**2:49** · For simplistic animations with text and SVG visuals, as used in most product videos, Remotion is able to do it on its own pretty well because it's just a sequence of code that is animated. But to make videos even better, you need to give it other assets that it can rely on to enhance the animation. With the right assets, you can produce professional animations quickly. You can build a multi-step research pipeline in Claude code that grounds every claim in a real source instead of hallucinating. If you've tried researching with Claude about something specifically not in its training data, you might have come across Claude hallucinating facts.

### Multi-step research pipeline

**3:19** · Then you have to cross validate its claims and only to find out that what it claimed was made up. To avoid this frustration, you can create an automation for research in a systematic manner. With this pipeline, you can ask Claude to research by following a structured workflow and combining research, verification, drafting, and all other stages into one proper workflow.

**3:38** · The instructions that guide this workflow reside in the claude.md file, which contains how to use each file and how the whole pipeline looks with all the information needed for Claude to ensure that it utilizes all the files and conducts research accordingly. You can set up these steps, each written as its own MD file. Each file represents a step containing the inputs, the expected output, the procedure, and the acceptance criteria for that step. The sources and drafts get their own folder, which is a place for claude code to keep the notes it takes, and then the final document resides in the final folder.

**4:08** · For using it, you can add an instruction in claude.md to trigger the workflow by your prompt. So upon your prompt for a research task, it starts by going through the files mentioned in claude.md and follows all the steps one by one.

**4:22** · Once Claude has taken the research topic through all the steps one by one, it will use the document skill to combine a final document in both an MD and a PDF which you can share later. Each claim in the document will be properly referenced at the end of the report. This makes researching much better because Claude has already gone through the crossverifying process making the research more credible. Now, if you've ever tried scraping live search data, you know it's a pain. Captures, proxies, and breaking layouts make it impossible to scale. And that's exactly what SER API handles for you.

### Sponsor

**4:50** · It gives you clean, structured search results from Google, YouTube, Bing, and more through a simple API call. You send one request and get back a clean JSON object with exactly the data you need. No scraping infrastructure, no maintenance, just real-time data on demand. So, if you're building an AI agent that needs live search data or a research tool that pulls peer-reviewed articles from Google Scholar or a news monitoring dashboard or even training machine learning models with classified image data from the web, SER API just works. It has over 99.9% uptime.

**5:22** · Responses come back in about 1 second. Thank you to SER API for sponsoring this video. You can get started with 250 free credits by clicking the link in the description or scanning the QR code on your screen.

### Watch videos

**5:34** · Now, if Claude was able to watch videos, it would be much effective because you can ask questions from the video directly. Gemini is capable of watching videos and lets you ask questions about the video. But copying findings from Gemini to Claude Code is an overhead because Claude Code contains the project's context. Now, one option might be getting the transcript of the video and asking Claude questions related to the video, but it is a bit troublesome.

**5:56** · You can't show the visuals of what was actually shown in the video and it relies only on assumptions which tend to be wrong. Often you have to correct it by taking a screenshot so it knows what was being shown in the video at that moment. Now, for this exact thing, someone came out with a skill called Claude video. It basically gives Claude the ability to watch any videos whether hosted or downloaded. You can install it by running the ad claude marketplace commands. Once the plug-in has been added, you can search the watch skill and add this for your project. Once you reload the plugins, you will be able to use the watch skill.

**6:24** · The watch skill will be available for you, which contains multiple hooks and all the details needed. You can use the skill include code and pass it the location of the video you want Claude to go through.

**6:34** · It could be the file path or the URL of the video. On your first run, it will run the setup. It will set up the basic packages needed for it to run. And once it has done that, you can select whichever API key you want to use. There are multiple options like whisper and other voice models. Amongst them, Gro is better because it is fast and has a really good free tier. And it contains multiple models that you can access with just one API. Once you've pasted in your API key, it is ready to be used. It works by running code that extracts the frames from the video and converts them into a sequence.

**7:04** · Then gets the transcript and maps it to the exact frames and gives that to Claude for analysis. Then Claude will be able to summarize all of the findings directly from the video. With the skill, it is now able to see the visuals which it couldn't do without the skill and it summarizes all the noticeable visuals it finds. Claude Code has already been proven to work really well in design, especially with the release of Opus 4.7.

### Canvas Design

**7:27** · It can create multiple SVGs that are much improved in quality compared to previous models, which makes its design much better in quality. But this capability is not only limited to UIs.

**7:37** · You can also design other things like posters, social media posts, and other infographics using clawed code. You just need to install the canvas design skill, which is an official skill by Anthropic.

**7:47** · So, you don't have to worry about the process it takes to implement the designs. Once you've installed this skill, you'll have access to all of the resources and instructions. It will have a whole library of fonts installed as well which Claude can directly use. It follows a systematic process by first identifying the idea and then creates the design philosophy document for the idea containing the style to go for with this design. This is what it uses to create the designs. So if you give it a prompt to create any visualization, it will first load the skill and start by creating a design philosophy file that you can view.

**8:18** · This file actually resides in your project folder and contains the whole style it is aiming to follow along with all of the visual details documented. Then it creates a script which basically generates the design entirely using code. Once it has done that, it will create the visual by generating SVGs and making it visually balanced. You can create multiple designs from it like a poster and it will follow the right dimensions and implement the same design philosophy it has identified into the poster as well.

**8:44** · If you think there are any issues in the design, you can iterate over it. In our case, it did not pick the font size correctly, which made it hard to read.

**8:52** · So, you can reprompt it with the changes you want it to make. Upon prompting, it will update the Python file and make the changes there. And once it has made the changes in the code, it will run the code and save the updated file with all the changes reflected properly. Also, if you are enjoying our content, consider pressing the hype button because it helps us create more content like this and reach out to more people. You can consolidate a content system that's spread across notion or multiple places using cloud code by setting up clear instructions on how to manage everything properly.

### Content system

**9:21** · Since the content system on notion is shared, you can instead run it locally with claude code so that it can manage which information should go to notion and which should not. You can also use notebook LM with a few grounded sources so Claude can query it directly using the notebook LM CLI tool. Connect it with your account and let Claude query from it. Using Notebook LM is helpful because it has multiple features like creating videos, slides, mind maps, and podcasts from the information, making it easier to create and use content.

**9:48** · Notebook LM queries your information directly from a single source instead of Claude having to go through multiple files and consolidate information, which would waste tokens and time. So, you can let Claude query things from Notebook LM instead. In your content system, you can have multiple steps and sources along with a claude.mmd file that contains instructions on how to use this system and how to respond when the user asks any question. Now with all the setup in place and the notion MCP connected, you can directly talk to claude code and it will update everything in the required places.

### Claude Code as multiple roles

**10:18** · Aside from these, you can assign claude code a particular role and make it work in that capacity as well. You can use claude code for multiple roles and create workflows around that specific role. For example, if you're managing your finances, you can use Claude code with all the data and setup files in the project folder. If you're doing so on notion, you can also connect it via MCP so Claude can directly access the data from there. With this setup, you can ask any questions you'd normally ask a finance manager, such as analyzing the direction of your finances.

**10:46** · It will gather data from multiple CSV files or notion and then create a report for you along with suggestions based on that.

**10:54** · You can also treat Claude code as a teacher and add your preferences, study style, and progress files for tracking learning progress. So, in case you're stuck on any topic, you can just ask Claude about it and it will explain it from multiple perspectives, including introducing new concepts, diving deeper into what you've already studied or generating quizzes based on previous knowledge. You can also set up a role as a legal adviser that analyzes your documents for legal issues.

**11:16** · When you pass any document, it will run a review against all the guidelines you've provided in the project folder, flag all issues in the file and highlight the highest priority issues as well as medium priority issues. You can also use Claude code as a data analyst and use it to manage multiple data sets from CSVs or other formats and generate reports so you can analyze where the data stands and where it doesn't. This helps you make decisions more effectively and you can use Claude similarly for multiple other purposes as well. That brings us to the end of this video.

**11:45** · If you'd like to support the channel and help us keep making videos like this, you can do so by using the super thanks button below.

**11:53** · As always, thank you for watching and I'll see you in the next one.