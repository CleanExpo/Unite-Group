---
title: "Inside Anthropic's $100 Billion Al Compute Commitment | CFO Krishna Rao"
source: "https://www.youtube.com/watch?v=wEEZPpx8qow"
author:
  - "[[Invest Like The Best]]"
published: 2026-05-13
created: 2026-05-14
description: "In this episode of Invest Like The Best, Patrick O'Shaughnessy sits down with Anthropic CFO Krishna Rao for a fascinating look inside one of the fastest-growing AI companies in the world. Krishna reve"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=wEEZPpx8qow)

In this episode of Invest Like The Best, Patrick O'Shaughnessy sits down with Anthropic CFO Krishna Rao for a fascinating look inside one of the fastest-growing AI companies in the world. Krishna reveals what it takes to manage the lifeblood of generative AI: compute. From procuring gigawatts of processing power across Amazon, Google, and Nvidia, to dynamically allocating it for model training and customer demand, compute dictates Anthropic's future. They explore the company's mind-bending exponential revenue growth, the "cone of uncertainty" in forecasting, and why frontier AI models continue to defy scaling limits. Krishna also shares how Claude is revolutionizing his own internal finance team, Anthropic's unique culture of safety and transparency, and his bold predictions for AI-driven breakthroughs in healthcare.  
  
#Anthropic #AI #ArtificialIntelligence #Investing #Technology #Claude #Compute #MachineLearning #VentureCapital #Finance  
  
Timestamps:  
0:00 Intro  
2:38 The Compute Canvas  
6:51 The "Cone of Uncertainty" in AI Growth  
11:58 Why the Returns to Frontier Intelligence Are So High  
16:45 Recursive Self-Improvement  
20:20 Scaling Laws  
23:30 Sourcing $100 Billion in Compute  
28:05 Platform vs. Application Strategy  
32:52 Pricing Dynamics  
38:48 How Anthropic’s Finance Team Uses Claude  
43:24 Raising Capital & Overcoming Investor Skepticism  
52:32 Public Perception, Risks, and Government Regulation  
57:25 Mythos  
1:12:33 What Could Derail the AI Revolution?  
1:13:47 Biotech and Healthcare  
1:15:31 The Kindest Thing  
  
Presented by Ramp:  
https://ramp.com/invest  
  
Sponsored by Vanta, WorkOS, Rogo, and Ridgeline:  
https://www.vanta.com/invest  
https://workos.com/  
https://rogo.ai/invest  
https://www.ridgelineapps.com/  
  
\*\*\*\*\*\*  
Patrick O'Shaughnessy is the CEO of Positive Sum. All opinions expressed by Patrick and podcast guests are solely their own and do not reflect the opinion of Positive Sum. This podcast is for informational purposes only and should not be relied upon as a basis for investment decisions. Clients of Positive Sum may maintain positions in the securities discussed in this podcast. To learn more, visit psum.vc

## Transcript

### Intro

**0:00** · Every time we have a new model, there's a set of capabilities that are different. People tend to think about model intelligence as IQ. We think of it kind of differently. Intelligence for us is multi-dimensional. It's not just a score. What is the realworld capability of this model? Each model generation gives you the chance to do more with it, to do it better, to do it more efficiently because we think the returns to frontier intelligence are extremely high. And it's extremely high especially in enterprise. That's a core thesis of our business.

**0:41** · Krishna, I have been so excited for this conversation because you get to see from the inside one of the most interesting businesses in world history at maybe the most interesting time uh in world history, at least if you're a technologist or care about technology.

**0:55** · One of the things that fascinates me most just to like dive right into something that I think we're both quite passionate about is this question of compute that you have to deal with all day every day. It's a key part of what you do. It's a key part of what these companies are are doing and there's just this whole revolution happening. I'd love you to just start by explaining what it's like to have to deal with that. Like I understand at one point you were having like a daily meeting about how to allocate to compute and to who and why. just like bring us into that part of your life because I think it's like right at the cutting edge of what's going on.

**1:26** · Look, the compute that we procure is it's the lifeblood of our business. It is the most important thing uh in the company. It is the thing on which it's like the canvas on which everything else gets built. And so the decisions we make and how much compute to buy are some of the most consequential and hardest decisions to make in the entire company. You know, think of it this way. If you buy too much compute, you go out of business. If you buy too little compute, you can't serve your customers and and and you're not at the frontier is the same thing.

**1:56** · So, you know, we talk a lot about this cone of uncertainty, but the idea of just these purchases that have these real world implications, right? You can't just go out and, you know, buy a gigawatt of compute and have it delivered next week. Uh you have to really think ahead to plan for this. And so, we really take a very disciplined approach to how we think about it. So, we look bottoms up. You know, we model what we think demand will be.

**2:16** · Obviously, we sometimes get that wrong. uh we think about the compute we need to stay at the frontier and we really look ahead and try to estimate that and then as we go out and actually do these deals to procure compute you know flexibility is really important to us and so we build that flexibility into the deals themselves we build that flexibility into how we use the compute as well because the way in which we bridge from a from a position we are today to where we want to go when the business is growing exponentially is to use that compute as efficiently as possible.

### The Compute Canvas

**2:45** · I would say I spend 30 or 40% of my time on compute even today.

**2:51** · What does flexibility mean in that example?

**2:53** · So it means a couple of different things. Number one, you know, we use three different chip platforms. So we are customers of Amazon's Tranium chip, Google's TPUs and Nvidia's GPUs. You know, we use these chips fungeibly. So uh if you think about the compute we buy, we're using it for model development. We're using it internally to speed up our own product and model development. And then we're also using it obviously to serve customers. We across those three chip platforms, we're using compute for all of those internal and external uh uses.

**3:23** · And that flexibility, it actually took us a long time to be able to do that. We've invested in that over multiple years to be what I believe the most efficient users of compute amongst any of the frontier labs. Uh and that's not something that just happened overnight.

**3:39** · You know, when we started using TPUs, I think it was maybe the third generation TPUs was was the first one we used uh at scale, people thought, "Oh, well, you're crazy. Everyone's using GPUs. Why aren't you using GPUs?" And we've invested very heavily to be able to use that compute incredibly flexibly. And then we look across the different generations of those chip platforms and use each generation for the best workload internally.

**4:01** · And so we really built this orchestration layer that gives us that flexibility to use all different um types of compute and in doing so we also are able to get the most value out of it. Am I thinking about this in the right way that like something like CUDA that has been a part of NVIDIA's story for a long time now that allows you to do a lot with the underlying actual hardware that you want to sort of eke your way into being as close to the bare metal as possible and and that's what that's part of this flexibility and being able to control as many of the variables as you can.

**4:31** · Is that is that the journey that you've been on? That's part of the journey for sure, but it's also been actually pretty collaborative.

**4:37** · So we work really closely with the Anaperna Labs team at Amazon to help to influence the roadmap of of these chips because you know we we believe you know what we're doing is really stressing the limits of what these chips are capable of. Uh and that means that like a dollar of compute inside our organization goes further than I think it does anywhere else. But importantly we basically want to to utilize each chip to its best purpose within the company. So that does mean that you know we're building our own compilers.

**5:05** · We're really building things from the chip level up in order to have that customization and that flexibility to use it internally the way we think uh will generate the most ROI.

**5:15** · Can you explain this cone of uncertainty thing? Like I want to ask about all the component parts of this, but that feels like a really key like starting point or overall frame for how to think about both sourcing and then the uses of compute. Can you just explain what that concept is? Sure. when you're building and growing a business exponentially, you know, really small movements in monthly or weekly growth rates result in compounding very very different outcomes. And so as we're thinking ahead, you know, even with our revenue growth, it's really hard to predict this business, right? And it's really hard.

**5:43** · I think humans mostly think linearly and you think incrementally. And that's something, you know, I've been at the company for two years. That's something I that's a paradigm I've had to break for myself, right? To stop just thinking linearly and think on this exponential.

**5:57** · When you're on this exponential again, the range of outcomes starts to be really, really wide. We look at a range of scenarios and we look at different points in that cone of uncertainty over, you know, a 1 to twoyear period and then we kind of work backwards from that. And what we want to do is we want to be at a place where we can, you know, obviously still be at the frontier. That's the most important thing. Uh to be able to serve customers and then to be able to have enough internal compute to accelerate our employees. It's it's interesting. If we were to say to our employees, you can't use our models anymore.

**6:28** · Um, we could serve billions of dollars of revenue with that compute that we allocate to employees internally, but we want to take a long-term view uh and a long-term perspective on that cone of uncertainty uh because we want to range towards the top end of these of these outcomes. But we have to plan for that.

**6:44** · And as we go, that's how we think about buying compute in a disciplined way. the most important things what happens if you are at one point in the cone of uncertainty but you've only bought compute for a different point that's where this compute efficiency is something that has it really has helped us out can you bring us into the room for the conversations around the trade-offs between those I'm so interested by those three buckets of like training research internal use uh broadly speaking and then serving customer demand you naively

