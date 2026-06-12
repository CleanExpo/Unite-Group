---
title: "Google Open Sourced DESIGN.md. Here's Why It Matters"
source: "https://www.youtube.com/watch?v=LfgMBy0auL8"
author:
  - "[[DesignCode]]"
channel: "DesignCode"
published: 2026-04-24
created: 2026-05-08
description: "Google just open sourced DESIGN.md, and I think it matters because it gives AI tools a shared format for design systems that humans can still read. In this video I walk through Google's framing, why m"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=LfgMBy0auL8)

Google just open sourced DESIGN.md, and I think it matters because it gives AI tools a shared format for design systems that humans can still read. In this video I walk through Google's framing, why markdown is the right middle layer, how I use Neuform (https://neuform.ai/) to generate and remix designs, and how I bring the same system into Aura or Claude Design to build a full landing page.  
  
I also show where DESIGN.md is not enough on its own. You still need references, screenshots, HTML, iteration, and taste. The real workflow is: start with the spec, reinforce it with visual context, generate more sections, then finish the site.  
  
Timestamps  
0:00 Why DESIGN.md matters  
2:21 Why markdown is the right middle layer  
5:19 Start with a real design system reference  
8:12 Use community designs as your starting point  
10:24 Reinforce the system with screenshots and HTML  
11:17 Use Remix and Iterate for different jobs  
14:18 Favorite, hide, and curate the good generations  
18:21 One-line prompts and reusable skills  
23:57 Expand into motion, pricing, slides, and mobile  
31:43 Bring HTML plus DESIGN.md into Claude Design or Aura  
36:51 Build, extend, and publish the site  
42:41 The full workflow recap  
  
Resources  
Google DESIGN.md Spec https://github.com/google-labs-code/design.md  
Google Stitch https://stitch.withgoogle.com/  
Neuform https://neuform.ai/  
Aura https://aura.build/  
Claude Design https://claude.ai/design  
Variant https://www.variant.com/  
getdesign.md https://getdesign.md/  
Cursor https://cursor.com/

## Transcript

### Why DESIGN.md matters

**0:00** · Google just opensource design.md and I think this is a big deal because we can all use the same design system requirements and it's a spec and you can use it. We are going to be able to create these consistent uh designs and create multiple versions of it quickly.

**0:21** · Move between platforms such as the design platform, the uh cloud design or aura or cursor because we have one file that is common.

**0:40** · Now, in this video, I'm going to show you and yes, it's going to be organized.

**0:47** · So, we're going to start with understanding what is design from Google's perspective, how they open source it, and how we can use it. Then we're going to kind of look into their GitHub repo kind of understand one by one but also in this case we can have something that is a little bit more visual.

**1:11** · So we you know for this product that I made it's organized more visually but also it comes with a design. It's free so you can use that. And we're going to generate the first design and then we're going to generate more designs, more sections. And also we're going to have different types of designs. So for example, you can generate like a promo video which is pretty good for you know Gemini 3.1 Pro.

**1:42** · And then we are also going to look at generating more sections of that design. MD or whatever HTML file that you have and then we're going to take a look at how we can bring that and build a full app. So let's start at the beginning and you know I highly recommend that you look at their video. It's a very nice 10 minutes. It's going to explain what it is.

**2:11** · And yeah, basically it's a design system that exists in a markdown file. And if you look at the GitHub, it's going to explain to you the structure of it, the format of it. And this is what they want to become a standard because otherwise everyone can have their own interpretation of the design system. In fact, if you've ever worked with the design system, you know that every company have their own interpretation of it.

### Why markdown is the right middle layer

**2:41** · Now, because we're all working with agents now, it is important that we all follow the same sort of standard and because of that, you know, we can have like better uh consistency across platform. So we can move from you know a design platform like Figma or new form or variant and then we can move that into a cloud design and it's all going to you know respect the same guidelines the stylesheet if you will.

**3:13** · So we have here the format. We have you know the sort of um tokens and stuff like that and colors typography overview and then you know it's explaining everything the sections you know we have overview colors. So this is in markdown format and pretty much every platform is using the markdown format.

**3:44** · And uh this is especially true when we're more and more working with agents souls.md agents.md all whole information that is structured. It's not just a text because the text doesn't have titles and code blocks and stuff like that. But it's also not JSON which is very very um you know like a program like very database oriented.

