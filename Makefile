# Make for tumblr:	make PROFILE=prod
# Make to use locally:	make


# The build profile to use
PROFILE		= dev
PORT		= 8000

# Node paths and tools
NODE_MODULES	= node_modules
LESSC		= $(NODE_MODULES)/less/bin/lessc
JSX		= $(NODE_MODULES)/react-tools/bin/jsx --cache-dir=$(BUILD)/.module-cache

# Project structure
BUILD           	= build
PUBLIC          	= $(BUILD)/public
PUBLIC_SCRIPTS  	= $(PUBLIC)/scripts
PUBLIC_STYLESHEETS	= $(PUBLIC)/stylesheets

# Other commands
S3CMD = s3cmd

# Resource URLs
IMAGES_BASE_URL = /$(PUBLIC)/images
STYLESHEET_URL	= /$(PUBLIC_STYLESHEETS)/ea.css
EA_US_URL	= /$(PUBLIC_SCRIPTS)/ea.js
CONFIG_URL      = /$(PUBLIC_SCRIPTS)/config.js
JQUERY_URL	= http://code.jquery.com/jquery-2.1.0.js
REACT_URL	= http://fb.me/react-with-addons-0.9.0.js
TUMBLRVARS	= -e '/TUMBLRVARS/{r ./local.js' -e 'd;}'


# Production Profile
ifeq ($(PROFILE), prod)
    S3_PUBLIC		= http://s3.amazonaws.com/everydayafrica/public
    IMAGES_BASE_URL	= $(S3_PUBLIC)/images
    STYLESHEET_URL	= $(S3_PUBLIC)/stylesheets/ea.css
    EA_US_URL		= $(S3_PUBLIC)/scripts/ea.js
    JQUERY_URL		= http://code.jquery.com/jquery-2.1.0.min.js
    REACT_URL		= http://fb.me/react-with-addons-0.9.0.min.js
    TUMBLRVARS		= -e '/TUMBLRVARS/{r ./tumblrvars.js' -e 'd;}'
endif

AFRICA_URL		= $(IMAGES_BASE_URL)/africa.png
PHOTOGRAPHER_URL	= $(IMAGES_BASE_URL)/photographer.png
SEARCH_URL		= $(IMAGES_BASE_URL)/search.png
ABOUT_URL		= $(IMAGES_BASE_URL)/about.png
INSTAGRAM_URL		= $(IMAGES_BASE_URL)/instagram.png
TWITTER_URL		= $(IMAGES_BASE_URL)/twitter.png
FACEBOOK_URL		= $(IMAGES_BASE_URL)/facebook.png
TUMBLR_URL		= $(IMAGES_BASE_URL)/tumblr.png

SED_TEMPLATER = sed \
            -e 's|STYLESHEET_URL|$(STYLESHEET_URL)|g' \
            -e 's|EA_JS_URL|$(EA_US_URL)|g' \
            -e 's|CONFIG_URL|$(CONFIG_URL)|g' \
            -e 's|JQUERY_URL|$(JQUERY_URL)|g' \
            -e 's|REACT_URL|$(REACT_URL)|g' \
            -e 's|AFRICA_URL|$(AFRICA_URL)|g' \
            -e 's|PHOTOGRAPHER_URL|$(PHOTOGRAPHER_URL)|g' \
            -e 's|SEARCH_URL|$(SEARCH_URL)|g' \
            -e 's|ABOUT_URL|$(ABOUT_URL)|g' \
            -e 's|INSTAGRAM_URL|$(INSTAGRAM_URL)|g' \
            -e 's|TWITTER_URL|$(TWITTER_URL)|g' \
            -e 's|FACEBOOK_URL|$(FACEBOOK_URL)|g' \
            -e 's|TUMBLR_URL|$(TUMBLR_URL)|g' \
	    $(TUMBLRVARS)


.PHONY: all build push serve open

all: build

build: $(BUILD)/ea.html $(PUBLIC_SCRIPTS)/ea.js $(PUBLIC_SCRIPTS)/config.js $(PUBLIC_STYLESHEETS)/ea.css tumblrvars.js local.js

$(NODE_MODULES): package.json
	npm install

$(JSX): $(NODE_MODULES)
$(LESSC): $(NODE_MODULES)

# Ensure directories
$(PUBLIC):
	mkdir -p $@

$(PUBLIC_SCRIPTS):
	mkdir -p $@

$(PUBLIC_STYLESHEETS):
	mkdir -p $@


# Scripts and Stylesheets
$(PUBLIC_STYLESHEETS)/%.css: stylesheets/%.less $(PUBLIC_STYLESHEETS) $(LESSC)
	$(LESSC) $< > $@

$(PUBLIC_SCRIPTS)/%: scripts/% $(PUBLIC_SCRIPTS) $(JSX)
	$(JSX) $< > $@


scripts/config.js: scripts/config.js.template Makefile
	$(SED_TEMPLATER) $< > $@

$(BUILD)/ea.html: ea.html.template Makefile
	$(SED_TEMPLATER) $< > $@

push: BUCKET = s3://everydayafrica/
push: $(PUBLIC) $(PUBLIC)/ea.css
	$(S3CMD) mb $(BUCKET)
	$(S3CMD) sync --acl-public $< $(BUCKET)

serve: all
	python -m SimpleHTTPServer $(PORT)


open: $(BUILD)/ea.html
	open "http://localhost:$(PORT)/$<"
