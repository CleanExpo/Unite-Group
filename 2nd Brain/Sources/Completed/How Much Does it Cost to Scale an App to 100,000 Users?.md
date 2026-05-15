---
title: "How Much Does it Cost to Scale an App to 100,000 Users?"
source: "https://www.youtube.com/watch?v=AuodUoWEWw0"
author:
  - "[[Coding with Lewis]]"
published: 2025-06-10
created: 2026-05-08
description: "Host your applications using Sevalla: https://sevalla.com/?utm_source=youtube&utm_medium=video&utm_campaign=lewis_load_testSo I built a Twitter clone and decided to see what happens when you throw a"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=AuodUoWEWw0)

Host your applications using Sevalla: https://sevalla.com/?utm\_source=youtube&utm\_medium=video&utm\_campaign=lewis\_load\_test  
  
So I built a Twitter clone and decided to see what happens when you throw an absolutely ridiculous amount of users at it. Started with 100 users, seemed fine. Then 1,000 users... things got interesting. By 10,000 users I was having to completely rethink my architecture.  
  
Built the whole thing with FastAPI, Postgres, and Docker containers, then used Locust to simulate users absolutely hammering the system. Spoiler alert: vertical scaling only gets you so far before you have to start thinking about horizontal scalingand Redis caches.  
  
LINKS  
\---  
MY 12K+ DISCORD 💬  
https://discord.gg/GkrFX4zT2C  
  
CONNECT WITH ME ON SOCIAL  
📸 Instagram:  
https://instagram.com/lewismenelaws  
  
🎚TikTok:  
https://tiktok.com/@lewismenelaws  
  
🐣 Twitter:  
https://twitter.com/LewisMenelaws  
  
My gear 💻  
https://liinks.co/lewismenelaws  
\-----  
  
Timestamps:  
00:00 - Hook: Testing 100 to 100,000 Users  
00:15 - Why Load Balancing Matters  
01:10 - Building the Twitter Clone  
01:56 - Setting Up Locust Load Testing  
02:38 - Testing Locally First  
02:51 - Deploying with Sevalla (Sponsor)  
03:51 - Deploy #1: The Baseline  
04:37 - 100 Users: $15/Month  
05:34 - 1,000 Users: When Things Get Slow  
07:58 - 10,000 Users: Distributed Load Testing  
09:27 - 100,000 Users: Horizontal Scaling  
12:24 - Lessons Learned  
  
Special thanks to Sevalla for sponsoring this video! They made deploying and scaling this whole mess way easier than it should have been. Definitely check them out if you want to focus on building instead of managing infrastructure.

## Transcript

### Hook: Testing 100 to 100,000 Users

**0:00** · i'm gonna find out how much it costs to host an application with a hundred users and ramp it up all the way to 100,000 users things will break devs will cry and i might lose hair when your application

### Why Load Balancing Matters

**0:16** · lives on a server it's kind of the wild west at that whatever decides to come your way you gotta handle partner of course there's only a certain amount of traffic that a certain server can handle the larger your server the more it's just going to cost that's just how it works and this is where load testing tools come into play ideally

**0:36** · when developing and testing applications load testing tools are deployed in a controlled environment like a staging server they enable developers to simulate different levels of user traffic and interactions within your application and by doing this in a safe testing environment of course you can analyze how your system performs under different loads without risking your production environment for example when a popular streamer starts to play your game then you just get a sudden surge in popularity how do we handle that well maybe we should give that a try so let's get started

### Building the Twitter Clone

**1:10** · what makes these types of tests interesting and kind of nuanced is it all heavily depends on the type of application that you have sometimes you might have more reads or writes on a database which will just completely change the way that things are done but for today i'm just gonna create a simple twitter like application where you can post tweets reply retweet like sign in etcetera the real application

**1:33** · that's gonna be tested is our api that the front end connects to we have fastapi as the framework that i'm going to use to accept the http requests i'm going to use postgres to store the data and it's all gonna run-in a docker containers and i wanna make it as simple as possible for each step so i can show you what i'm doing every time i decide to bring on more users cool but obviously i can't

### Setting Up Locust Load Testing

