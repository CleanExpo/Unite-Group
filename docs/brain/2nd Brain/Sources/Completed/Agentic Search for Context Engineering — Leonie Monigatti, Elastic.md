---
title: "Agentic Search for Context Engineering — Leonie Monigatti, Elastic"
source: "https://www.youtube.com/watch?v=ynJyIKwjonM&t=1s"
author:
  - "[[AI Engineer]]"
channel: "AI Engineer"
published: 2026-05-08
created: 2026-05-13
description: "Getting context into an LLM is not just a retrieval problem. It is a search problem. This workshop digs into the part of context engineering that usually gets waved away: how agents actually decide wh"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=ynJyIKwjonM)

Getting context into an LLM is not just a retrieval problem. It is a search problem. This workshop digs into the part of context engineering that usually gets waved away: how agents actually decide what to pull from files, databases, memory, and the web, and why that choice often matters more than the model itself.  
  
Across semantic search, general-purpose database tools, shell-based retrieval, and agent skills, Leonie Monigatti shows where each search interface works, where it breaks, and how to combine them into a more effective retrieval stack. If you're building agents and trying to make retrieval less brittle, this is a practical guide to the real mechanics behind agentic search.  
  
Workshop repo: https://github.com/iamleonie/workshop-agentic-search  
  
Speaker info:  
\- https://x.com/helloiamleonie  
\- https://www.linkedin.com/in/804250ab/  
  
Timestamps:  
0:00:00 - Introduction and Welcome  
0:00:51 - Defining Context Engineering and the role of Search  
0:02:21 - Historical context: From RAG to Agentic RAG  
0:04:30 - Context sources (local files, memory, databases, web)  
0:06:30 - Introduction to the Shell tool and its versatility  
0:08:50 - Failure modes in agentic search  
0:10:41 - The importance of tool descriptions and parameter design  
0:13:53 - Code Demo: Simple semantic search and its limitations  
0:23:26 - Code Demo: General purpose database query (ESQL)  
0:28:36 - Code Demo: Adding Agent Skills for better interaction  
0:34:42 - Code Demo: Using the Shell tool for file system retrieval  
0:41:26 - Code Demo: Integrating custom CLIs (Gina Grap)  
0:44:42 - Practical recommendations for building a search tool stack  
0:49:16 - Q&A Session begins

## Transcript

### Introduction and Welcome

**0:15** · Everyone ready?

**0:16** · Yes.

**0:17** · Awesome. Welcome to AI engineer. Thanks for joining my session. We are going to be talking about agentic search for context engineering today. My name is Leonei. I work at Elastic, the company behind Elastic Search.

**0:35** · And usually I like to talk about retrieval on Twitter. Today I'm super excited to be doing this in person. Uh, a little bit of housekeeping. If you want to access the slides and the code we will be looking at, you can scan the QR code. So let's start with why I'm excited about search and retrieval and hopefully why you are excited about it by the end of this workshop as well.

### Defining Context Engineering and the role of Search

**1:02** · Who here has built an agent or some form of it before?

**1:07** · Awesome. Then you've probably then you're probably not intimidated by this uh image. You've probably seen some some alternative to this one before. This is essentially what context engineering looks like. So context engineering when we talk about it is the art or engineering techniques about how from all of the possible context sources we have, how do we actually decide what goes into the context window so our LLMs can uh generate the best responses.

**1:40** · Often when we talk about this, we talk about context curation and we mean this little this little arrow from context sources to context window. But we're not giving this little arrow right there enough uh credit in my opinion because what's powering this is the search tool or search tools that actually decide what goes from context sources to the context window. And today we're going to be looking at the different search tools we have. So this is my personal hot take.

**2:12** · I like to say that context engineering is about 80% agentic search because it's this little box right here. All right, let's start with a little bit of history. And when I say history, I mean the last three years.

### Historical context: From RAG to Agentic RAG

**2:28** · Rag. Um when we started with rag the original idea was that we had a fixed retrieval pipeline. So the user message would usually more or less ver verbatim be used as a search query to be used usually as a vector search query to pull some data or chunks uh from a database and together with a retrieved context. it would the user message would go into the context window and then it would be fed to the LLM.

**3:02** · Nice.

**3:03** · This has clearly many limitations. So since this is a fixed pipeline whether or not you actually need any context, you're still retrieving additional information and in the worst case that can actually confuse your LLM.

**3:18** · Right?

**3:19** · On the other hand, if you're only retrieving once, let's say you need some multihop retrieval, you're asking your LLM something more complex, then if you're only retrieving once, maybe the retrieved chunks um reveal some information about another search query you need, then you would actually might want to have a second round of search, right? So that's why we then moved on to aentic rag.

