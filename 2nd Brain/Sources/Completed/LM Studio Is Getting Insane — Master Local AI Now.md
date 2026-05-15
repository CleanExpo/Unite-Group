---
title: "LM Studio Is Getting Insane — Master Local AI Now"
source: "https://www.youtube.com/watch?v=FHzWptAH9V0"
author:
  - "[[Eric Tech]]"
channel: "Eric Tech"
published: 2026-05-06
created: 2026-05-08
description: "I run Claude Code, Obsidian, and MCP tools entirely on a free local model using LM Studio — no subscription, no data leaving my computer. Senior AI engineer (ex-Amazon, ex-Microsoft) walking you throu"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=FHzWptAH9V0)

I run Claude Code, Obsidian, and MCP tools entirely on a free local model using LM Studio — no subscription, no data leaving my computer. Senior AI engineer (ex-Amazon, ex-Microsoft) walking you through the full setup end to end.  
  
Key takeaways:  
  
\- Install LM Studio and load Gemma 4 E2B locally (4GB, runs on a 16GB MacBook Pro)  
\- Use vision + RAG to chat with images and upload your own files  
\- Plug LM Studio into Obsidian, Claude Code, and any MCP server like Firecrawl  
\- Replace your Claude subscription by pointing Claude Code at the local server endpoint  
  
🔗 Join our School community: skool.com/erictech  
  
🔗 Check out bookzero.ai — AI-powered bookkeeping built entirely with Claude Code  
  
📌 Mentioned tools:  
  
\- LM Studio: https://lmstudio.ai  
\- Firecrawl: https://firecrawl.dev  
\- Obsidian + Copilot plugin  
  
Timestamps:  
0:00 Intro  
3:00 Install LM Studio  
3:36 Run a Model  
5:31 Chat with Images  
6:00 Chat With Files (RAG)  
7:13 Connect Obsidian  
10:04 Add MCP Servers  
11:53 Plug Into Claude Code  
14:05 Wrap up  
  
#claudecode #aitools #softwaredevelopment

## Transcript

### Intro

**0:00** · In this video, I'm going to show you how you can run AI models locally and privately completely for free using a tool called LM Studio. And LM Studio here, you can see is a desktop application and you can be able to install any models you like inside on this platform. And it's completely local and it's completely for free. So you can see that if I were to search for the most likes or the most recently updated, these are the top models that we have, right? For example, my favorite model here is the E2B from Gamma 4. It's lightweight. It can be able to see things call in different tools and also can be able to reason things.

**0:30** · But most importantly, you can see it's only 4 GB of the memory and I can be able to use this to connect with MCP servers which you can see like fire crawls be able to provide a URL and \[clears throat\] tell it to scrape any websites and I can also be able to reading things like images for example like I provide an image. It gives me a description of what that image does and furthermore I attach bunch of files like documentations and is able to read that and summarize that for me. And most importantly, I can also use this as kind of like a model here that I can integrate to our AI agents.

**1:00** · For example, claw code, harness agents, open claw, like anything that you can think of. You can be able to use that as your local server here. Like you can see here, there's a local server. Simply you can see there's a URL and I will basically set this as a URL here that we can have different AI agent here to call. For example, clo here you can see is calling the gamma for E2B instead of using their own subscription.

**1:21** · So now I can use claw code all the skills all the MCPS inside of this project here to interact with it and you can see that it's also very userfriendly where let's say if there's a request being sent I can also see the developer log as well and furthermore I can also be able to have it to connected with apps like Obsidian for example inside of the Obsidian here you can see it's connected to gamma 42B I can have it to summarize my notes and here you can see I can be able to select things and be able to click on the co-pilot here and be able to ask any questions. I can do this completely inside of our local model.

**1:50** · So pretty much in this video we're going to cover how you can set this up, how you can install a model, how you can be able to use it to see things, how you can be able to use it to process any files here that you have, connect it with your OPC or any applications and connect it with your MCP servers and most importantly I'm going to show you a demo how you can connect this with your claw code so you can run your claw code locally with your local models inside of your LM studio.

