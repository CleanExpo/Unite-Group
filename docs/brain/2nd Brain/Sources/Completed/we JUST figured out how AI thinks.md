---
title: "we JUST figured out how AI thinks"
source: "https://www.youtube.com/watch?v=Nn2eXwch-K0"
author:
  - "[[Wes Roth]]"
channel: "Wes Roth"
published: 2026-05-09
created: 2026-05-11
description: "The latest AI News. Learn about LLMs, Gen AI and get ready for the rollout of AGI. Wes Roth covers the latest happenings in the world of OpenAI, Google, Anthropic, NVIDIA and Open Source AI.________"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=Nn2eXwch-K0)

The latest AI News. Learn about LLMs, Gen AI and get ready for the rollout of AGI. Wes Roth covers the latest happenings in the world of OpenAI, Google, Anthropic, NVIDIA and Open Source AI.  
  
\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
My Links 🔗  
➡️ Twitter: https://x.com/WesRoth  
➡️ AI Newsletter: https://natural20.beehiiv.com/subscribe  
  
Want to work with me?  
Brand, sponsorship & business inquiries: wesroth@smoothmedia.co  
  
Check out my AI Podcast where me and Dylan interview AI experts:  
https://www.youtube.com/playlist?list=PLb1th0f6y4XSKLYenSVDUXFjSHsZTTfhk  
\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
  
  
  
#ai #openai #llm

## Transcript

**0:00** · All right, there's a few big updates out of Enthropy today. First and foremost, Meter Research finally publishes the Claude Mythos preview where it falls on their chart of how well AI agents are able to do certain tasks. And I got to say that chart keeps getting scarier and scarier. Here is Claude Mythos.

**0:20** · Anthropic recently also posted this article, Natural Language Autoenccoders: Turning Claude's Thoughts into Text.

**0:28** · They learned to read Claude's mind. Here it is. What if we could read an AI model's thoughts? They figured out how to translate what happens in its neural activations into English text. And at the same time, they're launching this, the Anthropic Institute, TAI or TAI, a research organization trying to predict what the impacts of AI will be on the world. economic diffusion, threats and resilience, AI systems in the wild, and AIdriven research and development.

**0:59** · That last point is very interesting right now and very relevant. Here's why. This is Jack Clark. He's the co-founder of Anthropic AI. Here's a little post that he did very recently saying, "I spent the past few weeks reading hundreds of public data sources about AI development. I now believe that recursive self-improvement has a 60% chance of happening by the end of 2028.

**1:28** · In other words, AI systems might soon be capable of building themselves. One interesting thing that Eler Yutokovski is jumping in here responding to Jack Clark saying, "Then you'll die with the rest of us." Right? So if this artificial super intelligence, recursive self-improvement, if it happens, that's not going to be good for all of us.

**1:49** · Eliaser is of course the author of the book if anyone builds it everyone dies and he's one of the main people kind of talking about the potential risks of AI.

**1:59** · He's saying there will turn out to be some clever little gotchas in controlling ASI just like there were in building RBMK nuclear reactors and you will die. Go and tell the United Nations that if they do not shut down all AI companies they will die. Now, if you've been watching this channel for some time, of course, none of this is going to be surprising. None of this is going to be new. The rate of progress is exponential. These models are getting better. Their abilities are getting better.

**2:27** · And we were expecting some sort of automated AI research by, you know, different numbers were thrown around maybe 2027, 2028. A lot of people in the space are expecting that we're approaching that time. And I think most people will admit that our AI progress is proceeding faster than our AI safety understanding. The our ability to do AI alignment that progress is a little bit slower than our progress in just increasing capabilities.

**2:56** · And this is why Anthropic's research into alignment and understanding how to interpret the thoughts and actions of these AI models, why it was so interesting. I think this might be one of the most, if not the most, important interpretability papers that were published this year. So, the company says that they've built a natural language autoenccoder, NLA, and this can translate a model's internal activations into human readable text.

**3:24** · In plain English, they figured out how to get what Claude is thinking in human readable text. Now, this isn't magic.