**3:48** · So we replace the fixed pipeline with now a search tool. So now the agent can decide by himself by itself uh whether or not to call the search tool and retrieve some information. So we don't have the problem anymore of do I actually need any information and when I actually retrieve information is this even relevant? Do I need to retrieve more?

**4:14** · Um, do I actually have to retrieve something, rewrite the search query? Um, yeah.

**4:25** · So, we still only have one context source in this case, one database. Now, when we look at context engineering, the context lies in many different places, right? So, we have context sources in local files. So when you think about your coding agent, you probably have your um coding project in or code files laying around in your local file system, maybe you're using um some kind of working memory like a scratch pad.

### Context sources (local files, memory, databases, web)

**4:54** · So you're planning with your um agent what you want to do. Then you probably have something like a plan MD file. When you have agent skills, you also have them usually in a local folder somewhere. We still have databases because many enterprises have their data stored in databases.

**5:16** · Um, we have the web as another context source. And I know this is a super controversial uh image here because I did not commit to having the long-term memory in the local file system or the database. This is I think a currently a very big discussion. We can get into this in the Q&amp;A if you like. But we also have long-term memory as another context source. Right?

**5:41** · So how do we actually retrieve context from these? Usually we have a set of um let's say context source native search tools. So for the local files you usually have something like um a search files um tool. For skills you usually have a skill loading tool. When you think about databases, we have a little bit more custom tools.

**6:08** · So, um something like a semantic search tool. Maybe you also have something more um general purpose like a tool that lets you execute entire search queries against a database like SQL for example. For web you have web search tools and for memory you have something like a dedicated memory tool. If that's not overwhelming enough, we now also have something called a shell tool. Um, Langchain calls it shell tool.

### Introduction to the Shell tool and its versatility

**6:39** · Anthropic calls it the bash tool. If you've experienced uh if you've played around with open cloud, it's called the exec tool. But what all of these tools do is they let your agent run commands in the terminal. And that actually makes them super uh versatile because now you can let your agent um use CLIs to navigate your um and explore your local files. So you can just run ls and grab to find data in your local file system.

**7:12** · If your database has a custom CLI, you can actually let the agent also use the shell tool um and interact with the database. You could also let your agent write an entire search entire script from scratch like connect to your database, run a search query.

**7:32** · Um, if your database is exposed via HTTPS, you can just run a curl command, interact with the database through the shell tool. Speaking of curl commands, you can also um do web searches if you like. So this shell tool is super versatile, right? So the question and the topic of today is what search tool do we actually need? Do we only need a s a shell tool? Do I need all of these?

**8:04** · And if you take home only one thing from today is that doing good search is incredibly difficult and that's why we have many different techniques to do search. Right? We have vector search, we have keyword search, even in vector search, we have dense embeddings, sparse embeddings, multi vector embeddings.

**8:25** · Then we have many different indexing techniques. So depending on what kind of search requirements and latency requirements you have, you will need to curate your own stack of search tools. Right?

**8:41** · So today we're going to be looking at a few of these. Unfortunately, we only have one hour, so I cannot show you all of them. Um, before we get into some code, I want to um give you a few fundamentals um of building good search tools because agentic search at the surface level seems very straightforward. The user makes a request. The agent calls the right tool with the right parameters.

### Failure modes in agentic search

**9:13** · I see someone laughing. Um, the retrieval tool gives you the tool response and then your agent uh responds to you with the correct answer. At Elastic, we help a lot of internal and external teams build uh agents based to interact with elastic search data.

**9:33** · And the reality is that this can break in many different ways. I'm just going to show you three um today. So the first is the agent doesn't call any tool. So this means the agent decides I actually can answer this question based on my parametric knowledge. I don't need to use any um context retrieval tool. And the other problem is that the agent calls the wrong tool.

**9:59** · I was recently talking to a colleague of mine was asking him what was your the most challenging aspect of your project and he was like you won't believe it but it was really difficult to get the agent to actually not call the web search tool but call the database search tool right and then depending on how complex your parameters are for your search tools it can also be quite challenging to get your agent to generate the right um search parameters, right?

**10:34** · There's many more failure cases, but we're going to limit this to to these three today. So, I personally hate this slide because I feel like everyone in this room probably knows um that the tool description is the most important aspect, but anytime I see a tool description, it's like the least effort, one sentence, and then you're wondering why your agent isn't calling the right tool. So, arguably, this is a very long tool description.

### The importance of tool descriptions and parameter design

**11:04** · I'm not saying you have to write it like this. I'm just saying if you just start with a core purpose, if it works fine, great. But if you add more parameters or more tools and your agent is starting to struggle with calling the right uh tool, then maybe add some trigger condition.

**11:26** · When should this tool be used? When should this tool not be used? Especially if you have multiple tools. Um, adding something like relationships is super important, like first call this agent skill before you actually call this tool or get some confirmation before you call this tool.

