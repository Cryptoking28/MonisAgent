/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

var test = require('tap').test

test('Multiple require("monisagent")', function (t) {
  process.env.NEW_RELIC_ENABLED = false

  var path = require.resolve('../../../index.js')
  var first = require(path)

  delete require.cache[path]

  var second = require(path)

  t.equal(first, second)
  t.end()
})
