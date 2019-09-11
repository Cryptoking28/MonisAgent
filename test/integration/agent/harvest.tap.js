'use strict'

const helper = require('../../lib/agent_helper')
const sinon = require('sinon')
const tap = require('tap')
const https = require('https')

tap.test('Agent#harvest', (t) => {
  t.autoend()

  let agent = null
  let requestSpy = null
  let headersMap = null

  t.beforeEach((done) => {
    agent = helper.instrumentMockedAgent({
      ssl: true,
      app_name: 'node.js Tests',
      license_key: 'd67afc830dab717fd163bfcb0b8b88423e9a1a3b',
      host: 'staging-collector.monisagent.com',
      port: 443,
      ssl: true,
      utilization: {
        detect_aws: false,
        detect_pcf: false,
        detect_azure: false,
        detect_gcp: false,
        detect_docker: false
      },
      logging: {
        level: 'trace'
      },
      attributes: {enabled: true}
    })

    requestSpy = sinon.spy(https, 'request')

    agent.start(() => {
      headersMap = agent.collector._reqHeadersMap || {}
      done()
    })
  })

  t.afterEach((done) => {
    helper.unloadAgent(agent)
    requestSpy.restore()
    agent.stop((err) => {
      done(err)
    })
  })

  t.test('simple harvest', (t) => {
    agent.metrics.measureMilliseconds('TEST/discard', null, 101)

    var transaction
    var proxy = agent.tracer.transactionProxy(function() {
      transaction = agent.getTransaction()
      transaction.finalizeNameFromUri('/nonexistent', 501)
    })
    proxy()
    // ensure it's slow enough to get traced
    transaction.trace.setDurationInMillis(5001)
    transaction.end()
    t.ok(agent.traces.trace, 'have a slow trace to send')

    agent.harvest(function(error) {
      t.error(error, 'harvest ran correctly')
      t.end()
    })
  })

  t.test('sending metrics', (t) => {
    t.plan(6)
    agent.metrics.measureMilliseconds('TEST/discard', null, 101)

    var metrics = agent.metrics.toJSON()
    t.ok(findMetric(metrics, 'TEST/discard'), 'the test metric should be present')

    const spy = sinon.spy(agent.collector, 'metricData')
    t.tearDown(() => spy.restore())

    agent.harvest((error) => {
      t.error(error, 'should send metrics without error')

      t.ok(spy.called, 'should send metric data')

      // Verify mapped headers are sent in metrics POST
      const metricsRequest = requestSpy.args[3][0]
      checkHeaders(t, headersMap, metricsRequest.headers)

      const payload = spy.args[0][0]
      t.ok(payload, 'should have payload')
      t.deepEqual(payload[3][0][0], {name: 'TEST/discard'}, 'should have test metric')

      t.end()
    })
  })

  t.test('sending span events', (t) => {
    t.plan(7)

    agent.config.distributed_tracing.enabled = true
    agent.config.span_events.enabled = true

    const spy = sinon.spy(agent.collector, 'spanEvents')
    t.tearDown(() => spy.restore())

    helper.runInTransaction(agent, (tx) => {
      setTimeout(() => {
        // Just to create an extra span.
        tx.finalizeNameFromUri('/some/path', 200)
        tx.end()
        doHarvest()
      }, 10)
    })

    function doHarvest() {
      // Timeout + callback spans. Root segment does not become a span.
      t.equal(agent.spans.length, 2, 'have spans to send')

      agent.harvest((error) => {
        t.error(error, 'trace sent correctly')

        t.ok(spy.called, 'should send span event data')

        // Verify mapped headers are sent in spans POST
        const spansRequestArg = requestSpy.args.filter((input) => {
          return input[0].path.includes('span_event_data')
        })
        const spansRequest = spansRequestArg[0][0]
        checkHeaders(t, headersMap, spansRequest.headers)

        const payload = spy.args[0][0]
        t.ok(payload, 'should have trace payload')
        t.type(payload[2], 'Array', 'should have spans')
        t.equal(payload[2].length, 2, 'should have all spans')

        t.end()
      })
    }
  })
})

function findMetric(metrics, name) {
  for (var i = 0; i < metrics.length; i++) {
    var metric = metrics[i]
    if (metric[0].name === name) return metric
  }
}

function checkHeaders(t, mappedHeaders, headers) {
  const keys = Object.keys(mappedHeaders)
  t.ok(
    keys.every((key) => headers[key] === mappedHeaders[key]),
    `All expected headers from connect included in request (${keys.length})`
  )
}
