---
title: "Why Your AI UX Is Broken (and It's Not the Model's Fault) — Mike Christensen, Ably"
source: "https://www.youtube.com/watch?v=YNJvm7t3yq8"
author:
  - "[[AI Engineer]]"
published: 2026-05-18
created: 2026-05-19
description: "SSE ties a response stream to a single connection. The user refreshes the page, walks out of WiFi range, or opens a second tab and the in-progress response is gone. Abort and resume are mutually exclu"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=YNJvm7t3yq8)

SSE ties a response stream to a single connection. The user refreshes the page, walks out of WiFi range, or opens a second tab and the in-progress response is gone. Abort and resume are mutually exclusive for the same reason: the only signal a client can send over a one-way pipe is closing it, so the agent cannot tell the difference between a cancel and a disconnect. Vercel's AI SDK documents this explicitly.  
  
Mike Christensen from Ably makes the case for treating the session itself as a durable shared resource, decoupled from any individual connection, device, or agent instance. Clients subscribe to the session rather than to a request, so reconnects resume automatically, any tab or device has full visibility of live activity, and concurrent agents write independently without routing everything through an orchestrator. The demo shows all of this: multi-tab sync, a forced network disconnect that self-recovers, two agents running in parallel, and a handoff to a human support agent who joins the session mid-conversation with the full interaction history already visible.  
  
Speaker info:  
\- https://x.com/christensencode  
\- https://www.linkedin.com/in/mikescottchristensen/

## Transcript

**0:07** · \[music\] Okay. Um I think it's time to start.

**0:18** · \[applause and cheering\] Uh can we start with a quick show of hands? So, who here's built some kind of AI chat app, right? Some kind of AI chat experience?

**0:28** · Okay, well, that was quick, right?

**0:29** · Almost everybody in this room, right?

**0:31** · So, this is the case where you've got some kind of chat app, you've got an agent on the back end. The user sends a message to the agent, and the agent streams a response back live to the user as it's being generated, right? And this is fundamental building block of AI user experiences. We see in every AI chat app today.

**0:48** · And first, I want to have a quick look at how this is implemented today, right?

**0:52** · So, the default pattern is to use direct HTTP streaming. So, the most popular frameworks for cells AI SDK, Times back AI, use SSE by default, server-sent events.

**1:04** · And so, concretely, what this means is the client makes a request to the agent, and it establishes a persistent point-to-point connection with the agent, and the agent then invokes the LLM, and it obtains the stream of events, and it pipes those events back to the client over the connection as server-sent events, right?

**1:22** · And this is great, right? It's really easy to get something working. But, this paradigm is kind of fundamentally oriented on the idea of a single client establishing a single connection to a single agent. And today, I'm going to make the case that that fundamentally limits the quality and the richness of the experiences that we can build in our AI products.

**1:45** · So, my name is Mike Christensen. I'm a staff engineer at Ably. Ably is a real-time messaging platform, and we build SDKs and APIs for any kind of live or interactive experience, and that includes AI experiences. And we operate our platform at real scale. So, every month, we handle traffic for more than 2 billion devices. We handle more than 30 billion monthly connections. We process more than 2 trillion API operations.

**2:11** · And over the past year, we've been speaking to engineering teams at more than 40 companies across 10 industries. And these are companies that are shipping AI agents, AI co-pilots, AI assistants in their products to millions of users. And these companies are really pushing the boundaries of what AI products can feel like, right? Because when you add AI capabilities to your product, it fundamentally changes the user experience.

**2:37** · So, these companies are exploring these new interaction models, and they're working through the engineering challenges to deliver these experiences reliably in production. And so, today, I'm going to share what we've learned by talking to these companies. I'm going to show you where the sort of direct HTTP streaming model starts to break down and why. And I'm going to share with you the emerging patterns that we're seeing many engineering teams adopt to tackle these problems.

**3:03** · So, we found that companies shipping the best AI experiences really invest in three foundational capabilities. And we think that these capabilities really separate a fragile demo from a great AI product experience.

