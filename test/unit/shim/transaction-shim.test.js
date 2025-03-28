/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
const assert = require('node:assert')
const test = require('node:test')
const { isNonWritable } = require('../../lib/custom-assertions')
const hashes = require('../../../lib/util/hashes')
const helper = require('../../lib/agent_helper')
const { TransactionSpec } = require('../../../lib/shim/specs')
const TransactionShim = require('../../../lib/shim/transaction-shim')
const notRunningStates = ['stopped', 'stopping', 'errored']
const sinon = require('sinon')

/**
 * Creates CAT headers to be used in handleMqTracingHeaders
 * tests below
 *
 * @param {Object} config agent config
 * @param {Boolean} altNames runs the non x-MonisAgent headers
 */
function createCATHeaders(config, altNames) {
  const idHeader = hashes.obfuscateNameUsingKey('9876#id', config.encoding_key)
  let txHeader = JSON.stringify(['trans id', false, 'trip id', 'path hash'])
  txHeader = hashes.obfuscateNameUsingKey(txHeader, config.encoding_key)

  const appHeader = hashes.obfuscateNameUsingKey(
    JSON.stringify([
      '6789#app',
      'app data transaction name',
      1,
      2,
      3, // queue time, response time, and content length
      'app trans id',
      false
    ]),
    config.encoding_key
  )

  return altNames
    ? {
        MonisAgentID: idHeader,
        MonisAgentTransaction: txHeader,
        MonisAgentAppData: appHeader
      }
    : {
        'X-MonisAgent-Id': idHeader,
        'X-MonisAgent-Transaction': txHeader,
        'X-MonisAgent-App-Data': appHeader
      }
}