### The "Cone of Uncertainty" in AI Growth

**7:11** · you might think like okay it's a third a third a third allocation or something like how much does that range around what are the trade-offs like what what is that discussion like kind on an ongoing basis we in addition to meeting about compute procurement we meet a lot about compute allocation I think what's important is it starts with a place where our culture is a one that's incredibly collaborative and that informs how this conversation happens so there's not like FFTs it's done in a very like collaborative not a zero some way but there's a level of compute for

**7:40** · model development that we will not go below right so even if it means um it's harder to serve customers or we have to do kind of unnatural things when it comes to that we want to continue to make that long-term investment in developing the best models because we think the returns to frontier intelligence are extremely high and it's extremely high especially in enterprise.

**7:59** · But so that kind of puts a floor on the compute that's allocated to to model development. And then as we think about the internal use of compute, it really helps us to speed up that model development and to speed up finding those um compute efficiency multipliers that really get us more from each dollar of compute. So when we're talking about it, each team is kind of representing what they would do with that compute.

**8:20** · And then we have a really open and frank discussion about how we think about ROI.

**8:26** · And because we can allocate that compute so dynamically, we can make changes. We can make adjustments in that on a relatively short time horizon. The efficiency thing is so interesting to me. I'm curious if you have a sense of like how much more efficient you are versus your own internal benchmarks from a year ago or something or versus others that you have some sense of how efficient they are. How do you measure what efficiency means?

**8:48** · So, there's a couple different ways I I would think about it. From a model perspective, I think the analogy people have when these new models come out is like they're kind of like cars. You had a sedan before and then you might have the higherend version of that sedan and you're kind of moving moving moving up the chain. And I think that is true in terms of model intelligence. The way the place that analogy kind of breaks down a little bit is people think, okay, I'm go going from the sedan to the sports car.

**9:10** · I'm going to get much less fuel efficiency, right? right? I'm not going to buy the sports car for the gas mileage. In our case, we actually see both improvements, huge improvements in capability, but also in model efficiency. And so, if you look at going from Opus, you know, 4 to 45, 46, and now 47, you know, each one of those leaps, they're not equal, but each one of those leaps to a new model has a multiplier in terms of how much more efficient it is at at at processing tokens effectively. And that just doesn't serve customers.

**9:40** · That also helps us internally as well because if you think about if we're using the model for if we're doing reinforcement learning on the model, it's basically inference within a sandbox with a reward function, right? And so if the model's better at more efficient inference, that RL is more efficient as well. And so we're able to do this kind of win-win where the customer is getting more capability when we release a new model. And then we're able to serve that model sometimes again a multiple more efficient than the prior generation.

**10:09** · And then when we're in between generations, we're we're dynamically deploying efficiency improvements kind of in between these like more step function model changes. And so it is always getting more efficient over time. And what fuels that is the research team. So if you think about it, all these things are very connected. these various tasks and and workloads that we have internally all kind of fit together in this way of you

**10:35** · know doing R&amp;D to for model capabilities for compute efficiency for serving customers and then having internal workloads that can be sped up by using the best models sometimes models that we haven't released most software companies try to maximize your time on their app to juice engagement ramp does the exact opposite understands that no one wants to spend hours chasing receipts reviewing expense reports and checking for policy violations. So, they built their tools to give that time back using AI to automate 85% of expense reviews with 99% accuracy.

**11:05** · And since Ramp saves companies 5%, it's no wonder that Shopify runs on RAM, Stripe runs on RAM, and my business does, too, to see what happens when you eliminate the busy work. Check out ramp.com/invest.

**11:19** · Felix by Rogo is a personal finance agent that turns a single prompt into finished client ready work using your firm's own templates, context, and standards. Send Felix an email like, "Take these comments and turn them for me or update my tracker with the context of these emails." Or, "Run the ability to pay math on this buyer and Felix sends back finished PowerPoint decks, Excel models, and sourced research."

**11:40** · Felix works the way your team already does, delivering work quickly and accurately around the clock. Learn more at rogo.ai/felix.

**11:49** · OpenAI, Cursor, Enthropic, Perplexity, and Versell all have something in common. They all use work OS. And here's why. To achieve enterprise adoption at scale, you have to deliver on core capabilities like SSO, skim, arbback, and audit logs. That's where work OS comes in. Instead of spending months building these mission critical capabilities yourself, you can just use work OS APIs to gain all of them on day zero. That's why so many of the top AI teams you hear about already run on work OS. Work OS is the fastest way to become enterprise ready and stay focused on what matters most, your product.

### Why the Returns to Frontier Intelligence Are So High

**12:20** · Visit workos.com to get started. You said something really important before, which is the returns to being at the frontier are really high. Can you just explain that in in as much detail as you can.

**12:32** · Sounds obvious when you say it, but there's certainly been some camps that like, oh, I'll just, you know, I can use the six-month old model and it's a fraction of the cost and uh I'll just use that and that'll be catching up all the time. And that just like hasn't been the case. Like everyone the second Opus 4.7 comes out, like even me as a consumer, the f the thing you do is you switch it on or GPT 5.5 comes out, you switch on the new one right away. like I want the I want the best. So talk about the returns to being on the frontier and why why it's so high. I think it's a couple things. It's every time we have a new model, there's a set of capabilities that are different.

**13:03** · People tend to think about model intelligence as IQ. It's a single number. Okay, this model was at 110 and then it goes to 125. We think of it kind of differently. Intelligence for us is multi-dimensional. It's not just a score. In fact, we find that yes, everyone publishes their model benchmark cards. find that a lot of those benchmarks are saturated. You know, we we publish it too. But what our measurement is what the customers tell us like what is the real world capability of this model.

**13:30** · And as we've released better and better models, what we've seen is it's not just, you know, the outright intelligence. It's also the ability to do long horizon tasks. It's the ability to use tools or computer use. It's the ability to do things for agentic tasks that have specific value even faster, right? Which means that in some sense, you know, if you have two employees and they're maybe both equally capable, someone takes a week to do, you know, an assignment, someone does it in a day. Well, that second person, if they're continuing to do that, can be seven times better, right?

**14:00** · They might be equally capable at something, maybe just take longer times to do it. So all of those factor in to then how customers experience it. And what we found very consistently is by releasing new models, the TAM is unlocked um in a unique way.

**14:17** · like more TAM gets unlocked, more use cases are possible. And a good illustration of that is this last four months that we've had at the company, right? We started the year with about $9 billion of run rate revenue and we ended the quarter with, you know, north of $30 billion of run rate revenue. I mean, that kind of a change is really enabled by these model intelligence leaps and then the products that we build around them. And so that's what I mean by the returns to frontier intelligence are really high.

**14:43** · I think that's unique to enterprise um because in consumers sometimes you don't see that as readily that that consumers really are pushing the limits of what the models can do whereas in enterprise like our customers are always now you know it started with coding but it's really expanded beyond that very meaningfully but each model generation gives you the chance to do more with it to do it better to do it more efficiently and customers see that and then they invest really heavily in

**15:10** · more tokens with the newer models and we just seen that cycle play out again and again and that's a core thesis of our business that especially in enterprise the returns to frontier intelligence are not slowing down the the things that push that frontier is like a sci-fi story or something from books I was reading when I was growing up it seems as though in the major labs we've

**15:30** · reached this point someone someone on your team said it recently of like recursive self-improvement where the models themselves are building and doing the re a lot of the research to do you know the next generation of improvement and that there is some sort of if I think about the frontier that you're pushing and OpenAI is pushing and compare that to the open source models that maybe the gap will widen as a result of you getting there first to this like recursive thing. How do you think about that?

**15:56** · Like what tell us how we should think about this idea of recursive selfimprovement in the models themselves because it seems like getting there first is incredibly important because then you just can continue to separate yourself versus the those that haven't reached it yet. I would say we do see progress accelerating. we see uh you know I can't speak for other companies but for us the scaling laws are you know alive and well and and we're seeing that you know even with releases more recently like mythos right now within the company you know 90 plus%

**16:26** · of our code is actually written by cloud code right a lot of cloud codes is written by cloud code and so you think of this as like why do we allocate compute internally why would we we forego revenue for it it's because it the the models themselves are helping us to build that next generation of models.

**16:42** · And so in addition to this capability leap that you would have just from the scaling laws, talent is really important. And that talent with the best models can really accelerate the development of the capabilities. And we're really seeing that. We don't really think about models as like closed or open. We think of them as frontier or not. And the ones that are at the frontier, you know, clearly are capturing this economic value, driving meaningful ROI for customers. And we are just investing behind that thesis.

### Recursive Self-Improvement

**17:08** · And that means you know both compute but it also means talent to use that compute and use our own models um to to really accelerate the development. The other piece of it is to it's not just the models it's the products that get built on top of them. Right. So we had uh 30 different product and feature releases in January. the pace of that has accelerated as well and that's enabled in part by uh utilizing the models with the talent that we have to to really you know accelerate ways to access this underlying intelligence.

