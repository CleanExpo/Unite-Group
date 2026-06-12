---
title: "Why Big Tech Doesn’t Always Use REST?"
source: "https://www.youtube.com/watch?v=KdZ3g_-hkA0"
author:
  - "[[ByteMonk]]"
channel: "ByteMonk"
published: 2026-04-22
created: 2026-05-11
description: "Thousands of APIs are running behind the scenes right now. Your phone loading apps. Payments going through. Messages syncing in real time.But here’s the truth most developers miss…👉 Not all APIs a"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=KdZ3g_-hkA0)

Thousands of APIs are running behind the scenes right now. Your phone loading apps. Payments going through. Messages syncing in real time.  
  
But here’s the truth most developers miss…  
👉 Not all APIs are created equal.  
  
Most people default to REST. But companies like Uber and Netflix don’t always use it. In this video, we break down 7 API types every developer should know and exactly when to use each one:  
  
Resources:  
\- ByteMonk Blog: https://blog.bytemonk.io/  
\- System Design Course: https://academy.bytemonk.io/courses  
\- LinkedIn: https://www.linkedin.com/in/bytemonk/  
\- Github: https://github.com/bytemonk-academy  
  
Timestamps  
00:00 Why REST isn’t always enough  
00:34 REST API explained  
01:58 SOAP (enterprise systems)  
02:44 gRPC (high performance systems)  
03:45 GraphQL (efficient data fetching)  
04:27 Webhooks (event-driven systems)  
05:14 WebSockets (real-time communication)  
05:44 WebRTC (peer-to-peer communication)  
  
https://www.youtube.com/playlist?list=PLJq-63ZRPdBt423WbyAD1YZO0Ljo1pzvY  
https://www.youtube.com/playlist?list=PLJq-63ZRPdBssWTtcUlbngD\_O5HaxXu6k  
https://www.youtube.com/playlist?list=PLJq-63ZRPdBu38EjXRXzyPat3sYMHbIWU  
https://www.youtube.com/playlist?list=PLJq-63ZRPdBuo5zjv9bPNLIks4tfd0Pui  
https://www.youtube.com/playlist?list=PLJq-63ZRPdBsPWE24vdpmgeRFMRQyjvvj  
https://www.youtube.com/playlist?list=PLJq-63ZRPdBslxJd-ZT12BNBDqGZgFo58  
  
AWS Certification:  
AWS Certified Cloud Practioner: https://youtu.be/wF1pldkQrOY  
AWS Certified Solution Architect Associate: https://youtu.be/GzomXNLFgkk  
AWS Certified Solution Architect Professional: https://youtu.be/KFZrBxSA9tI  
  
#graphql #rest #bytemonk #distributedsystems

## Transcript

### Why REST isn’t always enough

**0:00** · Right now, thousands of APIs are running in the background. Your phone checking messages, the weather widget updating, Spotify loading your playlist, but not all APIs are created equal. Some are built for speed, some prioritize security. Others handle real-time communication. Pick the wrong one, you're going to have a bad time. So, today we are breaking down seven API types that power everything from banking apps to Netflix to Fortnite, and I'll show you exactly when to use each one.

**0:28** · Let's dive in.

### REST API explained

**0:35** · Let's start with REST. The one you have definitely heard of. Rest stands for representational state transfer. It's just a pattern for how computers talk over the internet using HTTP methods. So when you open a video on my channel, Bitemunk, your app needs to fetch data.

**0:50** · It sends a get request and you get back JSON with everything about that video.

**0:56** · That's a get request fetching data. Now when you hit that like button, your app sends a post request. The server creates a new like record and updates the count.

**1:06** · That's post creating something new.

**1:09** · There is also port for updating data like editing your comment and delete for removing data like unsubscribing for my channel. Please don't do that. But here is what makes REST powerful. It's stateless. The server doesn't remember you. Every request is independent. This means you can add more servers and scale horizontally. That's why REST powers most of the internet. If you're building standard CRUD applications, create, read, update, delete, rest is perfect.

**1:37** · Mobile apps that need to talk to backend servers, REST. You're building a public API that other developers will use, REST is the standard they expect. Basically, anytime you need something simple, reliable, and universally understood, REST is your answer. Honestly, REST is your go-to for about 90% of API scenarios. It just works. Now, if REST is a casual phone call, SOAP is your formal business contract. SOAP stands for simple object access protocol.

### SOAP (enterprise systems)

**2:07** · Despite the name, it's anything but simple. Every SOAP message is wrapped in XML with strict structure, an envelope, a header, and a body.

**2:16** · Now, you are thinking this looks ancient. Why even use this? Because SOAP has built-in enterprisegrade security and reliability that REST doesn't. When you transfer money between banks, that's probably SOAP. Healthare systems exchanging patient records. SOAP.

