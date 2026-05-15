---
title: "Google's New DESIGN.md Just Changed Claude Design Forever"
source: "https://www.youtube.com/watch?v=F44IbCaKHU0"
author:
  - "[[CreativeDesignTools]]"
published: 2026-04-29
created: 2026-05-08
description: "Google just open sourced a file format called DESIGN.md, and it's about to change how every designer prompts AI. In this video, I show you the full production workflow across three different apps — Ne"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=F44IbCaKHU0)

Google just open sourced a file format called DESIGN.md, and it's about to change how every designer prompts AI. In this video, I show you the full production workflow across three different apps — Neuform, Claude Design, and Claude Code — plus Google's open source CLI for auditing your design system. From inspiration to a shipped landing page, all powered by one portable file.  
What I cover:  
→ The 5 best sites to find design inspiration (Dribbble, Figma Community, Framer, Awwwards, Neuform)  
→ How to build a full landing page in Claude Design from a Neuform HTML or DESIGN.md file  
→ What DESIGN.md actually is and why Google open sourced it  
→ How to extract a portable DESIGN.md from any Claude Design project (workaround included)  
→ Running Google's lint CLI to catch contrast bugs and orphan tokens before you ship  
→ Handing off to Claude Code so you can iterate past Claude Design's usage limits  
What you'll learn:  
Build a complete landing page from a single Neuform inspiration without writing CSS from scratch  
Use DESIGN.md as portable context across Claude Design, Claude Code, and any other AI tool  
Audit any design system with Google's open source CLI before a single line of code gets written  
Extract design systems out of Claude Design even though there's no native export  
Move designs into Claude Code Desktop to iterate way past Claude Design's preview limits  
Understand why DESIGN.md is following the same standardization path as MCP did in 2025  
This is the fastest way to go from inspiration to a shipped landing page using AI. Instead of re-explaining your colors, fonts, and spacing in every new chat, you generate one portable file and feed it to every tool in your stack. No prompt drift, no rebuilding from scratch, no design system bloat.  
  
TIMESTAMPS  
0:00 - Intro — Google just open sourced DESIGN.md  
0:46 - Inspiration — Where to find designs that don't suck  
6:29 - Build the design in Claude Design  
15:16 - What is DESIGN.md (and why it matters)  
20:36 - Extract the spec from your Claude Design project  
23:52 - Audit your design system with Google's CLI  
29:52 - Ship to production with Claude Code  
33:53 - Outro  
  
Never miss the latest AI tools and creative workflows: https://www.creativeainews.com  
  
Try the tools:  
DESIGN.md on GitHub: https://github.com/google-labs-code/design.md  
Neuform: https://neuform.ai?via=Vpromotion  
Claude Design: https://claude.ai/design  
Claude Code: https://claude.com/product/claude-code  
Aura: https://www.aura.build/?via=Vpromotion  
  
CONNECT WITH ME  
LinkedIn: https://www.linkedin.com/in/vannarot-roeung-868679341/  
X / Twitter: https://x.com/VanhDesign  
  
DESIGN.md is Google's open source file format for AI-readable design systems. It standardizes how AI tools like Claude, Gemini, and Cursor understand your colors, typography, spacing, and components. One markdown file, vendor neutral, lintable from the command line, and portable across every tool in your AI design stack. Think of it as the design system equivalent of MCP, the protocol that became the universal standard for AI tool integration in 2025.  
If this tutorial helped you, like and subscribe for more AI design tutorials, Claude workflows, and creative AI tools.  
  
#DESIGNmd #ClaudeDesign #ClaudeCode #GoogleDesignMD #Neuform #AIWebDesign #AIDesignSystem #DesignSystem #AITools #CreativeAI #WebDesign2026 #AIWorkflow #ClaudeAI #AnthropicClaude #AIDesignTutorial #WebDesignTutorial #FrontendDevelopment #DesignTokens #AIPrompts #LandingPageDesign

## Transcript

### Intro — Google just open sourced DESIGN.md

**0:00** · Google just open sourced a file format called design.md.

