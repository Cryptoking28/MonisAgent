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

  t.test('sending traces', (t) => {
    t.plan(7)

    const spy = sinon.spy(agent.collector, 'transactionSampleData')
    t.tearDown(() => spy.restore())

    var transaction
    var proxy = agent.tracer.transactionProxy(() => {
      transaction = agent.getTransaction()
      transaction.finalizeNameFromUri('/nonexistent', 200)
    })
    proxy()

    // ensure it's slow enough to get traced
    transaction.trace.setDurationInMillis(5001)
    transaction.end()
    t.ok(agent.traces.trace, 'have a slow trace to send')

    agent.harvest((error) => {
      t.error(error, 'trace sent correctly')

      t.ok(spy.called, 'should send sample trace data')

      // Verify mapped headers are sent in traces POST
      const tracesRequestArg = requestSpy.args.filter((input) => {
        return input[0].path.includes('transaction_sample_data')
      })

      const tracesRequest = tracesRequestArg[0][0]
      checkHeaders(t, headersMap, tracesRequest.headers)

      const payload = spy.args[0][0]
      t.ok(payload, 'should have trace payload')
      t.type(payload[1][0], 'Array', 'should have trace')
      t.type(payload[1][0][4], 'string', 'should have encoded trace')

      t.end()
    })
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
