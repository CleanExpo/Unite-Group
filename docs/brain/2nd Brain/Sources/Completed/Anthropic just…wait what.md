---
title: "Anthropic just…wait what"
source: "https://www.youtube.com/watch?v=3pkz-Ie_k_c"
author:
  - "[[Theo - t3․gg]]"
channel: "Theo - t3․gg"
published: 2026-05-07
created: 2026-05-08
description: "Anthropic's been struggling to get compute lately, but it seems like they've finally solved it by buying compute from xAI?Thank you Coderabbit for sponsoring! Check them out at: https://soydev.link/"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=3pkz-Ie_k_c)

Anthropic's been struggling to get compute lately, but it seems like they've finally solved it by buying compute from xAI?  
  
Thank you Coderabbit for sponsoring! Check them out at: https://soydev.link/coderabbit  
  
SOURCES:  
https://x.com/claudeai/status/2052060691893227611  
https://www.anthropic.com/news/higher-limits-spacex  
https://x.com/nvidiaai/status/2052082412994383936?s=46  
  
Want to sponsor a video? Learn more here: https://soydev.link/sponsor-me  
  
Check out my Twitch, Twitter, Discord more at https://t3.gg  
  
S/O @Ph4seon3 for the awesome edit 🙏

## Transcript

**0:00** · Looks like Theo was spot on in his latest video. Compute was the bottleneck. Pretty sure you called this the other day. So Theo was right. It's not pricing power yet, but capacity.

**0:08** · Let's hope it lasts at Theo. Compute really was the reason for egregious pricing. It's a good day to be right.

**0:14** · Seriously though, I just don't get how anyone didn't understand this before. It was pretty obvious Anthropic's biggest problem is that they didn't have enough compute to keep up with the demand that they were seeing. And that demand has been crazy. Absolutely unprecedented.

**0:25** · We'll talk a bit about that, but first we need to talk about today's news. the new partnership between Enthropic and SpaceXi/ whatever Elon calls the company now.

**0:34** · It's kind of crazy when you know the history of these companies, but this is real. You can even see it in this uh oh no, this is a post from January when Anthropic banned XAI from using anthropic models. Huh. Definitely not related to today's announcement with higher usage limits for Claude and a compute deal with SpaceX. Yeah, this was not an expected thing. There has been a lot of historical beef between these two parties and seeing them come together in this way shows just how bad the compute crisis is. Anthropic does not like SpaceX. Anthropic does not like XAI.

**1:10** · Anthropic does need compute. Thankfully, Elon's a huge fan of Anthropic and is more than happy to do this partnership.

**1:16** · Oh, your AI hates whites and Asians, especially Chinese heterosexuals and men. This is misanthropic and evil. Fix it. Frankly, I don't think there's anything you can do to escape the inevitable irony of anthropic ending up being misanthropic. This is a joke he has been making a lot a lot. Just search Twitter for Elon posts that say misanthropic and there are dozens. But apparently that changed too.

**1:40** · By way of background, for those who care, I spent a lot of time last week with senior members of the anthropic team to understand what they do to ensure Claude is good for humanity and was impressed.

**1:51** · Everyone I met was highly competent and cared a great deal about doing the right thing. No one set off my evil detector.

**1:57** · So long as they engage in critical self-examination, Claude will probably be good. After that, I was okay with leasing Colossus 1 to Anthropic as SpaceX had already moved training to Colossus 2. This one sentence has so much information in it that I am very excited to break down. But unlike Elon and Anthropic, I don't have billions of dollars of GPUs. I only got a couple 5090s and if I want to get any more, I'm going to have to take a quick break for today's sponsor. Stop me if you've heard this one before.

**2:25** · You've been working on some code with an agent and you feel like you got to comb through every single line it spits out because it just keeps getting this simple thing wrong.

