---
title: "Working on Slim64FS Codex and Claude making slim64fs_fsck --repair"
source: "https://www.youtube.com/watch?v=nKCL9SocNZI"
author:
  - "[[Albert Does AI]]"
channel: "Albert Does AI"
published: 2026-05-11
created: 2026-05-11
description: "Working on Slim64FS Codex and Claude making slim64fs_fsck --repair"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=nKCL9SocNZI)

Working on Slim64FS Codex and Claude making slim64fs\_fsck --repair

## Transcript

**0:01** · We're going to go ahead and finish version six today and we're going to finish out the utilities. Let me find the codeex window because uh I'm bold like that. We're going to go ahead and codeex it running yellow.

**0:20** · And let's see real quick.

**0:24** · We're at utility 8.

**0:26** · Gonna try to let's see take a read at spec slim 64fsv6 emptyd. We are going to work on utility number eight. Let me go ahead and go to plan.

**0:50** · Generate a plan and list all the potential files that will be touched.

**0:59** · Execute.

**1:04** · So, let's take a look. We're building uh Slim 64. We're going to build the uh fsuck repair utility today. I've got um chat GBD up. I've got Claude up. I usually have them different windows on my monitors, but I'll put them on the same one so you can see. And uh Okay, let's take a look. Um go ahead and drag projects 64fs.

**1:34** · Let me see. Where are you? Let me see.

**1:38** · Let's see. We're in tools. We're in spec and V6. I'll do that real quick.

**1:50** · We are uh doing utility number eight.

**1:58** · Check back on our where is our codeex?

**2:02** · Codeex promote. Okay. Okay. So, first question, which binary strategy we looking at? Dry run free for utility dry run plus repair.

**2:12** · um keeps read only a um h I'll ask let's see promote new fs suckle all right let's do Do it.

**2:44** · Let it run. Why is Claude not happy? Let me see. Claude, why are you not happy?

**2:52** · Intellian number eight.

**2:57** · Plan prompt in the bin. Let's take a peek.

**3:03** · Can I move you over? Thanks. All right, let's take a look at what we got for the plan.

**3:11** · Um, I assume we're going to have a dry run and a repair.

**3:17** · Can I do dry run and repair? That's my question. Print exact plan, execution order. Okay, write it out. Let's take a look. So, here's what I usually do. Um, I don't trust codeex by itself. So I will take its summary plan

**3:39** · and I will actually stick it back into chat GPT good strong blah blah blah checkpoint after each class correct never for semantics also correct three following one additional So something like this. It says one additional recommendation I usually will throw out.

**4:08** · Um let me see where is I will usually let me do this real quick. I will usually take something like one additional recommendation.

**4:23** · Um I'll take its recommendation. This is from um Open AI. I'll take a peek real quick. No, he doesn't check. X needs to build from scratch. Scan pass. Good.

**4:36** · Full picture. Blah blah blah.

**4:40** · I don't know why Claude is just not happy.

**4:45** · No, that's not what I want. Sorry. Um, usually do this without having it all in one screen. Sorry.

**4:56** · We're going to go ahead and copy throw it at um Claude as well. Usually Claude is much faster. I don't know why it's slow today.

**5:06** · Good implementation. Let's read that. So Claude's going to read through see if it agrees with codeex and um OpenAI and then you'll see. Go Claude. Very very slow today. Don't know why.

**5:25** · figure it's Mother's Day and it should be much faster, but apparently not. Um, working window. Let me go to tools real quick.

**5:40** · Let's see.

**5:43** · Let's take a look. We're at 5,483 uh lines of code for the tools. We'll go check. Um, let's see. And we are at 5,000. Oh, 5,545 lines of code for source.

**6:02** · Um, I don't know why Claude is not coming back. Go Claude. Come on.

**6:11** · Come on, Claude.

**6:16** · Well, we're going to wait for it. Um, let me read through. Let's see.

**6:22** · Formal enumerated type for repair bits is what's recommended. Dry run prints report execute sounds good. This becomes your conical repair. All right. Check one point committed.

**6:37** · Bound terministically. Yes. Let's see.

**6:40** · Um I don't know. Claude is stuck.

**6:45** · Are you stuck?

