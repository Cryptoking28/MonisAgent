'use strict'

var tap = require('tap')
var request = require('request')
var helper = require('../../../lib/agent_helper')
var utils = require('./hapi-utils')

tap.test('Hapi router introspection', function(t) {
  t.autoend()

  var agent = null
  var server = null
  var port = null

  t.beforeEach(function(done) {
    agent = helper.instrumentMockedAgent()
    server = utils.getServer()

    // disabled by default
    agent.config.capture_params = true

    done()
  })

  t.afterEach(function(done) {
    helper.unloadAgent(agent)
    server.stop(done)
  })

  t.test('using route handler - simple case', function(t) {
    agent.on('transactionFinished', utils.verifier(t))

    var route = {
      method: 'GET',
      path: '/test/{id}',
      handler: function(request, reply) {
        t.ok(agent.getTransaction(), 'transaction is available')
        reply({status: 'ok'})
      }
    }
    server.route(route)

    server.start(function() {
      port = server.info.port
      var params = {
        uri: 'http://localhost:' + port + '/test/31337',
        json: true
      }
      request.get(params, function(error, res, body) {
        t.equal(res.statusCode, 200, 'nothing exploded')
        t.deepEqual(body, {status: 'ok'}, 'got expected response')
        t.end()
      })
    })
  })

  t.test('using route handler under config object', function(t) {
    agent.on('transactionFinished', utils.verifier(t))

    var hello = {
      handler: function(request, reply) {
        t.ok(agent.getTransaction(), 'transaction is available')
        reply({status: 'ok'})
      }
    }

    var route = {
      method: 'GET',
      path: '/test/{id}',
      config: hello
    }
    server.route(route)

    server.start(function() {
      port = server.info.port
      var params = {
        uri: 'http://localhost:' + port + '/test/31337',
        json: true
      }
      request.get(params, function(error, res, body) {
        t.equal(res.statusCode, 200, 'nothing exploded')
        t.deepEqual(body, {status: 'ok'}, 'got expected response')
        t.end()
      })
    })
  })

  t.test('using `pre` config option', function(t) {
    agent.on('transactionFinished', utils.verifier(t))

    var route = {
      method: 'GET',
      path: '/test/{id}',
      config: {
        pre: [
          function plain(request, reply) {
            t.ok(agent.getTransaction(), 'transaction available in plain `pre` function')
            reply()
          },
          [
            {
              method: function nested(request, reply) {
                t.ok(
                  agent.getTransaction(),
                  'transaction available in nested `pre` function'
                )
                reply()
              }
            }
          ]
        ],
        handler: function(request, reply) {
          t.ok(agent.getTransaction(), 'transaction is available in final handler')
          reply({status: 'ok'})
        }
      }
    }
    server.route(route)

    server.start(function() {
      port = server.info.port
      var params = {
        uri: 'http://localhost:' + port + '/test/31337',
        json: true
      }
      request.get(params, function(error, res, body) {
        t.equal(res.statusCode, 200, 'nothing exploded')
        t.deepEqual(body, {status: 'ok'}, 'got expected response')
        t.end()
      })
    })
  })

  t.test('using custom handler type', function(t) {
    agent.on('transactionFinished', utils.verifier(t))

    server.handler('hello', function() {
      return function customHandler(request, reply) {
        t.ok(agent.getTransaction(), 'transaction is available')
        reply({status: 'ok'})
      }
    })

    var route = {
      method: 'GET',
      path: '/test/{id}',
      handler: {
        hello: {}
      }
    }
    server.route(route)

    server.start(function() {
      port = server.info.port
      var params = {
        uri: 'http://localhost:' + port + '/test/31337',
        json: true
      }
      request.get(params, function(error, res, body) {
        t.equal(res.statusCode, 200, 'nothing exploded')
        t.deepEqual(body, {status: 'ok'}, 'got expected response')
        t.end()
      })
    })
  })

  /*
   * This test covers the use case of placing defaults on the handler
   * function.
   * for example: https://github.com/hapijs/h2o2/blob/v6.0.1/lib/index.js#L189-L198
   */
  t.test('using custom handler defaults', function(t) {
    agent.on('transactionFinished', utils.verifier(t, 'POST'))
    function handler(route) {
      t.equal(
        route.settings.payload.parse,
        false,
        'should set the payload parse setting'
      )

      t.equal(
        route.settings.payload.output,
        'stream',
        'should set the payload output setting'
      )

      return function customHandler(request, reply) {
        t.ok(agent.getTransaction(), 'transaction is available')
        reply({status: 'ok'})
      }
    }

    handler.defaults = {
      payload: {
        output: 'stream',
        parse: false
      }
    }

    server.handler('hello', handler)

    var route = {
      method: 'POST',
      path: '/test/{id}',
      handler: {
        hello: {}
      }
    }
    server.route(route)

    server.start(function() {
      port = server.info.port
      var params = {
        uri: 'http://localhost:' + port + '/test/31337',
        json: true
      }
      request.post(params, function(error, res, body) {
          t.equal(res.statusCode, 200, 'nothing exploded')
          t.deepEqual(body, {status: 'ok'}, 'got expected response')
          t.end()
        }
      )
    })
  })
})
