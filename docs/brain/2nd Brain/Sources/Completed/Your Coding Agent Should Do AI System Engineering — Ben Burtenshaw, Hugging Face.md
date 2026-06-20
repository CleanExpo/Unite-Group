---
title: "Your Coding Agent Should Do AI System Engineering — Ben Burtenshaw, Hugging Face"
source: "https://www.youtube.com/watch?v=JomVvNDjGb8&t=604s"
author:
  - "[[AI Engineer]]"
published: 2026-05-21
created: 2026-05-22
description: "An agent written RMSNorm kernel hit 1.88x speedups on H100s. A finetuned Qwen3 0.6B hit 35% on LiveCodeBench. Neither result required a systems engineer. Just coding agents with the right skills loade"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=JomVvNDjGb8)

An agent written RMSNorm kernel hit 1.88x speedups on H100s. A finetuned Qwen3 0.6B hit 35% on LiveCodeBench. Neither result required a systems engineer. Just coding agents with the right skills loaded.  
  
Ben Burtenshaw from Hugging Face walks through three levels: using Claude Code interactively to write and benchmark CUDA kernels distributed as versioned repos on the Hub, a zero-shot task where an agent finetunes a model end to end from a single prompt, and a multi agent research lab running parallel experiments overnight on Hub compute while a reporter agent pushes results to a live Trackio dashboard. The through line is skills: file based context that turns a zero shot failure into a few shot workflow. CUDA programming and ML training pipelines were deep specializations that took years. Skills compress that timeline to hours.  
  
Speaker info:  
\- https://x.com/ben\_burtenshaw  
\- https://www.linkedin.com/in/ben-burtenshaw/  
\- https://github.com/burtenshaw

## Transcript

**0:07** · \[music\] Hi everyone. As you heard, I'm Ben from Hugging Face and the talk that I'm going to present to you today is called your coding agent should do AI systems engineering.

**0:24** · So, there are two main takeaways that I want you to get from this talk.

**0:29** · One, and probably the fun part, is that we can use coding agents to tackle the hardest engineering problems in AI, so systems engineering and machine learning engineering. And maybe the boring part is that in order to do this, we're going to need standard repos and we're going to need those on the hub. And in many cases, we already have them.

**0:47** · So, I think in this case, I'm preaching to the choir here, but in case you haven't noticed, coding agents have been accepted. Many of of the of us have been using them for a few years, but in the last few months, it seems to have crossed a sort of acceptance gradient where a broader group of people are using them.

**1:05** · So, with this in mind, how do we keep our careers, our engineering kind of contemporary and how do we keep challenging ourselves in new areas? And my proposal is that we need to go kind of closer to the silicon and tackle harder problems.

**1:20** · And and that's where AI systems engineering comes in.

**1:23** · I've broken this talk down into three progressively more complex steps and more autonomous steps as well. And I've defined those like three bosses from games.

**1:34** · The first one is a hybrid approach where you interactively use an agent to solve a to write a CUDA kernel.

**1:43** · The second is a zero-shot task where an agent takes a prompt and trains an LLM on Hugging Face. The third is a multi-agent auto research setup, like a kind of automated AI lab.

**1:57** · So, let's get started on on the first boss, right? This is writing CUDA kernels.

**2:02** · So, for a while, writing custom kernels was seen as this unattainable goal for the humble agent.

**2:09** · They required complex DSLs, they required integration with relevant hardware to be benchmarked and to be tested, and it was seen as something that couldn't be achieved by agents.

**2:21** · However, that in most cases was wrong.

**2:23** · If you look at kernel hackathons like those on GPU mode, the recent AMD hackathon, if you look at papers like kernel bench, you'll see that agents are able to write valid and optimized CUDA kernels.

**2:37** · And and that's really cool and something that totally inspires me. I'm a part of GPU mode, I contribute to that, and and something that I think everyone should be doing.

**2:45** · However, what do we do with them? How do we distribute them and how do we get them into our inference engine so that we actually are using these optimized kernels that we're generating?

**2:54** · And that's part of the question of this part of the talk.

**2:58** · Let's take a step back now and just say what a kernel is, right? So, when you run an AI model on a GPU, the actual work is executed through a kernel. This will be defined in a relevant language for that hardware and it will use relevant features to that hardware that may not be available on other hardware.

