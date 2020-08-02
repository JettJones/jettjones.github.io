---
layout: post
title:  "First Post!"
date:   2020-08-02 10:33:24 -0700
categories: dev
---

How did we get here?

To put some order to scattered thoughts - write them down.  To
embarass yourself later - publish those steps.

Combine two threads to get here -  for some small projects, getting
them hosted is a first step that usually falls to analysis
paralysis. Github pages look nice and easy, so I'm taking that as a
project on its own.  Next steps should be getting more projects up.

For naval-gazing, and to explore some jekyll features, here are the
notes for getting jekyll up.

Notes on setting up jekyll
---

The [github intro][github intro] takes only a second - make a repo and flip a
switch and suddenly [jettjones.github.io](https://jettjones.github.io)
is live.

At this point I can serve simple html, but I'm looking for an easy way
to add in the future, so next up is exploring the blog setup in
jekyll. Plus one itch to scratch on favicon...

### favicon.ico

![favicon404](/assets/favicon404.png)

Nickle tour, every web page load pulls in this icon to show on the
address bar. Yes, I could make an empty icon file, but I was curious
if there was a tag to tell browsers to skip the download
entirely. Turns out, kind of:

{% highlight html %}
  <link rel="icon" href="data:;base64,=">
{% endhighlight %}

This is an empty body of the icon file, encoded directly in the html
head section. No extra requests, no 404s.

## So blogs

Next goal is having a blog structure for notes.  Github defaults to
jekyll, and while I'm not a big fan of ruby, the alternative is
setting up a local build of pages and checking in the result - so
let's see what the default looks like.

Next choice is getting jekyll running locally - which sounds like less
ultimate trouble than debugging with github rendering pages remotely.

#### Installing...

[Jekyll for windows][jekyll windows] worked for me.

 * The ruby install is ~70Mb, but it attaches the MSYS build system
  for another Gig. Ouch. Well, 10 minutes of downloading later ...

 * Bundler is recommended, but then requires files to already exist?
   don't really understand this suggestion, but `jekyll new` and
   `jekyll serve` seem to work directly.

 ** update - when setting up for both local testing and github
    building, the default jekyll new setup changes - and bundler is
    used afterward to pull the correct set of dependencies. Also, this
    config introduces a mismatch in the i18n library version, and
    afterward only running via bundler is supported. :grimace:

Customizing
---

I'd like to customize the theme a bit, remove that favicon again, and tweak the footer.

this help file from the layout looks promising:
https://jekyllrb.com/docs/themes/#overriding-theme-defaults

found the files in the ruby install...

{% highlight bash %}
  $ bundle info --path minima
  C:/Ruby26-x64/lib/ruby/gems/2.6.0/gems/minima-2.5.1
{% endhighlight %}

Follow those paths, find _includes/head.html - copy that into my
project, and add the link icon ... but no dice, rendered files under
_sites don't use my overrides. 404 errors for now.

Also taking a moment to look at the footer - looks like I can optionally
add or remove all kinds of links to other sites, starting
with just github and rss.


Deploying
---

Next step will be pushing this up to github to see if it publishes
correctly to the site. :fingers_crossed:


Aside: The road not taken
----
This tutorial probably covers all of the same content:
[https://lab.github.com/githubtraining/github-pages](https://lab.github.com/githubtraining/github-pages)

Since github connects to private repos, I don't grant access.  Maybe
if I get stuck I can make a separate tutorial account.


[github intro]: https://docs.github.com/en/github/working-with-github-pages/creating-a-github-pages-site
[jekyll windows]: https://jekyllrb.com/docs/installation/windows/