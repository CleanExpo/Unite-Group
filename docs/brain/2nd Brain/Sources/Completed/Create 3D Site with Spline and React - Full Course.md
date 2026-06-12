---
title: "Create 3D Site with Spline and React - Full Course"
source: "https://www.youtube.com/watch?v=EJxeMbDTkVI&list=PLDaHCLWmCcQI8IbWS9x1TfYcZWXYw4Fpc"
author:
  - "[[DesignCode]]"
channel: "DesignCode"
published: 2022-06-22
created: 2026-05-08
description: "Turn your Figma UI to 3D and create a React site with SplineSponsored by Spline - https://spline.designFinal React Site: https://r1ul0z.csb.app/Download Assets: https://www.dropbox.com/s/b0n5yklfg"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=EJxeMbDTkVI)

Turn your Figma UI to 3D and create a React site with Spline  
Sponsored by Spline - https://spline.design  
  
Final React Site: https://r1ul0z.csb.app/  
Download Assets: https://www.dropbox.com/s/b0n5yklfgqegaj1/Spline.zip?dl=0  
  
FOLLOW MY JOURNEY  
  
Twitter: http://twitter.com/mengto  
Instagram: http://instagram.com/mengto  
TikTok: https://www.tiktok.com/@mengto.design  
  
00:00:00 Intro  
00:03:51 Recreate UI to 3D  
00:13:20 Create 3D Blob  
00:19:55 3D Animations and Interactions  
00:28:34 Lighting and Shadows  
00:33:06 3D Site with React  
00:33:32 Export to Web  
00:41:08 Custom Fonts and Flex Layout  
00:47:48 Import Images and Menu  
00:57:22 Responsive Layout  
  
#3d #figma #reactjs

## Transcript

### Intro

**0:00** · I'm going to show you how to turn your UI into a beautiful 3d render that is interactive and animated, so you can move it around.

**0:09** · Then we're going to use that 3d render and implement that on a React site using code sandbox, So you can see that this is adaptive and we can fully customize the code and create our full fledge website using React libraries and Spline.

**0:26** · So starting with a design like this, we're going to take some of these layers that we want to make interactive and export them, then we're going to implement everything in 3d.

**0:37** · Now everything is going to be layered and you can change the angle.

**0:42** · You can set the interactions.

**0:44** · And you can preview in Spline which is really cool.

**0:48** · Then using the Figma file that is provided, we're going to plan how we're going to design the website that use the 3d asset that we create in Spline.

**0:59** · So this course is entirely free thanks to Spline that is sponsoring this video.

**1:04** · And as someone who loves 3d and wallpapers, I've been pretty obsessed with Spline.

**1:09** · I've created wallpapers inspired by the new Ventura macOS and I've created UI presentations because I fell in love with the ease of spline and how easy it is to create beautiful presentations.

**1:22** · That is always a hundred percent rendered with animations and interactions by just using states.

**1:29** · I consider Spline to be pretty much the Figma of 3D tools and it has real-time collaboration.

**1:36** · The UI is super familiar and it has glass layers like this.

**1:41** · Then you can find the same amazing features like in cinema 4d and blender.

**1:46** · So material, 3d sculpting and to top it all we have an amazing library of files that are free to open, inspect and edit such as this one.

**1:57** · That is fully editable and you can play with the animation and interactions.

**2:03** · For designers, this is a gold mine.

**2:05** · We can create these amazing 3d illustrations with very few steps.

**2:10** · And for motion designers and 3d artists, you can really create something impactful for free.

**2:16** · So you don't need any experience with 3d to get started.

**2:20** · I'm going to show you how to import your 2D assets from your UI.

**2:24** · Then we're going to set up using different perspectives and materials, so the lighting, the image, the depth and the glass layer.

**2:33** · Then we'll create these blops from scratch that are fully animated.

**2:38** · Finally, we'll learn how to export your work, so using a public URL, or you can also do so by using code.

**2:47** · So you can use ThreeJS or React and you can edit the code in CodeSandbox.

**2:54** · I hope you excited because this is going to be a course full of materials.

**2:58** · I'm going to explain everything step-by-step.

**3:01** · We're going to build from scratch, so let's get started.

**3:03** · So the first thing we're going to need to do is download the app.

**3:06** · You can use it from the browser which means it's cross-platform on Windows and Mac.

**3:10** · Or you can download the Mac app, which is also friendly for the new Apple chips.

**3:15** · Now you're going to need to create an account and it's entirely free for individuals, which means that just like Figma, you have pretty much no limit in how you create your 3D.

**3:25** · In fact, I still have a free account just to show you that you can follow every step of this course.

**3:32** · Now it is important to download the assets, which includes the Figma file as well as the images if you don't want to do the exporting yourself and if you want to get the final result for the Spline file, then it is part of that.

**3:46** · With spline and the assets downloaded, we're ready to turn our UI into 3D.

### Recreate UI to 3D

**3:52** · So with your design in Figma, what do you want to do is to export everything in PNG.

**3:57** · And what I would suggest is to export to 3 X because you want to keep a really high resolution.

**4:04** · Also for each layer that you want to create in 3d, you want to make sure to hide those layers?

**4:11** · And for those same layers, you want to export them again using PNG at roughly 3 X.

**4:18** · Now from the assets folder, you can see that I have all of those files created for you.

**4:24** · So we can just follow along.

**4:25** · In spline, we want to create a new file.

**4:28** · So we're going to click on the plus sign at the far top left.

**4:32** · The new template that we have starts with a square.

**4:35** · And this is pretty much using the front facing in term of perspective, you can of course move this around.

**4:43** · Like so, and you can also switch to isometric.

**4:47** · Let me put it back to the blue circle and this is front facing and this is very useful because we're using the same units as in Figma.

**4:57** · So I'm going to recreate this layer right here, and it has a width of 1280 and 844.

**5:04** · As you can see, we have the layers lists at the left side and the inspector on the right side.

**5:11** · For the shape we're going to set 1280 and 844.

**5:16** · We can zoom in and out using command minus and plus.

**5:19** · Now let's talk about the material in the 3d space, because this is just like the Fill property in Figma.

**5:26** · Except that it's very specific to 3d such as a lighting.

**5:30** · And also if you click next to color, you have all of these other options such as color depth, gradient, noise and so on.

**5:40** · No, I'm going to change this to image.

**5:43** · And here I'm going to click on the square to get more options for the material.

**5:49** · Then I'm going to click on upload.

**5:51** · And here going to the assets folder I'm going to select the main UI, which is daccord.

**5:57** · And that's it.

**5:58** · This is how you create your first UI layer in a 3d space.

**6:03** · As you can see, I can switch between the perspectives.

**6:07** · And I can also use option drag to get the perspective that I want, which is really cool.