**3:18** · We can write custom kernels that will take advantage of that hardware for a specific math operation, kind of squeeze everything we can out of it so that the model will infer faster.

**3:29** · In general, this requires a lot of expertise about writing CUDA kernels, about the hardware, and it's also a bit of an installation hell as you deal with a pretty large install matrix from hardware to software to generations and versions of say CUDA and these kind of issues. So, in short, it's hard.

**3:48** · Efficiency in deep learning, so efficiency in kernels, is split into three main sections. One, compute, two, memory, and three, overhead.

**3:56** · Compute is the flops. This is These are the matrix multiplications and the the real math of the process. Memory is the time spent moving data or tensors around memory, typically from slow to fast memory. And overhead is basically everything else, the Python environment, PyTorch dispatch of those kernels, these kinds of things.

**4:15** · In general, most people might assume that the compute is the bottleneck here because it's doing most of the math, right?

**4:24** · That's not correct. So, in most cases, memory is usually the bottleneck. And that's because a modern GPU, let's take a H100 for example, can do a petaflop a second of computation, but its memory bandwidth is 3 terabytes. So, in short, the GPU is often waiting idle for this tensors to come back for it for them to be computed.

**4:47** · There are custom kernels, custom optimized kernels that exist. Flash attention being the poster child of these. And in general, what they do is increase arithmetic intensity. They basically make the GPU do more sums at once per read and write. So, we move the tensors across, we do as much math as possible in the GPU in one go, and then we write it back. In short, people like to say we keep the GPUs warm.

**5:10** · And that's the objective of writing a custom CUDA kernel.

**5:14** · Hugging Face has a library called kernels, which is maintained by kernel writers, and we're beginning to scale up to a kind of agentic workloads. So, at its core, this is a way of distributing kernels. It has a toml file like any kind of project, which says which hardware it works on, which versions of CUDA and other kind of softwares it requires to work. And it's a it's now also a repo on the hub, just like models. So, if you are a kernel writer or you're an aspiring kernel writer with an agent that you want to set up, you can now be a kernel publisher, just like a model publisher.

**5:46** · And my point is that this is like a kind of super fervent ground for AI engineers looking to kind of scale their career.

**5:54** · If you check out these repos on the hub, you'll see that there's compatibility for different hardware. You can configure that so you know, like, okay, this works on my GPU or on my laptop.

**6:03** · And this is what it looks like here.

**6:07** · Right, let's take a look at what this looks like for an agent and how we're helping an agent to do this. So, first, we're going to go to how we do this, so skills.

**6:18** · So, I'm sure everyone here is familiar with skills and and I'm sure there've been a number of talks that really go deep into skills.

**6:24** · I don't like to I like to keep them pretty simple and and really they're just kind of file-based context. With all the wonders of files, we can open them and close them, we can version them, we can source control them, and these kinds of things. And agents can also do the same. They can open them when they need them, they can use them when they don't. And so, in the context of kernels, that means that we can give examples of how to write and how to use kernels in skills and they can open those and use them when they need. I like to say that it takes a task from being zero-shot to being few-shot, which in ML is quite a familiar concept, right?

**6:54** · We're just giving the agent examples of how to do things.

**6:59** · And we can be quite verbose and descriptive about that.

**7:03** · At Hugging Face, we're focusing on integrating skills into their projects.

**7:08** · So, what you'll find is that inside each project, there's managed skills by that project, which we think is the best way to do this because it means that those projects that the maintainers of those projects are maintaining their skills, right?

**7:20** · That means that they're not necessarily the most like YOLO skills because they're kind of like well-maintained and robust. And we have another repo for those kind of more experimental skills, which is called Hugging Face skills. Go and check that out if you want to try some of these examples you'll see today.

**7:36** · In kernels, this is what the skill looks like. It focuses on benchmarking, so it has scripts that allow you to benchmark and test the skill, sorry, to test the kernel and see how performant it is, and references with examples of how to do this.

**7:52** · We benchmark this skill and we used we generated a a kernel for Qwen 3 8B for H100, and we found that we had a 94% speedup. This isn't a state of the art speedup on this model by any means.

**8:08** · It's really just about compatibility and a compatibility matrix. So, in many cases, these models and their kernels won't be optimized for the respective hardware or generation of hardware that you want to use them on. So, you have some low-hanging fruit here where you can just come and pick up some some optimizations for that specific hardware. Maybe because your hardware's cheap on your cloud provider, but it's not necessarily the most ideal for the for that model that you're using. So, my recommendation would be to come here and like pick up some easy speedups.

