NPM_BIN=$(CURDIR)/node_modules/.bin
export NPM_BIN

src_styl := $(shell find src -type f -name "*.styl")

MAKEFLAGS+=-j 4

dir=-C $*

all: node_modules \
	icons \
	clean.css

node_modules: package.json
	npm install
	touch node_modules

clean.css: src/clean.styl $(src_styl) node_modules
	$(NPM_BIN)/stylus --print --resolve-url --inline $< > $@
	$(NPM_BIN)/autoprefixer --browsers "> 1%, Firefox >= 14, Opera >= 12, Chrome >= 4" $@

clean.min.css: clean.css
	$(NPM_BIN)/stylus --compress < $< > $@

icons: node_modules
	$(MAKE) -C $@

clean:
	find . -type f -name "*.css" ! -path "*/node_modules/*" -exec rm -f {} \;

.PHONY: all clean