**6:15** · Now I can always reset back.

**6:17** · All right so let's take a look at the toolbar at the top.

**6:21** · You can create new shapes.

**6:23** · And here just like in Figma, we have the polygon shape that we're going to use for the avatar.

**6:30** · So let's click on that and we're going to draw that using the shift key.

**6:36** · To create the perfect aspect ratio.

**6:39** · And here going to the shape properties.

**6:43** · I can change as many sides that I want.

**6:47** · So I'm going to use six for the hexagon.

**6:51** · Likewise, I can change the corner radius to 10.

**6:55** · So now I have the rounded corners.

**6:58** · Then I'm going to turn my color into an image.

**7:01** · And just like before I'm going to upload avatar.

**7:06** · And that's it.

**7:06** · Now we have two layers.

**7:09** · So let's use option drag again, to take a look at the different axis because it's very important in a 3d environment that you understand that we have a new axis called z, we have the traditional X and Y so up and down.

**7:26** · But we also have the ability to move in the Z axis.

**7:30** · And this is important if you want to create a beautiful 3d perspective and animate your layers accordingly.

**7:38** · On top of that.

**7:39** · We also want to add volume.

**7:42** · Now to do that, we're going to go to extrusion and we're going to change that to 10.

**7:48** · Now you can see, we have some volume.

**7:51** · Let me zoom in a little bit.

**7:53** · You can see that we have a repeat of the same image on all sides.

**7:58** · This is where we're going to learn about depth.

**8:01** · Now I'm going to add a new material and this time I'm going to change to depth.

**8:06** · Let's take a look at the depth properties.

**8:09** · So as you can see, it's pretty much like a gradient, except that we have a little bit more options in term of the position origin near and far.

**8:19** · So, what I'm going to do is first to change the first color.

**8:23** · And I'm going to select a neutral blue color.

**8:25** · As a result, you can see that we have the gradient from the blue to black.

**8:30** · Then let's go to type and I'm going to use linear.

**8:34** · You can change your gradient from the 3d space like so.

**8:37** · But if you want to change the direction, we're going to use the Z instead.

**8:41** · So we're going to set Z to one and X to zero.

**8:46** · So now we have the gradient from the other direction.

**8:49** · Now, what we want to do is to set the black.

**8:53** · At the very top of the layer and then the gradient from the bottom of the Z index of the layer.

**9:01** · Also for the black color that we have here.

**9:05** · We're going to set the opacity to zero.

**9:08** · Now let's go to the near value and I'm going to set that to 9.9.

**9:15** · Then for the far value, I'm going to set that to 10.

**9:19** · So thanks to this I have my full color on the sides and my transparent color at the very top of the avatar.

**9:29** · So that's depth and it's really powerful for setting the gradient in a 3d environment.

**9:35** · Now we're just going to fix the avatar size by setting it to X 108and Y 117.

**9:44** · Perfect.

**9:45** · So now we have our avatar and it has the volume, which is the extrusion.

**9:51** · Now I'm going to reset the position.

**9:53** · It's always useful to change the angle to see how everything is positioned.

**9:59** · Especially the front facing.

**10:01** · We can see that this is not positioned perfectly.

**10:05** · And we want to center this.

**10:07** · Another thing that is really useful is the ability to copy the material.

**10:12** · So right click on it and copy material.

**10:15** · Then I'm going to create a rectangle this time.

**10:18** · So for the banner press R and create the rectangle.

**10:23** · Let me set to 667 and 180.

**10:28** · Then I'll right click on it and paste the material.

**10:32** · As a result, we have the same materials such as depth, lighting and image.

**10:38** · It is important to understand that it's just for the materials.

**10:42** · It did not apply the shape properties.

**10:45** · So we're going to need to set the extrusion to 10.

**10:48** · And the corner radius, respecting the design to about 20.

**10:52** · And of course we need to change the image so let's click on upload then select the banner.

**10:58** · I'm also going to change the Z index to 10.

**11:01** · Now for the rest of the layers, they're pretty much all rectangles as well.

**11:06** · So I'm going to use this as a base template and duplicate this multiple times.

**11:10** · So let's command D on it and then move using the top arrow.

**11:16** · Then change the size.

**11:17** · When I duplicate a layer, it keeps all of the same properties, as well as the materials.

**11:24** · So I don't need to repeat the same steps.

**11:26** · So from here, we're going to use exactly the same dimensions that we have in Figma.

**11:31** · Now featured cards.

**11:33** · 320 and 208.

**11:35** · Change the image to featured card one.

**11:37** · Then we're going to move this to align all of those cards by respecting the design.

**11:42** · And again, We're going to duplicate it.

**11:45** · And I'm going to do that for the rest of the layers.

**11:59** · There you go.

**12:00** · Now I can also select multiple layers such as the new members and change the properties at once.

**12:07** · So for these cards, we're going to set the corner radius to five.

**12:10** · Another thing that is important to do is to rename the layers properly so that it's more organized and easier to find.

**12:17** · You can also reorder the layers.

**12:20** · So the avatar is going to be at the top and then banner featured card Poplar cards and new member.

**12:29** · There we go.

**12:29** · It's pretty clean and if you turn this around, you can see that the layers that we have created so far use the extrusion.

**12:38** · So it's fully 3d.

**12:40** · And it has a really nice perspective and it looks just great.

**12:44** · So to make things even more interesting, I can move to Z index for some of these layers, such as the second cards and the new member cards.

**12:58** · Like this.

**12:59** · And I think that's pretty cool.

**13:01** · You can switch to the isometric.

**13:04** · And you can move around.

**13:06** · And that's it.

**13:07** · That's how you recreate your 2d design into a full 3d layout, which is really cool for presentation, for animation.

**13:16** · And of course, we're going to learn about interactions and the glass layer.

### Create 3D Blob

**13:20** · Now we're going to learn how to create a blob in the back of the UI.

**13:25** · So we're going to move our 3d layers to the front here and right in the back, we going to create a sphere.

**13:32** · So selecting that I'm going to use the shift key and then drag that to create a perfect sphere.

**13:41** · It's important to remember that in Spline you have multiple 3D shapes and 2D shapes.

**13:47** · We have covered some of the 2D shapes.

**13:49** · And now we have the 3d shapes, including the plane, the cube cylinder, the sphere, et cetera.

**13:56** · For this sphere we're going to set a size of 1000 by 1000.

**14:01** · And also 1000 for the Z axis.

**14:04** · Also, we're going to name this blob 1.

**14:08** · Now, this is where the magic happens.

**14:10** · From your sphere you can create really interesting effects.

**14:14** · So, for example, I'm going to create a new material.

**14:18** · And this time I'm going to use Displace.

**14:22** · For now it's kind of boring.

