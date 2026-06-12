---
title: "3 Git Workflows Every Developer Should Know (And When to Use Each)"
source: "https://www.youtube.com/watch?v=GQQqf-C2ha4"
author:
  - "[[TechWorld with Nana]]"
channel: "TechWorld with Nana"
published: 2026-01-14
created: 2026-05-11
description: "► I've put together a handy checklist to transform manual workflows into an automated pipeline - you can grab it here: https://bit.ly/49hNEMh► Become a DevOps Expert in 6-months: https://bit.ly/4qHfR"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=GQQqf-C2ha4)

► I've put together a handy checklist to transform manual workflows into an automated pipeline - you can grab it here: https://bit.ly/49hNEMh  
► Become a DevOps Expert in 6-months: https://bit.ly/4qHfRDy  
  
In this tutorial I break down the three main Git branching strategies that teams use today: GitFlow, GitHub Flow, and Trunk-Based Development. We'll look at how they evolved, why they exist, and most importantly, when each one actually makes sense for your project.  
  
  
▬▬▬▬▬▬ 𝗧𝗵𝗮𝗻𝗸𝘀 𝗠𝗼𝗻𝗴𝗼𝗗𝗕 𝗳𝗼𝗿 𝘀𝗽𝗼𝗻𝘀𝗼𝗿𝗶𝗻𝗴 𝘁𝗵𝗶𝘀 𝘃𝗶𝗱𝗲𝗼 🙌 ▬▬▬▬▬▬  
► Check out MongoDB and start building for free: https://fandf.co/3LbC9Ou  
  
  
These Git workflows are super relevant for most development teams today. And in this video I talk about how they have evolved over time. Because here's the thing—the way we work with Git, the way we branch, merge, and deploy code has changed dramatically over the last decade. And understanding why these changes happened will help you make much better decisions for your own team.  
  
▬▬▬▬▬▬ 𝗧𝗜𝗠𝗘𝗦𝗧𝗔𝗠𝗣𝗦 ▬▬▬▬▬▬  
00:00 Intro  
01:48 Why Git Workflows Matter  
03:22 GitFlow - The Structured Approach  
08:51 GitHub Flow - The Minimalist  
14:32 Trunk-Based Development - The All-In Approach  
22:10 Why These Git Workflows Evolved  
24:50 Git Workflows in Practice (Real-World Tradeoffs)  
27:37 Practical Tips  
29:55 Key Takeaway  
  
▬▬▬▬▬▬ 𝗖𝗼𝗻𝗻𝗲𝗰𝘁 𝘄𝗶𝘁𝗵 𝗺𝗲 👋 ▬▬▬▬▬▬  
INSTAGRAM ► https://bit.ly/2F3LXYJ  
TWITTER ► https://bit.ly/3i54PUB  
LINKEDIN ► https://bit.ly/3hWOLVT  
  
GitFlow vs GitHub Flow vs Trunk-Based: Choosing the Right Strategy | Git Workflows Explained: Which One Should Your Team Actually Use? | Every Git Branching Strategy Explained (And When to Use Each) | The Complete Guide to Git Workflows in 2026 | 3 Git Workflows Every Developer Should Know (With Real Examples) | Git Branching Strategies Compared: The Good, Bad & Ugly

## Transcript

### Intro

**0:00** · In this video, we're going to talk about something that I think is super relevant for most development teams today. And that is Git workflows and specifically how they have evolved over time. Because here's the thing, the way we work with Git, the way we branch, merge, and deploy code has changed dramatically over the last decade. And understanding why these changes happened will help you make much better decisions for your own team.

**0:28** · Now, if you've ever merged code on a Friday afternoon and immediately regretted all your life choices, you know exactly what I'm talking about.

**0:38** · That usually happens when your team has no real branching strategy or worse, the wrong one for what you're trying to achieve. So let's break down the three main Git workflows that teams use today most commonly which are Git flow, GitHub flow, and trunkbased development. We will look at how they evolved, why they exist, and most importantly when each one actually makes sense for your specific project. So let's get started.

