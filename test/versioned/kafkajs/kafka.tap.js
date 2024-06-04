/*
 * Copyright 2024 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')
const helper = require('../../lib/agent_helper')
const params = require('../../lib/params')
const { removeModules } = require('../../lib/cache-buster')
const utils = require('./utils')
const SEGMENT_PREFIX = 'kafkajs.Kafka.consumer#'

const broker = `${params.kafka_host}:${params.kafka_port}`

tap.beforeEach(async (t) => {
  t.context.agent = helper.instrumentMockedAgent({
    feature_flag: {
      kafkajs_instrumentation: true
    }
  })

  const { Kafka, logLevel } = require('kafkajs')
  t.context.Kafka = Kafka
  const topic = utils.randomString()
  t.context.topic = topic
  const clientId = utils.randomString('kafka-test')
  t.context.clientId = clientId

  const kafka = new Kafka({
    clientId,
    brokers: [broker],
    logLevel: logLevel.NOTHING
  })
  await utils.createTopic({ topic, kafka })

  const producer = kafka.producer()
  await producer.connect()
  t.context.producer = producer
  const consumer = kafka.consumer({ groupId: 'kafka' })
  await consumer.connect()
  t.context.consumer = consumer
})

tap.afterEach(async (t) => {
  helper.unloadAgent(t.context.agent)
  removeModules(['kafkajs'])
  await t.context.consumer.disconnect()
  await t.context.producer.disconnect()
})

tap.test('send records correctly', (t) => {
  t.plan(4)

  const { agent, consumer, producer, topic } = t.context
  const message = 'test message'
  const expectedName = 'produce-tx'
  let txCount = 0

  agent.on('transactionFinished', (tx) => {
    txCount++
    if (tx.name === expectedName) {
      const name = `MessageBroker/Kafka/Topic/Produce/Named/${topic}`
      const segment = tx.agent.tracer.getSegment()

      const foundSegment = segment.children.find((s) => s.name.endsWith(topic))
      t.equal(foundSegment.name, name)

      const metric = tx.metrics.getMetric(name)
      t.equal(metric.callCount, 1)
    }

    if (txCount === 2) {
      t.end()
    }
  })

  helper.runInTransaction(agent, async (tx) => {
    tx.name = expectedName
    await consumer.subscribe({ topic, fromBeginning: true })
    const promise = new Promise((resolve) => {
      consumer.run({
        eachMessage: async ({ message: actualMessage }) => {
          t.equal(actualMessage.value.toString(), message)
          t.match(actualMessage.headers['x-foo'].toString(), 'foo')
          resolve()
        }
      })
    })
    await utils.waitForConsumersToJoinGroup({ consumer })
    await producer.send({
      acks: 1,
      topic,
      messages: [
        {
          key: 'key',
          value: message,
          headers: {
            'x-foo': 'foo'
          }
        }
      ]
    })
    await promise

    tx.end()
  })
})

tap.test('send passes along DT headers', (t) => {
  const expectedName = 'produce-tx'

  const { agent, consumer, producer, topic } = t.context

  // These agent.config lines are utilized to simulate the inbound
  // distributed trace that we are trying to validate.
  agent.config.account_id = 'account_1'
  agent.config.primary_application_id = 'app_1'
  agent.config.trusted_account_key = 42
  let produceTx = null
  let consumeTx = null
  let txCount = 0

  agent.on('transactionFinished', (tx) => {
    txCount++

    if (tx.name === expectedName) {
      produceTx = tx
    } else {
      consumeTx = tx
    }

    if (txCount === 2) {
      utils.verifyDistributedTrace({ t, consumeTx, produceTx })
      t.end()
    }
  })

  helper.runInTransaction(agent, async (tx) => {
    tx.name = expectedName
    await consumer.subscribe({ topic, fromBeginning: true })

    const promise = new Promise((resolve) => {
      consumer.run({
        eachMessage: async ({ message: actualMessage }) => {
          t.equal(actualMessage.value.toString(), 'one')
          resolve()
        }
      })
    })

    await utils.waitForConsumersToJoinGroup({ consumer })
    await producer.send({
      acks: 1,
      topic,
      messages: [{ key: 'key', value: 'one' }]
    })

    await promise

    tx.end()
  })
})

tap.test('sendBatch records correctly', (t) => {
  t.plan(5)

  const { agent, consumer, producer, topic } = t.context
  const message = 'test message'
  const expectedName = 'produce-tx'

  agent.on('transactionFinished', (tx) => {
    if (tx.name === expectedName) {
      const name = `MessageBroker/Kafka/Topic/Produce/Named/${topic}`
      const segment = tx.agent.tracer.getSegment()

      const foundSegment = segment.children.find((s) => s.name.endsWith(topic))
      t.equal(foundSegment.name, name)

      const metric = tx.metrics.getMetric(name)
      t.equal(metric.callCount, 1)

      t.equal(tx.isDistributedTrace, true)

      t.end()
    }
  })

  helper.runInTransaction(agent, async (tx) => {
    tx.name = expectedName
    await consumer.subscribe({ topic, fromBeginning: true })
    const promise = new Promise((resolve) => {
      consumer.run({
        eachMessage: async ({ message: actualMessage }) => {
          t.equal(actualMessage.value.toString(), message)
          t.match(actualMessage.headers['x-foo'].toString(), 'foo')
          resolve()
        }
      })
    })
    await utils.waitForConsumersToJoinGroup({ consumer })
    await producer.sendBatch({
      acks: 1,
      topicMessages: [
        {
          topic,
          messages: [
            {
              key: 'key',
              value: message,
              headers: { 'x-foo': 'foo' }
            }
          ]
        }
      ]
    })
    await promise

    tx.end()
  })
})

tap.test('consume outside of a transaction', async (t) => {
  const { agent, consumer, producer, topic, clientId } = t.context
  const message = 'test message'

  const txPromise = new Promise((resolve) => {
    agent.on('transactionFinished', (tx) => {
      utils.verifyConsumeTransaction({ t, tx, topic, clientId })
      resolve()
    })
  })

  await consumer.subscribe({ topics: [topic], fromBeginning: true })
  const testPromise = new Promise((resolve) => {
    consumer.run({
      eachMessage: async ({ message: actualMessage }) => {
        t.equal(actualMessage.value.toString(), message)
        resolve()
      }
    })
  })
  await utils.waitForConsumersToJoinGroup({ consumer })
  await producer.send({
    acks: 1,
    topic,
    messages: [{ key: 'key', value: message }]
  })

  return Promise.all([txPromise, testPromise])
})

tap.test('consume inside of a transaction', async (t) => {
  const { agent, consumer, producer, topic, clientId } = t.context
  const expectedName = 'testing-tx-consume'

  const messages = ['one', 'two', 'three']
  let txCount = 0
  let msgCount = 0

  const txPromise = new Promise((resolve) => {
    agent.on('transactionFinished', (tx) => {
      txCount++
      if (tx.name === expectedName) {
        t.assertSegments(tx.trace.root, [`${SEGMENT_PREFIX}subscribe`, `${SEGMENT_PREFIX}run`], {
          exact: false
        })
      } else {
        utils.verifyConsumeTransaction({ t, tx, topic, clientId })
      }

      if (txCount === messages.length + 1) {
        resolve()
      }
    })
  })

  await helper.runInTransaction(agent, async (tx) => {
    tx.name = expectedName
    await consumer.subscribe({ topics: [topic], fromBeginning: true })
    const testPromise = new Promise((resolve) => {
      consumer.run({
        eachMessage: async ({ message: actualMessage }) => {
          msgCount++
          t.ok(messages.includes(actualMessage.value.toString()))
          if (msgCount === messages.length) {
            resolve()
          }
        }
      })
    })
    await utils.waitForConsumersToJoinGroup({ consumer })
    const messagePayload = messages.map((m, i) => ({ key: `key-${i}`, value: m }))
    await producer.send({
      acks: 1,
      topic,
      messages: messagePayload
    })

    tx.end()
    return Promise.all([txPromise, testPromise])
  })
})
