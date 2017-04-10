NODE_VERSION=4.2.4
YARN_VERSION=0.17.9


# below are derived properties
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Linux)
	SYS_NAME=linux
endif
ifeq ($(UNAME_S),Darwin)
	SYS_NAME=darwin
endif

# my x64 mac returns i386 to 'uname -p' :-O
UNAME_P := $(shell uname)
ifeq ($(filter x86_64,$(UNAME_P)),)
	ARCH_NAME=x64
else ifeq ($(filter %86,$(UNAME_P)),)
	ARCH_NAME=x32
endif

NODE_FILENAME=node-v$(NODE_VERSION)-$(SYS_NAME)-$(ARCH_NAME)
YARN_FILENAME=yarn-v$(YARN_VERSION)
YARN_EXEC=$(CURRENT_DIR)/node/node $(CURRENT_DIR)/yarn/bin/yarn.js

CURRENT_DIR := $(shell pwd)

SHELL := /bin/bash
PATH := $(CURRENT_DIR)/node:$(CURRENT_DIR)/yarn/bin:$(PATH):$(M2_HOME)/bin



log-config:
	@echo "Building for system '$(SYS_NAME)' and architecture '$(ARCH_NAME)'"

clean-node:
	rm -f $(NODE_FILENAME).tar.gz
	rm -f $(YARN_FILENAME).tar.gz
	rm -rf node
	rm -rf yarn
	rm -rf node_modules

install-node-yarn: clean-node
	wget https://nodejs.org/dist/v$(NODE_VERSION)/$(NODE_FILENAME).tar.gz
	mkdir -p node
	tar -xzf $(NODE_FILENAME).tar.gz --strip=2 -C node/ $(NODE_FILENAME)/bin/node
	rm -r $(NODE_FILENAME).tar.gz

	wget https://github.com/yarnpkg/yarn/releases/download/v$(YARN_VERSION)/$(YARN_FILENAME).tar.gz
	mkdir -p yarn
	tar -xzf $(YARN_FILENAME).tar.gz --strip=1 -C yarn/
	rm -r $(YARN_FILENAME).tar.gz

	rm -rf node_modules
	$(YARN_EXEC) install

verify: install-node-yarn
	# the freakin' npm executable is broken, makes some stupid assumptions in regard to the npm location;
	# meaning I cannot run an npm script which calls other npm scripts,
	# meaning I have to execute the npm scripts one at a time
	$(YARN_EXEC) run lint
	$(YARN_EXEC) run test
	rm -rf $$TMPDIR/jest_preprocess_cache

