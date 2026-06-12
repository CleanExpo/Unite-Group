---
title: "Your Font File Is Secretly a Program"
source: "https://www.youtube.com/watch?v=DZCFYyRccoU"
author:
  - "[[LearnThatStack]]"
published: 2026-05-13
created: 2026-05-14
description: "Two letters at `font-size: 16px` in the same browser. Different sizes. Why? Open a .ttf or .woff2 file and the answer gets stranger, fonts aren't just shapes, they're small programs that run on your C"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=DZCFYyRccoU)

Two letters at \`font-size: 16px\` in the same browser. Different sizes. Why? Open a .ttf or .woff2 file and the answer gets stranger, fonts aren't just shapes, they're small programs that run on your CPU.  
  
This is a closer look at what happens between you typing a string and pixels appearing on screen: the five things inside a font file, how shaping turns characters into glyphs, why "office" gets drawn as four shapes instead of six in some fonts, how rasterization and anti-aliasing fight pixel grids, and the bytecode hidden inside well-hinted fonts that runs through TrueType's virtual machine on every render.  
  
Timestamps:  
0:00 Intro  
0:33 Inside the Font File  
3:11 From File to Pixel  
6:41 Variable Fonts  
8:03 The Layout Shift  
8:59 Dont Ship Fonts You Don't Use  
9:51 The Full Picture  
  
More Videos:  
  
Software Egineering Basics - https://www.youtube.com/playlist?list=PLWP-VtjCVpWyLNBm3zz\_sGyC5mVwiAOvj  
Software Design - https://www.youtube.com/playlist?list=PLWP-VtjCVpWx7kPq30XRN6O6LjVQ4VL95  
  
#webdev #frontend #typography #webperformance #css

## Transcript

### Intro

**0:00** · Both of these are font size 16 pixels.

**0:02** · Same browser. Why don't they match?

**0:05** · Or this. Write the word office on a web page. Six characters typed. Four shapes drawn. Why not six?

**0:15** · Or this. The same font scaled from 12 pixels to 2,000. Sharp at every size every time.

**0:24** · All of this comes from a file with a TTF orwa extension. but you probably have never looked inside one. So, let's look.

### Inside the Font File

**0:34** · A font file is basically a database of shapes plus a bunch of metadata explaining how to use them. There are five main parts.

**0:44** · First, the letter forms themselves. They aren't stored as pixel images. They're vector outlines, mathematical descriptions of curves, bezier curves mostly, defined by points and handles.

**0:56** · True type fonts use quadratic bezi. Open type can also use cubic which answers the third puzzle from the intro. Scale a font to any size and it stays sharp because the file doesn't store the letter A. It stores the recipe for the letter A. The browser cooks it fresh every time at whatever size you need.

**1:19** · Okay, so the file has all these shapes.

**1:22** · How does it know which one to draw for which letter you typed? That's what the character map does. The Cap table. It's the lookup that says code point 72 is the letter H. Draw this glyph.

**1:37** · You've probably noticed that sometimes one character in a sentence looks slightly off. Different style, different weight than the letters around it.

**1:45** · What's happening is the Cap doesn't have an entry for that character. usually a less common currency symbol or emoji.

**1:53** · So, the browser grabs it from a different font just for that one glyph.

**1:58** · Same paragraph, different font for one character.

**2:03** · Back to those two hellos from the intro.

**2:05** · Same font size, different visual size.

**2:09** · Why? When you write font size 16 pixels, you're not setting the height of the letters. You're setting the height of the M box, an invisible design grid, the type face lives inside. And different fonts fill that grid in different ways.

**2:27** · Where the baseline sits, how tall the lowercase letters are, how far descenders dip below, all of it's decided inside the font, not by your CSS. Which is why two fonts at the exact same font size can look like completely different sizes. CSS doesn't care. The metrics inside the font do.

**2:50** · One more thing, kerning. Some letter pairs leave awkward gaps when you put them next to each other, so the font ships rules to nudge them closer. Modern text fonts have thousands of these. They run on every line of text you read.

**3:06** · Next one is hinting. We'll save for later. It's the weirdest one. Okay, we know what's in the file. CSS says font family. Enter. Pixels show up on screen.

### From File to Pixel

**3:18** · What happens between those two points?

**3:21** · The browser picks the first font it can find from your stack. That's just a quick lookup. Then it goes through three stages.

**3:29** · Shaping turns the characters you typed into a sequence of shapes to draw. Those aren't the same thing.

**3:36** · Take office from the intro. six characters. But FFI gets drawn as one glyph in some fonts, a single designed shape called a liature. Six characters in, four glyphs out. What you typed and what gets drawn aren't the same list.

**3:55** · And liatures are the easy case. In Arabic, letter shapes change depending on their position in a word. Same character, up to four different glyphs.

**4:05** · Shaping is complicated enough that Chrome, Firefox, and Edge all handed off to a library called Harfbuzz. Safari uses Apple's core text.

**4:15** · Now, we have a list of glyph shapes, vector outlines. That's math. But your screen isn't math, it's pixels.

**4:23** · Rasterization bridges the two. It picks which pixels to turn on and how strongly.

**4:29** · At large sizes, this is easy. Plenty of room. Every stroke gets enough pixels.

**4:34** · But it's small sizes. Body text on an older monitor, things get ugly fast.

**4:41** · A vertical stem can land halfway between two pixel columns. Snap it to one and the letter shifts off center. Split it across both and the letter blurs.

**4:50** · Neither looks right.

**4:52** · This is where hinting comes in. Hinting isn't a config file. It isn't a list of values. It's bite code. Inside well-hinted fonts is a small program that runs on your CPU every time the font gets rasterized at a new size.

**5:11** · True type has its own virtual machine built into the font rendering library of every major operating system. Free type on Linux and Android direct on Windows Cortex on Apple running tiny font programs every time something gets drawn at a new size.

**5:28** · What those programs do is tell the rasterizer at this size snap this stem to a whole pixel or at this size thicken this curve so it doesn't disappear.

**5:38** · Sometimes the type designer hand codes them. Mostly an auto hinter generates them. This is less important on retina and high DPI displays. The pixel grade is fine enough that nudging things around barely shows up. But on a standard monitor, you've been reading the output of these tiny font programs your entire career.

**5:58** · A font file isn't just a database of shapes. It's a small program with shapes attached.

**6:06** · Next stage. Vector curves don't fit cleanly onto a pixel grid. You get this jagged staircase along every diagonal and every arc.

**6:16** · Anti-aliasing fixes it. Paint the edge pixels in shades of gray instead of pure black. Your eye reads the gradient as a smooth curve even though there's still staircase under it.

**6:28** · Same idea in game graphics, image scaling, anywhere a curved shape has to fit on a square grid. And it's the reason why text on your screen looks like text instead of jagged dots.

### Variable Fonts

**6:41** · That's the theory. In practice, for most of font history, every weight of a font was its own file. Want regular, medium, and bold? Three files, three downloads.

**6:54** · Variable fonts below that up. One file, every weight, often width and slant, too.

**7:01** · The font defines an axis, usually weight, and a continuous range along it.

**7:07** · You don't pick one of nine weights anymore. You pick any value on a slider.

**7:12** · And in CSS, Fontway accepts any number from 1 to 1,000, not just hundreds. So when a variable font is loaded, font weight 437 is a real meaningful value.

**7:24** · The browser interpolates that exact weight off the font's continuous axis.

**7:30** · This works because of those vector outlines we discussed earlier. A variable font ships multiple sets of control point positions, one for each end of the axis, and the browser interpolates between them on the fly.

**7:44** · And the same approach gets you width, slant, optical size, and any custom access the designer exposes through font variation settings.

**7:54** · And if you're shipping three or more weights of a font, the variable file is usually smaller than the static ones combined. More flexibility, less to download. Many websites have this problem and don't know it. Page loads, text appears in a fallback font, then half a second later swaps to the brand font, and the layout reflows.

### The Layout Shift

**8:13** · Google calls this cumulative layout shift. It hits your core web vital score which factors into search ranking. So this isn't just a visual annoyance. It costs traffic.

**8:24** · And the reason is metrics. The fallback font and the custom font have different internal proportions. So when the swap happens, every line subtly resizes and the page reflows.

**8:36** · The fix is in CSS, but barely anybody uses it. Three add font face descriptors. Size adjust ascent override descent override. Let you override a fallback font's metrics to match your custom font. Most modern browsers support these. Match the metrics and the swap becomes invisible. Layout doesn't shift. CWV stays green. Last one. Some fonts are huge. A not CJK font with full Chinese, Japanese, and Korean coverage runs into the tens of megabytes.

### Dont Ship Fonts You Don't Use

**9:08** · And if your site is in English, you're shipping all those bytes for nothing.

**9:12** · Every visitor downloads thousands of glyphs they will never see.

**9:16** · Subsetting fixes this. Strip the font down to only the glyphs your page uses.

**9:22** · Google Fonts does this for you automatically. Their CSS ships fonts pre-split by Unicode range. Latin, Latin extended, cerillic, Vietnamese, and so on. And the browser only downloads the subsets it needs. For self-hosted fonts, tools like PIF FT subset let you do the same thing offline.

**9:41** · A typical English subset is one to two orders of magnitude smaller than the full font. This is one of the easiest performance wins on the web. Still, most sites don't bother. So that's what happens every time between you typing a string and seeing it on screen. A type designer's curves encoded into a small program executed by your browser against a pixel grid. So, a few thousand pixels could light up in roughly the right places, and it happens fast enough that we don't notice any of it.

### The Full Picture

**10:12** · Thanks for watching and see you in the next