# Variables

BUILDS_DIR := build
DATE := $(shell date +%Y%m%d_%H%M%S)
ZIP_FILE := $(BUILDS_DIR)/$(DATE).zip
NODE_MODULES := node_modules

# Default target
.PHONY: all
all: clean install package

# Clean build artifacts
.PHONY: clean
clean:
	rm -rf $(NODE_MODULES)
	rm -rf $(BUILDS_DIR)

# Install dependencies
.PHONY: install
install:
	npm install

# Package the Lambda function
.PHONY: package
package: install
	mkdir -p $(BUILDS_DIR)
	zip -r $(ZIP_FILE) index.js $(NODE_MODULES)

# Show help
.PHONY: help
help:
	@echo "Available targets:"
	@echo "  all      - Clean, install dependencies, and package the Lambda function"
	@echo "  clean    - Remove build artifacts"
	@echo "  install  - Install npm dependencies"
	@echo "  package  - Create the Lambda deployment package"
	@echo "  help     - Show this help message" 