**4:13** · So this in in between it's great and it makes it way easier to read. You know for example my document here is in markdown. When you chat in chat GPT it's in markdown because sometimes it gives you code blocks and stuff like that. And then we have something like a a visual a more visual markdown.

**4:35** · So you know in this case new form we have the design and then you know just I updated everything so that it respects the same specs typography you know the colors overview the icons elevation and depth shapes dos and don't

**4:58** · and it is worth uh reading about all of this stuff and of course you also have the ability to download it and to read that as a markdown file. All right, we're going to start with the design.

**5:16** · Now, I highly recommend something like stitch or new form or variant. So, uh stitch by the way is when we all started to generate the design. And just a little side note which I'm really happy about, we are actually featured on Stitch.

### Start with a real design system reference

**5:36** · If you go to uh from the web in order to get these different design systems, design.md specifically that are generated from really popular uh design systems. one that is really good, it's uh getdesign.md as I've mentioned before, but also all of these other tools that are amazing.

**6:01** · So, let's take something that already exists like a design.md and we're going to, you know, maybe use something like raycast, which is a a nice little app. And we're going to uh go here to the design.md and copy this.

**6:23** · Now you can also download which requires a login just the same way as on many sites. So I'm going to copy this go back to stitch and then you can start with a prompt into what you want to build. At this point, if you've built apps using AI, you should know that pretty much create an app called, you know, Aura, for example, uh, finance.

**6:55** · I'm not going to go super deep here, but I can just paste the, uh, design content and then enter. So, this is going to start creating the app for me. Now, while it's doing that, we're going to get into the inspiration that I like to use.

**7:13** · So, we have this here, which is from really really popular uh websites and it's really um detailed and you can use this, you can study about it, you can they also have the uh you know the visual that represents everything. I think that's pretty cool.

**7:35** · Now, what I like to use, and again, this is a tool that I built, is something a little bit more creative because in my case, I like to be uh very conceptual. You know, I like to go and look at something that inspires me, that's that would excite me to build. So, the community section, again, this is free. You're going to go to a design like this one.

**8:05** · You know, it's not specific to a brand that is already created.

### Use community designs as your starting point

**8:13** · And you go to the right side, which is the design system. And again, this is updated to the specs of Google with the typography. In this case, it's guys, a very popular font. the primary, secondary, tertiary colors, overview, uh buttons, the icons. This is specific to new form, but spacing, uh elevation, depth, shapes, dos and don't, those are part of the specs of uh the design. MD.

**8:47** · Now again you can log in and download this and just the same way that I did for Stitch. You know you create your app and then you build it.

**9:00** · So in this case you're going to want to do this and you're going to want to browse a bunch of designs that inspires you. And typically you would be surprised as to how much you can build from a single hero section or a single um you know component that you like for example a mobile design.

**9:29** · So when you start with something that you already like then you can start building more stuff. So, while I'm talking, let's see where we are here. And as you can see, it's building the um the app which is Aura Finance.

**9:52** · And it it does gives you a visual presentation of the design. MD. It gives you different screens of the app using that design.md.

**10:05** · But as you can see, you know, it might not take you to sort of like the design paradise utopia that you want, which is personally as a designer is what I'm looking for. Right? So design MD is good

### Reinforce the system with screenshots and HTML

**10:25** · and it does get used to some place but you also need from my experience you also need references you need um experimentation you need screenshots you need um you know the HTML so that gives you even more context and this is where I want to show you how \[snorts\] to do it using the tools that I built.

**10:53** · And again, this is my workflow and you can use other tools and you can sort of like for for a lot of people who are starting my number one recommendation is to start with screenshot and reinforce it with a design.md.

**11:15** · All right. So now we're going to go to Aura uh to to new form and then we're going to pick a design. So let's say we have this design that I like. Okay. So the first thing you want, right? What is cool is that it already holds two things. The HTML and the design. So we have more context here.

### Use Remix and Iterate for different jobs

**11:44** · And then I'm going to go to this little button called remix with prompt and I'm going to change it to mold it just the same prompt that I did earlier with for example create for Bora finance app and you will want to just experiment with it right so um I can iterate or remix so this is personally what I use a lot.

**12:15** · Iterate is if I want to keep as much as possible from this design and remix is if I want to explore different types of design.

**12:27** · So let's try with remix and I'm going to go to another one that I might like. So let's say this one which is a light mode and I'm going to iterate.