**14:23** · But let's see when you start playing with the numbers by dragging it around.

**14:30** · it's starting to look pretty cool.

**14:31** · Also, we can open the properties and change the different types for that from simplex to Ashima.

**14:40** · But I'm going to use simplex.

**14:42** · Also for the scale, I'm going to turn it down a little bit.

**14:46** · And at some point you're going to see something that looks like a blob.

**14:50** · Let me set it precisely to 1.7.

**14:54** · The movement is just a variation of your blob.

**14:59** · So that's kind of useful, especially for animation, without changing the integrity of your blob.

**15:06** · I'm going to set it to 1.32 so that we have exactly the same thing and also for displace let's set it to 295.

**15:15** · And there you go.

**15:16** · At this point, it's important to notice that your shape is a little bit sharp in term of the sides.

**15:24** · And that's when you see the polygons especially when you go to show the wireframes.

**15:30** · You can see all of these lines that shows how it's drawn and the more that we have these polygons the more that it's going to be curved but also at the cost of performance.

**15:44** · So one thing we can do in 3d is to increase the subdivision surface.

**15:50** · And to do that, we're going to click on smooth and edit.

**15:53** · And here we're going to increase that to let's say three or four.

**15:59** · Again, this depends on how far you want to think about the performance.

**16:04** · But you can see here, the Y frame is really cool in itself.

**16:08** · But now we're going to turn it off and going back to the outline of the blob.

**16:12** · You can see that it's a lot smoother.

**16:15** · Okay, now let's deal with the gradient.

**16:17** · And as we've learned before, we're going to use depth.

**16:20** · And instead of color, which is a flat color, I'm going to switch that to depth.

**16:25** · Let's open the depth options.

**16:27** · And for the gradient, the first color is going to be roughly blue.

**16:32** · I have, of course the exact color that you can use from the text content.

**16:37** · Then I'm going to add a second color which is 80 52 F F.

**16:43** · Then the third color which is E 0 4 4 D E.

**16:48** · Now at this point, I just need to move the far and near values for the gradient.

**16:54** · And if I want to be precise, I'm going to set it to near 360.

**16:59** · And to far 6 80.

**17:02** · And there you go.

**17:03** · But that's not all because you can see that this is a 3d shape and it's receiving lighting, which has this kind of plastic-y effect.

**17:13** · Now we can go to lighting and we can actually set it to none.

**17:17** · Which gives a more 2d gradient that is more pure and beautiful unaffected by the lighting of the 3d environment.

**17:27** · And so that's fantastic.

**17:30** · So zooming out a little bit.

**17:32** · And going back to the front.

**17:35** · You can see that we have the UI and in the back we have the beautiful blob.

**17:41** · Now, keep in mind that the lighting, when you set it to none, it's not going to receive any shadow or light.

**17:48** · And also you can change to Lambert, Phong and physical, which are very similar, but you also have the toon version, which is kind of like a cartoonish style.

**17:58** · I'm just going to set it back to none.

**18:01** · And now I want to show you this amazing feature in Spline to create a glass effect.

**18:08** · So I'm going to select the main UI then add a new material, but this time is going to be glass.

**18:17** · When you do that you can see that it's kind of taking over the image.

**18:21** · So what you need to do is to move the priority of the material.

**18:25** · So I'm going to move the image above the glass.

**18:29** · And there you go, we have the beautiful glass effect and I can also change the blur to let's say 25.

**18:37** · And play with a thickness or refraction, which is kind of like a glass.

**18:41** · If you think about it is the reflection when you have an object that is near.

**18:46** · And there we go.

**18:47** · We have a beautiful 3d with a blob in the background.

**18:51** · Now we're going to create a second blob.

**18:53** · So this time, I'm just going to duplicate this blob.

**18:57** · So command D.

**18:58** · And move it at the very back so that it doesn't touch each other.

**19:03** · Then I'm going to change the settings.

**19:05** · So for example, The displaced value 6 90.

**19:10** · Open the properties and the scale is going to be 1 movement 10.48.

**19:16** · Then I'm going to go to the depth to change the gradient.

**19:20** · Now for the middle color, let's delete it.

**19:23** · For the first color let's change 2 0 0 5 1 F F.

**19:28** · And then the second color 2A009E.

**19:33** · Let's also change the near to 2 66.

**19:37** · And far to 10 67.

**19:40** · Perfect.

**19:40** · Now I'm just going to reset.

**19:42** · And we have two different blobs.

**19:46** · So that's how simple it is to create beautiful 3d blobs that you can change the properties to create something very unique.

### 3D Animations and Interactions

**19:55** · In this part, we're going to learn how to animate the 3d UI that we have and the blobs in the background.

**20:01** · Also, we're going to take care of the lighting and the shadows.

**20:04** · So the first thing you need to know about animation and I really fell in love with it on Spline is that we're using states.

**20:13** · So instead of a timeline animation that you see in a lot of an animation tools, all you need to do is to select the layer such as the avatar so let me zoom in a little bit.

**20:24** · And then I'm going to go to the inspector and I'm going to create a new state.

**20:28** · So let's click on the plus sign here.

**20:31** · Then as a result, we have two states, the base state and the state.

**20:36** · So think of the base that as the beginning then the end.

**20:40** · Now for the base state.

**20:42** · I'm going to set my Z index to the normal 10.

**20:46** · Then for the new state.

**20:48** · I'll change it to 80.

**20:50** · Once I have my two states I'm ready to animate and that's just how easy it is.

**20:56** · So I'm going to create an event.

**20:59** · And here we have multiple types of events depending on the interaction, such as the mouse interactions, the scroll, the keyboard, as well as look at, follow.

**21:09** · Now we'll use the start and what is important to notice is to set the end state.

**21:15** · In this case, it already sets to state.

**21:18** · Then you have multiple animation properties, but already without changing anything I can just go to the play.

**21:25** · And then voila, it starts the animation on initial load.

**21:30** · I mean, that's just how incredible it is to just set up animations.

**21:35** · And we're going to do the same for the outer layers.

**21:37** · Now I'm going to get out of the preview then change the duration to five seconds.

**21:43** · And what I want to do is when I mouse over it's going to go back to the initial position, but also it's going to be highlighted.

**21:50** · Now we're going to create a new state by clicking on the plus sign.

**21:54** · And it's going to create the state 2.

**21:57** · So whenever you create a new state, it's going to take the same value as the base state by default.

**22:03** · So that Z index to 10 is fine.

**22:06** · Now going to the material.

**22:08** · I want to add a color.

**22:09** · And this color is going to have a value of five F F 3 F A.

**22:15** · Then I'm going to set the opacity to 50%.

**22:19** · Notice that the color is applying on all sides.

