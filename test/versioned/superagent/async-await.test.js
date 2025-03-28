/*
 * Copyright 2024 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const test = require('node:test')
const assert = require('node:assert')

const { removeModules } = require('../../lib/cache-buster')
const match = require('../../lib/custom-assertions/match')
const helper = require('../../lib/agent_helper')
const testServer = require('./test-server')

const EXTERNAL_NAME = /External\/127.0.0.1:\d+\//

test.beforeEach(async (ctx) => {
  ctx.nr = {}
  ctx.nr.agent = helper.instrumentMockedAgent()

  const { address, server, stopServer } = await testServer()
  ctx.nr.address = address
  ctx.nr.server = server
  ctx.nr.stopServer = stopServer

  ctx.nr.request = require('superagent')
})

test.afterEach(async (ctx) => {
  helper.unloadAgent(ctx.nr.agent)
  removeModules(['superagent'])
  await ctx.nr.stopServer()
})

test('should maintain transaction context with promises', (t, end) => {
  const { address, agent } = t.nr
  helper.runInTransaction(agent, async function (tx) {
    assert.ok(tx)

    const { request } = t.nr
    await request.get(address)

    const [mainSegment] = tx.trace.getChildren(tx.trace.root.id)
    assert.ok(mainSegment)
    match(mainSegment.name, EXTERNAL_NAME, 'has segment matching request')
    const mainChildren = tx.trace.getChildren(mainSegment.id)
    assert.equal(
      mainChildren.filter((c) => c.name === 'Callback: <anonymous>').length,
      1,
      'CB created by superagent is present'
    )

    end()
  })
})

test('should not create segment if not in a transaction', async (t) => {
  const { address, agent, request } = t.nr
  await request.get(address)
  assert.equal(agent.getTransaction(), undefined, 'should not have a transaction')
})