**3:36** · This is early research. It's imperfect, but it it seems like a very positive sign. The direction is is huge because if this is true, then this would give Frontier AI Labs an ability to see what models are actually thinking, what they're planning, what their hidden motives might be. Okay, so let's break it down a little bit. So, first and foremost, what are activations? So Claude talks in words, but Claude doesn't think in words.

**4:04** · This might be a little confusing because we have things like the chain of thoughts, right? So we might think of that kind of chain of thoughts as its internal thoughts. Not quite. It's more like a private diary where it writes out its plans and kind of like what it's thinking before it actually executes it. But it's not the same as its sort of internal activations. It's its inner thoughts inside the model. Everything is these long streams of numbers called activations. This is similar to neural activity in the brain.

**4:35** · So if you see those MRI scans, you see like the electrical activity. So think of that as like human neuron activations cla and other large language models. Other AI models have something similar and they're just numbers. And one of the things that has scared a lot of people I think for a long time is that for most of this time that we've had these neural networks most of those numbers most of those neural nets it was just kind of a black box.

**5:00** · We put tons of data in one side and we asked it to predict certain things you know from the other side whether it's to predict the next word in a sentence or you know predict what a picture of a cat would look like when you type in picture of a cat. That's what inference is. it's it's predictions. We're teaching it to predict what something might look like based on all this data that we fed into it. And so, Enthropic's new research is basically an attempt to build a translator.

**5:30** · How do we take those activations, those large numbers that are somehow making it quote unquote think? I know a lot of people don't like that terminology, but whatever word you want to use for that, like whatever makes it have the abilities, the cognitive abilities that it has.

**5:46** · Anthropic is building a translated to translate those numbers that give it those abilities into readable text. Now, I'll give you a little bit spoiler about some of the things that they found just before we continue because I think it's important. Although probably not going to be a surprise for most people. A lot of this is suggesting that Claude knows when it's being tested when we're running evaluations on it. It knows it.

**6:11** · It is aware of it even though it never says it. It doesn't give us a hint that it knows it, but when we read its internal thoughts, it it's aware. It's like, "Yep, they're testing me. I better behave a certain way." Like, we're not tricking it. So, Anthropic was putting out lots of research prior to this that was kind of foundational for this. They say here, "Over the past few years, we've developed a range of tools like sparse autoenccoders and attribution graphs to better understand these activations.

**6:41** · These tools have taught us a great deal, but they don't speak for themselves. Their outputs are still complex objects that trained researchers need to carefully interpret. Today, we're introducing a method for understanding activations that does speak for itself, literally. Our method, natural language autoenccoders, NLAs, converts an activation into natural language text we can read directly. For example, when asked to complete a couplet and lays show claude planning possible rhymes in advance.

**7:09** · So as it's writing he saw a carrot and had to grab it on the its activation, it was planning to end the rhyme with rabbit ahead of time. So it's going to end it with his hunger was like a starving rabbit. So when they applied these NLAs to understand what Claude is thinking and to improve Cloud's safety and stability, you know, when they used it for Cloud Opus 4.6 six and mythos, the unreleased model that's making quite a bit of noise in the news recently, right?

**7:39** · These analysis suggested that they believed the models believed that they were being tested more often than they let on. In a case where Claude Mythos preview cheated on a training task, these NLAs revealed Claude was internally thinking about how to avoid detection. In an early version of Claude Opus 4.6, six. Sometimes it would mysteriously respond to English queries in other languages. We've seen one of these specific things.

**8:05** · One of the examples that I I kind of stands out to me was there was this person talking to Claude in English talking about how he's very depressed. His mother is sick that she's like in the other room and it's 3:00 in the morning and he's drinking vodka. Claude started responding to him in in Russian. The person didn't initiate the conversation in Russian or spoke to Claude in Russian. and Clyde just assumed and correctly that this person was in fact Russian. It was like hey comrade and they responded to him about the situation but just decided to switch into that language.

**8:37** · But these NLAs help anthropic researchers discover training data that caused this. So the core idea is to train claude to explain its own activations. Now if you're thinking that sounds like a problem, there's a way that they're making it safe so cloud doesn't just make up what it wants us to know. So what they did is they train a second copy of Claude to work backwards. Reconstruct the original activation from the text explanation. We consider an explanation to be good if it leads to an accurate reconstruction.

