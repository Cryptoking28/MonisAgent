'use strict'

const tap = require('tap')
// TODO: convert to normal tap style.
// Below allows use of mocha DSL with tap runner.
tap.mochaGlobals()

var API = require('../../../api')
var chai = require('chai')
var expect = chai.expect
var helper = require('../../lib/agent_helper')
var sinon = require('sinon')
var shimmer = require('../../../lib/shimmer')

describe('the Monis Agent agent API', function() {
  var agent
  var api

  beforeEach(function() {
    agent = helper.loadMockedAgent()
    api = new API(agent)
  })

  afterEach(function() {
    helper.unloadAgent(agent)
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