**3:16** · So, the first of these capabilities is resilient delivery. This is about building streams that survive disconnections, right? Think about mobile. You know, you walk out of the house, your phone drops off the Wi-Fi, connects to 5G. That severs the connection, right? Or maybe the user refreshes the page, or they navigate away from the app, and they come back.

**3:35** · And what you want is that when the connection drops, clients are able to reconnect and pick up exactly from where they left off. The second core capability is about providing continuity across surfaces, right? So, users move between surfaces all the time. You know, you open the experience in a new tab, or you open it on your phone.

**3:53** · And really, the conversation session should follow you around, right? No matter which device you're using, the session should be fully in sync, including any live activity.

**4:03** · And the third core capability is about live control, right? So, the best AI products do better than a simple sequential request-response pattern, right? They let you communicate with the agent while it's working. So, think about how you use Claude code, right? You know, you can see Claude's doing something, you might send a message, steer it. You send a follow-up, you ask it to do something else. And this requires visibility into what the agent is doing, and it allows clients it requires clients to be able to communicate with the agent while it's working.

**4:34** · So, why is this hard with a direct HTTP streaming approach?

**4:39** · The root cause is because everything is coupled to a single request, right? So, if you think about that live response stream that you've got from an agent, the health of that stream is essentially tied to the health of that end client's connection, right? So, if that connection drops, stream's gone.

**4:54** · Another problem is with direct HTTP streaming, that connection is now a private pipe between the client and the agent. So, if you open the experience on another tab or on your phone, you have no visibility of that in-progress response. And a third problem is because this stream, right, isn't a shared resource, other clients and other tabs, other devices, can't communicate with the agent, can't reach the agent to interact with it, steer it, interrupt it.

**5:21** · So, a pattern we're seeing many companies adopt is to decouple the agent layer from the client layer. And many teams are doing this with a concept called durable sessions. And so, what this is is a shared resource that sits between the agent layer and the client layer, and it's a persistent and stateful medium through which agents and clients can interact.

**5:42** · And as we'll see, this makes it much easier to build resilient streaming experiences, streaming experiences that work across multiple tabs or devices, and it allows any client to interact with agents as they work. So, let's have a quick look at some examples now of where the sort of direct HTTP streaming model breaks down, and we'll see how this durable sessions idea can help us.

**6:06** · So, let's look at how you might support resumable HTTP resumable streams with a direct HTTP streaming approach. So, in this scenario, the client sends a request to the agent, and the agent starts streaming the response, and then the client's connection drops halfway through, right? And what we want is the client can re-establish the connection and can resume the stream from where it left off.

**6:26** · So, when the client's connection drops, the LLM is still working, right? It's still generating events, and these events have nowhere to go, right? So, how do you build resumes? Well, you need to store these events. You remember, you write them to an in-memory store like Redis. You need to store them with sequence numbers, so you know the order of these events.

**6:42** · And then, you need some kind of explicit resume handler on your back end, so that when a client tries to reconnect and resume, the resume handler is able to work out the exact set of events that the client missed, and replay those back to the client in the correct order.

**6:57** · And so, the problem here is that the stream is being explicitly managed by the agent. And so, the agent has to do this for every reconnecting client because, you know, their connections drop at different times, and so, each client has a different set of events that need to be replayed.

**7:12** · So, you need to build all of this complex plumbing from scratch, you know, instead of focusing on building great agents. So, how does durable sessions help?

**7:21** · So, by decoupling the agent from the client, uh you allow the agent to write events directly to the session without thinking about the health of the end client's connection, right? And simultaneously, you let clients connect directly to the session and replay events or resume the stream from the session without the agent having to worry about implementing that logic.

**7:43** · And there's an interesting problem here if you're using um SSE, server-sent events, um in particular, because there's a conflict between supporting resumability and offering live control over agents to clients. And the reason for this is that SSE is one-way, right? It's a strictly one-way pipe from the server to the client.