**17:40** · That's kind of our theory of the case on the product side. How do you think about this weird world where you mentioned the talent and the leverage and they're not writing code themselves and cloud code's writing its own code. It seems like the the last step of that would be you don't even need the talent to tell the thing what to do. it just figures out what to do on its own and that's like the ultimate, you know, the thing then just runs and is only constrained by compute or something. Is that am I being too crazy about that or is that future possible do you think? I think that the the core of our company is still a research lab. I think it's maybe not as well understood.

**18:14** · Maybe it's getting more understood from the outside but we're doing experiments.

**18:17** · We are um doing things that you know push uh the limits of what our models can do. And that research and that engine is upstream of everything else that we've talked about. And so that is enabled by the models today. It's not entirely done by the models. Over time, we think that, you know, the models will get better. They'll be more helpful in that process. But, you know, having the best talent to set the direction, not just the priorities, but some of the new areas of discovery, it just actually makes that research talent even better, right?

**18:47** · And so I think of it as, you know, accentuating and accelerating the talent that we already have. We talk a lot about how talent density beats talent mass. Um, and I think that's true here. Like we want the the the the densest collection of, you know, AI research talent and, you know, inference engineering talent and that enabled with the best models we think is a is a really winning combination. How are scaling laws talked about internally?

**19:12** · Like the the sort of consensus has been you've got different components of them.

**19:16** · you've got like pre-training, you've got um post- trainining, you've got reasoning, and that all of these are kind of moving at different paces and to hit a true wall, they would all need to fall down. Like that's sort of like how the world is now conceptualizing scaling laws. How are they talked about internally? How do you think about them?

**19:31** · Yeah, I mean, we look at um models at various points in their development. We can see, you know, during a pre-training run, how does this model compared to a prior model that that we did um on these on these kind of loss curves? And that gives us a sense for model capability.

**19:46** · You can do the same thing as you think about RL. And then probably as importantly is when customers get their hands on it like what are they seeing?

**19:55** · Where are they identifying pain points?

**19:57** · And those pain points are then become like training targets for us right we don't train on customer data in in the enterprise side. on the on the proumer side, it's it's only if you opt in. But customers tell us things like, "Hey, I wish the model were better at this or I I had this particular place where it got stuck um and I could build this other product, but the capability needs to be further than that." What we usually tell them is, okay, build your product for that because we're going to on the R&amp;D side, you know, improve that over time.

### Scaling Laws

**20:26** · And so there is this like connected loop but internally we're always looking at different models that are being trained different snapshots that we have and comparing them you know internally and to a lesser extent externally against you know our own measure and then ultimately how our customers view them as well and it feels like there's just no slowdown in the scaling laws themselves.

**20:45** · Is that is that like a fair characterization?

**20:47** · For us that's a fair characterization.

**20:48** · Yeah, we we are extremely I mean obviously a bunch of the authors of the scaling laws papers are amongst our founders but you know notwithstanding that we can be a bit of a skeptical bunch like you know we hold ourselves to a really high standard again it's this kind of idea of a research lab that's very kind of scientific method and people are constantly challenging previously held assumptions but from what we see the scaling laws are not slowing down. So if that's true, you you said before it's hard for humans to be exponential in their thinking and not linear.

**21:13** · Like if that continues to be true for however many more, you know, turns of the crank here, how do you do that thing of not thinking linear and thinking exponential yourself in your job and for the business? Like that the implications are really hard to reason through. Um exponential growth rate is one thing, but exponential growth of capability like I don't I like don't even know how to get my head around it.

**21:33** · So how do you how do you get your head around it?

**21:35** · We we think about the world as scenarios. It's very hard to have a point estimate in this business. And then having a very low bar for updating your current prior or your current perspective because it it could be the case that something a month ago was true that's just not true today and that breaks your model. And so this old like well we'll forecast you know once a quarter and we'll you know we'll revisit this in 3 months at the next board meeting. That doesn't work for our business.

**22:00** · It's so dynamic that we have to always think about oh you know the our models couldn't do this before and they could do this now what does that mean for the TAM we've seen this in coding first right where you know starting with around sonnet 3536 we started to see this really remarkable jump in capability which was then followed by adoption and usage and revenue and you know it was a little

**22:24** · hard to predict that but now we can use coding as an analog for a lot of what's happening elsewhere where in the economy and elsewhere in our business and so we kind of look at pattern recognition in our own business to try to predict what's going to happen in the future.

**22:37** · Literally 15 minutes before you got here the news came out about your partnership with XAI in the Tennessee facility.

**22:42** · Makes me curious about how you are canvasing the world for like that is an opportunity you decided to do like I'm sure there's a universe of things that you've explored. What is the strategy for trying to get more in creative ways like bring us a little bit more into that? We announced a partnership uh with SpaceX for their Colossus facility in Memphis. We're really excited about that. It's going to allow us to continue to expand, especially on the consumer and proumer side.

**23:08** · But that's just one example of us just, as you said, looking um for near-term compute uh wherever we can get it. As the compute base grows, that near-term compute becomes a smaller and smaller fraction of of of what's available and what's out there. But you know we look at it as can we deploy that compute that's available productively.

**23:29** · Um sometimes the answer is yes and sometimes it's no. But if we can then you know we look at like kind of the economic return on it you know based on what it's priced what duration we have it for you know where it's located what type of compute it is and how efficiently we can run it. So we have kind of a process to assess and that same process by the way we use to assess longerterm deals as well. So last month, you know, we signed a 5 gawatt deal with Google and with Broadcom for TPUs um starting in 2027.

### Sourcing $100 Billion in Compute

**23:57** · We also signed a deal with Amazon for tranium for up to 5 gawatts as well. It was an over hundred billion dollar commitment. And a lot of that comput is actually like already landing and will land in the rest of this year into into next year. And so if you think about it, it's a bit of this layer cake of compute that's starting at different times with different capabilities and we're and we're very dynamically comparing that compute. It's price performance over time that's really really important to us when it lands and what we think we can do with it internally in the business.

**24:27** · And so there's so many different variables you have to optimize for around, you know, what compute it is at what cost um and over what time horizon. But we have a pretty dynamic way of looking at kind of near-term compute and then medium to long-term compute. But the things we're assessing are largely the same. What is different is just the time horizon. What about the trade-off? You said price per performance. The trade-off between like cost per token or something throughput and speed. From the customer perspective, they care about both.

**24:53** · Speed probably unlocks some capability and use cases that are really interesting that we don't know about yet as these things get faster. Can you talk a little bit about that trade-off in in compute as you're assessing it?

**25:05** · As we look across, you know, three different uh chip platforms, we also have multiple generations uh of of chips within it, right? So it could be TPU, you know, V5e and V6 and V7 and tranium 2, tranium 3, all of them are at different places on the price performance curve. And then we importantly look at how we will utilize it, right? Price performance is important because of efficiency. Speed is also important for certain use cases as well.

**25:29** · So we look at the compute down down down to a very granular level in terms of like what it can deliver for us and when and that's something that we do you know again our compute team leads that but we closely collaborate across the business to say like where do we need this compute and for what right

**25:46** · okay we might need you know CPUs for for for RL we might need this you know more leading edge compute and we're going to deploy it for you know our best and fastest models or for training them and so from our perspective It's it's customer demand, but it's also really down quite granular in terms of what is each chip best for and then what will we have when I'm always so curious by the metabolism of in this case anthropic for

**26:13** · new compute like how fast you could take if I air dropped on you twice the compute that you have tomorrow like would you consume that in how fast would you consume that if I air dropped 10 times the compute on top of you how fast would you consume it can you calibrate us on that sort of thing like is demand Actually, it feels like demand's unlimited between these three, you know, uses, trading, internal, customer demand. Everyone's saying the same thing. Um, shortages everywhere, memory stocks, you know, mooning.

**26:37** · Is it that extreme that like if you 2xed or 5x or 10x the amount available to you tomorrow, you would just like more or less instantly consume it? This goes back to like how how we use it and and the fungeibility of it. So, the answer is, you know, we're constrained kind of across those use cases uh internally today.

**26:55** · And you know I would say that you know a year or two ago it would have been harder to consume especially like a heterogeneous kind of compute drop in your example um really quickly because these chip platforms are different and they are different some are harder to operate some of them have you know idiosyncrasies in terms of how we use it. I would say today that you know getting a bunch more compute I think it would be deployed you know very rapidly across those different use cases.

**27:19** · We probably have the same kind of allocation or or or calibration uh that we do uh with compute today but it's become a lot easier for us to spin up very quickly and deploy like almost any type of compute. And that's something again we think is a is a real advantage.

