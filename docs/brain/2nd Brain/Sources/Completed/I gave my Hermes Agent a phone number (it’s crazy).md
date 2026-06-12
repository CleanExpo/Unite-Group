---
title: "I gave my Hermes Agent a phone number (it’s crazy)"
source: "https://www.youtube.com/watch?v=zHE434sBw2U"
author:
  - "[[David Ondrej]]"
published: 2026-05-21
created: 2026-05-21
description: "Check out Vapi: https://vapi.ai?utm_source=youtube&utm_medium=influencer&utm_campaign=david-ondrej-05-20-2026Get the resources from this video: https://www.davidondrej.com/vapi-phone-agentsWanna l"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=zHE434sBw2U)

Check out Vapi: https://vapi.ai?utm\_source=youtube&utm\_medium=influencer&utm\_campaign=david-ondrej-05-20-2026

Get the resources from this video: https://www.davidondrej.com/vapi-phone-agents

Wanna learn how to code with AI? Go here: https://www.skool.com/new-society

We're hiring: https://www.scalesoftware.ai/

Follow me on Instagram - https://www.instagram.com/davidondrej1/
Follow me on Twitter - https://x.com/DavidOndrej1

Hermes github
https://github.com/nousresearch/hermes-agent

Subscribe if you're serious about AI.

Giving Hermes Agent a phone number makes is 10x more powerful, trust me

## Transcript

**0:00** · So, I just gave Hermes agent a real phone number and now it can pick up the phone to call businesses, book appointments, chase down leads, and even call you to confirm any details. But the wildest part is it can do so proactively on its own schedule without me having to ask it. This actually is the most powerful and useful Hermes setup that I don't see anyone covering. But David, isn't this setup too complicated? No, it's literally one MCP install and you're done. Okay, but what if it cost a fortune? It's actually super cheap. All right, but I don't have a business. You will use it for personal things.

**0:30** · Trust me, dentist appointments, reservations, it can save you so much time. Or maybe you think you're not technical enough.

**0:37** · You can't code. Listen, if you can copy paste, you can absolutely build this.

**0:41** · So, in this video, I'm going to show you how to install Hermes agent locally, how to connect it to Vap MCP, give Hermes a real phone number, then how to research target businesses and have it call you a business, get more leads, and make you more money. Literally, all done by Hermes agent. All right, so the first step is to set up Hermes agent. I'm going to show you how to do that locally. If you have a VPS, you can of course do it on a VPS. Either way, the setup is the same. So, first we go to the Hermes agent repo and we scroll down to find the oneliner installer command.

**1:09** · There it is, the quick install. Just copy this command by clicking this button and open a terminal and then paste this in. Boom. This is going to install Hermes agent on your computer.

**1:17** · Once you run it, you should be able to type in Hermes setup and it will open up the setup. One of the first things it will ask you is what provider to use.

**1:24** · So, I'm going to go with Open Router. Go to open router.ai and then make sure to create an account. Super easy. Takes like 20 seconds. Then go to top right and click on credits. Make sure to charge up some amount. You don't need $300. Just $5 to $10 is enough. Go to left, click on API keys, and click on new key. I'm going to name this one subscribe. If you're watching this, please subscribe. We are so close to 400,000 subscribers and most of you, like 60% of you are still not subscribed. So, if you find my content valuable and if you want me to make more videos like this one, please go blur video and click the subscribe button.

**1:57** · It's completely free. Okay, I'm going to put some limit on this, maybe like 50 bucks, just a good precaution. And I'm going to copy the API key. Let's switch back to the terminal. I'm going to hit open router, enter u. I already have a key, so I'm going to do R to replace it and paste in the new one. API key updated. Beautiful. We can choose a model. There's many different models.

**2:17** · I'm going to go with the latest Opus 4.7. It's asking to add a fallback credential for the same provider. I'm going to do no. It's not needed for now.

**2:24** · Text to speech. You can keep the current one. Hit enter. Enter. Iterations.

**2:28** · Enter. Enter. Enter. Just spam through this. The default settings are really good in Hermes. You can just click on enter a bunch of times. This is also good. 4 a.m. also good. Um, navigation platform. We actually don't need it. So, I'm going to skip by hitting enter. The CLI. Um, that's cool. But I can just go to done. And we're probably done. And as it says here, always read the instructions, guys. A lot of people are scared of the terminal and they don't look at the output. So I'm going to type in Hermes. And this is going to launch Hermes agent with cloth opus 4.7. Let's send a test message. Test.