**2:34** · Government systems. SOAP. It's heavy, verbose, not sexy. But when you absolutely need guaranteed delivery and paper trail for compliance, SOAP is your answer. Now, let's talk about speed.

### gRPC (high performance systems)

**2:46** · gRPC is Google's answer to what if we made APIs really fast. REST sends data as text in JSON, easy to read but inefficient. GRRPC uses protocol buffers, a binary format that's up to 10 times smaller and faster. Plus, gRP uses HTTP2 sending multiple requests over a single connection simultaneously.

**3:09** · And gRPC supports four communication patterns. Simple request response, server streaming with continuous updates, client streaming with continuous data upload, and birectional streaming where both sides talk simultaneously.

**3:24** · Think over your driver's real-time location server streaming, your GPS as you move, client streaming, chat messages, birectional streaming. Netflix uses gRPC internally. So do highfrequency trading platforms. So when do you use gRPC? Basically in case of microservices communication, realtime streaming or when your performance is critical. GraphQL is completely different way of thinking about APIs.

### GraphQL (efficient data fetching)

**3:49** · Here is the problem it solves. With REST, you either get too much data over fetching or need multiple API calls which is underfetching. GraphQL flips this. You decide exactly what you want in a single query. One request, one endpoint, exactly the data you need. The real magic, GraphQL APIs are self-documenting through schemas. So front- end developers know exactly what they can query without asking the back end. GitHub's entire public API runs on GraphQL. So does Shopify.

**4:19** · Netflix runs 70 plus federated GraphQL services handling billions of requests daily. Now for a completely different approach, web hooks. With normal APIs, your app constantly check for updates like walk into your mailbox every 30 seconds.

### Webhooks (event-driven systems)

**4:36** · That's polling. Inefficient. Webworks flip this. Instead of you asking, the API calls you. It's like a doorbell. The mailman rings when a letter arrives.

**4:47** · Here is how it works. You give the API service your call back URL. When something happens, the service sends a post request to your URL. Your app receives it and reacts. That's why they are called reverse APIs. Stripe fires web hooks when payment succeed. GitHub triggers them on code pushes. Shopify sends them when orders are placed. Web hooks are mainly used during automating workflows, instant event notifications, or syncing systems in real time. Web sockets are like opening a permanent phone line between your app and server.

### WebSockets (real-time communication)

**5:19** · Normal HTTP, you call, get an answer, hang up. Want to talk again? You have to call back. Web sockets keep the line open. Once connected, both sides can talk anytime instantly. Perfect for chat apps, live sports scores, stock trading, and multiplayer games. Unlike REST where clients always initiate, websockets let servers push data the moment something happens. All right, last one. And this one is genuinely wild. Web RTC. It stands for web realtime communication.

### WebRTC (peer-to-peer communication)

**5:51** · And it's not just an API. It's a complete framework that lets browsers or mobile apps talk directly to each other.

**5:58** · No server in the middle. Think about that for a second. When you are on a Zoom call, your video isn't going to Zoom server and then to the other person. It's going straight from your device to theirs. Direct peer-to-peer.

**6:11** · Now, here's the thing. This sounds simple, but it's actually solving an incredibly hard problem. Your laptop is behind your home router. Your friend is behind their router. And there are firewalls, NADs, different network configurations. How do two devices that don't know each other real IP addresses connect directly?

**6:31** · This is where WebRTC uses something called signaling. A clever three-step process involving stun servers and fallback mechanisms to establish that direct connection. It's pretty fascinating how it navigates through firewalls and NAD to make this work, but that's a deep dive for another video.

**6:47** · Once connected, WebRTC handles everything automatically. Adaptive bit rate streaming, codec negotiation, jitter buffering, all in real time with latency under 500 milliseconds.

**6:59** · So, where do you see WebRTC in action?

**7:01** · Well, every time you jump on a Zoom call or a Google meet or you're chatting on Discord, that's Web RTC working behind the scenes. Realtime multiplayer games where a single frame of lag can cost you the match. WebRTC, those browserto- browser file sharing services where you can send a file directly without uploading to its server first. That's WebRTC, too. Even live streaming platforms like Twitch are using WebRTC to cut down latency between streamers and viewers. And here's the best part.

**7:30** · It's built into every modern browser.

**7:32** · You don't need to install plugins. You don't need special software. It just works right out of the box. Now, I have done deep dives on REST, GraphQL, gRPC, all the other APIs we have covered today, but I haven't done one on WebRTC yet. the signaling process, stern and turn servers, how to actually build a video chat app from scratch. There is so much to unpack here. So, let me know in the comments if I should do a deep dive on WebRTC and actually build a video chat app from scratch. And if this was valuable, hit subscribe. I break down tech like this every week.

**8:03** · Thanks for watching.