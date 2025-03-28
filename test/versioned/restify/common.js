/*
 * Copyright 2023 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
const common = module.exports
const helper = require('../../lib/agent_helper')

/**
 * @param {object} cfg
 * @property {object} cfg.t
 * @property {string} cfg.endpoint
 * @property {string} [cfg.prefix='Restify']
 * @property {string} cfg.expectedName
 * @property {Function} [cfg.cb=t.end]
 * @property {object} [cfg.requestOpts=null]
 * @property {object} cfg.agent
 * @property {object} cfg.server
 */
common.runTest = function runTest(cfg) {
  const {
    assert = require('node:assert'),
    endpoint,
    agent,
    prefix = 'Restify',
    requestOpts = null,
    server
  } = cfg
  let { expectedName } = cfg
  expectedName = `WebTransaction/${prefix}/${expectedName}`

  agent.on('transactionFinished', (tx) => {
    assert.equal(tx.name, expectedName, 'should have correct name')
  })

  server.listen(() => {
    const port = server.address().port
    helper.makeGetRequest(`http://localhost:${port}${endpoint}`, requestOpts)
  })
}
