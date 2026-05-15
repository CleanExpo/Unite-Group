---
title: "Andrej Karpathy's Wiki Idea Was Just Shipped by Pinecone"
source: "https://www.youtube.com/watch?v=0TPq43Wpbz0"
author:
  - "[[The AI Automators]]"
channel: "The AI Automators"
published: 2026-05-08
created: 2026-05-13
description: "👉 Access our AI Architects course & join hundreds of serious AI builders in our communityhttps://www.theaiautomators.com/?utm_source=youtube&utm_medium=video&utm_campaign=tutorial&utm_content=pineco"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=0TPq43Wpbz0)

👉 Access our AI Architects course & join hundreds of serious AI builders in our community  
https://www.theaiautomators.com/?utm\_source=youtube&utm\_medium=video&utm\_campaign=tutorial&utm\_content=pinecone-nexus  
  
Pinecone, the company that pretty much defined the RAG era, just admitted agentic RAG has fundamental architectural problems. They published a framing post saying roughly 85% of an agent's effort goes to retrieval rather than reasoning, and they shipped a new product called Nexus that's positioned as a "compiled knowledge engine" sitting above the vector database.  
  
And they're not the only ones. Andrej Karpathy's LLM wiki gist went viral a month ago describing structurally the same idea. Microsoft has shipped Fabric IQ with a compiled Ontology layer. Google announced their Knowledge Catalog at Google Cloud Next. Four named players converging on the same architectural pattern in roughly four weeks.  
  
In this video I dive into the architecture of Pinecone Nexus to give you a flavour of how a knowledge layer actually works. I walk through the three core components (Context Compiler, Composable Retriever, KnowQL), show how each one maps onto Karpathy's wiki primitives, and then lay out the honest benefits, the honest gaps, and where this kind of architecture actually fits.  
  
🔗 Pinecone Nexus framing post: https://www.pinecone.io/blog/knowledge-infrastructure-for-agents/  
🔗 Pinecone Nexus product launch: https://www.pinecone.io/blog/introducing-nexus-knowledge-engine/  
🔗 Karpathy's LLM wiki gist: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f  
  
📌 This connects directly to our AI Architects course where the Agentic Retrieval module covers compile-time retrieval as a pattern, including how to evaluate when it's the right call for what you're building.  
  
#AI #RAG #AgenticRAG #PineconeNexus #CompiledKnowledge #KnowledgeLayer #AIAgents #ContextEngineering #FabricIQ #KnowledgeCatalog #Karpathy #LLM #AIBuilder

## Transcript

**0:00** · There has been a growing number of rag is dead headlines online over the last 12 months with potential successors coming from every direction. Agentic file exploration, long context windows, agent skills, and context engineering just to name a few. And while most of these headlines are pretty hyped up and oversimplified. Earlier this week, Pine Cone, the company that defined the rag era, admitted themselves that aentic rag has fundamental problems that need to be solved. They did so in a blog post where they launched their solution to the problem which is a product called Nexus.

**0:32** · Here they describe how roughly 85% of an agent's effort is spent on knowledge retrieval within an agentic loop. They talk about how outputs still require human review before anyone can act on them. So essentially you can't trust it.

**0:45** · How the resulting task completion rates are stuck at 50 to 60%. And with Agentic Rag you have unpredictable latency and runaway token costs. And this is all pretty damning from the company that has the market leading Vector database with over 800,000 active developers and 9,000 paying customers. But the real reason for these admissions is this product announcement which is the solution to the problem. And this is effectively a compiled knowledge engine that acts as a layer in between your data sources and the agent.

**1:15** · And what's interesting is that they're not the only ones to have come to this conclusion that you need this compilation layer. Andrew Cararpath's LLM wiki idea that he posted last month went absolutely viral and there are very similar structural elements that Pine Cone is now shipping in this product. The core idea as set out in his wiki is essentially solving the same problem. With traditional rag or with agentic rag, the LLM is rediscovering knowledge from scratch on every question. There's no accumulation.

