---
title: "This is The Most Powerful Tool to Give to Claude Code"
source: "https://www.youtube.com/watch?v=YHk45NEpspE"
author:
  - "[[Nate Herk | AI Automation]]"
channel: "Nate Herk | AI Automation"
published: 2026-05-09
created: 2026-05-11
description: "Full courses + unlimited support: https://www.skool.com/ai-automation-society-plus/about?el=printing-press-ccAll my FREE resources: https://www.skool.com/ai-automation-society/about?el=printing-press"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=YHk45NEpspE)

Full courses + unlimited support: https://www.skool.com/ai-automation-society-plus/about?el=printing-press-cc  
All my FREE resources: https://www.skool.com/ai-automation-society/about?el=printing-press-cc  
Apply for my YT podcast: https://podcast.nateherk.com/apply  
Work with me: https://uppitai.com/  
  
My Tools💻  
FREE MONTH voice to text: https://get.glaido.com/nate  
Code NATEHERK for 10% off VPS (annual plan): https://www.hostinger.com/vps/claude-code-hosting  
  
Links mentioned:  
https://github.com/mvanhorn/cli-printing-press  
https://github.com/mvanhorn/printing-press-library  
https://printingpress.dev/  
  
Printing Press lets you turn any tool into a CLI that AI agents can actually use efficiently. It gives you a catalog of ready to go CLIs and also helps you turn almost anything into a CLI in minutes.  
  
If you've ever watched MCPs eat your tokens for breakfast, this video shows why CLIs are the better path for agent setups.  
  
Sponsorship Inquiries:  
📧 nate@smoothmedia.co  
  
Connect with me:  
https://www.linkedin.com/in/nateherkelman/  
https://x.com/nateherk  
https://www.instagram.com/nateherk/  
  
TIMESTAMPS  
0:00 Intro  
1:10 What Is Printing Press  
1:35 CLI vs API vs MCP  
5:03 Printing Press Walkthrough  
6:53 Setup and Install  
7:48 Why CLIs Win for Sites Without APIs  
9:48 Building Your Own CLI  
11:45 Sharing CLIs With Your Team  
13:40 Final Thoughts

## Transcript

### Intro

**0:00** · All right. So, what would you think if I told you that I just said to Cloud Code, "Hey, go to my school community and grab me some posts." And keep in mind, school does not have an API and it was able to use the CLI. It was able to find nine wins and it made sure that they were in the wins category and then it gave me the three strongest ones. And I got a link to all of them so we can see if they actually exist. As you can see here is Michael's win. And quick shout out to my community members, Michael, Chris, and Fernando. But anyways, the way that we're doing this is we're using a CLI.

**0:25** · And the tool I'm going to show you guys today actually helped me build the school CLI. So, if you've never heard of the term CLI before, don't worry. I'm going to explain it. I'm going to compare it to APIs and compare it to MCPs. But before we get into all that, let me show you one more example. So, here I said, "Hey, can you just go pull 10 of the most recent posts in my community?" It goes ahead and it uses the school PP CLI. PP stands for printing press, which is the tool I'm going to show you guys today. It comes back. It grabs all of these 10 posts.

**0:49** · And then I also asked like, "How many tokens did you actually consume to make the CLI request?" And it said, "Okay, here's what happened. I sent about 260 tokens to school. It sent me back about 132,000 tokens, but what's important is that none of that hit my context window because we were basically able to point all of that routing through the CLI so that none of it actually pollutes your session or your context. So that is super cool and I built the school CLI and it literally took me about 10 minutes. All right, so here is the tool that we are using introducing printing press a CLI factory and a CLI library.

### What Is Printing Press

**1:21** · The whole idea is that APIs suck for agents. MCPS also suck for agents and a lot of times official CLIs suck for agents because they waste tokens or they're not efficient. So, Printing Press has a library of like 50 pre-built CLIs that you can use right away. And it also gives you a factory so that you can turn anything into a CLI. So, let's just start off with the basics real quick.

### CLI vs API vs MCP

**1:39** · Why CLIs beat MCPS and APIs and what even is a CLI. So, CLI stands for command line interface and it's a way to use a tool by typing a command instead of clicking buttons. So, it's not a new concept. It's been around for a long time. You know, like Gemini's got a CLI, Cloud CLI, Codeex CLI, and you might have been seeing a lot of tools recently create CLIs, like Google have their official GWS CLI, which is probably the most used thing in my cloud code. GitHub has a CLI. Playright has a CLI. Uh, Higsfield just created a CLI. Hey just dropped a CLI. It's really just the best and most efficient way to have agents talk to other tools.

