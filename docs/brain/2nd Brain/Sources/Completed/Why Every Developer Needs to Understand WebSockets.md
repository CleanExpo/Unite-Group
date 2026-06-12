---
title: "Why Every Developer Needs to Understand WebSockets"
source: "https://www.youtube.com/watch?v=dBkhlWUQVNc"
author:
  - "[[Nova Designs]]"
channel: "Nova Designs"
published: 2026-01-09
created: 2026-05-11
description: "❤️ PDF VERSION (For Kofi Members):  https://ko-fi.com/s/2fa85d1a39💻Code Snippets:https://www.codeslides.app/share/adb67f16a74439be9b1e3cfc0d331879Learn the most important concepts of Web Socket"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=dBkhlWUQVNc)

❤️ PDF VERSION (For Kofi Members):  
https://ko-fi.com/s/2fa85d1a39  
  
💻Code Snippets:  
https://www.codeslides.app/share/adb67f16a74439be9b1e3cfc0d331879  
  
Learn the most important concepts of Web Sockets in simple and easy manner.  
  
Ever wondered how chat apps and online games update instantly? This video provides an introduction to web sockets, contrasting them with traditional HTTP communication to explain the problem they solve. We'll explore a websocket example and discuss how they enable real-time systems, even including a chat app tutorial and code snippets for a websocket server. Learn how the web works behind the scenes with this essential communication protocol.  
  
✉️ Reach out to us at:  
novadesignscontact@gmail.com  
  
Use For Coding:  
\- VS CODE  
  
Other Assets For Editing:  
\- Pexels (Videos)  
\- Pixabay (SFX)  
\- GIPHY (Gifs)  
\- Flaticon (Icons)  
\- Code Animations (codeslides.dev)  
  
#websockets #websocket #backenddevelopment #json #js #javascript #course #tutorial #webdev #webdevelopment

## Transcript

**0:00** · Have you ever used a chat app or played an online game and noticed how everything updates instantly? Messages appear right away, movements show up in real time, and notifications pop up without you refreshing the page. That kind of behavior feels natural to us now, but it's actually not how the web originally worked. To understand why WebSockets exist, we first need to understand the problem they solve.

**0:19** · Traditionally, websites communicate with servers using something called HTTP.

**0:24** · With HTTP, the browser sends a request, the server sends back a response, and then the connection closes. That's the end of the interaction. If the browser wants more information, it has to start over and send another request. Now, imagine you're building a chat app using only HTTP. The server can't just send a message whenever something happens.

**0:43** · Instead, the browser has to keep asking, "Do you have something new?" over and over again. This approach is called polling. It works, but it's inefficient, slow, and wastes resources. Most of the time, the server just replies with nothing new, and both sides move on.

**0:57** · This is where WebSockets come in.

**0:59** · WebSockets change the rules of communication. Instead of opening and closing a connection for every message, a WebSocket creates a persistent connection between the browser and the server. Once that connection is established, it stays open. Both the browser and the server can send messages to each other at any time. No more constant asking. A good way to think about this is to compare sending emails to having a phone call. HTTP is like email. You send a message, wait for a reply, and then send another message later. WebSockets are like a phone call.

**1:29** · Once the call starts, both people can talk freely without reconnecting every time they speak. When a WebSocket connection starts, it actually begins as a normal HTTP request.

**1:38** · \[music\] The browser asks the server if it can upgrade the connection to a WebSocket.

**1:42** · If the server agrees, the connection switches protocols and stays open. From that point on, both sides \[music\] can exchange messages instantly with very little overhead. Let's look at what this looks like in the browser. Let's create a JavaScript file, and imagine this code is running inside our webpage. To create a WebSocket connection, we write code like this. Here, we have a constant named socket and a function called new WebSocket pointing to localhost:3000.

**2:07** · Notice that WebSocket is a built-in browser API, and we use the new keyword because we're creating a new connection object. This single line already does a lot behind the scenes. The browser reaches out to the server at localhost on port 3000 and asks to open a WebSocket connection. If the server accepts, the connection stays open and ready for communication. Now, how do we know when the connection is actually ready?

**2:29** · We don't want to send messages before the connection is open. This is where events come in. When the connection is successfully \[music\] established, the browser fires an open event. We can listen for that event like this. Here, we call the constant socket and use onopen to define what should happen when the WebSocket connection is successfully opened. And inside the arrow function, let's log some text. \[music\] When you see this message in the console, that's your signal that the browser and the server are now connected. From this point on, both sides can start sending messages to each other. Once the connection is open, we can send data to the server.

**2:59** · Sending a message is as simple as calling the send method on the socket object. For example, we might want to send a greeting to the server as soon as we connect. At this \[music\] point, the message is immediately sent over the open connection. There is no request and response like HTTP. The message just goes through, and the server can handle it however it wants. Next, \[music\] we need to handle messages coming from the server. This is one of the most important parts of WebSockets.

**3:26** · Whenever the server sends data, the browser automatically triggers a message event. We can listen for that event like this. Here, we use socket.onmessage to handle messages sent from the server. When the server sends data through the WebSocket, this function is automatically triggered, and the received message is available in event.data, which we log to the console.