**22:22** · I can always move it below depth so that the depth takes priority.

**22:28** · Perfect.

**22:29** · Let's scroll back to the top and look at our states.

**22:33** · So the base state, and then we're going to set the mouse over interaction.

**22:37** · To do that.

**22:38** · I'm going to create a new event.

**22:39** · So plus and here I'm going to change this to mouse hover.

**22:45** · Then set the state to State 2 and for the transition, you can see that I have multiple options, including linear ease in, ease in out, cubic and spring.

**22:56** · Let's select spring and what is cool about spring is that it's going to bounce back.

**23:01** · So you can play with a mass stiffness, damping, velocity, and delay.

**23:06** · The default values are already pretty good.

**23:08** · Let's just play it and now we have this and keep in mind that we can always drag during to preview because that's the default settings.

**23:18** · So now when I mouse over, we have this beautiful spring animation including the color material that shows the highlighted state.

**23:27** · All right, we're going to close a preview and we're going to apply the animations on the rest of the layers.

**23:34** · I'm going to compose the start animation and use delay.

**23:38** · So for the avatar, I'm going to set it to 0.6.

**23:43** · Then the new member.

**23:44** · Create a new state set it to 20.

**23:48** · New member 2 always start with 10.

**23:52** · Create new state.

**23:54** · 60.

**23:55** · New member three.

**23:57** · Start with 10.

**23:58** · State set to 100.

**24:01** · And the next.

**24:03** · Start with 10.

**24:04** · State 1 40.

**24:06** · Banner.

**24:07** · Create a new state.

**24:09** · Set to 30.

**24:11** · Featured card one.

**24:13** · 30.

**24:14** · Featured car 2 10 first.

**24:17** · State 90.

**24:19** · Popular card one.

**24:21** · 10 first.

**24:22** · 30.

**24:23** · And in popular car too.

**24:25** · 10 first.

**24:26** · And then 90.

**24:27** · Let's set the start animation.

**24:29** · Create event.

**24:31** · Change to five seconds and the state.

**24:33** · Second card.

**24:35** · Create event change five second.

**24:40** · Awesome.

**24:41** · Let's preview this and now we have a beautiful start animation.

**24:46** · That takes about five seconds and you can always click on the reset button.

**24:51** · To restart the animation.

**24:53** · And see how it looks like at different angle.

**24:56** · Now we're just missing the mouse over interaction for all of these.

**25:00** · So let's do them one by one.

**25:03** · We're going to pretty much repeat the same steps.

**25:06** · Let's create another state and I'm going to start with the material.

**25:15** · Awesome.

**25:16** · Now, keep in mind that this is very repetitive.

**25:18** · It depends on the complexity of your layout and honestly, I think with a lot of repetition, it lets you learn a tool and get familiar with it and not be scared by the overwhelming features.

**25:30** · So let's finish with the event on those layers which is mouse over.

**25:38** · And there you go.

**25:39** · This is going to be a test of how precise you are.

**25:43** · So we're going to play this.

**25:45** · And hopefully you repeat all of those steps without making mistakes.

**25:49** · If you are, it's totally fine.

**25:51** · You can always go back and fix.

**25:52** · So for example, I noticed that we have a problem here.

**25:55** · And that's because I forgot to create the third state.

**25:59** · And there you go.

**25:59** · It's pretty much fixed.

**26:01** · Give it a test.

**26:03** · I think it's really cool.

**26:04** · So you can definitely change the timing of the animation and the interactions.

**26:08** · And also you can change the viewing states.

**26:11** · So for example, I like to see the second state.

**26:14** · Now, keep in mind that in the future, it's very possible that spline is going to make this flow a lot easier, but for now we have to repeat a lot of these steps.

**26:23** · Because some of these properties can be changed when selecting multiple items, but some of them such as the events and the states cannot be changed on multiple items.

**26:37** · Another thing I want to do is to be able to change the angle of everything, including the UI and the sub layer.

**26:45** · So it's going to make the animation even more interesting.

**26:48** · And to do that, I need to group the layers.

**26:51** · So I'm going to select the main layer and everything else, except the blobs and the light.

**26:57** · So just like in a design tool, command G to group.

**27:02** · Then I'm going to name this UI.

**27:04** · Now that group can also have its own states and events.

**27:09** · So for the base state, I'm going to set the rotation to minus 40 and then Y 40 then Z 40.

**27:18** · And there you go.

**27:19** · This is going to be my default state.

**27:21** · I might need to move my blob a little bit.

**27:24** · So let's move like this and go back to the front facing.

**27:30** · The goal is to make sure that your UI is not in the way of the blob.

**27:35** · Selecting the group UI, I'm going to create a second state and this time is going to be rotation minus 20, 20, and then 7.

**27:45** · Then create a third state which has a rotation of Minus 10 Y 10 and then two.

**27:52** · Perfect.

**27:53** · We have three states.

**27:54** · Now I'm going to do to start animation from the base to state.

**27:59** · And then when I mouse over is going to go to stage two.

**28:02** · Let's create an event for the start animation duration 10, and it's going to switch to state.

**28:10** · And create another event which is mouse hover and it's going to switch to state 2.

**28:16** · Using 1 second.

**28:18** · So let's give it a try.

**28:20** · Voila!

**28:21** · This is exactly what we wanted to create.

**28:24** · And it has this beautiful rotation plus the interactive elements and the card start animations which is really cool.

### Lighting and Shadows

**28:34** · Now we're going to take care of the lighting because it's going to add more depth to the design.

**28:39** · First of all, as we mentioned before, in order to get lighting, you need to change the lighting setting so inside the UI group, we're going to go to the main daccord layer.

**28:51** · And where it says lighting, I'm going to change that to Lambert.

**28:55** · Now it's not visible yet.

**28:57** · And that's because I need to put the lighting above the glass.

**29:01** · And that's really important.

**29:03** · So the shadows that you see here is effected by the directional light.

**29:09** · So now I can just move the yellow circle and see how it's affecting the shadow, which is really cool.

**29:18** · Another thing that we should do is deselect everything.

**29:21** · Then we can change the shadow settings.

**29:23** · Because if you don't do that, sometimes the shadows will be pixilated like this.

**29:29** · So I'm going to switch to soft shadows Then selecting back the directional light I have a little bit more options, especially for blur.

**29:39** · So like this, it looks a lot better.

**29:42** · Let me set the blur to five.

**29:45** · Now the size, if you set it too small is simply going to make your shadow visible or not.

**29:52** · And also it can affect the spread of the shadow.

**29:55** · So I'm going to change this to 1500.

**29:59** · Then for a penumbra, I'm going to set it to five.

**30:02** · Also for the light, you can set the color of the light.

**30:06** · For now I'm going to set it to white.