**2:33** · Maybe you even have a PR bot that's going to review the code once it gets shipped up onto GitHub. But what good is that going to do when it's running in your agent? You just sit there watching so you can tell it what it did wrong to fix itself. Wouldn't it be nice if it knew what it was doing wrong when it made those mistakes so that you didn't have to be there monitoring it the whole time? Well, today's sponsor is Code Rabbit, and you might think of them as the code review tool that happens on GitHub, and it is really good at that. I even found myself pushing up PRs for code that wasn't ready yet, just because I wanted the feedback that I got from Code Rabbit.

**3:02** · Well, now they have a really, really cool additional feature that makes it so much better for those agentic loops, the CLI. You might be thinking, why do I need a CLI to review code? I just use the GitHub CLI to push the code. Well, this is actually what's cool about it. Sure, you can run the command to review some code before you push it up to GitHub, but you can also let your agent run it. You even tell your agent that it should run the CLI for a review before telling you that it's done. And it will just work.

**3:27** · It'll run the CLI and it'll take advantage of their crazy context that knows everything about not just the one project you're working on, but the other repos that your organization has in order to find how one thing in one place can break something else somewhere else.

**3:41** · It really does feel like the enterprise ready AI code reviewer that isn't just again on GitHub. It is everywhere else in your stack, too. By the way, you can use it with Slack now. It can even make PRs. It's pretty dang cool. I'll talk more about this very soon, I promise.

**3:54** · It's free to get started and free for open source. What are you waiting for?

**3:56** · Get better reviews at sidv.link/code rabbit. This is a wild partnership and we have a lot of things to talk about within it. The obvious one is how does this affect us specifically cloud code users? There's a question of what's Anthropic's compute problem? Like why is this a thing that they're willing to do?

**4:16** · Is it really that bad that they're going to partner with a person that they hate and hates them? Like that just seems insane, right? But most importantly, WTF is going on at XAI. I honestly think this is the most interesting part of all of this. The financials and direction of XAI is fascinating. Reminder, they just put out a really weird bid for Cursor.

**4:39** · So, I'm going to do a lot of speculation on what's going on at XAI and Elon. I have historically said that I still think XAI has a real chance of catching up and being a frontier lab, but the reason why has historically been compute. And believe me, we will be talking about that. So, make sure you watch to the end on this one because this sentence here is probably the most important piece of all of this information. Going to change the order a little bit and we're going to start with what Anthropics compute problem is. A lot of people seem to think the changes the Anthropic's been making recently are in order to make more money off their end users.

**5:11** · While making money is absolutely part of their plan and what they're trying to do, it is not the reason that these changes are happening.

**5:20** · If you saw the attempts to remove Claude Code from the pro plan and thought, "Oh, they're trying to charge us more money and get a bunch of people to jump to the $100 tier." You just don't get what's going on. They don't want to sell more of any of those tiers. Their goal was explicitly to try and free up compute because they just did not buy enough GPUs. All of these announcements happened today at the Code with Claude conference that for some reason I didn't get invited to. I don't know. Invite must have been lost in the mail.

**5:46** · Everyone knows I'm a huge fan of Claude and Cloud Code. So, I surprised I didn't get invited. Anthropic failed to predict how much compute they were going to need this year. And that failure has made things very hard for them for serving their customers. Normally they'd kind of dance around these details, but I was surprised with how candid Dario was in this conference and I wanted to just share what he had to say.

**6:09** · PR's inflects due to due to the work that that Claude is doing and we've seen it externally because actually this is the first year we've grown faster than the exponential. So, you know, we tried to plan very well for a world of 10x growth per year. Um, in the first quarter of this year, we saw, if you were to annualize it, 80x growth per year in in in in in in in in revenue and usage.

**6:37** · Also, ADX more ins than necessary, but regardless, ADX growth is kind of insane. No one can plan for that properly. I can sympathize with them for that. But it is also worth noting OpenAI did kind of plan for this.

**6:57** · OpenAI bought as much compute as they possibly could. Daario was admittedly quite conservative with his compute purchases and allocations. He wanted to wait and not over buy and overcommit to buying compute and then be in a rough spot because they had more compute than they knew what to do with. It kind of seems like right now the biggest winners are the people who jumped on the realization that you need a lot of compute.