**2:10** · Now, what are the other ways? API, MCP. And when MCP came out and it kind of broke the internet, everyone just assumed that MCPs were the answer. and we're just going to shove MCPS into all of our agent setups. And they all just have different pros and cons. APIs are very raw. You're going to get back a huge JSON snippet from the API endpoint. And sometimes you need all that information and it's really, really nice.

**2:33** · They're also more token efficient than an MCP server because MCP servers have to have all the different tools and descriptions and the ability for the agent to look through everything, which is cool because they're way more flexible than an API endpoint. But as you can see, they add overhead, extra context bloat, and you have to keep a server running. So if you go into cloud code right now, brand new session, and do /context, if you've got a bunch of MCP servers loaded in, you'll see how many tokens they're using every single time, and you may not even be invoking that MCP server, so it might just be a waste of tokens.

**3:01** · And then we have CLIs, which are local, they're fast, they're composable, they have a SQLite backend, they're agent native. And you can start to build some skills around these CLIs just like you can with APIs and MCPS as well to chain them together and make some really cool fast workflows. And the cool thing is the output you get is super short and super clean. So basically the CLI response to the agent is super short. And that's what we just saw in that school example where our agent was like, yeah, you know, that took about 132,000 tokens.

**3:26** · But right here it said into my clawed context though I only pulled about 2,000 tokens of summary, not the full 132,000. Okay, so real quick to hit on each of those individually. Why do APIs lose? Because they were built for code, not for all these autonomous agents that pay per token. Because when you get back an API response, you just get this massive JSON body. Those of you who came with me all the way from NEN, you know what it used to look like when you would hit a server and get that massive API structure back.

**3:56** · You also might run into issues with page nation or off and it just can get a little bit funky sometimes. And what about MCP? MCB solved discovery because like I said, you could quickly glance at 50 tools that are available from a certain server, but because you're loading all 50 tools, now you have tokens and sort of like, you know, descriptions for all of those 50 tools.

**4:16** · Here's a real benchmark. MCP used 35 times more tokens than the CLI on the same task. And reliability drops from 100% with the CLI to 72% with MCP as tasks get harder. So really, if you can just shift to every single time you want cloud code to talk to something, just try to find a CLI or build your own CLI now because they were built for exactly how agents actually think. They have lazy discovery. They have pre-formatted output where you're basically just getting 200 tokens of clean text rather than raw JSON. You can compound commands together.

**4:45** · You have a local SQLite mirror which means no round trips and it means no rate limits. It's obviously native to the agent and the O is pretty much solved one time because the CLI holds the token and then you are all set. So the bottom line, APIs are built for code, MCB is built for tools, and CLI are built for agents, especially when you're paying per token or, you know, managing your session limit. Okay, so what is printing press? What are we looking at today? So if you go to printingpress.dev, this is what it will look like.

### Printing Press Walkthrough

**5:10** · It's a very new tool, just dropped like yesterday, and I've been playing with it all day today and I've already built a few cool CLI, which I'll show you guys when we hop over to cloud code. But printing press, it's funny. So this kind of was inspired by Peter Steinberger, the creator of OpenClaw, needing to make his own CLIs because the official ones were bad. So he built like GOG CLI, which is for Google. And people are saying that it's even better than the GW CLI that is, you know, Google's official CLI. So that's the whole idea.

**5:35** · You have a factory, so basically a skill and a tool to help you build CLIs. But also, if you come down here, there's a library. So you've got a a flight goat CLI. You've got ESPN. You've got movie goat. You've got recipe stuff. You've got linear. And if we keep scrolling down, you can see there's different ones. Amazon, Craigslist, eBay, Tik Tok shops, Shopify. There's so many different CLIs on here that you can use.

**5:56** · And now you guys can see where I got the the PP from. Anyways, what I would recommend if you want to get in here and get started is just start off with a starter pack, which is exactly what I did. This has like four or five CLI.

**6:06** · It's got ESPN, Flight Goat, Movie Goat, and Recipe Goat. And then you can obviously clone other skills and you can install more stuff. And when you install the factory, that's what helps you actually build your own CLI. So I will leave links to this in the description.