**0:04** · It's already at thousands of stars on GitHub and it's about to change how every designer prompts AI. So today I'm going to show you how to use it in productions across three different apps.

**0:15** · So this video will cover six different topics. We're going to talk about the inspiration. Then we're going to build the design with cloud design. We'll understand what the design is and then we'll extract the specs. So pulling your design.md from your project. We'll then learn how to audit the system using Google CLI and finally we'll learn how to move your design out of cloud design so you can move it into more of a production workflow. So let's get started with the first topic.

**0:44** · So when we start building and designing one of the most important step is inspiration like to decide how what kind of style that you want your project to follow. And you can get inspiration from different sites. So the first one here is dribble and you know I'm sure mo most of you know this website. So it shows concepts of uh all different kinds of landing page. Uh so there's a variety of styles here. So this is good for exploration.

### Inspiration — Where to find designs that don't suck

**1:16** · And the next one is Figma community. So obviously if you use Figma then this is a plus because because they're all Figma projects. So we can work in Figma directly, right? So this is all made by the community and you will find very original designs. So the next one is the marketplace where well the the framer uh templates. So this is I would say like more premium uh designs.

**1:42** · So uh not only for in terms of style but also for like motions like for animations, interactions. So if you value these then this is super great and all of their templates are really nice. The next one is award. So this so here we we're on the uh nominees page. So uh the the advantage of this is is that they are they've been through a process. So they've been nominated.

**2:12** · So we know that these templates these designs are the best that you can find. And again this is all premium real websites in contrast of the other inspiration sites.

**2:28** · And then finally we have new form which is the difference is this one is going to be uh component focus. So you start with a component and then from that then you can expand into a section and then eventually the full landing page. So you come to the community page here and you can just browse and see what the kinds of components that the community have been building. So just look around and search for the kind of style that you like. So this is really nice. We have some um you know backgrounds here.

**2:59** · And just like the the other sites, this is also focused on animations and interactions as well. So you have different designs, different styles and also the animations and it's free.

**3:16** · So you can just come and get your inspirations from all these beautiful components and you can just come here and get the feel of all uh you know the styles the components that is in this page and then you can use the HTML or the design. MD as context. So the HTML will have also have the design right but it will also have the structure and the whole section or the whole design or you can just use the design which is like only the design system and then you can use it anywhere.

**3:52** · You can also come to the left here and look at the uh the creators here. So you can look at their designs and see all their work.

**4:07** · So, we're going to use this for uh you know to start our cloth design project.

**4:14** · So, I'm going to choose one that uh I really like.

**4:21** · So, this is really beautiful.

**4:30** · So, I really like this design right here. And it's made by Surani. So I'm going to click on it and then we can see here on the left side we have the full design and on the right side we have the design system with the typography and all the uh the the spacing. You have the icons, the buttons and everything's like this follows the structure of uh Google's design as well.

**4:57** · So it's portable. So you can use this anywhere that the design architecture is respected. So once we find a design that you really like, then all you have to do is to remix it with a prompt. So this now we're going to ask it to turn this design into a hero section and then we start the iteration process.

**5:24** · So we click on iterate.

**5:28** · So now here we can see the process working here and I already did it before. So as I said it's an iteration process. So this was the first one and then uh the second one and finally it I ended up with this one which I really like because it looks more like a real hero section.

**5:54** · So from here you can just export it or you know download the uh your files. So you can download the design. MV. So as I said it's portable. Everything is portable. So you can download this and you can use it anywhere. But for us we're going to use the HTML because we want the full section because we want the full design the structure everything uh as context. We want to recreate this in clot design to see how clot will handle it. So you download it and we're going to bring it into clot.

### Build the design in Claude Design

**6:32** · Okay. So now we're going to test this one out. So we're going to create a prototype and create a new project. So we'll just name it new project.

**6:44** · We're going to choose the high fidelity for this one and create.

**6:51** · Okay. So now we're going to add a file here. So the HTML file that we got, this will be used as context.

**7:04** · Let's look at the upload folder. We have the Arc of Fire HTML here. That's perfect.

**7:17** · Okay. So, let's ask it to create a landing page with the provided HTML file.

