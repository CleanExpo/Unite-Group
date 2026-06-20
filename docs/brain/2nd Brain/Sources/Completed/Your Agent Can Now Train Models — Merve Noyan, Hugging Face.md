---
title: "Your Agent Can Now Train Models — Merve Noyan, Hugging Face"
source: "https://www.youtube.com/watch?v=OV56RddyFuU"
author:
  - "[[AI Engineer]]"
published: 2026-05-14
created: 2026-05-14
description: "Open-source models have caught up. GLM 5.1 is leading the Artificial Analysis intelligence index over closed models, and the gap is closing fast with each release cycle. The practical upside beyond be"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=OV56RddyFuU)

Open-source models have caught up. GLM 5.1 is leading the Artificial Analysis intelligence index over closed models, and the gap is closing fast with each release cycle. The practical upside beyond benchmarks: full weight access means you can quantize, fine-tune, and deploy to edge devices or browsers without data leaving your infrastructure.  
  
@MerveNoyan walks through the Hugging Face ecosystem built around this: inference providers that route to the fastest or cheapest option per model, benchmark datasets for filtering by SWE-bench or AIME scores directly on Hub, a traces repository type for storing and exploring agent sessions, and skills that plug into coding agents. The closer is a live demo where she asks Claude Code to fine-tune a vision-language model on a dataset by name. The agent calculates VRAM requirements, selects an instance, and kicks off the job. What used to be a day of napkin math is now a prompt.  
  
  
Speaker info:  
\- https://x.com/mervenoyann  
\- https://www.linkedin.com/in/merve-noyan-28b1a113a/  
\- https://github.com/merveenoyan

## Transcript

**0:15** · Hello everyone and welcome to this talk in open agent uh ecosystem and uh I would like to call it having an AI engineer at your fingertips.

**0:25** · Um I'm Marvia and I work in the open source team of hugging face. How many of you are hugging using hugging face on daily basis?

**0:33** · Oh, let's change that. This is not okay.

**0:37** · Um but first let's talk a bit about open source and what it is. So when it comes to machine learning, open source is absolutely differential. Basically you have the open weight models um that go in with non-commercial licenses. we call them open weight and then we have open source models that have uh commercially available licenses such as this one from deepseek it's called MIT license or Apache 2.0 And then there is like even more open models that have the code open.

**1:06** · If you have like agents there, the harness is open, everything is open. And this matters even more by the fact that like yesterday or the other day it was revealed that the cloud uh performance was going down. Uh so if you if you have everything in the open, nothing changes without you knowing. no performance degradation without you knowing everything's great.

**1:32** · Uh but on top of it, if you have access to the weights, you can shrink them, you can quantise them, you can fine-tune them if you feel like it. And it's absolute guaranteed privacy for your end user because uh you can deploy it to edge devices, browsers without the data going somewhere else.

**1:54** · uh this matters a lot in my opinion even more these days with the security breaches and everything and there was this argument maybe few years ago that open source models aren't as good as no no this is not the case like you see for instance the latest GLM 5.1 is absolutely crashing it and I'm actually using it in my coding setup uh the this is the uh artificial analysis intelligence index and the green ones ones are open models. Meanwhile, the black ones are the closed models.

**2:25** · And we are we just catched up and we will catch up even more with the upcoming models and stuff. And let's go back to hugging face hub. So everything is facilitated through hugging face hub. All of the open releases. It's the inferral layer for all of your open source uh workflows.

**2:48** · And as of now, it's hosting even more models. I should have updated the number. It's probably close to three million a lot of data sets spaces and everything but that's not all when it comes to the agentic ecosystem and this is what we are going to talk about today. So when you go to the models uh you can filter for aentic models. Uh they are mostly the trending ones and there is like two types of models in my opinion.

**3:15** · There is the v vision LMS and then there is the LLMs and the vision LMS can also act as like a computer use agent over the screenshots. They know where to click etc. which is pretty cool. And one trend I have recently noticed is the fact that you have uh labs releasing their LLMs as vision uh

**3:37** · with vision capabilities day zero like for instance the Gemma 4 was an omni model and still it's an agentic model there is Q1 3.5 uh there is Kimik Kimik 2.5 these were VLMs so I foresee that all of these models will be over time release day zero with vision capabilities and uh it's super easy to run this actually like you can just use like VLM

**4:07** · ML or like llama CPP llama server uh from the get-go with like few lines of code like it used to be much more um frictiony but these days this is a not a big deal and if you want to compare open models we have recently launched this feature called benchmark data sets.

