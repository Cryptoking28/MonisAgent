/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

module.exports = {
  extends: '@monisagent',
  overrides: [
    {
      files: [
        'test/integration/*.tap.js',
        'test/integration/*/*.tap.js',
        'test/integration/core/exec-me.js'
      ],
      rules: {
        'no-console': ['off']
      }
    },
    {
      files: ['monisagent.js'],
      rules: {
        'header/header': ['off']
      }
    }
  ]
}