**8:01** · So, this comes up if you think about you want to add a stop button, right, into your into your experience, and the agent's streaming a response, you hit stop, and it cancels that in-progress generation. And so, the client has no upstream channel through which it can signal to the agent to cancel the generation, right? So, the only thing it can do is close the connection.

**8:19** · And that now creates ambiguity because what does the agent do, right? Does it allow the LLM to keep generating events and buffer these events assuming the client's going to try and reconnect and resume later, or does it treat it as a cancellation, cancel the LLM LLM, and stop burning through these expensive tokens?

**8:40** · And so, you know, resume and cancel are mutually exclusive when you're using SSE in particular, and there's some evidence for this. So, Vercel's AI SDK, for example, uses SSE by default, and their docs state that a bot is incompatible with resume functionality, and it's for this reason.

**8:58** · So, what do we need?

**9:00** · We need bidirectional control, right?

**9:02** · So, maybe we can replace SSE, we can use something like WebSockets. And that then opens up the possibility for much richer interactions where clients can interact with agents. Okay. So, we've swapped out our SSE transport for WebSockets.

**9:19** · But, as we'll see, a bidirectional transport doesn't solve all of our problems automatically, and these problems arise when you try to interact from multiple devices. So, in this scenario, uh you send a message to the agent, the agent is streaming a response, and then you open that same session in another tab, right? And so, the problem is in this second tab, you have no visibility over that live response stream, right? Because the second tab isn't the one that sent the request that invoked the agent and established the connection.

**9:48** · So, the second tab doesn't see anything, right? While that response is being streamed, there's no visibility.

**9:54** · And then, And presents a problem when we think about steering or controlling or guiding the agent from multiple tabs or devices. So, you send an a message to the agent. In this case, you ask it, "Book me a flight for next Tuesday." Agent's working on this in the background. You swap to your phone, and you have the same problem here. The phone doesn't have visibility of the ongoing work of the agent. But also, the phone has no upstream channel to the agent in order to send your follow-up request, which is, "Tuesday doesn't work for me. I need I need the flight on Wednesday."

**10:25** · There's no way to reach the agent. So, a durable sessions layer again makes this easier for us to support these multi-client experiences with live control. And we can do this because all clients can hold a persistent connection to the durable session that is always active, right? So, the connection's not just there when you invoke and initiate a request with an agent. You have constant visibility over the activity in the session through a continuously maintained connection.

**10:53** · And clients can continue to resume, right, through the session. But because the session is also a shared resource, right, and the agent has full visibility of the activity in the session as well, it means that any client can route to and interact with the agent. So, you can do this from any tab or any device.

**11:11** · And so, the final example I want to talk about is about concurrent activity, right? So, this is about multi-agent architectures. We've got multiple agents that are participating in this session.

**11:21** · And so, the pattern we've got here is the user is establishing making a request to an orchestrator agent. And this orchestrator agent is then delegating subtasks to these specialized agents, right?

**11:35** · And what we'd like to provide is full visibility of all the granular progress that these sub-agents are working on.

**11:42** · Um now, the problem here is the orchestrator is handling the user's request, right? So, we're kind of forcing the orchestrator to do two things. There's a dual-purpose role of both orchestrating the task and delegating tasks, and also proxying back these sort of granular updates from these sub-agents, right? So, this is adding a lot of complexity to your architecture when really the orchestrator only cares about the final results from these sub-agents. It shouldn't need to worry about relaying granular progress.

**12:14** · So again, a durable sessions model makes this easier. So, in this model, all agents can write independently to the durable session layer, right? So now, we don't have to flow all these granular updates through some centralized agent to provide full visibility of all the activity in the session.

**12:32** · And clients only need to subscribe to a single entity as well, right? Um they only subscribe to the session, and they have full visibility of activity from all these agents, however many there are working on the task, but also activity from other clients. And this pattern can drastically simplify your architecture.

**12:54** · So, what we've described here sounds an awful like pub/sub, right?