**30:09** · You can set the intensity.

**30:11** · I'm just going to keep it to 0.7.

**30:13** · And there you go.

**30:15** · One thing to note is that if you want the shadow to affect each of those layers.

**30:20** · So for example, you can see that these cards.

**30:21** · I don't really have shadows on themselves, we're going to need to go to each of them and change the material.

**30:30** · For the lighting to Lambert as well.

**30:33** · So I'm going to go to each one and change that and voila.

**30:38** · Another detail that you might notice on the shadows is that you see some of these noise and that's the quality of the shadow.

**30:46** · If you want to set it to high which might affect the performance you can set it too high but otherwise I'm going to keep it to low.

**30:56** · So going back to directional light.

**30:58** · You can also affect some of these values, such as the strength and positioning of the shadow.

**31:05** · And how close the shadow can be.

**31:08** · Before we go, we're going to take care of the blob animation.

**31:11** · And I think this is really cool as well.

**31:14** · Let me select the first blob.

**31:16** · Then create a state.

**31:18** · Now two values that are really good to play with for the animation is the displace value.

**31:23** · I'm going to set it to minus 360.

**31:26** · And the movement value set to 8.4.

**31:30** · Then I'll create an event for the start animation.

**31:33** · Set to a duration of 20 seconds.

**31:36** · And this time I want to repeat the animation.

**31:39** · So click yes.

**31:41** · And also cycle it.

**31:43** · If you don't cycle it, it's just going to reset the position at the end of the 20 seconds.

**31:48** · But it's going to keep looping.

**31:50** · So let's play this.

**31:52** · And now we have the beautiful blob animation that is going to keep looping.

**31:57** · I'm just going to do the same thing for the second blob.

**32:00** · Let's create a state displace minus 500.

**32:05** · Movement to 25.

**32:08** · Then I'll create the event.

**32:10** · Set to 20 seconds.

**32:13** · And cycle as well as repeat.

**32:16** · And that's it.

**32:17** · So let's zoom out a little bit and I'm going to play this.

**32:20** · And now we have the beautiful UI, fully animated, fully interactive.

**32:25** · We made the blob animation.

**32:27** · Now sometimes when you make these changes, it can affect the positioning.

**32:32** · So we're going to fix that as a last step.

**32:34** · Let me go to each layer and go to stage two.

**32:39** · And change the Z position to minus 65.

**32:48** · When all my layers are fixed for the state 2.

**32:51** · I'm just going to switch back to state.

**32:55** · Awesome.

**32:56** · So this is the result of all that we've done and the interactions work perfectly.

**33:01** · We have the lighting, the shadows as well as the blob animation.

### 3D Site with React

**33:06** · In this part, I'm going to show you how to create the React site, using the 3d asset that we have created and how to implement that with code sandbox.

**33:16** · So this React side is actually responsive and works for mobile.

**33:21** · We're going to take out the different export options.

**33:24** · Even if you're not into the coding, I think it's important to understand how the export works and how it can be shipped to an engineer.

### Export to Web

**33:33** · So the first thing that is very important to know is that you can explore anything that you create into a URL.

**33:40** · So clicking on an export, you have the public URL.

**33:44** · You can copy this.

**33:46** · And put it on the browser.

**33:48** · So here it's fully interactive with the drag and the same interactions that you created.

**33:54** · You can also pan it.

**33:56** · And it works pretty much on any device because it's on the browser.

**34:00** · Going back to spline I want to explain what's going on.

**34:04** · First of all, all of these options can be experienced from the preview here.

**34:09** · So if you play with these options, you don't need to go back and forth between the browser and Spline.

**34:15** · So the orbit is what allows you to drag around like this.

**34:21** · And I think this is really important to keep that on.

**34:25** · But the pan is where you move things around.

**34:28** · And this is not very useful for a website implementation.

**34:33** · So I'm going to turn that off.

**34:35** · And when I changed the option, you can see that it resets the preview.

**34:39** · For zoom, you can use the command scroll you can definitely turn this off.

**34:44** · And then the page scroll as well, which is if you scroll down, it's kind of like pan but especially when you have a full screen HTML site, then it's going to scroll the 3D asset.

**34:55** · So I'm going to turn this off.

**34:57** · Now one feature that is really cool in spline is the ability to have the orbit using on hover.

**35:05** · And I'm sure you've seen this a lot where you have a 3d illustration and by just moving the mouse, it's creating this beautiful parallax 3d effect.

**35:15** · This is really fun for showcasing a 3d model, let's say, on a website.

**35:20** · And you can also play with the pan which is going to move the object as you move the mouse.

**35:26** · You can play with the sensitivity, but in this case, I'm going to turn it off.

**35:31** · One thing I'm going to use though, is the ability to limit the orbit, because right now, when I orbit it just keeps like this, and this is not optimal for a website.

**35:44** · So I'm going to scroll down a little bit and I'm going to set the limit to five on all direction.

**35:53** · So when you orbit and release, it's going to go back with a little offset of five degrees.

**36:00** · And whenever you're done with these changes, remember to update it.

**36:04** · Otherwise it's not going to show the changes to the website.

**36:09** · Now closing the preview it's very important to keep in mind that the zoom that you have here in your canvas is going to directly affect how it's going to be shown in the public URL.

**36:22** · So if I set it to 60% and then I update this or run the preview.

**36:28** · Then my asset is going to use that zoom level.

**36:32** · So, as you can see, when I update everything, it reflects in the public URL.

**36:38** · Now for the next part, I want to show you how it's going to affect on a website.

**36:44** · So, if you're not into coding, you can definitely skip this part or watch this fast.

**36:49** · But I think that a lot of designers will want to know how it can be implemented on a website or on pretty much any device as well.

**36:59** · So clicking on the export.

**37:00** · I can also change to the different options, including to export to a JPEG at any resolution that I want, because all of this is in 3D.

**37:11** · I can decide to show or hide the background.

**37:14** · And especially for P N G, this is useful.

**37:17** · I can also export the splined file itself.

**37:20** · Or record a video of my animation.

**37:24** · But finally, let's take a look at the code.

**37:28** · So here we have multiple options, including how to use.

**37:32** · With three JS which is a library for 3d assets.

**37:37** · React three fiber or we can use React, and spline has their own library for React, which is really cool.

**37:46** · And then what I want to do here is to edit in code sandbox.

**37:51** · Now, looking at the code.

**37:53** · You can see that we have the typical React site.

**37:57** · So the app filed index as well as the style dot CSS.

**38:02** · Also, you can see that I'm importing the spline library.

**38:06** · And I'm setting the spline object on the website.

**38:10** · Thanks to code sandbox.

**38:12** · When you create a project.

**38:14** · It gives you a URL that you can share with other people.