**2:58** · And let's see if it responds. Okay, so we have Hermes agent installed locally. And obviously Hermes is a very very powerful agent right off the box. However, there is one problem. It doesn't come with a phone number. And this is what we have to solve next. real quick. If you want everything from this video, all the assets, all the repos, all the skills, everything I show you, click the second link below the video and grab it now.

**3:22** · It's completely free. Okay, so we have Hermes, but the phone is the missing piece. This is still what most people don't trust the AI to do, to take phone calls for you. If you think about it, for 99% of power users, they already use AI for web browsing, for writing code, for doing their email. But using the phone, most of us still do it manually.

**3:42** · Luckily, there's an elegant AI first solution and that is Vappy. Basically, to explain it in the most simple way possible, Vapi makes phone calls configurable while Hermes makes them autonomous. And the synergy between these two is really beautiful. Vapi gives Hermes phone numbers, inbound calls, outbound calls, voice agents, transcripts, call locks, and real-time conversations. While Hermes gives Vappy goals, memory, tools, chron jobs, proactive decisions, outcome checking, next actions, self-improvement, and anything else that Hermes agent can do.

**4:14** · So connecting these tools together is really where you get the most OP use cases possible. Let me show you how to set this up. All right, so the first step is to just type in Vapi into Google and click on the first link. And here, simply create an account. So go to top right and click on get started. Now you can sign in with either Google, GitHub or Discord or just classic email password. Now again, creating an account is super simple. Literally takes 20 seconds. I already have account with Vapy, so I'm just going to sign in. Now, Vapy was kind enough to sponsor this video.

**4:40** · So, if you want to make your Hermes agent super powerful by giving them phone numbers and letting them do anything that a human with a phone can, make sure to show Vappy some love, click the first link below the video and sign up to Vapy. First thing you're going to see when you get here is the composer.

**4:55** · This is this screen right here. And this is the agent that lets you build, debug, and manage your VP agents. And you can always access it from the left here.

**5:03** · Composer, you can even start it. So, it's one of your favorites. So, when you get to this page, go to left and click on assistants. This is where you can see all of the different voice agents or voice assistants you have inside of Vappy. This is the main page where you can manage all of the different voice assistants you have and see everything there is to know about them. Now, the most interesting thing in here is the breakdown of the cost and latency for each assistant. And you can see that the average cost is just $0.1 per minute, which is very affordable. The average latency is just 1.15 seconds or 1,150 millconds.

**5:35** · Below it, you can see the transcriber, the model, and the voice u voice model, right? The voice agent. So, obviously, you can configure these and change these to different providers, different languages, a bunch of other settings. More on that later. But the main thing to understand is that this is the flow, right? When a person speaks, the agent first needs to transcribe their speech into English or some text.

**5:54** · Then it sends to a model, right? It could be a cheap model like 4.1 or you can use something like more powerful like GBD5 or even GBD 5.4 if you want even more power. And then the third thing is the voice. This is the output.

**6:05** · Right? Once the model has the response it needs to turn it into voice into spoken sound that gets played to the person it's calling. Right? And again you can select the provider the different voice preset you know male female slow energetic kind of more monotone. There's many different voices.

**6:21** · You can adjust the speed background sounds. There is a lot of settings inside of Vappy. It's really, really advanced. And again, I'm going to go into this later in the video. Now, before I show you more about the Vappy interface, let's make some progress and let's actually set up Hermes so it can use Vapy. And we're going to do that by using the Vap MCB server. This is the simplest way to connect Vappy to Hermes so that it can actually start making calls on your behalf. And in fact, the team had made it super simple and it's literally these three steps. Get the API key, edit the config, and add the MCP server block.

**6:52** · So, I'm going to show you step by step you can do this even if you're not a developer. And by the way, what you might not realize is that this will allow Hermes to create Vappy agents to log the calls to analyze what happened. Basically, to make any changes inside of the Vap dashboards for you.

**7:07** · So, really, you don't even have to master the UI. All you need to do is talk to your Hermes in plain English, either in terminal or Discord, WhatsApp.

**7:15** · I've made many videos on Hermes agent, so watch those. But basically, all the heavy lifting will be done by Hermes.