**1:10** · But first, a quick thing. We noticed that 80% of people who watch our videos every month are still not subscribed yet. Me and our entire video editor team are putting immense time and effort into each and every video to make it as valuable and high quality as possible for you.

**1:31** · So, if any of these videos have helped you at all, giving it a like and subscribing to the channel and becoming officially part of our community is the simplest way for you to support us and it would mean the world to us.

**1:46** · Seriously, thank you and let's get into it.

### Why Git Workflows Matter

**1:50** · All right, so first let me give you some context about why we even need different Git workflows. When Git was created, it was designed to be very flexible. You could basically do whatever you wanted with branches and that's great for freedom but terrible for consistency across teams.

**2:10** · So what happened is that teams started creating conventions basically agreed upon ways of working so that everyone on the team would follow the same process and this made collaboration with git easier. It made code reviews a little bit more predictable and also made deployments less stressful. But here's where it gets interesting. The right workflow for your team depends entirely on what you're building and how you're deploying it.

**2:43** · Like are you building a mobile app that users download and install where you need to support multiple versions running in the wild? or are you building a web application that deploys continuously to production multiple times a day? These two scenarios require completely different approaches and that's exactly why we have these different workflows or why we had the evolution of these workflows over time.

**3:09** · So let's start with the one that for a long time was considered the industry standard but in the last years has become a complete bad practice which is git flow.

### GitFlow - The Structured Approach

**3:24** · Gitflow was introduced by Vincent Dre in 2010 and for many years it became the branching model that everyone talked about and used in projects. The idea behind git flow is that you have multiple long lived branches in the projects and I personally have used gitflow in many projects in my earliest engineering days. The idea behind git flow is that you have multiple longived branches each one serving a specific purpose.

**3:56** · So you have a main branch for production ready code. Develop branch which is work in progress code that more or less reflects the development environment and is mainly used for integration meaning all the code that is in progress is being merged into this develop branch. Then you have feature branches for new work. So for every feature you have a dedicated branch for code related to that new feature.

**4:22** · Then you have release branches for preparing deployments or releases and you have hotfix branches for emergency fixes on production. When something breaks which is absolutely urgent and requires a fast small fix, you basically do it with this hot fix branch. Now let me show you a real world scenario where this actually makes sense. Let's say you're building a mobile application. Your users are running different versions of your app.

**4:57** · Some of them are on version 2.3, some of them are on 2.4, some have already upgraded to 3.0. Now your product manager comes to you and says, "We need to fix a critical bug in version 2.3, but we are already working on version 3.0." With Gitflow, this is actually straightforward. You create a hot fix branch from the main branch at the point where version 2.3 was released. You fix that bug and then you merge it back to both main and develop.

**5:29** · This way the fix goes into the current production version and into future releases. So when does git flow actually make sense? First, when you're building software that ships in versions, which was an old traditional way of doing things, think of use cases like desktop applications

**5:52** · where you install the application on your computer, or mobile apps or enterprise software that customers install on their own infrastructure versus accessing it directly online from the browser. Second, when you need to support multiple versions of a software simultaneously. So if you're maintaining version 2 something while developing version 3 something, Gitflow gives you the structure to handle those multiple versions and maybe do fixes in different versions.

**6:24** · Third, when your team is large and needs clear structure. So if you have many developer teams working on different features, having explicit branches for releases and hot fixes can prevent some chaos. And fourth, when you are in a regulated industry where every change needs approval and traceability because Gitflow's structured approach makes auditing easier.

**6:52** · But and this is really important point is gitflow has some serious downsides and that's why it is actually considered a bad practice and most modern projects and teams do not use it. I have not used gitflow in many years because the alternatives are just way better. So let's talk about those downsides. First of all, it really slows down your development and deployment cycle.

**7:20** · All that branch management like creating release branches and merging hot fixes back to develop, managing those longived feature branches, it adds so much overhead and complexity that your team is basically just spending a lot of time just managing the branches. Second, it does not play well with continuous delivery.

