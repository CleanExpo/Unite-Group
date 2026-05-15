---
title: "Firecrawl is DEAD - Gemini 3.1 Flash Lite is the New Web Scraping King"
source: "https://www.youtube.com/watch?v=Itluyo_Jqis"
author:
  - "[[Income stream surfers]]"
channel: "Income stream surfers"
published: 2026-05-08
created: 2026-05-08
description: "In this video we talk about the new Gemini 3.1 Flash Lite which is an impressive model for LLM scraping and web scraping from Google and Gemini - it's a great model and I'll be using it in Harbor very"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=Itluyo_Jqis)

In this video we talk about the new Gemini 3.1 Flash Lite which is an impressive model for LLM scraping and web scraping from Google and Gemini - it's a great model and I'll be using it in Harbor very soon due to its 100% accuracy when reporting links  
  
thanks for watching and PEACE  
  
Hamish  
  
Try HarborSEO FREE:  
  
https://harborseo.ai  
  
Work with us:  
  
https://incomestreamsurfer.com  
  
Try Bright Data:  
  
https://brightdata.com/?promo=incomestreamsurfers  
  
0:00 Intro - Lightweight Agentic Workflows  
0:17 Gemini 3.1 Flash Lite Just Dropped  
0:26 Why It's Bad for Coding  
0:45 Why I Love Flash Models (Cost + Speed)  
0:55 Harbor's Real Gemini Spend ($153)  
1:23 Why Flash Lite is Perfect for Web Scraping  
1:39 LLM Scraping with Jina Reader  
2:19 How LLM Scraping Actually Works  
2:49 First Test Failed (Context Cut at 80K)  
3:23 The REAL Test: 96/96 URLs Returned 200  
4:11 Pricing: $0.25 Input / $1.50 Output  
4:40 Multimodal: Audio + Video Input  
5:12 Grounding Warning ($10/day → $150/day)  
6:03 Cost at Scale: 1,000 Pages for $8  
6:26 96/96 URLs + 36/36 Images All Real  
7:02 vs GPT-5 Nano (50% Hallucination) and Gemini 3 Flash (75%)  
7:46 Putting Flash Lite Into Harbor  
8:34 Why This is a Massive Upgrade  
9:07 Harbor SEO - 363 Pages, 160K Impressions  
10:11 Final Thoughts  
  
Google just dropped Gemini 3.1 Flash Lite (May 7th) and it's INSANE for web scraping. I ran a real test scraping a website with Jina Reader + Gemini 3.1 Flash Lite and got 96/96 URLs returning HTTP 200 and 36/36 images all real — at $0.25/M input tokens.  
For comparison: GPT-5 Nano hallucinates ~50% of links, Gemini 3 Flash ~75%. Flash Lite hit 100% accuracy on the same test.  
In this video:  
→ The Jina Reader + Flash Lite scraping stack  
→ Real cost breakdown ($8 per 1,000 pages, $4 with batch API)  
→ Why grounding can blow up your bill ($10/day → $150/day)  
→ 1M context window for full-page scraping  
→ Multimodal support (text, images, audio, video)  
→ Why this might RIP Firecrawl  
🔗 Try it: https://ai.google.dev/gemini-api/docs/pricing  
🔗 Jina Reader: https://r.jina.ai  
🔗 Sponsor — Harbor SEO (363 pages published, 160K impressions): https://harborseo.ai  
⏱️ Chapters in description  
  
#GeminiFlashLite #WebScraping #LLMScraping #AITools #Gemini #JinaReader #Firecrawl  
  
  
gemini 3.1 flash lite, gemini flash lite, web scraping ai, llm scraping, gemini 3.1, google ai, jina reader, firecrawl alternative, cheap llm, ai web scraper, structured data extraction, gemini api pricing, google deepmind, ai data extraction, gemini scraping, flash lite preview, gemini 3 flash, gpt 5 nano comparison, batch api gemini, 1m context window, multimodal ai, ai for scraping, harbor seo, llm cost optimization, ai scraping tutorial, gemini flash vs firecrawl, scraping with gemini, structured json extraction, lightweight ai model, fast llm, agentic workflows ai  
  
#GeminiFlashLite #Gemini #WebScraping #LLMScraping #AITools #GoogleAI #JinaReader #Firecrawl #AI #DataExtraction #Multimodal #GeminiAPI

## Transcript

### Intro - Lightweight Agentic Workflows

**0:00** · So look at this guys. As it says right here, designed for lightweight agentic workflows, simple data extraction and applications where responsiveness and API costs are the primary constraints. This is super interesting.

