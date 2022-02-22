/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

// Prepare to receive any error.
process.on('uncaughtException', function (err) {
  process.send({ error: err, stack: err.stack })
})

// Load up monisagent
process.env.NEW_RELIC_HOME = __dirname
require('../../../index') // require('monisagent')

// Wait a bit then check for the file.
setTimeout(function () {
  process.exit(0)
}, 100)
