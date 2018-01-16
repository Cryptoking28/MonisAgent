'use strict'

var test    = require('tap').test
var request = require('request').defaults({json: true})
var helper  = require('../../lib/agent_helper')
var HTTP_ATTS = require('../../lib/fixtures').httpAttributes


test("Restify capture params introspection", function(t) {
  t.autoend()

  t.test('simple case with no params', function(t) {
    var agent  = helper.instrumentMockedAgent({ send_request_uri_attribute: true })
    var server = require('restify').createServer()
    var port = null


    agent.config.attributes.enabled = true

    t.tearDown(function() {
      server.close()
      helper.unloadAgent(agent)
    })

    agent.on('transactionFinished', function(transaction) {
      t.ok(transaction.trace, 'transaction has a trace.')
      // on older versions of node response messages aren't included
      var attributes = transaction.trace.attributes.get('transaction_tracer')
      HTTP_ATTS.forEach(function(key) {
        t.ok(attributes[key], 'Trace contains expected HTTP attribute: ' + key)
      })
    })

    server.get('/test', function(req, res, next) {
      t.ok(agent.getTransaction(), "transaction is available")

      res.send({status : 'ok'})
      next()
    })

    server.listen(0, function() {
      port = server.address().port
      request.get('http://localhost:' + port + '/test', function(error, res, body) {
        t.equal(res.statusCode, 200, "nothing exploded")
        t.deepEqual(body, {status : 'ok'}, "got expected respose")
        t.end()
      })
    })
  })

  t.test('case with route params', function(t) {
    var agent  = helper.instrumentMockedAgent({ send_request_uri_attribute: true })
    var server = require('restify').createServer()
    var port = null


    agent.config.attributes.enabled = true

    t.tearDown(function() {
      server.close()
      helper.unloadAgent(agent)
    })

    agent.on('transactionFinished', function(transaction) {
      t.ok(transaction.trace, 'transaction has a trace.')
      // on older versions of node response messages aren't included
      var attributes = transaction.trace.attributes.get('transaction_tracer')
      t.equal(attributes.id, '1337', 'Trace attributes include `id` route param')
    })

    server.get('/test/:id', function(req, res, next) {
      t.ok(agent.getTransaction(), "transaction is available")

      res.send({status : 'ok'})
      next()
    })

    server.listen(0, function() {
      port = server.address().port
      request.get('http://localhost:' + port + '/test/1337', function(error, res, body) {
        t.equal(res.statusCode, 200, "nothing exploded")
        t.deepEqual(body, {status : 'ok'}, "got expected respose")
        t.end()
      })
    })
  })

  t.test('case with query params', function(t) {
    var agent  = helper.instrumentMockedAgent({ send_request_uri_attribute: true })
    var server = require('restify').createServer()
    var port = null


    agent.config.attributes.enabled = true

    t.tearDown(function() {
      server.close()
      helper.unloadAgent(agent)
    })

    agent.on('transactionFinished', function(transaction) {
      t.ok(transaction.trace, 'transaction has a trace.')
      // on older versions of node response messages aren't included
      var attributes = transaction.trace.attributes.get('transaction_tracer')
      t.equal(attributes.name, 'restify', 'Trace attributes include `name` query param')
    })

    server.get('/test', function(req, res, next) {
      t.ok(agent.getTransaction(), "transaction is available")

      res.send({status : 'ok'})
      next()
    })

    server.listen(0, function() {
      port = server.address().port
      var url = 'http://localhost:' + port + '/test?name=restify'
      request.get(url, function(error, res, body) {
        t.equal(res.statusCode, 200, "nothing exploded")
        t.deepEqual(body, {status : 'ok'}, "got expected respose")
        t.end()
      })
    })
  })

  t.test('case with both route and query params', function(t) {
    var agent  = helper.instrumentMockedAgent({ send_request_uri_attribute: true })
    var server = require('restify').createServer()
    var port = null


    agent.config.attributes.enabled = true

    t.tearDown(function() {
      server.close()
      helper.unloadAgent(agent)
    })

    agent.on('transactionFinished', function(transaction) {
      t.ok(transaction.trace, 'transaction has a trace.')
      // on older versions of node response messages aren't included
      var attributes = transaction.trace.attributes.get('transaction_tracer')
      t.equal(attributes.id, '1337', 'Trace attributes include `id` route param')
      t.equal(attributes.name, 'restify', 'Trace attributes include `name` query param')
    })

    server.get('/test/:id', function(req, res, next) {
      t.ok(agent.getTransaction(), "transaction is available")

      res.send({status : 'ok'})
      next()
    })

    server.listen(0, function() {
      port = server.address().port
      var url = 'http://localhost:' + port + '/test/1337?name=restify'
      request.get(url, function(error, res, body) {
        t.equal(res.statusCode, 200, "nothing exploded")
        t.deepEqual(body, {status : 'ok'}, "got expected respose")
        t.end()
      })
    })
  })
})
