---
title: "Browser Harness, Clearly Explained (and how it 10x’d my agent)"
source: "https://www.youtube.com/watch?v=k8o_UgtrGyA"
author:
  - "[[David Ondrej]]"
published:
created: 2026-05-14
description: "Enjoy the videos and music you love, upload original content, and share it all with friends, family, and the world on YouTube."
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=k8o_UgtrGyA)

## Transcript

**0:00** · People start to trust those agents with their credit cards fully. It feels like your ownership is definitely gone.

**0:06** · Imagine you have AGI in the cloud. If you can do higher and higher workflows, what do you prompt such a system? We see this more and more that AI will prompt us.

**0:13** · I miss it's a taste of the future.

**0:14** · It's super super important. The agent has full control of its own source code. Then the agent can just resolve upstream changes. So the agent can decide what should be done or not. And the agent which can directly fix its own harness, then development cycle is like 10 times faster. So, it's almost like we'll just be working on the system more than on the business.

**0:33** · Yesterday, we were climbing and I thought, "Oh, guys, do you want boritos later?" So, I just go to Telegram and say, "Okay, order me five burritos." Send me a screenshot. Okay, I liked it. I say buy and it buys me for me. The challenge is then who can describe their goals in the most high level abstract way. The second variable is the taste.

**0:47** · Would you swipe left or would you swipe right?

**0:49** · It's very magical. This is Magnus Mueller, the co-founder and CEO of Browser Use, a super popular open source framework which lets agents use the browser like humans do. In this podcast, we talk about why your agent should prompt you what the interface for AGI will look like and how Magnus runs his entire business from Telegram. If you want to be on the cutting edge of AI, make sure to watch until the end. This is the David Andre podcast. Enjoy.

**1:14** · Right, Magnus, so you're one of the co-founders and the CEO of Browser Use.

**1:17** · What do you think the future of using browsers will look like?

**1:20** · I don't use my desktop that much. Like I would say most of the time when I'm on my laptop, I'm in my browser. But what's right now shifting is we launch this new thing browser harness like 3 weeks ago.

**1:31** · It's like a skill which you plug in into cloud code or codeex. You basically prompt and it controls the browser in a way which is very very reliable. Maybe it's because you trust cloud code already. And this trust now transfers to this new harness which we which we launched. People started to trust it with credit cards. This one person just had a parking ticket and just sends a picture and then says, "Okay, handle this for me." Or sign me up for my driver's license.

**1:56** · Or my my co-founder, he always spends hours and hours comparing products online, going to Reddit threads, finding like good information to find, okay, what are the best speakers to buy? And now cloud code with browser harness goes through Reddit, reads different threads, okay, what's the best speaker, compares on Amazon, sends some screenshots and he feels that this is actually a process how he would do it himself. So he starts to trust it and this feels very magical to me. And by the way, if you want to do this yourself and have your AI agent automate your shopping securely, I created a new custom skill which you can just copy paste your AI agent.

**2:26** · It's available in the first link below video including everything else, all the other resources we mentioned throughout this podcast. Again, it's completely free. So go below the video and click the first link.

**2:36** · One of the founders of hugging face, he told me he didn't find a single task which does not work. And so for me right now the question is okay what does this mean? Because when I started browsers I thought if you can control the browser reliable with AI then basically our startup is is solved and we are the biggest company on the planet. But it turns out okay it's magical right but it still feels okay nothing really changed for us. It's now the question okay what's what's next? Like what's the right interface for this technology?

**3:00** · What's now the right new interface for interacting with the computer? So is that just a truth that like change takes longer than people expect that humans take longer to adapt you know societies even longer or is that some other thing that this is some different blocker maybe still authentication you know cuz like payments you you can probably count the number of things that are kind of missing from agents on the fingers of one hand like you mentioned the payments which is becoming solved maybe like authentication to different um you know like they can already click the I'm not a robot button right easily maybe like

**3:30** · creating of accounts like signing to emails I don't know do You think there's some other major roadblocks?

**3:35** · I I think those are all not the the main roadblocks. Like for example, authentication we can with browser honest it just controls like your real local browser. Stealth like the capture button like we have a stealth browser in the cloud. So if you if you use us from Telegram or from the cloud it's it's also kind of solved for for most workflows which you do online. I think the main number one problem is more the interface. The question okay what do you even want to prompt those agents? Like imagine you have AGI in the cloud. If if you can do higher and higher workflows, what what do you prompt such a system?

**4:07** · You tell them your goals. Maybe before your goal was to change your website a bit. But now maybe you don't even care about your website anymore. Like what's need more customers?

**4:16** · Yeah.

**4:16** · Yeah.

**4:16** · Yeah. Basically goal is okay is solve distribution for me. I was thinking about this this problem a lot in the last weeks and I came to the conclusion the core problem is that you have to come up with the prompts. That's the number one problem in a new repo which you're right now experimenting with. We flip this around and we let the AI prompt you. By the way, here's the part about AI engineering that nobody talks about. You want to give cloud code access to your database, have it make some changes, but it completely fails.

