---
title: "Systems Programming in 2026"
source: "https://www.youtube.com/watch?v=UKXCk3_CFbU"
author:
  - "[[Let's Get Rusty]]"
channel: "Let's Get Rusty"
published: 2026-05-01
created: 2026-05-11
description: "👉 Get your Rust Developer Roadmap: https://letsgetrusty.com/roadmapC++ is one of the most influential programming languages ever created, but is it still worth learning in 2026?In this video, we"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=UKXCk3_CFbU)

👉 Get your Rust Developer Roadmap: https://letsgetrusty.com/roadmap  
  
C++ is one of the most influential programming languages ever created, but is it still worth learning in 2026?  
  
In this video, we break down where C++ still makes sense, where it doesn’t, and which modern alternatives might be a better fit based on your goals.  
  
Chapters:  
  
0:00 Intro  
0:44 What C++ Is Still Good At  
1:35 The Problem With C++  
2:55 The Modern Alternatives  
6:10 Recommendation

## Transcript

### Intro

**0:00** · C++ is one of the most hated languages.

**0:03** · Everywhere you look, developers are venting about the complexity, the build system, the memory bugs, and now there are newer languages promising to solve all of these problems. But here's the truth. C++ is still one of the most widely used languages on the planet. It still powers gaming engines, trading systems, operating systems, browsers.

**0:22** · It's everywhere and it's not going anywhere. So the real question isn't whether C++ is dead. It's not. The question is whether you should invest your time learning it in 2026 or whether one of the modern alternatives is a better bet for your career. In this video, we'll look at where C++ still makes sense where it doesn't and which languages you should learn instead depending on your goals. Before we talk about the alternatives, let's give C++ its respect. Because it's easy to point out the negatives, but there are many real reasons why this language is still everywhere.

### What C++ Is Still Good

**0:52** · There is more C++ code running in production right now than almost any other language. billions and billions of lines across every major tech company, every gaming studio, every trading firm. That code is not getting rewritten anytime soon. And there are huge ecosystems on top of C++. Boost, QT, LLVM, Unreal Engine, CUDA, and then there's the industry side. Game development, highfrequency trading, automotive, graphics, and rendering.

**1:19** · These industries have decades of C++ investment baked in. the hiring pipelines, the code bases, the tool chains, it's all C++. So, if you want to work in one of these industries today, C++ knowledge is extremely valuable. In some cases, it's basically required. But let's be honest, C++ has some real serious problems. And they're not going away. The first one is complexity. The language has grown into an absolute beast. C++ 11, 14, 17, 20, 23.

### The Problem With C

**1:44** · Every new standard adds more features on top of features on top of features. The language has gotten so large that even expert C++ developers can't agree on which subset you should actually use.

**2:00** · You go on any C++ forum and half the threads are people arguing about whether to use exceptions or error codes, inheritance or templates, when to reach for variant versus polymorphism. It's exhausting. And then there's memory safety. This is the big one. C++ does have safety tools.

**2:15** · Smart pointers rai bounds check containers but they're optin nothing in the compiler stops you from reaching for a raw pointer or unchecked access use after free buffer overflows data races these are the bugs behind roughly 70% of security vulnerabilities at Microsoft and Google 70%. And it's gone serious enough that the White House, the NSA, and the CIA have all published guidance telling developers to move away from memory unsafe languages with C++ being specifically named.

**2:46** · These are real problems that the C++ committee has been trying to solve for years. And the honest truth is that they haven't been able to fix them within the language. So if not C++, then what? Here's the thing.

### The Modern Alternatives

**2:58** · People have been trying to replace C++ for a long time. And most of those attempts have failed. D came out in the early 2000s as a direct better C++. It had a real community for a while, but it never really hit mainstream adoption.

**3:12** · Google announced Carbon in 2022 as an experimental successor to C++. Got a ton of hype, but it's still experimental and there's nothing production ready. Even Herb Sutter, one of the most respected voices in C++, has been working on CPP2, basically trying to fix C++ from within.