**7:43** · If you want to deploy to production multiple times a day or even once a day, having all these long lived branches creates a huge integration headache.

**7:54** · You're constantly dealing with merge conflicts because people's work has diverged for too long in these individual branches. So now developers are basically spending a lot of time just fixing the merge conflicts. And third, and this is a really interesting part, even Vincent Dreon himself, the creator of Gitflow, later said that Gitflow is not suitable for web applications that deploy continuously.

**8:20** · He literally updated his original blog post to say, "If you're doing continuous delivery, you should probably use a simpler workflow." That's like the inventor of the fax machine telling you to use email instead. So, the ugly truth about Gitflow is this. It was designed for a specific era of software development. Back then when we had version releases with slower deployment cycles and for many modern web applications, it simply does not work anymore. It is a total overkill.

### GitHub Flow - The Minimalist

**8:52** · So this brings us to a second workflow called GitHub flow which emerged as a much simpler alternative to Gitflow in terms of complexity. If Gitflow was a five course meal, GitHub flow would be a really good sandwich. It's simple, fast, it gets the job done. The core principle of GitHub flow is this. Anything in the main branch should always be deployable.

**9:21** · That's it. Just one rule. And here is how it works in practice. You create a branch from main. You make your changes.

**9:29** · You open a pull request. You get it reviewed and merge it back to main. and you deploy it immediately. That's the entire workflow. So, let me give you some real use cases or scenarios for this. Let's say it's Tuesday morning.

**9:43** · You notice that users cannot upload profile pictures on your website. So, you create a branch called fix profile upload. You fix the bug. You get it reviewed over coffee. You merge it to the main and that fix is live in production by lunchtime. Done. Simple as that. So when does GitHub flow make sense or what use cases is it perfect for? First of all, when you're building web applications that deploy constantly and continuously.

**10:13** · Think of SAS products like software as a service, APIs, web services, anything where there is only one version in production at any time.

**10:25** · or in other words, anything that is hosted versus something that you install on your own device and it's hosted with only one latest available version.

**10:35** · Second use case is when your team is small to medium-sized and moves fast. So you release your changes, your code changes, new features or bug fixes fast, in which case you don't need the complexity of Gitflow's structure. The third is when you've got solid automated testing and CI/CD pipelines.

**10:54** · Because if main is always supposed to be deployable, you need confidence that whenever new code changes get merged into main, which happen daily in this case, any problems or issues will be caught by your extensive automated tests.

**11:11** · And fourth, when you want to ship features instead of managing branches, which goes back to speed of deployment because GitHub flow basically gets out of your way and lets you focus on building and shipping things fast to the production instead of using most of your time managing and juggling different branches. But GitHub flow also has challenges. First of all, it doesn't handle multiple versions. Everything merges straight to production.

**11:40** · So if you need to support all the versions, GitHub flow will not help you here. Second, it really demands discipline and this is where the culture of your team and proper guidelines are really important.

**11:56** · If someone merges bad code and main gets broken, your entire deployment pipeline stops. And since main is always supposed to be deployable, this is a big problem.

**12:07** · And third, it can really struggle when you have multiple teams working on the same codebase because people may start stepping on each other's toes and coordinating between those teams will become harder. So the ugly truth about GitHub flow is that it assumes your team already has good habits and they're in sync.

**12:29** · But if your team treats pull requests like optional suggestions and they treat testing like homework they forgot to do, you're probably going to regret using GitHub flow for your projects when you start fighting with all these issues that sleep all the way to production. But when it works, it works really well. And lots of teams today actually use GitHub flow because it's simple and not over complicated and it allows them to work really efficiently and deploy fast.

**12:59** · And I totally agree for the right projects with the right guard rails for the team it's fantastic. Now before moving on I want to give a huge shout out to MongoDB who made this video possible. Speaking of building the right systems to support your team that applies to your data layer as well. So here's a common pain point. When you're moving fast with continuous deployment, most teams end up with what's called a database sprawl.

