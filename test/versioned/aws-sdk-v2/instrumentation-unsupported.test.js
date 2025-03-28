/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
const assert = require('node:assert')
const test = require('node:test')
const helper = require('../../lib/agent_helper')
const instrumentationHelper = require('../../../lib/instrumentation/aws-sdk/v2/instrumentation-helper')

test('instrumentation is not supported', async (t) => {
  t.beforeEach((ctx) => {
    ctx.nr = {}
    ctx.nr.agent = helper.instrumentMockedAgent()
    ctx.nr.AWS = require('aws-sdk')
  })

  t.afterEach((ctx) => {
    helper.unloadAgent(ctx.nr.agent)
  })

  await t.test('AWS should not be instrumented', (t) => {
    const { AWS } = t.nr
    assert.notEqual(
      AWS.NodeHttpClient.prototype.handleRequest.name,
      'wrappedHandleRequest',
      'AWS does not have a wrapped NodeHttpClient'
    )
  })

  await t.test('instrumentation supported function', (t) => {
    const { AWS } = t.nr
    assert.ok(
      !instrumentationHelper.instrumentationSupported(AWS),
      'instrumentationSupported returned false'
    )
  })
})