**6:18** · I will also leave a link to the library of different CLI which is the GitHub and I will leave this printing press one which is what you need to help build other ones. So basically what I did is I took all three of those URLs and I went into my cloud code and I said hey read all three of these. This is a new tool I'm seeing that has a bunch of pre-loaded CLIs and it also helps you build CLIs and just install everything I need. So, like I said, this is the main command if you want to run the starter pack and then you need the factory as well in order to build your own. And it's super super easy.

**6:47** · You basically install it and then you can do natural language requests to use all this stuff.

### Setup and Install

**6:53** · The one prerec is that you're going to need to get go. And it's basically as simple as asking cloud code to do it.

**6:58** · So, if you drop in those three links and you say, "Hey, help me get this set up."

**7:01** · It's going to come back and say, "Okay, I figured it out, but you need to install this first," which is Go. And it's a free open source programming language made by Google. It's designed to be simple, fast, and it's great for building command line tools. So, CLI tools, web servers, cloud apps, and other AI related stuff. It's a very popular language, and it's, like I said, completely free to download. So, that'll take you maybe 1 minute. You tell cloud code, okay, download that for me. And then you just follow the prompts. Cloud might ask you to do a few other things, but you'll be able to get set up super super easy. Why is this a big deal?

**7:28** · Because most websites your agents want don't have a clean API, but Printing Press just lets you basically build your own with the CLI. So, ESPN, for example, no public API. Craigslist, no public API. All recipes has anti-crape protection, but the CLI uses a real Chrome session. Domino's has no public API. School, as you guys saw, no public API. So, if I come into Cloud Code, now that I've got this all installed, I can ask, can you take a look at our printing press library of CLI and tell me what we have access to here? You can see it's using the printing press catalog skill.

### Why CLIs Win for Sites Without APIs

**7:57** · And what it's going to do is it's going to list the ones that we've already installed. And it's also going to list the available CLI in the catalog that we could install. Okay, so here is what we have. These are the three local ones that I just built. We have school, we have tally, and we have YouTube. And I basically just transformed my, you know, YouTube data API as well as the tally API was connected to and said, "Hey, can you just turn this into a CLI so now it'll be faster and more efficient." And then, of course, school, it had to reverse engineer. So, it did some deep discovery, looked at school, and it figured out how to basically create these endpoints through a CLI. So, that's just really cool.

**8:28** · Do you think that I could have done that myself?

**8:30** · Absolutely not. But, this just figured it out for me in, like I said, 10 minutes. And then we've got some other ones that are installed as skills. We've got ESPN, Flight Goat, Movie Goat, and the Recipe Goat. I also built a skill around the tally one, which I'm going to do for YouTube and school as well. But those are the five you can see here. It didn't actually pull the catalog stuff yet. It said, "Do you want me to check what's available in the catalog?" I don't really care because I could just go here and like I said earlier, we can look through all of this. And like, let's say we wanted this Airbnb one.

**8:56** · This just takes you to the GitHub repo, which I showed you guys earlier, which is the library of all the different CLIs that you could install. So now if I just say what NBA games are on tonight, what we're going to see is it's going to use the ESPN skill right there, PP ESPN, and it's going to pull back that data for us. So it says, okay, there are two NBA games on tonight, Eastern time, Knicks and Sixers at 7, and Spurs and Timberwolves at 9:30. And you can see right here that is exactly correct. This is in central time, so Eastern time would be 1 hour ahead.

**9:24** · So what I would recommend is you go in here, you take a look at which of these might be useful to you, and then you just pull them in and you test them out. They showed a cool example here with one called contact goat. Find a verified email for a person you've never met. It looks them up on LinkedIn. It cross-checks them on happen stance and then it does a deepline verified email check. So I haven't personally tried this one, but the ability to maybe do things on LinkedIn through a CLI is pretty cool.

### Building Your Own CLI

**9:48** · So hopefully you guys understand the value here and how easy it really is to get set up. The last thing I want to do now is just show you what it actually looks like to build your own. So, I'm pretty sure there is a hacker news one that already exists on the website on the catalog. But let's say I did want to build my own and we're going to take Hacker News as just an example. I would basically just say, "Hey, can you please use Printing Press? Can you use the CLI factory to help me create my own CLI? I want to be able to pull in articles from Hacker News and, you know, just get insights every day from that site." And then I also just gave it a link right there to the page that I was just on.