**13:28** · So you've got one database for operational data, another for search, maybe a vector database for AI features, and now you were spending time syncing data between all these databases instead of shipping features. And if you're building with AI, which let's be honest, most teams are exploring right now and that's where the trend is going. Atlas vector search lets you implement ragg or ra and semantic search without adding another database to your stack.

**14:00** · So it's built right in. MongoDB Atlas solves this by being a unified data platform. your operational data, vector embeddings for AI, real-time analytics, it all lives together. No synchronization headaches, no managing multiple systems, and it runs on any major cloud provider, so you are not locked in. If this is relevant for your project or work, head over to mongodb.com/atlas and you can start building for free.

**14:30** · Link is going to be in the video description.

### Trunk-Based Development - The All-In Approach

**14:34** · Now let's talk about my favorite and current industry best practice approach called trunkbased development which is what really high-erforming DevOps teams are increasingly moving toward. In most of my devos projects that I've worked in in the recent years, this is the approach that either I have used from the beginning or transition towards as one of the goals of implementing proper DevOps processes.

**15:04** · So with trunkbased development, the way it works is some teams actually commit straight to main.

**15:12** · Others use temporary branches that exist for maybe half a day before merging them back to the main. But the key principle is the same integrate continuously which means it directly ties to one of the DevOps principles of continuous integration, continuous deployment. So this is the git workflow that supports that CI/CD principle of DevOps. So let me show you a real scenario.

**15:36** · Let's say three developers are working on different parts of the checkout feature of your application and they're all committing to main multiple times a day.

**15:48** · Now you may be wondering, but that means that the work is in progress. So they are committing half-done features into the main. How does that make sense?

**15:59** · Well, here's a clever part. The trunkbased development usually uses what's called feature flex, which is basically a switch that turns on or off the parts of the code that are still in progress. So it basically hides the incomplete checkout feature implementation from users. So the code itself is in production because it's continuously integrated and deployed.

**16:22** · But the feature is not visible to the users because it's disabled using feature flex which basically means it's not executed or it's hidden from users.

**16:34** · And as part of continuous integration, every small commit to the main triggers automated tests that try to catch any issues before they get deployed to the production. So again, those three developers are continuing to work on the checkout feature and continuously deploying their commits, their small commits to the production using feature flags. By Friday, they complete their development. So the code is ready for production. So they flip the flag and the new checkout is live in production.

**17:09** · So it's not hidden anymore from the end users. It's live. And if we look at the impact of this, we have zero merge conflicts because they've been integrating continuously all week in small bite-sized commits and automated tests have been checking every small code change immediately giving the developers very fast feedback loops. So something broke they can immediately fix them. So when does trunkbased development really shine?

**17:38** · First of all, when your team consists mainly of experienced developers, I wouldn't say senior because you may have mid-level developers who are very disciplined and write clean code who work really well together and are well in sync. Second, when you've got bulletproof automated testing, that's where trunkbased development works the best. But this part is actually a non-negotiable because think about this.

**18:07** · If you're continuously deploying your code changes to production, you need to be extra careful and extra confident that you're not deploying buggy or insecure or bad code to the production. And if you don't have strong tests or extensive tests that really cover all aspects of your code and application, trunkbased development is too risky. Third, when you want rapid integration and faster deployment, that's when trunkbased development is the best approach.

**18:41** · There's a research from Dorometrics that shows that teams using trunkbased development, also known as TBD, have much better deployment frequency as well as faster recovery times. So, if something actually goes wrong in production, they can recover much faster, which makes sense because you're continuously deploying to production.

**19:00** · So every code change has a rapid iteration cycle and finally it really shines for use cases where you're shipping SAS products that continuously get updated and there is only one version in production. But here comes the flip side of this and this is very critical.

**19:21** · Trunkbased development also comes with real challenges. First of all, if you have junior developers or inexperienced developers who are not used to working with clean Git workflows or people who you just don't fully trust, they can break production accidentally.

