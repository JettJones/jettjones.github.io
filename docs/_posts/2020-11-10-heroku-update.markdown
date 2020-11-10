---
layout: post
title:  "5 year Heroku Update"
date:   2020-11-10 15:27:00 -0800
categories: dev
---

Once there was a wedding.  Since it was my wedding, it needed puzzles.  I was trying out the heroku api at the time, so all these things game together to make:

  [wedding.jettjones.net][wedding]

Which has been great, heroku's free tier only runs my site on the very rare occasions I remember and want to show someone.  Cheap as cold stored bits, which is in this case means free.

But in 2020, heroku shut down the base image for these 5 year old images, and 20 reminder emails later, I have a quick cleanup chore to do.

So what did it actually entail?

1. Re-installing [heroku][heroku-setup] on my machine.

2. `heroku git:clone` to download the old version.

    As an aside, the heroku model is pretty sweet - rather than introducing a new mental model, it provides a git remote.  So a code push is a deploy and can check inline for issues.

3. Run locally - which means [installing nodejs][install-node], and `npm install` to pull dependencies

4. Npm audit gives helpful feedback that several libraries needed updates, and the rendering tool *jade* was now renamed to *Pug*. Coolcoolcool

5. Jade to pug. This was a one-line change for the [express template engine][express-template]

    ``` app.set('view engine' 'pug')```

    then renaming several files from `*.jade` to `*.pug` (the contents didn't change at all).

6. Finally able to test locally, `heroku local` acting as the simulator.

7. Then using heroku push to re-deploy, I ran into two issues.  One was the reason I started, I needed to change the stack to one that was still supported.

    ```heroku stack:set heroku-20 -a {{app-name}}```

8. And this last unexpected issue

```
remote: -----> Installing binaries
remote:        engines.node (package.json):  0.10.x
remote:        engines.npm (package.json):   unspecified (use default)
remote:
remote:        Resolving node version 0.10.x...
remote:        Downloading and installing node 0.10.48...
remote:        Detected package-lock.json: defaulting npm to version 5.x.x
remote:        Bootstrapping npm 5.x.x (replacing 2.15.1)...
remote:        npm 5.x.x installed
remote:
remote: /tmp/build_11319857/.heroku/node/lib/node_modules/npm/bin/npm-cli.js:79
remote:       var notifier = require('update-notifier')({pkg})
```

Long story short, the 5 year old project configured one version of nodejs.  Heroku tried to use it, but combined that with the latest build of npm.  That mismatch meant new libraries loading in the old interpreter, so sadness all around.

The fix: update the node version from 0.10.x to `12.x` and tada! a working website that I might leave be for a few years more. :-)


[wedding]: http://wedding.jettjones.net
[heroku-setup]: https://devcenter.heroku.com/articles/getting-started-with-nodejs#set-up
[express-template]: https://expressjs.com/en/guide/using-template-engines.html
[install-node]: https://nodejs.org/en/download/