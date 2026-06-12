---
title: "Marketing Brain: My AI SEO System Walkthrough (Claude Code + Obsidian)"
source: "https://www.youtube.com/watch?v=1ZDwzDKtyo0"
author:
  - "[[Agrici Daniel]]"
published: 2026-05-08
created: 2026-05-11
description: "I built Marketing Brain, an Obsidian vault + Claude Code/Codex skill that turns DataForSEO research into a working 30/60/90-day SEO strategy. This is the live walkthrough I gave the AI Marketing Hub P"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=1ZDwzDKtyo0)

I built Marketing Brain, an Obsidian vault + Claude Code/Codex skill that turns DataForSEO research into a working 30/60/90-day SEO strategy. This is the live walkthrough I gave the AI Marketing Hub Pro community.  
  
In this video I run it against two real client sites: Christopher's Minneapolis Maids site, and Gram's affiliate site recovering from the 2023 Google core update. We pull 18,000 unique keywords from Gram's top 10 competitors, automatically, and turn that into a strategy vault that compounds with every run.  
  
Marketing Brain is a Claude Code SEO skill. It scaffolds an Obsidian strategy vault, mines People Also Ask, builds a deduplicated keyword workbook, and synthesizes the ULTIMATE BEAST plan: a practical execution map for AI search, AI Overviews, and Google SERP. Pure white-hat. No fluff.  
  
🎯 GET MARKETING BRAIN:  
► AI Marketing Hub Pro (theory to action, paid): https://www.skool.com/ai-marketing-hub-pro  
or here if you don't like skool: https://erniseth.gumroad.com/l/ai-marketing-brain  
  
🛠️ WHAT YOU NEED TO RUN IT:  
► Obsidian (free): https://obsidian.md  
► Claude Code or Codex CLI subscription  
► DataForSEO API key (cost cap defaults to $5 per run, typical run is under $1)  
  
⏱️ TIMESTAMPS:  
0:00 Why most SEO setups don't compound  
0:38 What Marketing Brain actually is  
1:30 The three things you need to run it  
2:30 Inside the template (business types, agents, metadata)  
3:30 FLOW framework: Find, Leverage, Optimize, Win  
4:50 18,000 keywords from 10 competitors (live demo)  
6:00 The 6-step pipeline (workbook, SERP mining, vault, BEAST plan)  
6:40 Why the brain compounds with every run  
7:30 Integrations: claude-seo, FLOW, claude-blog  
8:20 Real example: Gram's site recovering from the 2023 Google update  
10:30 Decisions, deliverables, and the cannibalization ledger  
12:00 Hot / Index / Wiki (Karpathy pattern)  
12:30 Token economy and setup time  
13:48 Where to get Marketing Brain  
  
🔗 RELATED PROJECTS:  
► Claude SEO (companion skill): https://github.com/AgriciDaniel/claude-seo  
► Claude Blog (companion skill): https://github.com/AgriciDaniel/claude-blog  
► Claude Ads (companion skill): https://github.com/AgriciDaniel/claude-ads  
► Flow (framework): https://github.com/AgriciDaniel/flow  
  
Join our free hub:  
► AI Marketing Hub (2,000+ members, free): https://www.skool.com/ai-marketing-hub  
  
💻 INSTALL CLAUDE CODE + VS CODE:  
► Claude Code Docs: https://code.claude.com/docs  
► VS Code Download: https://code.visualstudio.com/  
  
📝 RANKING CASE STUDIES IN THE COMMUNITY:  
► claude-seo.md ranked using this exact system. Pure white-hat, one run.  
  
🌐 WEBSITES IN THIS VIDEO:  
► Rankenstein Pro: https://rankenstein.pro (the engine that ships these skills)  
  
👨‍💻 ABOUT ME:  
I'm Daniel, host of AI Marketing Hub. I help people learn AI tools for marketing and automation. I build open-source tools because everyone deserves access to the good stuff.  
  
🌐 Website: https://agricidaniel.com  
📺 Subscribe: /@AgriciDaniel  
  
This video covers: Claude Code SEO skill, Claude Code SEO agent, Claude Code SEO plugin, Claude code seo github, Claude code seo tutorial, AI SEO workflow, agentic SEO, AI agents for SEO, Obsidian SEO vault, DataForSEO automation, Marketing Brain, AI Marketing Hub, AI Marketing Hub Pro, GEO AI optimization, FLOW Framework, ULTIMATE BEAST plan, Hot Index Wiki Karpathy pattern, AI Overviews optimization, AI search optimization, white-hat SEO, SEO automation 2026, Obsidian for SEO, claude-seo, claude-blog.  
  