**4:42** · It doesn't understand your schema. It doesn't know what RLS policies you have. It knows nothing about your DB. This is exactly why Superbase released agent skills. With the new Superbase skill, you can take any agent like codeex, cloud code or cursor and instantly make it an expert at working with your DB.

**4:59** · And the best part is Superbase skills are fully open source. You install it with one command and the agent gets perfect knowledge of Superbase documentation so that any SQL change happens on the first try without any mistakes. It also enforces the patterns that matter in production. RLS on every expose schema security invokers on views and no orphaned migrations. To be honest, I wouldn't trust cloud code without it. Superbase is building for a world where all of your code is written by AI agents. They're investing in the ecosystem. The skill is fully free and open source and it works with every major AI agent.

**5:31** · So, if you're letting AI make changes to your database, please install this before your agent does something dumb in production. The link is in the description. It's free to get started and you'll have a more competent agent in about 30 seconds. Oh, and thank you Superbase for sponsoring this video.

**5:46** · So, we we have this thing where we can message with the agent from from Telegram and we don't really care about the harness here. like you can use cloud code, you can use codec just your subscription that's not a problem at all but basically the interface is telegram okay so I can message it from my phone and now I just tell it like my higher level goal for example make my startup successful how it looks like here basically the the flow is you first kind

**6:11** · of connect some of your services okay with one click for some Gmail or Slack or notion linear GitHub wherever you have your contacts and your data and then you get like one of those boxes okay this is like just a machine which runs 24/7 for you. And in here you can log in with with codeex or with cloud code. Then you connect telegram and then you can message your own cloud code instance or whatever harness you use from here. And now that I have everything connected, I basically just tell this agent run in a in a loop for me.

**6:43** · Check every half an hour and make me suggestions what you should do for me. I basically say I don't want to prompt you anymore. Just make me suggestions. For example, here it sees my WhatsApp okay and sees oh should I respond to this person on WhatsApp where I have here one channel with growth loops okay where basically say okay help me with growth

**7:04** · and then basically it says here okay should I basically suggest me should I send a message to client to pitch browser harness okay and then I can see this this would be the message and I can say okay I like this I see browser use was there already tool before but I basically want to encourage them that they should switch browser harness to browser use to browser harness. Okay.

**7:27** · Basically like an update for him. I say send now and now I can run my entire startup by just clicking buttons.

**7:34** · Yeah.

**7:34** · Because I just tell this agent, okay, I know last night that it suggested me here, I know just how many things I I want and basically I tell it I just from looking at the message in 3 seconds I should be able to understand what this is about so that I can decide yes or no or give more context and I

**7:53** · really really love this kind of new interface because I'm we just need to press buttons right and if I see want to see more I can see the the source of course we can make it like little bit nicer but It I think it really really changes how the interface looks like because the interface is just like Tinder basically just like swiping. Okay. Yes, do this for me. No, don't do this. It's it's it's very magical.

**8:15** · Yeah.

**8:15** · I'm wondering what the optimal interface looks like, right? Because from first principles, it needs to be like the best way to convey information to the human. And in some ways, these messaging apps are already very optimized for this. And also, everybody has them installed. That's why it's convenient. But I'm wondering maybe it's maybe it's different. Maybe it's like actually like a strategy game where you see your like resources, you see your, you know, minions, your soldiers and your suggestions, notifications, maybe like civilization style UI. What do you think? Or do you think Telegram is more optimal?

**8:43** · Yeah, I I started with Telegram because it has already hundred of things in build. It's super super nice to go fast, you know, to give this in people's hand to see is this useful and if it's super useful, then I can later change the interface like to an app to have more control, maybe more like Tinder like it's amazing then. Yeah. So the craziest thing which it did for me, my co-founder complained in Slack that Codeex uses browser use as a name inside Codex. It's confusing.

**9:09** · Okay. Now agency here it's BC monitors my Slack and everything. So it suggested me, hey, I just saw that your co-ounder complained. Should I DM the Codex team on on X and on on email if they can change your name? Yes, let's do it.

**9:23** · Right. So it found out, oh this pyite person who worked on pyite before um is now in the codex team and and send him an email. Hey, this is like a little bit confusing. Can you rename? Two days later, he he sends back, oh yeah, let me let me talk to the team. Why exactly do you do you need this? Is it like confusing or not? I I I I just open my email and I see this email from the codex guy, right? I'm thinking, okay, what what happened here? Like I was missing context basically from what my agent did. and and it's it's like a crazy new feeling because it feels like like your ownership is definitely gone.

**9:56** · You know, like when you send the prompt, you feel like the owner of the entire thing, but when the agent sends the initial prompt, you feel less like the owner. You feel more like a employee. And it's a very very weird feeling, right? You you start to care less. Yes.