**6:59** · Um, now Claude, I need you to watch CL.

**7:05** · I want you to read um proposed contract.

**7:14** · Let me do this.

**7:16** · Stop reading the uploaded file. Here's the codeex contract.

**7:25** · Take a look.

**7:39** · I don't really care why.

**7:51** · So, it's running out of buffer and I had an end of file problem previously as well.

**8:00** · I'm going to pause the video until something exciting comes back.

**8:07** · And we are back. document in chat. Is the contract correct? The problem was hitting a cat. Yep. Let's see. 951 lines clean. There's an error. Oh, really?

**8:20** · Previous source stat flag restrict all.

**8:36** · Interesting.

**8:38** · I don't know what's happening because it's thinking that um Oh, I know what's happening. Give me a sec. Let me pause or let me not pause if you want to see what I'm thinking. Um let me go ahead and stop you and uh I think you have stale project files.

**9:00** · I think you have stale project files.

**9:04** · That's what I think.

**9:07** · Um, let me see. Let me do a get commit real quick. Where's my working working working for F suck?

**9:30** · Uh, V6ility.

**9:35** · did V6 utility number eight.

**9:40** · All righty. Let's see. We'll go ahead and shrink that.

**9:51** · Here's the U files. And then let me go ahead and Oh, no. I Sorry. Sorry. I didn't want to send you specs. I wanted to send you source Source. Source. Source. Where is freaking source? Source. Send you source.

**10:13** · And then let me also send you tools.

**10:23** · There we go.

**10:25** · So, it should be up to date.

**10:33** · Let me see.

**10:35** · I suspected you had stale source.

**10:41** · I'm going to go ahead. I've No, I'm not going to. I've uploaded new source.

**10:52** · And I'm going to upload codeex contract. Take a look.

**10:59** · And where was the codeex contract? There we go. Usually goes much smoother than this. Um,

**11:25** · come on.

**11:29** · I uh loaded it to the project.

**12:12** · So, so just to take a look, I And I'll show you. So I had um all the utilities um finished and so we're left on utility 8.

**12:38** · Good. Looks good.

**12:42** · Screw. Now I build.

**12:51** · I don't need you to. Let me stop you right there.

**12:57** · Build. I am going to have codeex build.

**13:02** · I just want you to look over the contract. This is horrible. I have no idea why it's like this.

**13:24** · Good contractor thing needs to get right. Scan source.

**13:41** · Alrighty. So, we're going to go ahead and take So, this is kind of how I do it. I know it's a long video already. Sorry. Um, so I go ahead and say here are the rem the remarks from Open AI.

**14:03** · Agree. Disagree.

**14:06** · Integrate.

**14:08** · Put into a copy window for me.

**14:12** · to send to codeex and then I paste the um what you call it.

**14:21** · So the reasoning behind that is uh both of them usually have uh different opinions what need to be done and they look at different parts. Plan agree integrate as is checkpoint sequence psychological insight care but addition revise. So it will give me in a copy window which I prefer uh what to give to codeex.

**14:48** · Do you not see my head if I slide down?

**14:50** · I just noticed that. Sorry.

**14:58** · And okay. So here we are. Here is the contract still building.

**15:05** · And come on, come on, come on.

**15:14** · All righty, we'll go ahead and sometimes I'll throw it back into um open AI, but I won't this time because I stay in clan mode.

**15:28** · And then I give codeex plans.

**15:34** · Codeex is fast today. I don't know why.

**15:36** · Usually it's slow. And Claude, which is usually fast today, is very slow. So we'll take a look.

**15:48** · I'll send a final copy to uh both clean dry run.

**16:00** · I'll send a copy real quick.

**16:04** · So, so I go ahead and check policy. We'll throw it into um both claude and open AI and we'll see what it says. This is Final Cut account clean three notes agree completely.

**16:27** · to resolve. Let's see. Contract says run full scan mode logic may duplicate one missing test everything. All right, I'll go ahead and copy that and then let's see. Make sure I run.

**16:43** · So, both of them have an opinion on something. When that happens, um I usually will merge I'll usually merge uh and then uh final architect.

**17:00** · All right. All right. I'll just throw it in into a document and then give it to codeex. I know isn't this long.

