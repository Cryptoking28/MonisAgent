'use strict'

var test = require('tap').test
var EventEmitter = require('events').EventEmitter


test('loading the agent with a bad version', {timeout: 5000}, function(t) {
  var agent = null

  process.env.NEW_RELIC_HOME = __dirname + '/..'
  process.env.NEW_RELIC_HOST = 'staging-collector.monisagent.com'
  process.env.NEW_RELIC_LICENSE_KEY = 'd67afc830dab717fd163bfcb0b8b88423e9a1a3b'

  t.doesNotThrow(function() {
    // in order to sub out the readonly version we have to make a full
    // copy of process, then restore the original when we are done
    var _process = process
    global.process = new EventEmitter()

    var keys = Object.keys(_process)
    for (var i = 0; i < keys.length; ++i) {
      var key = keys[i]
      if (key === 'version') {
        process[key] = 'garbage'
      } else {
        process[key] = _process[key]
      }
    }

    var api = require('../../../index.js')
    agent = api.agent
    t.ok(agent)

    global.process = _process
  }, "malformed process.version doesn't blow up the process")
  if (!t.passing()) {
    t.comment('Bailing out early.')
    return t.end()
  }

  function shutdown() {
    t.equal(agent._state, 'started', "agent didn't error connecting to staging")
    t.deepEquals(agent.config.applications(), ['My Application'], "app name is valid")
    t.equals(agent.config.agent_enabled, true, "the agent is still enabled")

    agent.stop(function cb_stop(err) {
      t.notOk(err, 'should not error when stopping')
      t.equal(agent._state, 'stopped', "agent didn't error shutting down")

      t.end()
    })
  }

  agent.once('errored', shutdown)
  agent.once('started', shutdown)
})