test('TransactionShim', async function (t) {
  function beforeEach(ctx) {
    ctx.nr = {}
    const agent = helper.loadMockedAgent()
    ctx.nr.shim = new TransactionShim(agent, 'test-module')
    ctx.nr.wrappable = {
      name: 'this is a name',
      bar: function barsName(unused, params) { return 'bar' },
      fiz: function fizsName() {
        return 'fiz'
      },
      anony: function () {},
      getActiveTransaction: function () {
        return agent.tracer.getTransaction()
      }
    }

    const params = {
      encoding_key: 'this is an encoding key',
      cross_process_id: '1234#4321'
    }

    agent.config.account_id = 'AccountId1'
    agent.config.primary_application_id = 'AppId1'
    agent.config.trusted_account_ids = [9876, 6789]
    agent.config._fromServer(params, 'encoding_key')
    agent.config._fromServer(params, 'cross_process_id')
    ctx.nr.agent = agent
  }

  function afterEach(ctx) {
    helper.unloadAgent(ctx.nr.agent)
  }

  await t.test('constructor', async function (t) {
    t.beforeEach(beforeEach)
    t.afterEach(afterEach)
    await t.test('should require an agent parameter', function () {
      assert.throws(function () {
        return new TransactionShim()
      }, 'Error: Shim must be initialized with agent and module name')
    })

    await t.test('should require a module name parameter', function (t) {
      const { agent } = t.nr
      assert.throws(function () {
        return new TransactionShim(agent)
      }, 'Error: Shim must be initialized with agent and module name')
    })

    await t.test('should assign properties from parent', (t) => {
      const { agent } = t.nr
      const mod = 'test-mod'
      const name = mod
      const version = '1.0.0'
      const shim = new TransactionShim(agent, mod, mod, name, version)
      assert.equal(shim.moduleName, mod)
      assert.equal(agent, shim._agent)
      assert.equal(shim.pkgVersion, version)
    })
  })

  await t.test('#WEB, #BG, #MESSAGE', async function (t) {
    t.beforeEach(beforeEach)
    t.afterEach(afterEach)
    const keys = ['WEB', 'BG', 'MESSAGE']

    for (const key of keys) {
      await t.test(`${key} should be a non-writable property`, function (t) {
        const { shim } = t.nr
        isNonWritable({ obj: shim, key })
      })

      await t.test(`${key} should be transaction types`, function (t) {
        const { shim } = t.nr
        assert.equal(shim[key], key.toLowerCase())
      })
    }
  })

  await t.test('#bindCreateTransaction', async function (t) {
    t.beforeEach(beforeEach)
    t.afterEach(afterEach)

    await t.test('should not wrap non-functions', function (t) {
      const { shim, wrappable } = t.nr
      shim.bindCreateTransaction(wrappable, 'name', new TransactionSpec({ type: shim.WEB }))
      assert.equal(shim.isWrapped(wrappable.name), false)
    })

    await t.test('should wrap the first parameter if no properties are given', function (t) {
      const { shim, wrappable } = t.nr
      const wrapped = shim.bindCreateTransaction(
        wrappable.bar,
        new TransactionSpec({ type: shim.WEB })
      )
      assert.notEqual(wrapped, wrappable.bar)
      assert.equal(shim.isWrapped(wrapped), true)
      assert.equal(shim.unwrap(wrapped), wrappable.bar)
    })

    await t.test('should wrap the first parameter if `null` is given for properties', function (t) {
      const { shim, wrappable } = t.nr
      const wrapped = shim.bindCreateTransaction(
        wrappable.bar,
        null,
        new TransactionSpec({ type: shim.WEB })
      )
      assert.notEqual(wrapped, wrappable.bar)
      assert.equal(shim.isWrapped(wrapped), true)
      assert.equal(shim.unwrap(wrapped), wrappable.bar)
    })

    await t.test('should replace wrapped properties on the original object', function (t) {
      const { shim, wrappable } = t.nr
      const original = wrappable.bar
      shim.bindCreateTransaction(wrappable, 'bar', new TransactionSpec({ type: shim.WEB }))
      assert.notEqual(wrappable.bar, original)
      assert.equal(shim.isWrapped(wrappable, 'bar'), true)
      assert.equal(shim.unwrap(wrappable, 'bar'), original)
    })
  })

  await t.test('#bindCreateTransaction wrapper', async function (t) {
    t.beforeEach(beforeEach)
    t.afterEach(afterEach)

    await t.test('should execute the wrapped function', function (t) {
      const { shim } = t.nr
      let executed = false
      const context = {}
      const value = {}
      const wrapped = shim.bindCreateTransaction(function (a, b, c) {
        executed = true
        assert.equal(this, context)
        assert.equal(a, 'a')
        assert.equal(b, 'b')
        assert.equal(c, 'c')
        return value
      }, new TransactionSpec({ type: shim.WEB }))

      assert.ok(!executed)
      const ret = wrapped.call(context, 'a', 'b', 'c')
      assert.equal(executed, true)
      assert.equal(ret, value)
    })

    await t.test('should create a transaction with the correct type', function (t) {
      const { shim, wrappable } = t.nr
      shim.bindCreateTransaction(
        wrappable,
        'getActiveTransaction',
        new TransactionSpec({ type: shim.WEB })
      )
      const tx = wrappable.getActiveTransaction()
      assert.equal(tx.type, shim.WEB)

      shim.unwrap(wrappable, 'getActiveTransaction')
      shim.bindCreateTransaction(
        wrappable,
        'getActiveTransaction',
        new TransactionSpec({ type: shim.BG })
      )
      const bgTx = wrappable.getActiveTransaction()
      assert.equal(bgTx.type, shim.BG)
    })

    await t.test('should not create a nested transaction when `spec.nest` is false', function (t) {
      const { shim } = t.nr
      sinon.stub(shim.logger, 'trace')
      let webTx = null
      let bgTx = null
      let webCalled = false
      let bgCalled = false
      const bg = shim.bindCreateTransaction(function bgTxFn() {
        bgCalled = true
        bgTx = shim.tracer.getTransaction()
      }, new TransactionSpec({ type: shim.BG }))
      const web = shim.bindCreateTransaction(function webTxFn() {
        webCalled = true
        webTx = shim.tracer.getTransaction()
        bg()
      }, new TransactionSpec({ type: shim.WEB }))

      web()
      assert.equal(webCalled, true)
      assert.equal(bgCalled, true)
      assert.equal(webTx.id, bgTx.id)
      assert.deepEqual(shim.logger.trace.args, [
        ['Wrapping nodule itself (%s).', 'bgTxFn'],
        ['Wrapping nodule itself (%s).', 'webTxFn'],
        ['Creating new %s transaction for %s', 'web', 'webTxFn'],
        ['Applying segment %s', 'ROOT'],
        [
          'Transaction %s exists, not creating new transaction %s for %s',
          bgTx.id,
          'bg',
          'bgTxFn'
        ]
      ])
    })

    await t.test('should create a new transaction when `spec.nest` is false and current transaction is not active', function (t) {
      const { shim } = t.nr
      sinon.stub(shim.logger, 'trace')
      let webTx = null
      let bgTx = null
      let webCalled = false
      let bgCalled = false
      const bg = shim.bindCreateTransaction(function bgTxFn() {
        bgCalled = true
        bgTx = shim.tracer.getTransaction()
      }, new TransactionSpec({ type: shim.BG }))
      const web = shim.bindCreateTransaction(function webTxFn() {
        webCalled = true
        webTx = shim.tracer.getTransaction()
        webTx.end()
        bg()
      }, new TransactionSpec({ type: shim.WEB }))

      web()
      assert.equal(webCalled, true)
      assert.equal(bgCalled, true)
      assert.notEqual(webTx.id, bgTx.id)
      assert.deepEqual(shim.logger.trace.args, [
        ['Wrapping nodule itself (%s).', 'bgTxFn'],
        ['Wrapping nodule itself (%s).', 'webTxFn'],
        ['Creating new %s transaction for %s', 'web', 'webTxFn'],
        ['Applying segment %s', 'ROOT'],
        ['Creating new %s transaction for %s', 'bg', 'bgTxFn'],
        ['Applying segment %s', 'ROOT']
      ])
    })

    for (const agentState of notRunningStates) {
      await t.test(`should not create transaction when agent state is ${agentState}`, (t) => {
        const { agent, shim } = t.nr
        agent.setState(agentState)

        let callbackCalled = false
        let transaction = null
        const wrapped = shim.bindCreateTransaction(() => {
          callbackCalled = true
          transaction = shim.tracer.getTransaction()
        }, new TransactionSpec({ type: shim.BG }))

        wrapped()

        assert.equal(callbackCalled, true)
        assert.equal(transaction, null)
      })
    }
  })

  await t.test('#bindCreateTransaction when `spec.nest` is `true`', async function (t) {
    t.beforeEach(function (ctx) {
      beforeEach(ctx)
      const { shim } = ctx.nr
      ctx.nr.transactions = []
      ctx.nr.web = shim.bindCreateTransaction(function (cb) {
        ctx.nr.transactions.push(shim.tracer.getTransaction())
        if (cb) {
          cb()
        }
      }, new TransactionSpec({ type: shim.WEB, nest: true }))

      ctx.nr.bg = shim.bindCreateTransaction(function (cb) {
        ctx.nr.transactions.push(shim.tracer.getTransaction())
        if (cb) {
          cb()
        }
      }, new TransactionSpec({ type: shim.BG, nest: true }))
    })

    t.afterEach(afterEach)

    await t.test('should create a nested transaction if the types differ', function (t) {
      const { bg, web } = t.nr
      web(bg)
      assert.equal(t.nr.transactions.length, 2)
      assert.notEqual(t.nr.transactions[0], t.nr.transactions[1])

      t.nr.transactions = []
      bg(web)
      assert.equal(t.nr.transactions.length, 2)
      assert.notEqual(t.nr.transactions[0], t.nr.transactions[1])
    })

    await t.test('should not create nested transactions if the types are the same', function (t) {
      const { bg, web } = t.nr
      web(web)
      assert.equal(t.nr.transactions.length, 2)
      assert.equal(t.nr.transactions[0], t.nr.transactions[1])

      t.nr.transactions = []
      bg(bg)
      assert.equal(t.nr.transactions.length, 2)
      assert.equal(t.nr.transactions[0], t.nr.transactions[1])
    })

    await t.test('should create transactions if the types alternate', function (t) {
      const { bg, web } = t.nr
      web(bg.bind(null, web.bind(null, bg)))
      assert.equal(t.nr.transactions.length, 4)
      for (let i = 0; i < t.nr.transactions.length; ++i) {
        const tx1 = t.nr.transactions[i]
        for (let j = i + 1; j < t.nr.transactions.length; ++j) {
          const tx2 = t.nr.transactions[j]
          assert.notEqual(tx1, tx2, `tx ${i} should noassert.equal tx ${j}`)
        }
      }
    })

    await t.test('should not nest transaction if first transaction is inactive and same type', function (t) {
      const { shim } = t.nr
      const transactions = []
      const web = shim.bindCreateTransaction(function (cb) {
        const tx = shim.tracer.getTransaction()
        transactions.push(tx)
        tx.end()
        if (cb) {
          cb()
        }
      }, new TransactionSpec({ type: shim.WEB, nest: true }))

      const web2 = shim.bindCreateTransaction(function () {
        transactions.push(shim.tracer.getTransaction())
      }, new TransactionSpec({ type: shim.WEB, nest: true }))
      web(web2)
      assert.notEqual(transactions[0].id, transactions[1].id)
    })

    for (const agentState of notRunningStates) {
      await t.test(`should not create transaction when agent state is ${agentState}`, (t) => {
        const { agent, shim } = t.nr
        agent.setState(agentState)

        let callbackCalled = false
        let transaction = null
        const wrapped = shim.bindCreateTransaction(() => {
          callbackCalled = true
          transaction = shim.tracer.getTransaction()
        }, new TransactionSpec({ type: shim.BG, nest: true }))

        wrapped()

        assert.equal(callbackCalled, true)
        assert.equal(transaction, null)
      })
    }
  })

  await t.test('#pushTransactionName', async function (t) {
    t.beforeEach(beforeEach)
    t.afterEach(afterEach)
    await t.test('should not fail when called outside of a transaction', function (t) {
      const { shim } = t.nr
      assert.doesNotThrow(function () {
        shim.pushTransactionName('foobar')
      })
    })

    await t.test('should append the given string to the name state stack', function (t, end) {
      const { agent, shim } = t.nr
      helper.runInTransaction(agent, function (tx) {
        shim.pushTransactionName('foobar')
        assert.equal(tx.nameState.getName(), '/foobar')
        end()
      })
    })
  })

  await t.test('#popTransactionName', async function (t) {
    t.beforeEach(beforeEach)
    t.afterEach(afterEach)
    await t.test('should not fail when called outside of a transaction', function (t) {
      const { shim } = t.nr
      assert.doesNotThrow(function () {
        shim.popTransactionName('foobar')
      })
    })

    await t.test('should pop to the given string in the name state stack', function (t, end) {
      const { agent, shim } = t.nr
      helper.runInTransaction(agent, function (tx) {
        shim.pushTransactionName('foo')
        shim.pushTransactionName('bar')
        shim.pushTransactionName('bazz')
        assert.equal(tx.nameState.getName(), '/foo/bar/bazz')

        shim.popTransactionName('bar')
        assert.equal(tx.nameState.getName(), '/foo')
        end()
      })
    })

    await t.test('should pop just the last item if no string is given', function (t, end) {
      const { agent, shim } = t.nr
      helper.runInTransaction(agent, function (tx) {
        shim.pushTransactionName('foo')
        shim.pushTransactionName('bar')
        shim.pushTransactionName('bazz')
        assert.equal(tx.nameState.getName(), '/foo/bar/bazz')

        shim.popTransactionName()
        assert.equal(tx.nameState.getName(), '/foo/bar')
        end()
      })
    })
  })

  await t.test('#setTransactionName', async function (t) {
    t.beforeEach(beforeEach)
    t.afterEach(afterEach)
    await t.test('should not fail when called outside of a transaction', function (t) {
      const { shim } = t.nr
      assert.doesNotThrow(function () {
        shim.setTransactionName('foobar')
      })
    })

    await t.test('should set the transaction partial name', function (t, end) {
      const { agent, shim } = t.nr
      helper.runInTransaction(agent, function (tx) {
        shim.setTransactionName('fizz bang')
        assert.equal(tx.getName(), 'fizz bang')
        end()
      })
    })
  })

  await t.test('#handleMqTracingHeaders', async function (t) {
    t.beforeEach((ctx) => {
      beforeEach(ctx)
      const { agent } = ctx.nr
      agent.config.cross_application_tracer.enabled = true
      agent.config.distributed_tracing.enabled = false
    })
    t.afterEach(afterEach)

    await t.test('should not run if disabled', function (t, end) {
      const { agent, shim } = t.nr
      helper.runInTransaction(agent, function (tx) {
        agent.config.cross_application_tracer.enabled = false

        const headers = createCATHeaders(agent.config)
        const segment = shim.getSegment()

        assert.ok(!tx.incomingCatId)
        assert.ok(!tx.referringTransactionGuid)
        assert.ok(!segment.catId)
        assert.ok(!segment.catTransaction)
        assert.ok(!segment.getAttributes().transaction_guid)

        shim.handleMqTracingHeaders(headers, segment, null, tx)

        assert.ok(!tx.incomingCatId)
        assert.ok(!tx.referringTransactionGuid)
        assert.ok(!segment.catId)
        assert.ok(!segment.catTransaction)
        assert.ok(!segment.getAttributes().transaction_guid)
        end()
      })
    })

    await t.test('should not run if the encoding key is missing', function (t, end) {
      const { agent, shim } = t.nr
      helper.runInTransaction(agent, function (tx) {
        const headers = createCATHeaders(agent.config)
        const segment = shim.getSegment()
        delete agent.config.encoding_key

        assert.ok(!tx.incomingCatId)
        assert.ok(!tx.referringTransactionGuid)
        assert.ok(!segment.catId)
        assert.ok(!segment.catTransaction)
        assert.ok(!segment.getAttributes().transaction_guid)

        shim.handleMqTracingHeaders(headers, segment, null, tx)

        assert.ok(!tx.incomingCatId)
        assert.ok(!tx.referringTransactionGuid)
        assert.ok(!segment.catId)
        assert.ok(!segment.catTransaction)
        assert.ok(!segment.getAttributes().transaction_guid)
        end()
      })
    })

    await t.test('should fail gracefully when no headers are given', function (t, end) {
      const { agent, shim } = t.nr
      helper.runInTransaction(agent, function (tx) {
        const segment = shim.getSegment()

        assert.ok(!tx.incomingCatId)
        assert.ok(!tx.referringTransactionGuid)
        assert.ok(!segment.catId)
        assert.ok(!segment.catTransaction)
        assert.ok(!segment.getAttributes().transaction_guid)

        assert.doesNotThrow(function () {
          shim.handleMqTracingHeaders(null, segment, null, tx)
        })

        assert.ok(!tx.incomingCatId)
        assert.ok(!tx.referringTransactionGuid)
        assert.ok(!segment.catId)
        assert.ok(!segment.catTransaction)
        assert.ok(!segment.getAttributes().transaction_guid)
        end()
      })
    })

    await t.test(
      'should attach the CAT info to the provided segment transaction - DT disabled, id and transaction are provided',
      function (t, end) {
        const { agent, shim } = t.nr
        helper.runInTransaction(agent, shim.WEB, function (tx) {
          const headers = createCATHeaders(agent.config)
          const segment = shim.getSegment()
          delete headers['X-MonisAgent-App-Data']

          assert.ok(!tx.incomingCatId)
          assert.ok(!tx.referringTransactionGuid)
          assert.ok(!tx.tripId)
          assert.ok(!tx.referringPathHash)

          helper.runInTransaction(agent, shim.BG, function (tx2) {
            assert.notEqual(tx2, tx)
            shim.handleMqTracingHeaders(headers, segment, null, tx)
          })

          assert.equal(tx.incomingCatId, '9876#id')
          assert.equal(tx.referringTransactionGuid, 'trans id')
          assert.equal(tx.tripId, 'trip id')
          assert.equal(tx.referringPathHash, 'path hash')
          end()
        })
      }
    )

    await t.test(
      'should attach the CAT info to current transaction if not provided - DT disabled, id and transaction are provided',
      function (t, end) {
        const { agent, shim } = t.nr
        helper.runInTransaction(agent, function (tx) {
          const headers = createCATHeaders(agent.config)
          delete headers['X-MonisAgent-App-Data']

          assert.ok(!tx.incomingCatId)
          assert.ok(!tx.referringTransactionGuid)
          assert.ok(!tx.tripId)
          assert.ok(!tx.referringPathHash)

          shim.handleMqTracingHeaders(headers)

          assert.equal(tx.incomingCatId, '9876#id')
          assert.equal(tx.referringTransactionGuid, 'trans id')
          assert.equal(tx.tripId, 'trip id')
          assert.equal(tx.referringPathHash, 'path hash')
          end()
        })
      }
    )

    await t.test(
      'should work with alternate header names - DT disabled, id and transaction are provided',
      function (t, end) {
        const { agent, shim } = t.nr
        helper.runInTransaction(agent, shim.WEB, function (tx) {
          const headers = createCATHeaders(agent.config, true)
          const segment = shim.getSegment()
          delete headers.MonisAgentAppData

          assert.ok(!tx.incomingCatId)
          assert.ok(!tx.referringTransactionGuid)
          assert.ok(!tx.tripId)
          assert.ok(!tx.referringPathHash)

          helper.runInTransaction(agent, shim.BG, function (tx2) {
            assert.notEqual(tx2, tx)
            shim.handleMqTracingHeaders(headers, segment, null, tx)
          })

          assert.equal(tx.incomingCatId, '9876#id')
          assert.equal(tx.referringTransactionGuid, 'trans id')
          assert.equal(tx.tripId, 'trip id')
          assert.equal(tx.referringPathHash, 'path hash')
          end()
        })
      }
    )

    await t.test(
      'Should propagate w3c tracecontext header when present, id and transaction are provided',
      function (t, end) {
        const { agent, shim } = t.nr
        agent.config.distributed_tracing.enabled = true

        const traceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00'
        const tracestate = 'test=test'

        helper.runInTransaction(agent, function (tx) {
          const headers = { traceparent, tracestate }
          const segment = shim.getSegment()
          shim.handleMqTracingHeaders(headers, segment)

          const outboundHeaders = {}
          tx.insertDistributedTraceHeaders(outboundHeaders)

          assert.equal(outboundHeaders.traceparent, `00-${tx.traceId}-${segment.id}-01`)
          assert.ok(outboundHeaders.tracestate.endsWith(tracestate))
          end()
        })
      }
    )

    await t.test(
      'Should propagate w3c tracecontext header when no tracestate, id and transaction are provided',
      function (t, end) {
        const { agent, shim } = t.nr
        agent.config.distributed_tracing.enabled = true

        const traceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00'

        helper.runInTransaction(agent, function (tx) {
          const headers = { traceparent }
          const segment = shim.getSegment()
          shim.handleMqTracingHeaders(headers, segment, null, tx)

          const outboundHeaders = {}
          tx.insertDistributedTraceHeaders(outboundHeaders)

          assert.ok(outboundHeaders.traceparent.startsWith('00-4bf92f3577b3'))
          end()
        })
      }
    )

    await t.test(
      'Should propagate w3c tracecontext header when tracestate empty string, id and transaction are provided',
      function (t, end) {
        const { agent, shim } = t.nr
        agent.config.distributed_tracing.enabled = true

        const traceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00'
        const tracestate = ''

        helper.runInTransaction(agent, function (tx) {
          const headers = { traceparent, tracestate }
          const segment = shim.getSegment()
          shim.handleMqTracingHeaders(headers, segment, null, tx)

          const outboundHeaders = {}
          tx.insertDistributedTraceHeaders(outboundHeaders)

          assert.ok(outboundHeaders.traceparent.startsWith('00-4bf92f3577b3'))
          end()
        })
      }
    )

    await t.test('should propagate w3c headers when CAT explicitly disabled', (t, end) => {
      const { agent, shim } = t.nr
      agent.config.cross_application_tracer.enabled = false
      agent.config.distributed_tracing.enabled = true

      const traceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00'
      const tracestate = 'test=test'

      helper.runInTransaction(agent, function (tx) {
        const headers = { traceparent, tracestate }
        const segment = shim.getSegment()
        shim.handleMqTracingHeaders(headers, segment, null, tx)

        const outboundHeaders = {}
        tx.insertDistributedTraceHeaders(outboundHeaders)

        assert.ok(outboundHeaders.traceparent.startsWith('00-4bf92f3577b3'))
        assert.ok(outboundHeaders.tracestate.endsWith(tracestate))
        end()
      })
    })

    await t.test(
      'should attach the CAT info to the provided segment - DT disabled, app data is provided',
      function (t, end) {
        const { agent, shim } = t.nr
        helper.runInTransaction(agent, shim.WEB, function (tx) {
          const headers = createCATHeaders(agent.config)
          const segment = shim.getSegment()
          delete headers['X-MonisAgent-Id']
          delete headers['X-MonisAgent-Transaction']

          assert.ok(!segment.catId)
          assert.ok(!segment.catTransaction)
          assert.ok(!segment.getAttributes().transaction_guid)

          helper.runInTransaction(agent, shim.BG, function (tx2) {
            assert.notEqual(tx2, tx)
            shim.handleMqTracingHeaders(headers, segment, null, tx2)
          })

          assert.equal(segment.catId, '6789#app')
          assert.equal(segment.catTransaction, 'app data transaction name')
          assert.equal(segment.getAttributes().transaction_guid, 'app trans id')
          end()
        })
      }
    )

    await t.test(
      'should attach the CAT info to current segment if not provided - DT disabled, app data is provided',
      function (t, end) {
        const { agent, shim } = t.nr
        helper.runInTransaction(agent, function (tx) {
          const headers = createCATHeaders(agent.config)
          const segment = shim.getSegment()
          delete headers['X-MonisAgent-Id']
          delete headers['X-MonisAgent-Transaction']

          assert.ok(!segment.catId)
          assert.ok(!segment.catTransaction)
          assert.ok(!segment.getAttributes().transaction_guid)

          shim.handleMqTracingHeaders(headers, null, null, tx)

          assert.equal(segment.catId, '6789#app')
          assert.equal(segment.catTransaction, 'app data transaction name')
          assert.equal(segment.getAttributes().transaction_guid, 'app trans id')
          end()
        })
      }
    )

    await t.test(
      'should work with alternate header names - DT disabled, app data is provided',
      function (t, end) {
        const { agent, shim } = t.nr
        helper.runInTransaction(agent, shim.WEB, function (tx) {
          const headers = createCATHeaders(agent.config, true)
          const segment = shim.getSegment()
          delete headers.MonisAgentID
          delete headers.MonisAgentTransaction

          assert.ok(!segment.catId)
          assert.ok(!segment.catTransaction)
          assert.ok(!segment.getAttributes().transaction_guid)

          helper.runInTransaction(agent, shim.BG, function (tx2) {
            assert.notEqual(tx2, tx)
            shim.handleMqTracingHeaders(headers, segment, null, tx2)
          })

          assert.equal(segment.catId, '6789#app')
          assert.equal(segment.catTransaction, 'app data transaction name')
          assert.equal(segment.getAttributes().transaction_guid, 'app trans id')
          end()
        })
      }
    )

    await t.test(
      'should not attach any CAT data to the segment, app data is for an untrusted application',
      function (t, end) {
        const { agent, shim } = t.nr
        helper.runInTransaction(agent, function (tx) {
          const headers = createCATHeaders(agent.config)
          const segment = shim.getSegment()
          delete headers['X-MonisAgent-Id']
          delete headers['X-MonisAgent-Transaction']
          agent.config.trusted_account_ids = []

          assert.ok(!segment.catId)
          assert.ok(!segment.catTransaction)
          assert.ok(!segment.getAttributes().transaction_guid)

          shim.handleMqTracingHeaders(headers, null, null, tx)

          assert.ok(!segment.catId)
          assert.ok(!segment.catTransaction)
          assert.ok(!segment.getAttributes().transaction_guid)
          end()
        })
      }
    )
  })

  await t.test('#insertCATRequestHeaders', async function (t) {
    t.beforeEach((ctx) => {
      beforeEach(ctx)
      const { agent } = ctx.nr
      agent.config.cross_application_tracer.enabled = true
      agent.config.distributed_tracing.enabled = false
    })
    t.afterEach(afterEach)
    await t.test('should not run if disabled', function (t, end) {
      const { agent, shim } = t.nr
      helper.runInTransaction(agent, function () {
        agent.config.cross_application_tracer.enabled = false
        const headers = {}

        shim.insertCATRequestHeaders(headers)

        assert.ok(!headers['X-MonisAgent-Id'])
        assert.ok(!headers['X-MonisAgent-Transaction'])
        end()
      })
    })

    await t.test('should not run if the encoding key is missing', function (t, end) {
      const { agent, shim } = t.nr
      helper.runInTransaction(agent, function () {
        delete agent.config.encoding_key
        const headers = {}

        shim.insertCATRequestHeaders(headers)

        assert.ok(!headers['X-MonisAgent-Id'])
        assert.ok(!headers['X-MonisAgent-Transaction'])
        end()
      })
    })

    await t.test('should fail gracefully when no headers are given', function (t) {
      const { agent, shim } = t.nr
      helper.runInTransaction(agent, function () {
        assert.doesNotThrow(function () {
          shim.insertCATRequestHeaders(null)
        })
      })
    })

    await t.test(
      'should use X-Http-Style-Headers when useAlt is false - DT disabled',
      function (t, end) {
        const { agent, shim } = t.nr
        helper.runInTransaction(agent, function () {
          const headers = {}
          shim.insertCATRequestHeaders(headers)

          assert.ok(!headers.MonisAgentID)
          assert.ok(!headers.MonisAgentTransaction)
          assert.equal(headers['X-MonisAgent-Id'], 'RVpaRwNdQBJQ')
          assert.match(headers['X-MonisAgent-Transaction'], /^[a-zA-Z0-9/-]{60,80}={0,2}$/)
          end()
        })
      }
    )

    await t.test(
      'should use MessageQueueStyleHeaders when useAlt is true with DT disabled',
      function (t, end) {
        const { agent, shim } = t.nr
        helper.runInTransaction(agent, function () {
          const headers = {}
          shim.insertCATRequestHeaders(headers, true)

          assert.ok(!headers['X-MonisAgent-Id'])
          assert.ok(!headers['X-MonisAgent-Transaction'])
          assert.equal(headers.MonisAgentID, 'RVpaRwNdQBJQ')
          assert.match(headers.MonisAgentTransaction, /^[a-zA-Z0-9/-]{60,80}={0,2}$/)
          end()
        })
      }
    )

    await t.test(
      'should append the current path hash to the transaction - DT disabled',
      function (t, end) {
        const { agent, shim } = t.nr
        helper.runInTransaction(agent, function (tx) {
          tx.nameState.appendPath('foobar')
          assert.equal(tx.pathHashes.length, 0)

          const headers = {}
          shim.insertCATRequestHeaders(headers)

          assert.equal(tx.pathHashes.length, 1)
          assert.equal(tx.pathHashes[0], '0f9570a6')
          end()
        })
      }
    )

    await t.test('should be an obfuscated value - DT disabled, id header', function (t, end) {
      const { agent, shim } = t.nr
      helper.runInTransaction(agent, function () {
        const headers = {}
        shim.insertCATRequestHeaders(headers)

        assert.match(headers['X-MonisAgent-Id'], /^[a-zA-Z0-9/-]+={0,2}$/)
        end()
      })
    })

    await t.test('should deobfuscate to the app id - DT disabled, id header', function (t, end) {
      const { agent, shim } = t.nr
      helper.runInTransaction(agent, function () {
        const headers = {}
        shim.insertCATRequestHeaders(headers)

        const id = hashes.deobfuscateNameUsingKey(
          headers['X-MonisAgent-Id'],
          agent.config.encoding_key
        )
        assert.equal(id, '1234#4321')
        end()
      })
    })

    await t.test(
      'should be an obfuscated value - DT disabled, transaction header',
      function (t, end) {
        const { agent, shim } = t.nr
        helper.runInTransaction(agent, function () {
          const headers = {}
          shim.insertCATRequestHeaders(headers)

          assert.match(headers['X-MonisAgent-Transaction'], /^[a-zA-Z0-9/-]{60,80}={0,2}$/)
          end()
        })
      }
    )

    await t.test(
      'should deobfuscate to transaction information - DT disabled, transaction header',
      function (t, end) {
        const { agent, shim } = t.nr
        helper.runInTransaction(agent, function () {
          const headers = {}
          shim.insertCATRequestHeaders(headers)

          let txInfo = hashes.deobfuscateNameUsingKey(
            headers['X-MonisAgent-Transaction'],
            agent.config.encoding_key
          )

          assert.doesNotThrow(function () {
            txInfo = JSON.parse(txInfo)
          })

          assert.ok(Array.isArray(txInfo))
          assert.equal(txInfo.length, 4)
          end()
        })
      }
    )
  })

  await t.test('#insertCATReplyHeader', async function (t) {
    t.beforeEach((ctx) => {
      beforeEach(ctx)
      const { agent } = ctx.nr
      agent.config.cross_application_tracer.enabled = true
      agent.config.distributed_tracing.enabled = false
    })
    t.afterEach(afterEach)

    await t.test('should not run if disabled', function (t, end) {
      const { agent, shim } = t.nr
      helper.runInTransaction(agent, function () {
        agent.config.cross_application_tracer.enabled = false
        const headers = {}

        shim.insertCATReplyHeader(headers)

        assert.ok(!headers['X-MonisAgent-App-Data'])
        end()
      })
    })

    await t.test('should not run if the encoding key is missing', function (t, end) {
      const { agent, shim } = t.nr
      helper.runInTransaction(agent, function () {
        delete agent.config.encoding_key
        const headers = {}

        shim.insertCATReplyHeader(headers)

        assert.ok(!headers['X-MonisAgent-App-Data'])
        end()
      })
    })

    await t.test('should fail gracefully when no headers are given', function (t) {
      const { agent, shim } = t.nr
      helper.runInTransaction(agent, function () {
        assert.doesNotThrow(function () {
          shim.insertCATReplyHeader(null)
        })
      })
    })

    await t.test(
      'should use X-Http-Style-Headers when useAlt is false - DT disabled',
      function (t, end) {
        const { agent, shim } = t.nr
        helper.runInTransaction(agent, function () {
          const headers = {}
          shim.insertCATReplyHeader(headers)

          assert.ok(!headers.MonisAgentAppData)
          assert.match(headers['X-MonisAgent-App-Data'], /^[a-zA-Z0-9/-]{60,80}={0,2}$/)
          end()
        })
      }
    )

    await t.test(
      'should use MessageQueueStyleHeaders when useAlt is true - DT disabled',
      function (t, end) {
        const { agent, shim } = t.nr
        helper.runInTransaction(agent, function () {
          const headers = {}
          shim.insertCATReplyHeader(headers, true)

          assert.ok(!headers['X-MonisAgent-App-Data'])
          assert.match(headers.MonisAgentAppData, /^[a-zA-Z0-9/-]{60,80}={0,2}$/)
          end()
        })
      }
    )

    await t.test('should be an obfuscated value - DT disabled, app data header', function (t, end) {
      const { agent, shim } = t.nr
      helper.runInTransaction(agent, function () {
        const headers = {}
        shim.insertCATReplyHeader(headers)

        assert.match(headers['X-MonisAgent-App-Data'], /^[a-zA-Z0-9/-]{60,80}={0,2}$/)
        end()
      })
    })

    await t.test(
      'should deobfuscate to CAT application data - DT disabled, app data header',
      function (t, end) {
        const { agent, shim } = t.nr
        helper.runInTransaction(agent, function () {
          const headers = {}
          shim.insertCATReplyHeader(headers)

          let appData = hashes.deobfuscateNameUsingKey(
            headers['X-MonisAgent-App-Data'],
            agent.config.encoding_key
          )

          assert.doesNotThrow(function () {
            appData = JSON.parse(appData)
          })

          assert.equal(appData.length, 7)
          assert.ok(Array.isArray(appData))
          end()
        })
      }
    )
  })
})
