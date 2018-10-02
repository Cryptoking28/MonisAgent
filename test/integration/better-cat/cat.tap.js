'use strict'

const tap = require('tap')
const helper = require('../../lib/agent_helper')
const API = require('../../../api')

const START_PORT = 10000
const MIDDLE_PORT = 10001
const END_PORT = 10002
const ACCOUNT_ID = '1337'
const APP_ID = '7331'
const EXPECTED_DT_METRICS = ['DurationByCaller', 'TransportDuration']
const EXTERNAL_METRIC_SUFFIXES = ['all', 'http']

let compareSampled = null

tap.test('cross application tracing full integration', (t) => {
  t.plan(79)
  const config = {
    distributed_tracing: {
      enabled: true
    },
    cross_application_tracer: {enabled: true},
    account_id: ACCOUNT_ID,
    primary_application_id: APP_ID,
    trusted_account_key: ACCOUNT_ID,
    encoding_key: 'some key',
  }
  const agent = helper.instrumentMockedAgent(null, config)
  agent.config.account_id = ACCOUNT_ID
  agent.config.application_id = APP_ID
  agent.config.trusted_account_key = ACCOUNT_ID
  // require http after creating the agent
  const http = require('http')
  const api = new API(agent)

  var firstExternalId
  var secondExternalId

  let serversToStart = 3
  function started() {
    serversToStart -= 1
    if (serversToStart === 0) {
      runTest()
    }
  }

  // Naming is how the requests will flow through the system, to test that all
  // metrics are generated as expected as well as the dirac events.
  const start = generateServer(http, api, START_PORT, started, (req, res) => {
    const tx = agent.tracer.getTransaction()
    tx.nameState.appendPath('foobar')
    http.get(generateUrl(MIDDLE_PORT, 'start/middle'), (externRes) => {
      firstExternalId = agent.tracer.getSegment().id
      externRes.resume()
      externRes.on('end', () => {
        tx.nameState.popPath('foobar')
        res.end()
      })
    })
  })

  const middle = generateServer(http, api, MIDDLE_PORT, started, (req, res) => {
    t.ok(req.headers.monisagent, 'middle received monisagent from start')

    const tx = agent.tracer.getTransaction()
    tx.nameState.appendPath('foobar')
    http.get(generateUrl(END_PORT, 'middle/end'), (externRes) => {
      secondExternalId = agent.tracer.getSegment().id
      externRes.resume()
      externRes.on('end', () => {
        tx.nameState.popPath('foobar')
        res.end()
      })
    })
  })

  const end = generateServer(http, api, END_PORT, started, (req, res) => {
    t.ok(req.headers.monisagent, 'end received monisagent from middle')
    res.end()
  })

  function runTest() {
    http.get(generateUrl(START_PORT, 'start'), (res) => {
      res.resume()
      start.close()
      middle.close()
      end.close()
    })
    var txCount = 0

    const testsToCheck = []
    agent.on('transactionFinished', (trans) => {
      const event = agent.events.toArray().filter((evt) => {
        return evt[0].guid === trans.id
      })[0]
      testsToCheck.push(transInspector[txCount].bind(this, trans, event))
      if (++txCount === 3) {
        testsToCheck.map((test) => test())
      }
    })
  }

  var transInspector = [
    function endTest(trans, event) {
      // Check the unscoped metrics
      const unscoped = trans.metrics.unscoped

      EXPECTED_DT_METRICS.forEach((name) => {
        const metric = `${name}/App/${ACCOUNT_ID}/${APP_ID}/HTTP/all`
        t.ok(unscoped[metric], `end generated a ${name} metric`)
        t.ok(unscoped[`${metric}Web`], `end generated a ${name} (Web) metric`)
      })

      t.equal(
        Object.keys(unscoped).length, 11,
        'end should only have expected unscoped metrics'
      )
      t.equal(
        Object.keys(trans.metrics.scoped).length, 0,
        'should have no scoped metrics'
      )
      // check the intrinsic parameters
      validateIntrinsics(t, trans.trace.intrinsics, 'end', 'trace')

      // check the insights event
      const intrinsic = event[0]

      compareSampled = currySampled(t, {
        sampled: intrinsic.sampled,
        priority: intrinsic.priority
      })

      validateIntrinsics(t, intrinsic, 'end', 'event', secondExternalId)
    },
    function middleTest(trans, event) {
      // check the unscoped metrics
      var unscoped = trans.metrics.unscoped

      EXPECTED_DT_METRICS.forEach((name) => {
        const metric = `${name}/App/${ACCOUNT_ID}/${APP_ID}/HTTP/all`
        t.ok(unscoped[metric], `middle generated a ${name} metric`)
        t.ok(unscoped[`${metric}Web`], `middle generated a ${name} (Web) metric`)
      })

      const external = `External/localhost:${END_PORT}/`
      EXTERNAL_METRIC_SUFFIXES.forEach((suf) => {
        t.ok(
          unscoped[external + suf],
          `middle generated expected External metric (/${suf})`
        )
      })

      t.equal(
        Object.keys(unscoped).length, 15,
        'middle should only have expected unscoped metrics'
      )

      // check the scoped metrics
      const scoped = trans.metrics.scoped
      const middleMetric = scoped['WebTransaction/Nodejs/GET//start/middle']
      t.ok(middleMetric, 'middle generated a scoped metric block')
      t.ok(
        middleMetric[external + 'http'],
        'middle generated an External scoped metric'
      )
      const scopedKeys = Object.keys(middleMetric)
      t.equal(
        scopedKeys.length, 1,
        'middle should only be the inbound and outbound request.'
      )
      t.deepEqual(
        scopedKeys,
        ['External/localhost:10002/http'],
        'should have expected scoped metric name'
      )

      // check the intrinsic parameters
      validateIntrinsics(t, trans.trace.intrinsics, 'middle', 'trace')

      // check the insights event
      const intrinsic = event[0]

      compareSampled({
        sampled: intrinsic.sampled,
        priority: intrinsic.priority
      })

      validateIntrinsics(t, intrinsic, 'middle', 'event', firstExternalId)
    },
    function startTest(trans, event) {
      // check the unscoped metrics
      var unscoped = trans.metrics.unscoped

      const metric = 'DurationByCaller/Unknown/Unknown/Unknown/Unknown/all'
      t.ok(unscoped[metric], 'start has expected DT unscoped metric')

      const external = `External/localhost:${MIDDLE_PORT}/`
      EXTERNAL_METRIC_SUFFIXES.forEach((suf) => {
        t.ok(
          unscoped[external + suf],
          `start generated expected External metric (/${suf})`
        )
      })

      t.equal(
        Object.keys(unscoped).length, 13,
        'start should only have expected unscoped metrics'
      )
      // check the scoped metrics
      const scoped = trans.metrics.scoped
      const startMetric = scoped['WebTransaction/Nodejs/GET//start']
      t.ok(startMetric, 'start generated a scoped metric block')
      t.ok(
        startMetric[external + 'http'],
        'start generated an External scoped metric'
      )
      const scopedKeys = Object.keys(startMetric)
      t.equal(
        scopedKeys.length, 1,
        'start should only be the inbound and outbound request.'
      )
      t.deepEqual(
        scopedKeys,
        ['External/localhost:10001/http'],
        'should have expected scoped metric name'
      )

      // check the intrinsic parameters
      validateIntrinsics(t, trans.trace.intrinsics, 'start', 'trace')

      // check the insights event
      const intrinsic = event[0]

      compareSampled({
        sampled: intrinsic.sampled,
        priority: intrinsic.priority
      })

      validateIntrinsics(t, intrinsic, 'start', 'event')

      t.end()
    }
  ]
})

