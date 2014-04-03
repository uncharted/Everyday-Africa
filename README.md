Everyday-Africa
===============

All around you are files pertaining to the Everyday Africa
tumblr blog.

The blog's source is built from component pieces. The final outputs are:
- `var/ea.html` which is deployed by hand pasting via the tumblr interface
- `var/public/ea.css` which must be served via s3 or some other mechanism

To Tumblr
---------

If `ea.html.template` has changed, run `make PROFILE=tumblr -B` to do
a Tumblr build. Then, paste the contents of `var/ea.html` into
the the Tumblr page's `Edit HTML` menu. Also, to get it to work for
mobile, you'll need to create/edit a Tumblr Page named `/iphone-theme`
to have the `var/ea.html` source.

More common changes, e.g. editing `scripts/ea.js`, only require
for the changed files to be pushed to S3. To do this, after running
`make PROFILE=prod -B`, push the files to S3 with `make push`. This
requires for you to have s3cmd properly configured, and for `S3_PUBLIC`
to be properly set in the `Makefile`

If there's an issue, you can get ahold of me at jtmoulia@pocketknife.io

Usage
-----

Automated workflow functions are implemented in the `Makefile`, and described
below.

To build all files which had a dependency modified, run `make`.

To build `build/ea.html` run `make build/ea.html`.

To compile the `build/public/ea.css`, run `make build/public/ea.css`.

To push `build/public/tumblr.css`, run `make push`. Note that this requires
`s3cmd` to be installed and properly configured for your server.

To run `make build` on changes, run `make fswatch`. This depends on
`fswatch`, and only works on OS X.


Dependencies
------------

- [`npm`](https://www.npmjs.org/) to install `less` and `react-tools`
- [`s3cmd`](http://s3tools.org/s3cmd) to push the css file to s3
- [`fswatch`](https://github.com/alandipert/fswatch) to rebuild on file changes