**7:20** · So they bought as much as possible except for one company because compute is only useful if there's people around to use it and when you have 80x growth in all these enterprises who are trying to use your inference then you need the compute but if you don't matters less in fact it actually ends up being quite expensive. Remember that fact because we'll be going back there in a bit but I want to talk more about what this means for us as users first.

**7:50** · Anthropic didn't have the compute they needed and they also have to split their compute across multiple different providers that are all entirely different from each other. For example, they're doing 5 gawatt of compute with Amazon which is going to be on tranium which is one architecture that notably isn't Nvidia and isn't CUDA. They also have a deal with Google and Broadcom.

**8:11** · This deal with Google and Broadcom is Google's TPUs which notably also are not Nvidia. They separately have a partnership with Microsoft and Nvidia that includes $30 billion of Azure capacity and they're helping invest in American AI info with Fluid Stack. But these three here are three entirely different types of hardware they have to run on. They even say here that they train and run Claude on a range of AI hardware. Tranium, Google TPUs, and Nvidia GPUs. It is my personal belief that the researchers do not want to use the first two here.

**8:40** · Ironically enough, the training isn't happening on Tranium because the researchers all want to work in CUDA. I have yet to meet an AI researcher that doesn't prefer to just use CUDA for everything. So, my hypothesis for a while has been that they're trying to move as much comput as possible for inference over to Tranium and Google TPUs to free up their NVIDIA allocation so the researchers can use it. But even then, they didn't have enough and they needed more. Do you know who does have a lot of NVIDIA compute?

**9:10** · SpaceX. We'll go back to that soon because the cool thing for all of us is that they are increasing the usage limits now because they are finally not as compute constrained. Remember, I've been saying this many times. The way that these subscriptions work isn't that they have a thing that they're trying to sell for an amount of money and they're trying to just get you up to that tier.

**9:29** · It's actually the opposite. They're making these subscription tiers to get people into the platform, but the cost is not so simple to measure. is not like selling computers directly where if you make a thousand laptops and you sell 800 of them, you're losing money because you didn't sell those 200 laptops, but then you can just keep them around and slowly sell them until you get your profit in the end. Every minute your compute isn't running, you are losing money.

**9:53** · So, if you have thousands of servers, let's say you have 10,000 servers that can serve users, your peak hours, you're hitting those 10,000, but in your less peak hours, you're only using 6,000 of them.

**10:06** · you have 4,000 compute units, however you want to measure it, that are just sitting there doing jack \[ \_\_ \] That's money you're potentially losing. But if you have more requests coming in than you have the compute to serve, you're screwed. And a lot of the changes we've been experiencing as cloud code users on those traditional subscription tiers isn't that they are out of computers to sell us, is that there is no compute available at certain times.

**10:26** · That's why they did the thing where they had the peak hour reduction where during work hours we got less inference than we would on off hours because again they're just trying to use the compute they have available to them. Now they have way more compute available. So the peak hour limit reduction is gone. They also doubled the cloud code 5h hour rate limits. Sounds awesome and in a lot of ways it is. But there is a catch.

**10:50** · There's two types of usage when you use cloud code in cloud subs. You have your 5h hour limit. So that's your current session. when you send a message, it starts and then you can only do so much inference within a 5 hour window.

**11:03** · Separately, there's a weekly limit that resets every seven days that is on top of your 5h hour limit. So, if you are hitting the 5 hour limit a lot cuz you'll like code really heavily for a couple hours and then not touch code for a few days, this will help you a lot.

**11:18** · But if you're using this multiple times a day over multiple windows every day and you were hitting the weekly limits, you're no better off than you were before. And if you're using all these fancy new parallel agents and like auto review tools that they're starting to introduce that keep these things running way longer, you're not going to benefit a lot from these changes. If you're using things in bursts and you hit the 5 hour limit all the time, awesome, you're in a good spot. But the most exciting thing for me is the bump to the API rate limits. This is for the enterprise customers.

**11:48** · We got screwed hard with this whenever a new model came out and they would only allocate us so much tokens per minute when the new models drop and then T3 chat would have problems because users would be trying to use Opus and some of these limits were egregious.

