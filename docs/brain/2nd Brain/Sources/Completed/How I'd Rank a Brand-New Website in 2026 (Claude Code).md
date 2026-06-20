---
title: "How I'd Rank a Brand-New Website in 2026 (Claude Code)"
source: "https://www.youtube.com/watch?v=mXqh-cUIft8"
author:
  - "[[Nico | AI Ranking]]"
published: 2026-05-19
created: 2026-05-21
description: "Write Content AI Search Will Love https://clicktrack.nico-510.workers.dev/freeI built and launched a brand new website from scratch and got it ranking in Google, organically in Bing, and cited by th"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=mXqh-cUIft8)

Write Content AI Search Will Love https://clicktrack.nico-510.workers.dev/free  
  
I built and launched a brand new website from scratch and got it ranking in Google, organically in Bing, and cited by the AI search engines, all with one repeatable 5 step framework. To prove it works on anything, I picked a niche I knew nothing about (EV charger installation) and took it from zero research to a fully built, deployed, SEO optimized site using Claude Code and Astro.  
  
This is the exact process I have used to build every site this year. They rank, they get organic traffic, and they get mentioned in AI overviews. Follow along and copy it step by step.  
  
Tutorials Mentioned:  
\- Build A Website with Claude code and astro https://www.youtube.com/watch?v=kHAJtgciFi4&t=315s  
\- Connecting Claude code with DataForSEO https://www.youtube.com/watch?v=h\_MlXprdM0E&t=24s

## Transcript

**0:00** · I have built and launched a bunch of websites this year and and all of them are getting traffic from Google organically from Bing and are getting cited by the AI search engines. If I would have to build and rank a brand new website in 2026, this is the exact framework that I would use because well, I use it and I know it works. Let's get to it. Today's video is all about how I'd rank a brand new website in 2026.

**0:20** · And this is going to be a five-step framework. And for this, I'm going to use a random niche industry that I don't know anything about, which is going to be the EV charging installation industry. If you're brand new to this channel, I need you to listen very, very carefully. At times throughout this video, I'm going to mention other tutorials that I've done in the past.

**0:39** · For example, things like how to install Claude code with data for SEO or how to build entire websites with Claude and Astro, which is a framework that I really like. I'll leave links to those videos below because I don't want to go through the inst all these nitty-gritty installation guides throughout this video. Otherwise, it might be like 12 hours long. I really want to give you the fundamentals for this video. So, if you're missing anything, it'll be in the links of the video description below.

**1:03** · Let's get to it. The first step is keyword research and also just general research. What do I mean by this? Well, I don't know the electric vehicle charging industry. So, I need to kind of inform myself and also Claude code because you don't know what you don't know if that makes sense. So, what I've done and what you can do as well, I've used a deep research from Gemini and I've given it a very very simple prompt.

**1:29** · For example, I want to know what state or country has the highest adoption rate of electric vehicles because then I know well there's probably higher search volume in that. I want to do a lead generation website around EV installations for homes so that I and I want to know where to concentrate first.

**1:45** · Very simple. I did deep research and it gave back a really good report. I would do the same thing also with Chat GBT.

**1:51** · They've got a deep research feature.

**1:53** · This allows you to start getting to know the industry, the keywords that are used before we get to the keyword research and just to inform yourself so you don't miss out on anything that you should and you don't look like a novice when you build the website. So, I'm going to download this uh as a markdown file and then I'm going to download the other document. This is the one that Gemini gave me. So, I've done deep research with the exact same prompt on both. If you're doing a website on a niche that you don't really know in an area that's you don't really know either, I highly recommend this tip. Just make sure that the tool that you use has that deep research functionality.

**2:25** · Perplexity is also great for this. So, I'm going to download this to things right away. Have a quick read of them. And then what I'm going to do is start a brand new project on my desktop. Got a brand new folder and I'm going to name it EV installation. And what I'm going to do is I'm going to open this with Claude Code. I use a specific thing here called CMAX. Now CMAX is just a wrapper for Claude Code. It looks like this. Nothing fancy at all.

