/*
 * Copyright 2022 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
const pino = require('./pino')

/**
 * We only need to register the instrumentation once for both mysql and mysql2
 *  because there is some 🪄 in shimmer
 * See: https://github.com/Cryptoking28/monisagent/blob/main/lib/shimmer.js#L459
 */
module.exports = [
  {
    type: 'generic',
    moduleName: 'pino',
    onResolved: pino
  }
]