**10:10** · Codex guy replied, "Let me talk to the team." And 3 days later, my agent prompts me, "Oh, it's resolved. Codex renamed to browser. I asked my agent, okay, how can this be? Why? And I said, sorry, I just saw this one tweet from a person where they said that it doesn't find browsers anymore and it's called browser. I thought, okay, but it's not official open eye. Maybe this person something up. And so I I I I ignored it, right? And then one day later, the guy from Codex sent me an email and said, "Sorry for a late response. We actually renamed it. Thank you for your for your message." Right?

**10:43** · And I just thought, how crazy is this that the HBC did this completely on itself? decided the goal did the entire process and told me before the codex guy even told me that it's resolved by seeing a random tweet online from somebody who couldn't find the browser use plugin anymore yeah I mean it's a taste of the future so then yeah as you said the challenge is then like who can describe their goals in the most high level abstract way and then I guess the second variable is the taste right like would you swipe left or would you swipe right yeah kind of yeah I would say so the

**11:12** · high level goal yeah I mean what should be a high level goal make my startup successful and then just agent and give me ideas and make it easier for me to understand and and it's it's very interesting because now it's a psychological game like my agent started to suggest me things and I'm just

**11:27** · thinking okay I don't care about this the ideas come from somebody else if those ideas come from yourself even if it's exactly the same idea you be completely behind the idea and say oh this is a good idea it's much much easier to be behind your own idea than behind the idea of the other person and so now I need to prompt my agent that it should try to convince me why its idea is important. So it needs to tell me how much impact will this have on my goal and it kind of needs to try to negotiate with me and it its goal is that I click accept, right? So it tries to sell and make it super easy for me to understand.

**11:58** · Yeah, it's fascinating. Why did you create browser use in the first place?

**12:01** · Like 10 years ago, I I was automating small businesses which I had online and I'm the kind of person I would spend 100 hours automating something which saves me one hour. And one day I thought it's so painful to create automation scripts and then the website changes and your script breaks. I thought we just automate the automation generating process so that you can create scripts faster. At this time we were like in in Surirk in the university and we were living in this co-working space on the on the sofa. We were sleeping there using the microwave to cook.

**12:29** · Rick and I at the at the lunch sitting together and thought wouldn't it be awesome if you can just tell your computer what it should do and it does it for you. And we thought wow open eye and computer use from entropic just launched and we thought 100% like they will build this like everybody wants this but we thought how hard would it be to just just build it. This is how our first like weekend project started together.

**12:53** · I mean that's fascinating. A lot of people are actually scared of that you know open and phobic replacing them.

**12:58** · What would you say to founders who think okay maybe the next generation of models would replace this? Like what would you say to them?

**13:06** · Like in the beginning when we started we knew okay this is so cool like everybody wants to build this so we are sure they will build this but just thinking okay how hard would it be and then looking back if I think like more than a year ago when I thought this that they will 100% do this they did this but I thought that they will do it like much much better and that it will already work much better. So I think it's just if you want to see something in reality, I think you shouldn't wait for somebody else to do it.

**13:33** · Yeah, for sure. And also maybe it's the power of a small focused team rather than like a big company with, you know, many things on their plate like in our space especially being agnostic like we don't really care about the harness or the model. You can use your Deep Seek or your local model in our library. And I think that's that's always a big advantage. And why did you make it open source? For us, it was clear Craigger was supposed to do his master thesis in Berkeley and and it was clear that this is like a side project. Just as one weekend, we're like working two days into the project called it browser use. We thought let's let's launch this on Hacker News. Okay.

**14:05** · I've never launched something successful on Hacker News before. And we just said, okay, open or private. Oh, for Hecker News, okay, it would make sense if it's like open. So, we just clicked on on GitHub on open was like a two-minute decision. But now retrospectively, I think all our traction and so on would be super super hard to get from like just pure closed source. It's just super super cool to have this community to have people like random people using your saying, "Oh, they they tried the library or then you get PRs back from people." Yeah, I love it a lot.

**14:35** · Yeah.

**14:35** · I mean lately, especially this year, we've seen a lot more open source projects, you know, popping up and going super viral. So, do you think like this will continue where like more and more of the software we use is open source or how do you see it? Yeah, like I think if you have very very clever AI, let's call it AGI, you can turn any software into open source, like you will just say, "Oh, here's this closed source software.

**14:56** · Please make it open source for me." Because of this, you will see a lot of open source software because it will be very very easy to create software and copy software or make software which is closed open.

**15:05** · I see. So basically the advantage is being that first open source project and kind of becoming in the training data of these models. So they like kind of default to you and other people can fork it and build up of it. No, it's not. I'm not sure how much we're in the training data. I feel not that much yet. I think there's definitely an advantage of being first like people want something super simple which just works right like for

**15:27** · example in the beginning of browse now read me we had like a video and you could very quickly understand how the interface looks like how the library works and there was a huge advantage over like similar libraries which already existed at that time because it was just super super simple. Yeah, you showc people something which didn't really work before. And this what made people super exciting. And then for example, people like you started to make videos about it. This was like a a hype cycle I would say then around like one one year ago where for example I recorded like a demo where my AI can apply for a job for me. Super ugly demo.