**0:14** · I'm going to show you why in this video.

### Gemini 3.1 Flash Lite Just Dropped

**0:17** · So as you may or may not have seen, Google just dropped Gemini 3.1 Flashlight. And at first I was not bothered about this model. Mainly because most of the things I do is around coding, right? So, whenever a new model comes out, this is a test that I did of 3.1 flashlights and it was absolutely terrible. This is open code trying to use flashlight. The results were awful, guys. Okay, but there is actually a use case for this model that I'm going to talk about in this video.

### Why It's Bad for Coding

### Why I Love Flash Models (Cost + Speed)

**0:45** · So, you guys may or may not know that I'm a big fan of Flash models for a very specific reason. This right here, responsiveness and API costs.

### Harbor's Real Gemini Spend ($153)

**0:55** · So just as proof of that, this is um Harbor's Gemini spend, which this is not our only API cost. I have other API costs as well, but this is basically what we spend on three flash. This is currently three flash, right? The cost is 153 uh but not only that, the main reason I actually use this model is because it's super super fast. But this model 3.1 Flash Light is even faster.

### Why Flash Lite is Perfect for Web Scraping

**1:23** · Okay. So, I'm going to show you how you can use 3.1 flashlight for web scraping or why you should use 3.1 light for web scraping. So, I did a very very interesting experiment which I'll show you in just a second. But basically, I I can just show you here as well. I tested two men. Which is, you know, a site that many people will be familiar with with Gina reader. Right? So, what I did was I fed two men.it to Gina. If you don't know what Gina is, it's basically just a it it turns a website into HTML, right?

### LLM Scraping with Jina Reader

**1:57** · So if I press get response here, you can see it turns the website into in this case markdown, right? So if you want to extract links or images from a website, then you can use Gina to basically turn your or other people's websites into markdown with images inside it. so that you can extract those images using LLMs.

### How LLM Scraping Actually Works

**2:19** · This is known as LLM scraping. Right? So basically what I do is you get some URLs, you feed them into Gina, you get the clean markdown and then you use Gemini 3.1 Flashlight to extract JSON structured data. This is LLM scraping in a very basic format. And it's actually mainly the the the main thing that Harbor does as well as other things is it uses LLM scraping to find people's products, people's information, etc. and put them into the blog posts that we write.

### First Test Failed (Context Cut at 80K)

**2:49** · Okay, so I actually know quite a lot about this stuff. Now, the first test that Claude did, it did something that I It just does this every single time. I've done hundreds of these tests, right? Uh trying to test different models. it always cuts the kind of context off at 80,000. If you don't feed the full page to Gemini, it will not be able to extract things. So, at first I thought this model was really really bad because it it basically cut down the HTML at like the header.

**3:19** · So, it was just showing the header to the model. However, when I realized this, I fixed this and I did the real test here, which unbelievably, right, and this is super super unbelievable. 96% of the URL, oh, sorry, 96 out of 96 uh URLs that were returned were 200, right? As in 200 um code. So, they they are real, right? 36 out of 36 URLs returned HTTP 200.

### The REAL Test: 96/96 URLs Returned 200

**3:52** · You guys, I this is crazy. Honestly, for the pricing of this, that is absolutely absurd. You can scrape things using Gina Plus uh Gemini 3.1 light flashlight for so cheap, right? So, it's input output, as you can see here, is 0.25 25 and 150 output with also having some discounts on batch pricing and also on cash.

### Pricing: $0.25 Input / $1.50 Output

**4:22** · So super super interesting the amount of information you can scrape for this price you would be very very surprised and when it has 100% accuracy which I mean through the kind of tests that I did this had 100% accuracy.

### Multimodal: Audio + Video Input

**4:40** · Yeah. So, this model was just released on the 7th of May, the the official version of this model. It also accepts audio, which I didn't know. That's really really interesting to know. So, you can um you can use this to transcribe audio as well, which is super super nice.

**4:56** · Probably with pretty good accuracy and very very quick as well. It looks like you can also input video. I'm not sure about this. I haven't looked into this, but if that's true, that's very very interesting. So this is probably the one of the best models for just general scraping. Now one thing just to note guys is grounding. Okay, grounding is basically using Google search as perplexity does for example and we do a lot of this inside harbor as well. It's probably our main expense to be honest with you. The problem with grounding is it's per query.

### Grounding Warning ($10/day → $150/day)