**17:14** · Stay in plan. Go ahead and then I'll implement it when it comes back.

**17:20** · My new utility plan repair defined. There should be one more smoke test to see if um if it runs. And then and then I literally just said codeex was fast today and I lied.

**17:40** · Oh well.

**17:43** · So I am here. I know it's very boring.

**17:47** · We're going to go ahead and post check means rerun sever class and deferred.

**17:51** · Yep. We will execute. Execute. Execute.

**17:56** · And so we'll go ahead and see run dry run.

**18:07** · So when I said my life is fairly boring, I actually meant it. But this is what I do. The video is already 18 minutes of a lot of Claude barfing at me and we'll see.

**18:22** · But um the implementation should be fairly fast. It's a very very lengthy program though. I'm going to guess about 400 lines, but we'll see.

**18:36** · And um I mean it just looks like everything else.

**18:49** · I'll just let it run. It's not that exciting, but basically um fs sucking repair should be force and dry run. So it should have three um arguments it can take and that's about it. But um while we're watching that we'll go ahead and status and see um over here context window is very very low. That's great.

**19:18** · So we're not too concerned basically about context window filling up.

**19:33** · and we'll take a look while we're sitting here waiting. I'm not running anything cloud code today. I'm going to move Claude out. Um, and then we'll go ahead and um tools and we'll take us take a look at uh what uh what did I say was uh for that was source and 548.

**20:03** · So we're at 800. Wow.

**20:06** · Wow.

**20:07** · That's seriously fast. We're at like, is that right? We were at 548 and we're at 620 something. We're at like 800 lines of code already. We're at Is that right? 540. Oh, we're at a thousand line almost 1,000 lines of code already. Very, very fast. We're jamming in only two minutes.

**20:33** · So like I said um codeex after 5.5 GPD 5.5 is jamming jamming jamming a large portion of it is because of check let's see why is there an error so this is one of the reasons I think a gentex um has changed because if I was doing this by copy and paste it would not know what to do with that.

**21:05** · But it did catch the error.

**21:11** · No file till 8 log.

**21:24** · Very nice. And it finish. We'll take a peek at what it finished with as far as um lines of code. About 100 lines of code.

**21:34** · Let's see.

**21:37** · I'll take a look. Copy this into like uh what's call it both and see what they think exactly that uh blah blah blah. Okay. Recommendation immediate before run abuse not feature worked.

**22:02** · We Yeah. Um, so I have an abuse uh one so we can repair. Let's do that. We'll go ahead and test. See? Good. Let's see.

**22:11** · It's not the project. It's not in the project files. Project scene there with the new files yet. Um, okay. Let me see.

**22:21** · It's unhappy with uh good. Um so we're looking at this before seven run abuse.

**22:47** · Aside from abuse, any other smoke tests or odds on smoke tests face no smoke test is good enough.

**23:09** · All done. What's correct? Three bugs. Oh wow. Three bugs.

**23:21** · So which is probably sufficient most important missing test really we do not have ident seriously all righty let's see tell me what you want to send to code codeex and put it in a copy a window.

**23:48** · By the way, bugs found.

**23:51** · Let me go ahead and I am the piece of meat chatting between two AIs. Isn't that crazy?

**24:19** · So, it's going to go ahead and integrate the fixes and the bugs from um Claude, but like I said, I prefer final usually final instructions maybe from OpenAI because it does uh better guard rails.

**24:38** · back to back at uh codeex and wow, this video is long. We're running at 24 minutes.

**24:55** · So, we'll find um Wow. See, that's very good. I'm now patching name reporting orphan repair honest semantics and out of scope getting good. Let's see what it's doing to source code.

**25:21** · Oh, it's in test. That's why. I'm sorry.

**25:25** · I was like, it's in test, right?

**25:31** · That's why I was like, why? Okay.

**25:36** · Are we in? Nope. Let's see. Test.

**25:51** · Let's see what the um phase 9 smoke tests look like.

**26:00** · Fix is good.

**26:06** · So after it's claimed repairs, I'm going to throw it back into claude.

**26:18** · I'm going to copy and paste what it said.