**7:30** · So, we'll see how it goes with just the simple prompt.

**7:34** · Send it.

**7:38** · Okay. So, let's look at the plan. It says that it's going to copy the arc of fire hero into the project.

**7:47** · Then it's going to create the design system. So the pallet the the type section rhythm. That's really nice. So based on the HTML the the design that we provided is going to create its own design system and make it like consistent across the whole landing page. We have the sections displayed here. Hero capability showcase. So we have a clear plan on what the the landing page is going to look like.

**8:11** · Then it's going to wire the scroll animation and interactions. It works on the sections first, the structure, and then it's going to work on the animations. So that's really great. And there's an additional step here which is to verify. So from Opus 4.6, they have this workflow where it's going to verify its own work after it's delivered. So that's a really nice step to make sure that the output is optimal. So, we can really see like all the steps that it's going through um while it's building this landing page from our HTML file.

**8:42** · And that's really great. We're going to give it some more time to finish and come up with uh the final result.

**8:50** · So, look at this guys. It's absolutely stunning. This is beautiful. We have the same animation as the original one and we have the same typography. Let's look at the original design that we had. So we see the original design here with the original animation this flower animation and the the but the buttons here are black and there's no header. We can see the colors here and the typography. Now let's compare it to what claw design have built.

**9:19** · So here so as I said there's a header here for the landing page and the back background blur here. So the glass morphism. So, it's really nice that it was able to keep all the animations and like all the the design itself, the hero section intact. And this is really important because when you work with something, you want to be sure that it's reliable. And every time you drop an HTML here, then you are sure that it's going to read it carefully and come up with a product that respects the design system.

**9:51** · So, we have the same big title here with a glow, which is really nice. Now let's explore the rest of the section because it's important to know if it did a good job like was it able to respect the style the color.

**10:06** · So here the this section is the capabilities.

**10:10** · We have six uh like a 2x3 grid with icons and you see that in the hover effect we have a background that is following the color. So that's really great.

**10:21** · And again the next section the showcase we have this background that is also following the design system. So this is perfect. And the next one here again we have this nice like dial um component here. Uh and it's important to know that cloud design is for design and it's not like let's say you work with cloud code then you would have uh elements and like everything functional. Uh right here it's not functional. So if you click here, you know, we can see the clicks here, but the rest is not functional.

**10:54** · Nothing changes here.

**10:58** · And that's how you have to treat this tool. It's use it for design and then if you want to make it functional or more production ready or you know kind of iterated more then I will show you how to do that later and that's really important. So stay tuned.

**11:15** · So here we have this and I this is great you know this is really cool really beautiful and it's following the same colors you know the gradients we have the orange the the red I can already see this as a nice animation already so this will be a great component for this section and we can continue on you know this is four cards uh here this says it's um four numbered step with inline code okay so this is these are the the steps and the codes.

**11:47** · And you see here everything is detailed like it explains all the sections that it just created.

**11:56** · So the pricing page here is uh you know it's really original. Usually you have like three cards and you have this like split into two two columns. You have the the pricing plan here and the kind of the FA FAQ here. So, this one works, but this on the left side doesn't do anything.

**12:19** · And again, for the CTA, the final CTA, we have this uh color that is matching our style, our design. And this is perfect with the footer and the the branding here.

**12:33** · So, again, for a first result, this is absolutely stunning. I like how it turned out for a first shot.

**12:40** · Now, cloth design is in beta. It's in preview. So, this every time you run like a prompt and you create a design, it's going to use a ton of token and you're going to run out of usage really quick. So, and it it's going to get better, I'm sure, because but now they are probably, you know, limited to their resources, the GPU they have, uh, you know, with all the people using it. So it's important to have this in mind and be thoughtful about your design process.

**13:12** · So when you use a prompt on any prompt it's going to use a lot of token but what's good is that they have an edit mode here and this acts like a real design uh app. So here you can select you see that you can select any element on the design. So let's say we select this or you know this one. So you can change the text directly here and it's going to reflect it.

