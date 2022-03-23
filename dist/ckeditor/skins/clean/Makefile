NPM_BIN=$(CURDIR)/node_modules/.bin
export NPM_BIN

src_styl := $(shell find . -type f -name "*.styl" ! -path "*/node_modules/*")
out_styl := $(shell find . -maxdepth 1 -type f -name "*.styl")
out_css := $(patsubst %.styl, %.css, $(out_styl))
out_min_css := $(patsubst %.css, %.min.css, $(out_css))

MAKEFLAGS+=-j 4

dir=-C $*

all: node_modules \
	svgimages \
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

svgimages_gulp: node_modules
	npx --no-install gulp grunt-svg_fallback

svgimages: svgimages_gulp
	for x in $$(find images -name '*.svg'); do (printf ":::" && cat "$$x" && printf ":::") > "$$x".yate; done

clean:
	find . -maxdepth 1 -type f -name "*.css" -exec rm -f {} \;
	rm -rf $(CURDIR)/images

.PHONY: all clean