**12:43** · So try different things and find something until you get the result that you want. So while I'm doing this, you can see that we have multiple designs that are being generated. So, this was really important to me. And I'm going to keep doing this.

**13:06** · So, remix this and so on and so forth.

**13:12** · So, now I have like five, which is pretty insane. And um yeah, you know, like there's another one that is quite nice as well. It's called a quick remix. And basically, it's going to allow you to um to steer more in a direction of a different design. MD.

**13:37** · So, for example, I like this as a reference, but maybe I want something more like a clean, minimal beige. So, I'm going to click here, and it's going to generate that one.

**13:53** · My generations are done and we're going to take a look at the result. Now, keep in mind that when you're experimenting, not everything is going to be amazing.

**14:02** · Unless, of course, you copy exactly as what you remixed. And in this case, I didn't because I asked it to update it to the app that I want. So, it did respect sort of like the aura of finance and stuff like that. Uh, but here, I like this one. You know, if you scroll down a little bit, it's really clean. It has that sort of beige color that I'm looking for. And, you know, it it depends on again what you're looking for.

### Favorite, hide, and curate the good generations

**14:30** · If you like something, you keep it and maybe you favorite it. And then if you don't like it, you click on hide and then you move on to the next one. So, this one I'm not too keen. This one is not too bad. As you can see, um, it has that sort of like glow here, which is really cool. This, by the way, is a skill. I just realized that when you do remix, you do have the skills that comes with it.

**15:01** · And the skills can be different technique, design system, border gradients, and so on. So you can see here that now this design is yours versus in the community the design is not yours. So you can only remix it before editing it. But now that your design is yours, you can uh do a lot more things. So now I'm going to go to the prompt.

**15:30** · Of course we have the design. and is already generated and this is really cool because we do spend the extra tokens to get all of this information for you so that you can reuse it and download it and bring it to another app like Stitch or Cloud Design.

**15:52** · Now for the sort of exploration stage, we're going to go to the prompt tab right here. And this is where you can get a lot further. And you don't even need to prompt all the time, although that I like to do that a lot.

**16:11** · But you can totally go to the quick iterate or quick remix depending on how much change do you want. And then you can sort of browse the different styles that you want. Right? So, for example, the beige color. I'm going to click on it and we're going to see how it goes.

**16:29** · Um, I can also go with a frame grid layout instead of uh rounded corners.

**16:36** · So, we're going to see how it goes. A lot of people love the laser. So, we're going to click on it and we're going to see how it goes. So, a lot of things you can do in just one click. But of course, if you have a little bit more experience, then you might want to, you know, if you're a designer especially and you have a lot of experience with like, you know, telling what the button should look like or what the font should be, then you can uh the same quick remix that we have here, those are skills.

**17:08** · And you can go to skills and this is where you can uh select any of those skills and sort of merge them together. So for example uh you want the mask reveal uh the cur like the the the cursor that gives the glow is the skill that I just selected but also deselected. So I'm I'm not going to use that here. But let's say I want the beautiful shadows. The beautiful shadow skill gives you really nice shadows to the buttons.

**17:39** · And maybe um maybe I want something like the corner diagonals for the buttons. So again, you can just say something like uh apply skills or and styles and then we can go it this way. And again with all of these you can do it multiple times. And uh in this case we have iterate on. So I'm going to do that.

**18:17** · All right. So while it's generating some more I'm going to go back to the community. I'm going to show you how to generate with just one line of text. So for example here I'm going to go here and say blue colors and then I'm going to use iterate.

### One-line prompts and reusable skills

**18:37** · So iterate is definitely the best way if you want to keep exactly the design that you find in a community. So for example this one um I can say something like light mode but obviously we have lasers.

**18:52** · So maybe I want to say something like purple and blue.

**18:59** · So, but this one I can totally turn it to light mode and uh yeah, you know, just you can say something like, you know, add dividers.

**19:13** · So, these are some of my favorite oneliners. Add dividers, add uh, you know, frame layout corners.

**19:25** · So you can say something like add social proof.

**19:31** · You can say also um you know add beam animations vertical. So, some of kind of like the stuff that I like to use all the time.

**19:45** · And again, this is totally up to you.

**19:49** · And there, you know, I just want to show you that it's not one thing, right? It's not just one way to do it. Uh there's just so many ways to go about prompting and changing a design. Because think of it this way, in Figma, you download a template from the community and then you're not going to use exactly that template, although some of them are flexible enough. But in this case, you're using AI.

