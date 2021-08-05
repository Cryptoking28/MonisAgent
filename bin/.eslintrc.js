/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
module.exports = {
  rules: {
    'no-process-exit': 'off',
    'no-console': 'off',
    'no-shadow': ['warn', { allow: ['cb', 'error', 'err'] }]
  }
}
