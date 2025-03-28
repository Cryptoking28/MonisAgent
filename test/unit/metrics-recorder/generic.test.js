/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
const test = require('node:test')
const assert = require('node:assert')
const helper = require('../../lib/agent_helper')
const recordGeneric = require('../../../lib/metrics/recorders/generic')
const Transaction = require('../../../lib/transaction')

function makeSegment(options) {
  const segment = options.transaction.trace.add('placeholder')
  segment.setDurationInMillis(options.duration)
  segment._setExclusiveDurationInMillis(options.exclusive)

  return segment
}

function record(options) {
  if (options.apdexT) {
    options.transaction.metrics.apdexT = options.apdexT
  }

  const segment = makeSegment(options)
  const transaction = options.transaction

  transaction.finalizeNameFromUri(options.url, options.code)
  recordGeneric(segment, options.transaction.name, options.transaction)
}

test('recordGeneric', async function (t) {
  t.beforeEach((ctx) => {
    ctx.nr = {}
    const agent = helper.loadMockedAgent()
    ctx.nr.trans = new Transaction(agent)
    ctx.nr.agent = agent
  })

  t.afterEach((ctx) => {
    helper.unloadAgent(ctx.nr.agent)
  })

  await t.test("when scoped is undefined it shouldn't crash on recording", function (t) {
    const { trans } = t.nr
    const segment = makeSegment({
      transaction: trans,
      duration: 0,
      exclusive: 0
    })
    assert.doesNotThrow(function () {
      recordGeneric(segment, undefined, trans)
    })
  })

  await t.test('when scoped is undefined it should record no scoped metrics', function (t) {
    const { trans } = t.nr
    const segment = makeSegment({
      transaction: trans,
      duration: 5,
      exclusive: 5
    })
    recordGeneric(segment, undefined, trans)

    const result = [[{ name: 'placeholder' }, [1, 0.005, 0.005, 0.005, 0.005, 0.000025]]]

    assert.equal(JSON.stringify(trans.metrics), JSON.stringify(result))
  })

  await t.test('with scope should record scoped metrics', function (t) {
    const { trans } = t.nr
    record({
      transaction: trans,
      url: '/test',
      code: 200,
      apdexT: 10,
      duration: 30,
      exclusive: 2
    })

    const result = [
      [{ name: 'placeholder' }, [1, 0.03, 0.002, 0.03, 0.03, 0.0009]],
      [
        { name: 'placeholder', scope: 'WebTransaction/NormalizedUri/*' },
        [1, 0.03, 0.002, 0.03, 0.03, 0.0009]
      ]
    ]

    assert.equal(JSON.stringify(trans.metrics), JSON.stringify(result))
  })

  await t.test('should report exclusive time correctly', function (t) {
    const { trans } = t.nr
    const root = trans.trace.root
    const parent = trans.trace.add('Test/Parent', recordGeneric)
    const child1 = trans.trace.add('Test/Child/1', recordGeneric, parent)
    const child2 = trans.trace.add('Test/Child/2', recordGeneric, parent)

    root.setDurationInMillis(30, 0)
    parent.setDurationInMillis(30, 0)
    child1.setDurationInMillis(12, 3)
    child2.setDurationInMillis(8, 17)

    const result = [
      [{ name: 'Test/Parent' }, [1, 0.03, 0.01, 0.03, 0.03, 0.0009]],
      [{ name: 'Test/Child/1' }, [1, 0.012, 0.012, 0.012, 0.012, 0.000144]],
      [{ name: 'Test/Child/2' }, [1, 0.008, 0.008, 0.008, 0.008, 0.000064]]
    ]

    trans.end()
    assert.equal(JSON.stringify(trans.metrics), JSON.stringify(result))
  })
})
