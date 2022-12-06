/*
 * Copyright 2022 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')
const helper = require('../../lib/agent_helper')
const common = require('./common')

tap.Test.prototype.addAssert('clmAttrs', 1, helper.assertCLMAttrs)

async function setupFastifyServer(fastify, calls) {
  common.setupRoutes(fastify)
  await fastify.register(require('middie'))
  common.registerMiddlewares({ fastify, calls })
}

async function setup(test, config) {
  const agent = helper.instrumentMockedAgent(config)
  const fastify = require('fastify')()
  const calls = { test: 0, middleware: 0 }

  await setupFastifyServer(fastify, calls)

  test.context.agent = agent
  test.context.fastify = fastify
  test.context.calls = calls

  test.teardown(() => {
    helper.unloadAgent(agent)
    fastify.close()
  })
}

tap.test('Fastify CLM Middleware Based', (test) => {
  test.autoend()
  ;[true, false].forEach((isCLMEnabled) => {
    test.test(isCLMEnabled ? 'should add attributes' : 'should not add attributes', async (t) => {
      await setup(t, { code_level_metrics: { enabled: isCLMEnabled } })
      const { agent, fastify, calls } = t.context
      const uri = common.routesToTest[0]

      agent.on('transactionFinished', (transaction) => {
        calls.test++

        const baseSegment = transaction.trace.root.children[0]
        const [middieSegment, handlerSegment] = baseSegment.children
        t.clmAttrs({
          segments: [
            {
              segment: middieSegment,
              name: 'runMiddie',
              filepath: 'test/versioned/fastify/node_modules/middie/index.js'
            },
            {
              segment: handlerSegment,
              name: '(anonymous)',
              filepath: 'test/versioned/fastify/common.js'
            }
          ],
          enabled: isCLMEnabled
        })
      })

      await fastify.listen(0)
      const address = fastify.server.address()
      const result = await common.makeRequest(address, uri)

      t.equal(result.called, uri, `${uri} url did not error`)
      t.ok(calls.test > 0)
      t.equal(calls.test, calls.middleware, 'should be the same value')
    })
  })
})
