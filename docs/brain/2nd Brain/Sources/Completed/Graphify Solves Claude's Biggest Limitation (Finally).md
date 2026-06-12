---
title: "Graphify Solves Claude's Biggest Limitation (Finally)"
source: "https://www.youtube.com/watch?v=HQEm4rBKdec"
author:
  - "[[Eric Tech]]"
published: 2026-05-18
created: 2026-05-19
description: "I tested Graphify on bookzero.ai — my real production SaaS — and it cut my Claude Code token usage by 27x. As a senior AI engineer (ex-Amazon, Microsoft), here's the full walkthrough.Graphify turns"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=HQEm4rBKdec)

I tested Graphify on bookzero.ai — my real production SaaS — and it cut my Claude Code token usage by 27x. As a senior AI engineer (ex-Amazon, Microsoft), here's the full walkthrough.  
  
Graphify turns your codebase into a structured knowledge graph so Claude Code stops re-reading files every session. Inspired by Andrej Karpathy's raw-folder workflow — and it's free.  
  
Key takeaways:  
  
\- Install with UV in under 2 minutes — works with Claude Code, Codex, OpenCode, OpenCloud, Hermes  
\- The path command finds the shortest connection between any two files (admin layout → AI chat, real demo on bookzero)  
\- Generate Obsidian vaults, Wiki, SVG, Neo4j, even an MCP server from one knowledge graph  
  
🔗 Join our School community: skool.com/erictech  
  
🔗 Check out bookzero.ai — AI-powered bookkeeping built entirely with Claude Code  
  
Skill: https://github.com/safishamsi/graphify  
  
Andrej Karpathy X Post: https://x.com/karpathy/status/2039805659525644595  
  
Timestamps:  
0:00 Intro  
2:22 Prerequisites  
3:07 Install Graphify  
4:07 Run on Codebase  
5:04 Extraction Modes  
5:52 Graph Results  
7:01 Interactive Graph  
7:43 Path Command  
8:26 Explain Command  
9:14 Query & Update  
9:53 Obsidian Export  
10:40 Other Outputs  
11:14 Outro  
  
#claudecode #aitools #softwaredevelopment

## Transcript

### Intro

**0:00** · If you're using large language model, here's how you do research on your project, then you definitely need to check out this repository called Graphify. And this repository is inspired from this ex post that Andrej Karpathy wrote about the LM knowledge base. And for those who don't know who Andrej Karpathy is, he is the former director of AI at Tesla and a founding member of OpenAI. And essentially what he's saying here is that we can index our raw file here to make a large language model here to query information and also be able to maintain it. And this repository here, you can see it does exactly that.

**0:28** · For example, let's say if you have a folder here that contains code, documentations, you simply just using the Graphify command scale and it's going to convert it into a knowledge graph. And once you convert that into a knowledge graph, this will reduce the large language model token usage by 70%. So instead of having AI

**0:44** · agent here to reading the raw files or documentations every single time, Graphify here is going to index it for you and compiles your code base into a structured knowledge graph so that the large language model here is going to be much more faster, consumes less tokens, and much more accurate when finding information from your local folders because it's already creating a graph.

**1:02** · And honestly, this is mostly for people who wants to read more than write, especially for doing research or exploring new code bases. And that's why in this video, we're going to explore this Graphify repository and we're going to see how we can be able to install this onto a local machine, how we can be able to use it like converting our raw files here into a knowledge graph, and later on I'm going to show exactly how we can be able to add any informations, how we can query informations, how we can be able to add this to different large language model, extracting documentations, and so much more.

**1:28** · So by the end of this video, your large language model here can have higher accuracy, lower token consumptions, and faster output. So with that being said, if that sounds interesting, let's get into the video. Now, before we continue, I recently launched our school community where I help you to master AI agents, automations, and so much more. And that's all coming from someone who used to work as a senior AI software engineer at companies like Amazon and Microsoft.

**1:53** · And in this community, you're going to get over 100 plus video materials like templates and workflows that I personally built and sold over 100 plus times. On top of that, you're also going to get access to our weekly live calls.

**2:04** · And just give you an idea, this week we're actually running a Claude Masterclass where we're going to dive into how to improve Claude's accuracy when we're going to use it to build the applications. Plus, you're also going to get full community support where you're going to get a chance to ask questions and get direct answers back. So, if you're ready to level up, make sure you jump right in and I'll see you in a community. All right. So, to get started, first we're going to do here is to install the prerequisites. So, right here you can see there's a couple of things we need. One is we need the Python onto your local machine, which is version 3.10 above.