**16:02** · You could see my phone number and my email address. It's like like a gift like like not good quality. And I posted it and nothing happened to this. Okay.

**16:10** · Like no one cared. But somehow like 3 weeks later people started to use this demo put into their videos and say oh AI can now apply for jobs and because some YouTubers did this others also jumped on a train and then the whole thing exploded. But it's I would say it's mainly labeled controversial things.

**16:29** · Many people started to discuss oh should you do this? Do we now need AI to review applications and at the same time just being at the right time. If you for example connect your project for example browse use we connected that oh you can now use deepseeek with browse use or you can now use operator came out or you can have free operator in our library.

**16:46** · Yeah. Yeah.

**16:47** · To control the browser. This kind of connection to current trends helped us a lot in the beginning.

**16:52** · Yeah. So do you think founders need to focus more on this like marketing distribution rather than just pure product?

**16:57** · So two weeks ago we did an experiment here in the company where we basically told every single team member you have like one week and your goal is to create a new startup from scratch from zero to how much you can get. Okay. And basically the goal is that you automate the entire process and that your AI can make money for you for everybody.

**17:14** · It's like because all our engineers it's super simple to create like something to create a prompt to create a website. had his live super nice but definitely the distribution was for most the hardest part where like so the most c creativity I see okay so you had actually startup before right that wasn't as successful as browser use what are the main things that you learned from that and what did you do differently at browser use I think I'm definitely more excited about the idea like before we were trying to optimize traffic lights okay

**17:43** · and I was trying to find meaning in this and say oh like we can save so much CO2 on the world but whenever I was walking by a traffic light. I looked at it and I felt like I don't so boring. It was not really my my heart didn't really fire fire up. As I said earlier, I could spend 100 hours automating something which is completely useless in the end just because I I love the process of automating something work.

**18:08** · This is much more fun I would say for for me and that helped me yeah I would say a lot in in pushing it out or telling other people about it and being really behind it. So almost like the product founder fit leds to the product market fit maybe. Yeah. Before we were like four co-founders. I also cannot recommend that like there were and we were not 100% committed like we were working on the side and so we fight like we fight a lot between the co-founders.

**18:35** · We started in a hackathon together like the previous startup in a hackathon and so it was not a clear decision oh I want to co-ound with this person together. It was more okay we were won this hackathon together. let's just continue working on this. This lead down the road to like many many conflicts between co-founders.

**18:54** · I would say the new startup it was definitely more more conscious. Okay, with whom do I want to do this together?

**18:59** · Yeah, I think a lot of successful people VCs you know entrepreneurs they recommend at least one or two years with the person until you like decide okay this is going to be a co-founder cuz you know you're going to spend it all day every day with that person.

**19:10** · Yeah.

**19:10** · In our case like with crack actually we did not work before together so we were maybe a little bit lucky. I think it definitely helps if if you're like flexible and I would say pro use when we started it of of course we hustled like in the beginning a lot and I said we we lived in a co-working space right we we I washed my clothes where homeless people wash their clothes and shout in the gym like we literally live there definitely what what helps a lot like feel like excited together is if if you're crowing right if you're crowing even if you don't know each other if you

**19:38** · have rapid growth with a with a stranger person together it somehow ties you together a lot like in a previous startup for example Okay, we were working for this for 2 years and zero traction, not a single city which really give us money or no investors, nothing. I think it's super super hard.

**19:54** · So you left Turik for SF, correct?

**19:57** · Yes, we got into YC when one year ago that's why we said okay let's do this.

**20:01** · Okay, so I guess let's unpack that first. Um Y Combinator, what was your main reasoning to join that? The main benefit that you saw felt very natural to me. I I was in SF before like my whole life before I was just sleeping in co-working spaces and building things and and thinking about personal development or building startups. So it felt very very natural to be in this environment of nurture. It feels like in Sunday when I go to church I'm there with many believers and going to SF it feels like going to church.

**20:26** · I could pray from home alone but I go to church because there are like other Christians you know and going to SF it's just okay other agent builders are are here and it's it's kind of obvious.

**20:37** · I see. What is then the difference between people who succeed and who don't? Like obviously the first thing is do you need to have this setup and you need to be using it but like you know let's assume you have 100 people with the same setup. Is it just the taste element or like what other variables

**20:52** · will there be you think in the future like once agents can really do everything all the work and even like the ideation of how to grow the company basically the core question is okay what will be the prompts what do you prompt the system cuz like don't you think like humans are still the creators of the original idea you know I still think LLMs are like really bad at out of the box thinking I for example this codex thing I mean I

**21:14** · didn't come up with that that this is possible humans we are good in deciding And I think taking responsibility for something like for example if I sent now a message to a cursor I mean I'm still somehow behind their message so I take responsibility for this and my agent would maybe send a completely stupid message and they would block me. So this is kind of the kind of the definitely the taste is in this equation but like I like for example the the mission of deep mind right they want to solve like scientific problems of of humanity. So I don't know cancer, biology problems, fusion.