**2:12** · So with that being said, that's what we're going to cover in this video. And if you do found out this video, please make sure to like this video and if you're interested, let's get into the video. Now before we continue, I recently launched our school community where I help you to master AI agents, automations, and so much more. And that's all coming from someone who used to work as a senior AI software engineer at companies like Amazon and Microsoft.

**2:31** · And in this community, you're going to get over 100 plus video materials like templates and workflows that I personally built and sold over 100 plus times. On top of that, you're also going to get access to our weekly live calls.

**2:42** · And just to give you an idea, this week we're actually running a claw code master class where we're going to dive into how to improve claw codes accuracy when we're going to use it to building applications. Plus, you're also going to get full community supports where you're going to get a chance to ask questions and get direct answers back. So, if you're ready to level up, make sure to jump right in and I'll see you in a community. All right, so to get started, first going to do here is navigate to LM Studio and download the software onto our local machine. So, here I'm just going to download this and once I open it, here is what it looks like. So, I'm going to click on get started.

### Install LM Studio

**3:10** · And here it prompt me to install the first model, which is the latest model from Google, which is Gamma 4 E4B. So, I'm just going to skip this for now because I'll show you later on on how you can install any local models onto LM Studio. And furthermore, there's also the advanced settings on how you can turn on the developer mode or there's also the addin login information where you can do that for your local LM service. So, I'm just going to skip for now and just continue with the LM studio. Once you're in the Len Studio, here is where you can be able to install any models onto your local machine.

### Run a Model

**3:40** · So, if I were to click on this, you can see I can be able to search for any models and download this onto your local machine. For example, the gamma 4 E4B and there's also gamma 4 E2B, which is actually a smaller model from the E4B. And you can see this only takes 4 GB of memory, which can be process image, reasoning, and also tool calling. So, in this case, I'm going to click on downloading, and it's going to download this onto our local machine.

**4:02** · All right. So now you can see we have the gamma 4 E2B here is fully installed onto your local machine and simply if we were to click on here you can see the E2B is fully installed and by default what happened here is that it's going to install this onto our hard drive and if you ever want to use it like click on the use in the chat it's going to load that model here into our RAM so that we can actually to use it and talk to it.

**4:22** · So in this case if I were to click on the use in the new chat here so now you can see that it's going to load the model here from our disc into our memory. So now we can be able to have any conversation with our E2B. And furthermore, I can also click on the gear icon to change any settings for the model. So for example, I can also change the context. So how much context should we have? And you can think of context as how long you can have a conversation with large model in one single session.

**4:44** · So the higher the token, the longer that you can have in a single session with the same large model. But of course, that really depends on your system specs because the higher the token, the more memory it's going to take. So in this case once you set this thing you can just click on reload and to apply the changes. So you can see it's going to adjust that change and then furthermore there's also the thinking mode where we can have large model here to think before reapplying. So what we can do here is that we can also disable this if you want to quick answer. And furthermore there's also attaching files images. We can also do that for this one as well. So let's just do a quick test here.

**5:16** · So you can see if I were to say hi you can see gamma 42B here is processing trying to do some thinking with only 3 seconds. This is the response that gamma 42B here has responded to us. So it's really fast. And I'm using the 16 unifi for the RAM for a MacBook Pro. And you can see let's say if I were to upload an image here you can see and I want to say hey why don't you take a look at this and tell me what's in the image. And you can see here that it's going to process this by reading through what's in the image. And here you can see it's going to generate the response. So you can see that here's a description of what's in the image. So the text represent image like live claw code.

### Chat with Images

**5:48** · And here is also the description of you can see here that this can be a thumbnail or a promotional graphic. So it has identified that clearly, right? So you can see it gives you a detailed summary of what that image is. And furthermore, we can also upload a bunch of files here and treat it as a rag system to communicate to our files. So for example, here you can see if I were to upload files, it's going to insert it and embed it into the rag system that we have inside of our LM studio. And we can be able to use our local model here to query information for rag.

### Chat With Files (RAG)