**5:29** · So just bear this in mind. Okay. If you're using grounding, you need to tell the model to only do one query or two queries because otherwise it'll do 30 queries. And my god, the costs are insane. We went from spending like $10 a day to $150 a day, which luckily I noticed and stopped. But just if you're doing grounding, just be extremely careful, okay? It's probably not worth it. It's probably much better to do just traditional LLM scraping instead of grounding.

**5:59** · However, we do do grounding for certain things because I think it works really well for things like keyword research and things like that. Yeah. So, this is kind of the cost at scale. Let's say you scrape a,000 pages. I don't like the word product here. It shouldn't be here. So, just 1,000 pages. 1,000 pages at 8 bucks with batch API being four bucks is really really good. Um, yeah. I mean, the the price on this is crazy. How cheap intelligence has got is is really really interesting.

### Cost at Scale: 1,000 Pages for $8

### 96/96 URLs + 36/36 Images All Real

**6:29** · Now I just want to return to this quickly. 96 URLs were real here and 36 out of 36 images were also real.

**6:37** · Right? So I just want to reiterate this point because these are not easy links.

**6:43** · So you can see the test here. I did this with Claude code. Uh it basically just said set up um the scraping system um and then test the URLs to see if the URLs that are given back from the LLM were real. Right? This is the actual test that I gave it. This was a really really good test for me personally.

### vs GPT-5 Nano (50% Hallucination) and Gemini 3 Flash (75%)

**7:02** · For context, the likelihood that GPT 5 Nano will hallucinate one of these links is about 50%. Right, which was our old method of doing this. I actually I upgraded to Gemini 3 flash because Gemini uh GBT 5 Nano was just too inconsistent and its hallucination rate was way too high. Even with Gemini Gemini 3 flash, the hallucination rate was about 75%.

**7:28** · So to have a 100% real URLs here is extremely interesting at a very very good price and with a million context. This is probably the best new scraping model on the market.

### Putting Flash Lite Into Harbor

**7:46** · So I'm probably going to go and put this in Harbor now. Although to be honest with you, I don't actually use LLM scraping like this anymore. The way that I do LLM scraping is the basically so if we just go back to this the page URL is fed to Gina right and then the

**8:06** · instead of extracting structured data for images what it does is it like adds like a number next to the link and then I just use code to like extract the link just because I couldn't get what I was trying to get which was 100% accuracy with um what any of the models that I used basically. So I mean to get 100% accuracy with this model which is extremely cheap is really really interesting.

### Why This is a Massive Upgrade

**8:34** · But yeah guys this is definitely a massive upgrade for LLM scraping. Uh you should go and check this out. It's extremely cheap. It's extremely fast and LLM scraping is something that you can basically resell. So what you actually resell is the JSON structured data or in Harbor's case, what we then do is we take that structured data and we write an article, right? So we are selling the articles, but it's the we may as well sell the structured data, right? We're just repackaging the structured data into an article. I really cannot write with a touchpad. I don't know why I even tried.

**9:04** · But yeah, with that with all that being said, guys, let me just quickly talk about our sponsor, which is me, Harbor SEO.AI. I'm trying to make this into the best SEO tool on the market.

### Harbor SEO - 363 Pages, 160K Impressions

**9:15** · It's extremely cost- effective. It only costs 29 uh euros a month, right? And yeah, I'm really really trying to make this an amazing tool. 363 pages published, 160,000 impressions, 1,500 clicks. These are real numbers from real search consoles anonymously gathered to just display on the pricing page basically.

**9:39** · I've recently released agency. I've got the writer into probably the best spot it's ever been in. I mean, we even made eyesuit happy, which I thought was impossible. Um, we managed to actually make consistent content that when they looked at it, they just said this is I mean, they were they were saying they were basically saying they are the most beautiful articles they've ever seen.

**10:01** · So, um, I'm really really happy with Harbor and where it is. So, go and check it out in the description. There's a link in the pin comment and in the description. You can get a free trial.

### Final Thoughts

**10:11** · Go and check it out today. But all that being said, guys, I'm going to go and put this inside Harbor and see what the effect is on cost mainly. Um, but like I was saying before, most of the cost actually comes from the grounding and not from the LLM scraping itself. So, I don't think this is going to cost me or save me that much money, but it might save other people money. And also just generally this is probably the best LLM scraping model on the market now. So shout out to Google for actually giving me something useful and also for you guys this is also a useful model.

**10:43** · With that being said guys thank you so much for watching. If you are watching all the way to the end of the video you're an absolute legend and I'll see you very very soon with some more content. Peace out.