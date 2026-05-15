---
title: "The Genius System Behind the Uber App’s Real-Time Map"
source: "https://www.youtube.com/watch?v=gHIs0Mdow8M"
author:
  - "[[Philipp Lackner]]"
channel: "Philipp Lackner"
published: 2026-01-01
created: 2026-05-11
description: "In this video, I'll go in detail into how the Uber app and backend really works to allow streaming millions of live locations of their drivers and riders - while making sure the app still runs fluentl"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=gHIs0Mdow8M)

In this video, I'll go in detail into how the Uber app and backend really works to allow streaming millions of live locations of their drivers and riders - while making sure the app still runs fluently.  
  
⭐ Courses with real-life practices  
⭐ Save countless hours of time  
⭐ 100% money back guarantee for 30 days  
⭐ Become a professional Android developer now:  
https://pl-coding.com/premium-courses?utm\_source=youtube&utm\_medium=video&utm\_campaign=default&cmc\_strip=utm  
  
💻 Let me be your mentor and become an industry-ready Android developer in 12 weeks:  
https://pl-coding.com/drop-table-mentoring?utm\_source=youtube&utm\_medium=video&utm\_campaign=default&cmc\_strip=utm

## Transcript

**0:00** · We've all done it. You open the Uber app, enter your location and desired destination, and then click a button to get a ride. From this point on, two things happen. On the one hand, your location as the rider is shared with Uber. And on the other hand, nearby drivers positions are shared with you.

**0:15** · And what seems like such a simple thing comes with massive complexities on Uber's end to make this system work fluently for hundred millions of users.

**0:24** · How does the Uber app on back end really achieve to update it so fluently for this many drivers even in bad network conditions? Let's take a look. Uber must keep millions of driver devices, rider devices, and backend services in sync in near real time. And originally, Uber stick to an approach that ended up getting them into huge problems. Back then, they've actually implemented a polling based approach where the app simply asks the server for new data. So in a simple loop, the client has asked the server things like, "Hey, are there new locations for nearby drivers? Are there new locations? Are there new locations?"

**0:55** · So this was Uber going full founders mode. But it was clear that this approach won't scale. On the one hand, every polling request made that way that does not result in new data for the client is in the end unnecessary load for the server. It also drains a lot of battery. It comes with a lot of overhead because every polling request adds additional headers to the request.

**1:15** · And what this has led to at some point is that 80% of network requests made to Uber server from the app were polling calls. It has also made the cold startup time of the app skyrocket because multiple concurrent polling calls were competing which prevented the app from rendering UI because the data came from the polling calls. And as a result of these polling problems, Uber has moved to a pushbased communication approach.

**1:38** · So instead of the client asking for new data, the server now pushes it to the client once it's available. And for that they've created ramen. Okay, not actually instant noodles. Ramen stands for realtime asynchronous messaging network. And in theory this works much better, but still comes with challenges.

**1:58** · So now instead of the client blindly asking for new data, they needed logic deciding when to push, what to push, and how to push that data to the client. And for a scaling infrastructure, they decided to separate these three responsibilities. First of all, they've introduced Firewall, which is a micros service responsible for the decision behind when to push. So, it's really just a service that listens to all kinds of different events and then decides if it's worth pushing an update to the client. So, these events could be a user requesting a ride. This could be a driver accepting a ride.

**2:28** · It could be a new location of a rider or a driver. And while locations may change very frequently, not every little change definitely has to be sent. So Fireball may compare a new location with a previous one and only send the new one if it has changed enough, for example.

**2:43** · \[music\] And when Fireball then decides that a push should happen, it takes this information and it sends it to Uber's API gateway. This gateway now has the purpose to take a look at that minimal push data and gather the entire data necessary for the client. For example, the users locale, the operating system they use, and so on. Finally, the client then connects directly to the ramen server, which pushes the determine payload to the client. How does Ramen actually work internally? Well, originally it was built on top of SS.

**3:11** · So, server sent events and ramen is in the end just a protocol, a technology built on top of that that makes sure that at least once delivery is guaranteed. So that events being pushed to the client will definitely also arrive there. Nowadays, however, they've migrated it to use gRPC as it allows sending messages from both client and server. So, it's not just a pushbased approach anymore where just the server can push data to the client at any time, but the client can also share data with the server that way. So this infrastructure now allows Uber to push data to clients efficiently. However, there was still a big challenge.

**3:40** · Uber in the end receives realtime updates for millions of locations around the world every minute. So how do you actually send just the locations a specific client cares about? So exactly those of nearby drivers of that client app? One approach you may think could work is to simply take a look at the riders position and then calculate the distance to all drivers positions to only show those in a given \[music\] radius. But as you can imagine, at high scale, calculating millions of distances for millions of active riders results in unmanageable load for the server.