**27:37** · Back to the ways the customers are using Anthropic. One of the interesting tensions and trade-offs that I'm fascinated to hear how you think through is between sort of the platform approach where I build my business on top of Claude and it powers my thing versus you doing the thing that I wanted to build.

**27:54** · So this is like the classic like you know claw design versus Figma or something like this. How do how do you think about the right balance of how deep into the application layer you should go versus just being a pure enabling layer of like we're going to provide the reasoning engine and the intelligence and you know world go forth and and build whatever you want you know pay us through the API or or whatever that seems like a fascinating internal discussion and and and tension to some degree.

### Platform vs. Application Strategy

**28:19** · Yeah, the way I would think about it is most of what we're building is platform and we think that there's so many examples of where a platform can acrue a lot of value, but the customers who are building on that platform actually crew even more value. We think that's where what we're setting up for today. It's maybe akin to the early days of AWS, right?

**28:36** · If you think about the cloud platform and all the tools and services that are now built into because it's not just the the raw model access, it is, you know, prompt caching and the ability to use virtual machines and, you know, cloud code being called within there or dispatch or the cloud agents SDK, managed agents. All of these are effectively I think of as vectors to access that model intelligence for other companies to build into their own products. That's most of what we're focused on and really most of where we think the business is is is going and and from where we are today.

**29:07** · That said, like we will also build our own applications on that same platform where a couple things are true. Number one, if if we feel like we have, you know, a vision into where the models are going and we can kind of demonstrate that and create customer value in that, that might be something like cloud code, right? we were able to say actually a lot of what's out there in the market was developerled.

**29:31** · Cloud code is a platform that's claude led and we think the models can't quite do that today when it was when it was launched you know a little over a year ago but we think they'll get there and they have and so one is kind of building a headto model capabilities. The second is thinking about ways to like demonstrate value for the ecosystem that others might emulate. Right? If you think about cloud for financial services or cloud for life sciences or even something like cloud security, these are ways in which we've kind of composed the platform.

**29:59** · Again, we're building on the same platform as our customers and we think that is that creates like a a level playing field. We also think that there's so much value that's going to acrue in these in some of these areas that you know our customers can win and we can win as well which is why you've seen you know as we've launched some of these products we've done them in a collaborative kind of partnership oriented way whether that be on the security side or or you know design or financial services we've partnered with the ecosystem so I think of our strategy

**30:28** · as mostly horizontal um we'll build vertical where you know we think we have some value to add or a perspective that's useful or a way to demonstrate to the market like how we think about you know our platform adding value and a lot of the value is going to acrew to the customers that are building on top of it. Our goal is build the best models and then build the products and tools and services that allow that intelligence to proliferate within uh customers.

**30:53** · How much do you care that it's just a reality that people are scared of you that that like there's a there's a sense that because you control the most essential piece of these new applications that the underlying intelligence reasoning engine that may totally be true and maybe already is true that more of the value is occurring on top of the anthropic platform than is being captured by it. But nonetheless, it's still scary to imagine. Um, and I guess maybe you could say something similar about cloud and AWS or something like that.

**31:22** · But how much do you think and care about the fact that some of your wouldbe customers or existing customers are in fact scared of you as a competitor? Part of what is hard in this business is it's changing so so quickly.

**31:34** · So the model capabilities like sometimes even surprise us. And so when we release models or products on top of that like there is an element of of what's happened you know in prior waves over the course of 5 years 10 years 20 years it's happening in months now and when we release things people are also surprised by it in some ways in the same way that we were surprised by it but I think fundamentally what we are trying to do is like be very partner oriented

**32:02** · towards the ecosystem and that means that you know we have you know early access programs We work very closely with customers. We listen to them about what capabilities they want. That doesn't mean that the things we release are sometimes not moments where you're like, "Wow, that's way more powerful than I thought it would be or I didn't realize the models would be able to do that this quickly." I think that part of that is a reality of where we are in this cycle um and in this kind of development of intelligence.

**32:26** · But part of it is also like we want to make those capabilities really accessible and that should acrue a lot of value to customers as well and customers that are frontfooted on that and adopt and and frankly also ones that are building and using the tools that we offer on our platform. We think we can actually accelerate them. I think some of it's a reality of kind of frontier model development but our approach to it is probably a little different and more partner oriented. you said before going 9 to 30 in the first quarter.

### Pricing Dynamics

**32:53** · The pace is so insane which makes me wonder about pricing like the the the dynamic of how to price tokens or or you know use of the of the system is so fascinating to me because I think a lot of people a year ago would say price is going to it's just going to constantly fall.

**33:09** · But actually what's happening is it's going up in many cases and this is true at different levels whether it be you know the mythos pricing that's that is quite high because it's so powerful the cost of an H100 you know the rental price of a cost of an H100 is well you know looks like a smile curve I'm very curious why if everyone is compute constrained why everyone doesn't just raise prices a lot to try to find like what the the right equilibrium is and so I'd love you to just like riff on on pricing like how you think about it what the trade-offs are why not raise prices a lot.

**33:39** · The company is only a little over 5 years old. This past March was the third anniversary of the first dollar of revenue into the business and we only had a Frontier model uh for real uh for the first time in March of 2024. So the time scale of these things is kind of it's an important backdrop. Our pricing has been relatively stable across you know Haiku, Sonnet and Opus and now Mythos is obviously is is newer but you know we made very few pricing changes.

**34:08** · The biggest pricing change we made was to bring down the price of the Opus family when we launched Opus 45. And if we thought about why did we do that, it's really because we found that Opus class models were underutilized relative to their capability, right? And so people were trying to often fit an Opus problem into a Sonnet uh workload.

**34:27** · And we because of again of the efficiency improvements that we were able to make, we were able to serve that um very efficiently from our perspective, but actually bring down the price which made it more accessible to customers. And so it it goes back a little bit to like we want our customers to generate a lot of value from it and they're generating a ton of ROI from our models today. We want them that to just continue because our goal is to proliferate this, you know, throughout the ecosystem.

**34:56** · We think we're in the very very early innings on all of these use cases. The best way to do that is, you know, to get this intelligence in the hands of as many businesses from startups, you know, to digitally native businesses to the largest companies in the world. Some of that means that you have to make it in a price point that's accessible and that allows them to get a lot of value from it.

**35:19** · The changing uh the pricing for Opus actually, you know, you see this Jevans paradox, right? like we lowered the price of it, but the consumption went up way way more than what you would have expected. And so because we kind of, you know, hit that sweet spot, you know, for customers, they were able to use it a lot more. We had the efficiency to be able to serve it to customers at scale.

**35:39** · And then they were able to build that into their workload such that when we released Opus 46, it's a model improvement. They can slot it in. We didn't change the price. And so we think pricing stability is is important. Um and we also think that pricing to get that value and to see that kind of Jebans paradox happen um is really important. The the other component of this is margins and how you think about margins as a business again because this is so unbelievably capital intensive to to build these frontier labs. You've got the leverage we talked about with which is efficiency price like both those things you know relate to margin.

**36:14** · apologize if there's like a naive perspective, but given how much capital you need, why not just say we want to have a healthy margin and sort of set the price accordingly and maybe that price can come down if efficiency is better or whatever. And so I'm curious how you think about margins as it relates to pricing in the business.

**36:30** · Yeah, I I would say we think about what is the return on our compute spend, right? Rit large. So that is all of the different workloads that we've talked about whether it's serving customers, model development. If you think of all of those are kind of in support of revenue over different time scales, right? If I serve inference, it's in support of revenue today. If I do model development, it might help for a capability that unlocks TAM that drives revenue 6 months from now and everything in between. If I do internal acceleration to launch a new product, all of these things are in support of that.

**37:00** · I will say our our returns on those compute that compute expense today are robust. They're robust and we think of it as what is the return on that full envelope of compute. And so we feel really good about where we are from from that perspective. And we're balancing delivering value to customers with also seeing a really really strong return on that compute ourselves. And if you think about when revenue grows, as we mentioned kind of in Q1, you know, it's not like we onboarded a bunch of new compute in that time period.

**37:31** · We talked about compute comes based on a ramp that might have been determined 12 months ago. And so the this idea of a variable cost that's like on the incremental to serve a customer is is is a little bit like it it doesn't really fit our business, right? It tries to maybe fit our business into like a software paradigm, but that's that's not the case.

**37:53** · And in actuality, compute is supporting all of these activities and we're really generating a robust return on that compute and that's our measuring stick. And so, you know, I think I think it's something where, you know, we, you know, think of the compute envelope that we have as the thing that is able to govern how much we're able to drive revenue both over the short term and the long term. So, so if if you're the, you know, this great customer of the compute providers, what does that group need to do to be great to be a great provider to you to help you drive that return?

**38:25** · So, we're fortunate in that we have really great partners in Amazon, in Google, in Microsoft, but also with Broadcom and Nvidia as well. And so, our our ecosystem, you know, we are, you know, the only model that's on all three clouds uh today. We're the only language lab that's using all three of these chip platforms. And really these collaborations are much deeper than just like procurement. I think that's something that that that's often lost.

