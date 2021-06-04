/*
* Copyright 2020 Monis Agent Corporation. All rights reserved.
* SPDX-License-Identifier: Apache-2.0
*/
'use strict'

const tap = require('tap')
const utils = require('@monisagent/test-utilities')
const instrumentationHelper = require('../../lib/instrumentation-helper')
utils.assert.extendTap(tap)

tap.test('instrumentation is supported', (t) => {
  t.autoend()

  let helper = null
  let AWS = null

  t.beforeEach(() => {
    helper = utils.TestAgent.makeInstrumented()
    helper.registerInstrumentation({
      moduleName: 'aws-sdk',
      type: 'conglomerate',
      onRequire: require('../../lib/instrumentation')
    })
    AWS = require('aws-sdk')
  })

  t.afterEach(() => {
    helper && helper.unload()
    AWS = null
  })

  t.test('AWS should have monisagent attributes', (t) => {
    t.assert(AWS.__NR_instrumented, 'Found __NR_instrumented')
    t.end()
  })

  t.test('instrumentation supported function', (t) => {
    t.assert(
      instrumentationHelper.instrumentationSupported(AWS),
      'instrumentationSupported returned true'
    )
    t.end()
  })
})