**4:10** · So instead, Uber actually came up with a much much more genius approach called spatial partitioning. And the idea behind that is really to take a geographic space and then divide it into smaller regions where we can then take a driver's position and map it to a clear region. since this way we don't have to calculate millions of distances anymore but just check which drivers are in our region and the ones around it.

**4:33** · Splitting up the world into squares however has a major problem and it is that squares don't have the same distance to all the neighbors which can lead to what we call corner bias since squares diagonal to the one you're looking at are further away than squares to the top of it or to the left and right. Wouldn't it be much better if we could simply query nearby drivers based on at least an approximate radius? And that is why Uber has created H3, which is an open-source hexagonal spatial index.

**5:02** · So instead of dividing the world into squares, it divides it into a honeycom of hexagons, each really having the same distance to all of its neighbors. So given any GPS coordinate, H3 computes which hexagon it's in, and then returns that H3 index. And instead of computing distances for every driver, you instead ask for the so-called K ring. So those hex's within K steps of your rider cell. So for example, if K is equal to one, then that includes the first layer of neighbors making up seven cells in total.

**5:31** · If K is equal to two, then the second layer of neighbors is also included. And this new system effectively brings down the time complexity from O of N where N could literally be millions of active drivers to O of K^ squ plus O of M where K is the radius and M is the number of nearby drivers.

**5:51** · So this means if there are 100 nearby drivers, Uber now only has to iterate over those 100 drivers instead of possibly millions. And the genius thing behind this new strategy is not just that it can be used for finding nearby drivers, but actually for so so much more that is important to Uber. \[music\] For example, to create dynamic pricing zones for predicting the estimated time of arrival or for things like forecasting demand.

**6:14** · And now that spatial index helps Uber to really optimize load on the server side since when receiving a rider's location, the server can now look up nearby drivers positions much faster and therefore give the client a faster response. This however is only one side of the metal. Especially with a mobile app, you can't count on its internet connection being super stable at all times. And in the case of a ride sharing app like Uber, it's completely expected that most people using it aren't at home and therefore likely won't connect via stable Wi-Fi connection, but much more likely a cellular one.

**6:44** · So, how did Uber's engineers optimize the mobile app to run super smoothly even under bad network conditions? And here there are two things that have to be looked at. First of all, how do we actually minimize the network latency between mobile app and server? And second, how do we make sure the app still feels fluent even when not receiving many GPS updates? Let's start with keeping network traffic fast. Here, Uber actually sticks to so-called edge servers.

**7:10** · And those are really nothing else than hundreds, if not thousands of servers spread around the globe where each server is responsible for nearby users. So instead of a user in Berlin talking to a server in California, Uber instead uses service relatively close, for example, in Frankfurt. And these edge servers then not only serve as a primary entry point for requests for nearby drivers and users, but also cache all kinds of relevant data, so data access is even faster.

**7:34** · And when considering a typical 4G connection, this change alone can result in requests being approximately 100 milliseconds faster when talking to a closed local server versus one that is 10,000 km away. However, even with closed servers, there is no guarantee that new location data arrives reliably at the same intervals. \[music\] In mobile apps, you in the end always need to account for connection drops at any time. So, let's imagine the Uber app now receives three location updates from a driver over the period of 20 seconds.

**8:03** · Our goal is now to not make the location jump from one coordinate to another when a new location is received from the server. So instead, we need a way to take a look at a few known locations and use that information to kind of predict what is likely the new current location of the driver, even if it doesn't send a new one. And for that, Uber uses what we call that reckoning, which really tries to predict where the driver should be if they kept the last known speed and direction.

**8:28** · This is then used in combination with so-called Kelman filters, which combines these predicted coordinates with real measured coordinates. \[music\] And that's in the end what makes the car marker move around smoothly even when a new measured coordinate is quite different than the last predicted one. But I actually also have something for the conspiracy theorists among you. There are actually claims and discussions about Uber showing fake cars in the mobile app.

**8:50** · cars that don't even exist. Because if we think about it, for cars that don't even exist, \[music\] you obviously don't have to listen to serverside location updates, and you could also artificially make more drivers appear to riders to not show them a dead area, which may make them open a competitor's app. This phenomenon of phantom cars is however something that Uber denies. But what this shows is that most simple looking interfaces often have the most complex back ends, especially when things really have to scale. And with this video, I really tried something new here and a lot of work went into this video and that is why I need your feedback here.

**9:21** · Is there anything that wasn't clear? Uh would you like to see more such videos every now and then? And if so, which app would you like me to take a look at next? So, if mobile development and especially with cotton is a thing for you, then subscribe for all kinds of in-depth tutorials about that. Thanks so much for watching. I will see you back in the next one. Have an amazing rest of your week. Bye-bye.