/*
 * Copyright 2024 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const test = require('node:test')
const assert = require('node:assert')

const helper = require('../lib/agent_helper')

const { PrioritizedAttributes, ATTRIBUTE_PRIORITY } = require('../../lib/prioritized-attributes')
const AttributeFilter = require('../../lib/config/attribute-filter')

const DESTINATIONS = AttributeFilter.DESTINATIONS
const TRANSACTION_SCOPE = 'transaction'

test('#addAttribute', async (t) => {
  t.beforeEach((ctx) => {
    ctx.nr = {}
    ctx.nr.agent = helper.loadMockedAgent()
  })

  t.afterEach((ctx) => {
    helper.unloadAgent(ctx.nr.agent)
  })

  await t.test('adds an attribute to instance', () => {
    const inst = new PrioritizedAttributes(TRANSACTION_SCOPE)
    inst.addAttribute(DESTINATIONS.TRANS_SCOPE, 'test', 'success')
    const attributes = inst.get(DESTINATIONS.TRANS_SCOPE)

    assert.equal(attributes.test, 'success')
  })

  await t.test('does not add attribute if key length limit is exceeded', () => {
    const tooLong = [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      'Cras id lacinia erat. Suspendisse mi nisl, sodales vel est eu,',
      'rhoncus lacinia ante. Nulla tincidunt efficitur diam, eget vulputate',
      'lectus facilisis sit amet. Morbi hendrerit commodo quam, in nullam.'
    ].join(' ')

    const inst = new PrioritizedAttributes(TRANSACTION_SCOPE)
    inst.addAttribute(DESTINATIONS.TRANS_SCOPE, tooLong, 'will fail')

    assert.equal(inst.has(tooLong), undefined)
  })
})

test('#addAttribute - high priority', async (t) => {
  await t.test('should overwrite existing high priority attribute', () => {
    const inst = new PrioritizedAttributes(TRANSACTION_SCOPE, 2)
    inst.addAttribute(0x01, 'Roboto', 1, false, ATTRIBUTE_PRIORITY.HIGH)

    inst.addAttribute(0x01, 'Roboto', 99, false, ATTRIBUTE_PRIORITY.HIGH)

    const res = inst.get(0x01)

    assert.equal(Object.keys(res).length, 1)
    assert.equal(res.Roboto, 99)
  })

  await t.test('should overwrite existing low priority attribute', () => {
    const inst = new PrioritizedAttributes(TRANSACTION_SCOPE, 2)
    inst.addAttribute(0x01, 'Roboto', 1, false, ATTRIBUTE_PRIORITY.LOW)

    inst.addAttribute(0x01, 'Roboto', 99, false, ATTRIBUTE_PRIORITY.HIGH)

    const res = inst.get(0x01)

    assert.equal(Object.keys(res).length, 1)
    assert.equal(res.Roboto, 99)
  })

  await t.test('should overwrite existing attribute even when at maximum', () => {
    const maxAttributeCount = 1
    const inst = new PrioritizedAttributes(TRANSACTION_SCOPE, maxAttributeCount)
    inst.addAttribute(0x01, 'Roboto', 1, false, ATTRIBUTE_PRIORITY.LOW)

    inst.addAttribute(0x01, 'Roboto', 99, false, ATTRIBUTE_PRIORITY.HIGH)

    const res = inst.get(0x01)

    assert.equal(Object.keys(res).length, 1)
    assert.equal(res.Roboto, 99)
  })

  await t.test(
    'should not add new attribute past maximum when no lower priority attributes',
    () => {
      const maxAttributeCount = 1
      const inst = new PrioritizedAttributes(TRANSACTION_SCOPE, maxAttributeCount)
      inst.addAttribute(0x01, 'old', 1, false, ATTRIBUTE_PRIORITY.HIGH)

      inst.addAttribute(0x01, 'new', 99, false, ATTRIBUTE_PRIORITY.HIGH)

      const res = inst.get(0x01)
      const hasAttribute = Object.hasOwnProperty.bind(res)

      assert.equal(Object.keys(res).length, maxAttributeCount)
      assert.equal(res.old, 1)
      assert.equal(hasAttribute('new'), false)
    }
  )

  await t.test(
    'should add new attribute, drop newest low priority attribute, when at maximum',
    () => {
      const maxAttributeCount = 4
      const inst = new PrioritizedAttributes(TRANSACTION_SCOPE, maxAttributeCount)
      inst.addAttribute(0x01, 'old-low', 1, false, ATTRIBUTE_PRIORITY.LOW)
      inst.addAttribute(0x01, 'old-high', 1, false, ATTRIBUTE_PRIORITY.HIGH)
      inst.addAttribute(0x01, 'new-low', 99, false, ATTRIBUTE_PRIORITY.LOW)
      inst.addAttribute(0x01, 'newish-high', 50, false, ATTRIBUTE_PRIORITY.HIGH)

      inst.addAttribute(0x01, 'new-high', 99, false, ATTRIBUTE_PRIORITY.HIGH)

      const res = inst.get(0x01)
      const hasAttribute = Object.hasOwnProperty.bind(res)

      assert.equal(Object.keys(res).length, maxAttributeCount)
      assert.equal(res['old-low'], 1)
      assert.equal(res['old-high'], 1)
      assert.equal(res['newish-high'], 50)
      assert.equal(res['new-high'], 99)
      assert.equal(hasAttribute('new-low'), false)
    }
  )

  await t.test(
    'should stop adding attributes after all low priority dropped, when at maximum',
    () => {
      const maxAttributeCount = 3
      const inst = new PrioritizedAttributes(TRANSACTION_SCOPE, maxAttributeCount)
      inst.addAttribute(0x01, 'old-low', 1, false, ATTRIBUTE_PRIORITY.LOW)
      inst.addAttribute(0x01, 'oldest-high', 1, false, ATTRIBUTE_PRIORITY.HIGH)
      inst.addAttribute(0x01, 'new-low', 99, false, ATTRIBUTE_PRIORITY.LOW)
      inst.addAttribute(0x01, 'older-high', 50, false, ATTRIBUTE_PRIORITY.HIGH)
      inst.addAttribute(0x01, 'newish-high', 99, false, ATTRIBUTE_PRIORITY.HIGH)

      inst.addAttribute(0x01, 'failed-new-high', 999, false, ATTRIBUTE_PRIORITY.HIGH)

      const res = inst.get(0x01)
      const hasAttribute = Object.hasOwnProperty.bind(res)

      assert.equal(Object.keys(res).length, maxAttributeCount)
      assert.equal(res['oldest-high'], 1)
      assert.equal(res['older-high'], 50)
      assert.equal(res['newish-high'], 99)

      assert.equal(hasAttribute('old-low'), false)
      assert.equal(hasAttribute('new-low'), false)
      assert.equal(hasAttribute('failed-new-high'), false)
    }
  )

  await t.test(
    'should not drop low priority attribute overwritten by high priority, when at maximum',
    () => {
      const maxAttributeCount = 4
      const inst = new PrioritizedAttributes(TRANSACTION_SCOPE, maxAttributeCount)
      inst.addAttribute(0x01, 'old-low', 1, false, ATTRIBUTE_PRIORITY.LOW)
      inst.addAttribute(0x01, 'overwritten', 1, false, ATTRIBUTE_PRIORITY.LOW)
      inst.addAttribute(0x01, 'old-high', 1, false, ATTRIBUTE_PRIORITY.HIGH)
      inst.addAttribute(0x01, 'new-low', 'low', false, ATTRIBUTE_PRIORITY.LOW)

      // should drop new-low
      inst.addAttribute(0x01, 'newish-high', 50, false, ATTRIBUTE_PRIORITY.HIGH)

      // makes overwritten a high priority attribute
      inst.addAttribute(0x01, 'overwritten', 'high', false, ATTRIBUTE_PRIORITY.HIGH)

      // should not drop 'overwritten' which should be high priority now
      inst.addAttribute(0x01, 'new-high', 99, false, ATTRIBUTE_PRIORITY.HIGH)

      const res = inst.get(0x01)
      const hasAttribute = Object.hasOwnProperty.bind(res)

      assert.equal(Object.keys(res).length, maxAttributeCount)
      assert.equal(res['old-high'], 1)
      assert.equal(res['newish-high'], 50)
      assert.equal(res['new-high'], 99)

      assert.equal(res.overwritten, 'high')
      assert.equal(hasAttribute('old-low'), false)
    }
  )
})

test('#addAttribute - low priority', async (t) => {
  await t.test('should overwrite existing low priority attribute', () => {
    const inst = new PrioritizedAttributes(TRANSACTION_SCOPE, 2)
    inst.addAttribute(0x01, 'Roboto', 1, false, ATTRIBUTE_PRIORITY.LOW)

    inst.addAttribute(0x01, 'Roboto', 99, false, ATTRIBUTE_PRIORITY.LOW)

    const res = inst.get(0x01)

    assert.equal(Object.keys(res).length, 1)
    assert.equal(res.Roboto, 99)
  })

  await t.test('should overwrite existing low priority attribute even when at maximum', () => {
    const inst = new PrioritizedAttributes(TRANSACTION_SCOPE, 1)
    inst.addAttribute(0x01, 'Roboto', 1, false, ATTRIBUTE_PRIORITY.LOW)

    inst.addAttribute(0x01, 'Roboto', 99, false, ATTRIBUTE_PRIORITY.LOW)

    const res = inst.get(0x01)

    assert.equal(Object.keys(res).length, 1)
    assert.equal(res.Roboto, 99)
  })

  await t.test('should not overwrite existing high priority attribute', () => {
    const inst = new PrioritizedAttributes(TRANSACTION_SCOPE, 1)
    inst.addAttribute(0x01, 'Roboto', 1, false, ATTRIBUTE_PRIORITY.HIGH)

    inst.addAttribute(0x01, 'Roboto', 99, false, ATTRIBUTE_PRIORITY.LOW)

    const res = inst.get(0x01)

    assert.equal(Object.keys(res).length, 1)
    assert.equal(res.Roboto, 1)
  })

  await t.test('should not add new attribute past maximum', () => {
    const maxAttributeCount = 2
    const inst = new PrioritizedAttributes(TRANSACTION_SCOPE, maxAttributeCount)
    inst.addAttribute(0x01, 'old-high', 1, false, ATTRIBUTE_PRIORITY.HIGH)
    inst.addAttribute(0x01, 'old-low', 99, false, ATTRIBUTE_PRIORITY.LOW)

    inst.addAttribute(0x01, 'failed-new-low', 999, false, ATTRIBUTE_PRIORITY.LOW)

    const res = inst.get(0x01)
    const hasAttribute = Object.hasOwnProperty.bind(res)

    assert.equal(Object.keys(res).length, maxAttributeCount)
    assert.equal(res['old-high'], 1)
    assert.equal(res['old-low'], 99)
    assert.equal(hasAttribute('failed-new-low'), false)
  })
})

test('#addAttributes', async (t) => {
  await t.test('adds multiple attributes to instance', () => {
    const inst = new PrioritizedAttributes(TRANSACTION_SCOPE)
    inst.addAttributes(DESTINATIONS.TRANS_SCOPE, { one: '1', two: '2' })
    const attributes = inst.get(DESTINATIONS.TRANS_SCOPE)

    assert.equal(attributes.one, '1')
    assert.equal(attributes.two, '2')
  })

  await t.test('only allows non-null-type primitive attribute values', () => {
    const inst = new PrioritizedAttributes(TRANSACTION_SCOPE, 10)
    const attributes = {
      first: 'first',
      second: ['second'],
      third: { key: 'third' },
      fourth: 4,
      fifth: true,
      sixth: undefined,
      seventh: null,
      eighth: Symbol('test'),
      ninth: function () {}
    }

    inst.addAttributes(DESTINATIONS.TRANS_SCOPE, attributes)

    const res = inst.get(DESTINATIONS.TRANS_SCOPE)
    assert.equal(Object.keys(res).length, 3)

    const hasAttribute = Object.hasOwnProperty.bind(res)
    assert.equal(hasAttribute('second'), false)
    assert.equal(hasAttribute('third'), false)
    assert.equal(hasAttribute('sixth'), false)
    assert.equal(hasAttribute('seventh'), false)
    assert.equal(hasAttribute('eighth'), false)
    assert.equal(hasAttribute('ninth'), false)
  })

  await t.test('disallows adding more than maximum allowed attributes', () => {
    const inst = new PrioritizedAttributes(TRANSACTION_SCOPE, 3)
    const attributes = {
      first: 1,
      second: 2,
      portishead: 3,
      so: 4
    }

    inst.addAttributes(DESTINATIONS.TRANS_SCOPE, attributes)
    const res = inst.get(DESTINATIONS.TRANS_SCOPE)

    assert.equal(Object.keys(res).length, 3)
  })

  await t.test('Overwrites value of added attribute with same key', () => {
    const inst = new PrioritizedAttributes(TRANSACTION_SCOPE, 2)
    inst.addAttribute(0x01, 'Roboto', 1)
    inst.addAttribute(0x01, 'Roboto', 99)

    const res = inst.get(0x01)

    assert.equal(Object.keys(res).length, 1)
    assert.equal(res.Roboto, 99)
  })
})

test('#get', async (t) => {
  await t.test('gets attributes by destination, truncating values if necessary', () => {
    const longVal = [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      'Cras id lacinia erat. Suspendisse mi nisl, sodales vel est eu,',
      'rhoncus lacinia ante. Nulla tincidunt efficitur diam, eget vulputate',
      'lectus facilisis sit amet. Morbi hendrerit commodo quam, in nullam.',
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
    ].join(' ')

    const inst = new PrioritizedAttributes(TRANSACTION_SCOPE)
    inst.addAttribute(0x01, 'valid', 50)
    inst.addAttribute(0x01, 'tooLong', longVal)
    inst.addAttribute(0x08, 'wrongDest', 'hello')

    assert.ok(Buffer.byteLength(longVal) > 255)

    const res = inst.get(0x01)
    assert.equal(res.valid, 50)

    assert.equal(Buffer.byteLength(res.tooLong), 255)
  })

  await t.test('only returns attributes up to specified limit', () => {
    const inst = new PrioritizedAttributes(TRANSACTION_SCOPE, 2)
    inst.addAttribute(0x01, 'first', 'first')
    inst.addAttribute(0x01, 'second', 'second')
    inst.addAttribute(0x01, 'third', 'third')

    const res = inst.get(0x01)
    const hasAttribute = Object.hasOwnProperty.bind(res)

    assert.equal(Object.keys(res).length, 2)
    assert.equal(hasAttribute('third'), false)
  })
})

test('#hasValidDestination', async (t) => {
  t.beforeEach((ctx) => {
    ctx.nr = {}
    ctx.nr.agent = helper.loadMockedAgent()
  })

  t.afterEach((ctx) => {
    helper.unloadAgent(ctx.nr.agent)
  })

  await t.test('should return true if single destination valid', () => {
    const attributes = new PrioritizedAttributes(TRANSACTION_SCOPE)
    const hasDestination = attributes.hasValidDestination(DESTINATIONS.TRANS_EVENT, 'testAttr')

    assert.equal(hasDestination, true)
  })

  await t.test('should return true if all destinations valid', () => {
    const attributes = new PrioritizedAttributes(TRANSACTION_SCOPE)
    const destinations = DESTINATIONS.TRANS_EVENT | DESTINATIONS.TRANS_TRACE
    const hasDestination = attributes.hasValidDestination(destinations, 'testAttr')

    assert.equal(hasDestination, true)
  })

  await t.test('should return true if only one destination valid', (t) => {
    const { agent } = t.nr
    const attributeName = 'testAttr'
    agent.config.transaction_events.attributes.exclude = [attributeName]
    agent.config.emit('transaction_events.attributes.exclude')

    const attributes = new PrioritizedAttributes(TRANSACTION_SCOPE)
    const destinations = DESTINATIONS.TRANS_EVENT | DESTINATIONS.TRANS_TRACE
    const hasDestination = attributes.hasValidDestination(destinations, attributeName)

    assert.equal(hasDestination, true)
  })

  await t.test('should return false if no valid destinations', (t) => {
    const { agent } = t.nr
    const attributeName = 'testAttr'
    agent.config.attributes.exclude = [attributeName]
    agent.config.emit('attributes.exclude')

    const attributes = new PrioritizedAttributes(TRANSACTION_SCOPE)
    const destinations = DESTINATIONS.TRANS_EVENT | DESTINATIONS.TRANS_TRACE
    const hasDestination = attributes.hasValidDestination(destinations, attributeName)

    assert.equal(hasDestination, false)
  })
})

test('#reset', async (t) => {
  await t.test('resets instance attributes', () => {
    const inst = new PrioritizedAttributes(TRANSACTION_SCOPE)
    inst.addAttribute(0x01, 'first', 'first')
    inst.addAttribute(0x01, 'second', 'second')
    inst.addAttribute(0x01, 'third', 'third')

    inst.reset()

    assert.equal(inst.has('first'), undefined)
    assert.equal(inst.has('second'), undefined)
    assert.equal(inst.has('third'), undefined)
  })
})
