src_js := $(shell find src -type f -name "*.js")

MAKEFLAGS+=-j 4

all: $(CURDIR)/src/ckeditor/dev/builder/release/ckeditor

clean:
	rm -rf $(CURDIR)/src/ckeditor/dev/builder/release/ckeditor

$(CURDIR)/src/ckeditor/dev/builder/release/ckeditor: $(src_js)
	$(CURDIR)/src/ckeditor/dev/builder/build.sh \
		--skip-omitted-in-build-config \
		--leave-js-unminified \
		--leave-css-unminified \
		--no-zip \
		--no-tar \
		--build-config $(CURDIR)/src/build-config.js
	touch $@

#$(CURDIR)/dist/ckeditor: build_ckeditor
#	rm -rf $(CURDIR)/dist/ckeditor
#	cp -r $(CURDIR)/src/ckeditor/dev/builder/release/ckeditor $(CURDIR)/dist

.PHONY: all clean