**7:20** · You just tell it what to do and it can do it. It can interact with the full VP interface through the MCP. So really setting this up, this might be the most valuable three or four minutes of the entire video. So there's just one thing that you do. Please do this. Give your Hermes agent access to Vapi so it can make phone calls. It can set up these voice agents and use them to save you time and make your life better and grow your business. I don't care how you use it. You have to use it. Okay, that's the main thing. Just make sure to use it. So first step, get the Vap API clear.

**7:49** · literally click on this. By the way, I'm going to link this um in the resources, right? So again, everything from this video will be linked in the second link below video. Okay, all the skills, all the repos, everything you need is going to be bundled together. Click the second link below video, grab it completely for free. All right, so I'm going to click on this link. It's going to take me to the dashboard of VP, specifically the API key section, and I'm going to create a new API key here. Now, believe it or not, the simplest way to actually set this up is copy the URL, go to Hermes and say, "Set up this new MCP." Boom.

**8:21** · And let Hermes set it up for itself.

**8:24** · Because Hermes comes with a skill that knows how it's architected, right? It knows how it's built and it knows how to set up MCB servers inside of itself. You are probably underestimating these agents, all of you. You're probably giving them too easy of a tasks or you're micromanaging them too much. You can literally say set this up and link what MCB server you want. It will set it up and then it will ask you for the API key which again that's the last step we have to do. So again if you click here you'll get redirected to the Vapi dashboard and you have the two keys.

**8:50** · Now we need the private one here but if you're not sure just take a screenshot go to Hermes and ask it which of these keys do you need and it will tell you.

**9:00** · So there it is web space. Okay I need your API key again. Just copy it right here. And by the way, anytime you're not sure which key, just screenshot, boom, copy to clipboard, paste it in with Ctrl +V, and say which key do you need?

**9:14** · Answer in short, private key, server side. Okay, so it wants the private key.

**9:18** · I'm going to copy it. Say, here is the key. Store it securely. Obviously, this is not the best practice pasting API keys into the Hermes. And I'm going to revoke my key before uploading this video. You can also do Hermes config set VP API key and then paste it in. That's the more secure way, but this is the fastest and the simplest way. And since Hermes will be basically doing everything else with the Vap MCP, it's not that big of a risk. All right, it's asking for permission to write this in.

**9:43** · I'm going to allow it for this session.

**9:44** · And as you can see, it's setting everything everything up. I haven't made a single change, single manual change to the config file of Hermes. It's setting it up itself. Like this is the magic of self-improving AI agents like Hermes.

**9:56** · They can improve themselves. They can do all the things. Okay, it wants permissions for this command. I'm going to allow for this session. and you basically just tell it what you want and it will do it. Now, there's two reasons why most people don't see the value in AI agents. Either they never set them up, right? So, they don't watch a video like this or they only watch it and they don't follow the steps. And the second reason is they don't know what to tell it. They don't know how to ask it for what they want. So, if you can actually set this up, if you can follow the steps I'm showing you and just do this yourself either on a VPS or locally and then actually start telling it the things like, "Yo, make a phone call to that sona.

**10:27** · I need a reservation or find me 10 leads in this city and call the phone number on Google Maps. Like, if you can tell it what you need, it will do it. The issue is most people never set it up or don't tell it what to do.

**10:39** · Okay, there it is. Confirmed. Here's the variable. Restart her to pick up the new server. Okay, so I'm going to do Ctrl C to kill Hermes. Clear. Launch it again.

**10:48** · I'm going to say check your config and let me know which MCP servers you see in there. Be concise. Just a quick double check to see that the Vappy MCP server is there set up correctly. There it is.

**11:01** · Just one Vappy. Beautiful. Now check.

**11:04** · Boom. And let me know if you see any API keys in there.

**11:10** · Don't read the the values. Just let me know which keys you see. Okay. As you can see, I already have some, but there it is. VP API key. Beautiful. It's there. So, we can continue. All right.

**11:21** · So, we have the API key here. We have the MCB server here. Before we jump to the first use case, I want to show you a bit more about the UI in Vapi, especially the messages. Here you have the first message aka what happens, right? Whether assistant speaks first or the assistant waits for the user or assistant speaks first with a model generated message, right? So you can say like, hey, I'm John or hey, I'm calling on behalf of David, stuff like that. And then the system prompts. This is the main thing.