**20:18** · So, what you want to do is instead of moving rectangles and going to the inspector and changing things manually, you're using prompts.

**20:29** · So every every time that I'm saying those words and it change to blue and change the lines or move this and move that, it's the same way. It's just that I'm using words to achieve those things.

**20:42** · So now I'm going to go back to home and we're going to take a look at the earlier remixes that we were working on.

**20:50** · So we had the beige system.

**20:54** · We also have the you know the frame layout skill that I used earlier. So this is what it is.

**21:04** · And by the way you can read about these skills right. So I can click on skills and I can uh go to view prompt. So for example and this is the whole prompt that is used for this skill which is really cool and you know it's it's it's a lot more specific often times you can sort of condense it into a few words but you know not it doesn't always work for the border gradient.

**21:33** · So, this is very like this is the prom that I use all the time. And I know that these are skills, but these are my personal um proms that I use all the time that I put into skills that everyone can use. So, beautiful shadows and and so on. So, it's essentially like a prom. And uh this is the frame layout skill.

**22:01** · And uh we're going to go here. The laser skill, which is really cool. A lot of people love the laser. This is the corner globe skill.

**22:15** · And uh we're going to go back here and we're going to take a look at the new stuff. Okay. So, as you can see, we have the light mode.

**22:28** · Oh, we have the purple. So, we changed something from I believe was orange and now we change it to into purple. And we also use the corner skill.

**22:43** · And so this is what we have.

**22:47** · And then we have the light mode. So a single prompt we change something from dark mode to light mode. All right. So now we want to, you know, we're pretty happy with one of the design. Again, this is up to what you remix. I happen to have remixed these ones. And you know, often times I go through multiple iterations.

**23:12** · You should not expect things to go in one shot. And you should definitely, you know, just like in Figma, right?

**23:20** · When you design a template, it takes multiple iterations to get to somewhere.

**23:26** · But let's assume that we're somewhere that we're, you know, interested in. So in this case, we have this one. And now we're ready to get into the remix type.

**23:39** · So here we have multiple ones. We have, you know, we want to create different marketing materials like Instagram slide or a slide deck or branding. So, let's try a fun one. Motion design. I'm going to click on it. And then I'm also going to try for a different section of a landing page. So, maybe the pricing section. All right. So, this is what we have so far. I think it's pretty cool.

### Expand into motion, pricing, slides, and mobile

**24:11** · And you can see here we have the pricing section. And uh it's using sort of like the same theme. And we also have the, you know, motion design. It's not always great, but it does have some cool sequences that you can use. You know, here we have the feature section using the remix type. And then here we have the animation. So animation is kind of like giving you an intro animation of a section.

**24:44** · This again can be used for you know an intro or a a slide deck or something like that.

**24:53** · So you have also the mobile and here it decided to keep sort of the background animation and um sometimes it does set it into like a single frame and sometimes it's it set it into multiple frames. depends on the skills that you're using and the direction that you're giving as well. So, we have this and we have will have another motion design. Now, I'm doing it live.

**25:26** · You know, it doesn't mean that I'm 100% satisfied with everything, but I just wanted to show you what it looks like, the creative process of it.

**25:36** · Usually in my case when I'm happy with something I put it in a folder so I can just drag and drop something into that folder and um you know you can see here

**25:53** · starting with a design like this one then using different remix type I can create um something like the testimony monial section and this is definitely something that I'm a little bit more happy with uh you know the direction and

**26:13** · all that stuff having a little bit so in term of the slides in this case it decided to create something that is scrollable more like an Instagram slide I'm definitely going to fine-tune it more to be maybe a full screen and maybe have different skills for the slide but you can totally add the direction to steer it in that in that way. Sometimes also the slides give you in a way that you horizontally scroll or you click on the next button and it goes to the next slide.

**26:42** · But in this case it likes to create multiple slides instead of having a single slide. And um you know here is a Instagram slide.

**26:55** · So a little option that people might enjoy is that you can change the presentation to be more like for Instagram slide or for mobile to see how it looks like if it was like a mobile project.

**27:11** · So in this case you have here and um you also have you know the adaptiveness of the layout and how you turn something from a frame layout into something that is more like a mobile layout. So even though it doesn't look like it, you know, you can turn it into tablet version and the default which is the desktop version.