**38:18** · Now, if you want to save the project, you're going to need to sign in.

**38:22** · So once signed in on code sandbox.

**38:25** · Once you saved it, it's going to go to your code sandbox profile and it says forked and you can just open that from any device.

**38:35** · So any change that you make is going to impact the project and it's in the cloud.

**38:41** · So from code sandbox, you can use this URL and paste it in your browser, it's going to show the full website.

**38:49** · What is important to note is that by default is going to take a full width and full height of the browser but when it comes to implementation, you don't necessarily want to do that.

**39:01** · And you want to have a fixed size for an asset.

**39:05** · And in order to change that you have this option called edit frame.

**39:09** · Here.

**39:10** · I want to change the background color.

**39:12** · To a custom one.

**39:14** · So O E 1129.

**39:18** · And also for the size, I want to set a custom size and it's going to be 1200 by 1000.

**39:26** · If I zoom out a little bit, I can see that this is the size of my asset when I'm going to implement that on the website.

**39:35** · And as I mentioned before, when you are in your canvas, anytime that you change the position.

**39:42** · This positioning and the frame as well as the background color is going to be used in your public URL or in code sandbox for the object.

**39:53** · So you're going to need to update that.

**39:55** · Now, if you refresh this, you can see that my asset is now using a fixed size that is 1200 by 1000.

**40:05** · And going back to code sandbox, we can definitely refresh everything and we're going to start the coding.

**40:12** · Now from here, we're going to implement the website.

**40:14** · We're going to have the menu, the title, the texts, the buttons, and then we're going to place the 3d render in a specific position using a fixed size.

**40:23** · And it's going to keep animating and still have its own interactions.

**40:28** · So this part is not that complicated.

**40:29** · We're going to be using pretty much all CSS and to make things easier, we're going to use something called style components so that it plays well with React.

**40:39** · Also we can have the nest at CSS so the same features as Sass and pass values in React.

**40:45** · It's really powerful and it's easy to learn.

**40:48** · So to install style components, we're going to go to dependencies and we're going to search for style components.

**40:55** · Click on it.

**40:57** · And it's going to add the library.

**40:59** · Code sandbox is amazing for having a quick setup that otherwise would take so many steps just to get your environment for the website.

### Custom Fonts and Flex Layout

**41:08** · Another thing that we want to do is to have the custom fonts.

**41:12** · It's called spline and that's quite fitting.

**41:16** · So we're going to use this Spline Sans Mono for the title and Spline Sans for the body text.

**41:22** · So you're going to go to each of these fonts.

**41:25** · If you want to use them.

**41:27** · I don't really suggest using all of the weights so I'm just going to use the bold 700 and then go to Spline Sans I'm going to use regular 400 as well as Semibold 600.

**41:41** · Once you have added these, you're going to find them here for a review.

**41:45** · And what you need to do is to only get the URL for the link that you can copy.

**41:53** · And then go back to code sandbox.

**41:56** · Click on external resources.

**41:59** · Typically, you can just select one of the Google fonts and if it's in the list, that's great.

**42:04** · But in this case I cannot find the spline font.

**42:07** · So I'm going to paste that URL into external URL and then add resource.

**42:13** · If I click on it, I can see what it is.

**42:16** · So in this case, it's just importing a bunch of fonts.

**42:21** · And that's it for the setup.

**42:23** · So now I can just go to style dot CSS to change the background because I have a custom background and otherwise it's white.

**42:31** · So for the site page, I'm going to add a background with a color value of 0 E 1129.

**42:40** · So if I save this, I'm going to have my background.

**42:42** · Now there's a really good future in most browsers, including code sandbox that allows you to toggle the responsive layout.

**42:51** · And here you can select between mobile, tablet.

**42:54** · We're going to select desktop and you can of course change the size depending on how much space that you have on your device.

**43:03** · I'm going to set it like this.

**43:05** · And what's cool is that it scales based on the available space.

**43:10** · So it's useful to see the full picture, including the custom background that I just added.

**43:16** · Now for the website, I'm going to set my container.

**43:20** · So, first of all, I'm going to import styled from styled components.

**43:26** · And save.

**43:27** · So I can use the power of styled components, and I also want to create a container so that I can move my spline object.

**43:37** · Open bracket wrapper.

**43:40** · And then close wrapper.

**43:41** · I'm going to put that closing wrapper after spline and then save it.

**43:47** · Now, wrapper is a component that does not exist, which is why we need to create that.

**43:53** · So const wrapper is equal to styled dot div because it's going to be a div.

**43:59** · The reason why I like styled components is because you can just create all the styles in the same file.

**44:06** · And it can make your structure much cleaner and easier to follow.

**44:10** · So here, I'm going to set in my custom font starting with the body tech.

**44:15** · So I'm going to copy that from Google fonts.

**44:17** · It's font families, Spline Sans.

**44:20** · Then set the default font size to 16 pixel.

**44:24** · Color white because we have a dark background margin, zero auto so that we center.

**44:32** · Then I'm going to target my spline object so that I can move it around in the canvas, which is my wrapper.

**44:39** · So to do that, I need to set a class name called spline.

**44:46** · So using this class name inside my wrapper, I can target it using the power of sass so dot spline curly braces.

**44:55** · I'm going to set this one to position absolute.

**44:57** · And if I do that, then I need to set my wrapper to position relative so that it's against the wrapper.

**45:05** · Then the spline is going to have margin zero.

**45:08** · Then align that from top zero, right zero.

**45:12** · So instead of sticking to the left, now it's sticking to the right.

**45:15** · Next we're going to set the text content to be on top of the spline object.

**45:21** · So right after spline, I'm going to set a new component, called content.

**45:27** · So any time that the component does not exist, I need to create it.

**45:31** · So const content is equal to style dot div.

**45:35** · Then set in my structure, using the h1 tag.

**45:38** · I can also copy the content from Figma.

**45:42** · H one.

**45:43** · And in finish the tag.

**45:45** · For the text.

**45:47** · Copy.

**45:48** · And use a P tag.

**45:50** · And finish that tag.

**45:52** · So this is my text.

**45:53** · Notice that the content is behind the asset.

**45:56** · So we're going to fix that by setting the position to absolute.

**46:01** · Top 30 pixel.

**46:03** · Then I'm going to style the H one tag.

**46:05** · So it's going to use the spline song motto.

**46:08** · And I'm going to copy that code using font weight bold.

**46:14** · Font size 70 pixel.

**46:18** · Oftentimes by default, some of these tags such as the H one have a default margin that is very large.

**46:23** · So I'm going to set it to zero.

**46:25** · And I also want to set the max width two, 500 so that I can fit nicely in a container.

**46:32** · Now let's style the text.

**46:35** · So P curly braces, font weight normal.