**12:04** · Like 160,000 output tokens per minute on tier 3 might sound like a lot, but I've done individual runs that can hit the millions. Obviously, those took more than a couple minutes, but if you have three people doing output at the same time, hitting these limits was not very hard, but they have massively increased them, especially on the input side. On tier one, the input token per minute limit was 30,000, which was nothing. It was like you could get cut off on one request and often were. And the 8,000 output was also just laughable.

**12:36** · This means you could never have more than two requests running at once, probably not more than one. and the input token limit you could hit as soon as you make a request. So that being bumped is huge. Tier two went from 450k into 2 mil in.

**12:49** · Tier three went from 800k into 5 mil in more than 4xing which is crazy. And then tier 4 went from 2 mil to 10 mil 5xing the input tokens. Very nice for those of us who are trying to host things through anthropic. I have a lot of fun conspiracies I could dive into about this part too. Opus models can be hosted in multiple different places. As mentioned before, they work on Tranium, they work on Google TPUs and they also can be hosted in Azure as well as of course Google and Amazon servers.

**13:18** · So this is one of the reasons that Anthropics done so well in enterprise is because Anthropic positioned themselves to be in every single cloud. So if your company's a Google cloud company, if you guys are an Azure company or most likely you're an AWS company, you could use cloud models within your existing setup which was huge for them. It's a big part of why Anthropic did so well and why OpenAI was struggling because not only was OpenAI limited to just serving on Azure and their own inference, Azure was not hosting their inference properly.

**13:45** · I after 14 months of bitching, I got them to fix it finally, but we'll talk about that in a little bit. The thing I want to showcase here that I think is really interesting is around how these different deployments are going. I spend way too much time in these charts. This is the output speed over time. This measures how fast the model runs in the different providers. And you'll notice here, Amazon is by far the fastest, regularly over 80 TPS, sometimes hitting as high as 100, when Anthropic's own official hosting is usually in the 50s.

**14:15** · Google is a little lower, but still solid in the like 50 to 70 range and meaningfully better than Anthropic and Azure. But if we turn off Amazon and Google, you might notice something here. These numbers are really close. Like absurdly close. I've been hearing some conspiracies that I'm starting to believe that Azure isn't actually hosting anthropic models right now.

**14:41** · Rather, they are piping through requests to the official anthropic APIs. It could be that there's just another NVIDIA cluster and that they're hosting them the same way and that the inference is roughly the same speed. But I don't necessarily believe that at this point because I've seen two companies hosting Nvidia and not getting any even close to similar performance OpenAI. This mirroring near exact mirroring suggests to me that these models are being piped through Anthropic on Azure right now.

**15:09** · I do see this potentially changing in the future, but it does seem very clearly like these are mirroring each other such that it would surprise me if they were coming from different data centers. I could be entirely wrong on this, but I wanted to bring it up cuz I find it really interesting, especially because both Amazon and Google have meaningfully better performance and also meaningfully better latency characteristics over time. Just thought that was an interesting thing worth calling out. I have heard others say that Amazon and Google are also piping through to Anthropic and that is obviously wrong for a billion \[ \_\_ \] reasons.

**15:40** · But now you can see in this chart, yeah, obviously. So if you think that all of them are just piping through, no. If you think Azure might be piping through, potentially. So we've covered the compute problem. We've covered how this affects us. Time to talk about the exciting part here. What the \[ \_\_ \] going on at XAI? Just a few weeks ago, this post kind of rocked my world as an early investor in Cursor. So again, account for bias here. Space XAI and Cursor AI are now working closely together to create the world's best coding and knowledge work AI.

**16:11** · The combination of Curser's leading product and distribution to expert software engineers with SpaceX's million H100 equivalent Colossus training supercomputers will allow us to build the world's most useful models. Cursor's also given SpaceX the right to acquire Cursor later this year for 60 billion or pay 10 billion for our work together.