**8:36** · How do we know that these skills are any good and and and that we should be sharing them and telling people to use them? We use an open source library called upskill that we're also maintaining.

**8:45** · This is a is a gateway to using cheaper and open models with skills.

**8:50** · It basically just generates skills, generates an eval for the skill, and then allows you to compare different models on the same skill. So, you can see things like this. So, okay, GPT-OSS is slightly less accurate using the same tokens. Kimmy is more accurate and using less tokens. Haiku is a bit more accurate using less tokens, and these kinds of things.

**9:12** · So, if you've got a skill and you're using it regularly and you're thinking to yourself, okay, how can I save a few pennies here and and get a different model on the go, then try out upskill and it allow you to iterate on your skill and and improve it.

**9:26** · Right, let's move on to boss two. I'm going to go through this one pretty quickly. This is about fine-tuning models. If you're really into this, there was a talk yesterday by my colleague Merve that went into this deeply. There's also a blog post here where we got Claude to do this. This was from back in November-December time now.

**9:42** · Go and check this out. Basically, you can just say fine-tune Qwen 3 6B on this dataset. This is a chain of thoughts dataset. And you'll improve the model's chain of thoughts. This is fully integrated to the hub now, so you can even run the GPUs on on the hub and it uses HF CLI skills, so it's all very available. I would try this one out. You can also try this one out. This is uses Onslaught, so it's even cheaper. This runs with like optimized models, and it's maintained by Onslaught and by us, and it's another blog post, and there's also often free credits that you can get around these blog posts.

**10:12** · So, I go and check these out.

**10:16** · Okay, let's move on to the the big one.

**10:20** · Uh this is AutoLab multi-agent research, which is a project that kind of basically keeps me up at night.

**10:29** · Andre Karpathy a few weeks ago, maybe a month ago now, released a project called Auto Research, which was based on his other projects, nanoGPT and nanochat, and it took the nanoGPT architecture and got Claude code to create improve to write improvements to that training script so that it would improve the training process. So, we can see here the experiments going over, and then for each experiment there's a change in the training script, which increases the efficiency measured in bits per bytes of that run.

**10:57** · And we can see that the efficiency ends at its best at the end of the process. I, like everyone, thought this was super cool, and I had to start implementing it straight away. But one of the things that stood out to me was I like found it kind of weird that we had one agent working in a single way, iterating, going, finding improvements, and then implementing them. And it would make sense to kind of distribute this.

**11:19** · So, that's what I did. I distributed the task amongst the research team with four types. We have a researcher that basically looks up papers. For this we use HF papers, but we can also use archive papers. HF papers is cool because it has a CLI, so you can just pull and search papers from the hub, and it acts as a lit literature scout. So, it just looks up for papers with ideas, and it formulates those as hypotheses.

**11:43** · We then have a planner, which takes those hypotheses and maintains like a queue of jobs.

**11:49** · We then have a set of workers, and they pick up those hypotheses, and their job is to implement them as training scripts. So, in many cases just like change the architecture or change a parameter or something. And then we have a a reporter agent that goes and monitors all these jobs and maintains a dashboard that we can use.

**12:09** · So, this is what it looks like. If you see here that we have working in a in a GitHub project, right?

**12:15** · So, in a Git project, sorry. And we have a main branch that we maintain with our train scripts that we're updating in each branch, and then like a train original that we that we keep. And then we have a data structure in the main branch that we use to just keep the scores.

**12:28** · Then we implemented this in open code for this example, but in the repo, which you can also go and check out, they it's also implemented in Codex and Claude if you want to try those. I also implemented it in Gastown, but that's kind of wild west stuff, so I did it as a separate project. Um but basically it works really anywhere because it's more just a conceptual implementation, right?

**12:49** · And first you have your planner creating hypotheses, you have your researchers looking up paper, and then your reporter picking all of this up, handing to workers as I said. Those workers integrate with HF jobs, so they start these jobs off on the hub that run with the hardware that they need, and then they submit these patches that go back.

**13:06** · The reporter operates in Trackio, which is a an open source dashboard that we use for all metrics. Trackio is useful with agents because it uses a completely open data layer, basically parquet. So, if you don't want the dashboard or your agent doesn't want the dashboard for any reason, it can just get into the parquet and just do whatever you want. So, if you need a Gantt chart or some other visualization, it can just go and and do that. So, I would say it's like the best agent dashboard tool because it is basically just a data store. You know, it's basically just a data structure.

