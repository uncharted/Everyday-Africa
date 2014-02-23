Everyday-Africa
===============

All around you are files pertaining to the Everyday Africa
tumblr blog.

The blog's source is built from component pieces. The finals outputs are:
- `build/ea.html` which is deployed by hand pasting via the tumblr interface
- `build/public/ea.css` which must be served via s3 or some other mechanism


Usage
-----

Automated workflow functions are implemented in the `Makefile`, and described
below.

To build all files which had a dependency modified, run `make`.

To build `build/ea.html` run `make build/ea.html`.

To compile the `build/public/ea.css`, run `make build/public/ea.css`.

To push `build/public/tumblr.css`, run `make push`. Note that this requires
`s3cmd` to be installed and properly configured.


Dependencies
------------

- [`npm`](https://www.npmjs.org/) to install `less` and `react-tools`
- [`s3cmd`](http://s3tools.org/s3cmd) to push the css file to s3.