**13:39** · This is great. And you have the size, the color that you can change here. Uh you know a bit of red and this. So for small adjustment then you use this instead of the prompts because it's going to run out really quick. I'm telling you and you know a lot of people have tested it and they all say the same. And it has some uh you know typical properties here. You have the typography, the size, uh it's padding, margin. So let's select this.

**14:11** · We can adjust the gap here live and the direction.

**14:24** · Okay.

**14:28** · the alignment. So we can send it uh you know at the end which is this side.

**14:38** · We can test it on some other elements.

**14:40** · So let's try on this one for the padding. So we see the padding here changing live as well. Let's test with this margin. So it's pushing you know other components as we change the padding.

**14:59** · So make sure to use this edit feature to the fullest like a regular uh design program that you use. So you can check different elements to see all uh what kind of properties that you can change and get familiar with this. So Google just open sourced the design. MD protocol. So here on their GitHub, you can see there's already 8.5K stars.

### What is DESIGN.md (and why it matters)

**15:24** · So you can think of this like a file that is used by your AI to define all the design system in your project. So you can think of the colors, typography, spacing, the components. So all of this will be defined in a way that it's going to be standardized so that everyone has a standard to follow. So everything the same.

**15:52** · So because AI is nondeterministic meaning that every time you run a prompt it's not going to give the same result every time. So this will help everyone to be to have a standard way to build a design system and also to share with all any AI that anyone is using.

**16:13** · So if you scroll down you can see like some explanation and you don't have to be like deep into this because if you really want to let's say you want to build your design system following this structure then you just have to use your AI and point it to this URL and it's going to be smart enough to understand the full structure. So your design system is going to follow this exact spec that Google have open source. And this way everyone's going to be on the same page. And they also ship a CLI tool with it.

**16:44** · So you can use this tool to analyze your design system. You can use it like in a way that you don't have to open your HTML or use screenshots. You know, it's only going to use tokens.

**16:58** · So now that we understand what uh design MD is, we can come back to new form and see it really in a real production use case. So we have this uh design here on the left and on the right we have the design system which is the design MD. So this is a visual representation of the actual design MD architecture from Google. So we have the typography, the colors, uh the buttons, the icons and the spacing and so on and so forth.

**17:27** · So this is really practical and now let's download it so that we can use it in cloud design. So this will show like a real workflow that you can use uh when you are designing and you need for example to import a design.md into your clock code design and you can do the same thing in any other tool.

**17:51** · So back in clot design here I created a new project and uh I attached the design file that we got earlier and I asked it to create a landing page with a provided design file. So the the designd file and it started to read the file and you can see here that it detected the dark mode the orange accent here the glassy surface.

**18:17** · So all of this was in our design MD file. So it rightfully analyzed and got it right and extracted all of this. So then it went into you know creating and verifying all the sections and we have it all here just like before. And when we take a look into this design, then you can already see that it's very close to the original one. So this so it's going to use the design system here, the colors, the typography and everything.

**18:48** · It's and then create another design which is similar to it but using the same design. So the difference between before when we uploaded the HTML is that when you do so, we keep everything as is. So, we asked it to create a landing page out of this hero section and it did it perfectly.

**19:09** · So, when you use a design system, it's not to recreate the same exact component that you had. It's to create other designs that are based on this design system and in a way would be a kind of a remix. So, here in the hero section, it even created a background. I don't know if you guys can see it, but I can assure you that it's there.

**19:38** · Yeah. So, it moves with uh the cursor and then it create all the sections.

**19:45** · Now, we have this really nice pricing section with this card following the same color, the design system as usual.

**19:54** · So if you compare it to uh the HTML workflow right here all the sections are well spaced because in the other one when where we use the HTML we have a lot of empty space here empty spaces between each sections. So another one here and again here. So this is again both are you know only the first shot first try.

**20:20** · So it seems like the when you are using a design system the outcome is much better more consistent because everything is defined.

**20:34** · So this is how you would use the design.md protocol in a real workflow.

### Extract the spec from your Claude Design project

