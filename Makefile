MOCHA = node_modules/mocha/bin/mocha
MOCHA_NOBIN = node_modules/.bin/_mocha
COVER = node_modules/cover/bin/cover

all: build test

.PHONY: build
build: clean
	@npm install --dev

.PHONY: test-cov
test-cov:
	@$(COVER) run $(MOCHA_NOBIN)
	@$(COVER) report html
	@$(COVER) report

.PHONY: test
test:
	@$(MOCHA)

.PHONY: clean
clean:
	rm -rf npm-debug.log monisagent_agent.log .coverage_data cover_html
