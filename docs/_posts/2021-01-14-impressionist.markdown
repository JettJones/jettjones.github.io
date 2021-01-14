---
layout: post
title:  "Javascript impressionist"
date:   2021-1-14 14:30:00 -0800
categories: dev
---

This rabbit hole was a few steps in the making.  The original drive was from a picture a friend shared - reminding me of a project I worked on as homework awhile ago.

  [CSEP 557 - Impressionist][csep-557]

I tracked down the source.  After some false starts getting an environment setup for C++ and OpenGL, I made a hasty decision - could this whole thing be redone in javascript?


Short answer - yes, and with the features built into canvas, it was a pretty easy map:

   [My Impressionist][image-toy]

## Project overview

The impressionist project makes artistic renderings from a base image.  In most cases this is selecting a brush pattern and direction, and repeatedly sampling colors from the source image.

In javascript this takes the pixels from one canvas as samples and renders them to the other.

### Learnings

 - Mozilla docs were great for getting started with [Canvas Rendering][moz-canvas]
 - Downloading an image from the content of the canvas is not-obvious, but easy enough to string together with a link and `canvas.toDataUrl()`.  Credit to mozilla again for the [pixel manipulation tutorial][moz-save]


[csep-557]: https://courses.cs.washington.edu/courses/csep557/19sp/src/impressionist/impressionist.php
[image-toy]: /assets/imgtest/
[moz-canvas]: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
[moz-save]: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas#saving_images

