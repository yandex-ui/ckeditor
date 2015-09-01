NPM_BIN=$(CURDIR)/../node_modules/.bin
export NPM_BIN

MAKEFLAGS+=-j 4

all: gulp

clean:
	git clean -fdx

gulp: node_modules
	$(NPM_BIN)/gulp grunt-svg_fallback && make yate

yate:
	for x in $$(find out -name '*.svg'); do (printf ":::" && cat "$$x" && printf ":::") > "$$x".yate; done

node_modules:
	$(MAKE) -C .. node_modules

.PHONY: all clean gulp node_modules
