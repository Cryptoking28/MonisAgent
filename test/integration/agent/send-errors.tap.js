'use strict'

var helper = require('../../lib/agent_helper')
var tap = require('tap')

var DESTS = require('../../../lib/config/attribute-filter').DESTINATIONS


tap.test('Agent#_sendErrors', function(t) {
  t.plan(2)

  var config = {
    app_name: 'node.js Tests',
    license_key: 'd67afc830dab717fd163bfcb0b8b88423e9a1a3b',
    host: 'staging-collector.monisagent.com',
    port: 443,
    ssl: true,
    utilization: {
      detect_aws: false,
      detect_pcf: false,
      detect_gcp: false,
      detect_docker: false
    },
    logging: {
      level: 'trace'
    },
    attributes: {
      enabled: true
    }
  }

  t.test('with ssl', function(t) {
    var agent = setupAgent(t, config)
    _testSendErrors(t, agent)
  })

  function _testSendErrors(t, agent) {
    t.plan(6)

    agent.start(function(err) {
      if (!t.notOk(err, 'should connect without error')) {
        return t.end()
      }

      agent.collector.errorData = function(payload, cb) {
        if (!t.ok(payload, 'should get the payload')) {
          return cb()
        }

        var errData = payload[1][0][4]
        if (!t.ok(errData, 'should contain error information')) {
          return cb()
        }

        var attrs = errData.agentAttributes
        t.deepEqual(
          attrs,
          {foo: 'bar', 'request.uri': '/nonexistent'},
          'should have the correct attributes'
        )

        cb()
      }

      agent.on('transactionFinished', function() {
        agent._sendErrors(function(error) {
          if (!t.notOk(error, "sent errors without error")) {
            return t.end()
          }

          agent.stop(function(error) {
            t.notOk(error, "stopped without error")
            t.end()
          })
        })
      })

      helper.runInTransaction(agent, function(tx) {
        tx.finalizeNameFromUri('/nonexistent', 501)
        tx.trace.addAttribute(DESTS.ERROR_EVENT, 'foo', 'bar')
        tx.trace.addAttribute(DESTS.ERROR_EVENT, 'request.uri', '/nonexistent')
        agent.errors.add(tx, new Error('test error'))
        tx.end()
      })
    })
  }
})

function setupAgent(t, config) {
  var agent = helper.loadMockedAgent(null, config)
  t.tearDown(function() {
    helper.unloadAgent(agent)
  })
  return agent
}
