/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * This test checks for regressions on the route stack manipulation for Express apps.
 */
'use strict'

var test = require('tap').test
var helper = require('../../lib/agent_helper')

test('Express + express-enrouten compatibility test', function (t) {
  t.plan(2)

  var agent = helper.instrumentMockedAgent()
  var express = require('express')
  var enrouten = require('express-enrouten')
  var app = express()
  var server = require('http').createServer(app)

  app.use(enrouten({ directory: './fixtures' }))

  t.teardown(() => {
    server.close(() => {
      helper.unloadAgent(agent)
    })
  })

  // Monis Agent + express-enrouten used to have a bug, where any routes after the
  // first one would be lost.
  server.listen(0, function () {
    var port = server.address().port
    helper.makeGetRequest('http://localhost:' + port + '/', function (error, res) {
      t.equal(res.statusCode, 200, 'First Route loaded')
    })

    helper.makeGetRequest('http://localhost:' + port + '/foo', function (error, res) {
      t.equal(res.statusCode, 200, 'Second Route loaded')
    })
  })
})
