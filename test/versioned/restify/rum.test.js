/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const test = require('node:test')
const { tspl } = require('@matteo.collina/tspl')
const helper = require('../../lib/agent_helper')
const API = require('../../../api')

test('Restify router introspection', async function (t) {
  const plan = tspl(t, { plan: 4 })
  const agent = helper.instrumentMockedAgent()
  const server = require('restify').createServer()
  const api = new API(agent)

  agent.config.application_id = '12345'
  agent.config.browser_monitoring.browser_key = '12345'
  agent.config.browser_monitoring.js_agent_loader = 'function(){}'

  t.after(() => {
    server.close(() => {
      helper.unloadAgent(agent)
    })
  })

  server.get('/test/:id', function (req, res, next) {
    const rum = api.getBrowserTimingHeader()
    plan.equal(rum.substring(0, 7), '<script')
    res.send({ status: 'ok' })
    next()
  })

  server.listen(0, function () {
    const port = server.address().port
    helper.makeGetRequest('http://localhost:' + port + '/test/31337', function (error, res, body) {
      plan.ifError(error)
      plan.equal(res.statusCode, 200, 'nothing exploded')
      plan.deepEqual(body, { status: 'ok' }, 'got expected respose')
    })
  })
  await plan.completed
})
