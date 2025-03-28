/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const shared = require('./shared')

const suite = shared.makeSuite('recordBatch')

let testDatastore = null

function makeInit(instrumented) {
  return function setDatastore(agent) {
    testDatastore = shared.getTestDatastore(agent, instrumented)
  }
}

suite.add({
  name: 'instrumented operation',
  initialize: makeInit(true),
  agent: {},
  fn: function () {
    return new Promise((resolve) => {
      testDatastore.testBatch('test', resolve)
    })
  }
})

suite.add({
  name: 'uninstrumented operation',
  initialize: makeInit(false),
  fn: function () {
    return new Promise((resolve) => {
      testDatastore.testBatch('test', resolve)
    })
  }
})

suite.add({
  name: 'instrumented operation in transaction',
  agent: {},
  initialize: makeInit(true),
  runInTransaction: true,
  fn: function () {
    return new Promise((resolve) => {
      testDatastore.testBatch('test', resolve)
    })
  }
})

suite.run()