**1:58** · hire a million people to come test this application at once i don't have that kind of money so what do i even do to test all of this a popular 1 that i've used before is locust which is written in python it provides a web ui that we can use to track in real time and has a ton of documentation online but there's also other great options too like k 6 by grafana but just because i'm already writing python and i'm familiar with locust we'll be using locust today let's just test our api real quickly here overall though it

**2:30** · works pretty well the twitter ui looks really good and actually works a lot like the actual twitter that'll be 45,000,000,000 doll i'm gonna be using savala who is the sponsor of today's video to get myself up and running similar to most platforms as a service it's really easy to deploy using savala connect your git repository and using nixpack it already knows

### Testing Locally First

### Deploying with Sevalla (Sponsor)

**2:51** · how to deploy your application just based off of the files repository and since i'm using a mono repo i'm going to have to configure the dockerfile as is and then just change the directory but that's very easy we'll also use the database hosting to host a managed database to monitor the traffic and the analytics specifically on the database reads and writes

**3:09** · and since we have a react application for our front end we can just use the static site hosting which is completely free with savala you can bring any workload so you can focus on building use any stack you want and then just keep on shipping software if you're like me then you just want to ship your software without having to worry about things like retention policies kubernetes compliance cluster

**3:30** · maintenance whatever it's a big headache for me so make sure you give savala a try by clicking the link below and supporting the channel thank you savala for sponsoring today's video so here's the first deployment that we're gonna do it's a simple server with 0.3 cpus and 0.3 gigabytes of ram just 1 instance

**3:48** · of that we're also going to deploy a postgres 17 database with 0.25 of a cpu and 0.25 gigs of ram and ideally this should fit a lot of traffic especially for what the application does so just an initial test 60 users and about 200 requests per

### Deploy #1: The Baseline

**4:05** · second this is a bit of a test phase so i'm going to use sentry to try and iron out all the details i can also like larp being a actual software developer doing this type of stuff and you know finding bugs in production so it kinda feels good for my you know crippling self esteem as you can see right here we

**4:26** · can see the moment that things go crazy we spike up to basically all of our limits and then we do a stall in the response time but then immediately come back down at first i had about a hundred users but have no request per minute but then i found out that this was wrong on my end so ignore that so for a hundred active users using the website pretty intensely it's probably gonna cost us about $15

### 100 Users: $15/Month

**4:50** · a month but just realize though that most places will just throw you under their free tier and they wouldn't even charge you this so on average with this deployment method i got about 20% cpu usage and we use about 500 to 600 megabytes of memory on average we do about 45 milliseconds of latency in that response time and this is about 70% readers and 30% content creators but of course this is whatever a nothing burger so let's just ramp up to a thousand users

**5:23** · let's take the same deployment and then ramp up the max amount of users to a thousand and then ramp up to 5 every single second which gives us about 10 to 15 requests per second i'm pretty surprised at the results here by the time we got to about 1,000 users things just started to

### 1,000 Users: When Things Get Slow

**5:40** · slow down again about 10 seconds worth of response times but interestingly enough where we got a lot of pushback was in the liking a tweet endpoint the funny thing is our postgres database just still doesn't even give a damn like it's it's nothing so i went into my code and decided to refactor i was calling the database multiple times and not even checking my cache speaking of cache this is something that we'll probably have to address later because it's going into memory but you know for now we'll see how far we can push it so making that little optimization did a little bit better actually but roughly

**6:12** · around the 605 number of users mark we started to spike up a little bit and never really recovered on the way down you can see the bottleneck is in the cpu which to be fair for half a cpu with 500 active users is pretty insane and realistically you can still use the app just fine probably you're just getting about 10 second

**6:32** · response time which actually is really bad so yeah never mind so let's try vertical scaling here by adding another $8 a month we actually just doubled our cpu which might end up making it a lot better and also the easiest option let's give it a try

**6:53** · this virtual machine just absolutely crushed it we were able to basically handle the entire load now there was 1 issue throughout the whole entire thing though and that was a configuration issue on my end after about 730 active users we started to get a little bit of errors because 1 of the g unicorn gunicorn whatever 1 of the gunicorn workers handles

**7:14** · the traffic kept resetting this actually also upped the failure rate but only by a little to be honest it didn't even do it by much at most we're about 1400 millisecond response time which again is not the best but it's not terrible in fact i probably could have downgraded the the cpu vertical upgrading it's it's doing wonders here but we're definitely pushing it to its machine's limits let's do

