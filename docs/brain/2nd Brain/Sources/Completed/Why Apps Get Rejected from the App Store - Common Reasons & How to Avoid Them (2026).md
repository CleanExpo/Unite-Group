---
title: "Why Apps Get Rejected from the App Store - Common Reasons & How to Avoid Them (2026)"
source: "https://www.youtube.com/watch?v=CGW3_eRM1G0"
author:
  - "[[NDC]]"
published: 2026-01-26
created: 2026-05-08
description: "Understand why apps get rejected from the App Store and how to avoid common mistakes before you submit. This breakdown covers the most frequent rejection reasons organized by category, with real examp"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=CGW3_eRM1G0)

Understand why apps get rejected from the App Store and how to avoid common mistakes before you submit. This breakdown covers the most frequent rejection reasons organized by category, with real examples and Apple's actual expectations.  
  
In this video, you'll learn:  
\- Common metadata rejections and how to write compliant descriptions  
\- Privacy and tracking violations that catch developers off guard  
\- UI/UX issues that trigger rejections  
\- Performance problems that fail review  
\- Policy misunderstandings that lead to frustration  
  
Perfect for developers submitting their first app, anyone who's been rejected and doesn't understand why, or teams trying to reduce rejection rates.  
  
🎯 Why this matters:  
\- 40%+ of first submissions get rejected  
\- Most rejections are preventable with proper understanding  
\- Vague rejection feedback leaves developers confused  
  
📋 Rejection Categories Covered:  
1\. Metadata Issues (screenshots, descriptions, keywords)  
2\. Privacy & Tracking (permissions, data collection, disclosures)  
3\. UI/UX Violations (confusing flows, incomplete features)  
4\. Crashes & Performance (bugs, battery drain, unresponsive UI)  
5\. Policy Misunderstandings (spam, minimum functionality, copyrights)  
  
⏱️ Chapters:  
00:00 - Why Apps Get Rejected (The Reality)  
00:45 - Review Guidelines website  
01:55 - Category 1: Metadata Rejections  
03:43 - Category 2: Privacy & Tracking Violations  
05:45 - Category 3: UI/UX Issues  
08:12 - Category 4: Performance Problems  
10:23 - Category 5: Minimum Functionality  
10:53 - Category 6: Intellectual Property  
11:21 - Category 7: In-App Purchases  
12:45 - How to Avoid Rejections Before Submitting  
14:58 - What to Do If You Get Rejected  
16:11 - Appeals (LAST RESORT)  
17:24 - Wrap up  
  
🔗 Resources:  
\- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/  
\- Apple Distribute App Review: https://developer.apple.com/distribute/app-review/  
\- Apple's Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines  
\- My App Store Submission Guide: https://youtu.be/Qgq6jsRtfbA  
\- My TestFlight Guide: https://youtu.be/x0d8Jx3HvdI  
  
💡 Real Talk:  
Getting rejected doesn't mean your app is bad. Everyone gets rejected - even experienced developers. The key is understanding what Apple is actually looking for so you can fix issues quickly and ship.  
  