**3:30** · And even that hasn't gained traction in the committee. So replacing C++ is really hard. But there are a few languages that have carved out real meaningful alternatives. Not trying to be C++ but better, but by solving specific problems differently. The first is Go. If your goal is backend systems, cloud infrastructure, DevOps tools, Go is probably your best bet. It was designed at Google specifically because C++ was too complex and too slow to compile for large scale services. Go routines make concurrency way simpler than anything in C++.

**4:02** · The trade-off is that it has a garbage collector and it's slower for computeheavy work. Go is not a systems language. It's a services language. But for that, it's great. If you're coming from C++, Go will honestly feel like a downgrade in control, but a massive upgrade in productivity. You'll be shipping things in days that would take weeks in C++. Career-wise, you're looking at cloud engineering, DevOps, platform engineering. Companies like Docker, Hashi Corp, Cloudflare are heavy go shops.

**4:31** · Second is Zigg if you want a modern C replacement without the complexity. It's dead simple. No hidden control flow, no hidden allocations, no macros, and the C interop is really good. You can include C headers directly and call C code without any binding layer. If you're coming from C++, Zig will feel stripped down. And that's the point. It's for people who want full manual control without the decades of accumulated complexity. The trade-off is it's still pre-version 1.0. The ecosystem is small and the job market is basically non-existent right now.

**5:03** · Zigg is a bet on the future. And then there's Rust. And this is the interesting one because Rust is the only language that has actually succeeded in taking real market share from C++. Not by trying to be a better C++ but by rethinking the whole approach to memory safety. The ownership system gets rid of entire categories of bugs that have been haunting C++ for decades. Use after free data races, null pointer references. The compiler catches them before your code even runs. And the tooling is really good.

**5:33** · Cargo handles testing, building, dependencies, publishing, all in one tool. Coming from CMake, it honestly feels like a different world. If you're coming from C++, Rust will feel the most familiar. You already think about ownership and lifetimes. you just do it manually. Right now, Rust makes the compiler enforce it. Now, Rust does have a steep learning curve. The borrow checker will fight you early on and the ecosystem is smaller than C++, but it's maturing fast and top tech companies are adopting Rust.

**6:02** · AWS, Microsoft, Google, Cloudflare, the Linux kernel, these aren't experiments. This is production infrastructure. So, here's my honest personal opinion. If you're going into a role that specifically requires C++, a specific company, a specific codebase, a specific team, then yeah, learn C++. Or if you already know C++ and you want to go deeper, that expertise is extremely valuable. There's decades of work maintaining and improving existing systems and someone has to do it.

### Recommendation

**6:30** · But if you're starting fresh or looking to make a career shift, I think Rust is going to be a more strategic option for most people. You get the same performance with better safety, better tooling, and a growing job market. If you want backend or cloud infrastructure, learn Go. If you want something minimal and low-level without the complexity, check out Zigg. But the job market is pretty tiny right now. And zooming out for a second, C dominated systems programming for 50 years. C++ extended that for another 40 years.

**7:00** · I personally think we're at the beginning of the next shift. C++ isn't going to disappear.

**7:07** · Cobalt is still running banks. C is still in the Linux kernel. C++ will be around for decades, but for new projects, new infrastructure, new safety critical systems, those are increasingly picking Rust. Google, Microsoft, Amazon, Cloudflare, the Linux kernel, those are all putting serious investment into Rust. If you're early in your career or you're looking to make a career shift and trying to figure out where to put your time, I think investing in Rust makes a lot of sense. Now, if you're watching this and thinking, "Okay, I want to learn Rust."

**7:36** · I put together a free Rust developer road map that breaks down exactly how to get started depending on your background. Whether you're coming from C++, Python, Go, or something else entirely. It'll show you what to focus on first and which career path fits you best. To get your road map, click the link in the pin comment down below. Thanks for watching and remember to stay rusty.