**2:53** · Now, one thing I forgot to do here was to place in the research that we just downloaded from um both Gemini and ChatgBT. They're in there.

**3:02** · Fantastic. Okay. If you prefer using the desktop application for Claude Code, you can do this exact same workflow with that. I personally prefer still using Claude from the terminal. I find the app a little bit too buggy for my preference, but if you prefer that, that's okay. The same thing will apply.

**3:19** · I'm going to open up Claude here in this project and I'm going to tell it a little bit about what I want to do. Um, I like to talk with it in a more of a casual manner. I've got a uh transcription tool that I use. I want to build a lead magnet generation website.

**3:38** · It's going to be a rank and rent for the EV installation market. You have some research in this folder about that market. With \[snorts\] that research, I want you to create a plan to do a detailed keyword research analysis and report and come back to me with a couple of main keyword research, including the transactional keywords, which will make up all of the transactional pages andformational keywords, which will make up the content. Have a look at the report and come back to me with a plan before you execute.

**4:04** · The idea here is to ask Claude to get a sense for what we're doing first and then kind of tell me the prompt that'll be best to give it to do the better keyword research. Now, I have installed what's called data for SEO to claude code. If you never heard of data for SEO, they're essentially a provider that gives you well data for SEO, but they've got a wonderful MCP connection.

**4:30** · So you can connect claude code to data for SEO allows you to do real world research because by default claude code doesn't have any real data SEO data.

**4:41** · Okay. So I'm going to um ask it to go on plan mode here. So you can do that by going shift tab. I'm also going to do ultra think. This allows it uh more processing power just on this stage of thinking because we're doing quite a complex somewhat complex project. In the beginning, I wanted to make a plan and I wanted to think as much as it needs to before we go across. And while this might take a little bit longer in the starting point, I feel that it allows to to do less mistakes as we go along.

**5:09** · And here is why I like talking to Claude about this because it depending on the niche and depending on the competition, these things might change. So, it's read both report. It's understand them. It's asking me, well, hang on. Both of these reports disagree, which is a good thing.

**5:25** · you want two different data sets here.

**5:27** · And it's given me a couple of options.

**5:29** · So, I'm going to probably say, look, let's uh let's concentrate uh in Texas with Houston uh Dallas Fort Worth. I'm going to say multi- city in one domain. And uh the final deliverable will be a strategy dog and a CSV only.

**5:53** · Okay. All right. And here's where the research starts getting serious. We've given it a little bit of direction and now it hasn't even touched anything which is what we want. Want I want to really think about this. So decision we locked in. We went with Texas first Houston Dallas for Austin metros one domain multi uh city page promatic SEO.

**6:11** · Yes. And I'll show you the best practices here. It understands the tools that we're going to use transactionalformational content. Um yeah perfect. So I'm going to go yes. and it should take a while to come back with a big report. These first two steps are critical otherwise this whole thing won't work. Building the website that's easy but the research and the structure of the website first is something you want to get right because if you get it wrong you have to take metaphorically 10 step backwards just to take one step forward.

**6:42** · So let's see where this comes back. And of course like I said in the beginning if you want the video on how to connect claude code to data for SEO just make sure you look in the video description below. All right, after a couple of minutes, it's given us a fairly good report. It found a few interesting findings. But let's do the due diligence and actually look at the data that it gave us. So, I'm going to open up our folder. And you should see some research in here. Hang on. Okay.

**7:11** · I've got the MD and I've got the D CSV file. This one's the one that I'm really interested in. I'm going to open up with uh numbers. Okay. Okay, so I've got a couple of keywords here. I've got the search volume, the cost per click, the competition, and the difficulty. Now, the competition and the difficulty, take with a massive grain of salt, whether that's a data from data for SEO, AHFS, SEM Rush, uh, at least for data for SEO, if anything's higher than about, I don't know, 35, then it's quite difficult. But there's some really good ones in here.