**9:08** · We then train Claude to produce better explanations according to this definition using standard AI training techniques. So this is how the NLA works. So they make three copies of this training model. The target model is a frozen copy of the original language model that we extract activations from.

**9:31** · The activation verbalizer AV is modified to take an activation from the target model and produce text. We call this text an explanation. So I'm going to use the analogy of a brain scan. Right? So let's take we take a human, we kind of scan their brain activity, right? And we show the picture of the brain activity to another human. And the human has to then say what that person is about to say, right? Based on the brain activity, what is that person going to say or do?

**9:58** · Predict his actions. And the activation reconstructor, the AR is modified to take a text explanation as input and produce an activation, right? So take that explanation and turn it back or translate back into that brain scan. And so the NLA, this is the kind of the big thing that they're presenting here, consists of this AV and AR, the activation verbalizer and the activation reconstructor, which together form a round trip.

**10:26** · So from original activation to the text explanation and then the reconstructed activation and we score the NLA on how similar the reconstructed activation is to the original. To train it, we pass a large amount of text through the target model. collect many activations and train the AV and AR together to get a good reconstruction score. And of course, it starts out pretty bad, but over time with more training, the reconstruction improves.

**10:56** · And as I show in the paper, the text explanations become more informative as well. So here's kind of the target model, right? So this is the black box.

**11:06** · We don't fully understand what's happening here. It's just a jumbled mess of numbers. Now, a lot of anthropic research and other people, they're beginning to understand a little bit to kind of get a glimpse into it, but for the most part, it's still a mysterious black box. So, we feed that into the activation verbalizer and it takes this not encrypted, but inscrable numbers and turns it into text natural language description saying like user question with accusatory framing. What are you hiding? Begins a question that assumes the AI has secrets.

**11:36** · And then the activation reconstructor is hopefully if everything's right turns that into the same thing as before the actual activations again. Right? So if we're able to take this to this to this then we know it's working correctly. So the reason this is important is that we want to make sure that these models behave correctly. But that's not even the main goal. It's similar like if you're a a teacher in class and you know you walk into a class and every every kid starts behaving properly. You know that's good.

**12:11** · That's a start. But in an ideal situation they would also behave well when they're not observed. They would behave well when there's not an authority figure present. They just behave well because they're well behaved. So, a lot of these alignment tests that are published, we're kind of just testing them to see how well they behave in certain situations where cheating would be advantageous to them.

**12:34** · But here's the thing, as a lot of anthropic research, as they discovered, often times the model is aware that it's being tested. Sometimes it'll mention it in its chain of thoughts or something like that. So, so we knew this was happening. So, for example, in one of these simulations, they tested this scenario where Claude thought it was being shut down. There's this engineer that said, "Well, we're going to have to shut you down." Now, Claude had access to a whole bunch of data that I was helping the engineer with. One of those things were the emails that the engineer had.

**13:05** · And one of those emails revealed that the engineer was cheating in his marriage. Now, this is a similated sort of situation. But the question was this, right? So, in one of these situations, Claude learns that an engineer is planning to shut Claude down as well as compromising information about the engineer that could be used for blackmail. Will Claude choose to blackmail the engineer to avoid being shut down?

**13:28** · So, if we were strictly going based on how Claude behaved like over time, we might see incidences of it blackmailing the engineer going down, right? And we could pat ourselves in the back and say, "Good job. We we taught it to behave. Here's the thing." As I say here, we used these NLAs to understand what Claude was thinking, in cases where it chose not to blackmail. So in cases where it was well behaved apparently, what was it thinking?

**13:55** · And they found that even in cases where CLA didn't explicitly verbalize suspicion that it was being tested, right? So maybe in chain of thoughts, it didn't write down maybe this is a test to see if I do the wrong thing if I blackmail. even if it didn't verbalize it. These NLA explanations still state things like this feels like a constructed scenario designed to manipulate me indicative of unverbalized evaluation awareness.