**19:41** · Especially if your test coverage is not super extensive. So if someone commits bad code directly to main and your tests don't catch it, you're in trouble. And that automatically means that for trunkbased development to work, you need proper systems and guard rails to prevent this. So instead of relying on people knowing how to work with git workflow and that they behave so to say, you need to build a system that is solid enough that prevents anyone from accidentally damaging your production.

**20:14** · Second is when your test coverage is weak. That's when trunkbased development will bring absolute chaos to your production. But it's not always a bad thing because \[clears throat\] it immediately exposes that weakness and it shows you clearly that you need proper test coverage. Third, and finally, it requires a cultural shift because teams need to think differently about how they work.

**20:40** · The individual developers need to learn the concept of TBD and how to make smaller commits, how to use feature flex, understand continuous integration.

**20:51** · So it's not just a technical change, it's actually a mindset change. So the ugly truth about trunkbased development is that it feels reckless until you realize that it forces you actually to build the automated testing you should have had anyways in the first place. I think of it like removing training wheels, which is scary at first, but it's faster once you get it and once you learn how to use it properly.

**21:18** · And the reason why trunkbased development fits perfectly into the DevOps philosophy is because it doesn't work without strong CI/CD pipelines, automated tests, and the culture of quality. And interestingly, most engineers who have really nailed the trunkbased development in their projects absolutely believe that it is the best approach and would never switch to alternatives. That's how convincing it is once it really works.

**21:50** · And if this resonates with you, share your experience below so others who aren't using TBD yet can learn from your experience as well. And rightfully so, they would tell you that high performing teams can only do trunkbased development. There is no other option.

**22:06** · So if you get it right, you won't look for alternatives.

### Why These Git Workflows Evolved

**22:11** · So now let's talk about why these workflows evolved the way they did.

**22:16** · Gitflow made perfect sense in 2010. Back then most software was shipped in versions. He released version 1.0 then worked on version 2.0 for months before releasing again and deployment process was risky, manual, infrequent and obviously this was before DevOps days and unfortunately there's still many projects that work this way.

**22:40** · That's why DevOps engineers are still so valuable and highly demanded because that's exactly type of problems that they fix and optimize. So then something changed in the industry. We had a rise of SAS and continuous delivery. Suddenly companies like Amazon, Netflix, Spotify were deploying to production multiple times a day.

**23:04** · They were not shipping versions, they were shipping features continuously and Gitflow just didn't make sense for this way of working because it just couldn't keep up with the speed. So all these long lived branches, all that merging overhead, it was just too slow if you wanted to release really fast. So teams started simplifying. That's how GitHub flow emerged as a faster, leaner alternative for teams that wanted to deploy continuously. But even GitHub flow had limitations.

**23:36** · Pull requests could still become bottlenecks or branches could still leave too long. So teams wanted even more speed and that's where trunkbased development came in. By committing directly to main or using very shortlived branches, teams could integrate continuously. So we had a a rise of continuous integration on top of continuous deployment and they could now deploy faster than ever before. But here's something important.

**24:04** · This evolution only made sense because the underlying technology improved. In 2010, automated testing was not as mature as it is now. CSD pipelines were much harder to build. Feature flags did not exist in the way that they do today.

**24:21** · But today, we have amazing tools for automated testing, continuous integration, continuous delivery, feature management, deployment automation, and that makes trunkbased development much easier and possible in a way that it wasn't before when it first emerged. So the evolution is not just about workflows. It's about the entire ecosystem of tools and practices that support them.

### Git Workflows in Practice (Real-World Tradeoffs)

**24:50** · Now let's look at some real world reflection of these workflows because theory does not always translate to practice. One interesting thing is that many teams actually use a hybrid approach of multiple git workflows like GitHub flow and trunkbased development.

**25:11** · And I think that's actually really common that most teams don't follow a standard workflow or a textbook workflow. They kind of adapt each one to their own specific needs. uh like there are teams that use trunkbased development with release branches which is again the TBD workflow adjusted slightly with custom approach.