#ClaudeCode #SEO #Obsidian #AIMarketing #DataForSEO #ClaudeCodeSEO #AIMarketingHub #AISeoSkill

## Transcript

### Why most SEO setups don't compound

**0:00** · I think the recording will start in three two one the recording has started and hi everyone I was just explaining right now for the guys our Marketing Brain which is our new upcoming uh it's already there if really I will touch it as a zip I will try to make it to put it also on our private organization repository but I'm presenting you today the Marketing Brain which is something that will if really that that's all that's all hellas guys I mean other things I mean of course it'll be better things in future but this is the ultimate template that will

**0:28** · help you rank yeah Yes, you can have Claude SEO, you can have Claude Blog, but if you don't have a specific strategy in place and you don't know what to do next, or let's say you're not ranking, then it's not good.

### What Marketing Brain actually is

**0:38** · That's why the Marketing Brain comes to place.

**0:41** · So this is an Obsidian Vault, if really it's files.

**0:43** · So it's a memory, it's a full template for marketing and SEO, for your AI agents, that being, it doesn't matter, if really.

**0:50** · You can connect your Claude, you can create your Codex, your Gemini, your Claude, any sort of AI model, you can connect to this Obsidian brain.

**0:58** · the only thing that you need to prompt is hey make it for my business so imagine this is how this brain looks like I'll try to magnify right now so inside here say ULTIMATE BEAST plan yeah they they want 13 so it's it creates for you if really the whole skeleton the body the strategy the research everything is done here the only thing that you will need are three things

**1:20** · the obsidian application Claude or Codex subscription and third is DataForSEO API so let me show you an example how it is an index yeah I think everyone knows already what a Hot / Index / Wiki is index is basically the links the interlinking between all of them so if you're going to personal start here right now I have client name so as I mentioned before this is a template for your business so let's say in our case scenario it's let's say claude-SEO.md or rankenstein.pro

### The three things you need to run it

**1:49** · my website our website right so when I'm going to turn this into let's say Marketing Brain for one specific business let's say maybe you have uh lucky no case scenario or Minneapolis Maids Christopher right you have that website so you can put just hey create this brain for Minneapolis Maids .com and it will do that so this is a whole template and it's a lot of pages

**2:12** · guys this is only step one then we have business type here affiliate content here we have e -commerce template for e -commerce for lead gen B2B local SEO services publisher news SaaS any sort of businesses here we have also oh wow there's so many things here I can't even tell

**2:28** · you like let me just say got it through we have agents which is the BEAST planner that will follow the flow structure for your specific business and of course here look at that client metadata client name which is going to be yours when you set it up website URL your slog your date your owner and anything else so this machine this Marketing Brain will scrape for you everything you need for your business to rank at that at the same time it will create for you

### Inside the template (business types, agents, metadata)

**2:56** · a strategy following the FLOW concept so let me guide you to the repo and I'm going to guide you also the steps what exactly is happening right here so we follow here FLOW Framework and to explain exactly once again what is flow yeah I'll magnify this FLOW SEO is in 2022 2023 there was one very successful SEO strategy named the ski slope strategy it was following the hub pillars clusters so basically let's say imagine it as a pyramid and flow follows the exact

**3:25** · same style but with 2026 and 2025 some data yeah follow I here was create over 7,000 websites and over 56 total of 57 books and of course the specifics gives low ski slope strategy and that's how flow came into fruition it's a very strong strategy following the best and latest uh AI infrastructure AI SEO GEO whatever there is uh so that's how Marketing Brain comes into

### FLOW framework: Find, Leverage, Optimize, Win

**3:47** · place let me tell you just an example of what happens here so we have the six step pipeline so we have the brain we have the template right now yeah and now to make this template fill in the data about your company it needs to follow specific steps as I mentioned before you need to have DataForSEO API here so first it will find top 10 competitors via DataForSEO SERP

**4:09** · quite easy task for Claude to do right so as soon as it defines uh those 10 competitors it will pull every keyword of each competitors and in DataForSEO there is one specific module I mean a feature that you can pull on the keywords what any page is ranking for and this list guys is huge by huge I mean huge this is an example of a list of keywords of only top 10 competitors