### How Anthropic’s Finance Team Uses Claude

**38:52** · If you think about our relationship with Amazon, you know, our teams are deeply embedded with the Anaperna Labs team. You know, we are, you know, really good users of Tranium. We've spent a lot of time and energy and work closely with the team and internally. We plan capacity together, right? If you think about the the three clouds, they're great distribution engines for us, too.

**39:11** · We have a really really robust firstparty business uh as well. But it's these are multiaceted partnerships whether it be on you know developing the chips themselves landing that capacity serving it and then ultimately distributing it to the customers. I'm thinking about your function like the finance team and the ways that you might you I'm picturing this like ROI on compute thing on different horizons with all these complex variables which makes me wonder how do you use these powerful

**39:38** · tools yourself internally to run your group and the business like what what what is the deployment of cloud code and cloud in general on the finance team at anthropic? Yeah. So this is really interesting because we were using cloud code you know about a year ago and you know I started asking people like is everyone just vibe coding and we started to use claude code as almost like a you

**40:01** · know an assistant a digital co-worker not just for coding tasks and that actually um was early in what eventually became co-work right that was kind of an extension of cloud code to say what it's done for agentic software development it should do for all of knowledge work But then like we we started to productionize that and I'm actually really proud. We spend a lot of time with our product team too. They kind of see how we use it and get input and feedback from that.

**40:27** · But like today, you know, you know, all of our legal entities, we can produce the statutory financial statements using claude. And yes, a human checks it, but all of those financial statements are produced with claude. We also have a more real-time platform called ant stats. It used to take a lot of time to sift through all the data, get some get to conclusions, write a memo about it or publish a uh you know regular report on you know what's happening over the course of the day, what's driving it. We now have a library of skills for Claude that are specific to finance.

**40:56** · I think last last I checked there were over 70 of them that everyone can kind of access through this kind of common repository.

**41:04** · And on top of that we built an MFR a monthly financial review skill and it can produce our monthly financial review. It's 90 to 95% ready and then all of our discussion becomes about what do we do what are the implications not what exactly happened because cloud is not just reporting the weather it's also helping to think about drivers and like why did the number change in the way it did and that gives you tremendous insight into the business both in terms of this like MFR that we do but also on

**41:33** · a daily basis and so what used to take hours to produce you know a weekly report for you know what's driving revenue or what's driving our comput utilization now comes down to 30 minutes and then we can spend our time on the actual strategic implications of the business. we can also get it in the hands of business you know leaders much

**41:52** · more quickly and so it's just just meant that the insight engine is a lot faster um within the company we also have like you know I have a dashboard I look at token usage across um the leaderboard yeah we don't we don't compensate people on it no one's no one's trying to token max for that but it's really interesting because some of the most senior people within the finance team are actually the biggest users of tokens so it is not just you know the 22-year-old who joined and has a a coding background uh and was doing that on the weekends and brought it to work. It's also people using the tools to change how they're working.

**42:24** · Like I think our number one user is our our head of tax and he's you know really focused on tax policy engines and and and automating large parts of the workloads that are happening within the team. So I love seeing that and I think I tell people if we're not super users of this, if we're not pushing the limits of it, how can you expect customers to do that? As your business scales up, everything gets more complex, especially your compliance and security needs. With so many tools offering band-aids and patches, it's unfortunately far too easy for something to slip through the cracks.

**42:52** · Fortunately, Vanta is a powerful tool designed to simplify and automate your security work and deliver a single source of truth for compliance and risk. There's a reason that ramp, cursor, and snowflake all use Vanta. It frees them to focus on building amazing differentiated products knowing that compliance and security are under control. Invest like the best listeners get a special offer of $1,000 off Vanta when you go to vanta.com/invest.

**43:17** · I know firsthand how complex the tech stack is for asset management firms. And seemingly every new tool and data source makes the problem even worse, adding more complexity, more headcount, and more risk. Ridgeline offers a better way forward. One unified platform that automates away that complexity across portfolio accounting, reconciliation, reporting, trading, compliance, and more, all at scale. Ridgeline is revolutionizing investment management, helping ambitious firms scale faster, operate smarter, and stay ahead of the curve. See what Ridgeline can unlock for your firm. Schedule a demo at ridgeline.ai.

### Raising Capital & Overcoming Investor Skepticism

**43:46** · Just as a human, does does it freak you out at all that all all of these I've heard so many examples like this. It starts to feel like we just start doing the stuff that AI tells us to do, like like in the sales example or the calendar or whatever. Um, and maybe that's great. Maybe it's just such a better coordinator and, you know, wide thinker and optimizer than we ever could be that we should do what it tells us to do. But it feels like ever so slightly dystopian to me that that that reality is coming quickly. I've I've had examples of it, too. And it feels kind of cool.

**44:17** · Like it's helpful, but at the same time, if I really close my eyes, like, oh, I'm just like doing it doing what it tells me versus me doing me telling it what to do. It's a really interesting just like human dynamic that I'm curious for your take on. I I maybe have a slightly different view on it in in that I think like it it has made you

**44:34** · know we've been able to hire great people at the company but it has made even those incredibly talented people so much more productive and there's a little bit of this um I think of it again like Jeban's paradox but for for labor which is that we have people who become incredibly more productive we actually we've hired a lot more people because of that because there's no shortage of work to do and now with the assistance of Claude you know, people are spending less time in that MFR trying to reconcile some number, but they're actually thinking, oh, how do we reinvest this in the business?

**45:06** · How do we think about um, you know, kind of dynamically allocating resources? Whereas before I'm working to tie out a number or I'm, you know, that in that accounting example taking a long time to close the books. So I actually think of it as you know uh maybe even more optimistically that it is an accelerant to to our productivity and

**45:26** · that actually means that we can get a lot more done and that even as we grow the team those people are more productive as well as they come up the curve on how to use cloud you know within our company and I think that's starting to be true across many companies as well. I'd love to talk about investors and capital formation.

**45:42** · Of course, you've had to raise tons and tons of capital. At the same time, it seems as though like if I just squint my eyes and think about the multiple on current revenue, it's like not that crazy in terms of like where you're raising money. I'm so curious for you to teach us about what it's been like to interact with investors like how you've seen their understanding of the company evolve and mature. Where do you think the investors as a group kind of like understand it now? Where do they where are their misunderstandings about anthropic? Tell us that side of your life. So I joined the company about two years ago. We were closing our series D at the time.

**46:12** · You know look that was not a straightforward fundraising. The company really only had a frontier model in the middle of that fundraising. Uh towards the tail end of it the FTX transaction was happening which liquidating a bunch of anthropic shares and so that was kind of the starting point and at that point the questions were around like why do you need to have a frontier model like what's what's the returns to this? They're also around, you know, our mission and how we approach things. People said, well, hey, aren't AI safety and building a really big business?

**46:44** · Aren't those things at odds? Um, and there were also a lot of other misconceptions on your sales your sales force is really small. Don't you need to scale it like all these enterprise software companies? And so there was just a bit of a paradigm around trying to fit us, you know, into a particular mold that had existed before. Over time, you know, it's it's evolved. We at the end of uh 2024 we raised the series E.

**47:07** · You know the business had had scaled to you know close to a billion dollars of run rate revenue but the day of our first close was the day of the deepseek news came out.

**47:18** · Uh obviously we got the close done but certainly a ton of volatility as people then said wait a minute should I just totally rewrite how I think about AI in total and so that was that you know that was a series E. Obviously, we brought on, you know, uh, great investors across all of these, but people still had some of those questions, but they looked at our forecast and they thought, okay, you know, I get it. You've grown, you know, wow, you've grown to, you know, a billion dollars of run revenue so quickly, but there's no way you're going to be able to keep up. Yeah, that's just not possible, right? And there's laws of physics.

**47:48** · You're in enterprise, which is great, but the adoption is going to take so much longer. I mean, look at how long it took with cloud and how many people are still on prem. the business continued to prove out the thesis that the return to frontier intelligence is really high that we're we are really focused on what's really happened is modelled growth uh enabled by products and our go

**48:09** · to market team and our distribution and then I think what they also saw was that this thesis of like hey it's really important to build this transformative technology but to do it in the right way and do it responsibly that that had this um really interesting interlink with our

**48:26** · business that most people didn't really understand or really believe which was that we invest in research not just in model development but also in AI safety research right like we've pioneered interpretability which is um think of it as like an MRI for the model to see inside the neural network how it works we pioneered alignment science which is

**48:47** · you know you want the model to do what you you tell it to do and how often does it do that and how often does it stray from that and those things are important for our mission and that's why we did them, but they had these downstream effects where it turns out if you can look inside the model, you're better at building them. And then the last linkage, if you're selling to enterprises, like we now sell to nine of the Fortune 10, all of those enterprises are entrusting us with, you know, customer information with their data.

