'use strict'

// shut up, Express
process.env.NODE_ENV = 'test'

var DESTINATIONS = require('../../../lib/config/attribute-filter').DESTINATIONS
var tap = require('tap')
var helper = require('../../lib/agent_helper')
var HTTP_ATTS = require('../../lib/fixtures').httpAttributes


// CONSTANTS
var TEST_HOST = 'localhost'
var TEST_URL = 'http://' + TEST_HOST + ':'


tap.test('test attributes.enabled for express', function(t) {
  t.autoend()

  t.test('no variables', function(t) {
    var agent = helper.instrumentMockedAgent({
      express4: true,
      send_request_uri_attribute: true
    })
    var app = require('express')()
    var server = require('http').createServer(app)
    var port = null

    t.tearDown(function() {
      server.close()
      helper.unloadAgent(agent)
    })

    // set apdexT so apdex stats will be recorded
    agent.config.apdex_t = 1

    // set attributes.enabled so we get the data we need.
    agent.config.attributes.enabled = true

    app.get('/user/', function(req, res) {
      t.ok(agent.getTransaction(), 'transaction is available')

      res.send({yep : true})
      res.end()
    })

    agent.on('transactionFinished', function(transaction) {
      t.ok(transaction.trace, 'transaction has a trace.')
      var attributes = transaction.trace.attributes.get(DESTINATIONS.TRANS_TRACE)
      HTTP_ATTS.forEach(function(key) {
        t.ok(attributes[key], 'Trace contains expected HTTP attribute: ' + key)
      })
      if (attributes.httpResponseMessage) {
        t.equal(
          attributes.httpResponseMessage,
          'OK',
          'Trace contains httpResponseMessage'
        )
      }
    })

    helper.randomPort(function(_port) {
      port = _port
      server.listen(port, TEST_HOST, function() {
        var url = TEST_URL + port + '/user/'
        helper.makeGetRequest(url, function(error, response, body) {
          if (error) t.fail(error)

          t.ok(/application\/json/.test(response.headers['content-type']),
               'got correct content type')
          t.deepEqual(JSON.parse(body), {'yep':true}, 'Express correctly serves.')
          t.end()
        })
      })
    })
  })

  t.test('route variables', function(t) {
    var agent = helper.instrumentMockedAgent({
      express4: true,
      send_request_uri_attribute: true
    })
    var app = require('express')()
    var server = require('http').createServer(app)
    var port = null

    t.tearDown(function() {
      server.close()
      helper.unloadAgent(agent)
    })

    // set apdexT so apdex stats will be recorded
    agent.config.apdex_t = 1

    // set attributes.enabled so we get the data we need.
    agent.config.attributes.enabled = true

    app.get('/user/:id', function(req, res) {
      t.ok(agent.getTransaction(), 'transaction is available')

      res.send({yep : true})
      res.end()
    })

    agent.on('transactionFinished', function(transaction) {
      t.ok(transaction.trace, 'transaction has a trace.')
      var attributes = transaction.trace.attributes.get(DESTINATIONS.TRANS_TRACE)
      t.equal(attributes.id, '5', 'Trace attributes include `id` route param')
    })

    helper.randomPort(function(_port) {
      port = _port
      server.listen(port, TEST_HOST, function() {
        var url = TEST_URL + port + '/user/5'
        helper.makeGetRequest(url, function(error, response, body) {
          if (error) t.fail(error)

          t.ok(/application\/json/.test(response.headers['content-type']),
               'got correct content type')
          t.deepEqual(JSON.parse(body), {'yep':true}, 'Express correctly serves.')
          t.end()
        })
      })
    })
  })

  t.test('query variables', {timeout : 1000}, function(t) {
    var agent = helper.instrumentMockedAgent({
      express4: true,
      send_request_uri_attribute: true
    })
    var app = require('express')()
    var server = require('http').createServer(app)
    var port = null

    t.tearDown(function() {
      server.close()
      helper.unloadAgent(agent)
    })

    // set apdexT so apdex stats will be recorded
    agent.config.apdex_t = 1

    // set attributes.enabled so we get the data we need.
    agent.config.attributes.enabled = true

    app.get('/user/', function(req, res) {
      t.ok(agent.getTransaction(), 'transaction is available')

      res.send({yep : true})
      res.end()
    })

    agent.on('transactionFinished', function(transaction) {
      t.ok(transaction.trace, 'transaction has a trace.')
      var attributes = transaction.trace.attributes.get(DESTINATIONS.TRANS_TRACE)
      t.equal(attributes.name, 'bob', 'Trace attributes include `name` query param')
    })

    helper.randomPort(function(_port) {
      port = _port
      server.listen(port, TEST_HOST, function() {
        var url = TEST_URL + port + '/user/?name=bob'
        helper.makeGetRequest(url, function(error, response, body) {
          if (error) t.fail(error)

          t.ok(/application\/json/.test(response.headers['content-type']),
               'got correct content type')
          t.deepEqual(JSON.parse(body), {'yep':true}, 'Express correctly serves.')
          t.end()
        })
      })
    })
  })

  t.test('route and query variables', function(t) {
    var agent = helper.instrumentMockedAgent({
      express4: true,
      send_request_uri_attribute: true
    })
    var app = require('express')()
    var server = require('http').createServer(app)
    var port = null

    t.tearDown(function() {
      server.close()
      helper.unloadAgent(agent)
    })

    // set apdexT so apdex stats will be recorded
    agent.config.apdex_t = 1

    // set attributes.enabled so we get the data we need.
    agent.config.attributes.enabled = true

    app.get('/user/:id', function(req, res) {
      t.ok(agent.getTransaction(), 'transaction is available')

      res.send({yep : true})
      res.end()
    })

    agent.on('transactionFinished', function(transaction) {
      t.ok(transaction.trace, 'transaction has a trace.')
      var attributes = transaction.trace.attributes.get(DESTINATIONS.TRANS_TRACE)
      t.equal(attributes.id, '5', 'Trace attributes include `id` route param')
      t.equal(attributes.name, 'bob', 'Trace attributes include `name` query param')
    })

    helper.randomPort(function(_port) {
      port = _port
      server.listen(port, TEST_HOST, function() {
        var url = TEST_URL + port + '/user/5?name=bob'
        helper.makeGetRequest(url, function(error, response, body) {
          if (error) t.fail(error)

          t.ok(/application\/json/.test(response.headers['content-type']),
               'got correct content type')
          t.deepEqual(JSON.parse(body), {'yep':true}, 'Express correctly serves.')
          t.end()
        })
      })
    })
  })

  t.test('query params mask route attributes', function(t) {
    var agent = helper.instrumentMockedAgent({
      express4: true,
      send_request_uri_attribute: true
    })
    var app = require('express')()
    var server = require('http').createServer(app)
    var port = null

    t.tearDown(function() {
      server.close()
      helper.unloadAgent(agent)
    })

    // set apdexT so apdex stats will be recorded
    agent.config.apdex_t = 1

    // set attributes.enabled so we get the data we need.
    agent.config.attributes.enabled = true

    app.get('/user/:id', function(req, res) {
      res.end()
    })

    agent.on('transactionFinished', function(transaction) {
      var attributes = transaction.trace.attributes.get(DESTINATIONS.TRANS_TRACE)
      t.equal(attributes.id, '6', 'attributes should include query params')
      t.end()
    })

    helper.randomPort(function(_port) {
      port = _port
      server.listen(port, TEST_HOST, function() {
        helper.makeGetRequest(TEST_URL + port + '/user/5?id=6')
      })
    })
  })
})