**46:40** · Line height for good readability I'm going to set it to 150%.

**46:46** · Max width 3 80.

**46:49** · Then I also want to change the margin for these two elements.

**46:55** · So I'm going to set H one.

**46:57** · Comma P curly braces.

**47:00** · Margin zero 30.

**47:03** · Zero.

**47:03** · 100.

**47:05** · As a result, we have a little bit of spacing from the left so that we have the social icons.

**47:10** · And a little bit from the right.

**47:12** · Now notice that we have the spacing between the elements to be too near.

**47:17** · And we can definitely use the gap spacing from Flexbox.

**47:21** · Instead of using margins so Flexbox is far more flexible, especially when you add new elements.

**47:28** · So the container itself, which is a div, I'm going to set display flex.

**47:33** · Now flex by default is going to go horizontally, just like an H stack, but you can also set it to flex direction to column.

**47:44** · Then I'm going to set the gap to 80 pixel.

**47:47** · Perfect.

### Import Images and Menu

**47:48** · The next thing I want to show you is how to export assets to be used for code sandbox.

**47:54** · So the first thing is you want to be able to export elements into an SVG format.

**48:01** · So here we have four, including the social icons, the button icon, as well as the logo.

**48:08** · It's already prepared for you inside the images folder.

**48:12** · And here, I'm going to show you how to import those images into code sandbox.

**48:18** · So first of all, we're going to go to the files.

**48:21** · And then there's the up arrows that is going to allow you to upload files.

**48:25** · We're going to go to the assets and then go to images, select all four of these and upload.

**48:33** · Now we have these four assets, we're going to create a folder.

**48:38** · This is going to be called images, and I'm going to move this inside the source folder.

**48:44** · Then move the assets inside the images folder.

**48:49** · And there you go.

**48:49** · So now we're going to import those images so that we can use in the website.

**48:55** · First of all, import logo from, and then referencing the folder, starting with dot forward slash images slash logo dot SVG.

**49:08** · So we're going to do the rest, including the icon, Twitter icon, YouTube, and referencing the proper SVG file.

**49:16** · From this, we're going to create the button right after the P tag.

**49:20** · It's going to be a button tag.

**49:22** · Starting with a text download for Mac.

**49:25** · And then close the tag.

**49:27** · Now, before the text, I'm going to set an image src equals curly braces and then reference the icon laptop, which is what we declared earlier and also made sure to have some sort of an alt and then close the tag.

**49:45** · The alt is really important for accessibility.

**49:48** · So I'm going to set it to download.

**49:51** · And voila we have the image it's white on white, we're going to need to style the button itself.

**49:56** · Let's save this.

**49:57** · And when you save, it's going to auto indent the code, which is really neat.

**50:02** · Then I'm going to go to the content and style the button.

**50:06** · So the button has a default style, which we don't like.

**50:09** · So I'm going to set the button after the p tag and I'm going to set background, rgba 0, 0, 0 then 0.2.

**50:17** · You can also copy a lot of the styling code from Figma.

**50:21** · So for example, you go to inspect.

**50:23** · And here you can find the exact colors as well as the border, the backdrop filter, the positioning.

**50:31** · Sometimes I like to do it from scratch.

**50:33** · So let's just follow this border, set it to zero pixel.

**50:38** · And the font size to 16.

**50:41** · The padding 12 then 30.

**50:44** · Border radius to 14.

**50:48** · Then the border of one pixel solid rgba I'm going to use white.

**50:55** · So 2 5 5, 3 times.

**50:58** · And 0.1 in term of opacity let's not forget to color the text to white.

**51:04** · Then set the max width to 2 80.

**51:08** · Then I want to apply the same margin for H 1 so I'm just going to add the button as well.

**51:15** · If I resize a little bit.

**51:17** · I want my button to use a background blur.

**51:21** · To do that.

**51:22** · Are we going to use the backdrop filter using blur of 20 pixel.

**51:28** · And there you go.

**51:29** · I also want to align the text and the icon properly.

**51:33** · A good technique is to use flex.

**51:35** · So display flex.

**51:38** · I'm going to add a gap of 12 pixel.

**51:40** · Then center, everything to the middle by using justify content center.

**51:46** · And align the elements with each other by using align items to center.

**51:51** · And voila.

**51:52** · So for every button I like to have the hover state.

**51:55** · Which is hover curly braces.

**51:59** · I'm going to set the border to one pixel solid again RGBA.

**52:05** · 2 5 5, 3 times, then 0.8.

**52:09** · Now you're going to see that it has a hover effect.

**52:12** · And I want to move it a little bit by using CSS transform using translate y of minus three pixel.

**52:22** · Perfect.

**52:23** · So now it moves a little bit.

**52:25** · In order to get the transition you want to add transition one second.

**52:32** · And there you go.

**52:33** · That's pretty nice.

**52:34** · All right.

**52:35** · So let's deal with the menu right before the title.

**52:39** · Before setting the structure, I'm going to set the menu component.

**52:42** · So const menu is equal to style dot this time is going to be UL for the list and then back ticks.

**52:49** · So I'm going to scroll back to the top.

**52:52** · And then right before the H one, I'm going to set menu and then close menu.

**52:58** · Since this is a list I'm going to use li for each item.

**53:02** · The first one is going to be an image tag src curly braces logo.

**53:09** · The alt is going to be logo.

**53:12** · What was the tag and then close li then I'm going to create a second li using the a tag, which is for the link.

**53:21** · And this is going to be just text and the H ref is going to simply have a forward slash and close the a tag setting the home for the text.

**53:33** · Now I'm going to duplicate this multiple times by using shift option and down arrow.

**53:39** · So that we have five items, plus the logo.

**53:43** · But the second one is going to be download.

**53:45** · Then app, then login.

**53:48** · Then for the last one, instead of an, a tag is going to be a button.

**53:52** · Then close the button and the text is going to be get started.

**53:56** · This is going to automatically use the style that we did for the button.

**54:01** · And we just need to style the menu itself.

**54:04** · So we're going to scroll down to the menu.

**54:07** · And here it's going to use display flex.

**54:11** · The gap 30 pixel.

**54:13** · Then I want to align all the items against each other in the middle.

**54:18** · So align items to center.

**54:21** · Let's add some margin.

**54:22** · So margin zero 30 zero 100.

**54:28** · Padding zero.

**54:30** · Now the li tends to have a default style, as you can see with the bullet points.

**54:35** · So.

**54:36** · Let's set li and list dash style to none.

**54:41** · I'm also going to set the margin to zero.

**54:44** · Then inside the ally set the a tag.

**54:47** · I don't want the underline.

**54:48** · So I'm going to set text decoration to none.

**54:52** · Color white.

**54:55** · Padding eight 20.

