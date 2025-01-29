/*
 * Copyright 2025 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const test = require('node:test')
const assert = require('node:assert')
const helper = require('../../../lib/agent_helper')
const mockLogger = require('../../mocks/logger')
const otelSetup = require('../../../../lib/otel/setup')

test.beforeEach((ctx) => {
  const agent = helper.loadMockedAgent()
  const loggerMock = mockLogger()
  ctx.nr = {
    agent,
    loggerMock
  }
})

test.afterEach((ctx) => {
  helper.unloadAgent(ctx.nr.agent)
})

test('should create consumer segment from otel span', (t) => {
  const { agent, loggerMock } = t.nr
  agent.config.feature_flag.opentelemetry_bridge = true
  const provider = otelSetup(agent, loggerMock)
  assert.ok(provider)
  assert.equal(provider.resource.attributes['service.name'], 'Monis Agent for Node.js tests')
  assert.equal(provider._config.spanLimits.attributeValueLengthLimit, 4095)
})

test('should create supportability metric on successful setup of opentelemetry bridge', (t) => {
  const { agent, loggerMock } = t.nr
  agent.config.feature_flag.opentelemetry_bridge = true
  otelSetup(agent, loggerMock)
  const setupMetric = agent.metrics.getMetric('Supportability/Nodejs/OpenTelemetryBridge/Setup')
  assert.equal(setupMetric.callCount, 1)
})

test('should not create provider when `feature_flag.opentelemetry_bridge` is false', (t) => {
  const { agent, loggerMock } = t.nr
  agent.config.feature_flag.opentelemetry_bridge = false
  const provider = otelSetup(agent, loggerMock)
  assert.equal(provider, null)
  assert.equal(loggerMock.warn.args[0][0], '`feature_flag.opentelemetry_bridge` is not enabled, skipping setup of opentelemetry-bridge')
})
