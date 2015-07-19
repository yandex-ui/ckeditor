MAKEFLAGS+=-j 4

all: $(CURDIR)/dist/ckeditor

build_ckeditor:
	$(CURDIR)/src/ckeditor/dev/builder/build.sh \
		--skip-omitted-in-build-config \
		--leave-js-unminified \
		--leave-css-unminified \
		--no-zip \
		--no-tar \
		--build-config $(CURDIR)/src/build-config.js

$(CURDIR)/dist/ckeditor: build_ckeditor
	rm -rf $(CURDIR)/dist/ckeditor
	cp -r $(CURDIR)/src/ckeditor/dev/builder/release/ckeditor $(CURDIR)/dist

.PHONY: all
