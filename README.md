Everyday-Africa
===============

All around you are files pertaining to the Everyday Africa
tumblr blog.

The blog's source is built from component pieces. The finals outputs are:
- `tumblr.html` which is hand pasted via the tumblr interface
- `public/tumblr.css` which must be served via s3 or some other mechanism


Usage
-----

Automated workflow functions are implemented in the `Makefile`, and described
below.

To build `tumblr.html` run `make tumblr.html`.

To compile the `public/tumblr.css`, run `make public/tumblr.css`. To
watch for changes, run `make SASS_ARGS="--watch" tumblr.css`.

To push `public/tumblr.css`, run `make push`. Note that this requires
`s3cmd` to be installed properly configured.


Dependencies
------------

- [`sass`](http://sass-lang.com/) to compile the css file.
- [`s3cmd`](http://s3tools.org/s3cmd) to push the css file to s3.