**7:44** · Uh there's some charge point chargers and a couple of other things here which are fairly good but it hasn't really thought about the structure here. Uh it has thought about the services. It's got a good understanding there. There's level two charger installation. I don't know what that is but this is exactly why I want to do research on that before right because that came from the research but this looks pretty good. So step one is done the research component.

**8:14** · Step two is mapping the website structure. We've got the research both from a niche perspective or industry and also a keyword research perspective. Now we can map this out and that map that we're going to form is going to be the source of truth really that Claude is going to follow throughout this whole build. So out of anything, this is probably the most important step. So let's get to step number two. There's a couple of things we want it to do.

**8:40** · We wanted to map out the website structure from a perspective that we have the locations and each location has a dedicated area page and then each uh service or installation service has its own individual service page as well. So let's get to that now. I'm going to say I want you to build a CSV with the complete architecture of the website.

**9:05** · I want you to from the keyword research understand how many service pages we need however makes sense to have but each service should be in its individual service page and we should have one parent services page which then will lead to the child individual actual services pages. We then need to build an areas served pages considering the location we want to do.

**9:33** · We're going to go by cities and then we're going to leave space for the suburbs or the areas within those cities served as well. So we can have an individual cities and services in that city page. Let's see what we get. Okay, now we're getting somewhere. So the complete site architecture is in the site architecture CSV and it gives me a little preview of the slug pattern services and it links out to all the nine service pages. We'll take a look at that. Um, oh, it's even created a landing page for the tax credit, which is really good.

**10:03** · Individual services pages, fantastic. Area served, which is exactly what we want. And then the city plus the area served. All right, let's check out the CSV. All the services here, which is EV, Tesla, level two, electric panel, Nema, charger, hardwire, EV installation, EV electrician. We've got the area. So, we've got Houston, Katy, Sugarland, all these areas in Texas, which we want. And then we have the Okay, the individual city page with the service.

**10:36** · Okay, so there's a couple of things that I'm going to add in here because I actually like the structure. It makes a lot of sense and it allow for growth. I want a section for blogs and I want a section for tools cuz tools will be like price cost calculator and things like that.

**10:55** · So, I'm going to go back to Claude and go.

**11:00** · This looks great. All I want to do is add two sections. You need to add a blog section and a tools section cuz we're going to add uh like cost calculators and other tools that might bring us a little bit of traffic. Can you do that and come back to me with a new CSV?

**11:17** · Okay. So, now it's added the blogs, the tools. Let's just double check that here in the new CSV.

**11:25** · And if we take a look at the new one, I've got the service, all areas, go all the way down. I've got tools here. So, blogs, fantastic, and tools.

**11:35** · So, installation guide and all other things that I'm going to add. Perfect.

**11:41** · So, this is what you want it to look like. It really needs to make sense. And this is going to be the source of truth which Claude is going to lock itself to.

**11:52** · We're not going to have any hallucinations because we've done the hard yards. Now we can move on to step number three which is the really fun bit where we get to build this. Now there are many ways that you can build a website with claude code. You can design it somewhere else and bring that design into claude code which is what we're going to do. We're going to use Claude design uh and then we're going to build this with Astro. So, let's start doing that. I'm going to go to Claude in the um in the Chrome. I'm going to go to designed and perfect. I'm going to build a brand new prototype.

**12:24** · I'm going to pick none here. High fidelity. The project name will be EV charger or just EV. I'll press enter. And fantastic. So, I'm actually going to even cheat a little bit more and show you a trick that I do often. I'm going to go to Claude and say, "I want you to give me a prompt that I can give to an AI design tool that will help me build the homepage, the aesthetics of this. It's going to look very modern, very sleek.

**12:52** · Uh, but the design tool is going to do everything for us, but build a prompt that will that I can hand it off and it will design most of the homepage for me." That way you kind of get Claude to tell you what the best instruction is for Claude. You can see here already this is getting quite good. So here's a complete copy and paste prompt. Design a sleek modern conversion focus homepage for a residential EV charger installation lead generation company in Dallas, Texas.