**27:44** · So this is really cool. We also have the brand remix type. So this gives you sort of like the whole sort of design system style guideish and you can totally use this to present to a client.

**28:05** · Very useful to give an idea of like the brand, the colors that you're using, the fonts that you're using and so on. This one is a promo video. So sometimes you have better luck than others. And I'm not saying this is where we need to to be, but just imagine motion design becoming far better in the future in like future models. And so I do believe that it's going to happen.

**28:32** · And for now, I think, you know, if you look at some of the motion design that I managed to create, some of them are actually pretty awesome. And it took just one remix skill using a remix, you know, like you go to community and you use the and you go to the remix type and then you go and click on this little motion design thing. As you can see, it's pretty good.

**29:00** · It works with some designs better than others. The one that I happen to be using, maybe the AI was struggling with it, but this case, the design that I was using is this one.

**29:13** · So you know it understood the assignment better. So that is pretty cool. And uh you know like this is also another one that I like. So you can see the strand here which is using WebGL and it's animating those strands. And if you look at the original design, this is the original design. It's a hero section.

**29:40** · And again using the motion design uh remix type I managed to create that. So a lot of things you can do with uh remixing something turning that into a design system. And now we're going to get into the final part which is that we're going to build the entire thing. So think of these more as um design exploration marketing material.

**30:11** · when we going to get into, you know, mobile design, for example. I mean, look at that. It's just so clean and so beautiful. And all of these are exist in the community for free.

**30:25** · Some of them are pro, but like 90% of them are free right now. We're going to provide more pro in the future. Pro usually means that it's a little bit there's more work put into it and uh you know, it's more unique. It's uh it's different. So, these are some of the really cool um mobile designs that I managed to create using um new form.

**30:49** · And again, you know, this is a where you going to be when you master prompting, right? And even though I'm using new form here, think of it more as learning how to prompt because everything is very transparent. I'm not hiding anything in term of what's going on behind the scene.

**31:21** · So, all of the skills that I'm using, they're actually prompts that are fully available for you to read and copy and bring that to your favorite tools. So, mobile and then we have template, which is the one that we're going to be focusing on. So, now we're going to take this and then we're going to bring it to an application like cloth design.

### Bring HTML plus DESIGN.md into Claude Design or Aura

**31:51** · So again, you're going to go to styles, you're going to save the design system, but also you might want to download the HTML as well. From my perspective, if you want to have something that is exactly what you have here, you want to to download the HTML file.

**32:19** · If you want just the design system, the colors, typography, the structure of the layout, then you download the design.

**32:32** · Now, now if you have both, then it's even more powerful and you can say that use the HTML as a reference and use the design MD as sort of like the foundation of the design. So now we're going to go to a project like you know like clot design and usually this is where you're going to start and they have some tutorials some examples.

**33:05** · I can't show you the steps just because I ran out of like I have limits for a lot of people. It's like three prompts and they already hit their limit. So, for example, um you know, my landing page, you're going to create this. You can either get into wireframe or highfidelity.

**33:24** · And then you're going to create that.

**33:26** · You're also, you know, you you land into sort of like the lovable vzero aura kind of layout.

**33:35** · And then you're going to drag and drop your HTML right here as well as the design right here. So once you have that, then you're going to be able to say something like create the landing page. And uh I believe we have the two files right here that you can preview.

**34:01** · And just going to copy this and then send. Uh, as you can see, I hit my limit. It doesn't take very much. I don't know what they're doing, but they have huge, huge limits. Now on Aura, we're actually one of the only platforms left that are not counting the tokens because nowadays you go on Lovable Vero and then you start prompting and then you realize that in in a single prompt you're already out of the free limits and you know it's pretty disappointing.

**34:33** · But in our case when we give you three prompts, five prompts, those are full prompts. You can get your landing page right away. So, that's exactly what I'm going to do. I'm going to create my landing page right here. I'm drag and drop. So, uh, design.md and the HTML.

**34:52** · And I'm going to use, uh, Gemini 3.1 Pro and I'm going to use HTML. Again, we're one of the the few one, if not the only one that is using HTML. And uh we also have the React version, but a lot of uh our customers actually use the HTML just because it's so much faster. And um you know, we're going to do the same thing with Stitch and um um create it here. Drag and drop the landing page and the design MD. You can you can also do one or the other, right?

**35:28** · You don't need to have both. And it's for you to experiment. This is an everchanging system and we're just getting better. We're just getting started at this point. So right now this is thinking and this is also thinking.