**26:21** · and applied fixes made allegedly, right?

**26:43** · That was one of the things I was really concerned about, which is inventing new data. Um, that's a contract with the file system. So that if it was there, I'll try to repair it.

**26:55** · If it didn't exist, I will not create it. It's like some file systems do test the test you want codeex to do.

**27:41** · Okay. Recommendation increment N.

**27:49** · So that's an off by one bug or never happened by one bug it caught. That's very good.

**27:56** · I will have what's call it repair it.

**28:01** · I will have codeex repair it. And so that so this is my very very boring programming life. What do you think?

**28:10** · Somewhat crazy. Interesting. Not really.

**28:34** · So, I'm going to ask Claude what it thinks about the test plans.

**28:40** · Wire it up.

**28:43** · Seven. Going to Wow. Wants me run seven tests. Let me see. 10 tests. Okay. Mal formed dur zero action fast path is what valid repeat check stability repair refusal expected nonzero out of bounds. Um okay try run looks good. We will go ahead and What are you unhappy about?

**29:32** · Okay, Codeex thinks it has a better contract. Let me see why it barfed at number five. Let's see. Check injected terminics failure use injection. doesn't say how without explicit kind will either skip the test entirely use preload or add a global filing do not modify constraint true allrighty let's do this

**30:02** · uh but of all the utilities I would say fsuck is probably the most uh going to be the are just in the most important other than make FS closely.

**30:17** · What y'all doing?

**30:30** · Did not add new pair classes. That's correct. Add salvage. Correct. Metadata reconstruction is correct. Redesign repair IR modifies check API deterministic behavior bound. Yep, that technically should also say uh no introduction of global variables, but

**31:00** · technically should have said no introduction of global variables. Not that I thought it would.

**31:23** · Oh, so I was right.

**31:31** · Ha.

**31:33** · Me versus Claude. I caught something you didn't catch.

**31:38** · Let's see.

**31:41** · Um, it's going to go ahead and run all 10 tests.

**31:54** · Let's see. Additional constraint. Too late.

**31:59** · Too late. Claude, I already ran.

**32:04** · But codeex has already run.

**32:09** · So after after it's finished, we'll scrub for globals.

**32:28** · My belly button said there's going to be introduction of globals.

**32:36** · We shall see.

**32:44** · So I I already sent it. So afterwards, I'll need you to do a source code crawl and see if we have hidden globals.

**33:07** · Let's see.

**33:16** · So, I'm going to go ahead and build another 10 tests for fsuck and uh C.

**33:24** · It failed. Oh, refusal without force. Is that a fail? I don't know.

**33:38** · So, I don't know how interesting this video actually is to you, but um I will just let it run. I guess you can just fast forward to the end when I get finished.

**34:22** · H.

**34:24** · All right. So, let me ask real quick.

**34:30** · Were any globals introduced?

**34:47** · Here's data source.

**35:20** · So let me see real quick.

**35:23** · Let's see. H and globals were introduced.

**35:34** · Hi bear.

**35:37** · Let's see. Globals were introduced.

**35:44** · Hi bear. How are you, Bear? Bear, come here. Bear, come here. Bear, come here.

**35:50** · Bear, come here. Let's get on camera.

**35:52** · Let's get you on camera. No. Do you want to be on camera? No. Okay, fine. It's fine. Let's see.

**36:10** · Give Give me codeex instructions.

**36:46** · All right, all three were found to statics.

**36:56** · Let's see from open AI add yours and put into a copy window. And so this is all I do.

**37:13** · I basically have open AI and Claude look over my code, write code, fix code, and that's it.

**37:26** · Bear, bear, go find Yodor to feed you. Bear, go. Bear, bear, go.

**37:41** · This is so basically after this my file system is good to go. The only thing would then be XFS tests. But before we get there basically I have to have all the tools working. And as you can see from the tests and one final time, do you like this one?

**38:00** · What do you think of this one? And we're probably good.

**38:06** · Good.

**38:09** · Good. Good, good, good.

**38:16** · I'm going to go ahead and Yeah, let me go ahead and add grip test at the end.

**38:27** · See, let's see.

**38:42** · Manually verify and verify all the graphs.

