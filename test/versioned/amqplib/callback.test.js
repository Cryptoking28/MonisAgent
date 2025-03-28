/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
const assert = require('node:assert')
const test = require('node:test')
const amqpUtils = require('./amqp-utils')
const API = require('../../../api')
const helper = require('../../lib/agent_helper')
const { removeMatchedModules } = require('../../lib/cache-buster')
const promiseResolvers = require('../../lib/promise-resolvers')

/*
TODO:

- promise API
- callback API

consumer
- off by default for rum
- value of the attribute is limited to 255 bytes

 */

test('amqplib callback instrumentation', async function (t) {
  t.beforeEach(async function (ctx) {
    const { promise, resolve, reject } = promiseResolvers()
    const agent = helper.instrumentMockedAgent({
      attributes: {
        enabled: true
      }
    })

    const params = {
      encoding_key: 'this is an encoding key',
      cross_process_id: '1234#4321'
    }
    agent.config._fromServer(params, 'encoding_key')
    agent.config._fromServer(params, 'cross_process_id')
    agent.config.trusted_account_ids = [1234]

    const api = new API(agent)

    const amqplib = require('amqplib/callback_api')
    amqpUtils.getChannel(amqplib, function (err, result) {
      if (err) {
        reject(err)
      }

      ctx.nr.conn = result.connection
      ctx.nr.channel = result.channel
      ctx.nr.channel.assertQueue('testQueue', null, resolve)
    })
    ctx.nr = {
      agent,
      api,
      amqplib
    }
    await promise
  })

  t.afterEach(async function (ctx) {
    const { promise, resolve } = promiseResolvers()
    helper.unloadAgent(ctx.nr.agent)
    removeMatchedModules(/amqplib/)
    ctx.nr.conn.close(resolve)
    await promise
  })

  await t.test('connect in a transaction', function (t, end) {
    const { agent, amqplib } = t.nr
    helper.runInTransaction(agent, function (tx) {
      amqplib.connect(amqpUtils.CON_STRING, null, function (err, _conn) {
        assert.ok(!err, 'should not break connection')
        const [segment] = tx.trace.getChildren(tx.trace.root.id)
        assert.equal(segment.name, 'amqplib.connect')
        const attrs = segment.getAttributes()
        assert.equal(attrs.host, 'localhost')
        assert.equal(attrs.port_path_or_id, 5672)
        _conn.close(end)
      })
    })
  })

  await t.test('sendToQueue', function (t, end) {
    const { agent, channel } = t.nr
    agent.on('transactionFinished', function (tx) {
      amqpUtils.verifySendToQueue(tx)
      end()
    })

    helper.runInTransaction(agent, function transactionInScope(tx) {
      channel.sendToQueue('testQueue', Buffer.from('hello'), {
        replyTo: 'my.reply.queue',
        correlationId: 'correlation-id'
      })
      tx.end()
    })
  })

  await t.test('publish to fanout exchange', function (t, end) {
    const { agent, channel } = t.nr
    const exchange = amqpUtils.FANOUT_EXCHANGE

    agent.on('transactionFinished', function (tx) {
      amqpUtils.verifyProduce(tx, exchange)
      end()
    })

    helper.runInTransaction(agent, function (tx) {
      assert.ok(agent.tracer.getSegment(), 'should start in transaction')
      channel.assertExchange(exchange, 'fanout', null, function (err) {
        assert.ok(!err, 'should not error asserting exchange')
        amqpUtils.verifyTransaction(agent, tx, 'assertExchange')

        channel.assertQueue('', { exclusive: true }, function (err, result) {
          assert.ok(!err, 'should not error asserting queue')
          amqpUtils.verifyTransaction(agent, tx, 'assertQueue')
          const queueName = result.queue

          channel.bindQueue(queueName, exchange, '', null, function (err) {
            assert.ok(!err, 'should not error binding queue')
            amqpUtils.verifyTransaction(agent, tx, 'bindQueue')
            channel.publish(exchange, '', Buffer.from('hello'))
            setImmediate(function () {
              tx.end()
            })
          })
        })
      })
    })
  })

  await t.test('publish to direct exchange', function (t, end) {
    const { agent, channel } = t.nr
    const exchange = amqpUtils.DIRECT_EXCHANGE

    agent.on('transactionFinished', function (tx) {
      amqpUtils.verifyProduce(tx, exchange, 'key1')
      end()
    })

    helper.runInTransaction(agent, function (tx) {
      channel.assertExchange(exchange, 'direct', null, function (err) {
        assert.ok(!err, 'should not error asserting exchange')
        amqpUtils.verifyTransaction(agent, tx, 'assertExchange')

        channel.assertQueue('', { exclusive: true }, function (err, result) {
          assert.ok(!err, 'should not error asserting queue')
          amqpUtils.verifyTransaction(agent, tx, 'assertQueue')
          const queueName = result.queue

          channel.bindQueue(queueName, exchange, 'key1', null, function (err) {
            assert.ok(!err, 'should not error binding queue')
            amqpUtils.verifyTransaction(agent, tx, 'bindQueue')
            channel.publish(exchange, 'key1', Buffer.from('hello'))
            setImmediate(function () {
              tx.end()
            })
          })
        })
      })
    })
  })

  await t.test('purge queue', function (t, end) {
    const { agent, channel } = t.nr
    const exchange = amqpUtils.DIRECT_EXCHANGE
    let queueName = null

    agent.on('transactionFinished', function (tx) {
      amqpUtils.verifyPurge(tx)
      end()
    })

    helper.runInTransaction(agent, function (tx) {
      channel.assertExchange(exchange, 'direct', null, function (err) {
        assert.ok(!err, 'should not error asserting exchange')
        amqpUtils.verifyTransaction(agent, tx, 'assertExchange')

        channel.assertQueue('', { exclusive: true }, function (err, result) {
          assert.ok(!err, 'should not error asserting queue')
          amqpUtils.verifyTransaction(agent, tx, 'assertQueue')
          queueName = result.queue

          channel.bindQueue(queueName, exchange, 'key1', null, function (err) {
            assert.ok(!err, 'should not error binding queue')
            amqpUtils.verifyTransaction(agent, tx, 'bindQueue')
            channel.purgeQueue(queueName, function (err) {
              assert.ok(!err, 'should not error purging queue')
              setImmediate(function () {
                tx.end()
              })
            })
          })
        })
      })
    })
  })

  await t.test('get a message', function (t, end) {
    const { agent, channel } = t.nr
    const exchange = amqpUtils.DIRECT_EXCHANGE
    let queue = null

    channel.assertExchange(exchange, 'direct', null, function (err) {
      assert.ok(!err, 'should not error asserting exchange')

      channel.assertQueue('', { exclusive: true }, function (err, res) {
        assert.ok(!err, 'should not error asserting queue')
        queue = res.queue

        channel.bindQueue(queue, exchange, 'consume-tx-key', null, function (err) {
          assert.ok(!err, 'should not error binding queue')

          helper.runInTransaction(agent, function (tx) {
            channel.publish(exchange, 'consume-tx-key', Buffer.from('hello'))
            channel.get(queue, {}, function (err, msg) {
              assert.ok(!err, 'should not cause an error')
              assert.ok(msg, 'should receive a message')

              amqpUtils.verifyTransaction(agent, tx, 'get')
              const body = msg.content.toString('utf8')
              assert.equal(body, 'hello', 'should receive expected body')

              channel.ack(msg)
              setImmediate(function () {
                tx.end()
                amqpUtils.verifyGet({
                  tx,
                  exchangeName: exchange,
                  routingKey: 'consume-tx-key',
                  queue,
                  assertAttr: true
                })
                end()
              })
            })
          })
        })
      })
    })
  })

  await t.test('get a message disable parameters', function (t, end) {
    const { agent, channel } = t.nr
    agent.config.message_tracer.segment_parameters.enabled = false
    const exchange = amqpUtils.DIRECT_EXCHANGE
    let queue = null

    channel.assertExchange(exchange, 'direct', null, function (err) {
      assert.ok(!err, 'should not error asserting exchange')

      channel.assertQueue('', { exclusive: true }, function (err, res) {
        assert.ok(!err, 'should not error asserting queue')
        queue = res.queue

        channel.bindQueue(queue, exchange, 'consume-tx-key', null, function (err) {
          assert.ok(!err, 'should not error binding queue')

          helper.runInTransaction(agent, function (tx) {
            channel.publish(exchange, 'consume-tx-key', Buffer.from('hello'))
            channel.get(queue, {}, function (err, msg) {
              assert.ok(!err, 'should not cause an error')
              assert.ok(msg, 'should receive a message')

              amqpUtils.verifyTransaction(agent, tx, 'get')
              const body = msg.content.toString('utf8')
              assert.equal(body, 'hello', 'should receive expected body')

              channel.ack(msg)
              setImmediate(function () {
                tx.end()
                amqpUtils.verifyGet({
                  tx,
                  exchangeName: exchange,
                  queue
                })
                end()
              })
            })
          })
        })
      })
    })
  })

  await t.test('consume in a transaction with old CAT', async function (t) {
    const { agent, api, channel } = t.nr
    const { promise, resolve } = promiseResolvers()
    agent.config.cross_application_tracer.enabled = true
    agent.config.distributed_tracing.enabled = false
    const exchange = amqpUtils.DIRECT_EXCHANGE
    let produceTx
    let consumeTx
    let queue

    channel.assertExchange(exchange, 'direct', null, function (err) {
      assert.ok(!err, 'should not error asserting exchange')

      channel.assertQueue('', { exclusive: true }, function (err, res) {
        assert.ok(!err, 'should not error asserting queue')
        queue = res.queue

        channel.bindQueue(queue, exchange, 'consume-tx-key', null, function (err) {
          assert.ok(!err, 'should not error binding queue')
          // set up consume, this creates its own transaction
          channel.consume(queue, function (msg) {
            ;({ _transaction: consumeTx } = api.getTransaction())
            assert.ok(msg, 'should receive a message')

            const body = msg.content.toString('utf8')
            assert.equal(body, 'hello', 'should receive expected body')

            channel.ack(msg)
            produceTx.end()
            consumeTx.end()
            resolve()
          })
          helper.runInTransaction(agent, function (tx) {
            produceTx = tx
            amqpUtils.verifyTransaction(agent, tx, 'consume')
            channel.publish(exchange, 'consume-tx-key', Buffer.from('hello'))
          })
        })
      })
    })
    await promise
    assert.notStrictEqual(consumeTx, produceTx, 'should not be in original transaction')
    amqpUtils.verifySubscribe(produceTx, exchange, 'consume-tx-key')
    amqpUtils.verifyConsumeTransaction(consumeTx, exchange, queue, 'consume-tx-key')
    amqpUtils.verifyCAT(produceTx, consumeTx)
  })

  await t.test('consume in a transaction with distributed tracing', async function (t) {
    const { agent, api, channel } = t.nr
    const { promise, resolve } = promiseResolvers()
    agent.config.span_events.enabled = true
    agent.config.account_id = 1234
    agent.config.primary_application_id = 4321
    agent.config.trusted_account_key = 1234

    const exchange = amqpUtils.DIRECT_EXCHANGE
    let queue
    let produceTx
    let consumeTx

    channel.assertExchange(exchange, 'direct', null, function (err) {
      assert.ok(!err, 'should not error asserting exchange')

      channel.assertQueue('', { exclusive: true }, function (err, res) {
        assert.ok(!err, 'should not error asserting queue')
        queue = res.queue

        channel.bindQueue(queue, exchange, 'consume-tx-key', null, function (err) {
          assert.ok(!err, 'should not error binding queue')
          // set up consume, this creates its own transaction
          channel.consume(queue, function (msg) {
            ;({ _transaction: consumeTx } = api.getTransaction())
            assert.ok(msg, 'should receive a message')

            const body = msg.content.toString('utf8')
            assert.equal(body, 'hello', 'should receive expected body')

            channel.ack(msg)
            produceTx.end()
            consumeTx.end()
            resolve()
          })

          helper.runInTransaction(agent, function (tx) {
            produceTx = tx
            assert.ok(!err, 'should not error subscribing consumer')
            amqpUtils.verifyTransaction(agent, tx, 'consume')

            channel.publish(exchange, 'consume-tx-key', Buffer.from('hello'))
          })
        })
      })
    })

    await promise
    assert.notStrictEqual(consumeTx, produceTx, 'should not be in original transaction')
    amqpUtils.verifySubscribe(produceTx, exchange, 'consume-tx-key')
    amqpUtils.verifyConsumeTransaction(consumeTx, exchange, queue, 'consume-tx-key')
    amqpUtils.verifyDistributedTrace(produceTx, consumeTx)
  })

  await t.test('consume out of transaction', function (t, end) {
    const { agent, api, channel } = t.nr
    const exchange = amqpUtils.DIRECT_EXCHANGE
    let queue = null

    agent.on('transactionFinished', function (tx) {
      amqpUtils.verifyConsumeTransaction(tx, exchange, queue, 'consume-tx-key')
      end()
    })

    channel.assertExchange(exchange, 'direct', null, function (err) {
      assert.ok(!err, 'should not error asserting exchange')

      channel.assertQueue('', { exclusive: true }, function (err, res) {
        assert.ok(!err, 'should not error asserting queue')
        queue = res.queue

        channel.bindQueue(queue, exchange, 'consume-tx-key', null, function (err) {
          assert.ok(!err, 'should not error binding queue')

          channel.consume(
            queue,
            function (msg) {
              const tx = api.getTransaction()
              assert.ok(msg, 'should receive a message')

              const body = msg.content.toString('utf8')
              assert.equal(body, 'hello', 'should receive expected body')

              channel.ack(msg)

              setImmediate(function () {
                tx.end()
              })
            },
            null,
            function (err) {
              assert.ok(!err, 'should not error subscribing consumer')

              channel.publish(amqpUtils.DIRECT_EXCHANGE, 'consume-tx-key', Buffer.from('hello'))
            }
          )
        })
      })
    })
  })

  await t.test('rename message consume transaction', function (t, end) {
    const { agent, api, channel } = t.nr
    const exchange = amqpUtils.DIRECT_EXCHANGE
    let queue = null

    agent.on('transactionFinished', function (tx) {
      assert.equal(
        tx.getFullName(),
        'OtherTransaction/Message/Custom/foobar',
        'should have specified name'
      )
      end()
    })

    channel.assertExchange(exchange, 'direct', null, function (err) {
      assert.ok(!err, 'should not error asserting exchange')

      channel.assertQueue('', { exclusive: true }, function (err, res) {
        assert.ok(!err, 'should not error asserting queue')
        queue = res.queue

        channel.bindQueue(queue, exchange, 'consume-tx-key', null, function (err) {
          assert.ok(!err, 'should not error binding queue')

          channel.consume(
            queue,
            function (msg) {
              const tx = api.getTransaction()
              api.setTransactionName('foobar')

              channel.ack(msg)

              setImmediate(function () {
                tx.end()
              })
            },
            null,
            function (err) {
              assert.ok(!err, 'should not error subscribing consumer')

              channel.publish(amqpUtils.DIRECT_EXCHANGE, 'consume-tx-key', Buffer.from('hello'))
            }
          )
        })
      })
    })
  })
})
