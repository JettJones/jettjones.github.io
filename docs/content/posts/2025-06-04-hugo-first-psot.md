---
date: '2025-06-03T07:29:37-07:00'
title: 'Hugo and dependabot'
---

Jekyll emailed me again this week.  Or maybe Github wanted to flex [dependabot](https://github.com/dependabot), how good it is at scanning files.  Those files have numbers in them, and the numbers are too small. Number must go up.  I played the game a few times, but even if I updated last week - sorry, that's no fast enough.  The bot needs me to push that button again.

That weekly cadence is not reasonable for a static site that's been updated 6 times in as many years.

Looking at my options, moving to a dedicated host sounds fun. But after heroku shut down, I'm reluctant.  Another simple-seeming option is static generation.  This would cut loose jekyll and it's escalator of dependencies, hopefully allowing github mail to quiet for more than a few days.

So I picked hugo (static go binary, and escape from npm? sounds great) and got to tinkering.

# Setup

- Tutorials start with brew, but for windows 'choco install' worked better - https://gohugo.io/installation/ had the best details.
- On the `choco` listing, hugo-extended had needed features for using themes (as every tutorial does).

As a side note - the default behavior without themes is to return errors.  That makes some sense (there's no root page to render) but doesn't give good hints for how to move forward.

But adding a first theme in hugo.toml and `hugo server` started rendering. Let there be old pages again!

# Themes
Setting up a theme was a matter of

1. `git add submodule {theme.git} themes/{theme_name}`
2. adding `theme = {theme_name}` in hugo.toml

I was able to install multiple submodules to try them quickly, and later remove them (deleting from `.gitmodules`)

# Reviving pages
The previous posts from jekyll copied over as whole files (easy!).  Then the static content moved from assets/ to static/ and the site was functional again.

I see notes of sitemaps, menus, and categories, but I'll leave that for another trial.

# To hosted 
Finally, it was time to get the local site back up to github.  This involved:

- moving files (jekyll wanted docs/_posts, hugo assumes content/posts)
- adding the github Actions to build and upload.
- (after pushing up these changes) Updating the github settings to use the new action.

That's all covered in this tutorial: https://gohugo.io/host-and-deploy/host-on-github-pages/

Though I removed the Dart + npm config, as I'm not using either.

And that was that - now I'm going to see how long it takes dependabot to reach back out.
