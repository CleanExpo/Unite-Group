---
title: "FFmpeg vs Google: Twitter drama explained by FFmpeg developer (who runs the FFmpeg X account)"
source: "https://www.youtube.com/watch?v=YUvEAScrfQA"
author:
  - "[[Lex Clips]]"
channel: "Lex Clips"
published: 2026-05-09
created: 2026-05-13
description: "Lex Fridman Podcast full episode: https://www.youtube.com/watch?v=nepKKz-MzFMThank you for listening ❤ Check out our sponsors: https://lexfridman.com/sponsors/cv9816-sbSee below for guest bio, links"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=YUvEAScrfQA)

Lex Fridman Podcast full episode: https://www.youtube.com/watch?v=nepKKz-MzFM  
Thank you for listening ❤ Check out our sponsors: https://lexfridman.com/sponsors/cv9816-sb  
See below for guest bio, links, and to give feedback, submit questions, contact Lex, etc.  
  
\*GUEST BIO:\*  
Jean-Baptiste Kempf is lead developer of VLC and president of VideoLAN. Kieran Kunhya is a longtime FFmpeg contributor, codec engineer, and the person behind the now-infamous FFmpeg account on X.  
  
\*CONTACT LEX:\*  
\*Feedback\* - give feedback to Lex: https://lexfridman.com/survey  
\*AMA\* - submit questions, videos or call-in: https://lexfridman.com/ama  
\*Hiring\* - join our team: https://lexfridman.com/hiring  
\*Other\* - other ways to get in touch: https://lexfridman.com/contact  
  
\*EPISODE LINKS:\*  
FFmpeg on X: https://x.com/FFmpeg  
FFmpeg: https://ffmpeg.org/  
VideoLAN (VLC): https://www.videolan.org/  
VideoLAN on X: https://x.com/videolan  
Jean-Baptiste's Website: https://jbkempf.com/  
Jean-Baptiste's LinkedIn: https://www.linkedin.com/in/jbkempf/  
Jean-Baptiste's GitHub: https://github.com/jbkempf  
Kieran's X: https://x.com/kierank\_  
Kieran's LinkedIn: https://bit.ly/3OORhmC  
Kieran's GitHub: https://github.com/kierank  
  
\*SPONSORS:\*  
To support this podcast, check out our sponsors & get discounts:  
\*Larridin:\* Measure AI adoption in your business.  
Go to https://lexfridman.com/s/larridin-cv9816-sb  
\*Blitzy:\* AI agent for large enterprise codebases.  
Go to https://lexfridman.com/s/blitzy-cv9816-sb  
\*BetterHelp:\* Online therapy and counseling.  
Go to https://lexfridman.com/s/betterhelp-cv9816-sb  
\*Fin:\* AI agent for customer service.  
Go to https://lexfridman.com/s/fin-cv9816-sb  
\*LMNT:\* Zero-sugar electrolyte drink mix.  
Go to https://lexfridman.com/s/lmnt-cv9816-sb  
\*Perplexity:\* AI-powered answer engine.  
Go to https://lexfridman.com/s/perplexity-cv9816-sb  
  
\*PODCAST LINKS:\*  
\- Podcast Website: https://lexfridman.com/podcast  
\- Apple Podcasts: https://apple.co/2lwqZIr  
\- Spotify: https://spoti.fi/2nEwCF8  
\- RSS: https://lexfridman.com/feed/podcast/  
\- Podcast Playlist: https://www.youtube.com/playlist?list=PLrAXtmErZgOdP\_8GztsuKi9nrraNbKKp4  
\- Clips Channel: https://www.youtube.com/lexclips  
  
\*SOCIAL LINKS:\*  
\- X: https://x.com/lexfridman  
\- Instagram: https://instagram.com/lexfridman  
\- TikTok: https://tiktok.com/@lexfridman  
\- LinkedIn: https://linkedin.com/in/lexfridman  
\- Facebook: https://facebook.com/lexfridman  
\- Patreon: https://patreon.com/lexfridman  
\- Telegram: https://t.me/lexfridman  
\- Reddit: https://reddit.com/r/lexfridman