**11:44** · This is where you implement and influence the behavior of the voice assistant. how verbose it should be, whether it should be formal, informal, how it should talk, what level of English it should have, all of that. And then here you can select any external files um such as documents, PDF files, markdown files, anything else that would give it more context. But the setting we're looking for the most inside of VP is the phone numbers. If you go left, this is where we can see our phone numbers that we have, right? So we I have two American ones, one Polish one.

**12:14** · But this is what gives Hermes the ability to make phone calls through Vapy, right? So these phone numbers, you can put different labels on it. You can see the provider. I think Vapy even gives you free phone numbers. If you click uh yeah, free phone number, you can get up to 10 per account. So if you're not convinced to try Vapi, this alone might be convincing. 10 free US for phone numbers for your AI assistants to make phone calls, right? Very, very OP.

**12:38** · But yeah, as you can see, Vappy gives you all the configuration and Hermes gives you the powerful AI agent that can solve problems and do basically anything else. And now it can also take phone calls. So the first use case is going to be having her mass make an external call. So it could be book something or um you know just call a business on your behalf, save you time, anything. Like there's many situations where you might need someone to make a phone call, right? So I'm going to kill it. I'm going to start her her mess from scratch and I'm going to give it a very simple prompt. Research me spa massage in New York for today near Manhattan.

**13:12** · Find their phone number. Okay, very simple problem, plain English. There's literally typos in there. But Hermes agent has all the tools on all the skills on how to do this and we will do it right now. So does multiple web searches. Best spa massage. Here are top spa massages. Boom. We have the phone numbers. Very easy. Took a couple of seconds. It's already asking here. By the way, want me to call any of these to confirm availability? Yes. Choose one of them and call them using Vapi right now.

**13:39** · Calling renew spa best walking availability using the appointment booking assistant with US phone number briefed for message today. Let's see this. This this is always exciting. We can actually go back to Vapi and probably see it um in our assistance. So use the appointment booking one. Let's click here and we can click on logs.

**13:56** · Check status. Now let me reload here to see what's going on. Call in progress.

**14:00** · Call connected. Conversession happening now. This crazy. I'm going to confirm that it's the right assistant in Vapy.

**14:06** · Which Vapy voice assistant is taking the call? Oh, wait. There it is. Look at this. We see it. Call ID outbound duration 90 seconds cost 5 cents. It cost us just 5 cents of VP credits to make this phone call. Let's look at it.

**14:20** · Let's click on it and see what happened.

**14:22** · We can see it right here. Okay. So, we can even play it.

**14:24** · Hi, I'm calling to check availability for a massage today.

**14:28** · Today? What time?

**14:29** · I'd like to know what times you have available. I wanted to open. You can tell me the price.

**14:33** · Great. Thank you. Could you tell me what types of massages you offer and the pricing for a 60-minute session?

**14:38** · Okay, so the call happened. Okay, call happened was 19 seconds. Uh, we need to probably fine-tune the length of responses because here it started speaking too soon and then it interrupted the lady and then the lady interrupted him. But this is a great start. Okay, as I said in Vap you can fine tune everything, how fast the response, what model we're using, the tone of voice. We can change all of that. But the call happened, cost us five cents, which is incredible cost. I mean, think how much you would have to pay a human to sit on a call, sit on a phone and do phone calls for you, right?

**15:11** · This is a huge first step. So, obviously, not every call is going to be successful. This is still highly experimental technology. I mean, we're trying to be on the cutting edge here, but this is a great start and we can actually fine-tune a lot of this. When you click here, when you click on assistant, we can improve the model. Uh, GBD 40 is very weak. I'm going to go with something faster, maybe GBD 5.4 for mini that's a much better option or even GBD 5.4 for itself it's even better here

**15:35** · temperature controls randomness u I think like 0.7 is fine all of this thing is good enough okay so I think the model setting the deep gram one let's see we have deep gram um long language English model nova 3 it's probably fine background denosing n profanity filter okay all of this looks decent let's optimize the voice maybe we can try some of the vapy voices let's see Elliot maybe we can try a female voice like Emma from Vapy speed. Uh, I think a bit slower. Maybe like one background sounds.

**16:08** · Let's try office and maybe for Okay, we don't need a fullback voice.