function generateServer(http, api, port, started, responseHandler) {
  const server = http.createServer((req, res) => {
    const tx = api.agent.getTransaction()
    tx.nameState.appendPath(req.url)
    req.resume()
    responseHandler(req, res)
  })
  server.listen(port, started)
  return server
}

function generateUrl(port, endpoint) {
  return 'http://localhost:' + port + '/' + endpoint
}

function currySampled(t, a) {
  return (b) => {
    b = b || a
    t.ok(
      a.sampled === b.sampled && a.priority === b.priority,
      'sampled values and priority persist across transactions'
    )
    a = b
    return b
  }
}

function validateIntrinsics(t, intrinsic, reqName, type, parentSpanId) {
  reqName = reqName || 'start'
  type = type || 'event'

  t.ok(intrinsic.guid, `${reqName} should have a guid on ${type}`)
  t.ok(intrinsic.traceId, `${reqName} should have a traceId on ${type}`)
  t.ok(intrinsic.sampled != null, `${reqName} should have a sampled boolean on ${type}`)
  t.ok(intrinsic.priority, `${reqName} should have a priority on ${type}`)

  if (reqName === 'start') {
    t.notOk(intrinsic.parentId, `${reqName} should not have a parentId on ${type}`)
    return
  }

  if (type !== 'trace') {
    t.ok(intrinsic.parentId, `${reqName} should have a parentId on ${type}`)
    t.equal(
      intrinsic.parentSpanId,
      parentSpanId,
      `${reqName} should have a parentSpanId of ${parentSpanId} on ${type}`
    )
  }
  t.ok(intrinsic['parent.app'], `${reqName} should have a parent app on ${type}`)
  t.ok(intrinsic['parent.type'], `${reqName} should have a parent type on ${type}`)
  t.ok(intrinsic['parent.account'], `${reqName} should have a parent account on ${type}`)
  t.ok(
    intrinsic['parent.transportType'],
    `${reqName} should have a parent transportType on ${type}`
  )
  t.ok(
    intrinsic['parent.transportDuration'],
    `${reqName} should have a parent transportDuration on ${type}`
  )
}
