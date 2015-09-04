NPM_BIN=$(CURDIR)/../node_modules/.bin
export NPM_BIN

all: node_modules \
	gulp

clean:
	git clean -fdx

node_modules:
	$(MAKE) -C .. node_modules

gulp: node_modules
	$(NPM_BIN)/gulp grunt-svg_fallback

yate: gulp
	for x in $$(find out -name '*.svg'); do (printf ":::" && cat "$$x" && printf ":::") > "$$x".yate; done

.PHONY: all clean