**11:46** · If you have the perfect tool description and your agent still doesn't call the right tool, then reinforce it in the agent system prompt. That should actually um help out in most cases. Then I want to quickly touch on some on the parameter complexity.

**12:06** · If you have a search tool that's just very simple in in the sense that something like get customer by ID, it should be fairly straightforward for the agent to generate an ID parameter given that it's a valid ID. Um same for if you're doing a semantic search, right?

**12:24** · generating some valid string should be shouldn't cause any any issues. But let's say if you want to have a semantic search tool and instead of just giving um a topic, you now also want to give it some filter conditions, maybe you want to define the top K. Then you start to have more parameters, right? This isn't very complex here, but the longer the list of parameters you have, the more difficult um it's going to get for the agent to generate the right ones.

**12:57** · And I think a very complex one for an agent is to when you have something that's more general purpose like letting the agent um execute um entire search queries against a database. So here I have ESQL which is the elastic search query language could be could be SQL as well. So letting the agent write an entire SQL query from scratch can be quite challenging. Most are pretty good, but um some aren't.

**13:22** · So just keep in mind um let's say the the complexity of the parameter also is kind of a failure mode and you can you might need to help the agent out with um a few of these if the they are more complex. Good. Let's look at some code.

### Code Demo: Simple semantic search and its limitations

**13:53** · Okay, so quick show of hands. Who here has built some sort of agentic rag, agentic surge before?

**14:09** · Okay, about half. That's good. Um, so we're going to be looking at three things. Uh, I'm going to give you a quick recap or intro to the very vanilla agentic search demo. And then I'm going to show you how easy it is to break this usual demo. And then we're replacing the semantic search tool with something more general purpose. So we're letting the agent write an entire search query from scratch.

**14:39** · And for these two examples, we will be using um a local elastic search cluster as a context source. And then for the third part, I'm switching gears and I'm going to be showing you how search over local file system works um with the bash tool. And then I'm also going to show the shell tool. And then I'm also going to show you um some limitations of the shell tool and how you can expand it with custom CLIs.

**15:10** · All right. The example that we'll be doing today is I have the conference session data of this conference here. And let me let me start show you this one. So just a quick recap.

**15:27** · We have elastic search database and we're going to be writing a semantic search um search tool. And for in the database I have the conference session um already chunked. You probably already know how to chunk and store data in a database. So we're skipping this part. This is not the important aspect. So, what do we need for an agent, an LLM? Oh, sorry.

**16:01** · We're going to be using lang chain for this um session just because it wraps a lot of the complexity and uh I don't like it lets us concentrate on the high level concepts. also has some nice built-in features like uh the shell tool is built in and it has some uh code samples for skill loading tools which we will be looking at later. Okay, switching back. I'm using GPT 5.4 Nano for this demo.

**16:34** · Then we're defining a very simple system prompt. So the usual you are a search agent tasked with answering questions. Um you have access to different context retrieval tools and before answering a question oops decide whether or not you need to retrieve additional context to help the agent a little bit I have some information about how the data is um structured in elastic search. So here we have a text field.

**17:02** · It's comprised of the title of each session and the description of each session and the text field is what actually gets embedded um as the vector embeddings for semantic search and then I also have some metadata fields. So for example the day, the time, the room, um the speaker's name. So since the metadata is not embedded, I can only run um filters over them but not any semantic search just for your information.

**17:36** · Okay, now the interesting part let's build a semantic search tool. So how that works in lang chain is I have to first define an embedding model. In this case I'm using the new genome embeddings v5 model.

**17:53** · Um this is used to embed the search queries at query time and the embedding model I'm putting in with putting it into my um elastic search store together with the elastic data to create a vector store and then I can create a search tool. So in this case I have all I have to do is I call the similarity search method.

**18:24** · It takes in a search query and in this case I'm setting the limit or the top K to three.

**18:32** · This is a little bit of foreshadowing because I'm limiting the capabilities of this tool to just returning three search results. Right?

**18:43** · What's nice in Langchain as well is that when you use the tool decorator up here, it lets you convert any Python function into a search tool uh sorry into an agent tool.

**18:56** · So by default, it takes the um functions u Python functions name as the tool name and the dock string down here is going to uh convert going to get converted into the tool description. You can see I'm breaking my own rule by having a very short tool description here. Why this works is because I only have one search tool here, right?

**19:21** · So you will see I'm adding a few things later on, but it's not going to get very descriptive in this demo here. So now we can um run a test and test it for a search query of regulatory constraints. And you can see it finds a talk by my friend B on engineering AI systems under server constraints and it also finds some more talks. One by TAS and one by Pedro. All right, let's plug it in.

**19:58** · So we're plugging in the LM, the system prompt, and the search tool. I'm leaving out memory. Obviously, this would be another core component of an agent. In this case, I'm leaving it out to keep it kind of concise. Now I can uh run a simple question like which sessions discuss regulatory constraints in AI systems.