**13:21** · Um, it's giving me a sticky header and all this really good wording that's going to really help us.

**13:31** · Okay, I'm going to copy this entire thing.

**13:34** · Go back to the design and going to paste it in here. It's paste the prompt. Go ahead. You can see it here. Pasted 91 lines. I'm going to send it. If you don't like Claude design, I also recommend Google Stitch, which is a really nice design tool as well. But I'm just going to do everything under the one ecosystem for Claude. Um, so to keep things a little bit nice and easy. While that's getting built, I'm going to actually ask Claude to see what domains are available.

**14:01** · Now, I've done a lot of videos about this, but you can actually connect Cloudflare with Claude Code using something called Wranglers and Workers. And this just allows Claude Code to have a lot of functionality within my Cloudflare account. So, I can build it and I can upload the whole website there. And it's got a lot of functionalities. So, I got to see here which ones are going to be available. A few of the strongest I picked. EV charger Texas.com.

**14:31** · W. If that's available, I'm going to be very lucky, but I don't think so. I'm going to check here. I've got a account with Cloudflare. I'm going to go buy domain and see if this is available. Oh, that's wild. Eevee Charger texas.com.

**14:46** · That's available for 10 bucks. Are you kidding me? Yes, 100%. I'm going to buy that right now. \[laughter\] That was very lucky. Okay, let's purchase that domain right away. Okay, I have purchased the domain name. And now I got to tell uh Claude Code \[laughter\] that hey, we purchased their domain.

**15:04** · Can't believe that was available in 10 bucks. That's insane. Back in Claude Code, I'm going to say uh hey, this is the domain we bought. Um now make sure you rebuild the um website architecture CSV with that. Okay. So now after a little while um back to Claude Code and we've got the first iteration here.

**15:23** · It's even had a little like a strip at the beginning. federal 30 CEV charger tax credit and these are the things that improve the content of the page because you did the research see if we wouldn't have done that initial deep research then it wouldn't have thought to put things like this right so it really does uh make it worthwhile uh quote okay it's all right little animation on hover I like it cool how it

**15:53** · \[snorts\] works perfect okay got a little FAQ section hopefully at the end ask questions. Fantastic. Uh, okay. I want to add a couple of things here. Um, so I'm going to tell it the URL that we now have available. Okay. The name and URL.

**16:11** · Here is And on the homepage, can you please add a embed map of the areas that we service uh right at the bottom after the FAQs?

**16:22** · And while it's doing that, it's going to take a little while. I want you to do one more thing with me. So, I have Claude code connected via skill to Nano Banana Pro, an image generator, and you can also connect it to um GPT image 2, by the way, uh which is not bad. It's it's an incredible image model here. So, you want Claude to be able to generate all these images.

**16:47** · And the one step you need to take before you give it the all go to create all the images is you need to give it access to a brand style. So you want Claude to create an aesthetic including the camera that it's taking the images with the focal length and everything else. So, I like to do this for every project.

**17:12** · And I know the prompt can be nice and simple, something like I want you to create an aesthetic brand guideline for the images that we're going to generate. You have access to generate images with GPT image 2. But what I want is a detailed instruction of the camera use, the focal length, and the look and feel that we can give to you every time you create an image with GPT image 2 on Nanoban Pro. so that the images are consistent. Create the style guide for the images for me, please.

**17:45** · Now, all these prompts I'm probably going to fix and leave for you below better cuz they're a little bit too kind of talkative. And I know that some people prefer a little bit more structure. So, don't worry. I'll leave all the links including the keyword research link, the site architecture link prompt, sorry, this prompt in the video description below uh accessible for free. So, you can just copy and paste as opposed to trying to decipher what on earth I just said. I just prefer this. I like going back and forth with it a little bit more. Is it the best way? I don't know. Probably not.

**18:15** · But, uh, it seems to work for me so far. All right.

**18:18** · It's created the style guide. Um, and I'm just going to test it out. So, it said that it's going to use here the focal length 24 mm. Uh, macro. Okay.