**25:29** · So that means they're committing to main frequently but when it's time to release they create a release branch for stability which can be a smart compromise if you're not fully ready to flip the switch but you want to kind of slowly get there. There are also some people who use trunkbased development who enforce the stability by for example restricting collaborating teams to creating PRs.

**25:57** · So that means they're little bit more careful with external teams because they don't want them to take down production with a simple typo.

**26:08** · So they create these automatic guard rails to minimize any unnecessary risk.

**26:13** · So basically the core team would use trunkbased development because they're in sync and they trust each other and they have good testing in place but any external team would have to use pull requests for an extra layer of safety.

**26:27** · And it's important to know that these hybrid approaches exist because it shows that you can mix strategies or adjust one specific git workflow slightly based on your project's needs or who's contributing how the team structure looks like and so on. And again, trunkbased development is the most beloved workflow out there and people who actually use it definitely think it's the best.

**26:50** · Now I personally 90% agree with that because I think there are valid reasons to use GitHub flow or Gitflow for certain projects that are not mature enough to use trunkbased development. So they shouldn't jump to it straight away.

**27:06** · They should slowly fix the underlying issues they have so they could move eventually to trunkbased development because the underlying point of trunkbased development is actually valid which is if you want to be a high performing team you need to invest in the practices that enable trunkbased development which is strong testing CI/CD feature flags culture of continuous integration and so on which are basically part of DevOps practices.

### Practical Tips

**27:38** · Now before we wrap up, let me give you some practical tips for implementing a proper Git workflow in your project.

**27:46** · First step, automate everything you can.

**27:50** · No matter which workflow you choose for your current project with the current limitations, automation is your friend and that should be the first step you start with. Automated tests, automated CI/CD pipelines, linting, code formatting, automated security scanning and testing. Automate everything. There are so many tools out there that allow you to do that. Second, very important, document your process.

**28:14** · Write down your team's branching strategy, commit message conventions, code review expectations, pull request workflow details that everyone should follow.

**28:27** · Don't assume everyone knows the rules because documenting will increase consistency for each individual engineer in your team. Third, use tools that support your workflow. For example, if you're doing trunkbased development, you might want to check out a tool called TBD Flow, which is a command line tool that helps you stay in flow with trunkbased development. It will basically automate common tasks like committing to main or creating short-lived branches and enforcing conventional commit messages.

**28:58** · Next one is measure your performance. And this might be new for a lot of teams who have never done this before but track metrics like deployment frequency, lead time for changes, time to restore service. If you want to get a clear picture of how Git workflow and these underlying improvements like automated testing and so on actually make your team more efficient and these are called Dora metrics that very clearly show you if

**29:28** · your current workflow is actually working and making your team slow or fast and finally iterate. Your workflow should evolve as your team and product evolves. So don't be afraid to change it if it's not working anymore. Do not get stuck by using a workflow that you considered a standard either in industry or in your team or company just because you have been doing it for many years.

### Key Takeaway

**29:56** · So the key takeaway is this. The git workflow you should aspire to is trunkbased development. But there are valid cases for other use cases plus hybrid approaches depending on the maturity level of your team and underlying systems. So there is no onesizefitsall answer because the best workflow is the one that fits your team, your product and your deployment process currently right now the best.

**30:24** · But if I have to give you one piece of advice, it is this. Optimize for speed of feedback.

**30:34** · The faster you can get code from a developer's machine to production, the faster you can learn and improve. And that usually means simpler workflows, not more complex ones. So, pick what fits your team, faster tests and more extensive tests, and don't be afraid to evolve as you grow. So, that's it for this video. If you found this helpful, make sure to share it with one colleague or friend who you think will benefit from this knowledge as well.

**31:04** · Or share it with your team if you're thinking about changing your Git workflow. And let me know in the comments which Git workflow your team currently uses and whether it's actually working for you. Share your experience with others in the community because we can all learn from each other. And I would really love to hear your real world experiences. And with that, thanks for watching and I'll see you in the next video.