**20:25** · And you can see the agent first uh calls my semantic search tool. It wrote a quite extensive search query in my opinion, but it works. Um, it finds the right talk by Bili. Then it decided that that apparently wasn't enough. So, it rewrote the search query. Uh, but decided but got the very similar search results back. So after that it decided that sorry it decided that it's now able to um respond with the right talks.

**21:06** · This is where most agentic search demos fail. But this is very brittle. Does anyone have an idea how we can break this?

**21:22** · Yes, that's a good idea.

**21:25** · Anything else?

**21:30** · Asking it something that's not in the database would be something great. What about asking it um something where semantic search actually falls short?

**21:41** · Maybe something where we want to look for a keyword, a specific keyword. um also doing something like filtering because we're in this search tool we don't have any filters implemented right so my my choice of search query is which sessions should I visit to learn more about GEA I'm not even sure like I've heard people talk about Ga I'm not even sure if I'm pronouncing it correctly sorry that's why I need to definitely attend this session.

**22:20** · So what you can see is the agent now calls the search semantic search tool and this time it's looking for GPA. So far so good but now you can see it's actually returning a talk for um deep minds Gemma models. I guess from token from a tokenization perspective it could be similar to GDPA or JPA I don't know then it returns something on harness engineering not sure if that's necessarily related and then a third one

**22:57** · I clearly none of these are related to GPA spoiler alert I know there's a talk about GPA or JPA again I think it's right after this one So we can see the search tool we just created. It's not very useful or at least useful only for a very narrow scope of use cases. Right?

### Code Demo: General purpose database query (ESQL)

**23:26** · What if we let the agent now write an entire search query from scratch? Let me show you how we can do this. So we're now replacing the database tool that we had with an execute query tool. So we're letting the agent not only take in a like a search like a topic, but this time we're giving it an entire the search tool an entire search query.

**23:53** · And I'm going to show you because this is quite difficult for an agent. Uh we're also combining it with a skill loading tool. So doing the same thing. I'm setting up my LLM. You've probably noticed I'm switching to a little bit more powerful model here.

**24:14** · So I'm switching from the GPT 5.4 Nano to um the mini because I am now anticipating that writing search queries is a little bit more difficult. So the nano is probably not powerful enough. I'm using the exact same system prompt as before. And now I'm creating a general purpose database query tool.

**24:40** · Since I'm using elastic search, I'm going to be using the elastic search query language, which is a pipe query language for filtering, transforming, and analyzing data.

**24:53** · It looks something like this. Maybe it reminds you of SQL. It's a little bit different. It has different capabilities. Not important for this session. Um, but you can see when I connect to my client and then I use this query method from the SQL class and run this query, you can actually see that there is a session by Samuel which talks a lot about GPA. You can see here is a match.

**25:23** · Here's another match.

**25:26** · So let's wrap this into a search tool. You can see um this time I just use the the query method again here and the agent takes in the ESQL query um as a parameter and I exchanged the tool description with something that's said that's called execute an ESQL query against the conference schedule index in elastic search. notice anything different about how I wrote this search tool versus the other one.

**26:13** · This time I added a try except block here for error handling. Generally speaking, you should have error handling. But since I'm anticipating that writing a good ESQL query or a valid one is gonna cause more problems for the the tool, um I don't want the agent to just fail and then the whole system to crash. So instead of instead I return the error response to the agent so it can kind of self-correct, rewrite the query.

**26:47** · Generally speaking, super important to have this, right? So the agent can self-correct. So when we we can test this here, this is not important. Uh then I'm plugging in the LLM, the system prompt, and my not new search tool into the agent again. And when I now um ask it the exact same question as before, which session should I visit to learn more about GDPA?

**27:13** · You can see it calls the execute ESQL query tool and it generates something that looks like valid ESQL.

**27:23** · I'm not expecting anyone to be very familiar with ESQL. What's wrong with this is that ESQL doesn't use the percentage sign as a wild card character. And in ESQL, you would use the asterisk. So in this case, it's actually looking for percentage sign, GPA, percentage sign in the data as an exact match. So that's why it's actually returning zero search results.

**27:52** · And this is when you're working with search tools also super important to think about. Is returning zero search results actually a valid response or is it a failure mode? Right?

**28:06** · Okay.

**28:09** · How could I overcome this? I could probably write um a more descriptive tool description, give it a little bit more help on how to write better um parameters. I could re reinforce it in the system prompt, give it more instructions there.

**28:27** · Or I could use an agent skill because you need more documentation than just like a oneliner, right?

### Code Demo: Adding Agent Skills for better interaction

**28:37** · So now I'm going to show you how to add an agent skill.