**16:30** · There are three things you need to be successful in the AI space. You need research, specifically researchers, the scientists that are capable of making all of these cool things happen. You need data, both data you collect from the rest of the world, as well as data that you can manufacture and processes to create that data in order to train the models with good data. And of course to do all of this you need compute.

**16:53** · Getting all of these things is difficult. And the reason OpenAI was so successful early on is they found novel solutions on the research side. They scraped and found a ton of good data.

**17:05** · And the compute in particular was a weak point initially because they didn't have the money. That's part of why there's all of the beef going on right now with OpenAI and Elon. The reason that they had to go for profit is they had no other way to acquire the compute they needed when they started believing scaling loss. So, we know XAI has compute. That's been established. We'll talk about the amount in a bit, but I want to talk about the data side first.

**17:27** · You might think that X has a ton of data because they have all of the data historically throughout all of Twitter.

**17:33** · That data exists, and yes, they have it, but personally, having spent a lot of time on Twitter, I don't know if I would want anything that is very aware of Twitter on my team, much less in my models. It is very easy for data that seems good to cause problems. This is one of my favorite anecdotes. This info is shared by a researcher at Reductto AI about the results they had before and after cleaning up their data. They had a bunch of loss spikes that just kind of vanished once they cleaned out all of the data.

**18:01** · And the funny example somebody shared after that I thought was absolutely hilarious was this one about GPT3 training having lost spikes because they scraped from a subreddit of microwave noises. The training batch was literally just text like m over and over again. This gets much funnier because not every company has realized how important it is to clean their data. For example, if you ask a Gemini model to make microwave noises, there's a good chance you'll hit this bad data and it will just loop infinitely until it runs out of output tokens.

**18:30** · I've experienced a lot of weird things like this with Gemini. I wasn't able to reproduce this right now, but yeah, it is what it is.

**18:38** · Good, reliable data is harder to get than you would think. And that data is not something that XAI has. They have Twitter, but Twitter is not the source you want for doing the complex problems that we all want our AI models to be capable of. And since XAI got in a little late, they couldn't scrape the web for all the data because that's not really viable anymore. And besides that, most of the major labs are moving away from data they scraped and towards data they are creating, buying, manufacturing, labeling, doing all these things for themselves.

**19:08** · There's even a whole bespoke subindustry of companies that are generating human data, labeling it, and then selling it to the labs.

**19:15** · There are companies who have engineers building full products, never with any intent to ship the product just to ship their history, building the product so the models can train against that. We've all had an experience like this with AI chat, right? Where we use something in cursor or another similar tool. We ask it to start building a thing, it does a part, we ask it to do the next thing, it does it, we ask it to do the next thing, etc. Like, I'm not crazy. We've all done this back in the day using agents to code. Once the chat appeared in our editors, we all did stuff like this.

**19:45** · Now, we have these runs. We probably have millions of these across all the developers using all these different tools, whether it's cursor or cloud code or whatever else. If you're building in this way where you have a thread where you ask it to do a thing, it does the first part, you ask it to do the next part, does that, and you do that over and over, maybe you make corrections, too. Maybe you say here instead, uh, you actually missed something from part two.

**20:10** · And the model responds, oh yeah, my bad.

**20:14** · I'll fix that now by yada yada. We've all had this type of experience writing code with models. You can take this history and feed it back in during training, but the behavior is not going to be any better. You're just reinforcing the behavior on this existing history. Do you know how we could make this better? Let's do one small change. First, I'm going to break out this start by building part one as its own separate message. So, we have I want to build this feature. Imagine you describe the feature and then it says start by building part one. So, you separate those.

**20:45** · And now we're going to make a couple more changes to this history. We're going to do next cuz remember we're trying to make the model behave the way that this history shows. We want a really good history to use for reinforcement learning so that we can make the model behave how we want it to.

**21:01** · So, ready for this really complex trick?

**21:03** · We're going to take all of these user messages after the initial request and we're going to move them to the left.