**20:39** · So now what if you want to extract the design from any of your project or your design in cloud design. So as of now there's no um feature to do it natively but they have their design system but the design system is more like when you import like a a design system from Figma and then you bring it. So it's going to bring like the whole big big big system the whole the whole design system.

**21:06** · So you have the icon the typography uh you know the colors the font so everything even the logo. So that's more like for the complete design system. But if you want to extract this from one of your project that you created here then uh right now you know it's in beta. So we don't have it yet. But we have some workar around.

**21:30** · So let me show you. So you select any project that you want. In this case we have this project that we built from the HTML file this landing page. So what we're going to do is to go to the design files and then you select the file which is this one the one that represents the the the full landing page. So all you have to do is click here and download the project. So once we have the project downloaded then you can just essentially use it and and bring it to uh new form.

**22:01** · So what we're going to do is to come into here and we have this code mode here which gives access to the full code right so since we got direct access to the code then we can modify it directly so with the files that we just downloaded open it with any you know ID or any text editor that you want in this case it's NT gravity so you just have to copy the code and this is the full landing page. So you see here here it's a big uh you know it's a big file.

**22:33** · We have everything here. So we're going to going to copy that and then bring it back here in the code mode. So once we have this then we can just select everything paste our code from uh clot design. So this is the whole code that we just pasted here and then with this we can preview the page here.

**23:00** · So as you can see this is the same page that we got from cloud design and now right here it is fully displayed in this preview in new form. So instead of having just a single component, we just change uh we we brought the whole landing page here essentially and by doing that then the system will you know analyze and get all the system uh not system but the design file here on the right just like we had before.

**23:32** · So we have this for our entire design.

**23:40** · So then we can just download it as we have done before and we get the full file the full design system from uh our completely like created uh design that we got from clot design.

### Audit your design system with Google's CLI

**23:54** · Now let's come back to the Google CLI.

**23:57** · So I'm going to show you how to use this and how it's going to be helpful for you useful for any of your project. So we have the installation command here. All you have to do is to copy it and then paste the command into the terminal. So it's going to install the package and once that's done, we are going to be able to use all the commands that it has. So uh let's test this one. So this is uh a lint. So lint is a checker.

**24:23** · So it's going to check your file and analyze it and flag any like issues, any problems that it can find before runtime. So nowadays everything uses lin JavaScript, CSS and so much more.

**24:43** · So let's copy this command here and we are going to paste it in our terminal.

**24:55** · So we're going to use this package and analyze this design.md that I have in uh this folder.

**25:08** · Let's bring it up. Bring it. Resize it.

**25:12** · Okay. So, here's what we got. It analyzed it and it's showing some warning. So, for example, here we have a So, this warning here is for a button, the primary button. So, it shows a color, this color on a background of this color. So, and it says that it has a contrast ratio of this much. So, it is below the WC A.

**25:38** · So, so what that means is that the the button fails the accessibility. So, anyone with you know poor visibility or someone on their phone in a bright like uh daylight is going to have a hard time to read this. So when you're designing

**25:55** · you know most of the time in terms of accessibility then the colors are you know you have to choose between where you want to stand as because the colors the nice colors are too bright or you know really not accessible and then you can be more in the side of accessibility and have more like uh toned down colors more dull colors. So you have to wait out where you want to stand and draw a line in your design.

**26:22** · So the rest of the warnings like we can see here it's saying that it um you have some uh colors that are defined but it is never used in any components. So all of this so this means that um you know in since it's a standalone HTML file then we have no choice but to define our uh design system in that file because it's standalone.

**26:50** · Let's say you have a production uh design then you would have your stylesheet in another style another CSS style. So over there you're going to define all your design system right and then in your components you are going to use whatever you need in that component.

**27:10** · This is just a warning. It's nice that it warns us but in programming you don't want to import something uh that's you're not going to use in the component but in terms of styles and the standalone HTML then because in the production it would be defined in another in another file anyway. So uh here since it's a standalone that we can define it and it's not like as much of a big deal. And then at the bottom we can see like kind of a a check you know like a summary of your design system.

**27:41** · You have nine colors, three typography scales, two rounding level spacings and two components. Because I use a small component for for uh for this test it's this one. So there's not much you know.