**6:17** · So in this case, you can see we can upload up to five files at a time, 30 MB and here is what it supports. So in this case, I'm going to just click on the upload file right here and simply just going to select some files here and try to upload them and see what it does.

**6:31** · So now you can see it's going to currently do some thinking and try to retrieve the relevant information. And the system here is being built as the customer management and order fulfillment platform for food/meal delivery system. And it basically extract those information from the documents that we provide. So you can see that not only we can be able to like upload files, upload images, talk to it, we can also use the rag system that LM studio here come with to integrate it with our local model here to answer any questions. So just to recap really quickly so far we talked about how we can be able to use the LM studio here to set it up on our local machine.

**7:00** · How we can install a model, how we can test the vision capability here to basically try to read any files, any images that we have and most importantly how we can be able to upload a bunch of documents and treat it as like a rag system here to answer any questions that we have. So now what I want to talk about is how we can be able to connect our local model here to any apps that it supports. And currently for LM studio here there's actually many apps that it supports. For example, Obsidian which is a writing tool here for note-taking app which we can actually integrate our local LM here to help us to chat with our notes. And here you can see I have used it to basically summarize my notes.

### Connect Obsidian

**7:30** · You can see I selected elements here. And here you can see I was able to ask any questions and is able to answer the question that I have. So what you can do here is that if you want to integrate your local model here into your Obsidian, it's very very simple. Simply just going to click on the settings right here. And all you have to do here, you're just going to click on the community plugins and click on the browse right here. And make sure to enable your community plugins and click on the browse. And you can see that there is a thing called the co-pilot. So you're just going to click on this and install it. Once you install it, you're just going to enable it and click on the options. And inside of this, you can see that there's a model section.

**8:01** · And if I were to scroll all the way down, you can see that I have enabled a model from the OM studio. So simply, if you want to add a new model, you're just going to click on add model right here. And just going to specify the name, the provider, and for myself here, because I'm using the LM studio, I'm going to select the LM studio right here. And for the model name, this is very important. We have to make sure to have the exact model name that we have in LM Studio. So head over to the LM Studio right here. You can see I'm just going to click on the developer section. And here you can see there's a local server.

**8:31** · So if I were to click on this, make sure to have this enabled for the server. And here you can see we have an endpoint that we can actually copy.

**8:39** · And for the base URL here, make sure to add your endpoint. And also make sure to add the /v1. So what we're going to do here is that make sure to have the reasoning, the vision, the also the web search here to enable. So it has all this capability here for the model. And most importantly here, you can see if we were to scroll all the way down, this is the token limit. You can also increase that token limits if you need it. So once we have this down, you can see if I were to close this and close that as well. So what I can do here is I'm going to highlight everything and I'm just going to rightclick and click on the co-pilot right here.

**9:06** · You can see and for example here you can see it has some existing prompts that I can do. for example fixing the grammarss or spelling and what I can do here is I can click on the quick ask to ask any questions and here what I can do here is I will specify the model that I select. So because I have the gamma for eb have installed and add it into our obsidian I will select this model right here and simply I will just say like hey take a look at this and tell me give me a summary of this. So now if I were to paste that and basically submit and here you can see if I were to head over to studio here you can see it's currently trying to process this.

**9:35** · So you can see we have it ready and you can see that we have the response here generated by the AI. Now obviously you can see there's tons of tools that you can actually connect it to like anything LM here which is also another tool that you can actually build AI agent with this.

**9:49** · There's also tools like VS code right which you can actually integrate here with the client integration to replace the GitHub copilot with your local model running in the LM studio. There's also the JetRings IDE and most importantly there's also claw code which I'll talk about later on this video. But first what we're going to talk about is how we can be able to add our MCPS into our local AI.

### Add MCP Servers

**10:06** · So for example, let's say if we're going to find a MCP like firecrawl where we can to you know crawl data on the websites, can scrape any URLs interacting websites and also doing deep research and simply all we have to do here is going to copy the object from the MCP server section in the fire crawl documentation and head over to the OM studio and click on the sidebar. Here you can see there's an install section which you can see click on the edit mcb.json JSON and here is where we can be able to add and be able to remove or modify our MCP servers.