**7:45** · 10,000 users this 1 is going be a significant ramp of course we're having the 10,000 max users but we're going to ramp up to 35 users per second so i realized something i'm actually sending out 30,000 requests per minute which caused my internet to crash i don't understand if it was my errors that were coming through but we had a 54% failure rate so i had to find a new solution which is distributed load testing the

### 10,000 Users: Distributed Load Testing

**8:18** · way you work is that you have a master server and that is able to control the child servers that then host a different amount of virtual users on it locus does this right off the bat i have to deploy a lot of very powerful servers which cost a lot of money so i'm gonna find a way to deploy this using different virtual machines so for 10,000 users that shouldn't

**8:38** · really be much of an issue but anyway let's check out what we need to do to get this to work first we definitely need to up our memory now rather than scaling vertically again i actually think we don't even have to use any memory whatsoever i think we can just use a key value store like redis which is a great cache the cache is what's taking up all the memory anyway so we can just push it elsewhere so i'm just going to add a redis database into savala and just add the environment variable and things are easy now let's give it a try now adding the redis

**9:13** · cache to a lot we were pushing our vps to the absolute max now the 10,000 was a bit harder at first to do i realized that big issue was in g unicorn which serves all the request i was using g thread which was using the cpu power not as effectively and was all on

### 100,000 Users: Horizontal Scaling

**9:33** · blocking threads but then i switched over to g event which now uses async so things are a lot better and outside of a small spike we actively were able to hold at least 10,000 active users on the website with over 800 to 850 requests per second

**9:55** · so this is where we get into horizontal scaling now i've talked about this concept like a billion times on this channel i feel like it's just been like every other video at this essentially instead of 1 large server that you keep growing and growing you have it trafficked towards the same server but separate

**10:11** · right now we have 1 instance of it we can set it so that once we get to about 80% cpu usage we can deploy another 1 and start routing traffic over there and this actually makes a lot of sense for our scenario which is a social network ideally you'd want to use a setup like this because you only pay for how much time you use these virtual machines so if you have an extreme surge of users you only have to pay for the servers that are being run for that just because we're literally 10 x ing this i'm gonna set a maximum of 5 instances to go

**10:41** · off ideally this is when you would start researching when your peak users are starting to come online and also we're definitely gonna have to upgrade our database here so i'm just gonna vertically scale it this time the first thing that i wanna do is upgrade our virtual machines then it means that we can have more workers associated with it as well but i'm going to increase the amount of instances to 10 so 10 instances we'll see how that goes something that's worth noting is that i'm not serving images or anything whatsoever

**11:10** · so a content delivery network would be crucial here if you're serving files or receiving files but i'm not now to load test a hundred thousand users i have to get about 22 machines with 8 cores each in them and this will hopefully get us close to a hundred thousand users well hopefully so for

**11:30** · reference this can be about 35¢ per 1 hour of running per virtual machine so to do this it's gonna cost me about $3.50 for about 15 minutes to run this test which you know seems fine but i i don't do things once here okay i have to do this a million times so make sure you subscribe okay especially if you're this far first of all getting to a hundred

**12:00** · thousand users was tough simulating the amount of users just wasn't easy so i did a workaround where i just raised the amount of requests per user to make up the difference in users that we might have lost i ended up just adding a couple more servers as a backup then i upgraded those servers as well but 1 of the biggest differences was p g bouncer in the middle of my servers and postgres to pull in connections

**12:23** · although there are some hiccups we were able to get about 10 to 15,000 requests per second which is awesome 1 of the biggest takeaways from this is how hard it is to actually have an application be up 24 7 there's a ton of things that can slow you down or just randomly hop in like huge spikes in traffic misconfigurations more and

### Lessons Learned

**12:40** · throughout this journey i learned that there's really not 1 way to do this everything has different types of operations for example you might have an application that has a very long process that takes a lot of computing power over time or you might need a large database that's being called many many times all of this requires your own built in analysis to look at it and determine where do

**13:04** · i scale to meet the demand of my users and of course i had a finished app that i never added features onto so you would have to figure out how to deploy a version of your application with the scale that you have almost no matter what it's going to be an iterative process thank you again to savala for sponsoring today's video let me know if you want these types of videos and make sure you subscribe for more peace out coders