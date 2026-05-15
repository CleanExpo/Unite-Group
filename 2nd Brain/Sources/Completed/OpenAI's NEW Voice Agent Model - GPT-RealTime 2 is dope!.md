---
title: "OpenAI's NEW Voice Agent Model - GPT-RealTime 2 is dope!"
source: "https://www.youtube.com/watch?v=FPp7u8F6E9Y"
author:
  - "[[1littlecoder]]"
channel: "1littlecoder"
published: 2026-05-08
created: 2026-05-08
description: "OpenAI introduces three audio models in the API that unlock a new class of voice apps for developers. With these models, developers can build voice experiences that feel more natural, respond more int"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=FPp7u8F6E9Y)

OpenAI introduces three audio models in the API that unlock a new class of voice apps for developers. With these models, developers can build voice experiences that feel more natural, respond more intelligently, and take action in real time:  
  
GPT‑Realtime‑2, our first voice model with GPT‑5‑class reasoning that can handle harder requests and carry the conversation forward naturally.  
GPT‑Realtime‑Translate, a new live translation model that translates speech from 70+ input languages into 13 output languages while keeping pace with the speaker.  
GPT‑Realtime‑Whisper, a new streaming speech-to-text that transcribes speech live as the speaker talks.  
  
  
  
  
❤️ If you want to support the channel ❤️  
Support here:  
Patreon - https://www.patreon.com/1littlecoder/  
Ko-Fi - https://ko-fi.com/1littlecoder  
  
🧭 Follow me on 🧭  
Twitter - https://twitter.com/1littlecoder

## Transcript

**0:00** · Open AI just launched the most impressive real-time voice model to build voice agents. They've launched three different models. One is a real-time voice model. The second one is a real-time translation model. And the third one is a real-time transcription model, the Whisper model. And all these three models are impressive, but the most impressive part here is the latency.

**0:19** · Today, I'm really excited to share a new model that we're This is GPT real-time 2, the first model in Open AI's GPT 5 family that can do real-time communication. So, it's a bidirectional duplex communication. You can talk to it and it can talk back to you. Today, Open AI announced three different models that is fundamental for any voice agent. One is GPT real-time 2.

**0:50** · This is a bidirectional duplex model that can also think. This is a GPT 5 class model but that works real-time and it is voice. You can speak to it it can speak back to you. And then second one is GPT real-time translate. You can speak to it in one language and it can translate and speak back to you in another language. And the third one is GPT real-time Whisper. Everybody knows Whisper is probably one of the most popular transcription model and Open AI has put it on real-time use cases. So, you can have real-time transcription.

**1:19** · All these three models are available on API right now for you to use it. Before we go to the API playground and see these models, we'd like to quickly show you a demo that Open AI has put together. This is GPT real-time 2 on the documentation. I'll link it in the YouTube description. You can go there and click start session and start talking to it. And whatever I'm going to show you is real-time. I'm not going to edit it so you can understand the latency and everything. So, start session.

**1:44** · It's going to take a couple of seconds to connect first.

**1:47** · Hey, how are you doing?

**1:50** · Hey, I'm doing great. Thanks for asking.

**1:52** · How about you? Uh I had a terrible day to be honest.

**1:57** · I'm really sorry your day has been so rough. I can feel so heavy.

**2:01** · Uh no, no, no, that's okay. That's okay because a player that was supporting in chess, he lost. That's only reason.

**2:12** · Ah, that's frustrating.

**2:14** · When you're rooting for someone, it feels like you lose, too. You can see that there is a bit where the latency was slightly increased, but it is still, you know, you can like literally talk to it. You can use it for a lot of different use cases. In fact, one of the use cases that they have highlighted here, if you go to the bottom of this, they have mentioned about a company Bolna.ai. It's a company from India basically building voice agents. It's like Waze API. So, there are a lot of these companies, they would ultimately end up using this particular model GPT Real Time 2 to build softwares and applications and agents on top of it.

**2:44** · In fact, OpenAI has decided to highlight three different, most importantly, three different use cases with what you can do with this. First one is voice to action. Let us say you want to do tool calling. For example, I can say, "Open Maps and search how to go to Bengaluru." Then, you can have a voice to action where the voice is the input, and based on that, some action is going to be taken.

**3:11** · For example, it could be opening an application, doing shopping, you're in car, you want to do scheduling of tools, like set a timer for 10 minutes. So, you can do all these things. This is the first family of use cases. The second family of use cases is system to voice.