**4:32** · for Minneapolis Maids in this case it was for Christopher yeah so here we have keyword we have topic cluster we have search volume CPC competition level, competition, keyword difficulty, intent, SERP features, best competitor ranking, best competitor, best competitor URL, competitor title, and there's much more.

### 18,000 keywords from 10 competitors (live demo)

**4:51** · If really, all the data about what keywords your top 10 competitors are ranking for.

**4:58** · And you want to see the crazy stuff?

**4:59** · I'm going to scroll down now.

**5:01** · So here, only from top 10 competitors, it found over 18,000 unique keywords there's no duplication here unique keywords a total of 18,000 and all this data came into seconds only because of these two simple steps that we're doing the beginning so the main point here is that we are getting top 10 competitors we're getting the keywords that they're ranking for and then comes the next step I mean you get it right there's a lot of information right here and this is more than enough so you will outrank

**5:30** · and rank everyone then we're going build the XLS which I just showed you right now we're gonna mine the SERP top 10 highest volume keyword so going back to that specific let's say list of what keywords your competitor is ranking for right we're gonna get top 100 with the highest search volume yeah so if you don't know what search volume is basically there's let's say potatoes

**5:53** · yeah potato is a very high searchable keyword in different states of course it matters and it will take the ones that are being searched the most top 100 from 20,000 now based on those top 100 and 20,000 we'll find what people are asking for on your niche and based on that specific

### The 6-step pipeline (workbook, SERP mining, vault, BEAST plan)

**6:09** · data if really we're going to create a strategy if we're going to scaffold an Obsidian Vault from the template slot fill client info business type overlay populate from research data yeah because we don't need to do here super fancy researching All the data is there and basically what the Marketing Brain will do for you, it will search your competitors, search their keywords, build for you a unique keyword portfolio and create for you a 30-, 60-, or 90-day plan so you can rank, so you will outrank.

**6:39** · Everyone, the main mission is to rank first.

### Why the brain compounds with every run

**6:41** · Strategic framework, as I mentioned before, it's flow.

**6:44** · Yeah, it's find, leverage, optimize, and win.

**6:47** · You can search in our Skool community more about it because I have made a video about it before.

**6:51** · It's a very, very, very, very strong start to everyone.

**6:54** · So once again, raw sources, which is basically from DataForSEO.

**6:59** · We have the Obsidian Wiki.

**7:01** · We have visual reference, deliverables, and keyword workbook done.

**7:04** · We don't need anything else here.

**7:06** · And it will be just one loop.

**7:07** · So let's say it will be an ever-growing strategy.

**7:09** · So this is the most, the beauty about it is that this brain, this brain that we see right now in front of you, it will grow with you.

**7:17** · It will become bigger and bigger and bigger and bigger.

**7:19** · And that's the beauty as your project is getting bigger.

**7:23** · so does this brain and that's it if really that's it guys I mean this is just one template for you not to you know not knowing what to do this we're just going to guide you through the whole process of what to rank on how to rank here the most important thing is also for you to know is that integration with other skills here we have Claude SEO as the main also it can be Codex SEO just for information we have FLOW Framework which is already integrated here and we also have Claude Blog optional if you want to create the blogs for your page yeah because Claude Blog creates fantastic pages and that's the overall thing about the AI Marketing Brain

### Integrations: claude-seo, FLOW, claude-blog

**7:58** · so once again what it is a strategic SEO orchestrated by artificial intelligence a complete pipeline from competitor mining to the ULTIMATE BEAST plan it will create for you the vault it's basically a template so this is an example of a template how it looks as I mentioned before pressing once again an overview client name now I'm going to just show you one made let's say for Gram yeah um our dear member of our community.

### Real example: Gram's site recovering from the 2023 Google update

**8:20** · I'm going to press here the exact same Obsidian Vault.

**8:23** · Oh, this is the older one before I updated, by the way, but just going to show an example.

**8:26** · Press on index.

**8:27** · Here we have straight away also the exact same process, in a way.

**8:30** · If we're going to press on overview, here already we have his website lost most its organic traffic to a Google update in 2023.

**8:37** · I think many people have lost their traffic in 2023 because of that crazy Google update, right?

**8:41** · So it prepared a plan.

**8:44** · Priority order.