**54:58** · Then I want to have a nice hover state for each text link.

**55:03** · So I'm going to set border.

**55:06** · One pixel solid.

**55:07** · RGBA 2 5 5, 3 times.

**55:11** · Do zero because by default is just going to be transparent then set the transition to one second.

**55:19** · And the border radius to 14.

**55:22** · So very similar style to the other buttons and let's add the hover.

**55:28** · So hover, changing the border, one pixel solid RGBA.

**55:34** · 2 5 5, 3 times.

**55:36** · 0.2.

**55:37** · Now we have a nice hover for the text as well.

**55:41** · Next we're going to take care of the social buttons here on the left side.

**55:46** · First creating the component.

**55:48** · So const social is equal to style dot div back ticks.

**55:54** · Then create this structure which I'm going to put after the content.

**55:59** · So open social close social.

**56:03** · For the rainbow line, I'm simply going to use a div and then an image src icon Twitter.

**56:12** · With alt and close that image.

**56:15** · I'm also going to duplicate this and the second one is going to be icon YouTube.

**56:20** · Let's fill the alt texts so Twitter and then YouTube.

**56:26** · Let's go ahead and change the style.

**56:29** · First, I'm going to set this to have a position absolute.

**56:32** · Top 1 50 left 30.

**56:36** · Display flex.

**56:38** · Then I want to spread this the other way.

**56:40** · So flex direction column.

**56:44** · Gap 30.

**56:45** · And align items to center.

**56:50** · Now for the div itself, I'm going to style it.

**56:52** · So that it's simply a line and it's going to have a width of one pixel, a height of 500 pixel.

**57:01** · And for the gradient itself I'm just going to use that from Figma.

**57:06** · So here I can go to inspect.

**57:09** · And I can just get the background value because it's pretty complex to code that from scratch.

**57:17** · So save that.

**57:18** · And now we have this beautiful line with the custom gradient.

### Responsive Layout

**57:22** · All right.

**57:22** · So we're almost there.

**57:23** · We just need to use the media queries to make it responsive.

**57:28** · So one thing I like to do is to be able to change the scale of the 3d asset based on the size of the screen.

**57:36** · So I'm going to scroll back to the top to find the spline.

**57:40** · And here I'm going to set at media.

**57:44** · Parentheses max width 10 24 pixel.

**57:49** · And I'm going to use a transform.

**57:51** · Scale of 0.8.

**57:54** · Also, I'm going to move this a little bit by using translate X to 200 pixel.

**58:01** · So what's going to happen is that when I get to 1024 in term of width, it's going to change the size of my asset, just like this.

**58:12** · So at this point, this is where you need to play around a lot with how it reacts to the size of the screen.

**58:19** · And you can just take my code.

**58:22** · I'm just going to paste that.

**58:24** · So when he reached 800 is going to scale to 0.7.

**58:30** · And then 0.5 and also change the value of the x position as well as how it positions from the right.

**58:39** · So with this, you can see that, it just changed the size as we go.

**58:44** · It's pretty cool.

**58:46** · Now we're going to go through the content and what we'd like to do, especially for smaller devices.

**58:51** · You want to have less gap.

**58:53** · So.

**58:54** · We're going to go to content and set media max width 10 24 and set the gap to 40 instead of 80.

**59:02** · Likewise for the H one tag.

**59:05** · I want to set two different font sizes and you can see that if it's 10 24, it's going to go to 60 and then 40.

**59:12** · And I'm just going to change the padding from the top so now you can see that the font size changes depending on the size of the device.

**59:22** · The same for the margin for the three elements.

**59:26** · So I'm going to scroll down to these three elements.

**59:28** · I'm going to apply to all of them at once changing the margin.

**59:32** · And I also want to hide the social part.

**59:37** · So let's go to social.

**59:39** · And here, I'm going to add a media query where it's just going to hide it, if the screen is too small, like this, so at this point, it's just going to hide it.

**59:51** · And it gives me more space for the content.

**59:54** · Then we're going to take care of the menu so that it aligns with the content.

**59:58** · Let's go to the menu.

**1:00:00** · And change the margin to fix this using media queries.

**1:00:05** · Also, I want to hide these middle options when we have a screen that is too small.

**1:00:11** · So right after the li I'm going to set medial queries.

**1:00:16** · And here I'm just selecting the second li third, fourth, and fifth to hide it.

**1:00:22** · So if I do this, you can see that it's just hiding everything.

**1:00:27** · Sometimes your content is not going to use the full width or full height of the screen.

**1:00:32** · So, especially for position absolute, we're going to go to the content and set the width to 100%.

**1:00:41** · Also, we have a little bit of a scroll issue because of the position and the asset.

**1:00:47** · So we're going to go to the wrapper.

**1:00:50** · And again set that to width 100%.

**1:00:54** · Then height 100%.

**1:00:56** · And use overflow x to Hidden.

**1:01:01** · Like this, we don't have the horizontal scroll issue anymore.

**1:01:05** · So depending on the frame size and the position you can definitely have trouble with where it cuts off.

**1:01:11** · So one thing you can do is to move the transform origin.

**1:01:15** · So transform origin to top.

**1:01:18** · Like this in a smaller resolution, you won't have the problem from here.

**1:01:23** · But of course the challenge is that if you're enabling the orbit then as people drag, they might get into those cutoff areas.

**1:01:33** · But so far, we have a beautiful website.

**1:01:36** · It works across different devices and resolutions.

**1:01:40** · And we managed to use the 3d asset that we created in spline.

**1:01:45** · I think there's a lot of valuable lessons into how we can implement a 3d asset.

**1:01:52** · And how we can make that adaptive.

**1:01:55** · So this is everything we have created together so far.

**1:01:58** · And I think it's really awesome that we manage to learn so much in so little time.

**1:02:04** · And I hope you decide to try Spline.

**1:02:06** · It's awesome.

**1:02:07** · There are so many things to explore.

**1:02:10** · And I definitely recommend that you play with the different settings, the different designs.

**1:02:15** · Implement your own UI.

**1:02:17** · And make it into 3d.

**1:02:19** · Apply that to a website.

**1:02:21** · And I think you're going to have a lot of fun.

**1:02:22** · I would love to see what you create with what you've learned in this course.

**1:02:28** · One thing to note is that some of these animations that are looping can have an effect on performance, especially the shadows and the subdivision surface.

**1:02:37** · So make sure to tweak those things as you encounter different issues with performance.

**1:02:43** · But otherwise, thank you so much for taking this course.

**1:02:46** · I hope you enjoyed everything that you've learned today.

**1:02:49** · And I hope you decide to implement your own designs.

**1:02:52** · So give us a shout out on YouTube and Twitter, and I'll see you in the next course.