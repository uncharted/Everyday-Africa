# Make for tumblr:	make PROFILE=prod
# Make to use locally:	make


# The build profile to use
PROFILE		= dev
HOST		= localhost
PORT		= 8000

# Node paths and tools
NODE_MODULES	= node_modules
LESSC		= $(NODE_MODULES)/less/bin/lessc
JSX		= $(NODE_MODULES)/react-tools/bin/jsx --cache-dir=$(VAR)/.module-cache
UGLIFY		= $(NODE_MODULES)/uglify-js/bin/uglifyjs

# Project structure
VAR			= var
PUBLIC			= $(VAR)/public
PUBLIC_SCRIPTS		= $(PUBLIC)/scripts
PUBLIC_STYLESHEETS	= $(PUBLIC)/stylesheets

# Other commands
S3CMD		= s3cmd
FSWATCH		= fswatch

# Resource URLs
IMAGES_BASE_URL = /$(PUBLIC)/images
STYLESHEET_URL	= /$(PUBLIC_STYLESHEETS)/ea.css
EA_JS_URL	= /$(PUBLIC_SCRIPTS)/ea.js
CONFIG_URL      = /$(PUBLIC_SCRIPTS)/config.js
FLATIRON_URL	= /$(PUBLIC_SCRIPTS)/director.min.js
JQUERY_URL	= http://code.jquery.com/jquery-2.1.0.js
BLUR_URL	= /$(PUBLIC_SCRIPTS)/blur.js
REACT_URL	= http://fb.me/react-with-addons-0.9.0.js
LODASH_URL	= http://cdnjs.cloudflare.com/ajax/libs/lodash.js/2.4.1/lodash.min.js
TUMBLRVARS	= -e '/TUMBLRVARS/{r ./local.js' -e 'd;}'


# Production Profile
ifeq ($(PROFILE), tumblr)
    # Used as the root for the Tumblr build's asset references
    S3_PUBLIC		= http://s3.amazonaws.com/everydayafricastatic/public
    IMAGES_BASE_URL	= $(S3_PUBLIC)/images
    STYLESHEET_URL	= $(S3_PUBLIC)/stylesheets/ea.css
    EA_JS_URL		= $(S3_PUBLIC)/scripts/ea.js
    FLATIRON_URL	= $(S3_PUBLIC)/scripts/director.min.js
    CONFIG_URL		= $(S3_PUBLIC)/scripts/config.js
    JQUERY_URL		= http://code.jquery.com/jquery-2.1.0.min.js
    BLUR_URL		= $(S3_PUBLIC)/scripts/blur.js
    REACT_URL		= http://fb.me/react-with-addons-0.9.0.min.js
    TUMBLRVARS		= -e '/TUMBLRVARS/{r ./tumblrvars.js' -e 'd;}'
endif

FLAG_BASE		= $(IMAGES_BASE_URL)/flags/flat/64
PHOTOGRAPHER_BASE       = $(IMAGES_BASE_URL)/photographers
TEARSHEET_BASE          = $(IMAGES_BASE_URL)/tearsheets
AFRICA_URL		= $(IMAGES_BASE_URL)/africa.svg
PHOTOGRAPHER_URL	= $(IMAGES_BASE_URL)/photographer.svg
SEARCH_URL		= $(IMAGES_BASE_URL)/search.svg
ABOUT_URL		= $(IMAGES_BASE_URL)/about.svg
INSTAGRAM_URL		= $(IMAGES_BASE_URL)/instagram.svg
TWITTER_URL		= $(IMAGES_BASE_URL)/twitter.svg
FACEBOOK_URL		= $(IMAGES_BASE_URL)/facebook.svg
TUMBLR_URL		= $(IMAGES_BASE_URL)/tumblr.svg
TUMBLR_LOGOTYPE_28_URL  = $(IMAGES_BASE_URL)/tumblr_logotype_white_blue_28.png
TUMBLR_LOGOTYPE_64_URL  = $(IMAGES_BASE_URL)/tumblr_logotype_white_blue_64.png
TAG_ICON_URL		= $(IMAGES_BASE_URL)/tag_icon.svg
HEART_ICON_URL		= $(IMAGES_BASE_URL)/heart_icon.svg
MENU_URL		= $(IMAGES_BASE_URL)/menu.svg
SHARE_URL		= $(IMAGES_BASE_URL)/share.svg
AFRICA_WHITE_URL	= $(IMAGES_BASE_URL)/africa-white.svg
AFRICA_BLACK_URL	= $(IMAGES_BASE_URL)/africa-black.svg
PHOTOGRAPHER_WHITE_URL	= $(IMAGES_BASE_URL)/photographer-white.svg
PHOTOGRAPHER_BLACK_URL	= $(IMAGES_BASE_URL)/photographer-black.svg
SEARCH_WHITE_URL	= $(IMAGES_BASE_URL)/search-white.svg
SEARCH_BLACK_URL	= $(IMAGES_BASE_URL)/search-black.svg
ABOUT_WHITE_URL	        = $(IMAGES_BASE_URL)/about-white.svg
ABOUT_BLACK_URL	        = $(IMAGES_BASE_URL)/about-black.svg
ARROW_LEFT_URL	        = $(IMAGES_BASE_URL)/arrow-left.svg
ARROW_RIGHT_URL	        = $(IMAGES_BASE_URL)/arrow-right.svg
CIRCLE_ARROW_DOWN_URL   = $(IMAGES_BASE_URL)/circle-arrow-down.svg