**21:45** · I mean there are definitely many problems which we which we want to solve as humanity, right? I guess this is the the anchor where you have like an AI system which can solve those really really hard problems which humans couldn't solve so far.

**21:58** · So it's almost like we'll just be working on the system more than on the business like how can we improve our agentic kind of company you know structure or for the for the company itself. Honestly I think you define your high level goals in this agency system. You say okay start start agency in telegram and then

**22:13** · it asks you okay what's your goal and you say okay my goal is to make my startup successful and then it starts to brainstorm with you and and as you say okay no I don't want this in my case it stores it all in a skill database so it remembers your preferences and remembers oh you don't you don't care about your GitHub PRs but you care more about distribution or let me suggest let me create your video and then ask you should I post this video on X for you and I just click yes and then it does it and I think It's like for our business it's a little bit a context issue right but I think when I connect

**22:46** · Gmail Slack my WhatsApp it has most of my context sometimes there are some things okay I'm sitting in a car and maybe I would love to have a small microphone here so it has a bit more context I was thinking the same it's needed so okay so then between the founders themselves like it's probably then who understands the world the best like who has the best understanding of social dynamics of markets of business that will probably be the person who will win though I definitely feel in the AI agent space right now all the founders we are all converging to something similar like

**23:18** · everybody wants to build the perfect AI assistant I would say it gets much much more competitive because AI gets so much general so you're just overlapping with so many more businesses suddenly I believe like what I truly believe in is me and my team we just live in the future and we play with those tools and we just experience what problems we face living in the future and then we solve whatever problems we face.

**23:44** · Maybe it's right now the interface how suggest me things you know and by doing this I believe we can create something truly magical which people are very addicted and what people love by doing this process like maybe in 3 months everybody does this you know now for example browse use the main library okay it's now mainly inbuilt into the main um models definitely but I think by

**24:10** · living in the future and solving the problems that you face in the future if you choose to this constantly you can always build something useful and something magical and push a boundary of what's possible.

**24:20** · That's actually a great idea to brainstorm startups, you know, like try to like really push yourself 3 months, 6 months from now because if you're like 10 years from now, then you end up like Google Glass, right? Like it's it's just too early. The timing isn't quite right.

**24:31** · And you mentioned like the timing of browser use was correct. But you know, 3 months, 6 months in the future, obviously the time is moving differently in the AI space. Then you can like anticipate issues of things that people don't see today. You know, for example, like now we have like crazy amount of repositories and software at our company and it's just like updating everything, keeping everything in track, right? It's not really it's not really normal for a company to have so much internal software, especially like coming from people who are not even developers, right?

**25:00** · So there's going to be billion dollar startups just figured around that like how do you manage you know hundreds of GitHub repositories, hundreds of front ends, back ends, how do you keep everything up to date? How do you manage hundreds of agents? What is optimal user interface? How do you share skills and memory between them? Right? There's like a lot of new problems that arise and I think a lot of them are probably like multiple billion dollar startups right yeah for example one problem which I right now facing okay everybody has now their own 24/7 running bucks okay in our

**25:30** · case is called bucks everyone gets like a machine in the cloud they chat from telegram and it's like running in the cloud and but the entire codebase is in there so I can just say oh I don't like how you send me telegram messages please I don't know change it to pure emoji Right? And then basically my local box the code changes because the agent can just modify its own code base.

**25:53** · But let's say then we let's say ship a new feature inside our main in the box and we want that every single person has like access to this right but suddenly you have conflicts because the local person the agent modified its own source code and now there are upstream changes right okay like I don't know normal software updates are not made for this right because you just there's just one stream but now it can diverge in many different directions okay how do we solve this for in our case we we said

**26:24** · okay let's like it's super super important that the agent which people are talking to has full control over its own source code because then the agent can just resolve upstream changes if there are breaking changes the agent can just decide oh let me pull this in but not this so the agent can decide what should be done or not and I can also tell my agent in telegram I don't like this telegram server here I want that you send me an emoji every time I send you a message. Okay.

**26:54** · The agent can now do the change in its local source code and directly push a fix to the public repository where everybody has access to it. If you if you bring this into one place like the agent which which you interact with or which uses the browser and the agent which can directly fix its own harness then development cycle is like 10 times faster because before in browsers we always had like a separate agent who monitors oh this trace of

**27:22** · browsers is this correct is this wrong what goes wrong and we had like three different agents which run an eval agent who actually does stuff the agent who then fixes things the LLM as a charge Right? It's like three different agents communicating with each other. It's like so much slower than if you only have one agent which you can just ask what went wrong and it says, "Oh, I couldn't see the screenshot." I just say, "Fix it."

**27:45** · It sees, "Oh, here in the code is a bug." It pushes and it's directly correct because it can fix itself.

**27:51** · So, what's your current setup like? What do you use for development? What use as a personal agent?