## Transcript

**0:02** · Let me talk a little bit more about the open source movement, about the fact that, as you say over and over and over and over, FFmpeg uh is uh and many open source projects are built by volunteers. So, uh there's a bit of drama recently uh Karen on the interwebs, on Twitter.

**0:22** · Uh you have a spicy style on Twitter that I think articulates and celebrates all the incredible developers and uh development in the uh the code, especially assembly, that's involved in uh building some of these codecs and building some of this incredible technology. But, that brings us to the a bit of a debacle that happened. Tell me the full saga of what happened with the Google security engineers. Just to be clear, Google are one of the biggest supporters of open source out there. They have been for a long time. It's just I think some things kind of went a bit overboard this time.

**0:57** · So, FFmpeg itself, and this is not like a secret, it's on the homepage you know of the it processes untrusted data. There can be security issues when you parse untrusted data, that's very normal. But, recently what changed was Google started using AI to create security reports on an open source project, FFmpeg.

**1:16** · Volunteers had to deal with that. They did they provided very limited funding, and they even went to the media first announcing how good their AI was before the issues could be fixed. And this is in a public forum. Yeah.

**1:30** · So, report reporting an issue using AI to find an issue in the code, which is a security vulnerability, and then reporting that publicly before you're able to fix it. Yeah. It's announcing how good their AI is. That they provided a standard 90-day industry deadline. Um without poten- without really understanding the nature of volunteer-driven development. In addition, this vulnerability was on an obscure 1990s game codec.

**1:56** · Um the way and for let's look at it from their standpoint to begin with. Let let's um you know Yeah, can you still me on there, Casey?

**2:04** · Yeah, sure. They have substantial resources working on the security of open-source projects that you know are ubiquitous and they've used you know a lot of compute to do that and very expensive and very capable security researchers um to do that and that that's their viewpoint is they are contributing by doing that. But I think that's where opinions differ. Um It it it opened up a lot of interesting fissures uh I would say.

**2:30** · Um It does seem that there's a portion of the security community that um look at themselves a bit like building architects that never have to go to site, you know, going to site is something that is a little bit beneath them, the actual day-to-day construction. They're there to do their security things and it's someone else's problem.

**2:51** · \[sighs and gasps\] The security industry also kind of has a very aggressive tone towards things that the language they use is extremely aggressive. They use very strong language like you will get popped. Um so and to to Joe public get popped you know, it means something quite bad. Um for them it means to get hacked.

**3:09** · The way I would look at it personally is a little bit like the padlock on your home. Um Not everyone that a padlock on your home or you know, the lock on your home is there to to protect against the capabilities of of what it's there to protect. It's not there to protect nuclear secrets. It's not there to protect Fort Knox and it could be looked at that they're using AI at a level of scale to go and pick those locks and then say, "Hey, your lock's your lock's not secure. You need to deal with this."

**3:40** · Whereas actually they're the ones with resources to be able to to fix this. But that seems to be not be something either they'll contribute to in terms of patches or in terms of financially. And if the scale of AI is kind of the issue that the the bug reports are very wordy. They're very very that's almost a denial of service by AI generated bug reports on very niche codecs. Um And the other issue the security community has is everything is marked high priority.

**4:09** · You're going to you know, this is the most important thing in the world and you need to deal with this high high high vulnerable scary scary scary on a game codec used on one disk in 1993. Yeah. And that that's where the dichotomy lies. Going around telling everyone that their padlocks not safe. Well, that's a hobby project of somebody. The the safety of that codec is consummate to what that person thinks.

**4:35** · It's their hobby. It's good that they're security analyzing it, but it doesn't need a big scary warning. This is a critical vulnerability. Um May also may may recently also um see that um there was another quote-unquote vulnerability. It wasn't at Google in this case, but um a filter could overflow have an integer overflow and one of your pixels could be the wrong color. And this was marked high 7.5 severity in red.

