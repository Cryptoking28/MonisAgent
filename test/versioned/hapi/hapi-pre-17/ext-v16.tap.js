/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

var request = require('request')
var tap = require('tap')
var helper = require('../../../lib/agent_helper')
var utils = require('./hapi-utils')

tap.test('Hapi.ext', function(t) {
  t.autoend()

  var agent = null
  var server = null
  var port = null

  // queue that executes outside of a transaction context
  var tasks = []
  var intervalId = setInterval(function() {
    while (tasks.length) {
      var task = tasks.pop()
      task()
    }
  }, 10)

  t.teardown(function() {
    clearInterval(intervalId)
  })

  t.beforeEach(function() {
    agent = helper.instrumentMockedAgent()

    server = utils.getServer()
  })

  t.afterEach(function() {
    helper.unloadAgent(agent)
    return new Promise((resolve) => server.stop(resolve))
  })

  t.test('maintains transaction state', function(t) {
    server.ext('onRequest', function(req, reply) {
      t.ok(agent.getTransaction(), 'transaction is available')
      tasks.push(function() {
        reply.continue()
      })
    })

    addRouteAndGet(t)
  })

  t.test('maintains transaction state, with config object', function(t) {
    var config = {
      type: 'onRequest',
      method: function(req, reply) {
        t.ok(agent.getTransaction(), 'transaction is available')
        tasks.push(function() {
          reply.continue()
        })
      }
    }
    server.ext(config)

    addRouteAndGet(t)
  })

  t.test('maintains transaction state, with array of config objects', function(t) {
    var config = [
      {
        type: 'onRequest',
        method: function(req, reply) {
          t.ok(agent.getTransaction(), 'transaction is available')
          tasks.push(function() {
            reply.continue()
          })
        }
      }
    ]

    server.ext(config)

    addRouteAndGet(t)
  })

  t.test('does not crash on non-request events', function(t) {
    server.ext('onPreStart', function(s, next) {
      t.notOk(agent.getTransaction(), 'should not have transaction in server events')
      next()
    })

    addRouteAndGet(t)
  })

  function addRouteAndGet(t) {
    server.route({
      method: 'GET',
      path: '/test',
      handler: function myHandler(req, reply) {
        t.ok(agent.getTransaction(), 'transaction is available')
        reply()
      }
    })

    server.start(function() {
      port = server.info.port
      request.get('http://localhost:' + port + '/test', function() {
        t.end()
      })
    })
  }
})