**21:09** · Oh, huh, that looks familiar. That looks like the oneshots that we all do now instead. If you take good histories where people built the thing they wanted to and it worked, take all of the follow-up user messages, shift them to the left, train on it. We generate the data the labs need by having the back and forth with the model. We gave the data on what it was doing wrong to the labs and now they can use that to make the model smarter by taking our follow-ups, moving them over and now the model can just be trained on this.

**21:41** · And we've all seen this if you read the reasoning traces and the actual things the model does where it breaks the thing down into steps. It does the first step.

**21:50** · It notices something wrong. It fixes it all without user interaction. All of that is just the things we did before being used for RL. And now we talk about why this matters here. The data Twitter has is the back and forths we have with each other on Twitter as people. That's not useful for these cases. Do you know what source of data is incredibly useful for this? I'll give you a hint. I don't open it a lot anymore.

**22:16** · Cursor has the greatest corpus of this data imaginable because every generation of model that we used in cursor got all of our back and forths in the chat. It has all of this information. It has all of this data. It has everything it needs to be trained better. And that's why composer 2 is so much better than Kimmy at coding stuff. even though it's based on Kimmy.

**22:39** · It's because when you take a model that is pretty smart and you run it through these loops for \[ \_\_ \] ever, it gets way more reliable at these long-term tasks. So, we've established XAI has the compute, but they don't have the data.

**22:53** · And they may or may not have the researchers. A lot of the people they had left, so it's hard to say for certain at this point, but they very well could. Hard to know for sure. They only had the compute for sure, though. What about Curser? Cursor doesn't have like traditional frontier lab research.

**23:08** · Like they're not pre-training models themselves right now. Could see that changing. They do have the data. I would argue Cursor has the best data of any lab because the other labs like Anthropic only have data for cloud runs.

**23:20** · Labs like OpenAI only have data for GPT runs. Cursor has runs for everything. So Curser wants to do their own pre-training. They're investing more and more heavily into research. They have a shitload of data. a truly absurd level of data, but they never had the compute.

**23:36** · And that's why this announcement was very interesting and in my opinion made a lot of sense. SpaceX and XAI do not have the data they need to train a model to code. They could scrape GitHub, but scraping GitHub just shows you good code that you would throw in pre-training. It doesn't show you how the model should behave to write that code. Gemini models have the same problem here. By the way, if you were wondering why they subsidized using Opus so hard inside of anti-gravity, it was this. They wanted to get the same data.

**24:01** · The data for how the models behave in a thread is so valuable and SpaceX does not have that for code. Cursor has all of that data for code. I would argue that the $10 billion fee here is just for the data.

**24:17** · SpaceX could choose to not buy Cursor at the end of this year. And if they choose to not, they are effectively paying $10 billion for the data that they are getting out of Cursor. But if the research at Curser and the continual like development of the product at Cursor stays valuable to SpaceX, they will acquire Cursor for 60 billion.

**24:36** · Another thing of note is that these numbers are so close that I can't fathom why SpaceX would let them go. The reason that these terms were inked is because there is two cases. Either cursor is only valuable because of the data they have in that space is willing to pay 10 bill for that or cursor is valuable beyond that. in which case SpaceX is willing to pay 60 bill for the whole company for their value outside of the data. So there's either 10 bill to take their data or 60 bill to take everything. That's the way to think of this deal.

**25:03** · But remember this from earlier XAI staff being banned from using anthropic models internally on cursor because anthropic doesn't want XAI to have the data for runs inside of cursor using anthropic models. Because if XAI can use Enthropic through cursor, they can start building their own corpus of this data and then use that to try and make XAI better. This is an actual way they could have potentially made Grock better at code simply by generating the data using cursor on anthropic models.

**25:31** · And anthropic is so sensitive to their competitors having this data that they will do whatever the \[ \_\_ \] they have to to prevent those competitors from getting it, including meaningful harm to their long-term long-standing relationship with Cursor.

**25:45** · They've always been very close. them going to cursor telling them to ban XAI is an unprecedented move especially at that point in time. I think this was the genesis moment that resulted in the SpaceX cursor announcement. This was Elon letting Anthropic know, hey guys, you're not going to keep us from getting that data. We are going to get all of those chat histories that people have using anthropic models inside of a better harness and we're going to make models that compete with yours by doing it. \[ \_\_ \] you, Anthropic.