**49:15** · They're interacting with their employees, sometimes even interacting with their customers as well. um that is those are the most sensitive workloads.

**49:21** · The more and more of these businesses are running on cloud and our cloud platform. when you have this investment that we've made and will continue to make in safety, interpretability, alignment, like that actually enur to the benefit of the enterprise um customers as well because and and and all of our customers because if they're going to entrust us with all that access and all that data um and the ability to to to to kind of work in the most sensitive workflows within their company, they want a company that they can trust.

**49:49** · And that's not why we invested in it, but it it did have this kind of downstream effect that we've really seen prove out again and again to be a company that is both at the frontier, but one that is investing in safety and that you can trust. We've raised um you know $75 billion since I joined the company. We have another $50 billion that'll come in into the future from the Amazon and Google deals that we that we inked last month. And so that's a tremendous amount of capital, but it's a capital intensive business and we need this capital to support that growth.

**50:16** · But you know it all goes to the fact that you know the business is running very efficiently and so the reason we raise this capital is more because of that cone of uncertainty than it is to fund you know actual losses in the business today.

**50:30** · How is your own perception of this like 10 perspective for a 10x growth of the business? Like the first time that happened like did you personally believe that it was possible? like did that seem absurd and has it like now that it's becoming consistent and so I'm maybe maybe it's becoming more uh commonplace to you or something but what was your like own view staring at this cone about like the odds of hitting you know a 10x type of growth so many years in a row well when I joined the business it had about 250 million of run rate revenue and the plan was to get to a billion and I said great in what year and that was

**51:03** · like linear thinking right and you know consistently you know Daario has been a much better predictor of the revenue uh than than I have. I think we're going to close the gap over time as we get better at at forecasting and understanding the business. But yeah, definitely the first time I saw it, you you have all these

**51:19** · arguments about the laws of physics and law of large numbers and this can't you know where is the revenue coming from and how can it be added this quickly and how can customers move this quickly and is this even possible in enterprise and all of those things start to get broken down over time as you see how the business works internally and you see how the adoption curves and the um exponentials that are happening again we have the exponential that's happening on revenue but that's underlies are these many other exponentials that support that. You start to see and and believe in that more.

**51:49** · Now, that doesn't mean we're not disciplined and thoughtful about the forecast and how we think about the range of scenarios. But it does mean that like that my thinking has at least shifted a lot more from linear and incremental towards, you know, leaning into this exponential and really, you know, believing in in its its uh potential and and and how this is just different than how other businesses have evolved.

**52:12** · As you've talked to investors at every stage, I'm sure every stage, every round that you've raised, there's something that is like the most common or hardest thing to explain to investors or that they're struggling the most to understand and get their heads around. What is that today? I think it is this paradigm of how compute is used.

**52:29** · Thinking of it as you know not, you know, not just something that is like a variable cost over some time period, but really this resource that's so funly utilized, right? we you know run workloads on one day in the morning on a chip for inference and in the afternoon or evening uh we use it for model development that is something that's you

### Public Perception, Risks, and Government Regulation

**52:52** · know that paradigm does not exist in a company like like a software company or a factory right if you you can't repurpose if you have a bunch of people doing R&amp;D and that's your R&amp;D expense they can't go and become cogs right and vice versa in most traditional companies here that you really have that fungeibility that's possible and I think that's where the return on compute is so

**53:17** · important and I think people are beginning to understand that but there's still a tendency towards treating it like you know oh I have to separate these two costs when in actuality you know they're very self-reinforcing and that flexibility is actually what helps to drive revenue short-term and long term.

**53:34** · If I was to force you out of your role and into an investor seat at a great big investing firm and then I said your job is to go grill these companies and invest in the best ones, like what questions would you be asking of the labs or or companies that are building models to really get at the heart of uh you know the points of uncertainty of skepticism of like things that might not make these the best businesses of all time. I'm curious maybe from that angle how you would approach it. So I would say a couple of things. First, what is the ROI on on compute kind of all up?

**54:09** · How are you utilizing it? And what return are you seeing today? And how is that coming over time? Right? These are the massive kind of unprecedented investments that companies like us are making what is what what's what's the return that you're generating on that and and when does it come and what is the shape of it? So I think that's one.

**54:28** · Um, a second one is, you know, how how do your customers see ROI in what you do? Are people, you know, just using this for testing? Are they actually deploying this at meaningful scale? You know, I I could say for our business, like we're seeing that in spades. Uh, you know, our net dollar retention rate is over 500% on an annualized basis.

**54:45** · And um so you know it's and and with and the the kind of nine out of the fortune 10 these are real real customers making significant uh you know kind of buying decisions pilots anymore.

**55:00** · Exactly.

**55:00** · Like I on the way here I was in in in an Uber and uh I signed two double digit million-doll commits like when the car ride which was like 20 minutes. So, uh, from that perspective, we're we're seeing it and and we're now being judged by some of the biggest companies in the world, the most sophisticated buyers and startups that are also, you know, they have choice in the market and they're choosing us. But I think one question I get a lot is, you know, or I would ask from the investor seat, the skeptical investor seat is like how are your customers getting return from this?

**55:30** · Maybe a third one is is, you know, how do you think about uh compute in the future and like where does it come from?

**55:38** · uh cuz obviously some of the places that we buy compute from you know they uh you know sell the compute to others they might use the compute internally like what what is the balance of that over time again for us like one reason why uh you know we have multiple different and so your philosophy there is just like be involved with great players and have flexibility that's right that's right there's this crazy stat about AI just the generic

**56:02** · concept being less popular than like Congress amongst like the general populace and it's kind of funny when you first hear, but when you really think about it, you're like, "This is kind of Like, we need to solve this problem." It doesn't seem like the general world that isn't in technology, doesn't live in the Bay Area or New York, does not yet feel or understand why this is good for them just as measured by their opinion of it. What do you think is to be do we need to do as a as an industry about that problem?

**56:27** · Look, I think that if we think about the transformation that's happening, there's been other transformative waves, right, before all the way back to the industrial revolution, the internet, cloud, etc. I think what's one of the things that's different about AI is it's all happening so quickly. You can have, you know, years or decades of progress that are being compressed into months.

**56:51** · And going back to, you know, humans thinking in terms of exponentials versus linear, that can be that can be jarring, I think.

**57:00** · We are very optimistic generally about the potential for this technology. I think that we as an industry can continue to do a better job of articulating, you know, Dario wrote this essay, machines of love and grace. It's all about the potential for this technology to transform the way that we live. Whether that be in drug development and curing diseases that are more mainstream, but also rare diseases.

**57:23** · number two in healthcare and how health care is delivered um to raise our standard of living you know in in the developing world and in places where you know resources are not as plentiful. I think that all of those things are part of the promise and the potential of AI and so we could probably do a better job of painting that picture and we want to show more tangible results for that over time. I think that is coming and that's one of the things I'm most optimistic about. I think on the other side though, we we do, and this is again cultural to us, like we do want to articulate the risks.

### Mythos

**57:55** · Like I don't think we should just tell everyone everything's going to be great. Um because, you know, there there are likely to be bumps on the road. And so I think people generally gravitate towards more like honest and balanced assessments, right? If I feel like somebody's just telling me all the good news and none of the bad news, then I'm like, okay, do I really trust this perspective? I think that's where the need there's a need for balance and to say like look these are some of the things that happen when change is compressed over a short amount of time.

**58:21** · How do we work across you know commercial and government to actually come up with some of the solutions to that? So I think it's about a clear articulation of the opportunities. It's about really thinking about what those solutions may be. And that's not any one company that can, you know, come up with it. We don't have this the blueprint that's going to solve everything, but to at least have that dialogue about some of the risks and downsides and what we can do to address it. And then I think it's being transparent about that about both of those things when we talk about it.

**58:49** · And so over the long term, the opportunity is going to be significantly higher and greater than, you know, some of the risks and the downsides that will happen. But that doesn't mean it's going to be perfectly smooth on the curve. The release of Mythos was such an interesting moment. It was the first time many people, friends of mine that are careful watchers of this stuff said something like, "I'm I'm like, this one kind of makes me scared." So, it like relates back to the safety question.

**59:13** · It's also the first example of you coming out and saying like, "We want to make sure this isn't used for bad, and it's maybe the first one that we are worried could be used for bad." Um, I'm curious what it was like that discussion was like internally before the world heard about it, the decision-making process around it. And just using that as an example that to talk about the things that do scare you as as we continue to advance and the scaling laws continue to hold. Yeah. I think one of the things about Mythos is that people maybe misconstrue it as just a a cyber model. It is a incredibly capable model across many many different dimensions.

**59:47** · What we found was that cyber in particular was a place where it spiked and so this was the first model that we decided to release in a different way and and the way in which we did that again is consistent with our mission our principles like we wanted to do it in that way and so we have this phased approach to it because we think that when a model is this capable and again cyber is the thing that people focused on but you know there are other things as well we think again it can be used in a positive way right to patch code bases.