**4:26** · So when you go to the data sets on the left hand side there is like on the bottom there is a bunch benchmark button you just click it and then you can see the popular benchmarks such as S sw ebench pro or humanities last exam or aime and others and when you go to for instance swb bench to see like how your agent is like good in coding and stuff uh you see the open models ranked according to the scores.

**4:58** · So like currently GLM 5.1 is top of the list.

**5:04** · So it's also easy to pick an open model these days because there's 3 million models out there and it used to be a challenge to pick different models.

**5:14** · And if you actually want to vibe check it, HuggingFace has this ser uh service called inference providers uh which does routing for the best models to best providers like all of the providers are there. There's gro cerebras I don't know

**5:30** · and everything and then it's super easy to compare them as well if you see like uh you have the cheapest or the fastest option actually I had to truncate it but also there is the tool used column so you can actually pick one of the open source models for the agentic use case and stuff and going back to agents after all of these uh hugging face hub shill

**5:54** · uh hugging face hub actually recently has shipped a ton of uh features for you to use open models with agents agents and stuff and first off like there is the MCP server where you can plug hub into your LLM and there is uh skills uh which allow you to even wipe train models like you just go to your agent and say train Q1

**6:20** · 3.5 on this data set for me and then it just trains which to me is like a sci-fi at this point because it used to not exist and like there is so many things going on in the back end and the agent actually handles them very well. And then there is the local agent. So you can run full coding agents uh locally from models with hugging face hub because we integrate very well to them.

**6:48** · And coming to the first one so basically my talk will be consisting about all of these. Uh coming to the first one, there is the local coding agents and your options. You have like actually many many options but like one of my favorites is Pi because it's like super simple to set up. Uh basically you can I I think you can also use it with inference providers remotely but also if you want to serve like a local coding agent you can use llama CPP to serve it and then pi will directly consume that.

**7:20** · And uh something very cool is also llama agent which is baked into llama CPP as a binary that you can just directly execute and start a model by giving hugging face hub ID. So it's super easy as well to get an local agent running.

**7:38** · Uh I will share my slides on my Twitter account after so no need to take pictures.

**7:44** · My one of my most favorite things these days is Hermes agents and I will just die on this hill. So this is like this is a bit one step even further to from the open claw by means of memory management and everything and it's actually super easy to get started with that and uh it is you can either use it locally or with hugging face inference provider. So for instance, I was playing with that uh like the setup wizard does everything for you.

**8:15** · You just give the keys and stuff and then integrate into your Slack or WhatsApp or whatever and you're good to go. And I absolutely recommend using this if you want to use it with an open model. I absolutely recommend GL GLM 5.1. For instance, I actually failed initially to integrate into Slack.

**8:32** · I have witnesses in here my colleague uh Neils this year and um I asked GLM 5.1 to fix it with the Hermes agent and it's fixed on its own and it's it's uh it was a good day like uh I I think GLM 5.1 is

**8:53** · a very good model and I cannot I can't absolutely wait to use it with Gemma 4 but also this weekend there is like on Twitter there was a rumor ignored uh minimax model coming up. So I will also probably try with that and share my findings. So I absolutely recommend using her agent with the open models.

**9:17** · And one more thing so basically uh hugging face hub now has a new data set repository type called traces. And this is basically all of your uh codeex uh cloud code or pi traces they host it.

**9:33** · And for instance if you go to your um if you pushed uh a trace uh and then you go over there you will see in the data set viewer if you click on the traces column uh it pops up like this. It is very nicely parsed and you can just explore your data and then later if you want you can even train a model on that which is pretty cool in my opinion.

**10:00** · And uh if you want to push your agent traces you can just upload your sessions from uh these uh paths and nothing else is needed. And we will also probably have Hermes agent very soon for traces.

**10:15** · uh going back if you want to use if you want more options to serve LLM behind the agent locally.

**10:22** · So some tips and tricks in finding a good model. You just go to hugging face.

**10:27** · There is an other tab. Under the other tab there is the apps. So these apps are like lm studio, jean, um, llama, cpp everything that is for local serving is over there. And when you filter for them, you have the models that are supported by these uh by these uh local apps. So whatever you want to serve, we have you covered. And when you go to the model repository, something very cool in my opinion is that on the left and right hand side there is GGUF uh section.

**10:58** · So basically GGF if you don't know it's supported it's it's basically comes in llama CPP the file uh format uh that is supported in many things like all llama LM studio everything and you have the hardware compatibility for instance the Gemma 4 larger model if you quantize it to 4bit it fits inside an L4 GPU uh with the 24 GB of VRAM.

