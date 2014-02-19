SASS      = sass
SASS_ARGS = # --watch

S3CMD     = s3cmd


.PHONY: all push

all: public/tumblr.css

public:
	mkdir -p $@

public/tumblr.css: tumblr.scss public
	$(SASS) $(SASS_ARGS) $<:$@

tumblr.html: STYLESHEET_URL = http://s3.amazonaws.com/everydayafrica/public/tumblr.css
tumblr.html: INSTAFEED_URL  = http://s3.amazonaws.com/everydayafrica/public/instafeed.min.css
tumblr.html: tumblr.html.template tumblr.js Makefile
	sed -e 's|STYLESHEET_URL|$(STYLESHEET_URL)|g' \
            -e 's|INSTAFEED_URL|$(INSTAFEED_URL)|g' \
            -e '/JAVASCRIPT/{r ./tumblr.js' -e 'd;}' \
            $< > $@

push: BUCKET = s3://everydayafrica/
push: public public/tumblr.css
	$(S3CMD) mb $(BUCKET)
	$(S3CMD) sync --acl-public $< $(BUCKET)