**13:00** · And we can build durable sessions on top of a pub/sub. So, um at Ably, we have this concept called channels, and Ably channels let you communicate. So, publishers of messages and subscribers of messages can communicate with each other, but not directly. They do this through a shared resource, which we call a channel. Um and this inherently decouples uh publishers and subscribers. So, it decouples clients and agents.

**13:26** · And Ably channels have the kind of key properties that we would need to build a durable session layer. So, they are independently addressable. So, this means that any client or any agent can connect to this session just by specifying the right channel name. They are persistent, which means the messages on the channel outlive the life cycle of any individual connection, any individual device, any individual agent.

**13:51** · And they're fully resumable, right? So, if you're a client that drops a connection, you can automatically reconnect to the channel, and all the events are delivered exactly from where you left off. So, this is how we found many of our customers have built these kind of resilient multi-surface experiences. Um to make building durable sessions even easier, we've been working on something we call Ably AI Transport. This is a drop-in layer for building this durable session pattern.

**14:21** · Um and it's a new SDK, which automatically plugs into any event stream format. So, whatever model provider or agent framework you're using, um and under the hood, it's using Ably channels to provide this sort of durable session layer, but with all the complexity of building a durable session handled for you out of the box. So, um the channel does some cool things as well, right? So, it like materializes events in the channel. So, you can stream in text chunks that are being generated from the LLM, and the channel automatically materializes that into the complete response.

**14:54** · They provide automatic resumability. They handle multiplexing, so you can have concurrent activity over the channel, and it's all fully multiplexed and handled. And it supports multi-client and multi-device fanout with full bidirectional control. Uh it also includes a suite of additional tools for building great AI user experiences. So, some of these are really important, right? Things like push notifications. If you've got an agent doing some background asynchronous work, you want to be notified when it's completed.

**15:22** · There's also things like APIs for shared or subscribable data objects. So, if you've got agents and users kind of collaborating over some shared data in real time, this is possible.

**15:33** · So, to try make some of this a little bit more concrete, I have a quick demo to show you kind of what this looks like in practice. So, this is a classic kind of AI chat interface for a AI support chat for like an electronics shop, right?

**15:49** · Um so, let's see if we can get the video. Cool. So, you know, the usual kind of features exist in this kind of conversational interface. So here, you know, the agent's making a client-side tool tool call to get the user's location. It's making a service-side tool call to show the user a list of stores in its location.

**16:14** · And we can see that this works across multiple tabs out of the box. This is because it's powered by this durable session layer underneath, and it gives all clients a shared view of the session. Now here, we've got a streamed response.

**16:26** · We can refresh the page, and you can see it's all remains absolutely automatically in sync. There is no additional agent logic to make this work, right? This just works from the client consuming and subscribing from the channel. We can even kill the the network here. So, we're forcing the client to disconnect and reconnect, and everything just carries on automatically um without any additional complexity.

**16:49** · We can also sort of interact from multiple tabs. So here, in the second tab, we've kicked off a specialized sub-agent that's going to do some product research, and we've got some granular visibility. We're going to cancel that from the first tab. So, you can from whichever client or device, you can cancel that that work. Um here, we've kicked off a product research task from one tab. Um this specialized agent is writing these events directly.

**17:15** · There's no centralized orchestrator that's managing this. Um here, the user decided, okay, they're going to purchase a pair of headphones, but at the same time, they're going to cancel their existing order. So now, you've got concurrent activity in the session. Two agents working in the session simultaneously. It's fully synchronized without all this additional coordination.

**17:38** · And now, this is quite cool, right? So, the the user here isn't happy with the the return the refund price. So, they want to speak to a human. So, we can now add another participant into this session and transfer them over to a human agent. So, we're going to open up a support agent view over here.

**17:54** · And we can see that this human support agent can has full visibility of all of the activity in that session. So, they can see the full interaction history that the customer had with the AI agent, and they can then send a message to follow on as a human participant in that session to now communicate directly with that customer. That's everything for today. Thank you very much. Please check out \[applause\] \[music\]