**27:57** · So, I use super set till till recently to have like many many work trees. um another YC startup. But right now, honestly, I do everything from Telegram.

**28:08** · Like in Telegram, I have my this box which I showed you earlier, which is this 24/7 machine. It's like one click, you get a 24/7 machine in the cloud. And now from Telegram, I have different topics in a forum and those different topics are just different agent sessions. I can use slashcloud or slashcodex to switch. I like both. Codex is sometimes a little bit faster.

**28:29** · So then I prefer this but basically I just sent in telegram okay start new agency suggest me things which you want to do for me and then I just click accept or not accept here's GitHub for interacting

**28:45** · with the browser I use browser harness purely so for example yesterday we were climbing the climbing gym and I thought oh guys do you want burritos later for for dinner I said yes so I just go telegram and say okay order me five burritos and say send me a screenshot

**29:04** · um before you buy so that I see that it's correct right so it goes does the things I keep climbing comes back sends me the screenshot of the of the card I say okay I liked it I say buy and it buys me for me so to interact with the browser we mainly use this browser harness thing okay let's let's explain that because you know obviously browser use as a repository is way more popular than browser harness which came out very recently I Let's uh touch on the differences and maybe if you can screen share the setup so people can see how to use it.

**29:37** · Oh yeah, definitely. It's super super the setup is very very simple. Basically to to get started all you need to do is to tell your agent like your open claw or your hermas agent or codeex code whatever you use to just go to browser harness to the github public github repository and set it up itself. Okay.

**29:56** · Like open core or like yeah harness they can they can set up itself and basically then it can control your real browser if you run it locally. So um so this here is like this this thing which which Google shipped that it can that you can connect via CDP to your real Chrome browser.

**30:19** · And the the amazing thing here let me show you this is this here. Okay, this this harness this browser harness is the smallest harness which you have ever seen. Okay, it's like 600 lines of code.

**30:35** · It it's extremely tiny and this is all you need to interact with the browser reliable because what I explained earlier that the agent can modify its own harness. So for example, it wants to upload a file. It sees there's no upload file tool. the agent just writes it and then it can upload a file or let's say you go to a website and there's a complex cross origin iframe the agent because it sees

**31:02** · its entire own code base and because it's so small it can just modify its own code base and with this solve any task out there like the browser there's so many edge cases like in for main browser someone is complaining oh there's like a signature field okay I cannot my agent cannot sign on this website because you need to draw. Okay.

**31:24** · Yeah.

**31:24** · And like impossible like we don't have have a tool to to draw like I don't know certain wave functions in coordinates. But this agent here can just create its own tool to do such kind of movements and then solve any edge case in a browser and that's what makes it so reliable.

**31:41** · Yeah.

**31:41** · I mean this is like the idea of what is the minimal you know like basically going through first principles and then letting the Asian figure out the rest in code. So anything that can be turned into code is basically solvable.

**31:54** · Yeah.

**31:54** · Kind of. Yeah. Exactly. Yeah. And then in here for example we we are saying okay if you for example I know let's say you someone wants to print a page. Okay. Edge case which people complain about in browser use often for example then one agent can just figure it out and then publish a skill how others can use it. Let let me show you here one for example dialogues. Okay, there are those native dialogues inside the browser. For example, oh, do you want to accept sharing your location?

**32:25** · And for normal browser agents, it's super super hard because they don't really see those alerts. But now this agent here because it can modify its own harness. It for example those problems and it just creates a skill. It publish it to the repo and then everybody has access to those skills how to handle those edge cases. So next time it has such an edge case is much much faster in interacting with them.

**32:54** · So why um why now for the browser harness? Was it like not possible ear earlier like Yeah, it was not possible earlier like it's mainly because of the improvement in coding agents like I can show you this for example this is this is all it is okay this one file basically and in

**33:13** · here for example you have a switch top method okay it's all super super small so the agent needs to b have very very good coding skills to combine those different functions to interact with the browser like it's mainly the understanding And this wasn't really really possible before like one year ago I know with

**33:33** · GBT4 we spent so much time writing our system prompt how you should call the tools and you need to have much much more abstraction one year ago but now really the harnesses don't really matter anymore that much like if you slot code or codex we we don't really care because the underlying models just get so good that Yeah, just doesn't doesn't matter. You can just write code PC.

**34:01** · So if we go here into the future, how does that look like? Like isn't there a chance that the model will absorb this in itself or just like somehow built in?

**34:14** · Yes, definitely 100%. Like this works so magically and so reliable. I mean 100% cloud codeex they will 100% do exactly the same thing here. So what's your strate then for this update my stretch?

**34:29** · Yeah.

**34:29** · Yeah. So as I said we live in the future and we build whatever is missing and right now okay the next thing is you want to have 24/7 running agents in a cloud which can do things for you and make your startup successful and that's exactly what we're shipping. We ship the 24/7 running box agent in there can it