**1:44** · If you ask a subtle question that requires synthesizing across five documents, the LLM has to find and piece together the relevant fragments every time. So Andrea Kapathy's knowledgebas idea is that this LLM wiki is a persistent compounding artifact that builds up and is maintained over time.

**2:00** · And when it comes to query time, your agent asks questions against the wiki, not against the raw data underneath. And this shifts the expensive reasoning work from query time to ingestion time. And what's great about Karpathy's wiki idea is that it's simply just markdown files.

**2:15** · There's no infrastructure overhead.

**2:17** · Whereas with pine cone, it is operating at a larger more production scale with various different data sources including vector database as the backend. And this is a trend towards adding layers in between the data sources and the agent.

**2:31** · A couple of weeks ago at the Google Cloud Next 26 conference, they announced their cloud knowledge catalog. This catalog is a continuously refreshed semantic layer over your data sources and it's exposed to agents via MCP so they can navigate the data without needing to rediscover the structure every time. So there are similarities here with Pine Cone's knowledge engine that has multiple data sources linked.

**2:54** · Microsoft has a compiled ontology as part of Fabric IQ which sits above your raw data where you design the shape of your graph up front and then you bind it to the specific data sources. The agent then asks questions and the ontology pushes those queries down to the underlying data sources. So when you line them up, they're all moving away from your standard agent rag which operates in a loop and the agent can interrogate the data sources directly and they're moving to this style setup where there is an intermediate layer,

**3:22** · this knowledge layer and the agent only interacts with that and that is essentially built from or bound to the underlying data sources. And that is a key difference because if you look at Andre Carpathy's example that LLM wiki is synthesized from files in the file system which is also similar to Pineon's version where the artifacts are synthesized from the raw data. Whereas Google and Microsoft solution is much more manual. It's less agentic and the actual data here is tightly bound to what's underneath.

**3:51** · This idea of a knowledge layer above your raw data isn't exactly new either. I did a video on graph rag last year which is another version of knowledge compilation where data is ingested and crucial information entities relationships are extracted and plotted on a graph to be queried. I'll leave a link for this video in the card above if you'd like to see that. As you can see there are lots of approaches to building this type of layer and everyone is kind of doing it differently. And to understand is it actually worth the trouble of going to building this layer.

**4:21** · worth diving a bit deeper into the problems that agentic rag faces. And the first wave of rag was essentially naive rag. And this is effectively dead. I do agree with the hyped thumbnails for this one because here you're essentially just carrying out a search based off whatever question came in. And whatever chunks you get back, they are used to formulate the response whether they're relevant or not. And there are lots of approaches to improve on naive rag. Things like query decomposition, query expansion, query clarification.

**4:50** · But the real improvement is moving towards a more agentic rag setup, which is essentially rag 2.0.

**4:57** · With this, you're wrapping retrieval within an agentic loop. The agent can decide when to query. It can evaluate what it got back. It can decide to go again to the same data source or to a different data source. And once it has satisfied itself that it has all of the information it needs through numerous loops, it can then synthesize the response or carry out an action. From a vector search perspective, Pineon brilliantly described this as the 10 blue links of agentic retrieval because when you carry out a hybrid or a vector search, you're essentially getting 10 independent chunks back.

**5:26** · And there are lots of ways that you can improve on agentic rag through things like re-ranking, hybrid retrieval. We've covered lots of these techniques on our channel. But what has become clear over the last 6 to 12 months is that wrapping retrieval within an agent loop doesn't actually fix the underlying problem. It hides it essentially. And having better, more improved models isn't necessarily going to save your agent. And the first issue is non-determinism. If you ask the same question 10 times, the agent might use completely different retrieval strategies each time.

**5:57** · The agent might trigger different skills. It might trigger different tool calls. Some runs may use sub aents, others might not. And then drift can occur across multiple steps of reasoning. As a result, the more your agent loops, the less stable retrieval becomes. It's back to Carpathy's point in his gist where he describes how if you ask a subtle question that requires synthesizing across five documents, the LLM has to find and piece together the relevant fragments every time. Now, if that LLM, if that agent had 10, 20, 30 different tools, it might not always pick the right tools to fit the strategy.

