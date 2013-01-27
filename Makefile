LIB_FILES ?= $(shell find lib -name '*.js')
TEST_FILES ?= $(shell find test -name '*.js' -depth 1)

MD_FILES = $(patsubst lib/%.js,docs/api/%.md,$(LIB_FILES))
MD_FILES += $(patsubst test/%.js,docs/test/test-%.md,$(TEST_FILES))

all: submodule clean-docs docs

docs-base:
	@echo ... Generate docs ...
	mkdir -p docs/api
	tomdox lib/env.js --mark > docs/api/env.md
	tomdox lib/base.js --mark > docs/api/base.md
	@echo >> docs/api/base.md

docs-actions:
	@echo ... Generate docs for mixins ...
	mkdir -p docs/api
	@echo "## Mixins" >> docs/api/base.md
	@echo >> docs/api/base.md
	tomdox lib/actions/invoke.js --mark >> docs/api/base.md
	tomdox lib/actions/bower.js --mark >> docs/api/base.md
	@echo "**The log API is a bit different, and accesible through the `this.log` property. Intead of the usual mixin**" >> docs/api/base.md
	tomdox lib/util/log.js --mark >> docs/api/base.md
	tomdox lib/actions/actions.js --mark >> docs/api/base.md
	tomdox lib/actions/file.js --mark >> docs/api/base.md
	tomdox lib/actions/prompt.js --mark >> docs/api/base.md
	tomdox lib/actions/fetch.js --mark >> docs/api/base.md
	tomdox lib/actions/string.js --mark >> docs/api/base.md
	tomdox lib/actions/wiring.js --mark >> docs/api/base.md

# docs: $(MD_FILES) docs-actions
api: $(MD_FILES)

docs: api docs-actions

docs/api/%.md:: lib/%.js
	@mkdir -p $(dir $@)
	tomdox $< --mark > $@

docs/test/test-%.md: test/%.js
	@mkdir -p $(dir $@)
	./node_modules/.bin/mocha $< --reporter markdown | sed 's/^# TOC/# $(basename $(notdir $@))/'> $@
	@echo "* [[ $(basename $(notdir $@)) ]]" >> docs/test/_Sidebar.md

clean:
	git clean -fdx -e node_modules/ -e Makefile -e _docs/

clean-docs:
	-rm -rf docs/api docs/test

submodule:
	git submodule update --init
	cd docs && git checkout master

.PHONY: docs