**38:54** · All right, we have a good working contract for Codeex. Let me see if the um context window has exploded. No, we're still at 96K.

**39:08** · And all righty, let me see. Nope, didn't change.

**39:19** · 10 minutes ago. This video is going to be like an hour of watching me do crap basically. Sorry.

**39:28** · But after this is finished, my uh file system is actually finished with working uh mechs and fsuck and fsuck repair working.

**39:45** · Um if it passes all the tests, it should um have run salvage and uh rebuilds.

**39:54** · Uh phase seven and phase 9 smoke test should have passed and yeah.

**40:08** · Oh good.

**40:10** · It's going to it's going to remove all globals which is good. So afterwards I'll have uh hooks and flag update tests remove embedded. Good. So we're looking for a 10 out of 10 pass. Anything less is unacceptable.

**40:31** · Um and then I will run. Let me do that while it's running.

**40:40** · B6.3 verify that a clean clang and grind com happens.

**41:04** · A little note to myself.

**41:07** · We'll take a look to see if uh any of the for for all utilities in let's um go ahead and guarantee me a

**41:28** · uh verbose and versatile make file to make any and All tools inv6.x verify.

**41:44** · Yep.

**41:48** · Yep. And we'll go ahead and make for the tests.

**41:56** · Let's see.

**42:00** · No, that's it.

**42:02** · I'm going to pause. It's going to run for a while.

**42:10** · Sorry, I went to make some dinner. So, let's see it. Let's take a look at the results.

**42:19** · So, I'm looking at these uh if sucked.

**42:23** · Okay, so implemented request cleanup.

**42:25** · Let's see. Did it fix scanned manual verifications? And let's see.

**42:48** · Uh, one thing I was trying to create something containing kind of statements.

**43:02** · Okay. Sure.

**43:04** · I will add it in.

**43:17** · Ah, it doesn't know.

**43:24** · Dated.

**43:50** · fully removed. Great.

**43:57** · Great.

**44:10** · dots additions.

**44:13** · We will go ahead and do V Okay.

**44:41** · All right. Let's see.

**44:48** · So now I usually send the clawed contract to open AAI and vice versa from Open AI.

**45:05** · Thoughts it didn't finish. I thought the contract finished. Nope. All right. Sorry from Claude.

**45:28** · And that's all I do. back and forth all day.

**45:54** · Correct. I want GCC, but I want a Clang check.

**46:08** · I want a GCC, but I want a Clank check.

**46:30** · Okay.

**46:45** · All righty.

**46:54** · I'll let it run. I'll pause the video.

**46:56** · It's going to take a while. Let's take a look.

**47:02** · Just for three.

**47:04** · Let's see. Make clean. We want uh GCC still for our compiler, but we're going to go ahead and run clang as a check to see. And then we'll see if uh Velrind gives us UBS or Oh, look. Zero errors.

**47:25** · Haha. Pass, pass, pass. And so the test should be working. One in the background.

**47:37** · All the tests look clean, I think. Let me see. Fuse build. Leave. Pass. Pass. Fell grind.

**47:49** · Good, good, good. Makes me happy. Let's see what did we do. Um. Oh, make file.

**48:00** · I'll let it run some more. Be back.

**48:03** · Spitting out some more. Let's see.

**48:12** · Make lint. There was an error.

**48:25** · Let me see. While it's going, let me see why. Let's see if Claude knows why.

**48:38** · What is he?

**48:44** · No, that's not what it uh Let me see.

**48:54** · I got an error. Claude.

**49:15** · Let's see. Let's take a peek at the not drastic reduct. No, sorry. I meant Yeah.

**49:34** · Nothing. Nothing. Seriously.

**49:39** · Seriously.

**49:47** · What we got directory? Oh, that's probably why.

**49:58** · Let's take a look at uh um I'm curious.

**50:13** · Let's see.

**50:26** · We'll take a look at the two reports.

**50:39** · Uh, easiest way. We'll go ahead and What's the easiest way to do this? Let me think. Let me think.

**50:50** · Nope. Oh, I know. Let's go ahead and take a peek at Allrighty. So, I'll show you even though it's just much easier to not be in it.

**51:12** · We'll go ahead and Where is it? Where is it? Uh oh, goodness.

