/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
const test = require('node:test')
const assert = require('node:assert')
const API = require('../../../api')
const helper = require('../../lib/agent_helper')

test('Agent API - trace metadata', async (t) => {
  t.beforeEach((ctx) => {
    ctx.nr = {}
    const agent = helper.loadMockedAgent()
    agent.config.distributed_tracing.enabled = true

    ctx.nr.api = new API(agent)
    ctx.nr.agent = agent
  })

  t.afterEach((ctx) => {
    helper.unloadAgent(ctx.nr.agent)
  })

  await t.test('exports a trace metadata function', (t, end) => {
    const { api, agent } = t.nr
    helper.runInTransaction(agent, function (txn) {
      assert.equal(typeof api.getTraceMetadata, 'function')

      const metadata = api.getTraceMetadata()
      assert.equal(typeof metadata, 'object')

      assert.equal(typeof metadata.traceId, 'string')
      assert.equal(metadata.traceId, txn.traceId)

      assert.equal(typeof metadata.spanId, 'string')
      assert.equal(metadata.spanId, txn.agent.tracer.getSegment().id)

      end()
    })
  })

  await t.test('should return empty object with DT disabled', (t, end) => {
    const { api, agent } = t.nr
    agent.config.distributed_tracing.enabled = false

    helper.runInTransaction(agent, function () {
      const metadata = api.getTraceMetadata()
      assert.equal(typeof metadata, 'object')

      assert.deepEqual(metadata, {})
      end()
    })
  })

  await t.test('should not include spanId property with span events disabled', (t, end) => {
    const { api, agent } = t.nr
    agent.config.span_events.enabled = false

    helper.runInTransaction(agent, function (txn) {
      const metadata = api.getTraceMetadata()
      assert.equal(typeof metadata, 'object')

      assert.equal(typeof metadata.traceId, 'string')
      assert.equal(metadata.traceId, txn.traceId)

      const hasProperty = Object.hasOwnProperty.call(metadata, 'spanId')
      assert.ok(!hasProperty)

      end()
    })
  })

  await t.test('should not include transaction when not in active transaction', (t) => {
    const { api } = t.nr
    const metadata = api.getTraceMetadata()
    assert.deepEqual(metadata, {})
  })

  await t.test('should not include spanId when in active active transaction but not active segment', (t, end) => {
    const { api, agent } = t.nr

    helper.runInTransaction(agent, function (txn) {
      agent.tracer.setSegment({ segment: null })
      const metadata = api.getTraceMetadata()
      assert.equal(metadata.traceId, txn.traceId)
      assert.ok(!metadata.spanId)
      end()
    })
  })
})