**28:44** · So in this case I'm going to be writing my own very short custom uh agent skill. Quick question. Who has you used and played with agent skills before?

**28:57** · Okay, good amount.

**29:00** · So I'm going to be writing a very short one here. Um there is official elastic search agent skills available if you want to play around with it. In this case I'm just uh using my own custom ones. So how that works is you have the um the skill name and then also skill description which gets injected into the system prompt.

**29:26** · So only the uh if you write it in in markdown it's the I think the front meta right that gets injected into the system prompt and then when you need it um more

**29:42** · information on the agent skill is loaded into the context window right so it's called something like progressive disclosure where you kind of add more information about the skill as you as needed so in this case I have some minimal instructions like here's the basic um structure of an ESQL query. Um ESQL uses double quotes for string literals.

**30:10** · Just some very basic syntax rules. And I also added some more information about the wild card pattern so it's not making this mistake again.

**30:21** · And then as I mentioned, Langchen has some boilerplate code you can just copy and reuse for um using agent skills. So I'm skipping over this. All you have to know is we have a tool and skill loading tool and it's get it's getting inject um sorry it gets combined with a something called a skill middleware. Skipping over this because this is not relevant for our session.

**30:50** · And now all I have to do is um add it edit the tool description of my general purpose search tool. So this is the exact same tool that I had before except this time I'm now adding some

**31:11** · relationship to I'm saying always use elastic the elastic search ESQL skill to generate the ESQL query before using this tool because otherwise if the agent then still uses this tool first without without um using the agent skill then that would be a shame. Right, I'm doing the exact same. So I'm reinforcing this now in the system prompt.

**31:38** · I'm saying the same thing to use the um elastic search a agent skill first before calling the general purpose search tool. And now I'm plugging it into the agent again. So this time LLM system prompt for the skill loading tool. I have the skill middleware and then my general purpose ESQL query tool.

**32:01** · And now when I let the um ask when I ask the agent which session should I visit to learn more about Ga you can see it f first loads the skill. So it actually loads everything that's kind of in the body part of the skill into my context window.

**32:23** · And then it generates this time a very valid SQL with the asterisk as my percentage as my wild card characters. And you can see it actually finds the right session. And now it tells me that at 10:40, so after this session, I should be going to this session to learn more about GPA and learn how to pronounce it correctly.

**32:52** · Okay, what's also cool about this is now the agent can do a lot of things, right? It can also do aggregations. So if I ask it something like how many sessions are on April 8th, you can see again it loads the um elastic search ESQL tool. Um and then it writes an ESQL query.

**33:21** · Whoops.

**33:23** · Writes an ESQL query that's using a filter. So it's filtering for April 8th. And then it also does an aggregation, some some counting and tells me today there are 27 sessions.

**33:40** · This is nice because if I just do a search, let's say I ask it to tell me which sessions are on April 8th and it only runs a filtered search, right? So just imagine it would give me a list of all 27 sessions that are today and we let the agent count how many sessions there are.

**34:03** · That would probably not be so good because we all know agents or LMS are notoriously bad at counting things. Um and also it would um fill up your context window, right? So by letting the agent do its own calculation, so letting like outsourcing the calculation part into the search tool, it's actually quite an efficient way to do this, right?

**34:30** · Any questions so far. Okay, let's switch gears. Um, this is a very prominent topic at the moment. Maybe you've heard the discussion about all an agent needs is a shell tool and a file system. So, I work at Elastic, but I don't discriminate. Let's look at file systems and how to do this because I think it's a very interesting um topic in general.

### Code Demo: Using the Shell tool for file system retrieval

**35:07** · So what I did here um I prepared the data this time in a local file system. So I have a folder called session data and in here I have for each type of session like keynotes and workshops. I have another folder and in there there's per session one file looks something like this. So with a title, some metadata and the description.

**35:38** · And now um I'm going to show you how you can use the shell tool with this. So I'm switching back to the GPT 5.4 nano because LM are just generally good at um navigating file systems, writing uh shell commands. So GPT 5.4 nano is sufficient. In this case, I define another system prompt. So the first part of the system prompt is uh exactly the same as the one we had before.

**36:18** · And what I'm replacing this time is instead of explaining how the data is structured in elastic search, I'm explaining how the data is structured in my local file system.

**36:31** · Okay, so let's use the shell tool. I have to give you a disclaimer. Using the shell tool can be risky since giving your agent access to a terminal can make it delete files or do other things you don't want it to do. So always recommended to uh use it in a sandbox environment. Also in langun it doesn't have any safeguards by default. So please be careful when using this.

**37:05** · But other than that it's very easy to use. So you can just use uh import the shell tool and instantiate it here. And here you can see how you would use it. So it takes in the commands parameter. So when I say echo hello world, you can see down here it actually prints hello world into my terminal.