**13:37** · Okay, so let's first walk through this now.

**13:40** · So, this is it implemented in open code.

**13:43** · If you don't know open code, you have like agent configuration. So, in this one I just set AutoLab, which is the name of the agent configuration I have.

**13:50** · It has skills. This is the prompt, so it says like run one autonomous local research or auto research pass in the repo using defined roles.

**13:59** · I tell it to use planner to propose up to first single change experiments, use reviewer to reject duplicates or stale ideas. I also tell it to use like a HF bucket because I want all of the storage to be in the same bucket so that I don't have to upload or download the training scripts every time.

**14:16** · And then we go and we select one of the sub agents. There's a nice UI interface in open code, but it's similar in other tools.

**14:23** · So, I select the planner, and then you'll see that the planner receives this prompt, and it uses a specific template, which I defined in my configuration of like it's going to have current state, it's going to have a a list of the jobs so far, things that have worked, which were defined by the reviewer, current hyper parameters that it can change. And it's basically just defining these jobs, which will go on to the the job list as I mentioned.

**14:46** · We then switch over to a reviewer agent, which will receive all of these jobs. It has a similar kind of structure based on a template, a reference to where it should be working from, and the latest score that it should be using. It gets an overview of all the failed and successful experiments, which it will then like use to base its decisions of what goes into the next queue on. And it creates this little table, which we don't really need to look at. It's really just for the agents to interact with each other and to get this information back.

**15:13** · To be honest, that's a little bit of a verbose example, and we maybe don't need this many tables, and you could probably trim that bit down.

**15:22** · But in general, I'd recommend if you think this is cool, go and try that out in the repo.

**15:28** · After that, so this agent runs in parallel, sometimes for hours, and this is the Trackio dashboard that we use, and these are all the runs that are pushed to Trackio. As I said, the main advantage here is that this is fully open source, and it's just a data layer.

**15:41** · But we get all of these kinds of visualizations.

**15:45** · Trackio can also have like events and warnings, so we can have all of these events being reported by different agents, and we can filter those down.

**15:53** · We can also even tie those up to like notifications, so you can get emails from Trackio if you want, if like your agents are kind of going rogue or something and you need help. But best of all, Trackio just has this like just free-form structure, so you can just throw tables in that don't necessarily fit with any other structure.

**16:12** · And then on the hub side, all of these jobs are just run inside Hugging Face, so you can explore those jobs. And in most cases, you can tell the agents to use like labels, and you can sort those labels and review through what they're doing.

**16:26** · Or you can just look at it like this. As I mentioned, you can access that underlying data layer and just create a Gantt chart because this was a kind of convenient way to look at what the agents were doing over time. So, you can see like this amber agent went off, and this was the score that it got. But you could visualize this however you want because you have access to this data layer.

**16:45** · The kind of TLDR of the whole thing is that, yeah, you can go and just have your kind of own AI lab, and you can try it out. And if you have a verifiable experiment like training a model or doing or writing CUDA kernels, then it is pretty easy to to implement and set up and and to learn some stuff.

**17:01** · So, let's now look at the the takeaways I'd say.

**17:05** · So, the in in simple terms, I'd say that agents work really well with primitives and and open primitives, and we want tools that are fully open, things like Trackio, things like kernels that we can expose to agents and they can kind of control in their own way. Even though abstracted APIs are really useful, if we have a layer that we can't necessarily get behind, that that is a ceiling.

**17:25** · So, we don't always need to extract.

**17:27** · It's more about exposing well.

**17:29** · And the other takeaway is that the hub is is ready. The Hugging Face hub is ready for these kind of workloads. We have the the fundamentals in place like storage, tracking, and compute, which I think will allow us to scale our engineering to, yeah, new levels.

**17:44** · If you found any of this interesting, I've shared it all on X, I've shared it all on Hugging Face, and you there's a blog post about basically each one of the examples that I just shared with you, and they all have repos attached to them, so you can go and try that out for yourself. If you find anything that's broken, like please tell me off. If you think that this was completely wrong, come and find me afterwards and and sort of bully me, and that's fine. Uh but most of all, thank you.

**18:09** · \[applause\]