# Make for tumblr:	make PROFILE=prod
# Make to use locally:	make


# The build profile to use
PROFILE		= dev
PORT		= 8000

# Node paths and tools
NODE_MODULES	= node_modules
LESSC		= $(NODE_MODULES)/less/bin/lessc
JSX		= $(NODE_MODULES)/react-tools/bin/jsx

# Project structure
BUILD           = build
PUBLIC          = $(BUILD)/public

# Other commands
S3CMD = s3cmd

# Resource URLs
STYLESHEET_URL	= /$(PUBLIC)/ea.css
EA_US_URL	= /$(PUBLIC)/ea.js
JQUERY_URL	= http://code.jquery.com/jquery-2.1.0.js
REACT_URL	= http://fb.me/react-with-addons-0.9.0.js

# Production Profile
ifeq ($(PROFILE), prod)
    S3_PUBLIC		= http://s3.amazonaws.com/everydayafrica/public
    STYLESHEET_URL	= $(S3_PUBLIC)/ea.css
    EA_US_URL		= $(S3_PUBLIC)/ea.js
    JQUERY_URL		= http://code.jquery.com/jquery-2.1.0.min.js
    REACT_URL		= http://fb.me/react-with-addons-0.9.0.min.js
endif


.PHONY: all push serve open

all: $(BUILD)/ea.html

$(NODE_MODULES): package.json
	npm install

$(JSX): $(NODE_MODULES)
$(LESSC): $(NODE_MODULES)

$(PUBLIC):
	mkdir -p $@

$(PUBLIC)/ea.css: stylesheets/ea.less $(PUBLIC) $(LESSC)
	$(LESSC) $< > $@

$(PUBLIC)/ea.js: JSX_ARGS = --cache-dir=$(BUILD)/.module-cache
$(PUBLIC)/ea.js: scripts/ea.js $(PUBLIC) $(JSX)
	$(JSX) $(JSX_ARGS) $(dir $<) $(dir $@)

$(BUILD)/ea.html: ea.html.template $(PUBLIC)/ea.js $(PUBLIC)/ea.css Makefile
	sed -e 's|STYLESHEET_URL|$(STYLESHEET_URL)|g' \
            -e 's|EA_JS_URL|$(EA_US_URL)|g' \
            -e 's|JQUERY_URL|$(JQUERY_URL)|g' \
            -e 's|REACT_URL|$(REACT_URL)|g' \
            $< > $@

push: BUCKET = s3://everydayafrica/
push: $(PUBLIC) $(PUBLIC)/ea.css
	$(S3CMD) mb $(BUCKET)
	$(S3CMD) sync --acl-public $< $(BUCKET)

serve: all
	python -m SimpleHTTPServer $(PORT)


open: $(BUILD)/ea.html
	open "http://localhost:$(PORT)/$<"