**37:28** · And then all you have to do again plug in the LLM, the system prompt and the shell tool. And now you can ask it this exact same thing we had earlier. So are there any sessions about GPA and you can say you can see here it's called the terminal here but it's the it's the agent calls the uh shell tool and it actually writes a few commands. So first it's looking at the folder structure and then it runs um some grab commands.

**37:59** · So it's looking for GPA in the session data and I think it's looking for the first 50 entries. So you can see it saw the um the folder structure and then it also found the one session we were talking about earlier.

**38:20** · But since I was only looking at the first 50 and only found one session, it decided that it should probably look at the entire session data. So it finds the exact same session again. So this time it decides, okay, then I should probably look at the contents of this session. So now it reads the entire file content. And here you can see the the session information um as a tool response.

**38:54** · And then at the end the agent tells me which session I should visit.

**39:01** · Okay.

**39:04** · Grab works based on exact matches, right? And um reg. And I just want to show you this because I think it's funny how like surprisingly good agents are with bash because they kind of can cheat at semantic search. I Let me show you this.

**39:30** · So when I ask it which sessions discuss handling regulatory constraints, this was our semantic search query from the beginning. You can see it again looks at the folder structure and then it the first command or the first search it does it's looking for regulate. It's fair. It's looking for regulation for regulatory.

**39:55** · I guess that's that's a fair start. But then it goes ahead and now it just chains a bunch of synonyms together. So it's looking for compliance. It's looking for constraints. It's looking for GDPR. It's looking for governance. Yeah, I guess that's fair.

**40:13** · Um, I think it actually finds the it finds a bunch of sessions. So, it's like, okay, let me try a bunch of other synonyms. So, now it's looking again for uh regulate, compliance, GDPR, PR, soenity.

**40:29** · Um, I think yeah, the list goes on. It's just looking at a bunch of different synonyms and it actually is successful with this and it finds the session by building and returns the session information and then um is able to respond correctly.

**40:51** · I guess it works. Is that the most efficient way to do this?

**40:56** · Probably not. I mean just as an example.

**40:59** · So, let's say you you want to search for something like movies with animal superheroes or something. Do you really want to do your agent to search for a list of all the animals possible? Will you find all the superhero movies with animal superheroes?

**41:18** · Probably not. So, it works. Is it the best? I let you decide. So at the moment there's many different semantic search alternatives to grab. Um I think there's one by llama index called sam tools. There's a really cool one by light on which is called coal grap based on multi vector embeddings.

### Code Demo: Integrating custom CLIs (Gina Grap)

**41:47** · Also there's one by our own Gina that's called Gina Grap. Um, today I'm going to show you how easy it is to actually um, use this together with your agent. So, all you have to do is go ahead and install the Gina CLI and then all all you have to do is tell your agent that it now has access to this tool or to the CLI.

**42:14** · So, this is the exact same system prompt as I had earlier. Now with the difference that I'm explaining to it um that it has gen works how it should use it. Here are some examples of how you would use Gina Grap. Just a disclaimer Gina Grap has many different modes. You can use it for um classification. You can use it for re-ranking. Today I'm just showing you how to use it for semantic search.

**42:49** · And at the end I'm also explaining to the agent when it should use grap and when it should use gina grabs. Just so it knows for exact matches you probably still want to use grap. And for um more semantic search or fuzzy queries use um gina grap. And then plugging this in to my agent again.

**43:13** · And when I now run the exact same semantic search query we had earlier. So which oops which sessions discuss handling regulatory constraints. You can see the same behavior. So it calls the terminal tool. It first explores the folder structure and then it actually on the first try is able to correctly use gina grab. So, it's looking for regulatory constraints and boom, it actually finds um the session by Bill on the first first try.

**43:49** · Finds a few others because it's looking for 10. Um it says returned top k of 10 and then it's able to answer me correctly. Nice.

**44:02** · All right. Any questions so far?

**44:06** · Good.

**44:07** · Then I'm switching back. So we were looking at a bunch of different tools today. We saw how big the tool landscape is. Um I showed you a few of the um search tools we have. Now, some practical recommendations on when should you actually use what. So, maybe let's start with this. If you're looking for just one silver bullet tool, that's probably not the right way to go.

### Practical recommendations for building a search tool stack

**44:52** · Again, if you're if you think about it, doing good search is incredibly difficult. So ideally you want to have or curate the right set of search tools for your agents search behaviors and you want to have a combination of specialized tools and a combination and uh general purpose tools. So specialized tools are something that the agent can use out of the box.

**45:21** · Something with a very simple parameter, something where you're not where you don't need a very powerful LLM. You know, the agent isn't going to make a lot of mistakes. The agent can just use this tool out of the box. So at Elastic, we like to think about this about of having a low floor. So this is a concept from user experience where the agent can just you use a tool doesn't make many mistakes.