**11:29** · So I think this is very cool and this is also served to uh MLX repositories as well. And when you go to the again to the model repository if you have absolutely zero clue on how to serve this model on top right there is use this model and you have the options of the local apps that the model is supported in. And when you click that you see like only with few lines of command uh that you can run you install you get the model served and voila.

**11:55** · It's very very convenient to run the open models these days and lastly supercharging your coding agents using hugging face skills.

**12:10** · So there is we have like bunch of skills in order to get you started with training uh I don't know inferring with the open models using open models exploring open data sets using AI apps everything and uh we have this thing called hugging face CLI skill which allows coding agents to manage repositories uh run jobs launch demos and everything and this is how you can install it uh you can just uh type HF skills on Google and you will find the uh commands. Uh but we have more skills than that.

**12:43** · So basically this allows you to plug hub in into your agents like give you all of the uh hugging face hub exploration. But rest of the skills are super cool. There is LLM trainer skill. Basically this is uh this is not only for LLMs but also visual language models. You can just tell the model to okay train this model on this data set and it will just kick off the job remotely uh on our infra or like locally wherever you want.

**13:16** · And there is gradu skill which allows you to build demos. And there is hugging face data set skill which allows you to uh explore data sets through our data set viewer API and you can install it very easily. Again we come with more integrations. I just put cloud and gemini here.

**13:39** · So putting this into action for instance I asked the model uh to I asked cloud code to say hey can you train qan2vl on lava instruct mix which is like a vision language data set and it asked me a few questions.

**13:55** · It said okay which instance would you like this to go in because you have multiple options. uh the model actually like in the back end the agent actually uh calculates the amount of VRAM required to run fine-tune that model in a given batch size and everything. So it handles everything for you. It just asks you a few questions.

**14:17** · Okay, what is your validation split?

**14:19** · Blah blah. And then it just launches the job which to me is absolute sci-fi still to this day as a person who have been training models since I don't know beginning of my career like six six years and you at the end you just find your model on hub and this is not limited to LLMs and VLMs I have recently shipped um skills for for instance training object detectors or I don't know segmenting model and everything for vision.

**14:49** · It handles for instance different bounding box types and everything. You just give the command and let it handle everything.

**15:00** · And going back to MCP, what do we serve?

**15:03** · Uh we have models, data set spaces, search for your task, uh semantic search for spaces. So if you don't know spaces, it's like the app store of AI. You have a ton of uh apps over there for absolutely everything you could see. And also we have something called jobs which allows you to kick off uh one of jobs that ends like uh if it fails or if it succeeds and you pay for the amount of time it was up.

**15:30** · And also you can query these apps from MCP like I'm going to show you shortly. But it plays nicely with all of your favorite platforms.

**15:43** · And so for instance in here I ask the model generate image of a bakl lava made of yarn and then it will call uh the hugging face of qan image which is an image generation model hosted remotely and then it will query that and it will bring um the output of that. It works very nice look.

**16:07** · But you need to turn on there is a setting in the MCP called dynamic spaces. If you want more options of like if you want absolutely all of the spaces, you need to turn that on which is a bit of bit experimental.

**16:22** · And here is some few ideas that you can use spaces MCP. Uh but you're absolutely not limited to those. And tying it all together, my colleague Neils has built something I which I found cool so I wanted to share. So basically on hugging face hub there is papers and these papers basically AI related papers.

**16:40** · We want people to be able to ask questions to these papers or share h but not all of the papers come with markdown uh which the model which we can index and stuff. So we OCR 30 30,000 papers uh using codecs open OCR models and jobs all through prompting which is a bit crazy. So the steps to do that is firstly pick an OCR model that is cheap and nice and performance.

**17:09** · Ask the LLM to kick off a processing job and actually write the code for that and then kick it off on hugging face infra and then let the skill set up the instance of hosting that model and everything without you going through the pain of the napkin math and then profit.

**17:31** · So to pick an OCR model you need to um you need you can go to OCR bench which is a benchmark data set that I have previously shown you. The first result is Chandra OCR but don't be fooled by this. We have just today shipped a skill that you can just ask the model okay what is the best model on OCR for fine-tuning and it will also make recommendations around finetuning and stuff. So if you need like smaller models etc it will handle everything for you with this skill.

**18:02** · So it's pretty cool. Check it out. Um once you pick the model okay we in this case we use Chandram.

**18:12** · uh we asked model to write the script and it did and then the agent just does the napkin math for the instance and uh calculates the cost of the running job and everything and then these jobs will be so so basically these jobs will be rerun.

**18:29** · So we have recently launched this infra product called buckets which is like a A3 buckets but much cheaper and faster um that you can use with mounting and yeah basically um you can just use that and you can get started uh in these links. I hope you like this talk. Thank you so much.