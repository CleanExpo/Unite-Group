---
title: "How I Run My Shopify Store With Claude Managed Agents"
source: "https://www.youtube.com/watch?v=iFudHCgYULY"
author:
  - "[[Daan Jonkman | AI for Shopify]]"
published: 2026-05-10
created: 2026-05-14
description: "✅ Join the community (now free) → https://www.skool.com/spiritbird-ai-3806Claude + Shopify, but autonomous. A Claude managed agent is a Claude Code session that runs in the cloud, on a schedule, wit"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=iFudHCgYULY)

✅ Join the community (now free) → https://www.skool.com/spiritbird-ai-3806  
  
Claude + Shopify, but autonomous. A Claude managed agent is a Claude Code session that runs in the cloud, on a schedule, with the exact tools and permissions you allow, in this video I show you the full build for a real Shopify store. Every morning at 8 AM, a Claude managed agent pulls my Shopify returns, looks up each customer's history, scans for product patterns, drafts a reply for my CS team, and posts the whole report in Slack. I never press a button.  
  
This video walks you through every click: spin up the managed agent in Claude Console, lock down the Shopify access scopes (read-only, no accidents), set up the credentials vault and environment, add a memory store with your brand voice and ICP, and wire the whole thing to a free n8n template that triggers it daily on a cron. No terminal, no custom code.  
  
If you've been hearing about Claude managed agents but couldn't figure out how they're different from scheduled tasks or routines — and how you actually connect one to your Shopify store, this is the step-by-step.  
  
🔧 WHAT YOU'LL LEARN  
✅ The real difference between Claude managed agents, scheduled tasks, and routines (and which to pick)  
✅ Why managed agents are the right shape for "build me an internal app for my e-com store"  
✅ How to use guided edit to write the agent prompt without staring at a blank page  
✅ How to set up a credentials vault so each Shopify store has its own isolated keys  
✅ Why one vault per store (and how to scale this cleanly to 10 stores)  
✅ How to add Slack as a second MCP connector inside the same vault  
✅ How to lock the agent down to read-only Shopify access scopes — no accidental product updates  
✅ How to add a memory store with ICP, brand voice, and guardrails so the agent sounds like your business  
✅ How to trigger a Claude managed agent from n8n with a free template (API key, agent ID, environment ID, vault ID)  
✅ How to put the whole thing on a daily cron so it runs while you sleep  
  
━━━━━━━━━━━━━━━━━━━━  
  
🛠️ FREE RESOURCES  
🎁 n8n template → https://www.skool.com/spiritbird-ai-3806  
🎁 Agent prompt → https://www.skool.com/spiritbird-ai-3806  
🎁 Claude Console (where managed agents live) → https://platform.claude.com  
🎁 n8n → https://n8n.partnerlinks.io/ufvh0t8ecvtt  
  
━━━━━━━━━━━━━━━━━━━━  
  
⏱️ CHAPTERS  
00:00 | The Slack message my Claude managed agent sends me every morning  
00:41 | Managed agents vs scheduled tasks vs routines — when to use which  
02:43 | When a Claude managed agent actually makes sense for an e-com store  
04:01 | Building the managed agent — where to start in Claude Console  
04:30 | Using guided edit to write the agent prompt  
05:13 | The exact instructions — Shopify orders, customer history, Slack output  
06:49 | Setting up your credentials vault — the step nobody explains  
08:47 | Adding Slack as a second connector inside the vault  
09:15 | Creating the environment your agent will run in  
10:33 | Locking down Shopify access scopes so the agent can only read  
12:02 | First test run — triggering the agent from inside Claude  
13:18 | Adding a memory store for ICP, brand voice, and guardrails  
14:46 | Running the agent in a session and reviewing the Slack output  
16:35 | Why Claude managed agents need n8n to run on a schedule  
17:06 | Wiring up the API key, agent ID, environment ID, and vault ID  
19:40 | Publishing the workflow and firing the first scheduled run  
20:38 | What this looks like in practice every morning  
21:03 | Where to go deeper — Skool community and weekly calls  
  
━━━━━━━━━━━━━━━━━━━━  
  
Want this set up for your Shopify store, or need help wiring it into the rest of your stack (Klaviyo, Meta Ads, Google Ads, Airtable)?  
  
🤝 Join the free Skool community → https://www.skool.com/spiritbird-ai-3806  
👋 Connect on LinkedIn → https://www.linkedin.com/in/daan-jonkman/  
✅ Want to work together? → https://calendly.com/daan-spiritbird/discovery-call