**45:51** · It's also efficient so it doesn't have to run your tool multiple times. You can think about this as the semantic search tool we had earlier. Maybe you need to look up customers by ID a lot of the time. Then having a specialized tool for that exact operation would be helpful.

**46:10** · But then you also want to give the agent a high ceiling. That means for unexpected queries, for complex questions, you want the agent to still be able to handle these questions, right? And not be have like these limited uh specialized tools and be like, I I cannot solve this. So for this case, something like a shell tool or the very um general purpose one we had earlier of a query execution tool would be very helpful.

**46:45** · But the problem with the query execution tool or the shell tool you saw earlier is since it's so general purpose, the agent sometimes might need more iteration to iterations to actually get to the right answer. Right?

**47:02** · So this is my my practical recommendation of having a balanced set of search tools um of a low floor and high ceiling. This is all nice when you already know your agents behavior, but if you don't know your agents query behavior yet, then I would recommend to start with a general purpose tool. Then log your agent's behavior.

**47:32** · Generally speaking, logging your agents behavior recommended. Um, but if you notice, maybe your agent is taking four or five tool calls per question.

**47:45** · That's too many tool calls. Then you probably that's probably an indicator that the tool your agent has is too difficult for it to use. then definitely look at what the agent's actually trying to solve, maybe scope out something more specialized in that case, right?

**48:06** · Also, if you notice specific um query behaviors, this is what I personally did with my with my test open claw. I was uh it has the exec tool and I um started logging its behavior and obviously I was playing around with databases. So after three days I was asking it what kind of interesting patterns do you see and was recommending me actually to um implement some specific uh search tools uh to interact with the database because it was out of the box only using the the exec tool.

**48:40** · All right. Start with general purpose tools if you don't know your users behavior yet. Log breaks and app purposeuilt interfaces. Yeah, that's that was a lot to take in. Um, I'm sure you have lots of questions, so I'm opening it up for Q&amp;A. And otherwise, on your way out, don't forget to grab yourself some stickers. And then thank you for joining my session. I think there's a mic coming.

### Q&A Session begins

**49:20** · Thank you. Um, so would you say the tool stack you need is also mostly dependent on the model you're willing to use. So if you were using a very good model, it might be fine using the shell tool or the search tool, but a very small model and light agent might need more specialized tools or Yeah, actually we I think in our internal testing we noticed that a more powerful tool actually reduces the error rate of um for the parameters by I don't

**49:49** · know the numbers exactly but it was a very big amount where it reduced the error rate. So having a stronger model definitely helps um for the general purpose tools but I think you cannot expect uh just because you have a very strong model that there's going to be no no errors if that makes sense. Yeah.

**50:19** · Thanks for a nice talk. Um I have one question. Maybe it's slightly off topic but um so now we are talking about a gentic rack but it comes with the drawback of having higher latency against typical rack. So would you recommend of having like a second pathway for simple rack for fast answers and how would you like guide the agent to actually choose the right one because I think it's hard to say which question should be answered by a gent or by simple rag.

**50:54** · That's a good question.

**50:59** · I I don't think I have a have a good answer on like on the top of my head right now. I'm thinking I was maybe something related. I was asked recently if you have a rag system, should you replace it with a gentic rag? And I guess this is kind of going in the same direction of when do you actually need a gentic rag, right?

**51:22** · um probably for a lot of use cases. I know rag has been killed many times, but I think the reality is that rag is still very effective for many use cases. Um how would you actually switch between rag and agentic rag? I'm not sure because I assume it's again it needs some kind of almost agentic logic of switching between them. So I'm not sure. I'm sorry.

**52:08** · In such cases uh like um when you have uh the wild card in the GAPA uh example uh why can't we just um perform a hybrid tool that maybe search and replaces uh common wrong uh wild card symbols coming from SQL with the correct ones for instance.

**52:38** · I'm not sure if I understand your question correctly. I mean um there are cases in which uh the agent does doesn't know the how to write the uh correct query because maybe he thinks uh the placeholders uh coming from SQL um apply to ESQL but uh so why don't we perform a hybrid tool that um determine significantly um uh search and replaces the wrong um placeholder the the percentage symbol with the asterisk.

**53:23** · Yeah, actually so the the example I showed you of using the agent skill wasn't necessarily the the necessary solution for it. You can also um add just some very simple instructions on for ESQL don't use um the percentage sign as a wild card character. It actually works. I tried it when I was building the the demo.

**53:46** · Um but then when the agent now runs in the next issue, then you start adding the next piece of documentation. then you can kind of start writing the entire ESQL documentmentation from scratch into your system prompt. And yes, for the demo purposes is it would have worked, but it's probably not how you would do it necessarily when you're building something more robust, right?

**54:11** · Because if you just add like little like band-aids every time you run into an error, then what happens when you run into the next edge case? Does that make sense? Yeah.