**10:33** · So inside of the MCP.json here you can see we have the MCP servers object and simply inside of that empty object there we can just going to copy this fire crawl MCP object. So you can see this one right here and head over to LM Studio and just going to paste it inside of this bracket right there. Okay. So this will basically help you to set up the fire core MCP into your LM studio. All we have to do now just going to enter the API key. So you simply just going to you know sign up for fire crawl. It's free and just going to copy the API key and just going to paste the API key here inside of the M um MCP servers.

**11:05** · So simply I'm going to create a new chat inside of the hammer here. I'm just going to toggle this MCP firewall MCP here to be on. And once I toggle this on here you can see uh this is going to be the one that we're going to trigger. And what we're going to do now is that I'm just going to paste the link for example like yccominator.com. And I'm just going to say based on this fire crawl or sorry based on this website right here, can you try to extract the top sites that we have here?

**11:30** · So we can see that if I were to send a prompt and gamma 42 would be here, it's going to look through all the tools that we have for fire crawl and it's going to trigger the right tool like fire crawl scrape and then I'm going to say proceed because currently it's asking me for permission. So right now you can see it's going to process this prompt and try to extract the top five post and here is what it looks like. So you can see the top five posts that are extracted from that site. Okay.

### Plug Into Claude Code

**11:53** · So finally what we want to talk about is how we can connect this with our claw code. So let's say you have a coding project right and you want to use this your local model here instead of some claw code subscription model. You can do this inside of claw code cuz claw code is just a framework and you can connect to any large version model with claw code. So now to do this if you were to head over to LM studio and click on the developer mode here you can see we're just going to turn on for your local server. Once you have this turned on, you can see there's a URL that we can copy and paste it to claw code.

**12:20** · So that claw code here is going to communicate to your local server, your LM studio local server here for any requests and it's going to use your local model like gamma 42B to process all those requests.

**12:33** · So what I'm going to do here is I'm going to head over to a terminal right here you can see and this is going to be a project that I built called books.ai and simply I just head over here in the terminal and paste the environment variable. So basically I just tell claw code that hey this is the enthropic base URL that we're going to call for any model request. So instead of calling the subscriptions that we have with claw code it's going to call the anthropic base URL which is this one right here that we're going to have here. Okay. And I also have to set the model here the token here to be LM studio.

**13:01** · So it knows exactly that this is actually for LM studio. So what I'm going to do here is I'm going to enter this and it's going to set the environment variable for those two things. So now once we set this then we're going to do here is going to start cloud code and specify the model we're going to run because let's say if you have multiple models we're just going to specify the model that we're going to use is the gamma 42B. So now if I were to run this you can see that now we're starting claw code with a gamma 42B model inside of our local machine.

**13:27** · So now what we're going to do here is I can send in questions like hi for example and you can see that it's going to process this right now and there's actually a percentage on how long it takes now because I have a lot of things inside of this applications like the prompts system prompts skills MTPs maybe that's why that it takes longer than just using it inside of the LM studio. So in this case let's wait for a bit until it fully processes prompt. All right so now you can see that we have this fully processed and now if I were to head over to the terminal here you can see we have the response. So like I said the clock code here is just a framework.

**13:57** · I can still using all the skills like super power or even using bunch of MCPS that we already have inside of cloud code.

### Wrap up

**14:05** · All right. So pretty much you can see that's what we covered in this video. We went over how we can be able to set this up on your local machine. How we can install a model how we can be able to use it to process any images. how we can use it to set up our REC system here to read through any documents that we have and furthermore how we can be able to connect this with Obsidian with any other apps and also how we can be able to connect this with MCPS so that we can integrate this with any MCP servers that we have into our local large language model and finally we went over how we can be able to connect this to our clock code.

**14:32** · So pretty much that's what we'll cover in this video and if you do find this video please make sure you like this video consider subscribe more content like this but with that being said I'll see you in the next video.