## Transcript

### The Slack message my Claude managed agent sends me every morning

**0:00** · This Slack message I receive every morning at 8:00 a.m. because I instructed a managed agent, it's a Cloud Code session in the cloud, to pull my orders, pull my returns, my requests, and based on that, it will scrape, "Okay, did this customer order before?

**0:16** · Is this an important customer to us?"

**0:19** · And then it will synthesize all that data.

**0:22** · And based on that um report, it will categorize it, what is important for us, what a suggested reply is to this customer, and a suggested fix, and then my customer support team can only approve or deny this.

**0:38** · And then it will send to the customer.

### Managed agents vs scheduled tasks vs routines — when to use which

**0:41** · And this was a managed agent. We also have scheduled tasks, we have routines, and I will all tell you all about the difference between this, when to use what, how to use it, and we'll also set up a managed agent step-by-step together, so you have this running for your own store, and you also understand the thought process behind this, so you can create other agents for your business, and you now understand the concept of it.

**1:08** · So, let's dive straight into it.

**1:10** · Okay, let me shortly tell you about the differences between those managed agents, scheduled tasks, and routines.

**1:18** · The managed agent, that is only in the cloud, so not locally on your computer.

**1:24** · It needs to be triggered via an API call.

**1:28** · And if it doesn't make sense yet, just stay along, it's will make sense.

**1:33** · Cloud Code Work is in the desktop app, and it will only run local. It is not in the cloud.

**1:39** · \[clears throat\] And Cloud routines are either local and in the cloud. And we have a built-in scheduler. So, that's the biggest difference. And \[snorts\] this managed agent is only in the cloud, and needs to be triggered by an API. And to schedule this, we have to put it in N8N, a automation platform. And we cannot do this on our subscription account. It is only via API calls or API billing.

**2:13** · But we have more flexibility. It can connect to any MCP server and we can allow certain things in that MCP server and we can disallow things. Well, that's with cloud routines, we just give it access to the MCP and it can do anything. So, we have to rely on a system instruction to only read things or never update things. Then we have to trust on the AI to listen to that system instruction.

**2:42** · And yeah, managed agents are best for uh when you want to build an own app with specific use cases in there. Let's say you want to build a operating system for your e-com company. You want to have a button to analyze your your returns of the last day. And then you just press that button and that managed agent will be triggered. That's good use case for managed agent.

### When a Claude managed agent actually makes sense for an e-com store

**3:11** · A good use case for co-work schedule task could be uh give you a morning briefing based on an Obsidian second brain that you have connected. So, it works in a specific folder. It needs to access that folder. So, your computer needs to be on and your files are stored locally. So, that's good use case for co-work schedule tasks.

**3:32** · And a good use case for cloud routines could be pulling out your Google Analytics data, pulling out your meta ads for you and save that in your GitHub repository or in your Supabase database. Yeah, but you don't have that flexibility of allowing certain things in the MCP connector. So, yeah, you only want to give it access to MCP connectors that cannot harm your business. Because we don't have that option yet.

### Building the managed agent — where to start in Claude Console

**4:03** · So, that's the difference between those three things. Now, let's dive deeper into the managed agent and how we can actually set this up for our own business. What we first do, we go to this website. It's also in the description down below. platform.entropic.com/dashboard And on the left side here, we see the managed agents tab. When we press on the tab agents, we can press new agent. And here we see the configuration.

### Using guided edit to write the agent prompt

**4:33** · But, we also have a cloud interface that can help us set up this agent. We press on the three icons here, and we press guided edit. And in this case, we're going to recreate the return analysis agent. So, here we can type I want to create a new agent, and this is what the agent will do, and what the agent is about. And this prompt, by the way, it's also in the school community that it's free.

**5:03** · You have this free resource where you can just clone this. So, you can get started with the same agent that we're building here. So, you can just copy and paste this. And here we tell it what the instructions will be. So, pull the Shopify orders, look up the customer's history.

### The exact instructions — Shopify orders, customer history, Slack output

**5:21** · Then, we can do this step if you have familiar products, products that also other people sell. It can conduct a web research. It will scan for complaints that are recurring that other people have as well. But, in my case, it's pretty niche um product. So, I will delete this. And then post the analysis into my a channel. More on this later on how to connect this.

**5:49** · And then a clear call out mark as escalate so the customer support team knows what to pick up and what has priority. So, we'll send this off and now Cloud will write the code for the managed agent. And additionally, I wanted to add my Google uh my Gmail to this to also see if there were any previous conversations with this same customer. But for some reason Google has problems with connecting via MCP inside of Cloud.

