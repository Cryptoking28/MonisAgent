/*
 * Copyright 2025 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
const { exceptionAttr } = require('#agentlib/otel/attr-mapping/exceptions.js')
const test = require('node:test')
const assert = require('node:assert')
const {
  EXCEPTION_TYPE
} = require('#agentlib/otel/constants.js')

test('msg', () => {
  const span = {
    attributes: {
      [EXCEPTION_TYPE]: 'Error'
    }
  }
  const value = exceptionAttr({ key: 'msg', span })
  assert.deepEqual(value, 'Error')
})