**35:45** · Usually it takes 2 minutes, 3 minutes, 5 minutes. Some of them a little bit slower in this case. That's why you know you have something like you know uh lovable vzero auras you know and also

**36:02** · new form here because it's HTML it's rendering everything in real time which is pretty cool because usually in React you have to wait for the whole thing to happen before you start seeing the results and um you know stitch you do have the design uh kind of design

**36:25** · system visual here and in new form you can generate multiple ones at the same time and it's really really fast again more for exploration. So let's see what it looks like. We're already almost at the end, but you can see we have everything here.

**36:49** · And you know, we have our full landing page and I use one prompt and I have more prompts that I can use. If you have a free account, you have three prompts. It doesn't count your code tokens. Some honestly often times we're actually losing money because the you know the prompt is so huge. Uh probably why all of those other platforms they decided to count the tokens instead. But in this case we haven't yet.

### Build, extend, and publish the site

**37:23** · So this is what we have and we're going to start building uh the website adding more content. So for example you can say something like add a pricing section and and testimonials.

**37:37** · uh section and then just go so on and so forth. In this case, I wonder if I, you know, I'm not sure what's going on with Stitch and why it's not really respecting the design I'm asking for.

**37:53** · From my experience in cloud design, it it did manage to do that. Um I believe it's this one. And you know I did exactly the same thing which I included the HTML but it also added more sections. Maybe that's this is why it used so much token.

**38:13** · Um in fact just from this alone I believe that it used all all the the limits almost like 50% of it which again if that's what you want that's great but sometimes you want to have a little bit more control you know uh here it does have this neat little thing in cloud design where you can customize it like the ticker speed in this case um the ticker I believe it's this one and you can make it uh slower.

**38:46** · And then uh the 3D stack style, let's see, flat, not a big change. And then the the color of the accent. So cloud design is pretty cool. My only complaint is that, you know, it's not very generous in term of tokens or because it's using Opus, it's spending like crazy, right? If if you use Opus, you you know that is a very expensive model.

**39:16** · And so if you have a free account, in in my case, I don't I don't even have a free account. I have like a pro account.

**39:23** · I have a $20 a month and I hit my limit in about three to four prompts. Now in Aura, if you have a pro account, you actually have, you know, 120 prompts, which is, you know, you can create so much with it. So you can see I added a pricing section and in testimonials and I only use two prompts, right? And uh, you know, yes, I have a, you know, I don't even need a pro account at this point just because I have two prompts.

**39:53** · But I drag and drop my design. MD. I drag and drop my HTML file. And you know, I have my beautiful landing page. And then I ask it to add the pricing section as well as the testimonial section. So at this point, you can add more sections and you can publish your website. You can have a subdomain. You can have a a custom domain. You can set the SEO.

**40:24** · And if you're a designer, you can sell your template, which again, we are actually one of the only platform that allows people to sell templates. And so far, you know, we have, you know, people in our team that have sold thousands already in term of sales from those templates. Again, you do whatever you want with it and you can publish the website.

**40:51** · You can also uh decide to you know do the same thing and turn that into a react project.

**41:02** · You know download the React project and you know publish that p push that to GitHub and Netleifi or Versel and host that. So there's just so many options that you can do with this.

**41:19** · Um, and there there's just so many tools. So, you know, Stitch, cloud design, if you can deal with the limits.

**41:28** · Some of you may might have the $100 plan, so you might be able to do this quite easily.

**41:36** · um Aura, the HTML version or the React version and then you know new form as well as variant for exploration and remixing from the community. If you only want the design system, highly recommend getdesign.nd and the other resources that are recommended by Stitch and uh you know go

**42:06** · through all of these super useful design system that you can use for your website and uh you know because it's a foundation you can just design anything you want by respecting that design system.

**42:23** · So, I hope you enjoyed this video and again, you know, let me know if I'm going too fast or too slow, but I wanted to cover all of this stuff and I wanted to listen to your feedback, which is that you want this to be more organized.

**42:40** · And um, you know, we started with the design. We generated the first design.

### The full workflow recap

**42:48** · We also remixed it. We learn a little bit about the structure of it. We got more section variation. We push that into aura cloud design, not cloud but uh cloud and uh we build the f the full site and uh ready to publish it. So I hope you enjoyed this video and let me know what you think. I'll see you in the next