**51:26** · Error error error. Let's see what the error.

**51:50** · Yeah. Okay. So, make clean all clean. Let's see.

**52:14** · Okay.

**52:16** · False change made variance blah blah blah says should be clean pass. Okay. So everything looks clean.

**52:27** · Let's see.

**52:38** · I don't know if it cleaned up both bugs.

**52:50** · I think it fixed them, but I'll double check. Let's see.

**53:00** · There's one of the bugs. One line fix.

**53:07** · These were the two bugs. Did you catch them?

**53:25** · Why? Why? Why? Sorry, I put paste.

**54:05** · So Claude here caught two bugs.

**54:10** · Amazing.

**54:16** · There's a bug on offset for short magic number, I assume.

**54:24** · And let's see.

**54:28** · Let's see. Let's see.

**54:34** · Having codeex fix it.

**54:51** · Assuming codec sorry codeex is not done yet.

**55:09** · We will go ahead and where are you?

**55:12** · Slightly lower. What is happening?

**55:22** · Let's see what is happening here.

**55:27** · Let me unknown error. Unknown error. Yeah, because the files open. All right. It's all right. It's all right. Let's see.

**55:43** · Worked. Oh, good. Okay. Yes, I caught those two files. Let's see.

**55:50** · Uh, give me a make lint and tell me the problems.

**56:21** · I might have to go to dinner.

**56:29** · Let me freeze it.

**56:31** · Sorry, I had to put my rack of lamb into the oven.

**56:37** · So, let's see. We have dead reports.

**56:40** · Let's do this.

**56:43** · Here's updated the files.

**56:51** · We'll go ahead and include the reports and then we'll include the error message. Make lit failed.

**57:04** · Is it real or just for the real? And we'll do the same thing for failed.

**57:18** · Unknown error. That's not good. Are you not ingesting files?

**57:25** · You're just not ingesting files.

**57:29** · Uhhuh.

**57:32** · Unknown error.

**57:34** · Unknown error.

**57:39** · File upload pending. You're not going to let me in upload C files.

**57:46** · It's not taking C files. All right.

**57:48** · Well,

**58:27** · I'll go ahead and send it to codeex. Codeex Interesting. Interesting. We're running about an hour for one fix. It's actually not that bad.

**59:11** · So here's the four fixes outlined according to cloud and make lint should pass.

**59:25** · Take a peek. We are at 106k. So, we have some KV cache pressure, but it is what it is. After fixing remint, we'll see if it does.

**59:46** · I'm going to pause again. Actually, before I pause, let me see project tools.

**59:58** · Let's see.

**59:59** · We're still very very good for base.

**1:00:14** · Pause it again. Check out my lamb.

**1:00:18** · So, let's see. Done. I applied those exact fixes and that should make happy.

**1:00:42** · Okay, so everything looks good.

**1:00:48** · Let me go ahead and have a source code scrub real quick.

**1:00:53** · Um, so we are through version six prototype.

**1:01:00** · Both sides are happy and so I'm going to stop it and have a um I'm going to freeze. We'll do that real quick. Uh, let's see.

**1:01:15** · Get finish six.

**1:01:24** · Good.

**1:01:26** · We'll go ahead. We have that committed.

**1:01:28** · I'll have um Claude actually scrub for code.

**1:01:37** · Look at that. Huh.

**1:01:44** · So all done. All done. Tools have passed.

**1:01:49** · Let me go ahead have um go ahead and output propose log of V6 in its in entireity to log S36 I think is how did I name this thing?

**1:02:14** · Is that what I named it? Logs. Logs.

**1:02:17** · logs see tools logs V6. Yep.

**1:02:26** · V6 and we have here B6.

**1:02:41** · Go ahead and create new Claude Slim 64 FS B6.3 completion log and we go ahead and read just for three and done.

**1:03:04** · Okay, I will actually drag and drop verbose.

**1:03:19** · I'll let open AI see claude's conclusions and then I will let Claude Cv6 verbose.

**1:03:29** · Tada. And that is done.

**1:03:35** · And that's it.

**1:03:38** · Wow. 1 hour 3 minutes. That was super boring, huh?