**1:00:16** · You've seen these examples where um you know we had an open source code base that you know a prior model found 22 security vulnerabilities in and Mythos then found 250. Uh so that is kind of scary right but the re that informed the way in which we released it. So we didn't say we're never going to release it. We said let's do it in a phased way.

**1:00:36** · Let's do it to you know group that will expand over time where we can you know focus on this one cyber capability and how it can actually be used positively you know in a in in a defensive way as as opposed to in an offensive way and we think that's a template that you know could be used for the future but because of this one particular area we wanted to be cognizant of that in like how we released it. you're so big now that you like run into everything and everyone.

**1:01:02** · And one example of this is the government just a couple days ago said maybe there'd be this new system where you have to sort of like pre-approve the release of a new model with the government before it was released to the public. Obviously, you had the crazy experience with the Department of War, which I'm really curious what that was like as you went through it. Like now now everyone cares about this company and this technology and the couple other companies that are that are building it.

**1:01:23** · How do you navigate that stuff? and and some of it's just I guess beyond your control, but I'm sure you're trying to work with people as best you can. Maybe talk about those two examples of like the government now as a very relevant um partner, player, you know, overseer, etc.

**1:01:40** · Yeah.

**1:01:40** · So, I think first and foremost like we we you know, prioritize having a strong relationship on this because we do think that, you know, regulation has a role to play in in in how these models are developed over time. We are very like America first in in our approach.

**1:01:56** · We want the technology to support the US as well as you know democratic countries around the world. And um that's one of the reasons why we've been working closely with the administration on something on something like Mythos. I do think that there's a balance, right? You want to be able to have innovation happen really quickly and and have that not be slowed down, but you also want to have this kind of responsibility framework for how how uh these things are deployed because we've long said that, you know, this technology has

**1:02:26** · implications and we should have an honest conversation about them and that includes with the government and so I think that's you know I think the mythos process is a good example of that. Can you teach us a bit more about the culture like how you would describe the cultural tenants to your parents or something like this and what feels like it really drives most of the culture? I'm especially curious about the writing. It feel you hear often that you know Dario publishes these long essays at you know every so often externally. My understanding is he does that way more frequently and there's a lot of writing culture internally.

**1:02:57** · I'm just I'm trying to get a sense of what the culture is like to be in and and what makes it the most distinctive from other companies maybe that you've worked at um or from other other companies that are trying to do the same thing and what's your sense of of the differences and the distinctiveness. The culture is a real unique aspect of anthropic and it is something that you know we do talk about externally but it's different when you're kind of in there uh living it and maybe I can tell you a little bit about some of my observations. First of all, we have seven co-founders, right?

**1:03:26** · Uh that that that shouldn't work on paper, uh but it really does in practice. And I think they've really set the example for the culture and and the things that really matter to the company. We do a culture interview and it's not some pro-forma, you know, thing we do just to kind of uh check a box. It is a real part of the evaluation process. So somebody could be flying colors on everything else and really really the smartest person you've met in this role.

**1:03:55** · we won't hire them if they don't pass the culture bar. And the way I would describe it, um I like that frame. How would you describe it to your parents is it's one incredibly collaborative. And this means that we don't really tolerate the like thftdoms or the the the sharp elbows or the like I need to take credit for this. It's incredibly humble. It's like, you know, our competitors are incredibly capable and success is far from guaranteed. And I think that's like really part of how the company operates.

**1:04:24** · if we reach a milestone and something good happens like there's not confetti on the floor it's like what's next and I think it's just that focus on the mission and the alignment that kind of is imbued throughout the culture of the company the other thing I would say is you know there's there's rigorous debate right there's there's um an intellectual openness and intellectual honesty uh that happens where you know people question things people will you know uh

**1:04:50** · really express a point of view but then there's dialogue around it that's productive and then you know we'll decide on a path forward and then there's after that happens there's real alignment. So in something like compute allocation we were talking about before people might have different perspectives on how to allocate that compute but they will engage in a like thoughtful

**1:05:09** · discussion about where the returns are the highest or the best and when they do that you know and we come to a decision then there's alignment on it there's not second guessing there's not this kind of politics or thftdom the other piece of it is it's remarkably transparent the culture right so Daario gets up in front

**1:05:26** · of the company uh every two weeks usually writes a short document um and he talks about you know usually three or four topics and then takes open questions from the company and these are not softballs they're not like planted questions they're just real questions that are on people's mind and he answers them the best that he can and it's not a

**1:05:45** · decision-making forum but it is a way for the company to get a window into how leadership is thinking how he's thinking and there's debate and dialogue in that and I think that is something that people really value like it is a transparent culture culture. It is one where, you know, all seven of the co-founders are still at the company.

**1:06:04** · The vast majority of the first, you know, 20 to 30 employees are still at the company. And I think the culture underpins the reason why we've been able to attract and retain some of the best talent in the industry, right? Because we don't always pay people the most. We have, you know, very competitive compensation packages. But when you know Meta and others were out you know with these huge packages uh for some of the technical talent in in across the large language labs I think we lost two people and other labs lost dozens.

**1:06:31** · What parts of the business and the culture for I mean specifically for researchers why do you think that's that's that stat is true? I think it is it really is underpinned by the culture and and and that's not just something we feel. It's like empirically when you talk to people it's you know I want to have the most impact possible. I want to work in a place where um again this idea of talent density mattering more than talent mass.

**1:06:57** · And I want to work in a place that is actually collaborative versus I have to like fight for this one thing and I feel like it wasn't discussed and debated in the right way or um there wasn't transparency around how a decision was made. I think that actually really matters because most of our team just wants to do really really good work and they're attracted to the company for the mission. the idea of having an impact on a company like ours um that is trying to

**1:07:24** · develop this transformative technology but to do it in a responsible way I think that that really matters to the people um not just on the research team but across the company and that we think is a real advantage for us and it's not something that is that we that we take lightly. We have this concept of a race to the top. We want you know we don't always have all the right answers. We don't always do everything perfectly, but we want others to, you know, look at some of the things we do and maybe emulate some pieces of that and actually like have the technology be developed in a better way across the industry.

**1:07:54** · I think people are also really attracted to that as well. Again, not that we have all the answers, but that we can be a a part of contributing and leading to how this, you know, can go well for humanity. As you're having conversations with people internally, what what does the frontier feel like to you? I don't just mean the model frontier. I mean like the next couple of of rolls of the dice here in building AI in general. Uh everyone is kind of wise to like these things are powerful. Everyone's using them. It's becoming it's diffusing.

**1:08:27** · People are becoming acce accepting of them. What feels to you like the the frontier from the inside? I think it's this idea and again it's because we're focused on enterprise and because you know we're really trying to you know change the productivity of knowledge work that's done in the economy. I think it is towards this vision or this goal of like a virtual collaborator.

**1:08:47** · And so think of this as, you know, something that has context within your organization that can use all of the tools that are specific to you, whether they be homegrown tools or tools that you purchase that has, you know, memory and the ability to like effectively learn from mistakes you've made, but also mistakes that it's made over time.

**1:09:08** · And then the the ability to work over a very long time horizon on not just a task but an but an actual idea. And so what that means for us is the model capability has to continue to grow to support that. And then the products we build on top of it can unlock this virtual collaborator that we think you know can really accelerate knowledge work. But you have to get it in the right form factor. Right. It's this is where like intelligence is not just a single dimension.

**1:09:36** · It's it's it's multiple things, but the virtual collaborator kind of combines many of those things, right? Which is something that's not just generically smart, but is smart for your use cases. And I think again, what we're seeing in coding is something that we expect to see elsewhere. For us, like cloud code has led the way on that as well as like much of the the the business that um we have great great customers in in that uh are pushing the coding frontier as well.

**1:10:01** · But then you also see something like co-work come along and start to unlock that co-working faster than claude cloud code was if you index them to the same point in time.

**1:10:14** · That's kind of remarkable because developers are really fast adopters of this technology. But I think it's it's because the model capabilities and the products are pushing towards this this notion of a virtual collaborator where even our product development today is not done by like one product manager with two engineers shipping something over 3 months.

**1:10:32** · It's shipping daily and there's a fleet of agents that are working across the company on a specific task. everyone kind of becomes a manager and I think the implications of that and the productivity gain that can come from that when it's in the right form factor uh is we're very very early in that but the potential for it is incredible crazy to imagine. I'm curious how you've had to personally evolve to be able to stay doing this.

**1:11:01** · Like um you hear a lot about these stories about oh that the executives have to scale with the company or or else they'll get new executives. You know the business that you were at prior to this was a great business but it was a tiny Cedar was a tiny tiny fraction of the scale. So you like everyone is in this new unprecedented thing. You talked about the example of like getting out of linear into you know into more exponential type thinking. That's one example of what I mean. But what how how have you managed it personally? Like how what have you had to do? What's been the most painful?