**26:12** · But this is a process that's going to take a long time and XAI has a shitload of compute around right now. It's one of the other reasons that cursor was excited to work with them. I am sure when this deal went through, Anthropic was \[ \_\_ \] pissed.

**26:28** · Anthropic was probably ready to just commit violent acts as a result of this because they always do whatever they can to prevent the data that is generated with their models from getting to other competitors. They have done so many dirty things in the past. Whether it is the horrible article they wrote about the Chinese distillation attacks or their banning of SpaceX or their banning of Windsurf back in the day when they thought OpenAI might buy them. All of these things were really, really dirty plays that Anthropic did because they were willing to play dirty as long as they got what they wanted, which is the data not getting to their competitors.

**27:02** · Elon said, "Hold my beer." This almost certainly started some heated discussions between both parties, but that's where we go back to our three things you need to succeed chart. XAI has compute. They just acquired the data. There are a few good researchers away from being very competitive.

**27:19** · Anthropic has the researchers. That's what they have. That is where they are strongest by far. I will never ever talk \[ \_\_ \] on research at Anthropic beyond their hatred of devs because the research teams at Anthropic are unbelievably talented and skilled. some of the best in the \[ \_\_ \] world as good if not better than open AIS. Anthropic has worldleading research. Despite the \[ \_\_ \] show that product is at Anthropic, tools like claude code are absolutely getting the more data they can use.

**27:42** · And I am nice certain that the improvements they've seen on Opus 46 and 47 are just taking the runs from 45 modifying them a bit and then using that to make the new models better via RL. But the thing anthropics lacking is the third one, compute. XAI didn't have research or data, but they did have compute.

**28:03** · Anthropic has research and data, no compute. Cursor kind of has research, not the same level, so I'll give them an X. They absolutely have the data. They do not have the compute. OpenAI is the only company with all three. Does everything suddenly make sense? XAI had holes to fill. They need to patch their research hole and their data hole.

**28:24** · Enthropic had holes to patch, too. They need to patch their compute hole. cursor needs to figure out how they survive this next generation. Open AAI is what they're all fearing. And the fact that Anthropic is willing to link up with one of their old enemies, XAI, shows just how desperate they are to prevent OpenAI from coming in and slaughtering. There are two things that are making OpenAI much scarier to Anthropic right now. The first is that Codeex is exploding. It's getting significantly better to use OpenAI models for code tasks, which Anthropic has historically dominated.

**28:53** · But the other big thing is that OpenAI now runs on AWS. Not just yet, but very soon OpenAI will have AWS support. They didn't before. Anthropic had a huge lead because if you were on AWS and everyone's on AWS, you could use Anthropic models in bedrock and you couldn't use OpenAI ones. Now that that has changed, Anthropic's biggest wedge is dead and the code capabilities wedge is getting closed fast.

**29:15** · So Endar is making a pretty crazy bet here that their current desperation from compute being temporarily resolved by XAI is worth the risk in the optics of this partnership. But I still haven't talked about that last sentence. This is again from Elon. I was okay leasing Colossus 1 to Anthropic as SpaceX AI has already moved training to Colossus 2. You need compute for two things. You need compute for training, but you also need compute for serving requests from users.

**29:42** · When users are using the models from your company, you need GPUs or TPUs or something to serve those requests.

**29:50** · Colossus one is a pretty sizable deployment. According to epoch, Colossus 1 was around 442 megawatt of power, around 280,000 H100s. Truly insane amount of GPUs. Colossus 2 is still being produced. It's not ready yet. It has 1.5 gawatt, so 1500 megawatts of power and 1.4 4 million H100 equivalents. That is a 3x in power from 425 megaWW to,500 megawatt.

**30:18** · And it is also a massive increase in the number of GPUs. It is a 5x to 1.5 mil of them roughly. But there's a very specific phrasing in here that I think is worth noting. SpaceX has already moved training to Colossus 2, not inference, training. What that implies if you were to drop the anthropic part and just focus on SpaceX moving training to Colossus 2. What that would imply is that they're running their inference for Grock on Colossus 1. So that's 442 megaww allocated for Grock.

