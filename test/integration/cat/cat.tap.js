'use strict'

var test = require('tap').test
var helper = require('../../lib/agent_helper')
var hashes = require('../../../lib/util/hashes')
var API = require('../../../api')
var format = require('util').format

// constants
const START_PORT = 10000
const MIDDLE_PORT = 10001
const END_PORT = 10002
const CROSS_PROCESS_ID = '1337#7331'
const TX_NAME = 'WebTransaction/Nodejs/GET//middle/end'


test('cross application tracing full integration', function(t) {
  t.plan(57)
  var config = {
    cross_application_tracer: {enabled: true},
    trusted_account_ids: [1337],
    cross_process_id: CROSS_PROCESS_ID,
    encoding_key: 'some key',
  }
  config.obfuscatedId = hashes.obfuscateNameUsingKey(
    config.cross_process_id,
    config.encoding_key
  )
  const agent = helper.instrumentMockedAgent(config)

  // require http after creating the agent
  const http = require('http')
  const api = new API(agent)

  var serversToStart = 3
  function started() {
    serversToStart -= 1
    if (serversToStart === 0) {
      runTest()
    }
  }

  // Naming is how the requests will flow through the system, to test that all
  // metrics are generated as expected as well as the dirac events.
  var start = generateServer(http, api, START_PORT, started, function(req, res) {
    var tx = agent.tracer.getTransaction()
    tx.nameState.appendPath('foobar')
    http.get(generateUrl(MIDDLE_PORT, 'start/middle'), function(externRes) {
      externRes.resume()
      externRes.on('end', function() {
        tx.nameState.popPath('foobar')
        res.end()
      })
    })
  })

  var middle = generateServer(http, api, MIDDLE_PORT, started, function(req, res) {
    t.ok(req.headers['x-monisagent-id'], 'middle received x-monisagent-id from start')
    t.ok(
      req.headers['x-monisagent-transaction'],
      'middle received x-monisagent-transaction from start'
    )

    var tx = agent.tracer.getTransaction()
    tx.nameState.appendPath('foobar')
    http.get(generateUrl(END_PORT, 'middle/end'), function(externRes) {
      externRes.resume()
      externRes.on('end', function() {
        tx.nameState.popPath('foobar')
        res.end()
      })
    })
  })

  var end = generateServer(http, api, END_PORT, started, function(req, res) {
    t.ok(req.headers['x-monisagent-id'], 'end received x-monisagent-id from middle')
    t.ok(
      req.headers['x-monisagent-transaction'],
      'end received x-monisagent-transaction from middle'
    )
    res.end()
  })

  function runTest() {
    http.get(generateUrl(START_PORT, 'start'), function(res) {
      res.resume()
      start.close()
      middle.close()
      end.close()
    })
    var txCount = 0

    agent.on('transactionFinished', function(trans) {
      var event = agent.events.toArray().filter(function(evt) {
        return evt[0]['nr.guid'] === trans.id
      })[0]
      transInspector[txCount](trans, event)
      txCount += 1
    })
  }
  var transInspector = [
    function endTest(trans, event) {
      // Check the unscoped metrics
      var unscoped = trans.metrics.unscoped
      var caMetric = format('ClientApplication/%s/all', CROSS_PROCESS_ID)
      t.ok(unscoped[caMetric], 'end generated a ClientApplication metric')
      t.equal(
        Object.keys(unscoped).length, 8,
        'end should only have expected unscoped metrics'
      )
      t.equal(
        Object.keys(trans.metrics.scoped).length, 0,
        'should have no scoped metrics'
      )

      // Check the intrinsic attributes
      var trace = trans.trace
      t.ok(trace.intrinsics.trip_id, 'end should have a trip_id variable')
      t.ok(trace.intrinsics.path_hash, 'end should have a path_hash variable')
      t.ok(
        trace.intrinsics.client_cross_process_id,
        'end should have a client_cross_process_id variable'
      )
      t.ok(
        trace.intrinsics.referring_transaction_guid,
        'end should have a referring_transaction_guid variable'
      )

      // check the insights event.
      var intrinsic = event[0]
      t.equal(intrinsic.name, TX_NAME, 'end event has name')
      t.ok(intrinsic['nr.guid'], 'end should have an nr.guid on event')
      t.ok(intrinsic['nr.tripId'], 'end should have an nr.tripId on event')
      t.ok(intrinsic['nr.pathHash'], 'end should have an nr.pathHash on event')
      t.ok(
        intrinsic['nr.referringPathHash'],
        'end should have an nr.referringPathHash on event'
      )
      t.ok(
        intrinsic['nr.referringTransactionGuid'],
        'end should have an nr.referringTransactionGuid on event'
      )
      t.notOk(
        intrinsic['nr.alternatePathHashes'],
        'end should not have an nr.alternatePathHashes on event'
      )
    },
    function middleTest(trans, event) {
      // check the unscoped metrics
      var unscoped = trans.metrics.unscoped
      var caMetric = format('ClientApplication/%s/all', CROSS_PROCESS_ID)
      t.ok(unscoped[caMetric], 'middle generated a ClientApplication metric')
      var eaMetric = format('ExternalApp/localhost:%s/%s/all', END_PORT, CROSS_PROCESS_ID)
      t.ok(unscoped[eaMetric], 'middle generated a ExternalApp metric')
      var etMetric = format(
        'ExternalTransaction/localhost:%s/%s/%s',
        END_PORT, CROSS_PROCESS_ID, TX_NAME
      )
      t.ok(unscoped[etMetric], 'middle generated a ExternalTransaction metric')
      t.equal(
        Object.keys(unscoped).length, 14,
        'middle should only have expected unscoped metrics'
      )

      // check the scoped metrics
      var scoped = trans.metrics.scoped
      t.ok(
        scoped['WebTransaction/Nodejs/GET//start/middle'],
        'middle generated a scoped metric block'
      )
      if (scoped['WebTransaction/Nodejs/GET//start/middle']) {
        t.ok(
          scoped['WebTransaction/Nodejs/GET//start/middle'][etMetric],
          'middle generated a ExternalTransaction scoped metric'
        )
        var scopedKeys = Object.keys(scoped['WebTransaction/Nodejs/GET//start/middle'])
        t.equal(
          scopedKeys.length, 1,
          'middle should only be the inbound and outbound request.'
        )
        t.deepEqual(scopedKeys, [etMetric], 'should have expected scoped metric name')
      }

      // check the intrinsic attributes
      var trace = trans.trace
      t.ok(trace.intrinsics.trip_id, 'middle should have a trip_id variable')
      t.ok(trace.intrinsics.path_hash, 'middle should have a path_hash variable')
      t.ok(
        trace.intrinsics.client_cross_process_id,
        'middle should have a client_cross_process_id variable'
      )
      t.ok(
        trace.intrinsics.referring_transaction_guid,
        'middle should have a referring_transaction_guid variable'
      )

      // check the external segment for its properties
      var externalSegment =
        trace.root.children[0].children[trace.root.children[0].children.length - 1]
      t.equal(
        externalSegment.name.split('/')[0], 'ExternalTransaction',
        'middle should have an ExternalTransaction segment'
      )
      t.ok(
        externalSegment.getAttributes().transaction_guid,
        'middle should have a transaction_guid on its external segment'
      )

      // check the insights event
      var intrinsic = event[0]
      t.ok(intrinsic['nr.guid'], 'middle should have an nr.guid on event')
      t.ok(intrinsic['nr.tripId'], 'middle should have an nr.tripId on event')
      t.ok(intrinsic['nr.pathHash'], 'middle should have an nr.pathHash on event')
      t.ok(
        intrinsic['nr.referringPathHash'],
        'middle should have an nr.referringPathHash on event'
      )
      t.ok(
        intrinsic['nr.referringTransactionGuid'],
        'middle should have an nr.referringTransactionGuid on event'
      )
      t.ok(
        intrinsic['nr.alternatePathHashes'],
        'middle should have an nr.alternatePathHashes on event'
      )
    },
    function startTest(trans, event) {
      // check the unscoped metrics
      var unscoped = trans.metrics.unscoped
      var eaMetric = format(
        'ExternalApp/localhost:%s/%s/all',
        MIDDLE_PORT, CROSS_PROCESS_ID
      )
      t.ok(unscoped[eaMetric], 'start generated a ExternalApp metric')
      var etMetric = format(
        'ExternalTransaction/localhost:%s/%s/WebTransaction/Nodejs/GET//start/middle',
        MIDDLE_PORT, CROSS_PROCESS_ID
      )
      t.ok(unscoped[etMetric], 'start generated a ExternalTransaction metric')
      t.equal(
        Object.keys(unscoped).length, 13,
        'start should only have expected unscoped metrics'
      )

      // check the scoped metrics
      var scoped = trans.metrics.scoped
      t.ok(
        scoped['WebTransaction/Nodejs/GET//start'],
        'start generated a scoped metric block'
      )
      if (scoped['WebTransaction/Nodejs/GET//start']) {
        t.ok(
          scoped['WebTransaction/Nodejs/GET//start'][etMetric],
          'start generated a ExternalTransaction scoped metric'
        )
        var scopedKeys = Object.keys(scoped['WebTransaction/Nodejs/GET//start'])
        t.equal(
          scopedKeys.length, 1,
          'start should only be the inbound and outbound request.'
        )
        t.deepEqual(scopedKeys, [etMetric], 'should have expected scoped metric name')
      }

      // check the intrinsic attributes
      var trace = trans.trace
      t.ok(trace.intrinsics.trip_id, 'start should have a trip_id variable')
      t.ok(trace.intrinsics.path_hash, 'start should have a path_hash variable')
      t.notOk(
        trace.intrinsics.client_cross_process_id,
        'start should not have a client_cross_process_id variable'
      )
      t.notOk(
        trace.intrinsics.referring_transaction_guid,
        'start should not have a referring_transaction_guid variable'
      )

      // check the external segment for its properties
      var externalSegment =
        trace.root.children[0].children[trace.root.children[0].children.length - 1]
      t.equal(
        externalSegment.name.split('/')[0], 'ExternalTransaction',
        'start should have an ExternalTransaction segment'
      )
      t.ok(
        externalSegment.getAttributes().transaction_guid,
        'start should have a transaction_guid on its external segment'
      )

      // check the insights event
      var intrinsic = event[0]
      t.ok(intrinsic['nr.guid'], 'start should have an nr.guid on event')
      t.ok(intrinsic['nr.tripId'], 'start should have an nr.tripId on event')
      t.ok(intrinsic['nr.pathHash'], 'start should have an nr.pathHash on event')
      t.notOk(
        intrinsic['nr.referringPathHash'],
        'start should not have an nr.referringPathHash on event'
      )
      t.notOk(
        intrinsic['nr.referringTransactionGuid'],
        'start should not have an nr.referringTransactionGuid on event'
      )
      t.ok(
        intrinsic['nr.alternatePathHashes'],
        'start should have an nr.alternatePathHashes on event'
      )

      t.end()
    }
  ]
})

function generateServer(http, api, port, started, responseHandler) {
  var server = http.createServer(function(req, res) {
    var tx = api.agent.getTransaction()
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