**5:02** · \[sighs\] And at some point the security industry needs to realize you can't keep crying wolf like this because this just leads to people you know, the equivalent thereof of putting password stickers on their PC. You know, you can't just keep crying wolf every day and and I appreciate you know, that's their modus operandi is to create as much scared and fear, but from the Google standpoint at the end of the day they need to contribute either financially or with patches. Google uses FFmpeg at a scale you probably you or I couldn't even contemplate.

**5:36** · Millions of CPU cores. And yes, they contribute in areas mostly regarding their own products. So VP9, AV1. But in a wider sense there's a disproportionate level of contribution. Yes, they fund students. Yes, they fund Summer of Code. And I think so Alex Strange is a former FFmpeg developer I think posting in a personal capacity. So he posted about security engineers on Hacker News.

**6:06** · His post reads, "The problem with security reports in general is security people are rampant self-promoters." In parentheses, "Linus once called them something worse." "Imagine your humble volunteer open source developer.

**6:21** · If a security researcher finds a bug in your code, they're going to make up a cute name for it, start a website with a logo, Google is going to give them a million-dollar bounty, they're going to go to Def Con and get a prize and I assume go to some kind of secret security people orgy where everyone is dressed like they're in the Matrix.

**6:45** · Nobody's going to do any of this for you when you fix it." \[laughter\] They're basically commenting on the sort of the incentives for the different people involved and misaligned. The problem here is is the disproportion of means on discovery compared to patching it, right? And this is the biggest issue, right?

**7:10** · And after that debacle, Google did some changes.

**7:13** · to send patches, which is And they also now have rewards tools for fixing issues. So it has changed a bit because of that debacle. So it's good, right? But we've seen and we talk about Google, but we have seen like some some other large companies saying, "Oh, you need to fix this bug because it's critical in our product."

**7:31** · Can you explain the XZ fiasco? The FFmpeg tweet reads, \[sighs and gasps\] "The XZ fiasco has shown how a dependence on unpaid volunteers can cause major problems. Trillion-dollar corporations expect free and urgent support from volunteers. Microsoft Microsoft Teams posted on a bug tracker for the volunteers that their issue is high priority.

**8:00** · After politely requesting a support contract from Microsoft for long-term maintenance, they offered a one-time payment of a few thousand dollars instead. This is unacceptable. We didn't make it up. This is what Microsoft Teams actually did. And then they uh you give the image and the details and all that kind of stuff, showing that these trillion-dollar companies are not giving much money, not giving much support.

**8:22** · They think they think an open source project is a traditional vendor that they have an SLA. They think a public bug tracker is actually you know, a a third-party vendor's Jira where you can do all of these things. It It's not. It's there to report bugs. I think the thing that made this particularly heinous was the name-dropping of Microsoft, the name-dropping that this is a visible product.

**8:44** · If this was if this was a just a general bug report, I think that would have made it a lot better. Yeah, so they literally said like this is a big deal because a lot of people are using it in Microsoft. I wonder what happens psychologically.

**8:58** · So, I don't know what happens in these companies, maybe you can correct me, is they You're You're right. They just think of FFmpeg as like a vendor that Microsoft surely is paying a huge amount of money to. They kind of assume that in their interaction and nobody anywhere on the stack is going like, "Wait a minute.

**9:20** · Shouldn't we be giving like millions of dollars to FFmpeg?"

**9:23** · And this is a very big problem in large like we're talking about some companies, but it's the same everywhere, right? Um a lot of those companies like the the when we talked to that person, right? He was just like a manager on one project in Microsoft Teams, right? He had like never really discussed with open source community. He had no idea, right? It was like and but the problem is that usually there is what we call OSPO's, right?