**16:13** · And then we can click publish and it's going to publish all these changes to the assistant. Looks good. Publish. And boom. Just like that, we've changed this assistant so that when Hermes uses it, it's going to use a better AI model and a female voice model. Maybe this will be more successful. Obviously, just like with any anything in AI, you need to fine-tune it. You need to play around with it. see what system prompt works best and yeah test it out. But honestly, this is a huge first win. The phone call happened. There were no errors and it cost us just five cents. But if you think this use case is crazy, just wait until you see what's coming.

**16:43** · Because of the MCP, Hermes can create new assistants inside of Vapi optimized for any type of use case. So for example, I can say create a new assistant inside of Vapi using the MCP. Make it about cold outreach to businesses to set appointments to get more leads. For example, let's focus on car detailing businesses in New Jersey. Create this assistant and do the first call. Plain English. Again, just prompt it in natural language and watch it do the task. It's initializing the agent.

**17:12** · It will find the MCP MCP vap list phone numbers. Boom. It checks the available phone numbers we have. Okay. It sees uh before it needs two things for me. Okay.

**17:22** · Okay. Number one, you should research that yourself. And number two, just choose the first phone number. Get to work and actually do it. I feel like in this case it didn't really need to ask me but fair enough. So what we should do is inside of VP dashboard inside of assistance we should see a new u assistant being created. There it is. MCP VP create assistant.

**17:42** · Let's see what name it gives. Top tier auto spa. Hopefully these businesses don't get too annoyed with our testing. Okay, we should have a there it is. New Jersey car detailing legion outreach. Okay. Boom. Optimized agent with a custom system prompt. You are Morgan SDR from Bright Lane generation Agency. Look at this. Hermes agent wrote all of this objection handling. Damn. Be warm, casual, confident, American English. This is not bad at all.

**18:10** · Okay.

**18:12** · MC puppy create call. It's doing a call. Okay. Wait, wait. We should see logs for this guy. No session. Okay. Nothing yet.

**18:20** · Call is started.

**18:22** · Check progress on this call. This is amazing. Like the synergy between Hermes and Vappy is insane. Call failed, never connected. Okay. Yes. Try the other number. Last time it didn't have this issue, so I don't know what's what's uh the problem here. Cool. Make sure to auto check in 30 seconds.

**18:44** · And by the way, you can run this in parallel. So you can have multiple different voice assistants on Vapi all orchestrated with Hermes to run multiple calls in parallel. So, one of them could be set booking appointments, one of them could be confirming calls, one of them could be qualifying leads. Like, whatever you can imagine, you can build.

**19:02** · It really is up to you to figure out the use cases. And I'm showing you just a couple to get inspired. But really, sit aside and think about this because the businesses that will adopt this will just crush the people who ignore it. It's that simple. The world really is turning into people who embrace AI and people who hate AI. There's like it's a it's a barbell, right? Both of these ends, there's nothing in the middle.

**19:26** · It's just people who embrace AI and they love it because they can build any app.

**19:29** · They're way more productive. They can do things like this. And then people who hate AI. It's more more like I guess left-leaning. But college students, there's just a big like, you know, artists there's a big hate towards AI and those people are just going to get crushed. I mean, it is what it is. You know, either they adopt a new technology or they're going to be left behind. I mean, you and me know that. You know, you're watching this video. So hopefully you're on the future side of the AI equation, but I'm telling you this is the landscape. It's either people who fully embrace AI and people who hate it.

**19:58** · There's nothing in between. Live now in progress. Okay, it's happening.

**20:05** · I don't know if it's a good talk because I'm in Poland in Kato. Uh if you want to join our Kata office, click the link below. We're hiring for multiple positions. But this is this good. We're calling American companies, so it's probably morning in America. the status there call is still live okay check again I want to see what's happening this is exciting anytime agent is order call this is super exciting and by the way another thing is the advantage of her mess is that you can create a chrome job so you can do these calls automatically so I can say create a chrome job that every 10 minutes calls a

**20:37** · different lead from New Jersey that is a car detailing business build a SQLite DB to keep track which businesses you've already called.

**20:54** · And literally with a single prompt, we have a outreach strategy. We have a cold outreach strategy to slowly and surely, well, actually not slowly, quickly, like every 10 minutes, right? And it's going to work 24/7. So even humans cannot work 24/7 to call every car detailing company from New Jersey, right? And it's going to build an SQLite database to keep track, okay, did I follow up with these guys? Did I already call with these guys? And you can use that context in the future calls. Like people don't realize how easy it is to build something that's truly useful, something that can grow your business today, not hypothetically in the future.