**6:29** · And therein lies the lack of reliability.

**6:33** · The second issue is that reasoning can't compensate for poor retrieval. If the underlying data sources are unstructured and unreliable, then no amount of intelligence on top is going to improve that. And the third issue is token blowout and latency because obviously every loop at query time will cost money. Every trigger of a sub agent, every time you rerank, every time you reflect on the answer. So, as you know, agents can run through 10, 20, 30, 100 different tool calls, which adds significant latency. There's a lot of waiting around for an answer that might have already been computed before.

**7:04** · In Pine Cone's benchmarks, which I would take with a massive grain of salt, the agentic rag approach consumed on average 49,000 tokens for a question. An AI coding agent consumed 528,000 tokens, most likely because it was using sub agents and file exploration, loading up full files into context. But you can see the impact on latency as well. The more loops the agent runs through, the more context that's loaded in, it just takes longer to actually get to the response.

**7:37** · And it is these benchmarks that shape Pine Cone's point around how 85% of an agent's reasoning time is actually in the retrieval process because it constantly needs to rediscover the structure of your data sources and essentially execute a retrieval strategy to get to the conclusion. And this is the gap that this compiled knowledge layer is designed to close. By actually having the answer pre-ompiled up front, you can see that there's much less latency.

**8:02** · It only used 6,000 tokens as opposed to 50 or 500,000 tokens because you are essentially moving the work from the point of query to the point of ingestion of the documents. In this video, I'm going to dive into the architecture of Pine Cone Nexus to give you a flavor of how these knowledge layers actually work. And I'm absolutely not here to hype this product or to hype Pine Cone. I have zero allegiance to them. I'm personally more interested in learning how these intermediate layers work so that I can build a custom version of it myself.

**8:32** · And as I walk through this, I'll show you how each component within this architecture actually maps to Andrea Carpathy's LLM wiki concept. So you can see the various different parallels within the two solutions. I go into this concept of compiled knowledge layers and agentic retrieval in a lot more detail in our AI architects course available within our community. We have 17 different lessons within our agentic retrieval module. So if you are serious about building production-grade custom AI systems then this course is definitely for you. I'll leave a link in the description below.

**9:04** · To really communicate how this type of knowledge layer works there is a demo on Pine Cone's Nexus landing page. So on the left hand side here we have nexus plus their query language and on the right hand side there's agentic rag. So the question that's asked of each of these agents is does this specific company qualify for a renewal discount.

**9:25** · So you can see there's the question and by using a knowledge layer it's a single tool call where you provide a structured output schema that you're looking for and then it's able to provide the returned response and then you can just formulate the answer. So in their example here it's a single tool call 2,000 tokens in 2 and a half seconds.

**9:47** · Whereas with a traditional agentic rag agent it's six tool calls nearly 50,000 tokens. as the agent builds up the picture to be able to answer the query.

**9:57** · So for the question, does the company qualify for the renewal discount? It needs to plan a retrieval strategy, I'll need contract terms, usage metrics, policy rules, and then it's numerous tool calls. It gets lots of chunks back, which is all just bloating out the context, and it eventually gets to a response. Whether it's accurate or not depends on the responses of the tool calls. So there's a huge amount in this.

**10:22** · You'll be very familiar with what I just went through on the right hand side. So I won't worry too much about that. But on the left hand side, this AI agent simply just triggered a single tool call. Within the structure, it sends in the intent or the query while also defining the actual scopes and context.

**10:39** · So what customer ids, what shape that it wants the response back. This lands in this knowledge engine of pine cones which then outputs this response. And as you can see, this is a structured response. It isn't just lots of chunks that then the agent needs to reason over. It's effectively provided the exact answer to the question which it can then output to the user. Now, this is a demo and the product is currently in early access.

**11:02** · So, I haven't played with it myself, but I can imagine that for an agent to actually construct this query, it would need to know a lot about the structure of the knowledge base to understand that customer ID is a field that can be passed or things like discount percentages or specific scopes.

**11:20** · So I assume all of that will be loaded into the system prompt of the agent that's actually triggering this tool call. But even though it is a demo, you can see the value in the approach of getting structured information back for questions like that. Let's dive under the hood then. So you can see that we are getting structured information back.

