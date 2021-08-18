/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

module.exports = {
  extends: '@monisagent',
  rules: {
    'consistent-return': 'off'
  },
  overrides: [
    {
      files: ['monisagent.js'],
      rules: {
        'header/header': ['off']
      }
    }
  ]
}