**21:26** · If you need car detailing leads or if you need chiropractors, gyms, anything like anything. This is not just from, you know, brick and mortar businesses. Like get creative. You need to call doctors, you need to call lawyers, you need to call finance firms, private equity firms, whatever, right?

**21:45** · It can do these phone calls. You can fine-tune the the system prompt and then just say here, okay, create a new chron job that every 15 minutes it rings a different um venture capital firm pitching my startup. Boom. Would you pitch your startup faster? Would you get investors faster if you build this?

**22:02** · Probably. It's like get creative with this guys. Use it for your business. Use it for something. This is truly like it's truly incredible what you can do.

**22:10** · Anyways, in the meantime, Hermes is creating a chron job to build our automated outreach system. And again, I just sent a single sentence, single sentence on what it should do. And it created SQL database. It it set up the MCP. It's created the skill chrome job, all of that because Hermes comes with like 82 pre-built skills. So, it it knows how to do this. Okay. I can actually do another Hermes and I can uh copy this uh assistant.

**22:35** · Use the Vapi MCP to check on this voice assistant and progress on most recent call. Probably could have given it just the call ID to be fair. It's really better. Here is the call ID for Vapi. So, we're running multiple Hermes in parallel which you can do very easily.

**22:56** · Oh, there it is. And the reason customer wait this insane 8 minute call. Yo guys this is crazy. 8 minute call. Okay. Is this voicemail? Please no lead to the following menu options. For operating hours press one for address.

**23:13** · Okay.

**23:13** · So it got stuck on voicemail. All right. That's that's unlucky. Okay. So here what you should do is you should go to assistant and uh update the rules. Right. If you notice voicemail just hang up. Boom. Something like this. Then I would go to model. This is definitely something we should change. Photo cluster is not good enough. 5.4 would recognize this much better. So obviously inside of Hermes, it created the skill.

**23:41** · Say I'm going to say update the skill you created for Vapi so that you always use GPT 5.4 as the model instead of GPT40. That was a mistake from Hermes.

**23:52** · it chose a worse model. So yeah, I'm going to publish this change so that we don't get stuck on voicemail in the future. Now before I show you the second VP use case, which is inbound agents, right? When you get inbound calls, let me first explain how VP actually works.

**24:06** · So VP is the system and the platform used to build AI voice agents. Basically apps that can talk to people over phone calls in real time. Now the most important elements of VP are the transcriber, the large language model, the voice model, and the orchestrator. And as you might have noticed, VP gives you all of this in a single platform.

**24:22** · Now, the orchestrator, this might be the most important one. It stops when people interrupt. It cuts out background noise. It knows when you're done talking and picks up on the mood of the people talking to your agent. Right? So, all of these are very, those are the hard part.

**24:33** · There's voice models. There's LLM from every company. But putting it all together to something that understands these nuances of phone calls, that is the hard part. not just having generated AI voice but making it into a truly useful assistant. That is what Vapi did.

**24:49** · Now to show you the second use case, you can just create Hermes and let's say you run a business that gets a lot of inbound calls. You can say I run a massage place in Katoa Poland and we get a lot of inbound calls. I want you to use the VAP MCP to create a new voice assistant for handling these inbound calls to just let them know about our availability, you know, which hours and which type of massages we offer and uh help them book and schedule stuff using our internal software.

**25:20** · I'm going to give you more context later, but just use the Vap MCP to create this new inbound voice assistant.

**25:28** · If you have a business like that, you probably are paying two, three, four people on retainer every single month to just handle the calls, right? To to handle the, you know, like secretary or to the phone call or you just deploy one VP assistant to do that 24/7 way cheaper and if you put in effort into the system prompts more reliably because again you can just customize this. You can test out different transcribers, different LLMs, different voice models, test out different opening messages, system prompts, connect it with other tools, right?