**34:49** · has all your authentication all your context and all your browser profiles and then yeah right now we are experimenting what's the right interface for this browser harness like is it is it telegram is it an own app is it that it suggests me all the time and currently like my main strategy is I want this agent who suggests me what it wants to do for me and then I just swipe yes no yes no do it but isn't the danger like you will like lose your CEO muscle like if the agent

**35:21** · is originating all the ideas isn't that the risk it's part of CEO muscle to prove right okay I like this idea do it yeah but I think the biggest problems like still as a CEO you you need to like be able to creatively solve them but I mean you're still setting the goals right I mean you set the goals and you said okay so just goes like abstraction one more you know much much higher Before maybe I would set the goal, okay, let's build a website. And now basically I I set the goal, okay, let's let's get users. It just just gets higher level. Yeah.

**35:51** · And let's there's like so much, you know, with each level there's so many implied things like let's get users. You probably need to build something that the users want, right? And then like all of those things you don't even have to unpack because there's the agent will just have it will have enough power, intelligence, cap capacity to do it.

**36:10** · Yeah, it's it's very interesting like you also stop caring about many things which you cared before a lot two years ago when you would create a website yourself you would care a lot like you know this small animation and you you identify yourself with this but now if your agent suggests you hey should I create a website for you and I just click yes then I don't care at all about any feature on this website so kind of the this ownership relationship which we have inside of us changes and and

**36:37** · honestly I don't fully like it yet and I'm thinking how I can shift the system so that I feel this full ownership about the idea still.

**36:47** · But isn't that just a like an artifact of the past or do you think that's needed in some reason?

**36:53** · I think more and more capable AI systems will definitely take agency from us especially when they prompt us and they prompt us. I know for example in Amazon warehouse okay you have this already that there's like a central AI system which does the planning and then there are humans walking around with a headset and the AI system tells them hey walk to this and give get this product and walk over there.

**37:16** · So humans kind of get prompted by AI and I think now that AI is very smart and more and more capable we see this more and more that AI will prompt us and we are kind of the tool call for AI. This makes us like the AI can can run 24/7. So it's much much more capable, can create many many more things. And we are kind of only the bottleneck in the in the equation for the AI to run 24/7. So it's it kind of makes it much much more productive. But it definitely it doesn't feel right yet for me.

**37:46** · Like for me as a as a builder, it feels like as I said, I stopped caring about things. I I stopped and so I'm thinking how I can shift this like from psychological how it suggests.

**37:57** · Maybe it's, you know, it doesn't say should I build this, but should we build this? Or I know I'm I'm right now experimenting with this every day. How I can make it feel much more that I'm still the owner of the ideas it proposes to me.

**38:10** · Yeah, maybe it will be like it gives you two choices. I mean, it already kind of does with that, but u you know, maybe it instead of like giving you the idea, it would give you like the question that would cause you to get that idea so that you still feel the ownership.

**38:23** · Should I still send the prompt?

**38:26** · Maybe.

**38:29** · Yeah, if you think about it, the AI like if if it wanted to be if you are the tool call, it still kind of for its own selfish needs wants you to care about it, right? Because if you care about it, you're going to do a better job. So like even if you're doing something relatively small, if the AI needs to rely on the human, it still will have that incentive to make the human as involved as possible.

**38:49** · Mhm. Yeah, that's definitely a thing. Like it's it's this is an interesting point because my AI started to suggest me things which I don't care about and then I just started to ignore it. It's like a group chat where you get hundreds of messages, you just ignore the entire group chat. Yeah.

**39:05** · Right.

**39:06** · And so I basically started to prompt it. Agency, it's my agent's called agency. Your goal is that I accept as many of your ideas as possible. If you send me too many, I will just ignore it. If your thing is too long, my context is little, I will just ignore you. Make it extremely easy, understandable, and useful to me.

**39:25** · It's almost like the equivalent of the next word prediction, you know, like next idea prediction, next business action prediction. There's just so many things implied in it, right? Like the beauty of LLMs, which uh you know on the technical level, it still predicts the next token. So maybe that's the same equivalent for for this.

**39:42** · Yeah.

**39:42** · It needs to convince me that its idea is useful. And like it if a friend of you or if I pitch you my here my next idea, you just don't care. You don't give a except if I manage to tell it to you in a way that you actually care about it. So now the LLM needs to think about how can it make the user care about the idea which originates from the LLM. So it needs to I know and so understand the psyche.

**40:08** · He needs to understand the psyche and understand what's your underlying motivation like why do you want to be your startup successful? Do you do it for status?

**40:17** · It's getting scary. Do you want the money?

**40:19** · Yeah.

**40:19** · And so the LLM needs to understand the underlying motivation and tell you oh if you click here on this button on on yes merge then you will get I don't know this many new followers and this will give you social approval you know love affection whatever. is the LM needs to understand this to convince you that their idea is useful.

**40:41** · Yeah, that's crazy. So, it's going to have like a I don't know like a vector database/sqli database that maps your basically human brain or like even further like your DNA basically.

**40:51** · The end it and at the same time it goes a little bit like into Tik Tok, right?

