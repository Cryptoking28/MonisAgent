/*
 * Copyright 2023 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')
const requestClient = require('request')
const { promisify } = require('node:util')
const makeRequest = promisify(requestClient.get)

const helper = require('../../lib/agent_helper')
const { initNestApp, deleteNestApp } = require('./setup')

tap.test('Verify the Nest.js instrumentation', (t) => {
  t.autoend()
  let agent = null
  let app = null
  const port = 8972 // chosen by rand(), guaranteed to be random
  const baseUrl = `http://localhost:${port}`

  t.before(async () => {
    await initNestApp()
  })

  t.teardown(async () => {
    await deleteNestApp()
  })

  t.beforeEach(async () => {
    agent = helper.instrumentMockedAgent()
    const { bootstrap } = require('./test-app/dist/main.js')
    app = await bootstrap(port)
  })

  t.afterEach(() => {
    app.close()
    helper.unloadAgent(agent)
    Object.keys(require.cache).forEach((key) => {
      if (/test-app/.test(key)) {
        delete require.cache[key]
      }
    })
    agent = null
    app = null
  })

  t.test('should record a transaction in the base case', async (t) => {
    const res = await makeRequest(baseUrl)
    t.equal(res.body, 'Hello World!', 'should greet the world')
    t.equal(res.statusCode, 200, 'should return 200 status')
    t.equal(
      agent.metrics.getMetric('WebTransaction').callCount,
      1,
      'should have recorded one web transaction'
    )
    t.end()
  })

  t.test('should catch stack traces in errors', async (t) => {
    const res = await makeRequest(`${baseUrl}?please_error=yes`)
    t.equal(res.statusCode, 500, 'should return 500 status')
    const errors = agent.errors.traceAggregator.errors
    t.equal(errors.length, 1, 'there should be one error')
    t.equal(errors[0][2], 'erroring out, as requested', 'should get the expected error')
    t.ok(errors[0][4].stack_trace, 'should have the stack trace')
    t.end()
  })
})