⚠️ Common Misconceptions:  
\- "My app works fine" ≠ Passes review (functionality isn't the only criteria)  
\- Following guidelines literally ≠ Approval (Apple interprets their own rules)  
\- Being rejected once ≠ Permanent block (you can resubmit indefinitely)  
  
This video teaches you to think like an App Store reviewer so you can anticipate issues before they happen.  
  
#AppStore #AppStoreRejection #iOSDevelopment #AppReview #AppleDeveloper #iOS #AppDevelopment #Swift #SwiftUI #MobileDevelopment

## Transcript

### Why Apps Get Rejected (The Reality)

**0:01** · Getting your app rejected from the app store feels terrible. You've built something, tested it, you're ready to ship, and then you get this vague email from Apple saying, "Hey, there was an issue." You check the review and it's like, "Hey, guideline 2.1 violation."

**0:15** · With barely any explanation. Here's the reality. Over 40% of first-time submissions get rejected. But most of these rejections are completely avoidable if you understand how Apple actually thinks. In this video, I'm breaking down the most common rejection reasons by category, not just what the guidelines say, but what Apple actually means and how to avoid those issues before you hit submit on App Store Connect. In the description, I'll include links to both of these articles.

**0:41** · The first one is the app review guidelines and the app review from Distribute. It's important that you understand how Apple reviews apps. Apple has human reviewers, not just automated checks. These reviewers follow the App Store review guidelines as seen here, but they can also interpret them from time to time. This can mean two things.

### Review Guidelines website

**1:03** · First, you can have a technically compliant app that still gets rejected because the reviewer interprets a guideline differently than you did.

**1:11** · Second, you can get different results from different reviewers. I actually have an example of when this happened to me on the screen here where I submitted a build and then after a rejection I resubmitted the same build and it got approved by a different reviewer. The key is to think like a reviewer. What are they looking for? What raises red flags? What makes them confident your app belongs in the app store? And this is what I want to teach you with this video. So on this website, there are different categories broken down into different things like safety, performance, etc.

**1:40** · When you click on them, you get all the different reasons that your apps could potentially be rejected for the app store. I'm going to talk about the most common ones in order, but feel free to check the timestamps for any rejections you may have encountered. Let's first talk about performance and specifically accurate meta data. Metadata is everything users see before downloading your app. The screenshots, the name, uh who who developed it, language, etc. So often times people get hit with 2.3 accurate metadata.

### Category 1: Metadata Rejections

**2:10** · This is when Apple rejects apps that metadata is misleading. So the common metadata rejections for this are because the screenshots might not match the app. Your screenshots may show features that don't exist or maybe even potentially exaggerate what the app claims it does. To fix this, show only actual app screens. You may want to not have any mockups. Make sure there's no coming soon features, no aspirational designs. Everything within here should all be found within your app.

**2:37** · You can, of course, include, like I've done here, like a little bit of text, but the screenshot of any gameplay or any functionality of your app should always be accurate. Another reason could be that the app name contains misleading keywords. If your app is called Best Photo Editor Pro Premium Edition, but it's just a basic filler app, you might get rejected. So, you can use a descriptive name, but not a keyword stuffed SEO grab. Apple reviewers will typically see through this immediately.

**3:08** · Now, the thing is the description promises features you don't have. One time I put dark mode support, meaning the system, light and dark mode, and because my app didn't have a actual toggle for dark mode, they rejected it due the description being wrong. So, again, if you mention something like AI power editing, but there's no AI and it's not there, fix it. Just be honest in your description. Describe what the app does today, also not what you plan to add. Another thing to mention is there could be copyright violations in the screenshots here.

**3:36** · So don't use any copyrighted images, logos or branding visuals without permissions even in the screenshots. The next reason I want to talk about is 5.1 privacy. The privacy rejections have been more popular ever since iOS 14. Apple takes user privacy extremely seriously, which is a good thing. Let's talk about privacy 5.1.

### Category 2: Privacy & Tracking Violations

**3:58** · This is if your app collects any user data, accesses device features, or tracks users, you must be transparent about it. My most recent app, I use ADM Mobs, and I was forgetting an option. A common reason for this is actually missing privacy purpose streams. So, your app may request camera access, but it doesn't have privacy camera usage description in the info.p list.

**4:20** · Oftentimes this would cause a crash, but just in case you manage to upload it, any time that you're requesting to use things that the user must consent to, that consent must be present in the info.p list. On top of that, you can even see here when you are asking for permission, uh they must be clear, right? These would not pass review. App would like to access your contacts. App needs access to the microphone. It needs to be very clear why you're trying to access these device features. So saying things like, "We need to access your camera to take photos to add to the app."

**4:51** · Just make sure that whatever you're requesting, is extremely clear, otherwise it will be rejected. You may also trigger privacy from missing a privacy policy URL. So under the App Store app privacy, make sure you have a privacy policy URL added to the App Store Connect. You can create these for free online. There's free generators and you can host it publicly. Just make sure you add that URL here. Also want to talk about tracking without permission.

**5:17** · If your app uses analytics or an SDK such as Google ADM Mobs that may be tracking the user in some way or another, you need to make sure you've included app tracking transparency or at. So if they do track them across websites for ads, analytics, personalized ads, you also need to prompt the user with the request tracking authorization and respect the user's choice. Next, let's talk about another common one, design. Your app needs to feel like it belongs on iOS.

### Category 3: UI/UX Issues

**5:47** · It should be intuitive, polished, and complete. This is a pretty big one, and something to also note is copycats. Make sure you come up with your own ideas.

**5:59** · What I find funny about this one is I somehow triggered this one on my first version of Word Sage where I got 4.3A spam and I was like, um, let's check this one out. Let's go 4.3A spam.

**6:12** · Apparently, my bundle name was too close to something that already existed, and I was like, "Oh, okay, interesting." Um, but make sure that you just look through the design. I know I make a lot of tutorials, but make sure you're still coming up with your own original app ideas. Don't just take a tutorial I make and then submit it to the app store. If everybody does that, nobody would get submitted because, hey, we're just all submitting the exact same thing. Another reason you can actually trigger the design one is if you have incomplete apps or placeholder content.

**6:40** · So if your app launches and it's like coming soon screens or even placeholder text Lauram Ipsum copy Apple may choose to reject it. Just make sure you remove any placeholder content. It's totally fine to have like a settings form that's like \[music\] by the way in next update we're adding light and dark mode. That's okay.

**7:02** · But if I click on a game mode or perhaps in your app and it just has text that says coming soon instead of providing anything, just remove it until you're ready to ship. So I also want to talk about login services. We can see that apps that use a third party social login service, Facebook, Google signin, these ones are pretty um similar. They must also offer an equivalent option to another login service with the following features as well as lo if there is login required with no guest access.

**7:29** · Let's say your app requires login but doesn't offer a way to try it first and you didn't provide the demo credentials to Apple. Either you need to provide a demo mode or include a demo account credentials in the app review information section when submitting.

**7:47** · Also in the design, you may get rejected for not conforming to the human interface guidelines, harmony, consistency, even things like color and contrast, and making sure that your app is accessible. If you're using non-standard UI patterns like a close button in the bottom right or a back button that says next, you also may get rejected. You can check out the human interface guidelines for more information. Let's also talk a little bit about performance and specifically 2.1 app completeness. Your app must be stable. It needs to work on devices you claim to support.

### Category 4: Performance Problems

**8:20** · So if your app is constantly crashing during review, let's say the reviewer opens it and it crashes immediately or freezes, they may say, "Hey, we encountered crashes during review." Make sure you're always testing on real devices, not just the simulator.

**8:35** · Use test play with external testers.

**8:37** · Make sure everything is good to go before you're submitting. Don't forget you can use the builtin instrument tools in Xcode to check out the app launch, figure out why there's crashes, use the activity monitor, etc., etc. to prevent those crashes or find out what's happening. Make sure your app doesn't crash or freeze for the reviewer. Also, make sure you're testing on real devices, not just the simulator. Use TestFlight with external testers before you submit. You can also check Xcode's crash logs and fix all of those crashes.

**9:09** · Users through test flight can also submit those crashes to you. Another thing to test for is the power profiler or even understanding the battery usage.

**9:20** · If your app is using a lot of location services, using the camera and not ending that sequence and essentially just having a lot of runaway processes, it can drain the battery and actually cause you to fail your app store review.

**9:32** · So, make sure you're profiling these with the instruments and find those battery killers. whether you're tracing the process using the power profiler or any of these other tools. Another thing might be the network dependency without any offline handling. So if your app requires internet but shows a blank screen or crashes when offline, definitely fix it. It could be a simple fix as showing a friendly error message when offline, just consider caching data for offline access as well. Another thing with the activity monitor or even just testing your Swift UI is if it's really slow or responsive.

**10:04** · Let's say I press a button, it takes 3 to 5 seconds to respond. Images load slowly or the app feels laggy. This can cause a denial as well. Make sure you're optimizing.

**10:16** · Use lazy loading. Run network calls off the main thread. Make sure you're also testing on older devices, not just the newest Pro Max. In design, let's also talk about minimum functionality. So 4.2 is pretty common. We can see here your app must include features, content, and UI to elevate it beyond a repackaged website. So what does this mean? Your app must do something meaningful. Apple just rejects apps that are just websites, single screen tools, or overly simplistic. To fix this, add more features. If it's a utility app, make sure it solves a real problem better than a website would.

### Category 5: Minimum Functionality

**10:47** · Simple doesn't mean useless. It means it needs a clear value. 5.2 is another common one.

### Category 6: Intellectual Property

**10:55** · Intellectual property. You can't use any copyrighted content, trademarks, or branding without permission. Make sure you only use content you own or are licensed. I'm not going to be ripping a bunch of MP3s off Spotify and put it on my app and say, "Hey, I made all these songs." That doesn't make a lot of sense. Just make sure you have permission. A lot of times when I'm making apps and I need background music, I'll make royalty-free music or I'll ask permission from the creators. Same thing with sprites, logos, etc. All right, here's a big one. Inapp purchases. This is 3.1.1.

### Category 7: In-App Purchases

**11:27** · Falls \[music\] under the payment section.

**11:29** · If you do sell any digital goods or services within your app, you must use Apple's inapp purchase system. So, if you're using an alternative system, you may get rejected. There are service providers like Revenue Cat, which just provide a roundabout way of using inapp purchases. However, it's all still done through Apple. If you're using a alternative payment method for digital content, the fix is to use store kit for inapp purchases. You cannot link you cannot link to external websites for payment. to use Stripe or PayPal for digital goods or bypass Apple's 30% fee.

**12:03** · Now, I'm noting that as digital content or digital goods. That's why shopping places still exist. You know, if I want to go buy new pants from the Gap, right?

**12:12** · I can still go through their service.

**12:14** · But if it's a digital good, an inapp purchase, you must use Store Kit. Again, Revenue Cat, you're still allowed to use services like that to help make those purchases easier. they still use Apple's services. You can feel free to reference any of these. Whenever you do get rejected, it will give you a code. So, for example, that 5.11, we go here, right? It does provide more information. So, definitely feel free to check out this website. I just want to give you a checklist before we're all done here.

### How to Avoid Rejections Before Submitting

**12:45** · The first one is to always test on a real device. Use TestFlight with internal and external testers. Get feedback from people who aren't familiar with your app. The next is to review metadata very carefully. Is it the screenshots, the promotional text, or description? Make sure everything you're sharing with users is 100% accurate.

**13:06** · Would a reviewer see something in here and say, "Hey, this is misleading." I know we want to include as many SEO things as possible, but make sure you're 100% accurate and honest. The next thing to do is track all your privacy strings.

**13:20** · Go through your info tab or your info.p P list and verify that every permission has a clear and honest purpose string.

**13:28** · For this one, for the at this app uses your data to show personalized ad and improve your experiences. Then just say, hey, I need this for a reason. Don't worry about it, bro. You know what I mean? But make sure it's clear. Make sure you're also testing offline scenarios. So, turn off your Wi-Fi or your cellular and make sure your app can handle it gracefully. Will it still show that content regardless of connection?

**13:53** · Also, make sure you're running every user flow. Can a firsttime user figure out how to use your app? Is it clear? Do they understand? You may also want to have an onboarding flow for the first time that people use your app. Make sure there's no dead ends \[music\] and that navigation is clear. Even if you're going across multiple screens, make sure you have things like dismiss, close, or they can scroll the sheet down, back buttons, etc. Make sure you're also using the instruments in Xcode to check for crashes and any performance issues you may not notice.

**14:24** · You can also use Xcode's analyze tool and always check on older devices as well. I have an iPhone SE3 which is pretty old so I always test on that one too. But definitely read through these guidelines. I know it sounds like I'm giving you reading homework but it helps especially if you get rejected for a certain reason.

**14:41** · Coming here and reading the guidelines for more context can prevent that from happening again or in the future. As I mentioned, there's also like this app review guidelines here, which also has the steps. Submitting for review, avoiding common issues. A lot of these I did talk about today. Let's talk about what happens when you do get rejected.

### What to Do If You Get Rejected

**14:59** · Trust me, it's not the end. It's happened to me countless times. Here's how to handle. Read this message that Apple sends back to you carefully.

**15:07** · Again, it'll have the different codes up here. Sometimes there's like next steps, there's resources, a port, etc.

**15:14** · Understand what it actually means. Next, reproduce the issue. If Apple says your app crashed, try to reproduce it. In this case, I had a misleading string for my camera usage. Figure out where it pops up, what it's showing, and make sure you're able to then go to the next step, which is fixing the issue. Make those necessary changes to your app.

**15:32** · Don't just tweak it. Actually fix the underlying problem. The next step is to respond in the resolution center. So, here we can see reply to this message.

**15:40** · Need more assistance? There's the contact us module, etc. Just when you're replying to them, explain what you changed and how it addressed their concern. You can be professional and concise like, "Thank you so much for your feedback. I've updated the app to include, let's say, the privacy policy URL." And added clear purpose strings for all permissions. The issue is now resolved. The next step would then to be resubmit. Upload the fixed build and resubmit it. Second reviews are often faster than the first reviews. So, the last thing I want to talk about are appeals.

### Appeals (LAST RESORT)

**16:11** · And you can do this on your developer account. Go to the contact us and you'll want to get help with a recent issue. Go to the topics and then from there the app review, then appeal an app rejection. When should you appeal? If you genuinely believe the rejection was a mistake and your app does comply with the guidelines, you can appeal. Only do this if you're 100% confident. Appeals that are clearly wrong waste everyone's time. Most of the time, trust me, it's faster just to fix the issue and resubmit.

**16:39** · One time I had to use the appeal as my in-app purchases were told that they weren't found within the app. Even though they were there, they were clear, they were tested, I knew for a fact they worked, the reviewer said they couldn't find them.

**16:54** · It ended up actually breaking the inapp purchases and making them unable to be reviewed and submitted properly. So I had to submit an appeal and talk to support and they were able to manually go in fix the inapp purchases which were there all along approve them so they were ready for sale. So again you may encounter bugs and you unfortunately have to go through contacting support or appeal but remember only use this as a last resort most of the time. Just resubmit fix it'll be faster. Haven't done so already you can watch my app store submission guide.

### Wrap up

**17:26** · If you're using TestFlight, check out my TestFlight guide to beta test properly and submit before you review. Seeing the getting ready for sale or approved feels amazing. There's not a lot of experiences that feel quite as rewarding. Now you know how to get there faster. And if you do get any of those codes, check out the app reviewer guideline and make those quick adjustments. Thank you so much for watching. Go ahead and go ship your app.

**17:52** · Let me know how it goes in the comments below. Otherwise, dream big, code bigger, and we'll see you in the next one.