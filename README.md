Everyday-Africa
===============

All around you are files pertaining to the Everyday Africa
tumblr blog.

The blog's source is built from component pieces, and output to
`var`. See the `Makefile` for the various build tasks. To deploy in
multiple environments, e.g. local vs Tumblr, you can specify a
`PROFILE` variable. `PROFILE` defaults to `dev` for local builds,
and must be set to `tumblr` for Tumblr builds. See `To Tumblr` below
for more information.

- `/stylesheets`: Stylesheets are written in
[`less`](http://lesscss.org/). `ea.less` is the entrypoint, and should
include import all of the other stylesheets.
- `/scripts`: There are two javascript files:
  - `ea.js`: the heart of the application, this uses
    [`react.js`](http://facebook.github.io/react/) to specify the
    application's behavior.
  - `config.js.template`: application variables and paths are specified
    here. The file is templated by the Makefile, allowing different profiles
    to be used.


To Tumblr
---------

If `ea.html.template` has changed, run `make PROFILE=tumblr -B` to do
a Tumblr build. Then, paste the contents of `var/ea.html` into
the the Tumblr page's `Edit HTML` menu. Also, to get it to work for
mobile, you'll need to create/edit a Tumblr Page named `/iphone-theme`
to have the `var/ea.html` source.

Changes to any of the other static resources, e.g. editing
`scripts/ea.js`, only require the altered files to be pushed to S3. To
do this, run `make push` after running `make PROFILE=prod -B`. Note:
This requires for you to have s3cmd properly configured, and for
`S3_PUBLIC` to be properly set in the `Makefile`

If there's an issue, you can get ahold of me at jtmoulia@pocketknife.io


Usage
-----

Automated workflow functions are implemented in the `Makefile`, and described
below.

To build all files which had a dependency modified, run `make`.

If you'd like to build an individual file (probably not worth it -- the build
is fast), check out the `Makefile`.

To run `make build` on changes, run `make fswatch`. This depends on
`fswatch`, and therefore only works on OS X.


Dependencies
------------

- [`npm`](https://www.npmjs.org/) to install `less` and `react-tools`
- [`s3cmd`](http://s3tools.org/s3cmd) to push the css file to s3
- [`fswatch`](https://github.com/alandipert/fswatch) to rebuild on file changes