**9:48** · Open Source Program Offices in those type of companies and they are the ones who are supposed to discuss with open source vendors or open source communities, but like they often don't explain that correctly internally, right? And here is just like we are not your supplier. If you want me to be your supplier, I'm very happy, right? I will send you a contract and SLAs. Like I I created a five companies who are doing that around open source projects, so that's okay.

**10:16** · We should say that some some of the spicy tweets that carried you behind and some of the debacle produced results, positive results. Donations have increased substantially. They're still not enough to cover even a single full-time developer, but on both a you know, awareness level and a technical level there's substantially more technical awareness and sort of awareness of the importance of FFmpeg as a result as a result of X and what's happened.

**10:48** · I can say, you know, it it serves its purpose. People realize the level of importance FFmpeg has. And on VideoLAN, it's the same, right? Like for example, a very simple example, for more than a year, we couldn't update VLC on Android because of a bug on the Play Store on Android Play Store, right?

**11:08** · The only way we got someone to answer was to put an very spicy, as you say, tweet saying that we were going to stop distributing VLC for Android, right? And we have around 100 million people using that.

**11:24** · And now then someone from Android actually came and discussed to us, right?

**11:30** · We had the same issue with with Microsoft like saying that we were going to stop distributing VLC on the Windows store. And unfortunately, we are so small that the only very strong power we have to solve those issues is blaming on social network because it's no balls and now they listen to us.

**11:51** · But so is large companies often have difficulty talking to us. Like for example, VLC, right? Is probably one of the top 10 software used on Windows.

**12:02** · I am not part of Microsoft ISV programs, right? I don't have a point of contact at Microsoft, right? Well, I'm sure any other software, Adobe, Spotify has a point of contact. I don't have that, right? So, raising awareness works. It's sometimes very spicy, lot of drama. Well, X and Twitter are okay for that, but it's efficient. Uh so, everybody listening to this should go uh follow FFmpeg on Twitter on X. Follow VideoLAN on Twitter on X.

**12:39** · Uh go donate. Donate to FFmpeg.

**12:43** · Uh thank you, Lex. Over the years, several years, you've been a supporter of, you know, FFmpeg and VideoLAN on X, you know, just giving us shout-outs, appreciating, you know, what we do. FFmpeg for life. And for example, like um Tim Sweeney, Carmack, and a few others like very high-level people have raised also the awareness on on our X accounts and that helped a lot also. Capybara the Capybara, yes, the Capybara is on here. Yeah, I mean, also, you know, outside of the fact that so many people use it, it's so impactful on the world.

**13:14** · It's also a great representation of a great open-source project. Like the value of assembly and C and making sure that like you take programming seriously for real-world systems. It's not just that we we'll talk about assembly later, I'm sure, cuz that's its whole topic in itself, but it's also celebrating people like Andreas Reinhardt who do maintenance it's I believe unpaid as I believe as a volunteer. He's doing massive refactorings. Uh Andreas Reinhardt and Anton Kern of rewriting FFmpeg.c with threading.

**13:47** · Celebrating those guys, celebrating the untold labor that's gone into this that actually doesn't change anything from the user standpoint. The files are exactly the same, but wow, the the the airplane has been rebuilt whilst it's in the air. Christian Garcia said as a teenager running this account, referring to the FFmpeg account, and you responded, "Teenagers have written more assembly in FFmpeg than Google engineers."

**14:12** · But also just pointing out that there's a lot of incredible contributors who are teenagers. Like JB said, we don't care who you are, where you're from, what you do. Teenagers have written thousands of lines of assembly um over the years. Give a shout-out back in the days to Daniel Kang. So also highlighting the work of people like Ruikai Peng. This is a 16-year-old some of his first contributions to FFmpeg.

**14:38** · Actually doing and putting some of these quote-unquote security researchers to shame by by actually finding issues and fixing them and being 16. There's no barriers. There's no barriers to you have to study on at college under this person and understand these. It's if you can learn C, and let's be honest that you it's from it's from the K&amp;R book. Learn C. Uh you can learn assembly, we'll talk about that maybe a bit later.