SED_TEMPLATER = sed \
            -e 's|PROFILE|$(PROFILE)|g' \
            -e 's|HOST|$(HOST)|g' \
            -e 's|PORT|$(PORT)|g' \
            -e 's|STYLESHEET_URL|$(STYLESHEET_URL)|g' \
            -e 's|EA_JS_URL|$(EA_JS_URL)|g' \
            -e 's|CONFIG_URL|$(CONFIG_URL)|g' \
            -e 's|JQUERY_URL|$(JQUERY_URL)|g' \
            -e 's|REACT_URL|$(REACT_URL)|g' \
            -e 's|FLATIRON_URL|$(FLATIRON_URL)|g' \
            -e 's|BLUR_URL|$(BLUR_URL)|g' \
            -e 's|LODASH_URL|$(LODASH_URL)|g' \
            -e 's|IMAGES_BASE_URL|$(IMAGES_BASE_URL)|g' \
            -e 's|FLAG_BASE|$(FLAG_BASE)|g' \
            -e 's|PHOTOGRAPHER_BASE|$(PHOTOGRAPHER_BASE)|g' \
            -e 's|TEARSHEET_BASE|$(TEARSHEET_BASE)|g' \
            -e 's|AFRICA_URL|$(AFRICA_URL)|g' \
            -e 's|PHOTOGRAPHER_URL|$(PHOTOGRAPHER_URL)|g' \
            -e 's|SEARCH_URL|$(SEARCH_URL)|g' \
            -e 's|ABOUT_URL|$(ABOUT_URL)|g' \
            -e 's|INSTAGRAM_URL|$(INSTAGRAM_URL)|g' \
            -e 's|TWITTER_URL|$(TWITTER_URL)|g' \
            -e 's|FACEBOOK_URL|$(FACEBOOK_URL)|g' \
            -e 's|TUMBLR_URL|$(TUMBLR_URL)|g' \
            -e 's|TUMBLR_LOGOTYPE_28_URL|$(TUMBLR_LOGOTYPE_28_URL)|g' \
            -e 's|TUMBLR_LOGOTYPE_64_URL|$(TUMBLR_LOGOTYPE_64_URL)|g' \
            -e 's|TAG_ICON_URL|$(TAG_ICON_URL)|g' \
            -e 's|MENU_URL|$(MENU_URL)|g' \
            -e 's|SHARE_URL|$(SHARE_URL)|g' \
            -e 's|HEART_ICON_URL|$(HEART_ICON_URL)|g' \
            -e 's|AFRICA_WHITE_URL|$(AFRICA_WHITE_URL)|g' \
            -e 's|AFRICA_BLACK_URL|$(AFRICA_BLACK_URL)|g' \
            -e 's|PHOTOGRAPHER_WHITE_URL|$(PHOTOGRAPHER_WHITE_URL)|g' \
            -e 's|PHOTOGRAPHER_BLACK_URL|$(PHOTOGRAPHER_BLACK_URL)|g' \
            -e 's|SEARCH_WHITE_URL|$(SEARCH_WHITE_URL)|g' \
            -e 's|SEARCH_BLACK_URL|$(SEARCH_BLACK_URL)|g' \
            -e 's|ABOUT_WHITE_URL|$(ABOUT_WHITE_URL)|g' \
            -e 's|ABOUT_BLACK_URL|$(ABOUT_BLACK_URL)|g' \
            -e 's|ARROW_LEFT_URL|$(ARROW_LEFT_URL)|g' \
            -e 's|ARROW_RIGHT_URL|$(ARROW_RIGHT_URL)|g' \
            -e 's|CIRCLE_ARROW_DOWN_URL|$(CIRCLE_ARROW_DOWN_URL)|g'
	    # $(TUMBLRVARS)


.PHONY: all build push serve open deps fswatch

all: build

deps: $(NODE_MODULES)

build: $(VAR)/ea.html $(PUBLIC_SCRIPTS)/ea.js $(PUBLIC_SCRIPTS)/config.js $(PUBLIC_STYLESHEETS)/ea.css tumblrvars.js local.js

$(NODE_MODULES): package.json
	npm install

$(JSX): $(NODE_MODULES)
$(LESSC): $(NODE_MODULES)

$(PUBLIC_BOWER_COMPONENTS): bower.json
	$(BOWER) install

# Ensure directories
$(VAR): public
	mkdir -p $@

$(PUBLIC): $(VAR)
	cp -r public $<

$(PUBLIC_SCRIPTS): $(PUBLIC)
	mkdir -p $@

$(PUBLIC_STYLESHEETS): $(PUBLIC)
	mkdir -p $@



# Scripts and Stylesheets
$(PUBLIC_STYLESHEETS)/%.css: stylesheets/%.less $(wildcard stylesheets/*.less) $(PUBLIC_STYLESHEETS) stylesheets $(LESSC)
	$(LESSC) $< > $@

$(PUBLIC_SCRIPTS)/%: scripts/% $(PUBLIC_SCRIPTS) $(JSX)
	$(JSX) $< > $@

local.js: local.js.template Makefile
	$(SED_TEMPLATER) $< > $@

scripts/config.js: scripts/config.js.template Makefile
	$(SED_TEMPLATER) $< > $@

$(VAR)/ea.html: ea.html.template $(VAR) Makefile local.js tumblrvars.js
	$(SED_TEMPLATER) $< > $@

push: CONFIG = .s3cmd.ea
push: BUCKET = s3://everydayafricastatic/
push: $(PUBLIC)
	$(S3CMD) mb $(BUCKET)
	$(S3CMD) -c $(CONFIG) sync --acl-public $< $(BUCKET)


# Running locally

serve: all
	python -m SimpleHTTPServer $(PORT)

open: $(VAR)/ea.html
	open "http://localhost:$(PORT)/$<"

fswatch:
	$(FSWATCH) public:scripts:stylesheets:Makefile "make build"
