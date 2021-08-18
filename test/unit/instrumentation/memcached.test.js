/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const helper = require('../../lib/agent_helper')
const tap = require('tap')

tap.test('agent instrumentation of memcached', function (t) {
  t.autoend()
  t.test("shouldn't cause bootstrapping to fail", function (t) {
    t.autoend()
    let agent
    let initialize

    t.before(function () {
      agent = helper.loadMockedAgent()
      initialize = require('../../../lib/instrumentation/memcached')
    })

    t.teardown(function () {
      helper.unloadAgent(agent)
    })

    t.test('when passed no module', function (t) {
      t.doesNotThrow(() => {
        initialize(agent)
      })
      t.end()
    })

    t.test('when passed an empty module', function (t) {
      t.doesNotThrow(() => {
        initialize(agent, {})
      })
      t.end()
    })
  })

  t.test('for each operation', function (t) {
    t.autoend()
    t.test('should update the global aggregate statistics')
    t.test('should also update the global web aggregate statistics')
    t.test('should update the aggregate statistics for the operation type')
    t.test('should update the scoped aggregate statistics for the operation type')
  })

  t.test('should instrument setting data')
  t.test('should instrument adding data')
  t.test('should instrument appending data')
  t.test('should instrument prepending data')
  t.test('should instrument checking and setting data')
  t.test('should instrument incrementing data')
  t.test('should instrument decrementing data')
  t.test('should instrument getting data')
  t.test('should instrument deleting data')
})