**10:22** · It's using the printing press skill once again. Now, Hacker News doesn't actually take any authentication. Like, we should be able to just pull it in. And so, this isn't like the most impressive demo. So, that's not what I want you to take away from here. The point is that you can just ask in natural language and it will start doing all the research and investigating and like reverse engineering things and then help you build it out. But, if it does take like authentication cookies or um you know, OOTH or an API key, then you still basically treat it the same way you would like an API. You would be putting those in your storing them in there.

**10:50** · And then when you build the skill around the CLI, it will understand that it needs to pull from that. And the other thing to keep in mind is let's say you have some sort of quota. So let's take YouTube for example. I can only post a certain amount of comments per day through the API. And if you got a rate limit there, you know, just because you're using a CLI doesn't mean you're jumping over those quotas. You're still going to have those limits. So anyways, this comes back and it says, I'm going to research Hacker News. I'm going to catalog every feature that exists in any tool.

**11:15** · I'm going to present what I found and then I will generate you a go CLI build every feature and then we will verify quality through dog food runtime verification and scoring. So at the end we will have a fully functional CLI for hacker news.

**11:29** · It says that it's going to take 30 minutes to 60 minutes but it's not. It's always bad at those estimations. I don't know if you guys have noticed that but sometimes it'll say like hey this is going to take 30 minutes and then it takes like two. But anyways I'm just going to say yep go ahead and build that out for me. And so while this is doing that research and building it out, I'll talk about something else real quick, which is what can you do with those CLIs? Because you could publish them back to the library and then other people could like publicly pull them in and use those CLIs as well. And you can also just share them with your team internally.

### Sharing CLIs With Your Team

**11:55** · So for example, this tally one that I just built, I have been able to push this to a private repo and now I can just invite some of my team to actually like be a contributor to this.

**12:04** · So they can clone it and then they can use the tally CLI as well and maybe just swap out their own API key in their file or whatever. And all I did was I said, "Okay, cool. So you built me this tally CLI and you built me this skill. Can you just package just that into a GitHub repo so I can share that across my team?" And then, you know, a couple seconds later, I had this new GitHub repo. So, of course, what that means is you don't want to be putting any of your API keys or your authentication stuff inside of the CLI scripts or anything like that. That would still be treated the same way as you treat like your API endpoints and stuff like that.

**12:32** · So, this actually just came back with a huge list. So, you can see that there's different phases. it has to do all of this stuff and then hopefully by the end it's going to be able to actually have a working CLI for us. So once again, it's not exactly that like hey this CLI is going to give you so much more functionality than if you just use the API, but it's the ability to first of all be able to turn anything into a CLI and start natively working through just CLIs rather than APIs and MCPS.

**12:57** · So maybe think of an example of something that you use a lot that doesn't have a great API or you know it only has an MCP server or whatever it might be and just think about the fact that you could now tell Cloud Code, hey I use this software for X, Y, and Z. Do you think you could help me build a CLI around that right here in cloud code and hopefully it will give you research and it will build you a list like this and then you'll finish up with a CLI. So it's kind of just like the checklist of thinking about how you talk to tools. I would say like CLI would be tier one. If there's no CLI option or you just can't do it then the API would be next.

**13:27** · If there's an API, you're pretty much like 100% going to be able to make a CLI. But then if there's no API and you can only use an MCP, then that would be the final option. All right, so all of that has finished up.

### Final Thoughts

**13:40** · Now we can see this is exactly where the binary actually lives. It's giving some examples here where you could actually like invoke this command basically in the CLI or as you guys know, it should have built kind of like a skill around this and we're able to just invoke it with natural language. So I'm just going to go ahead and see what happens if I say, can you test this out? using the actual um skill and just go ahead and see which sites are dominating Hacker News today.

**14:06** · That came back super fast. It said, "Okay, last 24 hours stories with 100 plus points ranked by total score and we get these 10 stories right here." So anyways, this demo wasn't about the fact that we're doing this with HackerNews.

**14:16** · It was just to show you guys how easy it is to set up these CLIs. And from here, you can build skills around them and you can chain them together. And from here, you can build skills around them. You can chain them together. And of course, you can access the catalog on printing press.dev. dev. And I'm assuming that this is just going to continue and continue to grow. And I'm assuming that this is just going to continue to grow and grow. So anyways, wanted to keep this one quick, but I hope that you guys learned something new or enjoyed the video. And if you did, please give it a like. It helps me out a ton. And as always, I appreciate you guys making it to the end of the video, and I will see you all in the next one. Thanks everyone.