**6:22** · So, we had to break out this step, but it will probably be fixed in the future. So, that's also a nice add-on to have your previous conversations if that's uh the case. It also understands the yeah, previous messages and it will have a better persona of this specific customer. And now it will ask us what fault we want to use.

### Setting up your credentials vault — the step nobody explains

**6:49** · Let me quickly show you how you can set up those faults because that's a necessary step. If we want to create an agent, we have to create first a fault where we store the credentials in. And we can create multiple faults for specific use cases so we keep it safe and concise.

**7:05** · So, let's create a new fault and call this And as we can see there are no credentials in here yet. So, now let's add our Shopify in here. We don't have to name it, that's optional. We press on MCP server here. We type in Shopify and since it's a native connection now, we see it. We don't have to clone the GitHub URL anymore.

**7:31** · And here we press I acknowledge that I'm authorized to um and that I'm responsible to use this credential. And And we press connect. It will open the browser. We select the store that we want to connect. And it's important to note normally with the connector we can connect multiple stores. As you can see, it's set up now. But what I was saying, inside of Co-work, we can add multiple stores in our MCP connection.

**8:07** · But in this case we have to create a vault. And we can only add one store in here. So we should have to create multiple vaults. Let's say you have 10 different stores. I suggest you to create 10 different vaults, each with a specific store in there, and name your vault the name of your store. So you keep track of when you are creating a managed agent, you give it a vault.

**8:35** · And this vault will identify what your managed agent has access to. So you keep track of the stores and the vaults. You keep them separate. You have the overview. So when we have installed Shopify, I also want to install Slack in here. So we also add this connector.

### Adding Slack as a second connector inside the vault

**8:56** · We agree again.

**8:58** · Open up the browser. You select the right workspace. You click connect. And now it is also connected. So we have the two main things that we need to connect for this managed agent. And then we also have to go to environments. We have to create a new environment, and let's call this test YouTube as well. And we have pressed in the cloud. For networking I will add unrestricted. So we don't have issues in the future.

### Creating the environment your agent will run in

**9:40** · We save the changes. And now we have set up the credentials vault, the environment, and now we can actually configure our agent and connect the agent to those two things, to the environment and the vault. Let's go back to our agent that we were setting up. So now that we have installed the environment and the credentials vault, let's recreate the agent. And now we can see our new vault here. So let's take this one.

**10:18** · And here again the message, I'm authorized to use this vault. Let's keep refining for now. Because we want to give it specific access. Now we connected the Shopify MCB, but we have to rely on this system instruction to only read things and not update my products or create discounts or whatever. So that's why we can select those access scopes. Let me quickly show you.

### Locking down Shopify access scopes so the agent can only read

**11:00** · Here in Shopify in the Cloud Desktop app, we have access scopes. We can manually select what we want to block, what we want to ask permission. But natively it's all on our always allow. All right, so here we give it access to read things. It can read everything. We can also narrow this down to only refunds or get uh customers.

**11:28** · But in this case it could be beneficial to also list the orders. What did the customer order before?

**11:34** · So, and then for the right tools, we will turn it off. We disallow it. And now Claude will add this in the code, and we I also tested this before, and it cannot update a product via this way. It doesn't have access to it. So, this is the extra safety step to make sure we can uh deploy our managed agent peacefully.

**12:01** · And as you can see here now, it added the configs manually, and it selected always allow for the things that it added. So, now we're ready to test the agent. We can press test run here. We need to select the environment that we created. And then we click test run. As we can see, it spun up the session. So, now it will wait for our first message. We have to trigger it in here.

### First test run — triggering the agent from inside Claude

**12:36** · We say, "All right, let's run the refund analysis, and let's give me the output in Slack." And here we can see the logs. So, as we can see, it's running now. It will pull the Shopify refunds. You don't have to understand this, by the way, but you can just see the log what is happening here, what the agent is doing, what tools it is calling. It found the Slack channel.

**13:09** · As we see, this is the Slack channel currently. There's nothing in here. So, the agent should output it in here in different messages, because it can be long, and it has to divide it into sections. So, I quickly want to show you another thing. Here in memory stores on the left, we can add more context about the business. And let's say our privacy policy, our terms and conditions, the ICP, customer voice, you name it.

### Adding a memory store for ICP, brand voice, and guardrails

