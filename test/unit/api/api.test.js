'use strict'

const tap = require('tap')
// TODO: convert to normal tap style.
// Below allows use of mocha DSL with tap runner.
tap.mochaGlobals()

var API = require('../../../api')
var chai = require('chai')
var should = chai.should()
var expect = chai.expect
var helper = require('../../lib/agent_helper')
var sinon = require('sinon')
var shimmer = require('../../../lib/shimmer')

describe('the Monis Agent agent API', function() {
  var URL = '/test/path/31337'
  var NAME = 'WebTransaction/Uri/test/path/31337'
  var agent
  var api


  beforeEach(function() {
    agent = helper.loadMockedAgent()
    api = new API(agent)
  })

  afterEach(function() {
    helper.unloadAgent(agent)
  })

  it("exports a transaction naming function", function() {
    should.exist(api.setTransactionName)
    expect(api.setTransactionName).to.be.a('function')
  })

  it("exports a controller naming function", function() {
    should.exist(api.setControllerName)
    expect(api.setControllerName).to.be.a('function')
  })

  it("exports a transaction ignoring function", function() {
    should.exist(api.setIgnoreTransaction)
    expect(api.setIgnoreTransaction).to.be.a('function')
  })

  it("exports a function for adding naming rules", function() {
    should.exist(api.addNamingRule)
    expect(api.addNamingRule).to.be.a('function')
  })

  it("exports a function for ignoring certain URLs", function() {
    should.exist(api.addIgnoringRule)
    expect(api.addIgnoringRule).to.be.a('function')
  })

  it("exports a function for adding custom instrumentation", function() {
    should.exist(api.instrument)
    expect(api.instrument).to.be.a('function')
  })

  describe("when explicitly naming transactions", function() {
    describe("in the simplest case", function() {
      var segment
      var transaction

      beforeEach(function(done) {
        agent.on('transactionFinished', function(t) {
          // grab transaction
          transaction = t
          transaction.finalizeNameFromUri(URL, 200)
          segment.markAsWeb(URL)
          done()
        })

        helper.runInTransaction(agent, function(tx) {
          // grab segment
          agent.tracer.addSegment(NAME, null, null, false, function() {
            // HTTP instrumentation sets URL as soon as it knows it
            segment = agent.tracer.getSegment()
            tx.type = 'web'
            tx.url = URL
            tx.verb = 'POST'

            // Name the transaction
            api.setTransactionName('Test')

            tx.end()
          })
        })
      })

      it("sets the transaction name to the custom name", function() {
        expect(transaction.name).equal('WebTransaction/Custom/Test')
      })

      it("names the web trace segment after the custom name", function() {
        expect(segment.name).equal('WebTransaction/Custom/Test')
      })

      it("leaves the request URL alone", function() {
        expect(transaction.url).equal(URL)
      })
    })

    it("uses the last name set when called multiple times", function(done) {
      agent.on('transactionFinished', function(transaction) {
        transaction.finalizeNameFromUri(URL, 200)

        expect(transaction.name).equal('WebTransaction/Custom/List')

        done()
      })

      helper.runInTransaction(agent, function(transaction) {
        agent.tracer.createSegment(NAME)
        transaction.url  = URL
        transaction.verb = 'GET'

        // NAME THE CONTROLLER AND ACTION, MULTIPLE TIMES
        api.setTransactionName('Index')
        api.setTransactionName('Update')
        api.setTransactionName('Delete')
        api.setTransactionName('List')

        transaction.end()
      })
    })
  })

  describe("when (not) ignoring a transaction", function() {
    it("should mark the transaction ignored", function(done) {
      agent.on('transactionFinished', function(transaction) {
        transaction.finalizeNameFromUri(URL, 200)

        expect(transaction.ignore).equal(true)

        done()
      })

      helper.runInTransaction(agent, function(transaction) {
        agent.tracer.createSegment(NAME)
        transaction.url  = URL
        transaction.verb = 'GET'

        api.setIgnoreTransaction(true)

        transaction.end()
      })
    })

    it("should force a transaction to not be ignored", function(done) {
      api.addIgnoringRule('^/test/.*')

      agent.on('transactionFinished', function(transaction) {
        transaction.finalizeNameFromUri(URL, 200)

        expect(transaction.ignore).equal(false)

        done()
      })

      helper.runInTransaction(agent, function(transaction) {
        agent.tracer.createSegment(NAME)
        transaction.url = URL
        transaction.verb = 'GET'

        api.setIgnoreTransaction(false)

        transaction.end()
      })
    })
  })

  describe("when handed a new pattern to ignore", function() {
    it("should add it to the agent's normalizer", function() {
      expect(agent.userNormalizer.rules.length).equal(1) // default ignore rule
      api.addIgnoringRule('^/simple.*')
      expect(agent.userNormalizer.rules.length).equal(2)
    })

    describe("in the base case", function() {
      var mine
      beforeEach(function() {
        agent.urlNormalizer.load([
          {
            each_segment: true,
            eval_order: 0,
            terminate_chain: false,
            match_expression: '^(test_match_nothing)$',
            replace_all: false,
            ignore: false,
            replacement: '\\1'
          },
          {
            each_segment: true,
            eval_order: 1,
            terminate_chain: false,
            match_expression: '^[0-9][0-9a-f_,.-]*$',
            replace_all: false,
            ignore: false,
            replacement: '*'
          },
          {
            each_segment: false,
            eval_order: 2,
            terminate_chain: false,
            match_expression: '^(.*)/[0-9][0-9a-f_,-]*\\.([0-9a-z][0-9a-z]*)$',
            replace_all: false,
            ignore: false,
            replacement: '\\1/.*\\2'
          }
        ])

        api.addIgnoringRule('^/test/.*')
        mine = agent.userNormalizer.rules[0]
      })

      it("should add it to the agent's normalizer", function() {
        expect(agent.urlNormalizer.rules.length).equal(3)
        expect(agent.userNormalizer.rules.length).equal(1 + 1) // +1 default rule
      })

      it("should leave the passed-in pattern alone", function() {
        expect(mine.pattern.source).equal('^\\/test\\/.*')
      })

      it("should have the correct replacement", function() {
        expect(mine.replacement).equal('$0')
      })

      it("should set it to highest precedence", function() {
        expect(mine.precedence).equal(0)
      })

      it("should end further normalization", function() {
        expect(mine.isTerminal).equal(true)
      })

      it("should only apply it to the whole URL", function() {
        expect(mine.eachSegment).equal(false)
      })

      it("should ignore transactions related to that URL", function() {
        expect(mine.ignore).equal(true)
      })
    })

    it("applies a string pattern correctly", function(done) {
      api.addIgnoringRule('^/test/.*')

      agent.on('transactionFinished', function(transaction) {
        transaction.finalizeNameFromUri(URL, 200)

        expect(transaction.ignore).equal(true)

        done()
      })

      helper.runInTransaction(agent, function(transaction) {
        agent.tracer.createSegment(NAME)
        transaction.url = URL
        transaction.verb = 'GET'

        transaction.end()
      })
    })
  })

  describe("when handed an error to trace", function() {
    beforeEach(function() {
      agent.config.attributes.enabled = true
    })

    it("should add the error even without a transaction", function() {
      expect(agent.errors.traceAggregator.errors.length).equal(0)
      api.noticeError(new TypeError('this test is bogus, man'))
      expect(agent.errors.traceAggregator.errors.length).equal(1)
    })

    it("should still add errors in high security mode", function() {
      agent.config.high_security = true
      expect(agent.errors.traceAggregator.errors.length).equal(0)
      api.noticeError(new TypeError('this test is bogus, man'))
      expect(agent.errors.traceAggregator.errors.length).equal(1)
      agent.config.high_security = false
    })

    it('should not track custom attributes if custom_attributes_enabled is false', () => {
      agent.config.api.custom_attributes_enabled = false
      expect(agent.errors.traceAggregator.errors.length).equal(0)
      api.noticeError(new TypeError('this test is bogus, man'), {crucial: 'attribute'})
      expect(agent.errors.traceAggregator.errors.length).equal(1)
      const attributes = agent.errors.traceAggregator.errors[0][4]
      expect(attributes.userAttributes).to.deep.equal({})
      agent.config.api.custom_attributes_enabled = true
    })

    it('should not track custom attributes in high security mode', () => {
      agent.config.high_security = true
      expect(agent.errors.traceAggregator.errors.length).equal(0)
      api.noticeError(new TypeError('this test is bogus, man'), {crucial: 'attribute'})
      expect(agent.errors.traceAggregator.errors.length).equal(1)
      const attributes = agent.errors.traceAggregator.errors[0][4]
      expect(attributes.userAttributes).to.deep.equal({})
      agent.config.high_security = false
    })

    it("should not add errors when noticeErrors is disabled", function() {
      agent.config.api.notice_error_enabled = false
      expect(agent.errors.traceAggregator.errors.length).equal(0)
      api.noticeError(new TypeError('this test is bogus, man'))
      expect(agent.errors.traceAggregator.errors.length).equal(0)
      agent.config.api.notice_error_enabled = true
    })

    it("should track custom parameters on error without a transaction", function() {
      expect(agent.errors.traceAggregator.errors.length).equal(0)
      api.noticeError(new TypeError('this test is bogus, man'), {present : 'yep'})
      expect(agent.errors.traceAggregator.errors.length).equal(1)

      var params = agent.errors.traceAggregator.errors[0][4]
      expect(params.userAttributes.present).equal('yep')
    })

    it("should omit improper types of attributes", function() {
      expect(agent.errors.traceAggregator.errors.length).equal(0)
      api.noticeError(
        new TypeError('this test is bogus, man'),
        {
          string : 'yep',
          object: {},
          function: function() {},
          number: 1234,
          symbol: Symbol('test'),
          undef: undefined,
          array: [],
          boolean: true
        }
      )
      expect(agent.errors.traceAggregator.errors.length).equal(1)

      var params = agent.errors.traceAggregator.errors[0][4]
      expect(params.userAttributes.string).equal('yep')
      expect(params.userAttributes.number).equal(1234)
      expect(params.userAttributes.boolean).equal(true)
      expect(params.userAttributes).to.not.have.property('object')
      expect(params.userAttributes).to.not.have.property('array')
      expect(params.userAttributes).to.not.have.property('function')
      expect(params.userAttributes).to.not.have.property('undef')
      expect(params.userAttributes).to.not.have.property('symbol')
    })

    it('should respect attribute filter rules', function() {
      agent.config.attributes.exclude.push('unwanted')
      agent.config.emit('attributes.exclude')
      expect(agent.errors.traceAggregator.errors.length).equal(0)
      api.noticeError(
        new TypeError('this test is bogus, man'),
        {present: 'yep', unwanted: 'nope'}
      )
      expect(agent.errors.traceAggregator.errors.length).equal(1)

      var params = agent.errors.traceAggregator.errors[0][4]
      expect(params.userAttributes.present).equal('yep')
      expect(params.userAttributes.unwanted).to.be.undefined
    })

    it("should add the error associated to a transaction", function(done) {
      expect(agent.errors.traceAggregator.errors.length).to.equal(0)

      agent.on('transactionFinished', function(transaction) {
        expect(agent.errors.traceAggregator.errors.length).to.equal(1)
        var caught = agent.errors.traceAggregator.errors[0]
        expect(caught[1], 'transaction name').to.equal('Unknown')
        expect(caught[2], 'message').to.equal('test error')
        expect(caught[3], 'type').to.equal('TypeError')

        expect(transaction.ignore).equal(false)

        done()
      })

      helper.runInTransaction(agent, function(transaction) {
        api.noticeError(new TypeError('test error'))
        transaction.end()
      })
    })

    it('should notice custom attributes associated with an error', function(done) {
      expect(agent.errors.traceAggregator.errors.length).equal(0)
      var orig = agent.config.attributes.exclude
      agent.config.attributes.exclude = ['ignored']
      agent.config.emit('attributes.exclude')

      agent.on('transactionFinished', function(transaction) {
        expect(agent.errors.traceAggregator.errors.length).equal(1)
        var caught = agent.errors.traceAggregator.errors[0]
        expect(caught[1]).equal('Unknown')
        expect(caught[2]).equal('test error')
        expect(caught[3]).equal('TypeError')
        expect(caught[4].userAttributes.hi).equal('yo')
        expect(caught[4].ignored).to.be.undefined

        expect(transaction.ignore).equal(false)

        agent.config.attributes.exclude = orig
        done()
      })

      helper.runInTransaction(agent, function(transaction) {
        api.noticeError(new TypeError('test error'), {hi: 'yo', ignored: 'yup'})
        transaction.end()
      })
    })

    it("should add an error-alike with a message but no stack", function(done) {
      expect(agent.errors.traceAggregator.errors.length).equal(0)

      agent.on('transactionFinished', function(transaction) {
        expect(agent.errors.traceAggregator.errors.length).equal(1)
        var caught = agent.errors.traceAggregator.errors[0]
        expect(caught[1]).equal('Unknown')
        expect(caught[2]).equal('not an Error')
        expect(caught[3]).equal('Object')

        expect(transaction.ignore).equal(false)

        done()
      })

      helper.runInTransaction(agent, function(transaction) {
        api.noticeError({message : 'not an Error'})
        transaction.end()
      })
    })

    it("should add an error-alike with a stack but no message", function(done) {
      expect(agent.errors.traceAggregator.errors.length).equal(0)

      agent.on('transactionFinished', function(transaction) {
        expect(agent.errors.traceAggregator.errors.length).equal(1)
        var caught = agent.errors.traceAggregator.errors[0]
        expect(caught[1]).equal('Unknown')
        expect(caught[2]).equal('')
        expect(caught[3]).equal('Error')

        expect(transaction.ignore).equal(false)

        done()
      })

      helper.runInTransaction(agent, function(transaction) {
        api.noticeError({stack : new Error().stack})
        transaction.end()
      })
    })

    it("shouldn't throw on (or capture) a useless error object", function(done) {
      expect(agent.errors.traceAggregator.errors.length).equal(0)

      agent.on('transactionFinished', function(transaction) {
        expect(agent.errors.traceAggregator.errors.length).equal(0)
        expect(transaction.ignore).equal(false)

        done()
      })

      helper.runInTransaction(agent, function(transaction) {
        expect(function() { api.noticeError({}) }).not.throws()
        transaction.end()
      })
    })

    it("should add a string error associated to a transaction", function(done) {
      expect(agent.errors.traceAggregator.errors.length).equal(0)

      agent.on('transactionFinished', function(transaction) {
        expect(agent.errors.traceAggregator.errors.length).equal(1)
        var caught = agent.errors.traceAggregator.errors[0]
        expect(caught[1]).equal('Unknown')
        expect(caught[2]).equal('busted, bro')
        expect(caught[3]).equal('Error')

        expect(transaction.ignore).equal(false)

        done()
      })

      helper.runInTransaction(agent, function(transaction) {
        api.noticeError('busted, bro')
        transaction.end()
      })
    })

    it("should allow custom parameters to be added to string errors", function(done) {
      expect(agent.errors.traceAggregator.errors.length).equal(0)

      agent.on('transactionFinished', function(transaction) {
        expect(agent.errors.traceAggregator.errors.length).equal(1)
        var caught = agent.errors.traceAggregator.errors[0]
        expect(caught[2]).equal('busted, bro')
        expect(caught[4].userAttributes.a).equal(1)
        expect(caught[4].userAttributes.steak).equal('sauce')

        expect(transaction.ignore).equal(false)

        done()
      })

      helper.runInTransaction(agent, function(transaction) {
        api.noticeError('busted, bro', {a : 1, steak : 'sauce'})
        transaction.end()
      })
    })
  })

  describe('when recording custom metrics', function() {
    it('should prepend "Custom" in front of name', () => {
      api.recordMetric('metric/thing', 3)
      api.recordMetric('metric/thing', 4)
      api.recordMetric('metric/thing', 5)

      const metric = api.agent.metrics.getMetric('Custom/metric/thing')
      expect(metric).to.exist
    })

    it('it should aggregate metric values', function() {
      api.recordMetric('metric/thing', 3)
      api.recordMetric('metric/thing', 4)
      api.recordMetric('metric/thing', 5)

      const metric = api.agent.metrics.getMetric('Custom/metric/thing')

      expect(metric.total).equal(12)
      expect(metric.totalExclusive).equal(12)
      expect(metric.min).equal(3)
      expect(metric.max).equal(5)
      expect(metric.sumOfSquares).equal(50)
      expect(metric.callCount).equal(3)
    })

    it('it should merge metrics', function() {
      api.recordMetric('metric/thing', 3)
      api.recordMetric('metric/thing', {
        total: 9,
        min: 4,
        max: 5,
        sumOfSquares: 41,
        count: 2
      })

      const metric = api.agent.metrics.getMetric('Custom/metric/thing')

      expect(metric.total).equal(12)
      expect(metric.totalExclusive).equal(12)
      expect(metric.min).equal(3)
      expect(metric.max).equal(5)
      expect(metric.sumOfSquares).equal(50)
      expect(metric.callCount).equal(3)
    })

    it('it should increment properly', function() {
      api.incrementMetric('metric/thing')
      api.incrementMetric('metric/thing')
      api.incrementMetric('metric/thing')

      const metric = api.agent.metrics.getMetric('Custom/metric/thing')

      expect(metric.total).equal(0)
      expect(metric.totalExclusive).equal(0)
      expect(metric.min).equal(0)
      expect(metric.max).equal(0)
      expect(metric.sumOfSquares).equal(0)
      expect(metric.callCount).equal(3)

      api.incrementMetric('metric/thing', 4)
      api.incrementMetric('metric/thing', 5)


      expect(metric.total).equal(0)
      expect(metric.totalExclusive).equal(0)
      expect(metric.min).equal(0)
      expect(metric.max).equal(0)
      expect(metric.sumOfSquares).equal(0)
      expect(metric.callCount).equal(12)
    })
  })

  describe('shutdown', function() {
    it('exports a shutdown function', function() {
      should.exist(api.shutdown)
      expect(api.shutdown).a('function')
    })

    it('calls agent stop', function() {
      var mock = sinon.mock(agent)
      mock.expects('stop').once()
      api.shutdown()
      mock.verify()
    })

    describe('when `options.collectPendingData` is `true`', () => {
      it('calls forceHarvestAll when state is `started`', () => {
        var mock = sinon.mock(agent)
        agent.setState('started')
        mock.expects('forceHarvestAll').once()
        api.shutdown({collectPendingData: true})
        mock.verify()
      })

      it('calls forceHarvestAll when state changes to "started"', () => {
        var mock = sinon.mock(agent)
        agent.setState('starting')
        mock.expects('forceHarvestAll').once()
        api.shutdown({collectPendingData: true})
        agent.setState('started')
        mock.verify()
      })

      it('does not call forceHarvestAll when state is not "started"', () => {
        var mock = sinon.mock(agent)
        agent.setState('starting')
        mock.expects('forceHarvestAll').never()
        api.shutdown({collectPendingData: true})
        mock.verify()
      })

      it('calls stop when timeout is not given and state changes to "errored"', () => {
        var mock = sinon.mock(agent)
        agent.setState('starting')
        mock.expects('stop').once()
        api.shutdown({collectPendingData: true})
        agent.setState('errored')
        mock.verify()
      })

      it('calls stop when timeout is given and state changes to "errored"', () => {
        var mock = sinon.mock(agent)
        agent.setState('starting')
        mock.expects('stop').once()
        api.shutdown({collectPendingData: true, timeout: 1000})
        agent.setState('errored')
        mock.verify()
      })
    })

    describe('when `options.waitForIdle` is `true`', () => {
      it('calls stop when there are no active transactions', () => {
        const mock = sinon.mock(agent)
        agent.setState('started')
        mock.expects('stop').once()
        api.shutdown({waitForIdle: true})
        mock.verify()
      })

      it('calls stop after transactions complete when there are some', (done) => {
        let mock = sinon.mock(agent)
        agent.setState('started')
        mock.expects('stop').never()
        helper.runInTransaction(agent, (tx) => {
          api.shutdown({waitForIdle: true})
          mock.verify()
          mock.restore()

          mock = sinon.mock(agent)
          mock.expects('stop').once()
          tx.end()
          setImmediate(() => {
            mock.verify()
            done()
          })
        })
      })
    })

    it('calls forceHarvestAll when a timeout is given and not reached', function() {
      var mock = sinon.mock(agent)
      agent.setState('starting')
      mock.expects('forceHarvestAll').once()
      api.shutdown({collectPendingData: true, timeout: 1000})
      agent.setState('started')
      mock.verify()
    })

    it('calls stop when timeout is reached and does not forceHarvestAll', function() {
      var mock = sinon.mock(agent)
      agent.setState('starting')
      mock.expects('forceHarvestAll').never()
      mock.expects('stop').once()
      api.shutdown({collectPendingData: true, timeout: 1000}, function() {
        mock.verify()
      })
    })

    it('calls forceHarvestAll when timeout is not a number', function() {
      var mock = sinon.mock(agent)
      agent.setState('starting')
      mock.expects('forceHarvestAll').once()
      api.shutdown({collectPendingData: true, timeout: "xyz"}, function() {
        mock.verify()
      })
    })

    it('does not error when timeout is not a number', function() {
      var mock = sinon.mock(agent)
      agent.setState('starting')

      var shutdown = function() {
        api.shutdown({collectPendingData: true, timeout: "abc"})
      }

      expect(shutdown).to.not.throw(Error)
      mock.verify()
    })

    it('calls stop after harvest', function() {
      var mock = sinon.mock(agent)

      agent.forceHarvestAll = function(cb) {
        setImmediate(cb)
      }

      mock.expects('stop').once()
      api.shutdown({collectPendingData: true}, function() {
        mock.verify()
      })
    })

    it('calls stop when harvest errors', function() {
      var mock = sinon.mock(agent)

      agent.forceHarvestAll = function(cb) {
        setImmediate(function() {
          cb(new Error('some error'))
        })
      }

      mock.expects('stop').once()
      api.shutdown({collectPendingData: true}, function() {
        mock.verify()
      })
    })

    it('accepts callback as second argument', function() {
      agent.stop = function(cb) {
        cb()
      }
      var callback = sinon.spy()
      api.shutdown({}, callback)
      expect(callback.called).to.be.true
    })

    it('accepts callback as first argument', function() {
      agent.stop = function(cb) {
        cb()
      }
      var callback = sinon.spy()
      api.shutdown(callback)
      expect(callback.called).to.be.true
    })

    it('does not error when no callback is provided', function() {
      expect(function() { api.shutdown() }).not.throws()
    })
  })

  describe('instrument', function() {
    beforeEach(function() {
      sinon.spy(shimmer, 'registerInstrumentation')
    })

    afterEach(function() {
      shimmer.registerInstrumentation.restore()
    })

    it('should register the instrumentation with shimmer', function() {
      var opts = {
        moduleName: 'foobar',
        onRequire: function() {}
      }
      api.instrument(opts)

      expect(shimmer.registerInstrumentation.calledOnce).to.be.true
      var args = shimmer.registerInstrumentation.getCall(0).args
      expect(args[0]).to.equal(opts)
    })

    it('should convert separate args into an options object', function() {
      function onRequire() {}
      function onError() {}
      api.instrument('foobar', onRequire, onError)

      var opts = shimmer.registerInstrumentation.getCall(0).args[0]
      expect(opts).to.have.property('moduleName', 'foobar')
      expect(opts).to.have.property('onRequire', onRequire)
      expect(opts).to.have.property('onError', onError)
    })
  })

  describe('instrumentConglomerate', () => {
    beforeEach(() => {
      sinon.spy(shimmer, 'registerInstrumentation')
    })

    afterEach(() => {
      shimmer.registerInstrumentation.restore()
    })

    it('should register the instrumentation with shimmer', () => {
      const opts = {
        moduleName: 'foobar',
        onRequire: () => {}
      }
      api.instrumentConglomerate(opts)

      expect(shimmer.registerInstrumentation.calledOnce).to.be.true
      const args = shimmer.registerInstrumentation.getCall(0).args
      expect(args[0]).to.equal(opts)
        .and.have.property('type', 'conglomerate')
    })

    it('should convert separate args into an options object', () => {
      function onRequire() {}
      function onError() {}
      api.instrumentConglomerate('foobar', onRequire, onError)

      const opts = shimmer.registerInstrumentation.getCall(0).args[0]
      expect(opts).to.have.property('moduleName', 'foobar')
      expect(opts).to.have.property('onRequire', onRequire)
      expect(opts).to.have.property('onError', onError)
    })
  })

  describe('instrumentDatastore', function() {
    beforeEach(function() {
      sinon.spy(shimmer, 'registerInstrumentation')
    })

    afterEach(function() {
      shimmer.registerInstrumentation.restore()
    })

    it('should register the instrumentation with shimmer', function() {
      var opts = {
        moduleName: 'foobar',
        onRequire: function() {}
      }
      api.instrumentDatastore(opts)

      expect(shimmer.registerInstrumentation.calledOnce).to.be.true
      var args = shimmer.registerInstrumentation.getCall(0).args
      expect(args[0]).to.equal(opts)
        .and.have.property('type', 'datastore')
    })

    it('should convert separate args into an options object', function() {
      function onRequire() {}
      function onError() {}
      api.instrumentDatastore('foobar', onRequire, onError)

      var opts = shimmer.registerInstrumentation.getCall(0).args[0]
      expect(opts).to.have.property('moduleName', 'foobar')
      expect(opts).to.have.property('onRequire', onRequire)
      expect(opts).to.have.property('onError', onError)
    })
  })

  describe('instrumentWebframework', function() {
    beforeEach(function() {
      sinon.spy(shimmer, 'registerInstrumentation')
    })

    afterEach(function() {
      shimmer.registerInstrumentation.restore()
    })

    it('should register the instrumentation with shimmer', function() {
      var opts = {
        moduleName: 'foobar',
        onRequire: function() {}
      }
      api.instrumentWebframework(opts)

      expect(shimmer.registerInstrumentation.calledOnce).to.be.true
      var args = shimmer.registerInstrumentation.getCall(0).args
      expect(args[0]).to.equal(opts)
        .and.have.property('type', 'web-framework')
    })

    it('should convert separate args into an options object', function() {
      function onRequire() {}
      function onError() {}
      api.instrumentWebframework('foobar', onRequire, onError)

      var opts = shimmer.registerInstrumentation.getCall(0).args[0]
      expect(opts).to.have.property('moduleName', 'foobar')
      expect(opts).to.have.property('onRequire', onRequire)
      expect(opts).to.have.property('onError', onError)
    })
  })

  describe('setLambdaHandler', () => {
    it('should report API supportability metric', () => {
      api.setLambdaHandler(() => {})

      const metric =
        agent.metrics.getMetric('Supportability/API/setLambdaHandler')
      expect(metric.callCount).to.equal(1)
    })
  })

  describe('getLinkingMetadata', () => {
    it('should return metadata necessary for linking data to a trace', () => {
      let metadata = api.getLinkingMetadata()

      expect(metadata['trace.id']).to.be.undefined
      expect(metadata['span.id']).to.be.undefined
      expect(metadata['entity.name']).to.equal('Monis Agent for Node.js tests')
      expect(metadata['entity.type']).to.equal('SERVICE')
      expect(metadata['entity.guid']).to.be.undefined
      expect(metadata.hostname).to.equal(agent.config.getHostnameSafe())

      // Test in a transaction
      helper.runInTransaction(agent, function() {
        metadata = api.getLinkingMetadata()
        // trace and span id are omitted when dt is disabled
        expect(metadata['trace.id']).to.be.undefined
        expect(metadata['span.id']).to.be.undefined
        expect(metadata['entity.name']).to.equal('Monis Agent for Node.js tests')
        expect(metadata['entity.type']).to.equal('SERVICE')
        expect(metadata['entity.guid']).to.be.undefined
        expect(metadata.hostname).to.equal(agent.config.getHostnameSafe())
      })

      // With DT enabled
      agent.config.distributed_tracing.enabled = true

      // Trace and span id are omitted when there is no active transaction
      expect(metadata['trace.id']).to.be.undefined
      expect(metadata['span.id']).to.be.undefined
      expect(metadata['entity.name']).to.equal('Monis Agent for Node.js tests')
      expect(metadata['entity.type']).to.equal('SERVICE')
      expect(metadata['entity.guid']).to.be.undefined
      expect(metadata.hostname).to.equal(agent.config.getHostnameSafe())

      // Test in a transaction
      helper.runInTransaction(agent, function() {
        metadata = api.getLinkingMetadata()
        expect(metadata['trace.id']).to.be.a('string')
        expect(metadata['span.id']).to.be.a('string')
        expect(metadata['entity.name']).to.equal('Monis Agent for Node.js tests')
        expect(metadata['entity.type']).to.equal('SERVICE')
        expect(metadata['entity.guid']).to.be.undefined
        expect(metadata.hostname).to.equal(agent.config.getHostnameSafe())
      })

      // Test with an entity_guid set and in a transaction
      helper.unloadAgent(agent)
      agent = helper.loadMockedAgent({
        entity_guid: 'test',
        distributed_tracing: { enabled: true }
      })
      api = new API(agent)
      helper.runInTransaction(agent, function() {
        metadata = api.getLinkingMetadata()
        expect(metadata['trace.id']).to.be.a('string')
        expect(metadata['span.id']).to.be.a('string')
        expect(metadata['entity.name']).to.equal('Monis Agent for Node.js tests')
        expect(metadata['entity.type']).to.equal('SERVICE')
        expect(metadata['entity.guid']).to.equal('test')
        expect(metadata.hostname).to.equal(agent.config.getHostnameSafe())
      })
    })
  })
})