**30:50** · I don't think Grock needs that much inference because I don't know a lot of people using Grock outside of adding it on Twitter. It's just not a good option right now. They very briefly had a benchmark lead when Gro 4 came out, but they lost it fast and have never been usable enough to be the default for anybody. So they have 442 megawatt of compute. They're obviously giving some of that over to cursor. I'm assuming more of that's going to be Colossus 2 for training. So of the 442 megawatt on Colossus 1, how much do you think they gave to Enthropic?

**31:22** · Because remember, they have to keep some around for their own inference. Let's hear some guesses, chat. What percentage or what number?

**31:31** · You're thinking they gave away 20%, maybe 40%, reasonable guesses. 250 megawws, 60%, 70%. Let's look at the official number, cuz they were actually, for some reason, kind enough to share this. This gives us access to more than 300 megawatt of new capacity, over 220,000 Nvidia GPUs within the month. That is pretty much all of Colossus 1.

**31:53** · That's 300 out of the 425 megawatt and 220 out of the 280 GPUs. That means that XAI only needs about 100 megawws or so for Grock inference right now, which is very amusing. They effectively had this giant data center with a bunch of H100s that was meant to serve Grock that was not getting used because nobody needs Grock and Elon had already invested so heavily in the next generation data center, Colossus 2, which cost $44 billion to build.

**32:20** · By the way, I just thought it was amusing that this data center is effectively unused, not because they have Colossus 2, simply because they don't do any inference because nobody's using Grock. They did specify the agreement means they will be able to use all of the compute capacity at Colossus 1, but they said in the article that it was all of the compute within the month, which specifically means that they are going to move whatever little inference they're still doing for Grock off into Colossus 2, which allegedly will be fully online by May 13th. Hard to know for sure.

**32:52** · These deadlines always get shifted around. I just found it amusing that they're doing so little inference that this barely matters to them. If you take anything from this video, it should probably be this chart. This lays out why these things are happening. The reason XAI wants to buy cursor is to plug a data gap. The reason Anthropic wants to work with XAI is to plug a compute gap. The reason OpenAI is ignoring all of this is because they planned ahead slightly better. And the reason Google is not in this chart is because despite having all of these things kind of, they can't stop \[ \_\_ \] themselves long enough to make something useful.

**33:21** · And in a future where Enthropic spins up way more compute over the next few years here apparently a gigawatt of tranium on Amazon by the end of this year and up to five overall over time a similar agreement with Google and Broadcom for bedrock $30 billion on Azure and way more investment in American AI infra all of this suggests

**33:42** · that they are going to finally get ahead on compute but as we've established many times now compute is a thing that takes a long lead to do you can't just say I want this compute now and get it, you can only get it from people who bought it 2 years ago or you can make a buy order for compute two plus years from now. So Elon buying early and having no users to serve means he has extra compute to sell. Anthropic buying too little and having 80x the users they expected means they have no compute available. Match made in heaven.

**34:08** · As long as you ignore Elon's genuine hatred for anthropic that he is willing to ignore almost entirely for enough billions of dollars. I think this is all absurd. The willingness of all of these people to set aside their morals to get compute shows just how desperate they all are to make their investments worthwhile.

**34:28** · And let's be real, a significant portion of this is influenced by the fact that Elon hates OpenAI so deeply that he's willing to work with Anthropic just to try and plug these gaps to make anybody as successful as OpenAI is. And when you remember that these two companies detest OpenAI, it makes all the sense in the world they could ignore their hatred of each other in order to compete with Open AI more directly. The enemy of my enemy has compute and I'm going to take advantage of it. I got nothing else to say here.

**34:59** · Hope this is a fun deep dive on the absolute chaos between all of these labs. I think it's really fun once you're in the weeds seeing what money and what allocations are going where. It makes a lot of sense when you track the GPUs. Hope this was fun. Until next time, peace nerds.