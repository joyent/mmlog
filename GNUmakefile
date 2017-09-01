#
# Copyright (c) 2017, Joyent, Inc. All rights reserved.
#
# Makefile: top-level Makefile
#
# This Makefile contains only repo-specific logic and uses included makefiles
# to supply common targets (javascriptlint, jsstyle, restdown, etc.), which are
# used by other repos as well.
#

#
# Tools
#
NPM		 = npm

#
# Files
#
JSON_FILES	 = package.json
JS_FILES	:= bin/mmlog $(shell find lib -name '*.js')
JSL_FILES_NODE	 = $(JS_FILES)
JSSTYLE_FILES	 = $(JS_FILES)
JSL_CONF_NODE	 = tools/jsl.node.conf

include ./Makefile.node_modules.defs

.PHONY: all
all: $(STAMP_NODE_MODULES)

include ./Makefile.targ
include ./Makefile.node_modules.targ
