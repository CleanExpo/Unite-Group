---
title: "Mythos unleashed on Opensource"
source: "https://www.youtube.com/watch?v=zaGOKd4jqEk"
author:
  - "[[The PrimeTime]]"
published: 2026-05-13
created: 2026-05-14
description: "ssh terminal.shop Yes, seriously, this is my company, and we selected and found some of the worlds best coffee.  US only (for now (the world is hard when you don't do crappy influencer coffee))Sour"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=zaGOKd4jqEk)

ssh terminal.shop  
Yes, seriously, this is my company, and we selected and found some of the worlds best coffee. US only (for now (the world is hard when you don't do crappy influencer coffee))  
  
Sources:  
  
\- https://daniel.haxx.se/blog/2026/05/11/mythos-finds-a-curl-vulnerability/  
\- https://blog.mozilla.org/en/privacy-security/ai-security-zero-day-vulnerabilities/  
\- https://daniel.haxx.se/blog/2026/04/22/high-quality-chaos/  
\- https://daniel.haxx.se/blog/2026/01/26/the-end-of-the-curl-bug-bounty/  
\- https://daniel.haxx.se/blog/2024/01/02/the-i-in-llm-stands-for-intelligence/  
\- https://www.justsecurity.org/138011/too-dangerous-anthropic-mythos/  
  
https://twitch.tv/ThePrimeagen - I Stream on Twitch  
  
https://twitter.com/terminaldotshop - Want to order coffee over SSH?  
ssh terminal.shop  
Become Backend Dev: https://boot.dev/prime  
(plus i make courses for them)  
  
This is also the best way to support me is to support yourself becoming a better backend engineer.  
  
Great News? Want me to research and create video????: https://www.reddit.com/r/ThePrimeagen  
  
#theprimeagen #programming #computerscience #ai #chatgippty #terminaldotshop

## Transcript

**0:00** · Over the last couple months, you've probably seen headlines that look something like this mythos. It's entirely too dangerous. And even just last month, Mosilla posted this blog post that said, "The zero days are numbered." And more so, they even write, "Defenders finally have a chance to win decisively." Very, very funny. First off, you can't say a chance to, which means that you it's not guaranteed. And then use a word that means, "Hey, it's guaranteed." No, like really like look at this.

**0:30** · Often without wavering or doubt like this. This is \[laughter\] it. You might win decisively. What are you doing, Mo? This is just silly. That means for the last little bit, it's been kind of difficult to figure out what the heck is actually going on. Is Mythos really the thing that's going to end all and be all of security, or is it actually going to be just another model release? Yeah, things get slightly better, but nothing that's just going to blow your socks off.

**0:56** · Just looking at the marketing, it's probably going to be the greatest thing that has ever existed ever. Just saying. Going out on a hunch here. But today, an amazing article comes out called a mythos finds a curl vulnerability. Daniel Stenberg is probably best known for the library curl. You've probably used it several several times, and if not, your AI agent is pounding it away, but also he is known for this article. The I in LLM stands for intelligence where he kind of bemons the state of security.

**1:23** · This is what's going on. is security projects are being inundated with really slop level PRs and security bugs that are just absolutely denying the attention of maintainers. We called a denial of attention attack kind of unique and he was one of the first people to really write strongly against this saying how just annoying and just awful this AI revolution has been. This of course was on January 2nd, 2024.

**1:48** · Fast forward about 2 years later on January 26, 2026 and Curl finally says, "You know what? our paid for bug pounty program. It just has to go away. Honestly, the level of slop is just absolutely distracting and we can get nothing done. And then of course, three months later, April 22nd, 2026, which uh is only one day after the defenders have a chance to win decisively, Daniel writes this article.

**2:16** · High quality chaos. No more AI slop.

**2:19** · Meaning that the actual PRs and things have gone up significantly in quality and he can now finally rely on these AI assisted security reports. And this has largely been a lot of people's experience. Like if you were any sort of serious programmer, 2024 AI was effectively useless. There were a few cases where it's actually pretty sweet, but besides for that, it was largely ineffective. Now, today, there's actually some use cases, and it actually is pretty dang good at finding security.

**2:49** · I've heard from many, many, many of security researchers that are actively employed at small to large companies saying, "Hey, this thing's actually gone from completely useless to very useful."

**3:00** · And now to this Mythos finds a curl vulnerability. I am very excited about the article being written right here about Mythos and curl because this is going to be somebody who's gone through all the proper cycles recognizing when AI first came on the scene that it had a huge amount of gaps and it's largely not that useful. And now today it's improved and there's actually like some good utility that can be drawn from it. And since curl is approximately 178,000 lines of C, I mean Mythos must have a heyday in it.

**3:30** · Well, I've read the article and I have a lot to yap about.

**3:35** · We got I mean this is there's some juice in here, people. But of course, before we get started, the bag. Hey, is that HTTP? Get that out of here. That's not how we order coffee. We order coffee via ssh terminal.shop. Yeah. You want a real experience? You want real coffee? You want awesome subscriptions so you never have to remember again? Oh, you want exclusive blends with exclusive coffee and exclusive content? Then check out Cron. You don't know what SSH is?

**4:04** · Well, maybe the coffee is not for you.

**4:15** · All right. So, Mythos finds a curl vulnerability. Yes, a singular one. That might be a little disappointing to some of you. I think right away your hearts probably dropped a little bit. Back in April 2026, Anthropic caused a lot of media noise when they concluded that their new AI model, Mythos, is too dangerously good at finding security flaws in source code.

**4:35** · Apparently, Mythos was so good at this that Anthropic would not release this model to the public yet, but instead trickle it out to a select few companies for a while to allow a few good ones to get a head start and fix most of the pressing problems first before the general populace would get their hands on it. By the way, I do agree with Daniel's little question mark here. I'm not really sure why just a few people, you know, like the few good ones.

**5:02** · Like, I don't know what that says about a lot of these companies. a lot of companies just out there just completely vulnerable because Anthropic won't share. Okay, kind of. I mean, cool, I guess. So, as part of Project Glasswing, which is anthropics reach out with Mythos saying, "Hey, these certain companies and these certain open source projects get early access." So, as part of the glasswing outreach, Curl was contacted and Daniel had the offer, hey, would you like to use Mythos to go through your curl library? Of course, he was excited about it, but then uh you know, some weeks went by and nobody reached out again.

**5:34** · And then eventually someone reached out and just said, "Hey, we're not going to give it to you, but we will analyze curl for you. Do you want us to do that?" To me, the distinction isn't that important. It's not that I would have a lot of time to explore lots of different prompts and doing deep dive adventures.

**5:49** · Anyways, getting the tool to generate the first proper scan and analysis would be great. Whoever did it, I happily accepted this offer. Honestly, kind of the best of both worlds, right? You got the person that's been using this model a whole bunch to be able to go and do the scan for you on your codebase. You don't have to do a bunch of the learning. You don't have to set up a bunch of harnesses. Ideally, they probably have things that are more advanced than say I would have to begin with. Right before we kind of proceed, there's a little bit of a backstory you have to understand about Curl. Curl's been around for a very, very long time.

**6:20** · And so, they have a fairly extensive suite of tests. They also just have a whole bunch of other tools that they run. And this is kind of this screenshot that Daniel provides which means that they have code style. They have band functions. There's certain functions in C which you can just shoot your foot a lot easier than others. I'm thinking of stir copy versus stir end copy.

**6:38** · Obviously human review bot reviews no binary blobs no get force push a bunch of other stuff in here that's actually pretty important. And putting that all together it has led curl down a route in which has had very few vulnerabilities kind of disclosed. And when I say few, I mean they've had a couple hundred CVEes total.

**6:56** · So you can imagine that on May 6th, 2026, when they received the Mythos report, they were probably pretty excited because what are the chances that 176,000 lines of C code doesn't have quite a few bugs lurking around in it. They've had 573 separate individuals commit to CURL over its lifetime, which means that it's not even just one person's thought process, but just a huge amount of people that have committed over a long period of time.

**7:23** · All right, so we're almost done with this story and then we'll get to the yapping. The report concluded it found five confirmed security vulnerabilities. Now, this is a pretty classic AISM.

**7:32** · Whenever AI has confidence, it's going to tell you like there's there's something amazingly magical about the fact that even if something is wrong, the AI is so dang confident in being incorrect. It's honestly a skill I could learn a lot from. So, after a couple hours of investigation, this is what Daniel says. We had trimmed the list down and were left with one confirmed vulnerability. The other four were three false positives and the fourth we deemed just a bug.

**7:58** · The single confirmed vulnerability is going to end up as a severity low CVE planned to get published in sync with our pending next curl release in 8.21.0 in late June. The flaw is not going to make anyone gasp for breath. So in other words, it's nothing that's like super important important enough for them to do some sort of outofband release.

**8:19** · They're just like, "Hey, next time we release, hey, sometime in the future, don't even worry about it. That's how much we're concerned about it. So at some point we will go out and we will we will fix it in public. No one rush in.

**8:30** · Hey, no need to rush in. A side effect of the Mythos report is that it found about 20 bugs that were described nicely with very low false positive rates. And so that actually is something that just generally was a pretty good deal for Daniel. Curl is certainly getting better thanks to this report, but counted by the volume of issues found all the previous AI tools we have used have resulted in larger bug fix amounts. Now this is where things kind of get funny.

**8:54** · The reality is is that curl has been using AI now to kind of do a lot of analysis on its code and it's able to find more and more bugs. Even though in the beginning Daniel was very very very hesitant about AI, they have since changed their tune as AI has improved and since then they've been able to find a large amount of bugs which means that when mythos ran it actually found very few bugs. Now I want you to think about that for a second. What does that mean to you? Before I give my conclusion, let's read Daniel's conclusion first.

**9:24** · My personal conclusion can however not end up with anything else than that the big hype around this model so far was primarily marketing. I see no evidence that this setup finds issues to any particular higher or more advanced degree than other tools have done before Mythos. Maybe this model is a little bit better. But even if it is, it is not better to a degree that seems to make a significant dent in code analyzing. Any prefaces with the following?

**9:52** · This is just one source code repository and maybe it is much better on other things.

**9:59** · I can only tell and comment on what it found here. all the AI tools that they have already been testing out. All the security researchers that have helped make CURL a better product. All the stuff that came before it effectively did most of the cleaning to where when mythos was unleashed on this product, there wasn't the same kind of like just, you know, headline making outcome.

**10:22** · Instead, it's just like, oh yeah, that was a bug. Oh yeah, it's not like all that severe. Yeah, they they they found some extra additional stuff. And he further concludes with this. These were absolutely not the last bugs to find or report. Just while I was writing the drafts for this blog post, we have received more reports from security researchers about suspected problems.

**10:42** · The AI tools will improve further and researchers can find new and different ways to prompt the existing AIS to make them find more. We have not reached the end of this yet. In other words, even after Mythos, there's still just people maybe empowered with security tools or not finding more vulnerabilities. So, is this the end? Can we definitively say the zero days are numbered? Defenders finally have a chance to win decisively?

**11:10** · No. I don't think we can say those things. Do I think that the field of security is going to be complicated?

**11:16** · Sure. It's going to be pretty dang complicated. And I think as these tools get more and more advanced and we're able to run faster, not only does it allow the defenders to, you know, effectively have a better castle, if you will, it also allows the offenders to come at it in a much more aggressive way. So, is this the end? No. Are we going to are we like spiraling towards a security doomsday situation? No, I don't think we are.

**11:39** · And for me, this is kind of the cold water that needed to be poured on the hype because it's really difficult to understand because it's one thing that if someone there's all these Twitter users like, "Oh my gosh, because you may you probably remember this back in the day when Jippy 35 came out and so many people are like, dude, your jobs are over software engineers. Jippy 35 is amazing." And you use it and you're like, "Dude, what the hell are you even talking about?" Like, yeah, that's cool, but what? And so the nice part is that because I could use it, I could actually see the effects.

**12:09** · But with Mythos, it's kind of like the monster you don't get to see. They're like, "Dude, just trust me, bro. What's behind that door is insane. It's so insane." And then you got Mozilla like, "Dude, defenders have a chance at winning definitively." Like, those are crazy claims. Those are claims that just feel pretty outlandish. I have a particularly hard time believing any of it. So, when I read this stuff, I just realize like, yeah, okay, sure, it could very well be better. And I assume it's better. It's significantly larger, right?

**12:38** · It's all the latest and greatest stuff, and it's a harness that's been designed to do security stuff. So, one would hope that it's actually pretty good, but it's not something incredibly special, something that has never been seen before. It's just an iteration on the things we already have. And yeah, maybe the harness is a bit better. maybe how they have the thing set up can go a little bit longer, a little bit deeper with all the different projects.

**13:01** · Therefore, you'll get better results, but it's not something that's completely out of reach of other tools. I love that conclusion because it a it goes in the face of Mozilla's just ridiculous uh statement of the zero days are numbered.

**13:13** · Like, that is an absurd statement to make. Like, there's there's just no more security problems. You don't even have to worry about security problems when you got Mythos, baby. like like what what are we doing here?

**13:26** · Mozzilla. Absolutely absurd. But more so, it just shows that there's still a lot of human ingenuity and creativity that is needed to be able to control and drive these things to be able to find new bugs. It's not just simply like, hey, just fire and forget. it still requires people to be actively in the loop because even Mythos reported five critical vulnerabilities and it ended with one actual vulnerability. So again, I feel like I've been saying this a whole lot lately.

**13:55** · There is still so much room for expertise in our field and I just feel that more than ever because everybody can move so fast now, but people don't actually know what they're doing. It's not like the intelligence of the average intelligence of a person has risen. No, just the more you offload has risen, that is it. So, yeah, mythos is probably better. I just assume it's better. But by the degree that it's so dangerous they can't even release in public, probably not. Honestly, probably not.

**14:24** · Open AAI has this kind of behind a identification wall that you can get access to a more security focused model. You could probably get a lot of the same things that you can go get with Mythos right now from it. So, yeah, it's probably just a small addition better.

**14:39** · But I will say I am a little tired of this marketing like this. The the non-stop marketing towards developers is ridiculous because I mean let's just face it. We're kind of the cash cow of these models. Like the people the people keeping afloat these models are all of us token users. I mean that should be pretty obvious because Jensen over here says he'd be deeply alarmed if his $500,000 a year engineer is not spending a minimum of $250,000 on tokens a year. Hon, our world could be so much better if Sam and Daario weren't competing for who's going to be the first trillionaire with AI.

**15:10** · Like that's just what we're saying that we are the pawns in the situation and they're just trying to compete with it. And of course, that's why you see these absurd tweets. That's why two years ago, never forget hashtag Sam tweeted a picture of the Death Star saying, "Hey, we have a big announcement tomorrow. Death Star \[laughter\] AGI achieved." And now look at us.

**15:32** · That's two years later. It's still the same crap going on. We're still seeing the same headlines. We're the target market, people. I just wanted to say all these things. I wanted to read this article because I honestly thought Daniel brought some really great perspective, which was, hey, these tools are really fantastic. They've helped us close several several several bugs and actually even also closed out a bunch of CVEes. We've really liked it. It's gone from the I in LLM stands for intelligence to, hey, this crap sucks to, oh, hey, actually, no, it's starting to get pretty dang good. all over the course of 2 years.

**16:02** · That's all I got for you. Hey, this is a good article, Daniel. I really liked it.