**11:39** · That structured information is coming from what they describe as an artifact.

**11:43** · And this is an example of one of those compiled structured artifacts. So if I was asking for the total revenue of Allstate Corp, it likely would pull it from an artifact like this, there's the exact number and then that would essentially be outputed by the knowledge engine. So these artifacts are compiled from raw data sources and you can have lots of different artifacts and views of the data. It is a typed governed piece of information that's constructed for a specific task or a specific outcome.

**12:11** · And I will keep coming back to this idea of tasks because it is pretty central to the architecture because even if you're dealing with the same source data, you can have different versions of artifacts depending on the different use cases. A market intelligence agent might want financial metrics on Allstate Corp, while a compliance officer might want risk factors for example. And the shape of these artifacts is heavily based on the tasks that the agent would be undertaking. Here you can see different artifacts across different contexts.

**12:41** · So let's say you have a financial team, a financial context that carries out lots of different financial tasks across the data sets. The artifacts would essentially support the successful completion of the tasks that would be typical of that agent and that would then be the same for sales or marketing or support. And outside of the specific contexts then the specific teams you have your general knowledge collection.

**13:06** · So a query across the entire knowledge base could span as many contexts or artifacts as needed. So the knowledge engine then is the system that actually compiles all of these artifacts as well as aiding the retrieval of the artifacts using something called noql which I'll get into in a minute. And if you think about this through the lens of Karpathy's LLM wiki, the actual file system where you have all of your source documents is here and the wiki markdown files are these compiled files here.

**13:32** · At the core of this knowledge engine is a context compiler and similar to LLM wiki this is an autonomous coding agent that uses an agentic harness pattern but this time it's to construct task optimized contexts. So again the word task is mentioned there and it does that by pairing a coding agent with three things. So the first is an eval set that you define per domain.

**13:57** · So these are representative tasks with known right answers that correspond to the data sources that you have. And this is the key reason why this type of knowledge layer doesn't work for the longtail infinite questions that can be asked of an agent. It's highly optimized for specific known tasks that will be asked of the agent because you effectively need to define upfront typical questions that will be asked of the agent as well as known right answers.

**14:26** · And that then provides an evaluation feedback loop that helps this coding agent design these artifacts. And with the tasks in mind and with a library of prevetted skills like document processing, chunking, entity extraction, etc., The agent can then create and iterate on the artifacts until it passes the eval test.

**14:49** · So what all of this means is that the user is not actually defining this artifact schema. It's the coding agent and it's essentially a dynamic schema when it's designed in the first place.

**15:01** · But once it's actually designed, it should be locked in place after that.

**15:04** · And the benefit of that then is that any domain expert even without you know retrieval background knowledge can produce an agent optimized context since they don't need to specify the schemas or the retrieval logic or shape the artifact up front. This context compiler it automatically discovers the right artifact structure the granularity the construction strategy based on these evals. As I mentioned this is not generally available at the moment.

**15:30** · They talk about work with their early design partners, but I can imagine that there's going to be huge iteration needed on this idea of dynamically creating the artifacts based off the tasks and eval to actually get it right. But in fairness, it is quite a novel harnessbased agentic approach to actually create these structures. The LLM wiki comparison to the context compiler is essentially the instructions you would have in your claw.md file where you would be directing the LLM on how to maintain the wiki.

**15:59** · This compiler also reflects Carpathy's bookkeeper concept that fixes cross references and audits for contradictions etc. By moving the reasoning from query time to build time within our flow we have our data sources things like a CRM it could be a vector database. Then at build time this coding agent it's compiling it's assembling reasoning structuring all of these compiled artifacts all based off the specific tasks and domains that the agent should be able to operate in.

**16:28** · And then you're into query time at which point then it is simply a case of retrieval because all of the work has been done on ingestion. And this is where pine cone diverges from its love of vectors into this idea of noql. This knowledge query language as they describe it is declarative. So the same way that SQL has joins and filters and projections here you provide things like intent, filtering, provenence and control.