**3:25** · So, you've got a bunch to do, and that system is responding back to you in voice. And the third one is what we saw as a demo, which is voice to voice, which is probably the most interesting demo I would say. I don't know how many of you are old enough to remember that a couple of years back Google launched this Duplex feature on Google Pixel phone. I mean, it is still not reached India.

**3:46** · Like I've got an old Google Pixel phone, but in the US, Google said like this is going to be the future. You can talk to an agent. the agent can talk back to you in the real-time speed, and this is like literally we are witnessing the future here because OpenAI's GPT real-time 2 endpoint literally lets you do it programmatically. You can build softwares on top of it. Now, what are the benchmarks? If you see the benchmarks in and itself, the new model is much better than GPT real-time 1.5.

**4:13** · The previous model GPT real-time 1.5 scored 81.4% on Big Bench, but this model has scored with high thinking. It's got like thinking levels. So, there is a medium, there is low, there is high, and with high thinking this has scored 96.6%.

**4:29** · So, that is almost like 15 percentage point increase. On audio multi-challenge instruction following, this model has scored 48.5% while the previous model scored 34.7%. Once again, we have seen almost like 15 percentage point increase in both the benchmarks. While this is very interesting, you can actually go see the comparison between how these two models differ, like the drastic difference between the previous model and the current model. Let us take uh alphanumerics for an example. So, you have here, before you pull the account, read back the exact order ID.

**5:00** · I'm about to give you. My order ID is RET-620A-9C2. So, I'm going to start with GPT real-time 1.5. Got it. Your order ID is RET-620A-9C2.

**5:19** · RET-620A-9C2.

**5:23** · So, you can see it exactly follows the instruction as it is and then reads as it is. And even the tone and expressiveness, let me play this for you. I'm really sorry you're going through this.

**5:32** · The next step usually involves your insurer reviewing the claim. I'm really sorry you're dealing with this. Let me walk through what typically happens next in a calm, clear So, as you can see here, there is a massive difference in tonality, the prosody, the way it reads numbers, it is a huge improvement in terms of simply text-to-speech, but also it's a real-time endpoint, so it is doing great. And like I said, there are like other two endpoints you can go read about it more.

**5:58** · So, one is Whisper for transcription, the other one is the translation endpoint, which is a real-time translation as well. So, if you want to use it, you can go to the playground platform.openai.com/audio.

**6:11** · They've got a playground specifically for real-time models. So, you've got real-time and text-to-speech. I'm going to start with just real-time. So, if you go to text-to-speech, you can see a bunch of models, but we are more interested in the real-time model. So, I can like create a real-time prompt here. You have got a bunch of examples. Let us start with a language tutor. So, I can enable the mic access.

**6:33** · Start the session.

**6:38** · Hey, how are you doing?

**6:42** · Hi there.

**6:43** · I'm doing well, thanks. Before we dive into Spanish, I'd love to know about your current level and what goals you have. Are you a beginner, intermediate, or advanced learner? And what would you like to improve? Um conversation I have zero skills in uh Spanish. Uh the only thing I know to say is gracias. Got it. It sounds like we're starting from the very beginning. That's great.

**7:06** · We'll build step by step. Vamos a empezar. We're going to start with a simple greeting. Listen to me first. Hola. Hola. means hello. Hola.

**7:21** · Hola.

**7:23** · Muy bien. Your pronunciation of hola was clear and understandable. Okay, as you can see that this model is the latency is perfectly good. Like, you can embed this model, connect it with a Twilio phone number or something, and then you can put this behind a voice agent, and this model would do a pretty good job. Here, you can go there and then select different models as well.

**7:42** · You've got a bunch of real-time models available, but the latest one, most important one is GPT real-time 1.5. GPT real-time language translation is also very impressive. And if you want real-time transcription, you can use the real-time whisper endpoint. Overall, I think this is an excellent release. OpenAI has actually really nailed it.

**8:01** · And in my next video, I would love to build an application, a SaaS mini SaaS kind of an application on top of this endpoint and then show you the code as well. How you can do something using this new real-time voice endpoint, so the GPT real-time 2. Let me know in the comment section what you feel about it.

**8:17** · And if you have used other real-time endpoints, like for example, the Gemini real-time endpoint, let me know how do you think this compares with that. But otherwise, this is a very impressive release from OpenAI. I'm impressed. See you in the video. Happy prompting.