**15:01** · You can contribute to world-class technologies. In VLC, um one of the oldest contributors is called Felix.

**15:09** · He's the one doing everything on Mac and iOS. He starting working on VLC, he was 16. Um we had a guy called Edward Wong who used to be a Google Summer of Code student who stayed for 3 years around VideoLan. He was 14, right? Um and and part of Google Summer of Code and Google Code-in, which were programs where uh basically we have students or high school um we wrote a ton of assembly for x264 and for VLC and for FFmpeg, right? So, everyone can contribute.

**15:38** · And he also did a good job because he didn't play the alarmists um CVE heights, create a CVE, which is like a public exposure of security and but do these big scary red 7.5 high priority. He just fixed an issue in Git off the 3 days and just fixed it. He didn't need to go and play a big security drama about it.

**15:59** · And I think I posted, you know, the kids are all right, whereas \[laughter\] there's there's there's there's you know, there is a I'm not saying all security people do this, but there is a portion of the security community, as Alex said, that likes to hype themselves up by creating drama. They would have happily raised this is a high priority CVE 8.0 or whatever on a on an issue that actually was in Git. It wasn't even in a release. It was in development and 3 days later was fixed.

**16:25** · Well, I just want to put a little bit of love out there even to the bigger community.

**16:31** · Um much love and respect to Google engineers. Like you said, they're uh uh some of the the the best software engineers in the world and they do contribute a lot even on the security front. And also, you know, I'm a big fan of Theo. Much love to Theo. He was part of this uh debacle and drama a little bit. I think when you just zoom out on the grand arc of human history, the drama contributed positively to everybody involved. Donations went up.

**17:00** · It brought more attention to the topic.

**17:02** · Allowed uh everybody to bicker in a way that ultimately uh got them to figure out what FFmpeg is all about. So, the way the way we looked at this is like it's a rap battle at the end of the day. You know, no, but it it is we say stuff we say stuff. Yeah. But we can we can leave it on the X. X is a perfect place for, you know, international rap battle. You say stuff. I say stuff about your mama, but it doesn't mean, you know, I'm going to have an actual personal issue with her.

**17:26** · Yeah.

**17:26** · And that's what it looks like. The the Theo situation, you know, JB can maybe expand went a little bit too far and there was a little bit You know, it it's just a bit of fun. It's just a bit of rap battle. It's a bit it's WWE. You know, everyone's having a bit of fun on X. It it doesn't need to be taken seriously.

**17:43** · You know, the the teenagers thing, you know, that So that that guy was a Google employee saying, "Hey, you know, there are other ways to run an open source business." Going to go and I was like, "Come on, man. Just have a bit of fun, you know." That's what the point of this account is. And and furthermore, if you can teach people about the ways of open source projects, assembly, etc. by doing that, I think there's a lot to be offered here. It's not dunking on people for dunking's sake. It's showing actually the story that I think X learned is these are not big corporate open source projects. This is not Kubernetes where there's you know, hundreds, maybe thousands of people paid to develop this stuff.

**18:13** · These are just people in their basements in their spare time.

**18:18** · And if you can address that topic in a fun and entertaining way, I think that that that's the good thing and that's that's the value of X and then the reach we have. And and and to be honest, right? Like even on at Google, Google is one entity but so many different people, right? And and some and there is a ton of Google engineer we work with all the time and even like Google from YouTube to Chrome to Chrome media to the rest of Google, those are very different type of entities, but what we do is efficient.

**18:50** · And and for example, for for for Theo, right? It went a bit too far.

**18:53** · I had him I I calmed everyone down. I had him on the phone. We said, "Okay, like this goes too far." And so on. But in the end, yeah, it's a rap battle, but it's positive for the project. It like the awareness we have on open source and and I mean true open source from communities, right? Not is increased dramatically in the last 2 years, and this is useful.