**18:30** · Let's see it now. Okay. So, I have the first image. Cool. Looks pretty spot on.

**18:40** · Now, let's try to place that image in the homepage to make sure that it looks good from the get go. Um, okay. And we're just going to say here, um, chug it in here. Okay, we're nearly here. The first thing we want to get is just this section, right? because then we're going to do something that I haven't tried before but I think will work which is use the goal feature because we've given it enough guides here the look and feel the research.

**19:07** · I'm just going to say great here's the goal finish this entire thing now cuz it's doing everything pretty good. Perfect. Okay. I want to add something a bit fun here. some sort of uh animation where a car gets more full maybe as we scroll down. Okay, whilst it's a little bit silly, I've got a little animation on the left hand side now of a little charger that gets more full as we go down.

**19:34** · I don't know, little things like that really kind of make sure the website doesn't look so AI generated, which this clearly is, but you get the idea. All right, this is looking pretty good. I think I'm happy with that for now. If you are doing this with Claude Design as I have, you can share this and export as a complete zip file. What I'm going to do is export that and then place that into the folder which we're doing the work in.

**20:05** · So this little guy here. All right. So I've dragged that zip folder into the folder that we're doing work in. And I could now at this stage compact the conversation. So you want to make sure that you're keeping an eye when you're working with claude code specifically of the context window. So whilst 22% of the context window use might not seem like much, I don't want to start the website build with that already used. So I'm actually going to start a brand new conversation with it in that folder.

**20:34** · And I'm going to try and use the uh goal mode for it to kind of build the entire thing now. And like we did before, I'm gonna actually get Claude to give me the complete prompt for the goal. Right? So I'm gonna say, create me a complete and very detailed prompt that I can give to Claude with an end goal of now creating

**20:57** · the entire website using the Astro framework and following all the guides that we've set in this folder structure, including the website structure, the keyword research, the image style guides, and everything else. it is to create all of the pages within that Google uh with within that CSV as SEO optimized as possible. Each service page needs the schema, the FAQ, any other information that's relevant to that.

**21:23** · If you need to create images, you can use the GPT image too, but make sure that it's a webp images that gets placed in the website. if you need to do more research on the location to find out what is the average uh EV car sales for example of that area or what's the average breakdown cause of electric vehicles in that area or what's the most popular electronic vehicle in that area.

**21:49** · So we can add that to these pages to make them very niche and the content doesn't duplicate from one page to the other. There must be a difference of at least 50% from one page to the other.

**22:01** · I'm going to hit enter and it should give me a prompt back that I'll use in this new chat. It's got a fresh mind but all the information in it. Okay, here's the entire prompt that it gave me. The mission, the fixed projects.

**22:16** · Okay, now let's go to forward slashgoal and I'm going to type in all the lines and hit enter and let it do its thing. And again, I only feel comfortable giving it that whole goal and telling it to fix it because we did the prior research. We've done the structure. We've done the first build. We're happy with it. So, we've given it so much structure here that it shouldn't just create an absolute dog's breakfast of a website that's Australian for very uh messy by the way.

**22:45** · So, yeah, I'll be interested to see what it comes back with. Interesting to note, apparently the goal that you set can only be 4,000 characters less. I had 19,000. So, a little too many. I'm just going to get it to rewrite it. Um, and see what it comes back with. All right, here's our new version here. Build prompt image style guide. That seemed to have worked. Okay, so it seemed to have finished the website.

**23:13** · Now, I asked it to launch it locally and it gave me a URL for me to preview it. Okay, there is our entire website. Now, let's take a look.

**23:24** · So, if we scroll down. All right. EV charge Texas.

**23:30** · Start my quote. Everything looks all right. Okay. Okay. Okay. Oh, the calculators, everything. Uh, views, FAQs, embedded map. Okay. Let's have a look at this one. Okay. Generated the images for me as well.

**23:48** · Level two EV charger installation, Texas.

