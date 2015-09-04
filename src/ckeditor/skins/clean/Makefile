NPM_BIN=$(CURDIR)/node_modules/.bin
export NPM_BIN

src_styl := $(shell find . -type f -name "*.styl" ! -path "*/node_modules/*")
out_styl := $(shell find . -maxdepth 1 -type f -name "*.styl")
out_css := $(patsubst %.styl, %.css, $(out_styl))
out_min_css := $(patsubst %.css, %.min.css, $(out_css))

MAKEFLAGS+=-j 4

dir=-C $*

all: node_modules \
	svgicons \
	$(out_css) \
	$(out_min_css)

node_modules: package.json
	npm install
	touch node_modules

$(out_css): %.css: %.styl $(src_styl) node_modules
	$(NPM_BIN)/stylus --print --resolve-url --inline $< > $@
	$(NPM_BIN)/autoprefixer --browsers "> 1%, Firefox >= 14, Opera >= 12, Chrome >= 4" $@

$(out_min_css): %.min.css: %.css node_modules
	$(NPM_BIN)/stylus --compress < $< > $@

svgicons: node_modules
	$(MAKE) -C $(CURDIR)/icons

clean:
	find . -type f -name "*.css" ! -path "*/node_modules/*" ! -path "*/icons/*" -exec rm -f {} \;
	$(MAKE) -C $(CURDIR)/icons clean

.PHONY: all clean
