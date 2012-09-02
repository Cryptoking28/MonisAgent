MOCHA = node_modules/mocha/bin/mocha
MOCHA_NOBIN = node_modules/.bin/_mocha
COVER = node_modules/cover/bin/cover

.PHONY: all build test-cov test clean notes pending pending-core
all: build test

node_modules: package.json
	@rm -rf node_modules
	npm install

build: clean node_modules

test-cov: node_modules
	@$(COVER) run $(MOCHA_NOBIN)
	@$(COVER) report html
	@$(COVER) report

test: node_modules
	@rm -f monisagent_agent.log
	@$(MOCHA)

clean:
	rm -rf npm-debug.log monisagent_agent.log .coverage_data cover_html

notes:
	find . -wholename ./node_modules -prune -o \
	       -wholename ./cover_html -prune -o \
	       -name monisagent_agent.log -prune -o \
	       \( -name ".*" -a \! -name . \) -prune -o \
	      -type f -exec egrep -n -H --color=always -C 2 'FIXME|TODO|NOTE' {} \; | less -r

pending: node_modules
	@$(MOCHA) --reporter list | grep -v ✓

pending-core: node_modules
	@$(MOCHA) --reporter list | grep -v ✓ | grep -v 'agent instrumentation of'