**8:45** · Let's say day zero, capture Google Search Console, Ezoic RPM, and affiliate revenue.

**8:50** · You don't need to do anything of these guys.

**8:52** · I'm just showcasing you what's happening behind the scenes.

**8:54** · You will need to just to follow Claude's steps because sometimes you will need to have some manual steps that are required to be done.

**9:01** · Those manual steps are really that being connecting your Google search.

**9:06** · So if you want your pages or your website to automatically index and for you not to go to Search Console and for you to, let's say, for you to go, right, put here, you need to put your website for example yeah this takes a lot of time you need to wait so all of these search indexing stuff and google search stuff and PageSpeed Insights whatever there is this system covers it also the indexation for you but you will need to set up your

**9:31** · google console with Claude as an API so make sure that you just follow its step because it will guide you through the process now going back to the Obsidian Vault again this is what it made right now Ezoic revenue and core web vitals it checks that, it checks all the information about your site, about your project yeah, this is just for their own understanding, like okay, what needs to be fixed, what needs to be done, here are the decisions if you see right now, even on my right hand side so here I have decisions made by this specific system for Gram,

**10:03** · so per link hygiene, every affiliate links carries, rel="sponsored", nofollow yeah, so target="\_blank", it's fine but not required, if you're in a SEO, you can understand exactly what I'm talking about but if you're not, then it's okay let Claude do the work for you we have here decisions booking attribution plan community citation strategy consolidated guide fixed home page and contact keyword to URL map

**10:26** · for example yeah keywords again the keyword research was being was was done and right now it prepared everything for each and every specific page so of course the most important thing is for us to take into consideration is the cannibalization because if you use the exact same keyword for two different pages those can become null so even this is taken consideration audits

### Decisions, deliverables, and the cannibalization ledger

**10:47** · that are being done concepts that are being integrated decisions that need to be made where we're done and also deliverables in the end which is Dual Surface Scorecard for example Full FLOW Review based on best practices and of course entities which is your business itself imagine

**11:03** · all of this was done only because of this template and then the plan of action day one day two until five day six to 12 day 13 to 18 and you have a whole month plan right now we have the keywords yes I mentioned before q cannibalization ledger right here rule we have also rules set here for uh for Gram without him touching a word I just run this exact brain exact strategy

**11:25** · on his website I said hey prepare it for this website which is I put his website and it did everything guys all of this information I don't think any LLM in the current present date and time does all of this but I think you get the overall thing exactly what the system is being doing I know it's a lot of text don't be afraid of text because people nowadays because of all this AI they're tired of reading but this is once again it's not for you also it's for you if you want to review and you want to really rank and you're serious about your stuff you'll

**11:57** · definitely need to review this but if you're too lazy you just run your Claude and let it cook that's it hot index concept is that same thing from Karpathy style andrew Karpathy I think many of you have known that already you can integrate Codex yes of course can you do other models as I mentioned before yes of course best performing models so far for this is Codex and Claude the rest Gemini still is a little bit but it still does the job the most important

### Hot / Index / Wiki (Karpathy pattern)

**12:23** · thing is for you to feed this Obsidian Vault to your agent and your marketing is done your SEO is done and if something doesn't work here you also follow concept which is best practices everyone just for information best practices this in also so if something doesn't work we try again but you never give up so this is the main point of the Marketing Brain it follows best principles uh up-to-date information in regards to AI I don't think there's anything like this

### Token economy and setup time

**12:50** · and I'm so proud and I'm so happy to share with you guys the current Marketing Brain and I definitely recommend you to install it on our business it's an Obsidian Vault you need DataForSEO API to run it and that's it you have 10 clients you run it for different clients yeah if you have 10 you have 20 you run it for 20 my best advice just download the zip I will share with

**13:11** · you guys in just a moment by the way you just download the zip uh unpack it in your project folder yeah just for reference or any place secure and then let it run it'll run maybe for around half an hour to an hour I give it give or take even two if there's a lot of pages if you have more than 1,000 pages maybe three four uh four times but just for information it's fully optimized also for token usage so let's say you will not burn a lot of tokens here why because there's a template here and specific steps there's an SOP set in place here following four principles and best AI marketing practices as mentioned by 2026.

**13:47** · and guys this is Marketing Brain uh this was a short info and how it works um let me share with you right now and also let me stop the recording so we can also have a chat and the recording has stopped in three two and one