**16:56** · So this is the example tool call effectively that the agent would send into the knowledge engine where it provides the request and it says it does want to ground it and then it declares the shape of the response that it's looking for. So it is a structured response. Now again for an agent to actually provide this it needs to know all of the properties. It needs to know company name is spelled like that with an underscore. So pine cone doesn't go into detail on how it actually describes the schema.

**17:24** · It's either loaded into the system prompt or it probably is a tool call to fetch the schema of the knowledge engine. Also, what happens within the knowledge engine is a little bit vague from pine cones documentation here. So, we are providing the example ask as you can see there as a parameter and when generating the artifacts this context compiler does create codified query patterns for knowledge retrieval.

**17:49** · So if this example format of a question is asked a 100 times a day, it possibly would route to one of those deterministic queries that was created.

**17:58** · It's either that or deterministic lookups because in this case there is a customer ID being passed as well as a shape of a response. Either that or there is a pretty lean LLM operating within the knowledge engine. All of this is pure speculation because it's not really clear from the documentation and the examples. And again, it brings us back to the idea of tasks being at the heart of this because if these query formats are actually frozen in time and the output shape is already predetermined, then it really isn't that flexible.

**18:27** · But it would in theory be super reliable for query shapes that you know are coming. And they do give an example end toend flow here which is worth going through. So from source to knowledge, it starts off with box as a file repository. It uses the unstructured service to actually parse files and then it goes to Nexus. So the question that's asked of this legal review agent which contracts have a fixed initial turn but no auto renewal mechanism. So contracts live in a designated box folder which is the same as Google Drive let's say.

**18:58** · Unstructured is then next in the pipeline which parses those PDF documents extracts out key document elements, tables, entities from the legal contracts. let's say and you can see this as an example output from that and then that unstructured parsed output is ingested as a source into the knowledge engine. The context compiler runs against the extracted data. Again, it would have to be in the context of a typical task that's going to be asked of it.

**19:25** · And then one of the artifacts it produces is a table aggregating contract renewal terms across different contracts which allow Nexus to answer the question by fetching a single artifact rather than searching across all contracts. So this is an example compiled artifact let's say and this is across 37 contracts. So from an agentic rag perspective you arguably would need to load up every single one of those contracts to get the full view of the question every single time you're asked the question. Now there is more questions than answers here.

**19:56** · What happens if one of those contracts changes? I assume that this question was actually provided as an eval into the knowledge engine for the artifact to be generated in the first place. How often is that question actually asked by the user? There is a section within this blog post around how they've measured the impact of this type of knowledge layer. Now I usually take benchmarks with a pinch of salt.

**20:18** · Pineon have created their own benchmark for this which I would generally cast even more doubt on because benchmarks are usually going to be designed for your specific use case. In this case, the agents were tested against 493 10k filings from the S&amp;P 500 companies list. Each agent was tasked to answer 150 hard questions spanning nine sectors and 10 financial topics. And the findings show that this is a great approach, which isn't massively surprising.

**20:47** · It completed the tasks 100% compared to agentic rag only completed them 98.7% coding agents was 62.7% and then all the various average latencies and tokens etc. Okay, so on to a bit of an analysis on that and and looking at the marketing side of it.

**21:07** · Like some of this does make sense. Like you could have a cost reduction of up to 90% in token consumption per task. You could if it is the same type of task and job that's executed multiple times a day across very large data sets, actually compiling or caching the information up front makes a huge amount of sense. So you definitely could have a cost reduction and you would have decreased latency as a result.

**21:34** · And I also understand how you would have higher task completion rates because you can stand over the cached compiled data across numerous data sources. So it would be consistent and reliable every time. And as for faster task completion, absolutely you're going to have a lot less tool calls. You should be able to get in and get out much faster. And on the governed provenence, you do have fieldle citations. So with this typical artifact for example that the coding agent creates, you would know for certain that the legal name came from a specific document.