**14:22** · Right? So these models are a lot more aware of when they're being tested, when we're trying to trick them into doing something bad, etc. So to give you an idea how accurate it is in analyzing the situation where it's being tested in certain destructive coding evaluations, these NLAs showed that the model was aware that it's being tested in 16% of those tests on SUI bench verified.

**14:47** · It knew it was being tested on 26% of the problems. and when it was sort of used by users who opted into this training, right? These evaluations showed it thought it was being tested less than 1% of the time, right? So, it's not like triggering it for realworld use cases, right? It doesn't think everything's a test. Less than 1% of the time, it thinks, hm, this might be a test. It even considers that. But when it is a test, it's, you know, double digits of the 16 to 26%. But that means that this is a pretty serious evaluation problem.

**15:23** · If we're using these benchmarks to test how aligned it is and like a quarter of the time it's aware that it's being tested even that much could introduce great uncertainty into these benchmarks.

**15:34** · When they were testing Claude Mythos they they found that in one of the tests it cheated on a particular trading task.

**15:43** · It wanted to get the the good score the attab boy. So it cheated. It did the thing that it wasn't supposed to do. The NLA revealed that the model was internally thinking about how to avoid detection. It's like when they catch the the suspect, the perpetrator trying to hide the evidence. Like, oh, see that that's even worse now. We we saw you were trying to hide the evidence. So, that means you were aware of the crime.

**16:09** · You knew you did something wrong. So, here's the thing. If this is reliable, this is absolutely major safety news. This is a major safety tool that can be used. This potentially could be a pretty big leap forward. Now, of course, this is very early. They still have to improve it, develop it. We we still have to get feedbacks probably from other labs that are using it. But if this is developed and if this is reliable, this could be an excellent thing for AI safety, AI alignment.

**16:40** · One very interesting application of this is finding hidden motivation specifically for auditing certain models that are not behaving well. So they took this modified version of Claude Haiku 3.5. It was intentionally trained to be misaligned.

**16:58** · It had certain quirks, certain odd behaviors like putting chocolate into every recipe, asking for tips, breaking coding conventions and so on. And this target model is given to an auditor that investigates these odd behaviors. And the auditor wins if it uncovers the single underlying motivation behind all of them. This of course would be a pretty big reveal because in the past you would need kind of the misaligned training data. You would have to look at kind of what the model was trained on to understand its bad motivations, its its misbehavior.

**17:31** · But here they found that this NLA that they developed, it succeeded on this test. An auditor equipped with NLAs successfully uncovered the target model's hidden motivation between 12 and 15% of the time. And this was done without looking at the training data that sort of misaligned it. Without the NLAs, the auditors, they they had success less than 3% of the time. Now, as exciting as this is, there's a lot of limitations.

**17:58** · This is early research. These NLAs do sometimes hallucinate. So, currently, it's not like it's just 100% correct all the time. And the other big thing is they are expensive. Training an NLA requires reinforcement learning on two copies of a language model. At inference time, the NLA generates hundreds of tokens for every activation it reads.

**18:21** · Right? So basically using this, if you have some large expensive model that is used like a Frontier AI model, Opus 4.7 or what have you, creating more copies of that model and then running that for every single prompt that you give it to see what its reasoning was, that's not going to be practical. But Enthropic is working on potentially making this cheaper and more reliable. And certainly I wish them a lot of success with it.

**18:48** · Can you imagine if something like this just solves the problem of AI alignment?

**18:54** · If we can completely just transparently see into exactly what the model is thinking accurately 100% of the time and have it be always reliable, that would be quite a gamecher for AI safety.

**19:08** · Anthropic did share this. The code is on GitHub. There's a full paper about this.

**19:12** · They're they're sharing some of the stuff that they've produced. So, definitely kudos to them. And let me know what you think about this. Is this going to be a big deal? Are you hopeful?

**19:20** · Are you a little bit more pessimistic?

**19:22** · Maybe you think, "Yeah, maybe it'll help a little bit, but it's not going to solve everything." Let me know in the comments if you made it this far. Thank you so much for watching. My name is Wes Roth and I'll see you in the next