**23:52** · Right away. Get a free quote. What's included? How it works? Uh, many Texas homes need panel upgrade before fast charger. It's safe. There's some really specific information about Texas in this information by city related reading. So, I must have done even some blog posts, some FAQs about this. That's that is not too bad at all. Uh, let's go area served here. So if I go to Sugarland, okay, created an image there.

**24:23** · EV charger installation in Sugarland.

**24:26** · Other services in Sugarland. So if I go Tesla wall, Tesla wall in Sugarland.

**24:30** · Wow. Okay, that's pretty good. Not bad at all. Keep exploring. Wow. Okay. Uh, what about tools? I wonder if this works. EV installation calculator cost wall mount.

**24:42** · If I got a hard wire, if I got a space here, estimate my cost. Okay. Well, that's not bad.

**24:48** · uh tax credit. Okay, I probably need to fill that out a little bit more, but \[laughter\] this isn't looking too bad.

**24:54** · I'm surprised to be honest. Um a guide here that definitely needs a little bit more help, but not too bad to start off with. And we have this mega menu that I'm imagining is for the website here for the mobile version. And the mobile works fine. Wow. Step number three has been done. We built our website with clawed code in Astro. Now I'm sure there are some finer details which we can kind of tune up but for now that's okay.

**25:25** · The next step step four ensuring that the content is built for citation. So let's take a look at one of the blog posts that it wrote here. How much does EV charger installation costs in Texas a 2026 guide. So a blog post that's probably very good for us to get really well. And as you can see here it's not really that good. There's a couple of things that it really needs in order for us to ensure that it's going to have the highest possibility to rank in the AI search engines.

**25:52** · If you're looking to learn specifically how to write content that the AI search engines will love, I've done a really indepth detailed tutorial in our free community.

**26:04** · I'll leave that link below. And it also uh includes the prompt and all the instructions on how to write content that's going to get cited by the AI search engines. I'll leave a link to that below. So here I'm just going to do a bit of a quick fix here so that you can understand the at least the minimum requirements that you need. So I'm going to grab the URL here. Go back to Claude code and say perfect. I want you to fix this blog. I'm going to give you the URL and I'm going to say the following.

**26:34** · I want you to do a couple of things here.

**26:38** · This needs to be a little bit longer. I want you to do detailed research on this topic and I want you to find the sources that we can back up our statements with.

**26:47** · And whenever you back up a statement throughout the blog post, you need to link to the source to the contextual keyword note at the end. In addition, I want you to write this blog post 70% of it in a content capsule technique where the H2s or H3s are questions in which you answer those questions as quickly as possible in the paragraph below. And I want you to also add a table or two throughout the blog post. That'll be enough for now.

**27:09** · If you want a a deeper guide, like I said earlier, on how to really write a blog post that's going to get cited by the AI search engines, check out the free tutorial in the link below. But for now, I want to show you the difference between this here now and what just a little bit of prompting will do to this blog post.

**27:28** · Now, I want to make something very, very clear here. Do not chase arbitrary word counts. Yes, I asked it to make it longer, but simply because this context that we're writing about deserves a little bit more length because it's a little more bit more complex. So, let's take a look here. Perfect. So, here this is what I love. How much does an EV charger installation cost in 2026? It answered the question instantly and then gave me the correct source here. So, if I look here, it's going to give me to the high quality source where I got that information from.

**27:59** · That is pivotal to this, right? Got other things here. I actually don't mind this as well. It's got a table even like all this stuff is really really solid. And just those three attributes that we added which is writing in a content capsule technique adding the sources and adding a few tables is going to drastically improve the quality of the blog post if you actually add some value in there but therefore the probability that it's going to get cited by AI search engines.

**28:28** · Okay, that's number four done. Well done for going this far. One more to go and it is the most technical one of everything. You want a bit of a checklist, but you need to check the technicals. Without the technical of SEO done correctly, you're not going to rank in traditional SEO and you're not going to have any chance of ranking in the AI overviews. So, let's check those out nice and quickly. Make sure we did a good job. I'm going to ask Lord here just to send the website to a staging site. Perfect. Can you send this whole thing to a staging site, please? In Cloudflare.