**13:39** · And \[snorts\] you can create this memory store. You just upload your files in here or the text. And then we have something like this, customer voice, guardrails, ICP, positioning. And then we can add this memory store into a session. We can create a new session. When we select the YouTube test environment that we just created, we will see the MCP tools here. And set inventory is always deny.

**14:11** · But run analytics query always allow. So we can see that the agent has added this into the vault, and the vault we connect to this session. And what we can also connect to this session is the resources, and here we select memory store. We select the memory store that we created. Can give it right or read access. Let's keep it at read only.

**14:38** · And here we can tell a short instruction. This is more context about our business. So we can create this session and so we need to authorize um then we give it access to the vault, and then we create the session. And this session can be triggered whenever we want. So we can use our agents inside this session. As you can see here, it has the daily report, nine return processes, product alert.

### Running the agent in a session and reviewing the Slack output

**15:18** · Apply in here.

**15:21** · So we see the details about this um summary. So, this is important customer and here's suggested draft message. And additionally, we can also connect a new agent in here in this Slack channel. We can add a button in here. Send as draft or deny. So, we can automate it even further. But in this case, just showing you the power of what's possible. And I also have a school community where we go more in-depth.

**15:55** · Um I'm creating courses in there to help you set up this step-by-step. And we also have a Q&amp;A where you can ask your questions. And there's also more people in here who are always also more technical, so they can also help you out with this. So, if you're interested in it, that's the first link in the description. So, the customer support agent can just copy this.

**16:18** · It can send this via email if it approves with the suggested fix. And these managed agents are not on a schedule like with routines. We have to do an extra step for this. And I created a template that you can reuse.

### Why Claude managed agents need n8n to run on a schedule

**16:41** · We are in a automation platform called n8n. You might already know it. And if you don't, this is just a automation platform. To get this file, you can download it in the free resources. You press on these three icons. You press import from file. And here you upload the file that you just downloaded, and it will clone it, as you can see.

### Wiring up the API key, agent ID, environment ID, and vault ID

**17:06** · So, when we open this tab, the set variables settings, we need to add a API key in here, a agent ID, the environment ID that we created, vault ID, and a text message. So, what we send to this Cloud Code session might look complicated, but I'll walk you through every single aspect. So, first the Entropic API key. When we go back to Cloud Console, we click on the icon, we press manage, then we press API key.

**17:41** · And never share your API key with anybody. For this use case, I will create one and will delete it afterwards, so I can just show you how this looks. Let's call this YouTube test. And here you see your API key. You only see this once, so save it. And we will paste this in here. That's our Entropic API key. Then the agent ID. We go back to your agents, the managed agent that we just created.

**18:14** · And here we see ID. And here we see a copy button. We copy the agent ID. We paste it in here. And then we need the environment ID. We created the environment with our brand context added to it. And now we just have to copy the ID again. Also on this side. Copy and paste it. Then the vault ID where we stored the credentials with the specific access scopes. So, we go to the credentials vault.

**18:56** · And we see the test vault YouTube here. We copy the ID. Go back to n8n. And we paste it in here. And this text message, that's not as important. It will just send this when we fire off the um agent. And the agent should already have the instructions in here. But, we can say run this daily.

**19:24** · Return and analysis now. Pull the Shopify returns from the last 24 hours and output in the Slack channel. You do need to add your correct Slack channel name if you want to use the same setup. So, now we have everything. We just publish it.

### Publishing the workflow and firing the first scheduled run

**19:44** · We save it.

**19:47** · And delete this.

**19:50** · And when you have saved this, it will be triggered on a cron. This one is at 8:00 a.m. every morning. We can also manually trigger it by clicking it. So, let's test this um setup and let's see in the back end if it's running.

**20:09** · It should run.

**20:11** · So, as we can see, it's saved the credentials. It created the session and it will send the message to the session. To the agent, I mean. Here, we should see that the session is currently running. So, this means that our agent is being triggered again. And we should see in 5 minutes in Slack the new report.

### What this looks like in practice every morning

**20:38** · So, once you have set this up, it will run in the back end. And the only thing you need to do is to check your Slack every morning and to execute on what's in there. So, this just to show you the power of what's possible with these managed agents.

**20:57** · And if you want to know more about this and also about the routines and how you can set this up, you might want to join my school community. We also have the weekly calls in there. So, if you have any questions, you can also drop it in the Q&amp;A. Hope you got value out of this. And also, if you have a quick question, just drop it in the comments here.

### Where to go deeper — Skool community and weekly calls

**21:19** · See you. Good luck. And set this up for your own store. Because once you see the power, you'll be addicted to it.

**21:26** · Ciao.