### Prerequisites

**2:30** · And simply just going to go to the python.org and just going to install it onto your local machine. The other one here is we have is UV. And we can also use the PIPX, but I'm just going to use UV for now. So, essentially we can do here is that you can just copy the repository and paste it to Claude Code or Codex and try to have your AI agent here to install it on your behalf. But, I'm just going to install this manually here so you can see here the first one we need to is to install the Python and UV onto your Mac OS.

**2:58** · So, simply I'm just going to head over to a new terminal session, paste that command, and you can see it's going to install Python here and UV onto our local machine. And the next thing I'm going to do here, as you can see, we're going to use UV here to install the Graphile. Now, UV is kind of like NPM for uh Python, right? So, instead of having Node.js, which is using NPM, Python here is using UV. So, now if I were to clear terminal and just going to do the install for Graphile, and now you can see it's going to install the Graphile NPM or in this case the package onto our local machine.

### Install Graphify

**3:27** · And then what's going to happen here is that we're going to register skills with our AI assistant by simply just going to run the Graphile install.

**3:35** · This way we're going to have our skills added onto our project, which you can see here. So, we have our skill installed and also it's going to be living in this .claude folder. And then we also have the claude.md file, which rows on how to use the skill. And of course, if you're using different platforms, by default the installation here is going to install claw code, but if you're using code x, you can simply just going to do the platform code x. If you're using open code, there's also a command for that and open claw as well as the Hermes agents. So, there's tons of options if you're using different AI agents framework, so you can just follow that as well.

**4:06** · Okay, so once we have this installed, the next thing we're going to take a look at is the commands. So, we scroll all the way down, you can see there's a common commands where we simply just going to do the graph by dots and it's going to build a graph for the current folder. Now, like I said, this is the bookkeeping application that I built. These are tons of folders that we have, tons of MD files or code files that we have here. And this is basically the platform that I built, which is book zero.ai and essentially what this platform does is using AI to help businesses here to manage receipts and bank statements.

### Run on Codebase

**4:35** · And here you can see there's bunch of code base, which has the app, the assets, the components, the content, docs, and so much more. And essentially, all I had to do here just going to do the {slash} graph by dots.

**4:47** · And what's going to happen here is that it's going to take the current folder that we have, which is huge, huge code base, and I'm just going to do a {slash} graph by dots. And it's going to build a knowledge graph around this code base.

**4:58** · So, in this case, what I'm going to do here is I'm going to wait for a bit until everything is set up. And then we're going to take a look at what the result look like. Okay, so now you can see it's asking us a question. In terms of the full map that we're trying to build, right, the full knowledge graph, should we only process the code only or the code plus documentations but skip images or the full extractions including the images. So, you can see that if we were to do the full extractions, that's going to take anywhere around 200k all the way to 400k tokens. But depends on what you're trying to do.

### Extraction Modes

**5:26** · If you're doing like research on the code base for existing functionalities, then my recommendation is just the first option, which is code only. If you're looking to go through the documentation as well, you can also do with the second option.

**5:39** · But if images are anywhere that help you to do the research, then you can also do the full extraction as configured as well. But for my case here, I'm going to go with something that's much more quicker and just do the code only instead. So, in this case, I'm going to choose that option for now. Okay, so finally, you can see the graph here is fully generated and it has generated three things. One is the graph.html, which is an interactive knowledge graph that we can interact it with it, which I'll show you later on this video. And there's also the graph.reports, as well as the graph.json, which is basically the raw JSON for the graph data.

### Graph Results

**6:11** · So, there you can see we have uh 70,000 for nodes and 33 for the edges.

**6:18** · So, edges is basically the connection between the nodes and nodes are basically the individual files or individual components that we have. And you can see that for the token cost here, this is how much it cost, and this is the benchmark. So, roughly, you can see we're saving 25 or sorry, 27 times token reductions for any questions that we're going to ask to large language model about our code base. So, this is the impact that we have here. And you can see that these are the got nodes.

**6:43** · Got nodes are basically the edges that we have. They're basically the edge nodes that we have inside our graph. So, kind of like the children nodes, right?

**6:51** · The which is which don't have any children itself. Uh furthermore, you can see these are the surprising connections, the suggested questions, and furthermore, you can see there's a bunch of stuff that it has find. And what we're going to do here is I'm going to navigate to the HTML, and you can see that this is the entire knowledge graph.