**28:59** · Now, in my system, I've already installed the Cloudflare connection. If this is your first time doing this, there's a bit of a setup here. You need to authenticate Claude Code to use Cloudflare.

**29:12** · Again, I'll leave a video of me going through the entire process of just building a website here. We go through that um the Cloudflare a bit in a second. Okay, we have a staging site now and I want to go and open it up in a browser tab and see. Perfect. Okay, the reason why I want to check it in a staging site is because I want to check a couple of components. Uh, one of which is the meta data. So, I want to make sure I've got the correct H1 structure, which looks good.

**29:42** · There's no reds in here. By the way, this is a free extension called SEO Wallet. You can look you can look it up or I'll leave a link below for it. Uh it's very easy to use. I have here structured data.

**29:55** · Fantastic. I've got an FAQ. I've got an organization schema. Great. Not looking too bad. And lastly, I just want to check how quickly this website is loading. When it comes to generating leads or any website for that matter, but particularly when you're just running a lead generation website, your website has to be very snappy because loading time speed is a good SEO factor and it's a good conversion factor. So, if you get that right, it's two thumbs up, but if you get it wrong, it's also two thumbs down, which is a bit annoying.

**30:26** · But thankfully, this website is very, very quick. It's an Agrade.

**30:31** · It's loading uh quicker than a second, which is very, very good. That's exactly what I want. This one's pretty much ready to go. Now, let's do the tricky, the nitty-gritty. A lot of people don't like doing this, and it might be a little bit boring, but if you really want to get into this stuff, building websites with AI, then you need to know how to do this. So, I'm going to go to Cloudflare and I need to attach this um URL to the staging site here that I've just uploaded before. So, here's the staging preview. Fantastic.

**31:02** · I'm going to go to custom domains. Uh make sure that's right. Yeah, custom staging.

**31:08** · Fantastic. The custom domains. I'm going to set up a custom domain. And because I already have it, Cloudflare should uh recognize that. I'm going to activate their domain. That's going to take a couple of minutes or 48 hours, right?

**31:22** · So, you got to give that a little bit and you got to be a bit patient here.

**31:26** · The final thing we want to do is go to Google Search Console and we want to verify this website in Google Search Console. Thankfully, because we're on Cloudflare, this is very, very easy. So, we go to add a property. I'm going to add an entire domain. I'm going to press in the evchargeex.com, which is the domain that we just purchased. I'm going to go to continue and it's going to analyze that uh website and it's going to understand that it's in Cloudflare. If if I start verification because I'm already logged into Cloudflare, it'll do it almost instantly. I'll go to authorize.

**31:55** · It'll take one or two minutes and it should take me back here and tell me that it's verified. If you've done everything correct, you should see this message here going ownership verified. I'm going to go to property. Fantastic. And I've got here evchargesex.com.

**32:12** · Last thing I want to do is make sure that I upload the site map. But for that to happen, I need the website to load in Cloudflare. So I might leave it there for now. Now you might be wondering, well, what about the email submission form and things like that? This will depend drastically on what kind of CMS you want to use in the back. If you want to use resend, if you want to embed some sort of form from your go high level, whatever that is, it's very easy to do there.

**32:37** · If you are looking for the whole tutorial in terms of what I was doing, make sure you watch the video that I'll leave in the link in the video description below and that walks you through how to install the resend integration here. So you get the emails or you send the emails any way you want.

**32:53** · And that's it. We've successfully researched, structured, built and deployed a website. And that is the same process practically that I've followed to build all the websites this year.

**33:05** · They all rank. They all get organic traffic. They all get mentioned in the AI overviews. Particularly if you're writing good content and you get the fundamentals of SEO done correctly. Like I said previously, if you want access to learn how to write content correctly with a with AI, make sure you check out our free tutorial. I'll leave a link in the video description below. Again, thanks for watching. I'll catch you in the next one. Cheers.