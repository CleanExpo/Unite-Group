---
title: "Your AI UI Looks Generic… This Fixes It (DESIGN.md)"
source: "https://www.youtube.com/watch?v=pY52H5gKhGg"
author:
  - "[[Better Stack]]"
published: 2026-05-08
created: 2026-05-08
description: "AI coding tools like Cursor, Claude Code, v0, and Stitch can build full apps in minutes but most AI-generated UIs still look generic, inconsistent, and slightly broken. In this video, we break down"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=pY52H5gKhGg)

AI coding tools like Cursor, Claude Code, v0, and Stitch can build full apps in minutes but most AI-generated UIs still look generic, inconsistent, and slightly broken.  
  
In this video, we break down DESIGN.md, the new open-source design system format released by Google that helps AI agents generate clean, consistent, on-brand interfaces without endless prompting.  
  
🔗 Relevant Links  
Design MD Awesome Repo - https://github.com/VoltAgent/awesome-design-md  
Design MD Google Stitch - https://stitch.withgoogle.com/docs/design-md/overview  
  
❤️ More about us  
Radically better observability stack: https://betterstack.com/  
Written tutorials: https://betterstack.com/community/  
Example projects: https://github.com/BetterStackHQ  
  
📱 Socials  
Twitter: https://twitter.com/betterstackhq  
Instagram: https://www.instagram.com/betterstackhq/  
TikTok: https://www.tiktok.com/@betterstack  
LinkedIn: https://www.linkedin.com/company/betterstack  
  
📌 Chapters:  
0:00 Why AI-Generated UIs Still Look Generic  
0:32 What Is DESIGN.md?  
1:10 Live Demo: Same Prompt, Different UI  
2:11 How DESIGN.md Actually Works  
2:35 Why AI Needs Design Context  
3:00 DESIGN.md vs Figma vs JSON Tokens  
3:45 Why Developers Are Switching to DESIGN.md  
4:15 Pros and Cons of DESIGN.md  
5:00 Is DESIGN.md Actually Worth Using?

## Transcript

### Why AI-Generated UIs Still Look Generic

**0:00** · AI coding tools are getting scary good.

**0:02** · Cursor, Claude, Code V0, you can go from an idea to a working app in minutes, but then you open the UI and it just looks off. The code works, but the UI still feels really cheap. Now, compare that to Stripe, Linear, Vercel, really any big platform. So, what are they doing differently? It's just one simple file.

**0:21** · It's called Design MD and Google just open-sourced it. I'll show you how to inject this in your code in just a couple minutes.

### What Is DESIGN.md?

**0:33** · Now, Design MD is a plain Markdown file that tells AI agents how your product should feel and look. Colors, fonts, spacing, buttons, layout rules, accessibility notes, everything. So, instead of guessing your brand, the AI reads the file and follows it. There's no Figma export, no JSON mess, there's no 10-paragraph prompt that I need to do every time to get perfect. Google open-sourced it on April 21st and within just a couple weeks, it's already blown up on GitHub to well over 70,000 stars.

**1:04** · If you enjoy coding tools and tips that speed up your workflow, be sure to subscribe. We have videos coming out all the time. All right, now this is really cool. Let me show you why this actually matters. Okay, I'm going to go with the same prompt here, build a modern dashboard. First, there is no Design MD file.

### Live Demo: Same Prompt, Different UI

**1:21** · It generates and yeah, this is a classic AI dashboard. Technically works, right?

**1:26** · But it has default Tailwind energy, it just looks like it. Random buttons, we have our generic cards here. There's no real identity to anything you're actually building out. Now, if I run the same prompt again, but this time I add a Stripe-style Design MD file, or really any Design MD file you want for another brand, and look at the difference. The colors line up, the spacing feels cleaner, the buttons look like they actually belong together. The whole screen has a point of view.

**1:54** · Same AI, same prompt, but now it's different context. Without Design MD, the AI is guessing. What should the site look like? With Design MD, the AI has rules based on other proven platforms that already look really good. So, what's actually inside this file? Think of it like a design system the AI can read. At the top, you usually have structured tokens. Stuff like exact hex colors, font families, border radius, spacing.

### How DESIGN.md Actually Works

**2:24** · These are hard rules, but the important part is what comes after that. Markdown.

**2:30** · This is where you explain the intent.

**2:32** · Not just use this blue color, but this blue is the primary accent and it should feel clear and trustworthy. That matters because AI doesn't just need numbers, it needs judgment. A good Design MD usually covers color palette, typography, components, layouts, accessibility, so the AI gets two things at once. The exact values and the reason behind them.

### Why AI Needs Design Context

**2:56** · And that is why the output stops drifting away from what we're actually trying to go for. Now, the obvious question is, do we really need another design system format? We already have Figma, we already have JSON tokens, and we already have Cursor Rules and Claud MD, but each one of these solves a different problem. Figma is a UI. It's great for humans, but it usually lives outside the repo. JSON tokens are great for machines, but they do not explain our taste for the website or the intent we're going after.

### DESIGN.md vs Figma vs JSON Tokens

**3:27** · Cursor Rules and Claud MD tell the agent how to behave, but they're not really a design system.

**3:34** · Design MD sits in all of this. It's human-readable, it's also at the same time machine-readable, it's version-controlled, and agent-native. That's the big change here. Your design system is no longer trapped in a design tool, it lives right next to your code within this markdown file. And this is why it's blown up in just 2 weeks and devs are paying attention. The community repo is now over 70,000 stars, right? That's super fast. People are sharing design.md files for linear, stripe, notion, and Vercel.

### Why Developers Are Switching to DESIGN.md

**4:05** · And the reason behind it is simple.

**4:07** · Nobody wants to keep typing, "Make it clean. Make it modern. Use better spacing. Make it more like this website." Come on, that gets old so fast. With design.md, you stop repeating yourself. You give the AI the design rules once, then every screen starts from the same foundation. That's the real win here. The design across all screens, speed. There is less rework.

### Pros and Cons of DESIGN.md

**4:30** · There's less fixing the same ugly button for the 10th time. All right, now honest stake here, it's not perfect. It's a great start, right? But it is one file.

**4:40** · It lives in your repo. It works across tools. It includes accessibility guidance, and setup is basically zero, which is great, super easy to drop in.

**4:49** · Also, the file is only good at what you put in it. A weak design.md is obviously going to give you a weak output. But for solo devs, prototypes, AI-heavy workflows, this is a really practical upgrade. So, should you use it? Yeah, probably so. Especially if you're already building with cursor, Claude code, V0, start with a template from the awesome repo. It's in the description.

### Is DESIGN.md Actually Worth Using?

**5:11** · Drop it in your project, then customize it for your own site, your own brand.

**5:15** · Your goal is not to make the AI creative. Your goal is to stop making it guess. Because once the rules are clear, the UI is going to get more consistent, and your app starts to feel less like an AI demo and more like a real product. If you enjoy coding tools and tips like this, be sure to subscribe to the Better Stack channel. We'll see you in another video.