**1:11:31** · Like how do you manage your own ability to scale with this thing that's scaling faster than what we've seen before? Yeah, it's it's really hard. But I think the important thing is to think in first principles, right? So this is like everyone has priors when they come to to uh something new. thinking in first principles and having like intellectual openness. You know, I um I spent a lot of time with with Tom Brown, our chief comput officer.

**1:11:58** · He was actually one of the first people to interview me at the company and I remember we we went on a walk like um uh it was a bit before I started and it was we walked around the mission in San Francisco for two and a half hours and he started to tell me about his vision for the future of the company and this is in 2024, early 2024. And I'll be honest, it sounded crazy.

**1:12:18** · you walked me all the way home and uh and I I remember I came in I told my wife I was like this is going to be wild like if if even 10% of that is true like this is going to bend all paradigms of of what not just things I've seen but what most people have seen and it turns out that a lot of what Tom said during that walk has come to fruition but I remember that as like an early formative thing coming home and being like holy like this is going to be totally different and new and you know a really

### What Could Derail the AI Revolution?

**1:12:51** · incredible experience but also a really challenging one. Then that's what it's been. The other piece of this is just hiring great people. You know I try to hire people and I I tell people during the interview process I'm like I'm not really hiring you as like a direct report of mine. I'm hiring you as a partner and I want you to treat it as a partnership which means that there might be things that you and I disagree on. I want to hear that and I want to like whiteboard it.

**1:13:14** · I want to understand like you know I've we've hired people from some of the best companies in the world they come to this from a different perspective right they might come to it from a hyperscaler or a large software company or from financial services in another lifetime you know I worked at Blackstone and the private equity group like that training is really valuable and thinking about things at a granular

**1:13:33** · level and not losing that like I'm not somebody who is comfortable at 50,000 ft that's just like not me but you can't be at 500 feet at everything in this business there's too surface area and so having people who can be partners in that is really really critical. I think the last piece is to think about you know how the business you know evolves

### Biotech and Healthcare

**1:13:56** · over time and where there might be moments or analoges to things that have happened in the past. you know, I was I helped lead the the the financing that Airbnb did, you know, in the middle of the pandemic. Very different situation, right? The business lost 70% of its revenue in seven weeks. I know O'Brien was just uh did did a show with you.

**1:14:14** · That was a harrowing time, but it was also a time kind of without precedent, right? Where you had to think about things with a clear perspective when it was rapidly changing and there was not a good template or pattern to match. And then on a personal level like look it is hard to balance everything you know family and friends and uh and and and certainly this job uh you know kind of takes a big bite out of all that but what I do try to do maybe once a week is

**1:14:42** · in a quiet moment just think wow this is really cool it's it's it's an incredible yeah it's an incredible opportunity to work you know with this group of people on this problem at this company at this moment in time And I try to do that, you know, again, maybe it's in a car ride, maybe it's late at night or something like that. Just having that like recognition and that um appreciation is really important.

**1:15:07** · What did Tom tell you on the walk that sounded most crazy?

**1:15:11** · I mean, he he we talked a lot about the scale of the compute infrastructure, what um models could do in a short amount of time. I think, you know, he described a world that I would have said is kind of sci-fi. Um, but a lot of what we're experiencing here and now have really roots in that conversation. And so, uh, there's even more things that he talked about that are probably beyond where where we are today.

### The Kindest Thing

**1:15:32** · But I think the the the commonality of it was that, you know, everything is going to happen much quicker than we think and that the the both the implications but also the capabilities of that can change. And then he also had like a really, you know, incredible optimism about about the future that I think uh, you know, we talk about internally kind of holding light and shade.

**1:15:57** · That's one of the things we say and I think like I came from that conversation with just a bunch of questions but also just a sense of positivity about what could happen in the future. It seems like we spent most of our time talking about because it's been the reality that we exist at the high end of that cone. What can you imagine that would cause that to change to the low end of that cone? Like how if we were to do like some sort of premortem on a year from now, we're like, "Wow, actually we didn't need nearly as much compute as we thought or something like that." How what can you imagine that would shift us meaningfully in that in that cone?

**1:16:29** · I think the first thing would be the diffusion rate within our customers. the use cases are playing catch-up to the model capability and I think you know look these are we are talking about humans in large organizations with a set of tools and

**1:16:47** · practices and things that they've been doing for a really long time change is hard right and so to the extent that that diffusion you know hits a wall or slows down or something like that um that could affect the kind of rate of change in terms of uh revenue growth you know certainly the scaling laws uh slowing down or not holding we don't see that We can't say that with 100% certainty. I think that would be uh that that would be silly. We certainly believe in the trajectory, but um the model capabilities leveling off uh would be would be um uh another thing.

**1:17:15** · And then you know maybe third is is just how how we think about um you know being at the frontier. You know today we're at the frontier. I think we're defining the frontier of agentic AI. We need to stay there, right? And it's a competitive market and uh we're going to continue to invest in the technology and the compute and the go to market that's required to be there, but that's not guaranteed either. What are you most excited about?

**1:17:42** · Like you get to you have a privileged seat. You sort of get to literally see the future because it's happening inside the business before those outside the business see it. With that perspective and in that seat, what what what are you most excited about in the future? I really think that the the biotechnology and health care outcomes that can come from this technology are the things that I'm most optimistic about it. We may live in a world where you're diagnosed with a disease that is not curable, but in your lifetime that cure can be found much more rapidly and you actually might not die of that disease.

**1:18:14** · And I think of this as like, you know, a lot of what we're doing today is helping to speed up the the the drug uh development process, right? a lot of the paperwork and clinical studies reports and things like that that are needed to be done. AI and our solutions in particular are helping to rapidly accelerate that.

**1:18:30** · I'm really most optimistic and excited about when it goes further back into drug development and drug discovery because you know our humans are are are incredibly capable at research but if you think about these molecules and proteins like they're so complex and such small changes have such big implications for the outcomes like AI is perfect for that.

**1:18:54** · If you think about what can happen when the lab's throughput goes up 10x or 100x and we can run that many more experiments probably get better results faster and that can be something that helps you know people around the world right and it doesn't have to be limited to a a small set of diseases or disorders it can really go much further down the chain and so I think that has the potential to you know greatly alter the way that we live and the way that we

**1:19:22** · interact and that's really exciting To me, I sure hope you're right. It sure seems like we're on that trajectory and it's it's quite a future to imagine. This is so much fun. I feel like we covered so many interesting aspects of the business that, you know, you don't I don't think you've done this before. So, you know, don't get this amazing perspective. When I do these, I ask the same traditional closing question. What is the kindest thing that anyone's ever done for you? I have a brother uh who's 5 and a half years older than me, and we lived in California when when he went to uh to college. He got into to everywhere he applied to, and he was going to go to medical school after that. And so, um, I didn't know any of this at the time.

**1:19:53** · So, he ended up, uh, going to college in state and and he he did exceptionally well. It's kind of years later that, uh, I kind of had to pull this out of him. But, you know, in in deciding where to go to college, you know, we were solidly middle class as a as as a family. And, you know, this was like 25 30 years ago.

**1:20:14** · You know, the financial aid packages weren't, you know, as robust as they are today. And a big factor in his decision, I found out, you know, many, many, many years later, was, you know, wanting to give me the opportunity to go wherever I wanted. Um, even though, you know, that was 6 years out and who knows how I how it would turn out. I didn't know that.

**1:20:34** · And I and and it was something that, you know, 12-year-old me or 13-year-old me would have never would have never really understood. But now, you know, many years later, I think that's something that was incredibly kind and uh is something that uh, you know, I still kind of hold with me today. Wow, I've done this like 600 times or something. I've never heard an answer like of that type. That's that's awesome and amazing.

**1:20:53** · Christian, thanks so much for doing this with me. Yeah, thanks for having me, Patrick. Really enjoyed it. You know how small advantages compound over time? That's true in investing and just as true in how you run your company. Your spending system is your capital allocation strategy. Ramp makes it smarter by default. Better data, better decisions, better economics over time. See how at ramp.com/invest.

**1:21:15** · As your business grows, Vant scales with you, automating compliance and giving you a single source of truth for security and risk. Learn more at vanta.com/invest. Every investment firm is unique and generic AI doesn't understand your process. Rogo does. It's an AI platform built specifically for Wall Street, connected to your data, understanding your process, and producing real outputs. Check them out at rogo.ai/invest.

**1:21:37** · The best AI and software companies from OpenAI to Cursor to Perplexity use Work OS to become enterprise ready overnight, not in months. Visit works.com to skip the unglamorous infrastructure work and focus on your product. Ridgeline is redefining asset management technology as a true partner, not just a software vendor. They've helped firms 5x and scale, enabling faster growth, smarter operations, and a competitive edge. Visit ridgidelineapps.com to see what they can unlock for your firm.