**3:47** · The event data contains whatever the server sent. It could be plain text, JSON, or even binary data. For now, we'll keep things simple and assume we're working with text messages.

**3:57** · \[music\] Of course, not everything always goes perfectly. Sometimes connections fail, servers crash, or networks drop. That's why it's important to also listen for errors. The browser will notify us if something goes wrong with the WebSocket connection. Here, we use socket.onerror to handle errors in the WebSocket connection. If something goes wrong, such as a connection failure or server issue, this function is triggered, and the error information is available in the error object, which we log to the console for debugging. Finally, there's one more event we should handle, when the connection closes.

**4:28** · A WebSocket connection can close for many reasons. The user might leave the page, the server might shut down, or the connection might time out.

**4:37** · When that happens, the close event fires. \[music\] When you see this message, it means the conversation between the browser and the server has ended. If needed, you could even reconnect at this point by creating a new WebSocket object. Now, let's switch to the server side. On the back end, WebSockets are responsible for keeping a persistent connection open, so the server and client can talk to each other in real time. In Node.js, one of the most commonly used libraries for this is called WS. It's lightweight, fast, and doesn't hide what's actually happening under the hood, which makes it great for learning.

**5:09** · We start by importing the WebSocket library. This gives us access to the WebSocket server constructor and the tools needed to manage connections. Next, we create the WebSocket server itself. Here, we tell it to listen on port 3000.

**5:23** · \[music\] The moment this line runs, Node.js starts listening for incoming WebSocket connections on that port. Unlike an HTTP server, there are no routes or endpoints.

**5:33** · The server simply waits for clients to connect. Once the server is running, we need a way to react when a client connects. WebSocket servers emit a connection event every time a new client successfully establishes a WebSocket connection. When that happens, we receive a socket object, which represents a single open connection to one specific client. As soon as a client connects, we log a message to the console. This is just for visibility, but it helps confirm that the connection is working.

**6:00** · \[music\] If multiple clients connect, this message will appear once for each of them. With the connection open, the server can now listen for messages coming from that client. WebSockets don't use requests or routes. Instead, they work with events. The message event fires instantly whenever the client sends data to the server. The message arrives as raw data, so we convert it to a string and log it. This lets us see exactly what the client sent.

**6:23** · \[music\] In a real application, this could be chat messages, game updates, or live user actions. After receiving the message, the server immediately sends a response back to the client because the connection is already open. This happens without delay. There's no request-response cycle here. Just direct two-way communication. To really understand how WebSockets work, let's build a small but realistic example. Instead of abstract explanations, we'll create a very simple mini messaging app.

**6:52** · Nothing fancy. Just a server and multiple clients sending messages and receiving them in real time. This is the kind of pattern you'd actually use in real projects. We'll start on the server side. First, we import the WebSocket library so Node.js knows how to handle WebSocket connections. Next, we create the WebSocket server and tell it to listen on port 3000. As soon as this runs, the server is live and waiting for clients to connect. Now, we listen for connections.

**7:21** · Every time a new client connects, this callback runs, and we get a socket that represents that client. \[music\] As soon as someone connects, we log it. This helps us see activity on the server and confirm that connections \[music\] are happening. Now, here's where the messaging part starts. We listen for messages coming from that client.

**7:38** · Whenever the client sends a message, this event fires immediately. We convert the message to a string and log it so we can see what was sent. In a real messaging app, messages aren't just sent back to the same user. They're broadcast to everyone else. So, instead of replying only to the socket, we loop through all connected clients and send the message to each one. Before sending, \[music\] we make sure the client connection is still open. This avoids errors if someone disconnected. Then, we send the message to that client. Now, every connected user receives the message instantly.

**8:08** · At this point, the server is done. It doesn't care who sent the message. It simply receives data \[music\] and pushes it out to everyone else.

**8:17** · That's already a working real-time messaging back end. Now, let's move to the client side. This could be a browser, but to keep things simple, we'll use a basic HTML page with JavaScript. We start by creating a WebSocket connection to the server. When the connection opens, we log it so we know the client is connected. Next, we listen for messages coming from the server. Whenever someone sends a message, this event fires, and we receive it instantly.

**8:43** · Now, let's send a message. This could come from a form or a button, but for now, we'll just send a message manually to simulate a user typing. As soon as this runs, the message is sent to the server. The server receives it, then immediately broadcasts it to all connected clients, including this one.

**8:59** · No refresh, no polling. This same pattern is used in chat apps, live comment sections, multiplayer games, and collaborative tools. The only difference in bigger apps is structure, validation, and security. The important thing to understand is that WebSockets aren't about sending one message. They're about keeping a relationship open. Once the connection exists, both sides can talk whenever they want. I know we learned a lot of WebSocket concepts. That's why we have a PDF version of this video containing tips and tricks for all Nova Plus members.

**9:27** · Become a Nova Plus member to access exclusive cheat sheets and playbooks. Also, all the code snippets shown here are available in the description below. And if you want to create code animations like ours, you can check out Code Slides.

**9:41** · \[music\] We made this tool so developers can present their code in a better way. Try it out. It's free. We'll soon discuss more topics like this, including middleware and other \[music\] concepts, so subscribe and stay tuned. Well, that's it for now, Novas. \[music\] Thank you for watching.

**10:01** · \[music\] \[music\]