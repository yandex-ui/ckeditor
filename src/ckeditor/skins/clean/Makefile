NPM_BIN=$(CURDIR)/node_modules/.bin
export NPM_BIN

src_styl := $(shell find . -type f -name "*.styl" ! -path "*node_modules*")

MAKEFLAGS+=-j 4

dir=-C $*

all: node_modules \
	icons \
	editor.css

node_modules: package.json
	npm install
	touch node_modules

editor.css: editor.styl $(src_styl) node_modules
	$(NPM_BIN)/stylus --print --resolve-url --inline $< > $@
	$(NPM_BIN)/autoprefixer --browsers "> 1%, Firefox >= 14, Opera >= 12, Chrome >= 4" $@

editor.min.css: editor.css
	$(NPM_BIN)/stylus --compress < $< > $@

icons: node_modules
	$(MAKE) -C $@

clean:
	find . -type f -name "*.css" -exec rm -f {} \;

.PHONY: all clean