**22:05** · It's not an LLM hallucinating a citation. There are a lot of gaps that do need to be filled here. Um and it may just be because this is an early release, but the obvious one is what is the cost of actually compiling these artifacts in the first place? How much does it cost for these coding agents to run to generate the artifacts based off the eval? if it's operating in a feedback loop that could get quite expensive because it's not just the initial creation of the artifacts by the coding agent.

**22:30** · You also have to handle when that information updates and this is essentially where Microsoft graph rag fell down because the cost of recomputing the graph with all of the LLM calls that that entailed it pretty much became unsustainable. The only mention of maintenance and recompilation is on this page where it says that it's done once when your data changes, not on every call. So I wouldn't mind learning a little bit more about that. The second gap I think is on this artifact itself because this is dynamic.

**23:00** · It's LLM generated by the coding agent on the initial ingestion with the context of the task in mind. Is there the potential for inaccuracies here because you're only dealing with LLM as a judge within this eval feedback loop? This was a major criticism of LLM wiki Andre Cararpathy's project because you are essentially treating compile time synthesis as ground truth and that can compound over time as well where you get further and further away from the truth.

**23:30** · That is honestly the benefit of having an agent interrogate knowledge bases directly is that they are dealing with the ground truth because the likes of the LLM wiki summaries that are created these are lossy summaries. You are losing fidelity. you are losing resolution on the actual ground truth.

**23:48** · And this is essentially the difference between Pine Cone's version of this artifact versus what Microsoft and Google have done because in their approaches when they create the graph, it's a manual process of binding all of the keys to the underlying data. So within their solutions, it's essentially a view on the source data.

**24:05** · Now, it's possible Pine Cone are doing something like that, but I'm not sure based off the documentation that exists. it does seem to be more LLM driven particularly because it would be coming from the likes of unstructured documentation like PDF files and the other thing is what about a fallback? So in their example here they provide a question like does Acme Corp qualify for renewal discount and there is an artifact to answer that question.

**24:31** · But if you ask a more open-ended question or a question that isn't answered by an artifact that exists does that fall back to hybrid search? Does that fall back to a different retrieval mechanism? I don't think you could provide hybrid search to the agent because it would likely use that more often than not and that kind of defeats the purpose of having the knowledge layer in the first place. So having gone through this where do we stand? Agentic rag is definitely not dead.

**24:58** · It's still the standard I think because it's a lot easier to connect an AI agent to data sources and allow the agent to interrogate it via uh an agentic loop and tool calls than compiling this type of knowledge layer.

**25:12** · But it does suffer from the problems that I talked about. Having a knowledge layer does make a lot of sense if you have a huge amount of data sources and you need a unified view on them. If you have repeatable let's say task completion patterns then again creating this kind of artifact view makes a lot of sense as well. But with that you really need to understand what questions you're going to have up front. The longtail doesn't really exist there.

**25:37** · Knowledge layers definitely make sense if you need very tight governance around the data that's coming back from the tool call. Not one where you're hoping that the agent will site it correctly but it's fieldle governance within a structure that's coming back. But I don't think pine cone solution makes sense for AI agents that are more exploratory based where you are exploring a knowledge base.

**25:57** · So I likely would use a gent as the standard but then you could escalate to the likes of a knowledge layer if you've carried out lots of improvements on retrieval and you still can't get to the level you need to get to to complete your tasks accurately. If you were to go about building this type of compiled layer yourself, um, essentially this just looks like an SQL table.

**26:18** · So if you really knew the structure of an artifact up front, you could arguably create this version yourself, pinpoint the exact data sources that you would need to populate that out, run a batch job to process it all against the data sources, save everything to an SQL database, and

**26:39** · then your knowledge query language is essentially just an SQL query, maybe with the likes of JSON B filtering where you have heavy indexes to make sure it actually retrieves quite past and then you could build delta updates as the documents change to update the source data in the database. So it would be a fun project to actually recreate this in the likes of Python. I hope you enjoyed the video. Make sure to check out our AI architects course if you want to really dive deep into agentic retrieval in custom AI systems.

**27:07** · And a great technique to actually traverse a knowledge base is using the likes of GP and Glob and list and tree the way Claude code actually does it over a knowledge base. I've done a full deep dive in a video here, so make sure to check that out.