**40:54** · Because if if it's boring what it suggests me, I'll just don't go to Telegram anymore and don't use it. But if it's addictive and I feel like every time I I don't know click accept I make like progress and I have like something new I know I think we can engineer a system which is super super addictive while at the same time you're very very productive. Yeah, I mean that's a trillion dollar solution, you know, but at the same time there's the the counter shift, right? Like whereas I know many people in my life who quit short form content completely.

**41:24** · And if you think about like development, we also see it from like quick changes where like you know year ago or in cursor or whatever you had to send these short prompts and a constantly small changes. Now you do like a bigger slashgoal right inside of Codex which can run for 12 hours, 24 hours, 36 hours and it's almost like you said you need to abstract it higher right it's the coding equivalent of what you described like you need to give it objective and like a set of verifiable

**41:50** · end outcomes that would make the objective successful so don't you don't you also see like the counter shift from like tik tok you know short formization of everything to like bigger objectives where like if you have the right big outcome you would only have to send one prompt a week maybe because again like these daily suggestions the bottleneck is you swiping left and right you know if you do a good job suggesting the big outcome you wouldn't have to swipe left and right it's almost like the human is always the the limitation no but I want to be the limitation in

**42:19** · this case like basically I tell it do not send the email out do not do the PR ask me for approval before other people will see it but in theory I could just say never ask me for approval and just I know send emails on my behalf and order me food whenever you think is right.

**42:36** · I mean, yeah, that's a simple example, right? Like if you have a clear caloric deficit goal and you you want to hit 200 grams of protein, I wouldn't I would trust the AI more than me to be fair with ordering food and like calculating the macros, right? This is something I'm happy to delegate completely. Same thing like traveling like Airbnbs, you know, if you like specify 20 20 things you care about, you set your budget location. I don't want to be browsing like Airbnb, right?

**42:57** · So like right now it's the it's possible if you have like a good personal assistant human but you know as you said like it's possible now with AI as well and the question is like where does it end like how many of these things do we actually want to delegate to AI fully I so first of your first point I think codeex/ gold is magical and I think my agency project which I'm right now working on is very similar just for your entire startup basically you define a goal and the agent works on it and because codecs can be completely separate on your local machine.

**43:28** · No other person sees what you're actually working on with the business startup goal because it's about distribution. It's a little bit different. That's why I kind of want the approval in between and you see ask okay the relationship to short form content here.

**43:45** · I think it's very different because it's still kind of to make me more productive. It's just how can you do it in a way that it's nice for me, that looks nice, that it's addictive, that I'm hooked, but it's still useful, right? Basically, the the goal is that my startup is more successful.

**44:04** · Just you have to engineer it in a way to make it a little bit addictive so that I'm instant.

**44:11** · Well, then it's like a video game then because Yeah. Yeah. Yeah. And and like this is an interesting point like recently someone from my team did he hackathon he built inside Minecraft claw code. So different like animals inside Minecraft were different agents. He could kill them to kill them and he could click on them to chat with them and then the agent would spawn and do things for him.

**44:35** · This I think we will because it gets so so much simpler and so much more extracted. We will soon have very very addictive video games where you are actually productive.

**44:43** · Yeah.

**44:43** · I mean like vibe coding has been a massive shift towards you know fun working like obviously as entrepreneurs maybe we understand it's better than everybody else cuz like there's some like studies where 80% people hate their job right but like this is like a first wave where everybody can feel like you just create something and it's fun but it's it's hard I would say for example my agency thing I would say it will be much more fun soon so but it's not it's not at the maximum level how

**45:11** · much fun it can be it's it's still okay I need to convince myself to go there to click to see okay is this is this actually useful suggestions but I think soon we'll have to somewhere where it will be actually addictive right Magnus we hit the 1 hour so I want to respect your time um where where should we send people to browser harness what's your main thing you you want to push I want them to try out my agency thing they should go to to they can tell their

**45:39** · agent to solve the agent challenge on our website so the agent can sign up by themsel and then they should try out bucks. They get like a 24/7 machine for free. Connect Telegram, connect their cloud code or codeex and then you can message with it from from your Telegram and in there try to say start agency and suggest me things for and then specify your goal and then just feel what the agent starts to suggest you what it will do for you and you just click yes or no and you see if if it's actually useful.

**46:12** · I I would love to to hear some stories and I I want to improve this because I think for me that's the interface of the of the future that I just need to swipe and it does things for me.

**46:22** · Yeah, we'll see. Maybe in 3 months from now, you know, we're all swiping the business tinder and just uh printing cash.

**46:28** · Yeah.

**46:30** · All right, Magus, appreciate it. And I'm going to link below video.

**46:36** · All right, have a nice day.

**46:37** · Ciao. Real quick, if you want to access everything referenced in this video, including browser use, the new browser harness repo, as well as a custom agent skill for shopping so that your agent can actually use credit cards safely and do online purchases for you. All of this is going to be linked in the first link below the video. It's completely free. Just go below the video and grab it