### Interactive Graph

**7:06** · I can simply just going to toggle on or off or just like let's say if I want to I'm very interested about the admin layouts, I can just toggle everything off and just show the admin layouts and the API routes, and I can be able to see all the edges, all the graph, all the nodes that are connected to that relations. And by doing so, this way is much more easier for me to understand the connections for all the files, all the code that we have in our code base.

**7:31** · And this will help me to understand or speed up the process to make me understand the code base here much more faster. And furthermore, if I were to head over to the repository back really quickly, you can see that there's couple functionality that we can trigger. So, for example, there's one functionality called path. For example, let's say if I want to know the path between two files or two functionalities that we have. One is the admin panel and the other one is AI chat. And you can see here that it's going to trigger the graphify here. And by the end of it, you can see it's going to show us the shortest path between those two connections.

### Path Command

**8:01** · So, one is the admin panel and the other one is AI chat. So, you can see that these are the files that I jump through, right? To see from going from the layout for the admin all the way to the AI page. And you can see that the connection between the two is actually from the index.ts, which is a file that calling both of those layouts or both of those TX files, right? So, you can see that's exactly the connection between the two. And here is the shortest path. And furthermore, there's also another functionality called explain.

### Explain Command

**8:28** · Like, let's say if I don't know the rate limiting or how does the AI chat functionality works in our application, right? So, for example, I wanted to ask and say, "Hey, let me Why don't you explain to me the inbound and outbound inside of our admin console."

**8:42** · And you can see it's going to look through that and it's going to try to explain to you the concept based on the knowledge graph. And you can see this is the answer that it has found. So, the inbound versus the outbound and the main admin here, this is the dashboard and split by two sides of the sign-up they measure. So, one is the outbound analytics, which is where the visitor come from and where they drop off. The inbound here you can see is what users do after the sign-up and where they charm. So, you can see this is the entire difference between two and where they split. And you can see it gives you a clear definition of how it works.

**9:11** · And furthermore, you can see there's also the query where let's say if you have any questions, you can also put your question here and ask about it, right?

### Query & Update

**9:21** · Let's say if you want to also adding additional, for example, information.

**9:25** · Like, for example, I want to add a research paper onto this graph. I can also do that. But let's just say that you have added bunch of stuff. Let's say if you want to re-restructure only the changed files that you have. Let's Let's if you modify some files here on your local machine, you have a bunch of files, not just one, not just two, but like actually like 10 or 20. Instead of just adding them one by one, what you can also do here is that you can also do graph 5.raw {hyphen} {hyphen} update, which will re-extract only the changed files and add them onto your knowledge base. And that's how you can do it.

### Obsidian Export

**9:53** · There's also the Obsidian, which is really cool. Like you can also be able to generate the Obsidian vaults based on your code base. So for example, like let's say if you're interested about the docs that you have, I'm going to do this really quickly. So I'm just going to go to a new terminal and do the cloud again. And I'm just going to do the graph 5 here for the Obsidian. And this time I'm going to say I'm only interested for doing this inside for our doc folder. So I only want you to touch what we have in our docs folder, which is this path right here, and I want you to do this.

**10:23** · So you can also be able to give it a prompt and let it try to do the Obsidian parts for the docs folder.

**10:30** · So if you don't want to do this for the entire code base, you can also do this for the entire doc folder. You can put in that. And just mention that I want you to generate a Obsidian vault for this, right? So there's a lot of things you can do. There's also wiki, there's also SVG, um there's Neo, Neo for J, if you want to generate a like a rag system, right?

### Other Outputs

**10:50** · So there's a lot of things you can do.

**10:51** · There's also like you can generate a MCP server for this. So that any other large language model here can query for this.

**10:57** · There's also a option for you to do that. So honestly here you can see the possibility here is endless, and I don't want to go over this in video, but you can see the core functionality here is you can use this to query information, to extract informations, to show the connection between the two, to help you to understand the code base here much more faster. And I'll make sure to drop this repository here in the links in the description below for you to check it out. And don't forget, if you're looking to up your level on how you can use Claude code or any other coding agent here to develop applications, because we do have courses and also weekly live calls that you can check it out.

### Outro

**11:27** · So with that being said, that you do find value in this video, please make sure to like this video, consider subscribing for more content like this. But with that being said, I'll see you in the next video.