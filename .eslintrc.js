/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

module.exports = {
  extends: ['@monisagent', 'plugin:jsdoc/recommended', 'plugin:sonarjs/recommended'],
  plugins: ['jsdoc', 'sonarjs'],
  rules: {
    'consistent-return': 'off',
    'jsdoc/require-jsdoc': 'off',
    'jsdoc/no-undefined-types': ['warn', { definedTypes: ['Logger', 'Agent', 'Shim'] }]
  },
  parserOptions: {
    ecmaVersion: '2020'
  },
  ignorePatterns: ['test/versioned-external'],
  overrides: [
    {
      files: ['**/*.mjs'],
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2022
      },
      rules: {
        // TODO: remove this when we decide on how to address
        // here: https://issues.monisagent.com/browse/NEWRELIC-3321
        'node/no-unsupported-features/es-syntax': 'off'
      }
    },
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
    },
    {
      files: ['test/**/**/**', 'tests/**/**/**'],
      // TODO: remove these overrides as part of https://issues.monisagent.com/browse/NEWRELIC-5257
      rules: {
        'sonarjs/no-duplicate-string': 'off',
        'sonarjs/cognitive-complexity': 'off'
      }
    }
  ]
}
