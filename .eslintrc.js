/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

module.exports = {
  extends: ['@monisagent', 'plugin:jsdoc/recommended'],
  plugins: ['jsdoc'],
  parserOptions: {
    ecmaVersion: '2020'
  },
  rules: {
    'consistent-return': 'off',
    'jsdoc/require-jsdoc': 'off'
  },
  ignorePatterns: ['test/versioned-external'],
  overrides: [
    {
      files: ['monisagent.js'],
      rules: {
        'header/header': ['off']
      }
    },
    {
      files: ['./lib/shim/*.js', 'lib/transaction/handle.js', 'api.js'],
      rules: {
        'jsdoc/require-jsdoc': 'warn'
      }
    }
  ]
}
