/*
 * Copyright 2023 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
const assert = require('node:assert')
const test = require('node:test')
const helper = require('../../../lib/agent_helper')
const GenericShim = require('../../../../lib/shim/shim')
const sinon = require('sinon')

test('langchain/core/vectorstore unit.tests', async (t) => {
  t.beforeEach(function (ctx) {
    ctx.nr = {}
    const sandbox = sinon.createSandbox()
    const agent = helper.loadMockedAgent()
    agent.config.ai_monitoring = { enabled: true }
    const shim = new GenericShim(agent, 'langchain')
    shim.pkgVersion = '0.1.26'
    sandbox.stub(shim.logger, 'debug')
    sandbox.stub(shim.logger, 'warn')

    ctx.nr.agent = agent
    ctx.nr.shim = shim
    ctx.nr.sandbox = sandbox
    ctx.nr.initialize = require('../../../../lib/instrumentation/langchain/vectorstore')
  })

  t.afterEach(function (ctx) {
    helper.unloadAgent(ctx.nr.agent)
    ctx.nr.sandbox.restore()
  })

  function getMockModule() {
    function VectorStore() {}
    VectorStore.prototype.similaritySearch = async function call() {}
    return { VectorStore }
  }

  await t.test('should not register instrumentation if ai_monitoring is false', (t) => {
    const { shim, agent, initialize } = t.nr
    const MockVectorstore = getMockModule()
    agent.config.ai_monitoring.enabled = false

    initialize(shim, MockVectorstore)
    assert.equal(shim.logger.debug.callCount, 1, 'should log 1 debug messages')
    assert.equal(
      shim.logger.debug.args[0][0],
      'langchain instrumentation is disabled.  To enable set `config.ai_monitoring.enabled` to true'
    )
    const isWrapped = shim.isWrapped(MockVectorstore.VectorStore.prototype.similaritySearch)
    assert.equal(isWrapped, false, 'should not wrap vectorstore similaritySearch')
  })
})