**27:57** · So obviously um if you use this as a full landing page or in production then you would probably use uh most of the colors in and the typography and all of that. But these warnings are like you know they're just warnings. Nothing to be like really worried about. But it's nice to know that uh it went through all of it and bring like real would say bugs like for example this accessibility. it brings up the bugs before it's going to hit runtime.

**28:28** · So, you know, you don't have to take screenshots or run or run the app.

**28:34** · So, this is a pre-flight check if you will. So, at the bottom here, like it also gives you good indication on how your design system uh like the actual state of your design system in terms of uh the sanity check. You know, if you have like 30 colors, uh, 10 typography and and so much more, then, you know, it might indicate that your design system is way too big and just and just too messy.

**29:02** · And if you have like two colors and two typography, then this shows that your design system is way too thin. So, this is like a real good indication of how your design system is right now.

**29:18** · like a health check or reality check and then you can go and you know really play with all the the commands that they have. You can choose to use some diff you know as if you use GitHub then you know you can check all the differences uh you know between the versions you can export into many different uh framework like tailwind uh into tok design tokens.

**29:42** · Um so from here you can really just explore and uh really find which command are useful for you and as you test it I'm sure that you will find some that you will really use regularly. So once you're satisfied like with your design because cloud design is all about design uh and we know that with the usage that uh they give us we don't have much and you know we wouldn't have enough to bring iterate it into a design that we truly want.

### Ship to production with Claude Code

**30:12** · So if you hit your usage limit then there's a great way to continue working on it within the entropic ecosystem. So you just have to come here and click on hand off to cloud code. So this will give it to clot code so that we can continue working on it even if we hit the design uh the cloud design limits. So depending on the plan that you have with clock code then that will determine how many iterations that you can work uh on your design.

**30:43** · So when you click on this it's going to give you a command. So this command will tell cloud how to handle uh the design. So you just have to copy this and you either want to use it with uh cloud code in terminal depending on which one uh which platform you like terminal or the desktop app or you also have the possibility to send it to cloud code web and as well as downloading it as a zip if you want instead.

**31:16** · So if you want more to give the agent more details and you can write it here.

**31:22** · So how on what to implement like uh it's optional. So you want to let's say you just want to implement uh the hero section or something like that special instructions then you can write it here.

**31:33** · So let's send it to clot web.

**31:38** · So now we see we're in a design new project and it's exporting well the the command that we had before was pasted here and it ran it automatically. So now it's starting to work on it and the difference between cloud web and cloud desktop or terminal for example is it's going to be which resource is going to be used to build your project.

**32:00** · So on desktop or terminal is going to use your Mac or your computer. it's going to use your own resource while in uh clot web is going to use anthropics server so you

**32:15** · can offload your resources uh you know demand on their own server so I find that cloud code web is not reliable right now and also that cloud design is in beta and is in a preview so we are going to use clot desktop for this so here within the cloud desktop app uh We copied and pasted the the command that we had from cloud design.

**32:40** · So this essentially tells it to fetch the design from their server and then it started to work uh right away on it, you know, and it created the design pretty much pretty accurately. So on the right here we have the design here, the the live preview.

**32:58** · So you can see that it's really great.

**33:02** · It's like the design that we had in cloth design. So on the left we have the iteration which is where you can prompt and on the right the the live server. So this makes the iteration process so much easier and as and also on the right we have some really useful tool like this one which you can select uh any component so that it has context of it when you prompt it. So if you've worked with AI before then this will be so much easier.

**33:33** · Also, it's going to use your clock code usage because we know that clock design the usage is just really bad there. You can barely do anything.

**33:44** · So, depending on your uh enthropic plan, then you can use pretty much all your plan on this instead of uh being blocked with cloth design.

### Outro

**33:56** · So, that's the full design. MD workflow.

**33:59** · I'm putting together a deep dive course covering the full production workflow.

**34:03** · So, we're talking about cloud code, cloud design, and more tools. The link will be in the description once available. So, make sure to subscribe and I'll see you in the next