**25:57** · So, if you have your own internal software, your own API, you can connect this here. Uh, as you can see, there's many different tools here. We have pre-built, but you can also create a new tool and put in the schema and connect it to your software or maybe Zapier or NA10, whatever you use. There's a lot of possibilities. So, if you have a business that takes inbound, I would say this is non-negotiable. You abs absolutely have to do this in. Okay, this interesting. Hermes realized that we have the Polish number. It assumed that's for that and it created a new assistant. Language Polish auto switches to English. This is crazy. In 55 seconds, all of this is set up.

**26:29** · In 55 seconds, I can deploy this with inbound voice agents are here. And I showed you two use cases. Let me show you the third one. The third use case is the most impressive by far. And it uses custom tools. So inside of VP, go to left, click on tools, and here you can see a bunch of tools. A lot of them are pre-built but one is custom ask her right and this is the way you can use Hermes agent as your personal concierge.

**26:52** · So instead of Hermes delegating to Vapy Vapi can contact Hermes. So during the conversation uh let's say in a client right with a client call with a client and it needs more info about your business or something it can contact your personal Hermes agent deployed on the VPS and ask him questions and get contacts with him.

**27:09** · Maybe the Hermes agent can send you a DM in the middle of the call on discord or telegram or WhatsApp wherever your Hermes is authenticated that like yo this client is very promising he wants to talk to you directly like stuff like that right it really is insane what you can do with this and I have this tool here asks it uses angro to create the tunnel and this

**27:31** · really takes it to the next level as I told you vap is very very configurable so let's test this out I'm going to copy this uh ID of the tool switch back to the terminal I'm going to do Ctrl + C to just kill this to create a fresh herma session. I know I can do SL new, but this is cleaner. I'll say list out all uh tools, all MCPS we have with VBI. Then use this tool to ask Hermes something specific perhaps to list out its internal folder structure. Vapi get tool.

**28:04** · Okay, hopefully it gets the browser get. Okay, tools. Boom. Here's the ID. And this really fills in the last gap where if the VP assistant isn't sure on what to do during a call, it can use ask Hermes to ask your Hermes agent which can have connections to a lot more things and you know usually uses a more expensive model and has more context about you and the business to complete the request. So inside of the Vapi dashboard, I have this assistance and I have this Hermes voice coach. Here we have the tool attached. Ask her.

**28:36** · You need to give the specific tool to that specific assistant so it can use it. And we can actually talk to it, right? So we can click on talk and do a test. I need to allow the microphone. Click allow.

**28:47** · Hey, this is your AI assistant. What can I help you with?

**28:51** · Hey, um, what tools do you have available?

**28:54** · You have quite a few quite a few tools.

**28:56** · browser control, uh, terminal and file editing on your VPS, web search, vapy management, cron jobs, sending messages, memory skills, and delegating to sub aents. Want me to explain any of these in more detail?

**29:10** · I want you to ask Hermes and tell it uh what is the internal file structure and folder structure. That's really good, guys. We got the ask her tool here. It obviously takes a few seconds because it hits a VPS server. There it is.

**29:22** · VPS top level has Hermes and Waffruit on Hermes. your vap adapter and optvappy adapter plus the usual root.files. Want me to dive deeper into the Hermes folder or the adapter?

**29:34** · Really nice. So you can attach this as a tool to any of the voice assistants and it can use it during a conversation. Right. So now I'm testing it myself, but obviously ideally it's a potential client, a potential lead, maybe an applicant, whatever. There's like hundreds of use cases for voice agents.

**29:49** · But now you know how with Vapi and the tools feature you can use Hermes not only as a orchestrator because so far we've used Hermes to manage and create VP assistance right but now you can use you can do the other way where basically a Vap assistant during the conversation can call to Hermes to get you know more more context more tools more connections whatever is needed. So this really is the ultimate platform. With Vapi, you can build anything you imagine when it comes to voice agents, especially when you connect with with Hermes.

**30:20** · So again, I have to thank Vapi for sponsoring this video. And if you have a business, whether it's one that gets inbound or one that could use outbound, please start building voice agents. I don't care how you use it, you just need to start using it. Even if it takes you a couple weeks to figure out and really crack the code, get started now. Click the first link below the video. Give Vappy a shot. They have multiple different plans. So, choose the one that makes sense for you and actually build this today.

**30:43** · And as I mentioned before, if you want all of the resources from this video for the different use cases for inbound, for the different use cases for outbound, and everything else mentioned in this video, click the second link below the video. It's completely free. You'll get a bundle with everything I mentioned in this video. So go below, click the second link and grab it