**54:33** · Hi, thank you for the really wonderful um presentation. I have a question. Uh in the demo we have walk through the agentic search with DB curious tool and also another one with shell tool. Would you recommend in the practical use we can also kind of uh use combine both tool and then we validate the result from each of tool and then we kind of add the confidence of the result from the LM. Would you like recommend doing this in a practical use?

**55:02** · Yes.

**55:02** · Yes. That's a great question. Also again I'm kind of cheating in this demo right because I'm only showing you one tool per demo. In reality, you would have something more like a bunch of different tools where you then have to um decide which or the agent has to decide which tool to use. I think there was a very interesting blog post by Versel I believe and they did an experiment.

**55:28** · I think it's called, if you want to look it up, I think it's called testing is if bash is all you need is the title I think of the blog post. And they actually kind of benchmarked or tested an agent with a bash tool, an agent with a just file search tools, I believe, and an agent with database tools. And in the end, they also had one agent with a bash tool and the database tool. and they noticed that was super interesting.

**55:59** · Uh for a specific set of queries um where you have analytical queries, this is a specific use case. Actually, the database tool was more effective, but on the other hand, the file search tool is very effective as you saw for just quickly finding things.

**56:17** · But the very interesting aspect was the hybrid agent with the bash tool and the um database tool was actually achieving the highest um like highest accuracy because it first I believe it was first using the database tool and then verifying the results with the shell with the shell tool and that led the agent to actually achieve better accuracy. So I think that was a very interesting way um and behavior to see in in agents.

**56:51** · Thanks for sharing.

**57:04** · Um one second question. Um, so if we use the semantic search tool, I think in practice you probably would use some kind of threshold to cut the results to not get something if there's no answer.

**57:20** · But in the agentic regime, would you then say, okay, let's put a conservative threshold such that we don't confuse our agent or would you say the agent is smart enough even if we retrieve results that are not really relevant, it will be good enough to to to notice that?

**57:40** · Yeah, that's a great question actually.

**57:42** · Um, so in the examples you probably saw some where the agent was returning. I think in the last genograph example, you see it's actually returning the top K results where only the first one is the actual relevant one. And I think um because the agent does a little bit of reasoning over whether the search results are relevant to the search query, I think it's much better or they're much better today at kind of weeding out what's not relevant.

**58:09** · But then you kind of run into the risk if you have longer running conversations that kind of these search results sit in your context window longterm could have the problem of confusing your agent long term. So I think it kind of it depends on your use case of how um your like how your agent can handle like irrelevant search results. Generally speaking, based on search results, it can filter out what's irrelevant.

**58:57** · Uh thank you for the talk. Amazing. Um are you utilizing sub agents for this search queries? Because yeah, if we let them decide to is it relevant to use a question like yeah it's done in reggas framework for example for evaluation.

**59:13** · I mean sub agents would help a lot. Do you have any experience with them?

**59:17** · Unfortunately not. I have not played around with sub aents yet. I can only tell you that I know for example I believe in cloud code they're using sub aents for doing specific search tasks. I think there was a blog post on how they're actually using a sub agent to um answer specific questions about claw code because it's kind of like a niche question a user would ask. So in this case they kind of outsourced um their expertise to a sub agent.

**59:46** · So having a sub agent for specific niche questions I think would be interesting but I don't have too much like experience and Okay. Thanks. Uh can I ask another question?

**1:00:01** · Sure.

**1:00:02** · Um damn I forget. Sorry I try to catch up later.

**1:00:26** · Um yeah, I kindly off topic but um you talked about skills and the big benefit of skills is just have the description in the uh system prompt and whenever needed we need to load this the full skill. Um do you have any recommendation when and how to clear the system prompt again?

**1:00:47** · So because we want to keep the context window small and maybe for a long um session we might have up to 10 skills full skills in the context and yeah I'm not sure Joe do you have a better answer like have an idea.

**1:01:04** · So what we're doing is that we learn the skills like but then we to like offload things. So when the context very small but um but yeah so like the way that we are doing it behind the scenes is that we're we're we're providing like that kind of progressive disclosure of skills. So we're providing those um the skill names and descriptions the location within the file store and then from the file store

**1:01:55** · we're loading into the context window when we need that skill and then we offload it once it's once it the prog you know the context window progresses ahead of time around that. So we have this kind of more on demand one around that. And that's the same with our like compaction like comp of context and that's what I would advise you to do like some of the questions do try and use the file store as much as you can and have those tools as well like being able to grap the file store for when you want to see previous tool results and then and then use it from that.

**1:02:33** · Thanks as my colleague Joe from Elastic as well. Awesome. If there are no more question, I will let you guys go into the coffee break. Again, don't forget to grab yourself some stickers and happy to catch up in the halls if anyone's interested. Thanks so much.